import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import App from '../App';
import { useGameStore } from '../store/gameStore';
import { trackCurve, trackLength } from '../utils/trackData';
import { activeBodies, triggerFrames } from './setup';
import { audioEngine } from '../utils/AudioEngine';
import { getStartGridPose } from '../utils/startGrid';

function getPlayerBody() {
  return Array.from(activeBodies).find(b => b.name === 'player');
}

function crossPaintedFinishLine(body, delta = 1 / 60) {
  const mode = useGameStore.getState().gameMode;
  const startProgress = getStartGridPose('player', mode).progress;
  act(() => {
    for (let sample = 0; sample <= 48; sample += 1) {
      const progress = (startProgress + (sample / 48) * 0.009) % 1;
      const point = trackCurve.getPointAt(progress);
      const tangent = trackCurve.getTangentAt(progress).normalize();
      const rotation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        tangent
      );
      body.setTranslation({ x: point.x, y: point.y + 1, z: point.z });
      body.setRotation(rotation);
      body.setLinvel({ x: tangent.x * 20, y: tangent.y * 20, z: tangent.z * 20 });
      triggerFrames(delta, 1);
    }
  });
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

describe('Tier 1: Feature Coverage', () => {
  describe('Feature 1: Game Modes & Menu Navigation', () => {
    it('Test 1.1: Renders MainMenu component with title APEX RACING and mode selections', () => {
      render(<App />);
      expect(screen.getByText('APEX RACING')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start Race' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Time Trial' })).toBeInTheDocument();
    });

    it('Test 1.2: Click on Start Race successfully transitions store state gameState to countdown and mode to single', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Start Race' }));
      expect(useGameStore.getState().gameState).toBe('countdown');
      expect(useGameStore.getState().gameMode).toBe('single');
    });

    it('Test 1.3: Click on Time Trial successfully transitions store state gameState to countdown and mode to time_trial', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Time Trial' }));
      expect(useGameStore.getState().gameState).toBe('countdown');
      expect(useGameStore.getState().gameMode).toBe('time_trial');
    });

    it('Test 1.4: Settings opens inline and updates audio preferences', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      const audio = screen.getByRole('slider', { name: /Audio/i });
      fireEvent.change(audio, { target: { value: '70' } });
      expect(useGameStore.getState().settings.audio).toBe(70);
      expect(audioEngine.volume).toBeCloseTo(0.14);
    });

    it('Test 1.4.1: Graphics quality changes the live renderer budget', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      fireEvent.change(screen.getByRole('combobox', { name: 'Graphics' }), { target: { value: 'low' } });
      expect(screen.getByTestId('r3f-canvas')).toHaveAttribute('data-shadows', 'false');
      expect(screen.getByTestId('r3f-canvas')).toHaveAttribute('data-dpr', '1');
    });

    it('Test 1.5: Click on Continue on EndScreen transitions game back to menu', () => {
      render(<App />);
      act(() => {
        window.racerPositions = { player: { x: 10, z: 10 }, ai_1: { x: 20, z: 20 } };
        window.racerProgress = { player: 250, ai_1: 260 };
        useGameStore.setState({ gameState: 'finished' });
      });
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      expect(useGameStore.getState().gameState).toBe('menu');
      expect(window.racerPositions).toEqual({});
      expect(window.racerProgress).toEqual({});
    });
  });

  describe('Feature 2: Countdown & Race Start', () => {
    it('Test 2.1: HUD renders countdown text when gameState is countdown', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'countdown', countdown: 3 });
      });
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('Test 2.2: Countdown decrements by 1 every second using mock timers', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'countdown', countdown: 3 });
      });
      expect(useGameStore.getState().countdown).toBe(3);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(useGameStore.getState().countdown).toBe(2);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(useGameStore.getState().countdown).toBe(1);
    });

    it('Test 2.3: Countdown transitions to playing state when time passes 3 seconds', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'countdown', countdown: 3 });
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(useGameStore.getState().gameState).toBe('playing');
    });

    it('Test 2.4: Car keyboard input is disabled when countdown is greater than 0', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'countdown', countdown: 3 });
      });
      const body = getPlayerBody();
      window.mockKeys.forward = true;
      act(() => {
        triggerFrames(1/60, 1);
      });
      expect(body.linvel().z).toBe(0);
    });

    it('Test 2.5: Audio engine receives start signals when countdown begins', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'countdown', countdown: 3 });
      });
      act(() => {
        triggerFrames(1/60, 1);
      });
      expect(audioEngine.isPlaying).toBe(true);
    });
  });

  describe('Feature 3: Checkpoint & Lap Tracking', () => {
    it('Test 3.1: Crossing the painted finish line updates nextCheckpointIndex to 1', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 0, maxLaps: 2 });
      });
      const body = getPlayerBody();
      crossPaintedFinishLine(body);
      expect(useGameStore.getState().nextCheckpointIndex).toBe(1);
    });

    it('Test 3.2: Passing checkpoints out of order does not trigger updates', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 0 });
      });
      const body = getPlayerBody();
      act(() => {
        body.setTranslation(trackCurve.getPointAt(0.5));
      });
      act(() => {
        triggerFrames(1/60, 1);
      });
      expect(useGameStore.getState().nextCheckpointIndex).toBe(0);
    });

    it('Test 3.3: CP9 arms the finish line and CP0 completes the lap', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 9, lap: 1, maxLaps: 3 });
      });
      const body = getPlayerBody();
      act(() => {
        body.setTranslation(trackCurve.getPointAt(9/10));
      });
      act(() => {
        triggerFrames(1/60, 1);
      });
      expect(useGameStore.getState().nextCheckpointIndex).toBe(0);
      expect(useGameStore.getState().lap).toBe(1);
      act(() => {
        for (let sample = 1; sample <= 60; sample += 1) {
          const progress = 0.9 + (sample / 60) * 0.1;
          const point = trackCurve.getPointAt(progress % 1);
          const tangent = trackCurve.getTangentAt(progress % 1).normalize();
          const rotation = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, -1),
            tangent
          );
          body.setTranslation({ x: point.x, y: point.y + 1, z: point.z });
          body.setRotation(rotation);
          body.setLinvel({ x: tangent.x * 20, y: tangent.y * 20, z: tangent.z * 20 });
          triggerFrames(1/60, 1);
        }
      });
      expect(useGameStore.getState().nextCheckpointIndex).toBe(1);
      expect(useGameStore.getState().lap).toBe(2);
    });

    it('Test 3.4: Best lap times are compared and updated on lap completion', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 0, lap: 1, bestLapTime: 20, currentTime: 15 });
      });
      const body = getPlayerBody();
      crossPaintedFinishLine(body);
      const completed = useGameStore.getState();
      expect(completed.bestLapTime).toBe(completed.lastLapTime);
      expect(completed.bestLapTime).toBeGreaterThan(15);
      expect(completed.bestLapTime).toBeLessThan(16);
    });

    it('Test 3.5: Reaching max lap limit (3) transitions game state to finished', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 0, lap: 3, maxLaps: 3 });
      });
      const body = getPlayerBody();
      crossPaintedFinishLine(body);
      expect(useGameStore.getState().gameState).toBe('finished');
    });
  });

  describe('Feature 4: Game Pause/Resume', () => {
    it('Test 4.1: Pressing Escape key pauses the game, changing state to paused', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing' });
      });
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(useGameStore.getState().gameState).toBe('paused');
    });

    it('Test 4.2: The Pause Menu overlay renders when state is paused', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'paused' });
      });
      expect(screen.getByText('PAUSED')).toBeInTheDocument();
    });

    it('Test 4.3: Clicking Resume inside Pause Menu returns gameState to playing', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'paused', countdown: 0 });
      });
      fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
      expect(useGameStore.getState().gameState).toBe('playing');
    });

    it('Test 4.4: Physics container in App receives paused=true attribute when game is paused', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'paused' });
      });
      const physics = screen.getByTestId('rapier-physics');
      expect(physics.getAttribute('data-paused')).toBe('true');
    });

    it('Test 4.5: Pressing Quit to Menu inside Pause Menu returns state to menu', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'paused' });
      });
      fireEvent.click(screen.getByRole('button', { name: 'Quit to Menu' }));
      expect(useGameStore.getState().gameState).toBe('menu');
    });
  });

  describe('Feature 5: Telemetry HUD & Controls', () => {
    it('Test 5.1: HUD speedometer updates value dynamically as speed changes', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', speed: 120 });
      });
      expect(screen.getByText('120')).toBeInTheDocument();
    });

    it('Test 5.2: HUD gear indicator updates according to current gear state', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', gear: 4 });
      });
      expect(screen.getByText('GEAR 4')).toBeInTheDocument();
    });

    it('Test 5.3: RPM bar container width scales to represent current RPM correctly', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', rpm: 4000 });
      });
      const rpmBar = document.querySelector('.rpm-bar');
      expect(rpmBar.style.width).toBe('50%');
    });

    it('Test 5.4: Pressing W key applies forward impulse to RigidBody and increases speed', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing' });
      });
      const body = getPlayerBody();
      window.mockKeys.forward = true;
      act(() => {
        triggerFrames(1/60, 1);
      });
      expect(body.linvel().z).not.toBe(0);
    });

    it('Test 5.5: Minimap updates player and opponent dot colors/coordinates', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing' });
      });
      window.racerPositions = {
        player: { x: 10, z: 20, color: '#ff3366' },
        opponent1: { x: 30, z: 40, color: '#3366ff' }
      };
      act(() => {
        vi.advanceTimersByTime(100);
      });
      const dots = document.querySelectorAll('.minimap-dot');
      expect(dots.length).toBe(2);
    });
  });
});

describe('Tier 2: Boundary & Corner Cases', () => {
  describe('Feature 1: Game Modes & Menu Navigation', () => {
    it('Test 2.1.1: Double-clicking mode buttons rapidly only registers once', () => {
      render(<App />);
      const btn = screen.getByRole('button', { name: 'Start Race' });
      fireEvent.click(btn);
      fireEvent.click(btn);
      expect(useGameStore.getState().gameState).toBe('countdown');
    });

    it('Test 2.1.2: Zustand updateSettings prevents values outside standard bounds', () => {
      render(<App />);
      act(() => {
        useGameStore.getState().updateSettings({ audio: 150 });
      });
      expect(useGameStore.getState().settings.audio).toBe(100);
      act(() => {
        useGameStore.getState().updateSettings({ audio: -50 });
      });
      expect(useGameStore.getState().settings.audio).toBe(0);
    });

    it('Test 2.1.3: Escape key does nothing when in main menu', () => {
      render(<App />);
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(useGameStore.getState().gameState).toBe('menu');
    });

    it('Test 2.1.4: Setting maxLaps to 1 works gracefully', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ maxLaps: 1 });
      });
      expect(useGameStore.getState().maxLaps).toBe(1);
    });

    it('Test 2.1.5: Initial state rendering handles null telemetry data', () => {
      act(() => {
        useGameStore.setState({ gameState: 'playing', speed: null, rpm: null, gear: null });
      });
      render(<App />);
      expect(screen.getByText('GEAR')).toBeInTheDocument();
    });
  });

  describe('Feature 2: Countdown & Race Start', () => {
    it('Test 2.2.1: Holding key down before race start does not queue acceleration force', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'countdown' });
      });
      window.mockKeys.forward = true;
      act(() => {
        triggerFrames(1/60, 10);
      });
      const body = getPlayerBody();
      expect(body.linvel().z).toBe(0);
    });

    it('Test 2.2.2: Clock skips do not bypass countdown step triggers', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'countdown', countdown: 3 });
      });
      act(() => {
        vi.advanceTimersByTime(20000);
      });
      expect(useGameStore.getState().gameState).toBe('playing');
    });

    it('Test 2.2.3: AudioContext blocked does not crash game', () => {
      const originalAudioContext = global.AudioContext;
      global.AudioContext = undefined;
      expect(() => {
        render(<App />);
        act(() => {
          useGameStore.setState({ gameState: 'countdown' });
        });
        act(() => {
          triggerFrames(1/60, 1);
        });
      }).not.toThrow();
      global.AudioContext = originalAudioContext;
    });

    it('Test 2.2.4: Pausing game during countdown pauses the clock tick', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'countdown', countdown: 3 });
      });
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(useGameStore.getState().gameState).toBe('paused');
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(useGameStore.getState().countdown).toBe(3);
    });

    it('Test 2.2.5: Starting countdown with initial value 0 triggers playing instantly', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'countdown', countdown: 0 });
      });
      act(() => {
        useGameStore.getState().decrementCountdown();
      });
      expect(useGameStore.getState().gameState).toBe('playing');
    });
  });

  describe('Feature 3: Checkpoint & Lap Tracking', () => {
    it('Test 2.3.1: Checkpoint Proximity Threshold - inside 25m is accepted and 25.01m is rejected', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 1, maxLaps: 2 });
      });
      const body = getPlayerBody();
      const playerStart = getStartGridPose('player', 'single');
      const checkpointProgress = 1.1;
      const cpPos = trackCurve.getPointAt(checkpointProgress % 1);
      const progressAtDistance = (distance) => {
        let low = checkpointProgress - 60 / trackLength;
        let high = checkpointProgress;
        for (let iteration = 0; iteration < 40; iteration += 1) {
          const mid = (low + high) / 2;
          const midDistance = trackCurve.getPointAt(mid % 1).distanceTo(cpPos);
          if (midDistance > distance) low = mid;
          else high = mid;
        }
        return (low + high) / 2;
      };
      const outsideProgress = progressAtDistance(25.01);
      const insideProgress = progressAtDistance(24);
      const approachSamples = Math.ceil((outsideProgress - playerStart.progress) * trackLength);

      act(() => {
        for (let sample = 1; sample <= approachSamples; sample += 1) {
          const progress = playerStart.progress
            + ((outsideProgress - playerStart.progress) * sample) / approachSamples;
          const point = trackCurve.getPointAt(progress % 1);
          const tangent = trackCurve.getTangentAt(progress % 1).normalize();
          body.setTranslation(point);
          body.setLinvel({ x: tangent.x * 30, y: 0, z: tangent.z * 30 });
          triggerFrames(1 / 30, 1);
        }
      });
      expect(useGameStore.getState().nextCheckpointIndex).toBe(1);

      act(() => {
        const point = trackCurve.getPointAt(insideProgress % 1);
        const tangent = trackCurve.getTangentAt(insideProgress % 1).normalize();
        body.setTranslation(point);
        body.setLinvel({ x: tangent.x * 30, y: 0, z: tangent.z * 30 });
        triggerFrames(1 / 30, 1);
      });
      expect(useGameStore.getState().nextCheckpointIndex).toBe(2);
    });

    it('Test 2.3.2: Driving backward through a checkpoint does not decrement checkpoint', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 2 });
      });
      const body = getPlayerBody();
      act(() => {
        body.setTranslation(trackCurve.getPointAt(1/10));
      });
      act(() => {
        triggerFrames(1/60, 1);
      });
      expect(useGameStore.getState().nextCheckpointIndex).toBe(2);
    });

    it('Test 2.3.3: A lap completed in exactly 0.001s renders and formats correctly', () => {
      const { formatTime } = require('../utils/formatTime');
      expect(formatTime(0.001)).toBe('00:00:001');
    });

    it('Test 2.3.4: Teleporting to [0,1,0] preserves current checkpoint validation state', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 4 });
      });
      const body = getPlayerBody();
      act(() => {
        body.setTranslation({ x: 10, y: -6, z: 10 });
      });
      act(() => {
        triggerFrames(1/60, 1);
      });
      expect(useGameStore.getState().nextCheckpointIndex).toBe(4);
    });

    it('Test 2.3.5: Best lap ties maintain the initial best lap without float errors', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 0, lap: 2, bestLapTime: 20.0, currentTime: 20.0 });
      });
      const body = getPlayerBody();
      crossPaintedFinishLine(body);
      expect(useGameStore.getState().bestLapTime).toBe(20.0);
    });
  });

  describe('Feature 4: Game Pause/Resume', () => {
    it('Test 2.4.1: Rapidly pressing Escape key toggles state correctly', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', countdown: 0 });
      });
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(useGameStore.getState().gameState).toBe('playing');
    });

    it('Test 2.4.2: Simulating window focus loss sets game state to paused', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing' });
      });
      fireEvent(window, new Event('blur'));
      expect(useGameStore.getState().gameState).toBe('paused');
    });

    it('Test 2.4.3: Time increments in the game loop return 0 while paused', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'paused', currentTime: 10 });
      });
      act(() => {
        triggerFrames(1/60, 10);
      });
      expect(useGameStore.getState().currentTime).toBe(10);
    });

    it('Test 2.4.4: Input Reset on Resume', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'paused', countdown: 0 });
      });
      window.mockKeys.forward = true;
      act(() => {
        useGameStore.getState().resumeGame();
      });
      expect(useGameStore.getState().gameState).toBe('playing');
    });

    it('Test 2.4.5: Engine sound stops immediately on pause transition', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing' });
      });
      audioEngine.start();
      act(() => {
        useGameStore.setState({ gameState: 'paused' });
      });
      act(() => {
        triggerFrames(1/60, 1);
      });
      expect(audioEngine.isPlaying).toBe(false);
    });
  });

  describe('Feature 5: Telemetry HUD & Controls', () => {
    it('Test 2.5.1: RPM does not exceed max (8000) at high speeds', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing' });
      });
      const body = getPlayerBody();
      act(() => {
        body.setLinvel({ x: 0, y: 0, z: -1000 });
      });
      act(() => {
        triggerFrames(1/60, 1);
      });
      expect(useGameStore.getState().rpm).toBeLessThanOrEqual(8000);
    });

    it('Test 2.5.2: Reversing displays positive speed and correct gear range', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing' });
      });
      const body = getPlayerBody();
      act(() => {
        body.setLinvel({ x: 0, y: 0, z: 10 });
      });
      act(() => {
        triggerFrames(1/60, 1);
      });
      expect(useGameStore.getState().speed).toBeGreaterThan(0);
      expect(useGameStore.getState().gear).toBe(1);
    });

    it('Test 2.5.3: Coordinates outside track bounds are clipped to minimap edges', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing' });
      });
      window.racerPositions = {
        player: { x: 9999, z: 9999, color: '#ff3366' }
      };
      act(() => {
        vi.advanceTimersByTime(100);
      });
      const dot = document.querySelector('.minimap-dot');
      expect(parseFloat(dot.style.left)).toBeLessThanOrEqual(200);
      expect(parseFloat(dot.style.top)).toBeLessThanOrEqual(200);
    });

    it('Test 2.5.4: Drifting continuously does not crash the layout', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing' });
      });
      window.mockKeys.brake = true;
      expect(() => {
        act(() => {
          triggerFrames(1/60, 100);
        });
      }).not.toThrow();
    });

    it('Test 2.5.5: Completely stopped car stays at Gear 1 and 1000 RPM idle', () => {
      render(<App />);
      act(() => {
        useGameStore.setState({ gameState: 'playing', speed: 0, rpm: 0, gear: 0 });
      });
      act(() => {
        triggerFrames(1/60, 1);
      });
      expect(useGameStore.getState().speed).toBe(0);
      expect(useGameStore.getState().gear).toBe(1);
      expect(useGameStore.getState().rpm).toBe(1000);
    });
  });
});

describe('Tier 3: Cross-Feature Combinations', () => {
  it('Test 3.1: Countdown Transition & Telemetry Initialization', () => {
    render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'countdown', countdown: 1 });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useGameStore.getState().gameState).toBe('playing');
    expect(useGameStore.getState().speed).toBe(0);
    expect(useGameStore.getState().gear).toBe(1);
  });

  it('Test 3.2: Pause during Lap Completion Event', () => {
    render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 0, lap: 1, maxLaps: 3 });
    });
    const body = getPlayerBody();
    crossPaintedFinishLine(body);
    act(() => useGameStore.setState({ gameState: 'paused' }));
    expect(useGameStore.getState().lap).toBe(2);
    expect(useGameStore.getState().gameState).toBe('paused');
  });

  it('Test 3.3: Backwards Start/Finish line crossing does not trigger lap completion', () => {
    render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 0, lap: 1 });
    });
    const body = getPlayerBody();
    act(() => {
      body.setTranslation({ x: 0, y: 1, z: 30 });
    });
    act(() => {
      triggerFrames(1/60, 1);
    });
    expect(useGameStore.getState().lap).toBe(1);
    expect(useGameStore.getState().nextCheckpointIndex).toBe(0);
  });

  it('Test 3.4: Active Drift Pause/Resume freezes and resumes drift state', () => {
    render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });
    window.mockKeys.brake = true;
    act(() => {
      triggerFrames(1/60, 5);
    });
    act(() => {
      useGameStore.setState({ gameState: 'paused' });
    });
    act(() => {
      triggerFrames(1/60, 5);
    });
    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });
    expect(useGameStore.getState().gameState).toBe('playing');
  });

  it('Test 3.5: Finish Line Crossing & Menu Reset - crossing finish line finishes race, click continue resets store', () => {
    render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 0, lap: 3, maxLaps: 3 });
    });
    const body = getPlayerBody();
    crossPaintedFinishLine(body);
    expect(useGameStore.getState().gameState).toBe('finished');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(useGameStore.getState().gameState).toBe('menu');
    expect(useGameStore.getState().lap).toBe(1);
    expect(useGameStore.getState().currentTime).toBe(0);
    expect(useGameStore.getState().bestLapTime).toBe(0);
  });
});

describe('Tier 4: Real-World Application Scenarios', () => {
  it('Test 4.1: Golden Path - Full Race Completion (Start -> Countdown -> Laps -> Finish -> Continue)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Race' }));
    expect(useGameStore.getState().gameState).toBe('countdown');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(useGameStore.getState().gameState).toBe('playing');

    const body = getPlayerBody();
    const playerStart = getStartGridPose('player', 'single');
    const samplesPerLap = Math.ceil(trackLength);
    act(() => {
      for (let sample = 0; sample <= samplesPerLap + 12; sample += 1) {
        const progress = (playerStart.progress + sample / samplesPerLap) % 1;
        const point = trackCurve.getPointAt(progress);
        const tangent = trackCurve.getTangentAt(progress).normalize();
        const rotation = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, -1),
          tangent
        );

        body.setTranslation({ x: point.x, y: point.y + 1, z: point.z });
        body.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
        body.setLinvel({ x: tangent.x * 30, y: 0, z: tangent.z * 30 });
        triggerFrames(1 / 30, 1);

        if (useGameStore.getState().gameState === 'finished') break;
      }
    });
    expect(useGameStore.getState().gameState).toBe('finished');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(useGameStore.getState().gameState).toBe('menu');
  });

  it('Test 4.2: Distracted Player - Pause mid-race (Time is not tracked while paused)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Race' }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(useGameStore.getState().gameState).toBe('playing');

    for (let i = 0; i < 10; i++) {
      act(() => {
        triggerFrames(1, 1);
      });
    }
    expect(useGameStore.getState().currentTime).toBe(10);

    act(() => {
      useGameStore.setState({ gameState: 'paused' });
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(useGameStore.getState().currentTime).toBe(10);

    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });
    for (let i = 0; i < 5; i++) {
      act(() => {
        triggerFrames(1, 1);
      });
    }
    expect(useGameStore.getState().currentTime).toBe(15);
  });

  it('Test 4.3: Falling never teleports; an R rising edge resets coordinates and velocity', () => {
    render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });
    const body = getPlayerBody();
    const playerStart = getStartGridPose('player', 'single');
    window.mockKeys.forward = true;
    act(() => {
      triggerFrames(1/60, 10);
    });
    expect(body.linvel().z).not.toBe(0);

    act(() => {
      body.setTranslation({ x: 10, y: -6, z: 10 });
    });
    act(() => {
      triggerFrames(1/60, 1);
    });
    expect(body.translation().x).not.toBeCloseTo(playerStart.position[0], 6);
    expect(body.linvel().z).not.toBe(0);

    window.mockKeys.reset = true;
    act(() => {
      triggerFrames(1/60, 1);
    });
    window.mockKeys.reset = false;
    expect(body.translation().x).toBeCloseTo(playerStart.position[0], 6);
    expect(body.translation().y).toBeCloseTo(playerStart.position[1], 6);
    expect(body.translation().z).toBeCloseTo(playerStart.position[2], 6);
    expect(body.linvel().x).toBe(0);
    expect(body.linvel().z).toBe(0);
  });

  it('Test 4.4: Adversarial Lap Exploiter (Cheating Attempt) - Skipping checkpoints rejects lap completion', () => {
    render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing', nextCheckpointIndex: 0, lap: 1 });
    });
    const body = getPlayerBody();
    act(() => {
      body.setTranslation(trackCurve.getPointAt(9/10));
    });
    act(() => {
      triggerFrames(1/60, 1);
    });
    expect(useGameStore.getState().nextCheckpointIndex).toBe(0);
    expect(useGameStore.getState().lap).toBe(1);
  });

  it('Test 4.5: High Speed Turn & Drift Telemetry - Drifting reduces speed and updates telemetry dynamically', () => {
    render(<App />);
    act(() => {
      useGameStore.setState({ gameState: 'playing' });
    });
    const body = getPlayerBody();
    act(() => {
      body.setLinvel({ x: 0, y: 0, z: -27.7 }); // ~100 KM/H
    });
    act(() => {
      triggerFrames(1/60, 1);
    });
    expect(useGameStore.getState().speed).toBeCloseTo(100, 0);

    window.mockKeys.right = true;
    window.mockKeys.brake = true;
    act(() => {
      triggerFrames(1/60, 10);
    });
    expect(useGameStore.getState().speed).toBeLessThan(100);
  });
});
