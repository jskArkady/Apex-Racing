import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from '../App';
import { useGameStore } from '../store/gameStore';
import { activeBodies, triggerFrames } from './setup';

function getPlayerBody() {
  return Array.from(activeBodies).find(b => b.name === 'player');
}

const getCleanDefaultState = () => ({
  gameState: 'menu',
  gameMode: 'single',
  settings: {
    audio: 50,
    autoTransmission: true,
    tractionControl: true,
    abs: true,
    racingLine: false,
  },
  lap: 1,
  maxLaps: 3,
  position: 1,
  totalRacers: 4,
  currentTime: 0,
  bestLapTime: 0,
  lastLapTime: 0,
  totalTime: 0,
  countdown: 3,
  speed: 0,
  rpm: 0,
  gear: 1,
  totalCheckpoints: 10,
  nextCheckpointIndex: 0,
  isDrivingBackwards: false,
  racers: [
    { id: 'player', lap: 1, nextCheckpointIndex: 0, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 },
    { id: 'ai_1', lap: 1, nextCheckpointIndex: 0, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 },
    { id: 'ai_2', lap: 1, nextCheckpointIndex: 0, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 },
    { id: 'ai_3', lap: 1, nextCheckpointIndex: 0, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 }
  ]
});

beforeEach(() => {
  vi.useFakeTimers();
  act(() => {
    useGameStore.setState(getCleanDefaultState());
  });
});

afterEach(() => {
  vi.useRealTimers();
  // Clear keys
  window.mockKeys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    reset: false,
    pause: false,
  };
});

describe('Car Physics Controller Stress Tests', () => {
  it('should behave stably under standard physics delta (1/60s)', () => {
    render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });
    
    const body = getPlayerBody();
    expect(body).toBeDefined();

    act(() => {
      body.setLinvel({ x: 10, y: 0, z: -20 });
    });

    window.mockKeys.forward = true;

    act(() => {
      triggerFrames(1/60, 10);
    });

    const vel = body.linvel();
    expect(Math.abs(vel.x)).toBeLessThan(10);
    expect(Number.isNaN(vel.x)).toBe(false);
    expect(Number.isNaN(vel.z)).toBe(false);
  });

  it('should remain stable and not diverge or produce NaN/Infinity under large frame deltas (e.g., delta >= 0.2s)', () => {
    render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });
    
    const body = getPlayerBody();
    expect(body).toBeDefined();
    
    act(() => {
      body.setLinvel({ x: 10, y: 0, z: -20 });
    });

    window.mockKeys.forward = true;

    let isUnstable = false;
    act(() => {
      for (let i = 0; i < 40; i++) {
        triggerFrames(0.25, 1);
        const vel = body.linvel();
        if (Number.isNaN(vel.x) || !Number.isFinite(vel.x) || Math.abs(vel.x) > 1e6) {
          isUnstable = true;
          break;
        }
      }
    });
    expect(isUnstable).toBe(false);
  });

  it('should handle stationary and low-speed reverse transitions stably', () => {
    render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });
    
    const body = getPlayerBody();
    expect(body).toBeDefined();
    
    act(() => {
      body.setLinvel({ x: 0, y: 0, z: 0 });
    });

    window.mockKeys.backward = true;
    
    act(() => {
      triggerFrames(1/60, 60); // 1 second
    });

    const vel1 = { ...body.linvel() };
    expect(vel1.z).toBeGreaterThan(0);
    expect(Number.isNaN(vel1.z)).toBe(false);
    
    window.mockKeys.backward = false;
    window.mockKeys.forward = true;

    act(() => {
      triggerFrames(1/60, 120); // 2 seconds
    });

    const vel2 = { ...body.linvel() };
    expect(vel2.z).toBeLessThan(vel1.z);
    expect(Number.isNaN(vel2.z)).toBe(false);
  });

  it('should handle continuous handbrake drifting stably under standard delta', () => {
    render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });
    
    const body = getPlayerBody();
    expect(body).toBeDefined();
    
    act(() => {
      body.setLinvel({ x: 0, y: 0, z: -30 });
    });

    window.mockKeys.brake = true;
    window.mockKeys.right = true;

    act(() => {
      triggerFrames(1/60, 200);
    });

    const vel = body.linvel();
    expect(Number.isNaN(vel.x)).toBe(false);
    expect(Number.isNaN(vel.z)).toBe(false);
    expect(Number.isFinite(vel.x)).toBe(true);
    expect(Number.isFinite(vel.z)).toBe(true);
  });
});
