import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import App from '../App';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_TRACK_ID, TRACK_PRESETS } from '../utils/trackData';
import { VEHICLE_DYNAMICS } from '../utils/vehicleDynamics';
import { activeBodies, triggerFrames } from './setup';

function getAI1Body() {
  return Array.from(activeBodies).find(body => body.name === 'ai_1');
}

function getAI1State() {
  return useGameStore.getState().racers.find(racer => racer.id === 'ai_1');
}

function resetRaceState() {
  useGameStore.setState({
    gameState: 'playing',
    lap: 1,
    maxLaps: 3,
    selectedTrackId: DEFAULT_TRACK_ID,
    currentTime: 0,
    totalTime: 0,
    totalCheckpoints: 10,
    nextCheckpointIndex: 1,
    racers: [
      { id: 'player', lap: 1, nextCheckpointIndex: 1, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 },
      { id: 'ai_1', lap: 1, nextCheckpointIndex: 1, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 },
      { id: 'ai_2', lap: 1, nextCheckpointIndex: 1, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 },
      { id: 'ai_3', lap: 1, nextCheckpointIndex: 1, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 }
    ]
  });
}

describe('AI race acceptance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    act(resetRaceState);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('recovers from a pin through reversing and realigning, resumes normal throttle, and moves forward', () => {
    const { unmount } = render(<App />);
    const aiBody = getAI1Body();
    expect(aiBody).toBeDefined();

    const originalApplyImpulse = aiBody.applyImpulse;
    const longitudinalImpulses = [];

    aiBody.applyImpulse = (impulse) => {
      if (Math.abs(impulse.z) > 1) {
        longitudinalImpulses.push(impulse.z);
      }
      originalApplyImpulse(impulse);
      aiBody.setLinvel({ x: 0, y: 0, z: 0 });
    };

    act(() => {
      triggerFrames(1 / 60, 100);
    });
    expect(longitudinalImpulses.some(impulse => impulse > 1)).toBe(true);
    expect(longitudinalImpulses.at(-1)).toBeGreaterThan(1);

    longitudinalImpulses.length = 0;
    act(() => {
      triggerFrames(1 / 60, 75);
    });
    expect(longitudinalImpulses.some(impulse => impulse > 1)).toBe(true);
    expect(longitudinalImpulses.at(-1)).toBeLessThan(-1);
    expect(longitudinalImpulses.some(impulse => (
      Math.abs(impulse - VEHICLE_DYNAMICS.reverseEngineForce / 60) < 1e-6
    ))).toBe(true);

    longitudinalImpulses.length = 0;
    act(() => {
      triggerFrames(1 / 60, 50);
    });
    expect(longitudinalImpulses.some(impulse => impulse < -1)).toBe(true);
    expect(longitudinalImpulses.at(-1)).toBeLessThan(-1);

    aiBody.applyImpulse = originalApplyImpulse;
    aiBody.setLinvel({ x: 0, y: 0, z: 0 });
    const positionBeforeRelease = { ...aiBody.translation() };

    act(() => {
      triggerFrames(1 / 60, 30);
    });

    expect(aiBody.translation().z).toBeLessThan(positionBeforeRelease.z - 0.05);
    expect(aiBody.linvel().z).toBeLessThan(0);

    unmount();
  });

  it('recovers a checkpoint-stalled AI physically without teleporting or granting progress', () => {
    const { unmount } = render(<App />);
    const aiBody = getAI1Body();
    expect(aiBody).toBeDefined();

    const translationSpy = vi.spyOn(aiBody, 'setTranslation');
    const longitudinalImpulses = [];
    aiBody.applyImpulse = (impulse) => {
      if (impulse && Math.abs(impulse.z) > 1) longitudinalImpulses.push(impulse.z);
      aiBody.setLinvel({ x: 0, y: 0, z: 0 });
    };

    act(() => {
      triggerFrames(1 / 60, 500);
    });

    expect(translationSpy).not.toHaveBeenCalled();
    expect(longitudinalImpulses.some(impulse => impulse > 1)).toBe(true);
    expect(getAI1State()).toMatchObject({
      lap: 1,
      nextCheckpointIndex: 1,
      finished: false
    });
    unmount();
  });

  it('continues checkpoint validation after a 200ms render hitch', () => {
    const { unmount } = render(<App />);
    const aiBody = getAI1Body();
    const track = TRACK_PRESETS.find(candidate => candidate.id === DEFAULT_TRACK_ID);
    const forwardAxis = new THREE.Vector3(0, 0, -1);
    const placeForward = (progress, delta) => {
      const point = track.curve.getPointAt(progress);
      const tangent = track.curve.getTangentAt(progress).setY(0).normalize();
      const rotation = new THREE.Quaternion().setFromUnitVectors(forwardAxis, tangent);
      aiBody.setTranslation({ x: point.x, y: point.y + 1, z: point.z });
      aiBody.setRotation(rotation);
      aiBody.setLinvel({ x: tangent.x * 55, y: 0, z: tangent.z * 55 });
      triggerFrames(delta, 1);
    };

    act(() => {
      placeForward(0.997, 1 / 60);
      const hitchProgress = (0.997 + 11 / track.length) % 1;
      placeForward(hitchProgress, 0.2);
      const stepMeters = 2.5;
      const steps = Math.ceil((0.12 - hitchProgress) * track.length / stepMeters);
      for (let step = 1; step <= steps; step += 1) {
        const progress = hitchProgress + step * stepMeters / track.length;
        placeForward(progress, stepMeters / 55);
      }
    });

    expect(getAI1State().nextCheckpointIndex).toBe(2);
    unmount();
  });

  it.each(TRACK_PRESETS)(
    'accepts all $name checkpoints in order and rolls AI race state into lap two',
    track => {
    act(() => useGameStore.setState({ selectedTrackId: track.id }));
    const { unmount } = render(<App />);
    const aiBody = getAI1Body();
    expect(aiBody).toBeDefined();

    const sampleCount = Math.ceil(track.length);
    const observedCheckpointStates = [];
    let previousNextCheckpoint = 1;

    act(() => {
      for (let sample = 0; sample <= sampleCount; sample += 1) {
        const progress = sample / sampleCount;
        const point = track.curve.getPointAt(progress % 1);
        const tangent = track.curve.getTangentAt(progress % 1).normalize();
        const rotation = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, -1),
          tangent
        );

        aiBody.setTranslation({ x: point.x, y: point.y + 1, z: point.z });
        aiBody.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
        aiBody.setLinvel({ x: tangent.x * 30, y: 0, z: tangent.z * 30 });
        triggerFrames(1 / 30, 1);

        const aiState = getAI1State();
        if (aiState.nextCheckpointIndex !== previousNextCheckpoint || aiState.lap === 2) {
          observedCheckpointStates.push(aiState.nextCheckpointIndex);
          previousNextCheckpoint = aiState.nextCheckpointIndex;
        }
        if (aiState.lap === 2) break;
      }
    });

    expect(observedCheckpointStates).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 0, 1]);
    expect(getAI1State()).toMatchObject({ lap: 2, nextCheckpointIndex: 1 });
    expect(window.racerProgress.ai_1).toBeGreaterThanOrEqual(200);
    unmount();
  }, 15_000);
});
