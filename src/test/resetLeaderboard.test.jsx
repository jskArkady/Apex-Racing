import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from '../App';
import { useGameStore } from '../store/gameStore';
import { activeBodies, triggerFrames } from './setup';
import { trackCurve } from '../utils/trackData';
import { getStartGridPose } from '../utils/startGrid';

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
    useGameStore.setState(initialStoreState);
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Leaderboard Reset and Synchronization Verification', () => {
  it('preserves player and AI race progress across explicit recovery', () => {
    render(<App />);

    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });

    const playerBody = getPlayerBody();
    const aiBodies = getAIBodies();

    expect(playerBody).toBeDefined();
    expect(aiBodies.length).toBe(3);

    // Let the game run for some time so everyone advances
    window.mockKeys.forward = true;

    // Trigger 60 frames (1 second of play)
    act(() => {
      triggerFrames(1/60, 60);
    });

    // Check store state before reset
    const storeBefore = useGameStore.getState();
    const playerRacerBefore = storeBefore.racers.find(r => r.id === 'player');


    // Now, trigger a reset on the PLAYER
    act(() => {
      playerBody.setTranslation({ x: 0, y: -6, z: 0 }); // Fall off trigger
    });
    act(() => {
      triggerFrames(1/60, 1);
    });

    // Falling alone never authorizes a player teleport or velocity reset.
    expect(playerBody.translation().y).toBeLessThan(0);
    window.mockKeys.reset = true;
    act(() => {
      triggerFrames(1/60, 1);
    });
    window.mockKeys.reset = false;

    const storeAfterPlayerReset = useGameStore.getState();
    const playerRacerAfter = storeAfterPlayerReset.racers.find(r => r.id === 'player');
    const ai1RacerPreFall = storeAfterPlayerReset.racers.find(r => r.id === 'ai_1');


    // Before CP1, recovery preserves the assigned one-row grid slot instead
    // of jumping the player forward to the start/finish line.
    const playerStart = getStartGridPose('player', 'single');
    expect(playerBody.translation().y).toBeCloseTo(playerStart.position[1], 6);
    expect(playerBody.translation().x).toBeCloseTo(playerStart.position[0], 6);
    expect(playerBody.translation().z).toBeCloseTo(playerStart.position[2], 6);
    expect(playerBody.linvel().z).toBe(0);

    // Verify player progress (lap, checkpoint) is preserved!
    expect(playerRacerAfter?.lap).toBe(playerRacerBefore?.lap);
    expect(playerRacerAfter?.nextCheckpointIndex).toBe(playerRacerBefore?.nextCheckpointIndex);

    // Now, trigger a reset on the AI opponent (ai_1)
    const ai1Body = aiBodies.find(b => b.name === 'ai_1');
    expect(ai1Body).toBeDefined();

    act(() => {
      ai1Body.setTranslation({ x: 3, y: -6, z: -10 }); // Fall off trigger
    });

    // 1. Run the reset frame
    act(() => {
      triggerFrames(1/60, 1);
    });

    const storeDuringResetFrame = useGameStore.getState();
    const ai1RacerDuringReset = storeDuringResetFrame.racers.find(r => r.id === 'ai_1');


    expect(ai1RacerDuringReset?.lap).toBe(ai1RacerPreFall?.lap);
    expect(ai1RacerDuringReset?.nextCheckpointIndex).toBe(ai1RacerPreFall?.nextCheckpointIndex);
    expect(ai1RacerDuringReset?.currentTime).toBeGreaterThan(ai1RacerPreFall?.currentTime);
    expect(ai1RacerDuringReset?.currentTime).toBeLessThanOrEqual(ai1RacerPreFall.currentTime + 0.1);
    expect(ai1RacerDuringReset?.totalTime).toBe(ai1RacerPreFall?.totalTime);

    // 2. Run one more frame after the reset frame to allow AI state update to propagate
    act(() => {
      triggerFrames(1/60, 1);
    });

    const storeAfterResetFrame = useGameStore.getState();
    const ai1RacerAfterReset = storeAfterResetFrame.racers.find(r => r.id === 'ai_1');


    // The controller resumes timing immediately, while leaderboard reports
    // are intentionally published at 100ms cadence.
    expect(ai1RacerAfterReset?.lap).toBe(ai1RacerPreFall?.lap);
    expect(ai1RacerAfterReset?.nextCheckpointIndex).toBe(ai1RacerPreFall?.nextCheckpointIndex);
    expect(ai1RacerAfterReset?.currentTime).toBeGreaterThanOrEqual(ai1RacerPreFall.currentTime);
    expect(ai1RacerAfterReset?.currentTime).toBeLessThanOrEqual(ai1RacerPreFall.currentTime + 0.1);
    expect(ai1RacerAfterReset?.totalTime).toBe(ai1RacerPreFall?.totalTime);
  });

  it('recovers a high-speed fallen player on R without wiping progress', () => {
    const { unmount } = render(<App />);

    act(() => {
      useGameStore.setState({
        gameState: 'playing',
        lap: 2,
        maxLaps: 3,
        nextCheckpointIndex: 4,
        currentTime: 12,
        totalTime: 30
      });
    });

    const playerBody = getPlayerBody();
    const expectedRecoveryPoint = trackCurve.getPointAt(3 / 10);

    act(() => {
      playerBody.setTranslation({ x: 100, y: -10, z: 100 });
      playerBody.setLinvel({ x: 1000, y: -1000, z: 1000 });
      triggerFrames(1 / 60, 1);
    });

    expect(playerBody.translation().x).not.toBeCloseTo(expectedRecoveryPoint.x, 5);
    expect(playerBody.linvel()).not.toEqual({ x: 0, y: 0, z: 0 });
    window.mockKeys.reset = true;
    act(() => {
      triggerFrames(1 / 60, 1);
    });
    window.mockKeys.reset = false;

    expect(playerBody.translation().x).toBeCloseTo(expectedRecoveryPoint.x, 5);
    expect(playerBody.translation().y).toBeCloseTo(expectedRecoveryPoint.y + 1, 5);
    expect(playerBody.translation().z).toBeCloseTo(expectedRecoveryPoint.z, 5);
    expect(playerBody.linvel()).toEqual({ x: 0, y: 0, z: 0 });

    const state = useGameStore.getState();
    const playerRacer = state.racers.find(racer => racer.id === 'player');
    expect(state.lap).toBe(2);
    expect(state.nextCheckpointIndex).toBe(4);
    expect(state.totalTime).toBe(30);
    expect(state.currentTime).toBeCloseTo(12 + 2 / 60, 5);
    expect(playerRacer.lap).toBe(2);
    expect(playerRacer.nextCheckpointIndex).toBe(4);
    expect(playerRacer.totalTime).toBe(30);
    expect(playerRacer.currentTime).toBeCloseTo(12 + 2 / 60, 5);

    unmount();
  });
});
