import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import App from '../App';
import { useGameStore } from '../store/gameStore';
import { trackCurve, trackLength } from '../utils/trackData';
import { activeBodies, triggerFrames } from './setup';
import { getStartGridPose } from '../utils/startGrid';

const racers = () => [
  { id: 'player', lap: 1, nextCheckpointIndex: 1, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 },
  { id: 'ai_1', lap: 1, nextCheckpointIndex: 1, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 },
  { id: 'ai_2', lap: 1, nextCheckpointIndex: 1, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 },
  { id: 'ai_3', lap: 1, nextCheckpointIndex: 1, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 }
];

function getPlayerBody() {
  return Array.from(activeBodies).find(body => body.name === 'player');
}

function getAI1Body() {
  return Array.from(activeBodies).find(body => body.name === 'ai_1');
}

function alignBodyToTrack(body, progress, speed = 30) {
  const normalizedProgress = ((progress % 1) + 1) % 1;
  const point = trackCurve.getPointAt(normalizedProgress);
  const tangent = trackCurve.getTangentAt(normalizedProgress).normalize();
  const rotation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, -1),
    tangent
  );

  body.setTranslation({ x: point.x, y: point.y + 1, z: point.z });
  body.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
  body.setLinvel({ x: tangent.x * speed, y: 0, z: tangent.z * speed });
}

describe('production progress continuity guards', () => {
  beforeEach(() => {
    useGameStore.setState({
      gameState: 'playing',
      lap: 1,
      maxLaps: 3,
      currentTime: 0,
      totalTime: 0,
      totalCheckpoints: 10,
      nextCheckpointIndex: 1,
      isDrivingBackwards: false,
      racers: racers()
    });
  });

  it('rejects an immediate player or AI teleport to the next checkpoint', () => {
    const { unmount } = render(<App />);
    const playerBody = getPlayerBody();
    const aiBody = getAI1Body();

    act(() => triggerFrames(1 / 60, 1));
    expect(useGameStore.getState().nextCheckpointIndex).toBe(1);
    expect(useGameStore.getState().racers.find(racer => racer.id === 'ai_1').nextCheckpointIndex).toBe(1);

    act(() => {
      alignBodyToTrack(playerBody, 0.1);
      alignBodyToTrack(aiBody, 0.1);
      triggerFrames(1 / 60, 1);
    });

    expect(useGameStore.getState().nextCheckpointIndex).toBe(1);
    expect(useGameStore.getState().racers.find(racer => racer.id === 'ai_1').nextCheckpointIndex).toBe(1);
    unmount();
  });

  it('does not legitimize a player teleport held across multiple frames', () => {
    const { unmount } = render(<App />);
    const playerBody = getPlayerBody();

    act(() => triggerFrames(1 / 60, 1));
    expect(useGameStore.getState().nextCheckpointIndex).toBe(1);

    act(() => {
      for (let frame = 0; frame < 4; frame += 1) {
        alignBodyToTrack(playerBody, 0.1);
        triggerFrames(1 / 60, 1);
      }
    });

    expect(useGameStore.getState().nextCheckpointIndex).toBe(1);
    unmount();
  });

  it('keeps an off-corridor shortcut invalid until reset, then accepts continuous travel', () => {
    const { unmount } = render(<App />);
    const playerBody = getPlayerBody();

    act(() => triggerFrames(1 / 60, 1));
    expect(useGameStore.getState().nextCheckpointIndex).toBe(1);

    const midpoint = trackCurve.getPointAt(0.05);
    const tangent = trackCurve.getTangentAt(0.05).normalize();
    const right = tangent.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
    act(() => {
      playerBody.setTranslation({
        x: midpoint.x + right.x * 20,
        y: midpoint.y + 1,
        z: midpoint.z + right.z * 20
      });
      triggerFrames(1 / 60, 1);
      alignBodyToTrack(playerBody, 0.1);
      triggerFrames(1 / 60, 1);
    });
    expect(useGameStore.getState().nextCheckpointIndex).toBe(1);

    window.mockKeys.reset = true;
    act(() => triggerFrames(1 / 60, 1));
    window.mockKeys.reset = false;

    const startProgress = getStartGridPose('player', 'single').progress;
    const travelProgress = (1 - startProgress) + 0.1;
    const samples = Math.ceil(trackLength * travelProgress);
    act(() => {
      for (let sample = 1; sample <= samples; sample += 1) {
        alignBodyToTrack(playerBody, startProgress + (sample / samples) * travelProgress);
        triggerFrames(1 / 30, 1);
      }
    });

    expect(useGameStore.getState().nextCheckpointIndex).toBe(2);
    unmount();
  });
});
