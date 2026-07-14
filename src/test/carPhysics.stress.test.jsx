import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from '../App';
import { useGameStore } from '../store/gameStore';
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

describe('Car Physics Stress and Stability Tests', () => {
  // Test 1: High speed sharp turns (power slides)
  it('should remain stable during high speed sharp turns (power slides)', () => {
    const { unmount } = render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });

    const body = getPlayerBody();
    expect(body).toBeDefined();

    // Set high forward speed (moving along -z direction)
    act(() => {
      body.setTranslation({ x: 0, y: 1, z: 0 });
      body.setLinvel({ x: 0, y: 0, z: -50 }); // 50 m/s (~180 km/h)
    });

    // Press forward and left
    window.mockKeys.forward = true;
    window.mockKeys.left = true;

    // Run for 3 seconds of simulation time at 60Hz
    act(() => {
      triggerFrames(1/60, 180);
    });

    const linVel = body.linvel();
    const pos = body.translation();

    // Check that values are not NaN and not infinite
    expect(linVel.x).not.toBeNaN();
    expect(linVel.y).not.toBeNaN();
    expect(linVel.z).not.toBeNaN();
    expect(pos.x).not.toBeNaN();
    expect(pos.y).not.toBeNaN();
    expect(pos.z).not.toBeNaN();

    // Speed should not have blown up to astronomical values
    const speed = Math.sqrt(linVel.x**2 + linVel.y**2 + linVel.z**2);
    expect(speed).toBeLessThan(100);

    window.mockKeys.forward = false;
    window.mockKeys.left = false;
    unmount();
  });

  // Test 2: Continuous handbrake drifting
  it('should remain stable during continuous handbrake drifting', () => {
    const { unmount } = render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });

    const body = getPlayerBody();
    expect(body).toBeDefined();

    // Set moderate speed
    act(() => {
      body.setTranslation({ x: 0, y: 1, z: 0 });
      body.setLinvel({ x: 0, y: 0, z: -30 });
    });

    // Press forward, left, and brake (drift)
    window.mockKeys.forward = true;
    window.mockKeys.left = true;
    window.mockKeys.brake = true;

    // Run for 5 seconds at 60Hz
    act(() => {
      triggerFrames(1/60, 300);
    });

    const linVel = body.linvel();

    expect(linVel.x).not.toBeNaN();
    expect(linVel.z).not.toBeNaN();
    expect(Math.sqrt(linVel.x**2 + linVel.z**2)).toBeLessThan(100);

    window.mockKeys.forward = false;
    window.mockKeys.left = false;
    window.mockKeys.brake = false;
    unmount();
  });

  // Test 3: Stationary or low speed reverse transitions
  it('should handle stationary and low speed reverse transitions without jitter or NaN', () => {
    const { unmount } = render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });

    const body = getPlayerBody();
    expect(body).toBeDefined();

    // Start stationary
    act(() => {
      body.setTranslation({ x: 0, y: 1, z: 0 });
      body.setLinvel({ x: 0, y: 0, z: 0 });
    });

    // Press backward (should engage reverse engine force)
    window.mockKeys.backward = true;

    // Run for 2 seconds at 60Hz
    act(() => {
      triggerFrames(1/60, 120);
    });

    let linVel = body.linvel();
    expect(linVel.z).toBeGreaterThan(0); // moving backward (+z)
    expect(linVel.z).not.toBeNaN();

    // Release backward, press forward to transition back to forward movement
    window.mockKeys.backward = false;
    window.mockKeys.forward = true;

    // Run for 3 seconds
    act(() => {
      triggerFrames(1/60, 180);
    });

    linVel = body.linvel();
    expect(linVel.z).toBeLessThan(0); // moving forward (-z)
    expect(linVel.z).not.toBeNaN();

    window.mockKeys.forward = false;
    unmount();
  });

  // Test 4: Different physics frame deltas (check for NaN values or crashes)
  it('keeps lateral grip finite without erasing momentum after large frame deltas', () => {
    const { unmount } = render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });

    const body = getPlayerBody();
    expect(body).toBeDefined();

    // Reset body state with initial lateral speed
    act(() => {
      body.setTranslation({ x: 0, y: 1, z: 0 });
      body.setLinvel({ x: 10, y: 0, z: -20 }); // Sideways speed 10 m/s
    });

    // Case A: normal delta (1/60s ~ 0.016s) - Should stabilize and lateral speed should decrease
    window.mockKeys.forward = true; // active input to trigger gripMultiplier = 12
    act(() => {
      triggerFrames(1/60, 5);
    });
    
    let linVelNormal = body.linvel();
    expect(linVelNormal.x).not.toBeNaN();
    // Lateral speed should decrease from 10
    expect(Math.abs(linVelNormal.x)).toBeLessThan(10);

    // Reset for Case B
    act(() => {
      body.setTranslation({ x: 0, y: 1, z: 0 });
      body.setLinvel({ x: 10, y: 0, z: -20 });
    });

    // Case B: Large delta (0.2s). Synthetic grip uses the same 0.05s
    // controller cap as engine and steering, so one delayed render callback
    // cannot erase 95% of momentum.
    act(() => {
      triggerFrames(0.2, 1);
    });

    let linVelLarge1 = body.linvel();
    expect(linVelLarge1.x).not.toBeNaN();
    expect(Math.abs(linVelLarge1.x)).toBeGreaterThan(1);
    expect(Math.abs(linVelLarge1.x)).toBeLessThan(10);

    // Repeated callbacks still converge smoothly instead of oscillating.
    act(() => {
      triggerFrames(0.2, 1);
    });
    let linVelLarge2 = body.linvel();
    // The race can finish during this synthetic off-curve sample, in which
    // case physics pauses and preserves the last velocity. It must never grow.
    expect(Math.abs(linVelLarge2.x)).toBeLessThanOrEqual(Math.abs(linVelLarge1.x));
    expect(Number.isFinite(linVelLarge2.x)).toBe(true);

    window.mockKeys.forward = false;
    unmount();
  });

});
