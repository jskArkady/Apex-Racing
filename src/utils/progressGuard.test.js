import { describe, expect, it } from 'vitest';
import {
  createProgressGuardState,
  getSignedWrappedProgressDelta,
  projectPointOntoClosedCurve,
  projectRoadPlanePointOntoClosedCurve,
  PROJECTION_SEAM_SNAP_METERS,
  snapProgressAtClosedCurveSeam,
  shouldRecoverFromProgressFailure,
  validateProgressSample
} from './progressGuard';
import * as THREE from 'three';
import { TRACK_PRESETS, trackCurve, trackLength as circuitLength } from './trackData';
import { ROAD_TOP_OFFSET, ROAD_WIDTH } from '../components/trackGeometry';
import { FALL_RECOVERY_CLEARANCE, isClearlyBelowTrack } from './drivingGuards';

const trackLength = 900;

function sampleFrame(state, {
  x,
  progress,
  speed = 60,
  delta = 1 / 60,
  centerlineDistance = 0
}) {
  return validateProgressSample(state, {
    worldPosition: { x, y: 0, z: 0 },
    curveProgress: progress,
    centerlineDistance,
    speed,
    delta,
    trackLength
  });
}

describe('progressGuard', () => {
  it('canonicalizes only the final two centimetres of a closed curve to zero', () => {
    expect(snapProgressAtClosedCurveSeam(
      1 - PROJECTION_SEAM_SNAP_METERS / trackLength / 2,
      trackLength
    )).toBe(0);
    expect(snapProgressAtClosedCurveSeam(
      1 - PROJECTION_SEAM_SNAP_METERS / trackLength * 2,
      trackLength
    )).toBeGreaterThan(0.999);
    expect(snapProgressAtClosedCurveSeam(1.25, trackLength)).toBeCloseTo(0.25);
  });

  it.each([30, 60, 120])('accepts continuous movement at %i Hz', (hz) => {
    const delta = 1 / hz;
    const speed = 60;
    let distance = 0;
    let state = createProgressGuardState();

    let result = sampleFrame(state, { x: 0, progress: 0, speed, delta });
    expect(result.valid).toBe(true);
    state = result.state;

    for (let frame = 0; frame < hz; frame += 1) {
      distance += speed * delta;
      result = sampleFrame(state, {
        x: distance,
        progress: distance / trackLength,
        speed,
        delta
      });
      expect(result.valid).toBe(true);
      state = result.state;
    }

    expect(state.segmentValid).toBe(true);
  });

  it('accepts forward progress through the closed-track seam', () => {
    expect(getSignedWrappedProgressDelta(0.99, 0.01)).toBeCloseTo(0.02);

    let result = sampleFrame(createProgressGuardState(), {
      x: 0,
      progress: 0.99,
      speed: 90,
      delta: 0.2
    });
    result = sampleFrame(result.state, {
      x: 18,
      progress: 0.01,
      speed: 90,
      delta: 0.2
    });

    expect(result.valid).toBe(true);
    expect(result.state.curveProgress).toBeCloseTo(0.01);
  });

  it('rejects excessive world displacement and retains the last accepted anchor', () => {
    const initial = sampleFrame(createProgressGuardState(), { x: 0, progress: 0 });
    const teleported = sampleFrame(initial.state, { x: 100, progress: 0.1, speed: 0 });

    expect(teleported.valid).toBe(false);
    expect(teleported.reason).toBe('world-teleport');
    expect(teleported.state.worldPosition).toEqual({ x: 0, y: 0, z: 0 });
    expect(teleported.state.curveProgress).toBe(0);
    expect(teleported.state.segmentValid).toBe(false);
  });

  it('rejects a curve alias jump even when world displacement is small', () => {
    const initial = sampleFrame(createProgressGuardState(), { x: 0, progress: 0 });
    const aliased = sampleFrame(initial.state, { x: 1, progress: 0.1, speed: 60 });

    expect(aliased.valid).toBe(false);
    expect(aliased.reason).toBe('curve-alias-jump');
    expect(aliased.state.segmentValid).toBe(false);
  });

  it('keeps the full 16-meter roadway inside the valid driving corridor', () => {
    for (const centerlineDistance of [1, 3, 6, 7.5, 8]) {
      const result = sampleFrame(createProgressGuardState(), {
        x: 0,
        progress: 0,
        centerlineDistance
      });

      expect(result.valid, `${centerlineDistance}m offset`).toBe(true);
    }
  });

  it('rejects only a clear excursion beyond the roadway and runoff corridor', () => {
    const result = sampleFrame(createProgressGuardState(), {
      x: 0,
      progress: 0,
      centerlineDistance: 16.01
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('outside-corridor');
    expect(result.state.initialized).toBe(false);
    expect(result.state.segmentValid).toBe(false);
  });

  it('measures the recovery corridor in the road plane instead of counting chassis height', () => {
    const progress = 0.3;
    const point = trackCurve.getPointAt(progress);
    const tangent = trackCurve.getTangentAt(progress).normalize();
    const side = new THREE.Vector3(0, 1, 0).cross(tangent).normalize();

    const inside = point.clone()
      .addScaledVector(side, 16)
      .add(new THREE.Vector3(0, 1.25, 0));
    const insideProjection = projectPointOntoClosedCurve(trackCurve, inside, progress);
    expect(insideProjection.centerlineDistance).toBeCloseTo(16, 2);

    const insideResult = validateProgressSample(createProgressGuardState(), {
      worldPosition: inside,
      curveProgress: insideProjection.progress,
      centerlineDistance: insideProjection.centerlineDistance,
      speed: 0,
      delta: 1 / 60,
      trackLength: circuitLength
    });
    expect(insideResult.valid).toBe(true);

    const outside = point.clone()
      .addScaledVector(side, 16.1)
      .add(new THREE.Vector3(0, 1.25, 0));
    const outsideProjection = projectPointOntoClosedCurve(trackCurve, outside, progress);
    const outsideResult = validateProgressSample(createProgressGuardState(), {
      worldPosition: outside,
      curveProgress: outsideProjection.progress,
      centerlineDistance: outsideProjection.centerlineDistance,
      speed: 0,
      delta: 1 / 60,
      trackLength: circuitLength
    });
    expect(outsideResult.valid).toBe(false);
    expect(outsideResult.reason).toBe('outside-corridor');
  });

  it('finds recovery surface height from current XZ regardless of stale vehicle height', () => {
    const lowProgress = 0.7515;
    const lowPoint = trackCurve.getPointAt(lowProgress);
    const projection = projectRoadPlanePointOntoClosedCurve(trackCurve, {
      x: lowPoint.x,
      y: 100,
      z: lowPoint.z
    });

    expect(Math.abs(getSignedWrappedProgressDelta(lowProgress, projection.progress))).toBeLessThan(0.001);
    expect(trackCurve.getPointAt(projection.progress).y).toBeCloseTo(lowPoint.y, 2);
  });

  it('resolves the local physical road height across every collider section and legal lane', () => {
    // Twice the collider resolution exercises every swept-road triangle from
    // both sides of its longitudinal midpoint, including the welded seam.
    const sectionSamples = 640;
    const worldUp = new THREE.Vector3(0, 1, 0);
    const legalLaneOffsets = [-ROAD_WIDTH / 2 + 0.1, -4, 0, 4, ROAD_WIDTH / 2 - 0.1];

    for (let index = 0; index < sectionSamples; index += 1) {
      const progress = index / sectionSamples;
      const point = trackCurve.getPointAt(progress);
      const tangent = trackCurve.getTangentAt(progress).normalize();
      const side = new THREE.Vector3().crossVectors(worldUp, tangent).normalize();

      for (const lateralOffset of legalLaneOffsets) {
        const roadPosition = point.clone().addScaledVector(side, lateralOffset);
        const projection = projectRoadPlanePointOntoClosedCurve(trackCurve, roadPosition);
        const projectedPoint = trackCurve.getPointAt(projection.progress);
        const physicalSurfaceY = projectedPoint.y + ROAD_TOP_OFFSET;

        expect(
          Math.abs(getSignedWrappedProgressDelta(progress, projection.progress)),
          `projection alias at section ${index}, lane ${lateralOffset}`
        ).toBeLessThan(0.001);
        expect(
          isClearlyBelowTrack(physicalSurfaceY, physicalSurfaceY),
          `surface respawn at section ${index}, lane ${lateralOffset}`
        ).toBe(false);
        expect(
          isClearlyBelowTrack(
            physicalSurfaceY - FALL_RECOVERY_CLEARANCE + 0.001,
            physicalSurfaceY
          ),
          `premature fall at section ${index}, lane ${lateralOffset}`
        ).toBe(false);
        expect(
          isClearlyBelowTrack(
            physicalSurfaceY - FALL_RECOVERY_CLEARANCE,
            physicalSurfaceY
          ),
          `missed fall at section ${index}, lane ${lateralOffset}`
        ).toBe(true);
      }
    }
  });

  it('projects every legal lateral lane across the whole circuit without aliasing progress', () => {
    const worldUp = new THREE.Vector3(0, 1, 0);

    for (const lateralOffset of [-7.9, -7.5, -6, -3, -1, 0, 1, 3, 6, 7.5, 7.9]) {
      let previousProgress = null;
      let guard = createProgressGuardState();

      for (let index = 0; index < 200; index += 1) {
        const expectedProgress = index / 200;
        const point = trackCurve.getPointAt(expectedProgress);
        const tangent = trackCurve.getTangentAt(expectedProgress).normalize();
        const side = new THREE.Vector3().crossVectors(worldUp, tangent).normalize();
        const position = point.clone().addScaledVector(side, lateralOffset);
        const projection = projectPointOntoClosedCurve(
          trackCurve,
          position,
          previousProgress
        );
        const progressError = Math.abs(getSignedWrappedProgressDelta(
          expectedProgress,
          projection.progress
        ));

        expect(progressError, `${lateralOffset}m at ${expectedProgress}`).toBeLessThan(0.004);
        expect(projection.centerlineDistance).toBeLessThanOrEqual(Math.abs(lateralOffset) + 0.15);

        const accepted = validateProgressSample(guard, {
          worldPosition: position,
          curveProgress: projection.progress,
          centerlineDistance: projection.centerlineDistance,
          speed: 75,
          delta: circuitLength / 200 / 75,
          trackLength: circuitLength
        });
        expect(accepted.valid, `${lateralOffset}m guard at ${expectedProgress}: ${accepted.reason}`).toBe(true);
        guard = accepted.state;
        previousProgress = projection.progress;
      }
    }
  });

  it('brackets the correct local minimum through every selectable circuit chicane', () => {
    for (const preset of TRACK_PRESETS) {
      const sampleCount = Math.ceil(preset.length / 2);
      let previousProgress = 0.25;

      for (let index = 0; index <= sampleCount + 4; index += 1) {
        const expectedProgress = (0.25 + index / sampleCount) % 1;
        const position = preset.curve.getPointAt(expectedProgress);
        position.y += 1;
        const projection = projectPointOntoClosedCurve(
          preset.curve,
          position,
          previousProgress
        );
        const progressErrorMeters = Math.abs(getSignedWrappedProgressDelta(
          expectedProgress,
          projection.progress
        )) * preset.length;

        expect(
          progressErrorMeters,
          `${preset.id} projection at ${expectedProgress}`
        ).toBeLessThan(0.05);
        previousProgress = projection.progress;
      }
    }
  });

  it('does not turn projection uncertainty or a timing discontinuity into a physical respawn', () => {
    expect(shouldRecoverFromProgressFailure('curve-alias-jump')).toBe(false);
    expect(shouldRecoverFromProgressFailure('world-teleport')).toBe(false);
    expect(shouldRecoverFromProgressFailure('invalid-sample')).toBe(false);
    expect(shouldRecoverFromProgressFailure('timing-discontinuity')).toBe(false);
    expect(shouldRecoverFromProgressFailure('outside-corridor')).toBe(false);
  });

  it('reanchors after a rejected sample without validating the discontinuous frame', () => {
    const initial = sampleFrame(createProgressGuardState(), {
      x: 0,
      progress: 0.2,
      speed: 20
    });
    const interrupted = sampleFrame(initial.state, {
      x: 15,
      progress: 0.3,
      speed: 20,
      delta: 1
    });
    expect(interrupted.valid).toBe(false);
    expect(interrupted.reason).toBe('timing-discontinuity');

    const reanchored = sampleFrame(interrupted.state, {
      x: 15.25,
      progress: 0.301,
      speed: 20
    });
    expect(reanchored.valid).toBe(false);
    expect(reanchored.reason).toBe('continuity-reanchored');
    expect(reanchored.state.segmentValid).toBe(true);
    expect(reanchored.state.curveProgress).toBeCloseTo(0.301);

    const resumed = sampleFrame(reanchored.state, {
      x: 15.5,
      progress: 0.30125,
      speed: 20
    });
    expect(resumed.valid).toBe(true);
    expect(resumed.reason).toBeNull();
  });

  it.each([
    ['world-teleport', { x: 100, progress: 0.1, speed: 0 }],
    ['curve-alias-jump', { x: 1, progress: 0.1, speed: 60 }]
  ])('never reanchors a persistent %s sample', (reason, rejectedSample) => {
    let result = sampleFrame(createProgressGuardState(), { x: 0, progress: 0 });

    for (let frame = 0; frame < 4; frame += 1) {
      result = sampleFrame(result.state, rejectedSample);
      expect(result.valid, `frame ${frame}`).toBe(false);
      expect(result.reason, `frame ${frame}`).toBe(reason);
      expect(result.state.worldPosition).toEqual({ x: 0, y: 0, z: 0 });
      expect(result.state.curveProgress).toBe(0);
    }
  });

  it('does not reclassify an implausible suspended-frame teleport as a timing reanchor', () => {
    const initial = sampleFrame(createProgressGuardState(), { x: 0, progress: 0 });
    const suspendedTeleport = sampleFrame(initial.state, {
      x: 200,
      progress: 0.2,
      speed: 20,
      delta: 1
    });
    expect(suspendedTeleport.reason).toBe('timing-discontinuity');
    expect(suspendedTeleport.state.timingReanchorAllowed).toBe(false);

    let result = sampleFrame(suspendedTeleport.state, {
      x: 200,
      progress: 0.2,
      speed: 20
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('world-teleport');

    result = sampleFrame(result.state, {
      x: 200,
      progress: 0.2,
      speed: 20
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('world-teleport');
  });

  it('rejects suspended-frame and non-finite velocity samples', () => {
    const initial = sampleFrame(createProgressGuardState(), { x: 0, progress: 0 });

    const suspended = sampleFrame(initial.state, {
      x: 100,
      progress: 0.1,
      speed: 60,
      delta: 2
    });
    expect(suspended.valid).toBe(false);
    expect(suspended.reason).toBe('timing-discontinuity');

    const infiniteSpeed = sampleFrame(initial.state, {
      x: 0,
      progress: 0,
      speed: Infinity
    });
    expect(infiniteSpeed.valid).toBe(false);
    expect(infiniteSpeed.reason).toBe('invalid-sample');
  });
});
