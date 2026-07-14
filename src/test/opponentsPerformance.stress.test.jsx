import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import App from '../App';
import { useGameStore } from '../store/gameStore';
import { activeBodies, triggerFrames } from './setup';

function getAIBodies() {
  return Array.from(activeBodies).filter(b => b.name?.startsWith('ai_'));
}

describe('AI Opponent Performance and Behavior Stress Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.setState({
      gameState: 'playing',
      lap: 1,
      // Keep the player at the normal initial checkpoint. With a one-lap race,
      // checkpoint zero at the start line finishes the whole game on frame 1
      // and prevents this test from observing the AI recovery controller.
      nextCheckpointIndex: 1,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Stuck Recovery State Machine Verification', () => {
    it('should transition to reversing and then realigning when the AI is stuck', () => {
      const { unmount } = render(<App />);
      const aiBodies = getAIBodies();
      expect(aiBodies.length).toBeGreaterThan(0);

      const aiBody = aiBodies[0];
      
      // Pin the AI car velocity and position so it is stuck
      // Force translation to remain at start pos and velocity to remain 0
      const originalApplyImpulse = aiBody.applyImpulse;
      const impulses = [];
      aiBody.applyImpulse = (impulse) => {
        impulses.push({ ...impulse });
        // Call original but keep velocity clamped to simulate being physically stuck
        originalApplyImpulse(impulse);
        aiBody.setLinvel({ x: 0, y: 0, z: 0 });
      };

      // Run simulation loop in steps.
      // The stuck threshold is 1.5 seconds. At 60Hz: 1.5 / (1/60) = 90 frames.
      // Let's run 1.0 second (60 frames) and verify it has NOT started reversing (impulses should be forward)
      act(() => {
        triggerFrames(1/60, 60);
      });

      // Forward vector is roughly (0, 0, -1). Forward impulses should have z < 0.
      const longitudinalImpuls = impulses.filter(imp => Math.abs(imp.z) > 0.01);
      expect(longitudinalImpuls.length).toBeGreaterThan(0);
      let lastLongImpulse = longitudinalImpuls[longitudinalImpuls.length - 1];
      expect(lastLongImpulse.z).toBeLessThan(0); // Forward driving force

      // Now run another 1.0 second (total 2.0 seconds, which is > 1.5s stuck limit)
      // It should trigger stuck recovery reversing state (engineForce becomes negative, impulse z > 0)
      impulses.length = 0; // Clear recorded impulses
      act(() => {
        triggerFrames(1/60, 60);
      });

      const nextLongImpuls = impulses.filter(imp => Math.abs(imp.z) > 0.01);
      expect(nextLongImpuls.length).toBeGreaterThan(0);
      // Find if any impulse in the last batch had positive z (reversing)
      const hasReversingImpulse = nextLongImpuls.some(imp => imp.z > 0);
      expect(hasReversingImpulse).toBe(true);

      unmount();
    });
  });

  describe('2. Allocation Analysis (Avoidance of GC Stutter)', () => {
    it('should not contain high-frequency object allocations inside the useFrame loop', () => {
      // Load the source code of Opponents.jsx
      const filePath = path.resolve(__dirname, '../components/Opponents.jsx');
      const source = fs.readFileSync(filePath, 'utf8');

      // We extract the useFrame body to check for allocations inside the loop
      const useFrameStart = source.indexOf('useFrame((state, delta) => {');
      expect(useFrameStart).toBeGreaterThan(-1);

      // Find the matching closing bracket for useFrame
      let bracketCount = 1;
      let i = useFrameStart + 'useFrame((state, delta) => {'.length;
      while (bracketCount > 0 && i < source.length) {
        if (source[i] === '{') bracketCount++;
        else if (source[i] === '}') bracketCount--;
        i++;
      }
      const useFrameBody = source.slice(useFrameStart, i);

      // 1. Check for 'new THREE.Quaternion' inside useFrame
      const hasNewQuaternion = /new\s+THREE\.Quaternion/i.test(useFrameBody);
      
      // 2. Check for 'Object.entries' inside useFrame
      const hasObjectEntries = /Object\.entries/i.test(useFrameBody);

      // 3. Check for un-targeted curve point/tangent getters (allocates new Vector3)
      // e.g. trackCurve.getPointAt(lookAheadProgressSteer) without second parameter
      const hasUntargetedGetPoint = /trackCurve\.getPointAt\([^,)]+\)/.test(useFrameBody);

      expect(hasNewQuaternion).toBe(false);
      expect(hasObjectEntries).toBe(false);
      expect(hasUntargetedGetPoint).toBe(false);
    });
  });
});
