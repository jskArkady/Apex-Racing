import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import App from '../App';
import { useGameStore } from '../store/gameStore';
import { trackCurve, trackLength } from '../utils/trackData';
import { activeBodies, triggerFrames } from './setup';

function getPlayerBody() {
  return Array.from(activeBodies).find(b => b.name === 'player');
}

const initialStoreState = useGameStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  act(() => {
    useGameStore.setState(initialStoreState);
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Adversarial Timing & Mock Integration Loop Verification', () => {

  describe('1. Fixed Delta Time Checkpoint Triggers (30Hz, 60Hz, 120Hz)', () => {
    it('should trigger checkpoints correctly regardless of the frame delta (30Hz vs 120Hz)', () => {
      const deltas = [1/30, 1/60, 1/120];

      for (const dt of deltas) {
        const { unmount } = render(<App />);
        
        act(() => {
          useGameStore.setState({
            gameState: 'playing',
            nextCheckpointIndex: 0,
            lap: 1,
            maxLaps: 3,
            currentTime: 0,
            totalTime: 0,
            bestLapTime: 0
          });
        });

        const body = getPlayerBody();
        expect(body).toBeDefined();

        // Approach the finish continuously from CP9; a direct teleport to CP0
        // is intentionally rejected by the production progress guard.
        window.mockKeys.reset = true;
        act(() => {
          triggerFrames(dt, 1);
        });
        window.mockKeys.reset = false;
        act(() => {
          for (let sample = 0; sample <= 120; sample += 1) {
            const progress = 0.9 + (sample / 120) * 0.1;
            const point = trackCurve.getPointAt(progress % 1);
            const tangent = trackCurve.getTangentAt(progress % 1).normalize();
            const rotation = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 0, -1),
              tangent
            );
            body.setTranslation({ x: point.x, y: point.y + 1, z: point.z });
            body.setRotation(rotation);
            body.setLinvel({ x: tangent.x * 20, y: tangent.y * 20, z: tangent.z * 20 });
            triggerFrames(dt, 1);
          }
        });

        // Checkpoint 0 should be passed, meaning next checkpoint is 1
        expect(useGameStore.getState().nextCheckpointIndex).toBe(1);
        
        unmount();
      }
    });

    it('should dynamically trigger checkpoints when moving past them at different delta times', () => {
      const deltas = [1/30, 1/60, 1/120];

      for (const dt of deltas) {
        const { unmount } = render(<App />);
        
        act(() => {
          useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 2 });
        });

        const body = getPlayerBody();
        expect(body).toBeDefined();

        // Rebase at the last valid checkpoint before simulating continuous
        // track-following motion toward checkpoint 2.
        window.mockKeys.reset = true;
        act(() => {
          triggerFrames(dt, 1);
        });
        window.mockKeys.reset = false;
        expect(useGameStore.getState().nextCheckpointIndex).toBe(2);

        const speed = 50;
        const framesNeeded = Math.ceil((trackLength * 0.1) / (speed * dt));
        act(() => {
          for (let frame = 1; frame <= framesNeeded; frame += 1) {
            const progress = 0.1 + (frame / framesNeeded) * 0.1;
            const point = trackCurve.getPointAt(progress);
            const tangent = trackCurve.getTangentAt(progress).normalize();
            const rotation = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 0, -1),
              tangent
            );
            body.setTranslation({ x: point.x, y: point.y + 1, z: point.z });
            body.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
            body.setLinvel({ x: tangent.x * speed, y: 0, z: tangent.z * speed });
            triggerFrames(dt, 1);
          }
        });

        // Verify checkpoint 2 has been passed and nextCheckpointIndex is now 3
        expect(useGameStore.getState().nextCheckpointIndex).toBe(3);

        unmount();
      }
    });
  });

  describe('2. Physics Integration Consistency under Varying Delta Times', () => {
    it('should produce mathematically consistent acceleration and velocity at 30Hz, 60Hz, and 120Hz', () => {
      const stepConfigs = [
        { name: '30Hz', dt: 1/30, steps: 30 },
        { name: '60Hz', dt: 1/60, steps: 60 },
        { name: '120Hz', dt: 1/120, steps: 120 }
      ];

      const results = {};

      for (const config of stepConfigs) {
        const { unmount } = render(<App />);
        
        act(() => {
          useGameStore.setState({ gameState: 'playing' });
        });

        const body = getPlayerBody();
        
        // Reset body state
        act(() => {
          body.setTranslation({ x: 0, y: 1, z: 0 });
          body.setLinvel({ x: 0, y: 0, z: 0 });
        });

        // Hold down forward key
        window.mockKeys.forward = true;

        // Run for exactly 1.0 second of simulation time
        act(() => {
          triggerFrames(config.dt, config.steps);
        });

        // Capture velocity and position
        results[config.name] = {
          vel: { ...body.linvel() },
          pos: { ...body.translation() }
        };

        window.mockKeys.forward = false;
        unmount();
      }

      // Assertions:
      // Final Z-velocity should be exactly identical across all step sizes because F * dt / mass is linear
      expect(results['30Hz'].vel.z).toBeCloseTo(results['60Hz'].vel.z, 5);
      expect(results['120Hz'].vel.z).toBeCloseTo(results['60Hz'].vel.z, 5);
      
      // Final Z-position should be very close (Euler integration error O(dt)).
      // The 12kN launch force produces a deliberate 0.083m difference between
      // 30Hz and 60Hz semi-implicit Euler integration over one second.
      const diff30vs60 = Math.abs(results['30Hz'].pos.z - results['60Hz'].pos.z);
      const diff120vs60 = Math.abs(results['120Hz'].pos.z - results['60Hz'].pos.z);

      expect(diff30vs60).toBeLessThan(0.1);
      expect(diff120vs60).toBeLessThan(0.1);
    });

    it('should behave consistently under variable delta times (frame rate jitter)', () => {
      const { unmount } = render(<App />);
      
      act(() => {
        useGameStore.setState({ gameState: 'playing' });
      });

      const body = getPlayerBody();

      act(() => {
        body.setTranslation({ x: 0, y: 1, z: 0 });
        body.setLinvel({ x: 0, y: 0, z: 0 });
      });

      window.mockKeys.forward = true;

      // Simulate varying delta times that sum to exactly 1.0 second:
      // 10 frames of 0.02s (200ms)
      // 20 frames of 0.015s (300ms)
      // 10 frames of 0.05s (500ms)
      // Total: 200 + 300 + 500 = 1000ms = 1.0s
      act(() => {
        triggerFrames(0.02, 10);
        triggerFrames(0.015, 20);
        triggerFrames(0.05, 10);
      });

      // 12kN / 1,200kg applied for one second = 10m/s.
      expect(body.linvel().z).toBeCloseTo(-10, 4);

      expect(body.translation().z).toBeCloseTo(-5.17, 1);

      window.mockKeys.forward = false;
      unmount();
    });

    it('should never turn lateral projection distance into a physical respawn across step sizes', () => {
      const stepConfigs = [
        { name: '30Hz', dt: 1/30, steps: 45 },
        { name: '120Hz', dt: 1/120, steps: 180 }
      ];

      const results = {};

      for (const config of stepConfigs) {
        const { unmount } = render(<App />);
        
        act(() => {
          useGameStore.setState({ gameState: 'playing' });
        });

        const body = getPlayerBody();
        const translationSpy = vi.spyOn(body, 'setTranslation');

        // Start clearly beyond the 16m recovery boundary. The full ±8m road
        // and nearby runoff are intentionally valid and must not auto-respawn.
        act(() => {
          body.setTranslation({ x: 20, y: 1, z: 0 });
          body.setLinvel({ x: 20, y: 0, z: 0 }); // 20 m/s sideways
        });

        // Remain globally beyond 20m for more than the 1.25s recovery delay.
        act(() => {
          triggerFrames(config.dt, config.steps);
        });

        results[config.name] = {
          lateralSpeed: body.linvel().x,
          translationCalls: translationSpy.mock.calls.length,
        };

        unmount();
      }

      // Projection only gates race progress. It must neither move the rigid
      // body nor zero velocity at any supported render step.
      expect(results['30Hz'].translationCalls).toBe(1);
      expect(results['120Hz'].translationCalls).toBe(1);
      expect(results['30Hz'].lateralSpeed).toBeGreaterThan(1);
      expect(results['120Hz'].lateralSpeed).toBeGreaterThan(1);
    });
  });

  describe('3. Telemetry HUD and Time Increments under Varying Delta Times', () => {
    it('should increment gameStore currentTime by the exact sum of delta times', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', currentTime: 0 });
      });

      // Run 7 frames of non-standard deltas
      const deltas = [0.033, 0.016, 0.050, 0.008, 0.120, 0.045, 0.022];
      const totalDelta = deltas.reduce((sum, d) => sum + d, 0); // 0.294s

      for (const dt of deltas) {
        act(() => {
          triggerFrames(dt, 1);
        });
      }

      expect(useGameStore.getState().currentTime).toBeCloseTo(totalDelta, 6);
    });
  });
});
