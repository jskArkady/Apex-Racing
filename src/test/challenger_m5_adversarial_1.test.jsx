import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import App from '../App';
import { useGameStore } from '../store/gameStore';
import { trackCurve, getTrackPointAndTangent } from '../utils/trackData';
import { getStartGridPose } from '../utils/startGrid';
import { getRuntimeDiagnostics, RUNTIME_EVENT_ID } from '../utils/runtimeDiagnostics';
import { activeBodies, triggerFrames } from './setup';

function getPlayerBody() {
  return Array.from(activeBodies).find(b => b.name === 'player');
}

function getAIBodies() {
  return Array.from(activeBodies).filter(b => b.name?.startsWith('ai_'));
}

const initialStoreState = useGameStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  act(() => {
    useGameStore.setState({
      ...initialStoreState,
      gameState: 'playing'
    });
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('1. trackData.js - getTrackPointAndTangent Adversarial Inputs', () => {
  it('should handle zero, positive, and wrapped progress values correctly', () => {
    const pt0 = getTrackPointAndTangent(0);
    const pt1 = getTrackPointAndTangent(1.0);
    expect(pt0.point.x).toBeCloseTo(pt1.point.x);
    expect(pt0.point.y).toBeCloseTo(pt1.point.y);
    expect(pt0.point.z).toBeCloseTo(pt1.point.z);

    const pt05 = getTrackPointAndTangent(0.5);
    const pt105 = getTrackPointAndTangent(10.5);
    expect(pt05.point.x).toBeCloseTo(pt105.point.x);
  });

  it('should handle negative progress values wrapping correctly', () => {
    const ptNeg = getTrackPointAndTangent(-0.25);
    expect(ptNeg.point).toBeDefined();
    expect(Number.isNaN(ptNeg.point.x)).toBe(false);
  });

  it('should handle NaN, Infinity, -Infinity, null, and undefined values and throw/handle appropriately', () => {
    expect(() => getTrackPointAndTangent(NaN)).toThrow();
    expect(() => getTrackPointAndTangent(Infinity)).toThrow();
    expect(() => getTrackPointAndTangent(-Infinity)).toThrow();
    
    // Null behaves normally because null % 1.0 = 0
    expect(getTrackPointAndTangent(null)).toBeDefined();
    
    // Undefined behaves as NaN, so it throws
    expect(() => getTrackPointAndTangent(undefined)).toThrow();
  });
});

describe('2. gameStore.js - State Mutation & Verification Gaps', () => {
  it('updateSettings should clamp audio and handle malformed inputs without crashing', () => {
    // Normal clamping
    act(() => {
      useGameStore.getState().updateSettings({ audio: 150 });
    });
    expect(useGameStore.getState().settings.audio).toBe(100);

    act(() => {
      useGameStore.getState().updateSettings({ audio: -50 });
    });
    expect(useGameStore.getState().settings.audio).toBe(0);

    // Malformed settings
    act(() => {
      useGameStore.getState().updateSettings({ audio: 'invalid-string' });
    });
    expect(useGameStore.getState().settings.audio).toBe(0);

    // Null/undefined newSettings should be handled without crashing
    act(() => {
      useGameStore.getState().updateSettings(null);
      useGameStore.getState().updateSettings(undefined);
    });
    expect(useGameStore.getState().settings.audio).toBeDefined();
  });

  it('startGame should be a no-op if the game is already playing or paused', () => {
    act(() => {
      useGameStore.setState({ gameState: 'playing', currentTime: 42 });
    });
    
    act(() => {
      useGameStore.getState().startGame('single');
    });

    expect(useGameStore.getState().gameState).toBe('playing');
    expect(useGameStore.getState().currentTime).toBe(42);
  });

  it('incrementTime should only increment currentTime when gameState is playing', () => {
    act(() => {
      useGameStore.setState({ gameState: 'countdown', currentTime: 10 });
    });
    act(() => {
      useGameStore.getState().incrementTime(5);
    });
    expect(useGameStore.getState().currentTime).toBe(10);

    act(() => {
      useGameStore.setState({ gameState: 'playing', currentTime: 10 });
    });
    act(() => {
      useGameStore.getState().incrementTime(5);
    });
    expect(useGameStore.getState().currentTime).toBe(15);
  });

  it('updateRacerProgress with non-matching ID should not crash or modify racer count', () => {
    const initialRacersCount = useGameStore.getState().racers.length;
    act(() => {
      useGameStore.getState().updateRacerProgress('non-existent-racer', 2, 3, 10, false, 20, 20);
    });
    expect(useGameStore.getState().racers.length).toBe(initialRacersCount);
  });

  it('decrementCountdown when countdown is already at 0/1 should transition to playing and set to 0', () => {
    act(() => {
      useGameStore.setState({ gameState: 'countdown', countdown: 0 });
    });
    act(() => {
      useGameStore.getState().decrementCountdown();
    });
    expect(useGameStore.getState().gameState).toBe('playing');
    expect(useGameStore.getState().countdown).toBe(0);
  });
});

describe('3. Car.jsx - Physics & Control Edge Cases', () => {
  it('Car Physics: produces a launch impulse large enough to move the 1,200kg body', () => {
    const { unmount } = render(<App />);
    const body = getPlayerBody();
    const impulseSpy = vi.spyOn(body, 'applyImpulse');

    window.mockKeys.forward = true;
    act(() => {
      triggerFrames(1/60, 1);
    });

    const launchImpulse = impulseSpy.mock.calls[0][0];
    expect(launchImpulse.y).toBeCloseTo(0, 8);
    expect(launchImpulse.z).toBeCloseTo(-200, 5);
    expect(body.linvel().z).toBeLessThan(-0.15);
    unmount();
  });

  it('Car Physics: gives A/D yaw authority from rest around the world-up axis', () => {
    const { unmount } = render(<App />);
    const body = getPlayerBody();
    const torqueSpy = vi.spyOn(body, 'applyTorqueImpulse');

    window.mockKeys.left = true;
    act(() => {
      triggerFrames(1/60, 1);
    });

    expect(torqueSpy.mock.calls[0][0].x).toBeCloseTo(0, 8);
    expect(torqueSpy.mock.calls[0][0].y).toBeGreaterThan(0);
    expect(torqueSpy.mock.calls[0][0].z).toBeCloseTo(0, 8);
    expect(body.setAngvel).toHaveBeenCalledWith(
      expect.objectContaining({ y: expect.any(Number) }),
      true
    );
    expect(body.setAngvel.mock.calls[0][0].y).toBeGreaterThan(0);
    unmount();
  });

  it('Car Physics: keeps engine impulse horizontal when the chassis is pitched', () => {
    const { unmount } = render(<App />);
    const body = getPlayerBody();
    const impulseSpy = vi.spyOn(body, 'applyImpulse');
    const pitched = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 4, 0, 0));

    act(() => {
      body.setRotation(pitched);
    });
    window.mockKeys.forward = true;
    act(() => {
      triggerFrames(1/60, 1);
    });

    const launchImpulse = impulseSpy.mock.calls[0][0];
    expect(launchImpulse.y).toBeCloseTo(0, 8);
    expect(launchImpulse.z).toBeLessThan(0);
    unmount();
  });

  it('Car Physics: only R resets a high-speed fallen car', () => {
    const { unmount } = render(<App />);
    const body = getPlayerBody();
    expect(body).toBeDefined();
    const recoveryPoint = getStartGridPose('player', 'single').point;

    act(() => {
      body.setTranslation({ x: 0, y: -10, z: 0 });
      body.setLinvel({ x: 1000, y: 0, z: 0 });
    });

    act(() => {
      triggerFrames(1/60, 1);
    });

    // Falling is not authority to mutate the physical body. Recovery is an
    // explicit R rising-edge action, even at extreme velocity.
    expect(body.translation().x).not.toBeCloseTo(recoveryPoint.x);
    expect(body.linvel()).not.toEqual({ x: 0, y: 0, z: 0 });

    window.mockKeys.reset = true;
    act(() => {
      triggerFrames(1/60, 1);
    });
    window.mockKeys.reset = false;

    expect(body.translation().y).toBeCloseTo(recoveryPoint.y + 1);
    expect(body.translation().x).toBeCloseTo(recoveryPoint.x);
    expect(body.translation().z).toBeCloseTo(recoveryPoint.z);
    expect(body.linvel()).toEqual({ x: 0, y: 0, z: 0 });

    unmount();
  });

  it('Car Physics: low-speed braking jitter removal cancels velocity exactly', () => {
    const { unmount } = render(<App />);
    const body = getPlayerBody();
    expect(body).toBeDefined();

    act(() => {
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 });
      body.setLinvel({ x: 0, y: 0, z: -0.05 });
    });

    window.mockKeys.brake = true;

    act(() => {
      triggerFrames(1/60, 1);
    });

    expect(body.linvel().z).toBeCloseTo(0, 5);
    unmount();
  });

  it('Car Physics: inverts steering torque when driving backward', () => {
    const { unmount } = render(<App />);
    const body = getPlayerBody();
    expect(body).toBeDefined();

    const torqueSpy = vi.spyOn(body, 'applyTorqueImpulse');

    act(() => {
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 });
      body.setLinvel({ x: 0, y: 0, z: -2 });
    });
    window.mockKeys.left = true;
    act(() => {
      triggerFrames(1/60, 1);
    });

    expect(torqueSpy).toHaveBeenCalled();
    const forwardTorque = torqueSpy.mock.calls[0][0];
    torqueSpy.mockClear();

    act(() => {
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 });
      body.setLinvel({ x: 0, y: 0, z: 2 });
    });
    window.mockKeys.left = true;
    act(() => {
      triggerFrames(1/60, 1);
    });

    expect(torqueSpy).toHaveBeenCalled();
    const backwardTorque = torqueSpy.mock.calls[0][0];

    expect(backwardTorque.y).toBeCloseTo(-forwardTorque.y, 5);

    unmount();
  });

  it('Car Physics: applies correct grip and drifting forces depending on controls and speed', () => {
    const findLateralCorrection = calls => calls
      .map(call => call[0])
      .find(impulse =>
        Math.abs(impulse.x) > 1e-6 &&
        Math.abs(impulse.y) < 1e-6 &&
        Math.abs(impulse.z) < 1e-6
      );

    const coastingRender = render(<App />);
    let body = getPlayerBody();
    expect(body).toBeDefined();

    window.mockKeys.forward = false;
    window.mockKeys.backward = false;
    window.mockKeys.left = false;
    window.mockKeys.right = false;
    window.mockKeys.brake = false;

    act(() => {
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 });
      body.setLinvel({ x: 0, y: 0, z: -5 });
      triggerFrames(1/60, 10);
    });

    body = getPlayerBody();
    const impulseSpy = vi.spyOn(body, 'applyImpulse');
    act(() => {
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 });
      body.setLinvel({ x: 5, y: 0, z: -0.5 });
      triggerFrames(1/60, 1);
    });

    let lateralImp = findLateralCorrection(impulseSpy.mock.calls);
    expect(lateralImp).toBeDefined();
    expect(lateralImp.x).toBeLessThan(0);
    const coastingCorrectionMagnitude = Math.abs(lateralImp.x);

    coastingRender.unmount();

    const driftingRender = render(<App />);
    body = getPlayerBody();
    expect(body).toBeDefined();

    window.mockKeys.left = true;
    act(() => {
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 });
      body.setLinvel({ x: 0, y: 0, z: -35 });
      triggerFrames(1/60, 10);
    });

    body = getPlayerBody();
    const driftingImpulseSpy = vi.spyOn(body, 'applyImpulse');
    act(() => {
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 });
      body.setLinvel({ x: 5, y: 0, z: -35 });
      triggerFrames(1/60, 1);
    });

    lateralImp = findLateralCorrection(driftingImpulseSpy.mock.calls);
    expect(lateralImp).toBeDefined();
    expect(lateralImp.x).toBeLessThan(0);
    expect(Math.abs(lateralImp.x)).toBeLessThan(coastingCorrectionMagnitude);

    driftingRender.unmount();
  });

  it('Car Checkpoint: blocks reverse traversal regardless of reverse speed', () => {
    const { unmount } = render(<App />);
    const body = getPlayerBody();
    expect(body).toBeDefined();

    act(() => {
      useGameStore.setState({ nextCheckpointIndex: 1, isDrivingBackwards: true });
    });
    const cp1Pos = trackCurve.getPointAt(0.1);
    const tangent1 = trackCurve.getTangentAt(0.1);
    act(() => {
      body.setTranslation(cp1Pos);
      const oppositeDir = tangent1.clone().negate().normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), oppositeDir);
      body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      body.setLinvel({ x: oppositeDir.x * 2.0, y: 0, z: oppositeDir.z * 2.0 });
    });

    act(() => {
      triggerFrames(1/60, 1);
    });

    expect(useGameStore.getState().nextCheckpointIndex).toBe(1);

    act(() => {
      const oppositeDir = tangent1.clone().negate().normalize();
      body.setLinvel({ x: oppositeDir.x * 0.1, y: 0, z: oppositeDir.z * 0.1 });
    });

    act(() => {
      triggerFrames(1/60, 1);
    });

    expect(useGameStore.getState().nextCheckpointIndex).toBe(1);

    unmount();
  });
});

describe('4. Opponents.jsx - AI Edge Cases', () => {
  it('AI Opponents: recovers to the last valid checkpoint when falling off track (y < -5)', () => {
    getRuntimeDiagnostics().clear();
    const { unmount } = render(<App />);
    const aiBodies = getAIBodies();
    expect(aiBodies.length).toBeGreaterThan(0);
    const aiBody = aiBodies[0];

    act(() => {
      aiBody.setTranslation({ x: 0, y: -10, z: 0 });
    });

    act(() => {
      triggerFrames(1/60, 1);
    });

    const startPose = getStartGridPose(aiBody.name, 'single');
    expect(aiBody.translation().y).toBeCloseTo(startPose.position[1], 2);
    expect(Math.hypot(
      aiBody.translation().x - startPose.position[0],
      aiBody.translation().z - startPose.position[2]
    )).toBeLessThan(0.25);
    expect(Math.hypot(aiBody.linvel().x, aiBody.linvel().z)).toBeGreaterThan(1);
    expect(getRuntimeDiagnostics().events).toContainEqual(expect.objectContaining({
      id: RUNTIME_EVENT_ID.AI_FALL_RECOVERY,
      racerId: aiBody.name,
      recoverySpeed: 8
    }));

    unmount();
  });

  it('AI Opponents: applies steering torque to avoid walls when too close', () => {
    const { unmount } = render(<App />);
    const aiBodies = getAIBodies();
    expect(aiBodies.length).toBeGreaterThan(0);
    const aiBody = aiBodies[0];

    const torqueSpy = vi.spyOn(aiBody, 'applyTorqueImpulse');

    act(() => {
      const pt = trackCurve.getPointAt(0.1);
      const tangent = trackCurve.getTangentAt(0.1);
      const rightVec = tangent.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
      const wallPos = pt.clone().add(rightVec.clone().multiplyScalar(-5.0));
      
      aiBody.setTranslation({ x: wallPos.x, y: 1, z: wallPos.z });
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), tangent);
      aiBody.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    });

    act(() => {
      triggerFrames(1/60, 1);
    });

    expect(torqueSpy).toHaveBeenCalled();
    unmount();
  });

  it('AI Opponents: scales down speed and steers away when another car is ahead', () => {
    const { unmount } = render(<App />);
    const aiBodies = getAIBodies();
    expect(aiBodies.length).toBeGreaterThan(0);
    const aiBody = aiBodies[0];

    const pt = trackCurve.getPointAt(0.1);
    const tangent = trackCurve.getTangentAt(0.1);

    const impulseSnapshots = [];
    const torqueSnapshots = [];
    const originalApplyImpulse = aiBody.applyImpulse.bind(aiBody);
    const originalApplyTorqueImpulse = aiBody.applyTorqueImpulse.bind(aiBody);

    vi.spyOn(aiBody, 'applyImpulse').mockImplementation((impulse, ...args) => {
      impulseSnapshots.push({ x: impulse.x, y: impulse.y, z: impulse.z });
      return originalApplyImpulse(impulse, ...args);
    });
    vi.spyOn(aiBody, 'applyTorqueImpulse').mockImplementation((torque, ...args) => {
      torqueSnapshots.push({ x: torque.x, y: torque.y, z: torque.z });
      return originalApplyTorqueImpulse(torque, ...args);
    });
    
    act(() => {
      aiBody.setTranslation({ x: pt.x, y: 1, z: pt.z });
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), tangent);
      aiBody.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      aiBody.setLinvel({ x: tangent.x * 20, y: 0, z: tangent.z * 20 });
      window.racerPositions = {};
    });

    act(() => {
      triggerFrames(1/60, 1);
    });

    const clearLongitudinalImpulse = impulseSnapshots.reduce(
      (sum, impulse) => sum + impulse.x * tangent.x + impulse.z * tangent.z,
      0
    );
    const clearSteeringTorque = torqueSnapshots[0]?.y;

    impulseSnapshots.length = 0;
    torqueSnapshots.length = 0;

    const right = tangent.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
    const frontPos = pt.clone()
      .add(tangent.clone().multiplyScalar(4.0))
      .add(right.multiplyScalar(0.5));
    act(() => {
      aiBody.setTranslation({ x: pt.x, y: 1, z: pt.z });
      aiBody.setLinvel({ x: tangent.x * 20, y: 0, z: tangent.z * 20 });
      window.racerPositions = {
        blocker: { x: frontPos.x, z: frontPos.z, color: '#ff3366' }
      };
    });

    act(() => {
      triggerFrames(1/60, 1);
    });

    const blockedLongitudinalImpulse = impulseSnapshots.reduce(
      (sum, impulse) => sum + impulse.x * tangent.x + impulse.z * tangent.z,
      0
    );
    const blockedSteeringTorque = torqueSnapshots[0]?.y;

    expect(clearLongitudinalImpulse).toBeGreaterThan(0);
    expect(blockedLongitudinalImpulse).toBeLessThan(0);
    expect(clearSteeringTorque).toBeDefined();
    expect(blockedSteeringTorque).toBeDefined();
    expect(blockedSteeringTorque).not.toBeCloseTo(clearSteeringTorque, 5);

    unmount();
  });

  it('AI Opponents: uses global search fallback when very far from the track', () => {
    const { unmount } = render(<App />);
    const aiBodies = getAIBodies();
    expect(aiBodies.length).toBeGreaterThan(0);
    const aiBody = aiBodies[0];

    act(() => {
      const farPos = new THREE.Vector3(0, 1, 30);
      aiBody.setTranslation(farPos);
    });

    act(() => {
      triggerFrames(1/60, 1);
    });

    const myId = aiBody.name;
    expect(window.racerProgress[myId]).toBeDefined();
    unmount();
  });
});
