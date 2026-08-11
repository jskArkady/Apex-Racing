import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';

// Import modules to test
import {
  isNearCheckpoint,
  handleCheckpointPass,
  calculateRacerScore,
  sortRacers,
  sortRacersWithCheckpoints,
  getRacerRank,
  validateProgress
} from '../utils/raceLogic';
import Track from '../components/Track';
import { AudioEngine } from '../utils/AudioEngine';

describe('Adversarial Testing Suite: raceLogic', () => {

  describe('isNearCheckpoint edge cases', () => {
    it('handles missing or partial coordinate keys in object format', () => {
      // Missing z coordinates (defaults to 0)
      const carPos = { x: 3, y: 4 };
      const checkpointPos = { x: 0, y: 0 };
      expect(isNearCheckpoint(carPos, checkpointPos, 6)).toBe(true);
      expect(isNearCheckpoint(carPos, checkpointPos, 4)).toBe(false);

      // Only one coordinate key provided
      expect(isNearCheckpoint({ x: 5 }, { x: 2 }, 4)).toBe(true);
      expect(isNearCheckpoint({ y: 10 }, { z: 10 }, 15)).toBe(true); // y:10 vs z:10 -> dist is sqrt(100+100) = sqrt(200) ≈ 14.14
      expect(isNearCheckpoint({ y: 10 }, { z: 10 }, 14)).toBe(false);
    });

    it('handles missing or partial values in array format', () => {
      // Arrays with less than 3 elements (missing indices default to 0)
      expect(isNearCheckpoint([3], [0], 4)).toBe(true);
      expect(isNearCheckpoint([3, 4], [0, 0], 5)).toBe(false); // exactly 5
      expect(isNearCheckpoint([3, 4], [0, 0], 5.1)).toBe(true);
    });

    it('handles nullish values within coordinate arrays and objects', () => {
      // Nullish values inside array (null/undefined should default to 0 via ??)
      expect(isNearCheckpoint([null, 3, undefined], [0, 0, 0], 4)).toBe(true);
      expect(isNearCheckpoint([undefined, undefined, undefined], [null, null, null], 1)).toBe(true);

      // Nullish values inside object
      expect(isNearCheckpoint({ x: null, y: 3, z: undefined }, { x: 0, y: 0, z: 0 }, 4)).toBe(true);
    });

    it('handles NaN values in coordinates without throwing', () => {
      // NaN should propagate to distance and result in false comparison (NaN < threshold evaluates to false)
      expect(isNearCheckpoint([NaN, 0, 0], [0, 0, 0], 10)).toBe(false);
      expect(isNearCheckpoint({ x: NaN, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 10)).toBe(false);
    });

    it('handles invalid coordinate types gracefully', () => {
      expect(isNearCheckpoint('string-pos', [0, 0, 0], 5)).toBe(false);
      expect(isNearCheckpoint([0, 0, 0], true, 5)).toBe(false);
      expect(isNearCheckpoint(42, { x: 0, y: 0, z: 0 }, 5)).toBe(false);
    });

    it('handles invalid thresholds strictly', () => {
      expect(isNearCheckpoint([0, 0, 0], [0, 0, 0], NaN)).toBe(false);
      expect(isNearCheckpoint([0, 0, 0], [0, 0, 0], Infinity)).toBe(true); // typeof Infinity is number, and distance < Infinity is true
      expect(isNearCheckpoint([0, 0, 0], [0, 0, 0], -10)).toBe(false);
      expect(isNearCheckpoint([0, 0, 0], [0, 0, 0], 0)).toBe(false);
      expect(isNearCheckpoint([0, 0, 0], [0, 0, 0], '10')).toBe(false);
    });
  });

  describe('handleCheckpointPass edge cases and state mutation', () => {
    const validBaseState = {
      nextCheckpointIndex: 1,
      totalCheckpoints: 10,
      lap: 1,
      maxLaps: 3,
      bestLapTime: 0,
      currentTime: 15.0,
      totalTime: 45.0,
      gameState: 'playing'
    };

    it('handles null/undefined bestLapTime and ensures it is updated on lap completion', () => {
      const stateNullBest = { ...validBaseState, nextCheckpointIndex: 0, bestLapTime: null };
      const resNull = handleCheckpointPass(stateNullBest, 0);
      expect(resNull.bestLapTime).toBe(15.0);

      const stateUndefBest = { ...validBaseState, nextCheckpointIndex: 0, bestLapTime: undefined };
      const resUndef = handleCheckpointPass(stateUndefBest, 0);
      expect(resUndef.bestLapTime).toBe(15.0);
    });

    it('prevents non-finite timing values from contaminating race state', () => {
      // An invalid previous best is treated as unset.
      const stateNaNBest = { ...validBaseState, nextCheckpointIndex: 0, bestLapTime: NaN };
      const resNaNBest = handleCheckpointPass(stateNaNBest, 0);
      expect(resNaNBest.bestLapTime).toBe(15.0);

      // An invalid current lap contributes zero rather than poisoning totals.
      const stateNaNCurrent = { ...validBaseState, nextCheckpointIndex: 0, currentTime: NaN };
      const resNaNCurrent = handleCheckpointPass(stateNaNCurrent, 0);
      expect(resNaNCurrent.bestLapTime).toBe(0);
      expect(resNaNCurrent.totalTime).toBe(45.0);

      // An invalid accumulated total is reset before adding the valid lap.
      const stateNaNTotal = { ...validBaseState, nextCheckpointIndex: 0, totalTime: NaN };
      const resNaNTotal = handleCheckpointPass(stateNaNTotal, 0);
      expect(resNaNTotal.totalTime).toBe(15.0);

      const stateInfiniteTimes = {
        ...validBaseState,
        nextCheckpointIndex: 0,
        bestLapTime: Infinity,
        currentTime: -Infinity,
        totalTime: Infinity
      };
      const resInfiniteTimes = handleCheckpointPass(stateInfiniteTimes, 0);
      expect(Number.isFinite(resInfiniteTimes.bestLapTime)).toBe(true);
      expect(Number.isFinite(resInfiniteTimes.lastLapTime)).toBe(true);
      expect(Number.isFinite(resInfiniteTimes.totalTime)).toBe(true);
    });

    it('handles negative or zero lap counts and maxLaps', () => {
      const stateNegativeLap = { ...validBaseState, nextCheckpointIndex: 0, lap: -5, maxLaps: 3 };
      const resNegativeLap = handleCheckpointPass(stateNegativeLap, 0);
      expect(resNegativeLap.lap).toBe(2);
      expect(resNegativeLap.gameState).toBe('playing');

      const stateZeroMaxLaps = { ...validBaseState, nextCheckpointIndex: 0, lap: 1, maxLaps: 0 };
      const resZeroMaxLaps = handleCheckpointPass(stateZeroMaxLaps, 0);
      expect(resZeroMaxLaps.lap).toBe(1);
      expect(resZeroMaxLaps.nextCheckpointIndex).toBe(0);
      expect(resZeroMaxLaps.gameState).toBe('finished');
    });

    it('gracefully defaults missing properties in state', () => {
      const emptyState = {};
      const res = handleCheckpointPass(emptyState, 1);
      expect(res.nextCheckpointIndex).toBe(2);
    });

    it('handles invalid totalCheckpoints gracefully', () => {
      const stateInvalidCP = { ...validBaseState, nextCheckpointIndex: 0, totalCheckpoints: 'invalid' };
      const res = handleCheckpointPass(stateInvalidCP, 0);
      expect(res.lap).toBe(2);
    });
  });

  describe('calculateRacerScore edge cases', () => {
    it('coerces and calculates score for numeric strings', () => {
      expect(calculateRacerScore('2', '45.5')).toBe(245.5);
    });

    it('rejects invalid inputs to return 0', () => {
      expect(calculateRacerScore(NaN, 50)).toBe(0);
      expect(calculateRacerScore(1, NaN)).toBe(0);
      expect(calculateRacerScore(Infinity, 50)).toBe(0);
      expect(calculateRacerScore(1, -Infinity)).toBe(0);
      expect(calculateRacerScore('abc', 50)).toBe(0);
    });

    it('coerces booleans to numeric values', () => {
      expect(calculateRacerScore(true, 50)).toBe(150);
      expect(calculateRacerScore(2, false)).toBe(200);
      expect(calculateRacerScore(true, true)).toBe(101);
    });
  });

  describe('sortRacers stability and invalid entries', () => {
    it('handles lists with invalid, non-object, null or undefined elements', () => {
      const racers = [
        null,
        { id: 'player1', score: 100 },
        undefined,
        { id: 'player2', score: 200 },
        'invalid-string',
        42
      ];

      const sorted = sortRacers(racers);
      expect(sorted[0].id).toBe('player2');
      expect(sorted[1].id).toBe('player1');
      expect(sorted.slice(2)).toContain(null);
      expect(sorted.slice(2)).toContain(undefined);
      expect(sorted.slice(2)).toContain('invalid-string');
      expect(sorted.slice(2)).toContain(42);
    });

    it('demonstrates order preservation for identical scores (unstable sorting fallback lack)', () => {
      const racers = [
        { id: 'racerA', score: 100 },
        { id: 'racerB', score: 100 },
        { id: 'racerC', score: 150 }
      ];
      const sorted = sortRacers(racers);
      expect(sorted[0].id).toBe('racerC');
      expect(sorted[1].id).toBe('racerA');
      expect(sorted[2].id).toBe('racerB');
    });

    it('handles finished status checking variations', () => {
      const racers = [
        { id: 'r1', gameState: 'finished', totalTime: 100 },
        { id: 'r2', status: 'finished', time: 90 },
        { id: 'r3', finished: true, totalTime: 95 },
        { id: 'r4', gameState: 'playing', score: 500 }
      ];
      const sorted = sortRacers(racers);
      expect(sorted[0].id).toBe('r2');
      expect(sorted[1].id).toBe('r3');
      expect(sorted[2].id).toBe('r1');
      expect(sorted[3].id).toBe('r4');
    });
  });

  describe('sortRacersWithCheckpoints tie-breakers and edge cases', () => {
    it('compares normalized checkpoints correctly', () => {
      const racers = [
        { id: 'racerA', lap: 1, checkpointIndex: 2 },
        { id: 'racerB', lap: 1, nextCheckpointIndex: 4 },
        { id: 'racerC', lap: 1, checkpointIndex: undefined, nextCheckpointIndex: undefined }
      ];

      const sorted = sortRacersWithCheckpoints(racers);
      expect(sorted[0].id).toBe('racerB');
      expect(sorted[1].id).toBe('racerA');
      expect(sorted[2].id).toBe('racerC');
    });

    it('prefers checkpointIndex over nextCheckpointIndex if both are defined', () => {
      const racers = [
        { id: 'racerA', lap: 1, checkpointIndex: 2, nextCheckpointIndex: 5 },
        { id: 'racerB', lap: 1, checkpointIndex: 3, nextCheckpointIndex: 1 }
      ];
      const sorted = sortRacersWithCheckpoints(racers);
      expect(sorted[0].id).toBe('racerB');
    });

    it('breaks ties using lastCheckpointTime, checkpointTime, or time in order', () => {
      const racers = [
        { id: 'r1', lap: 1, checkpointIndex: 2, time: 50 },
        { id: 'r2', lap: 1, checkpointIndex: 2, checkpointTime: 40 },
        { id: 'r3', lap: 1, checkpointIndex: 2, lastCheckpointTime: 30 }
      ];

      const sorted = sortRacersWithCheckpoints(racers);
      expect(sorted[0].id).toBe('r3');
      expect(sorted[1].id).toBe('r2');
      expect(sorted[2].id).toBe('r1');
    });

    it('sorts deterministically by ID if all metrics are tied', () => {
      const racers = [
        { id: 'racerB', lap: 1, checkpointIndex: 2 },
        { id: 'racerA', lap: 1, checkpointIndex: 2 },
        { id: 'racerC', lap: 1, checkpointIndex: 2 }
      ];
      const sorted = sortRacersWithCheckpoints(racers);
      expect(sorted[0].id).toBe('racerA');
      expect(sorted[1].id).toBe('racerB');
      expect(sorted[2].id).toBe('racerC');
    });

    it('handles numeric or non-string IDs in deterministic fallback gracefully', () => {
      const racers = [
        { id: 2, lap: 1, checkpointIndex: 2 },
        { id: 1, lap: 1, checkpointIndex: 2 },
        { id: undefined, lap: 1, checkpointIndex: 2 }
      ];
      const sorted = sortRacersWithCheckpoints(racers);
      expect(sorted[0].id).toBeUndefined();
      expect(sorted[1].id).toBe(1);
      expect(sorted[2].id).toBe(2);
    });
  });

  describe('getRacerRank edge cases', () => {
    it('returns -1 for invalid inputs', () => {
      expect(getRacerRank(null, 'player')).toBe(-1);
      expect(getRacerRank([], null)).toBe(-1);
      expect(getRacerRank([], undefined)).toBe(-1);
    });

    it('matches target ID using either id or racerId keys', () => {
      const racers = [
        { id: 'racer1' },
        { racerId: 'racer2' },
        null
      ];
      expect(getRacerRank(racers, 'racer1')).toBe(1);
      expect(getRacerRank(racers, 'racer2')).toBe(2);
      expect(getRacerRank(racers, 'non-existent')).toBe(-1);
    });
  });

  describe('validateProgress edge cases', () => {
    it('coerces numeric strings and checks limits', () => {
      expect(validateProgress('10', '15', '5')).toBe(true);
      expect(validateProgress('10', '20', '5')).toBe(false);
    });

    it('returns false for NaN inputs', () => {
      expect(validateProgress(NaN, 10, 5)).toBe(false);
      expect(validateProgress(10, NaN, 5)).toBe(false);
      expect(validateProgress(10, 15, NaN)).toBe(false);
    });

    it('returns false for negative maxAllowedJump', () => {
      expect(validateProgress(10, 15, -5)).toBe(false);
    });
  });
});

describe('Adversarial Testing Suite: Track Component', () => {
  it('renders Track component and generates the expected physics bodies and meshes', () => {
    const { container } = render(<Track />);

    const rigidBodies = container.querySelectorAll('[data-testid="rigid-body"]');
    expect(rigidBodies.length).toBe(3);

    const meshes = container.querySelectorAll('mesh');
    expect(meshes.length).toBe(22);
    expect(container.querySelector('[name="track-barrier-graphics"]')).toBeTruthy();
    expect(container.querySelector('[name="track-braking-distance-boards"]')).toBeTruthy();
    expect(container.querySelector('[name="trackside-operations-graphics"]')).toBeTruthy();
    expect(container.querySelector('[name="track-lighting-signal-graphics"]')).toBeTruthy();
    expect(container.querySelector('[name="track-kerb-surfaces"]')).toBeTruthy();
    expect(container.querySelector('[name="track-apex-gravel-runoff"]')).toBeTruthy();
    expect(container.querySelector('[name="track-apex-race-control-facades"]')).toBeTruthy();
    expect(container.querySelector('[name="track-crowd-panels"]')).toBeTruthy();
    expect(container.querySelector('[name="track-grandstand-structure-surfaces"]')).toBeTruthy();
    expect(container.querySelector('[name="track-pit-complex-structure-surfaces"]')).toBeTruthy();
    expect(container.querySelector('[name="track-pit-garage-facades"]')).toBeTruthy();
    expect(container.querySelector('[name="track-gantry-displays"]')).toBeTruthy();
    expect(container.querySelector('[name="track-gantry-structure-surfaces"]')).toBeTruthy();
    expect(container.querySelector('[name="track-apex-venue-facades"]')).toBeTruthy();
    expect(container.querySelector('[name="track-apex-pit-lane-staff-billboards"]')).toBeTruthy();
    expect(container.querySelector('[name="track-apex-tent-canopies"]')).toBeTruthy();
    expect(container.querySelector('[name="track-palm-tree-billboards"]')).toBeTruthy();
  });

  it('demonstrates useMemo geometry caching across multiple renders', () => {
    const moveToSpy = vi.spyOn(THREE.Shape.prototype, 'moveTo');

    const { rerender, unmount } = render(<Track />);
    const callsAfterFirst = moveToSpy.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThanOrEqual(2);

    // Rerender the same instance
    rerender(<Track />);
    const callsAfterSecond = moveToSpy.mock.calls.length;
    // It should NOT call moveTo again because useMemo cache will hit
    expect(callsAfterSecond).toBe(callsAfterFirst);

    unmount();
    moveToSpy.mockRestore();
  });
});

describe('Adversarial Testing Suite: AudioEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new AudioEngine();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes context, nodes and connections on init()', () => {
    engine.init();
    expect(engine.ctx).not.toBeNull();
    expect(engine.engineOsc).toBeDefined();
    expect(engine.engineFilter).toBeDefined();
    expect(engine.engineGain).toBeDefined();

    expect(engine.engineOsc.connect).toHaveBeenCalledWith(engine.engineFilter);
    expect(engine.engineFilter.connect).toHaveBeenCalledWith(engine.engineGain);
    expect(engine.engineGain.connect).toHaveBeenCalledWith(engine.ctx.destination);
    expect(engine.engineOsc.start).toHaveBeenCalled();
  });

  it('starts and stops playing correctly', () => {
    engine.start();
    expect(engine.isPlaying).toBe(true);
    expect(engine.engineGain.gain.setTargetAtTime).toHaveBeenCalledWith(0.1, expect.any(Number), 0.1);

    engine.stop();
    expect(engine.isPlaying).toBe(false);
    expect(engine.engineGain.gain.setTargetAtTime).toHaveBeenCalledWith(0, expect.any(Number), 0.1);
  });

  it('applies the configured volume while running and clamps its range', () => {
    engine.setVolume(75);
    engine.start();
    expect(engine.engineGain.gain.setTargetAtTime).toHaveBeenCalledWith(0.15, expect.any(Number), 0.1);

    engine.setVolume(200);
    expect(engine.volume).toBe(0.2);
    expect(engine.engineGain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.2, expect.any(Number), 0.05);
  });

  it('updates engine frequencies based on RPM inputs', () => {
    engine.start();

    engine.engineOsc.frequency.setTargetAtTime.mockClear();
    engine.engineFilter.frequency.setTargetAtTime.mockClear();

    engine.updateEngine(4000);
    expect(engine.engineOsc.frequency.setTargetAtTime).toHaveBeenCalledWith(125, expect.any(Number), 0.05);
    expect(engine.engineFilter.frequency.setTargetAtTime).toHaveBeenCalledWith(2300, expect.any(Number), 0.05);

    engine.updateEngine(-1000);
    expect(engine.engineOsc.frequency.setTargetAtTime).toHaveBeenCalledWith(50, expect.any(Number), 0.05);
    expect(engine.engineFilter.frequency.setTargetAtTime).toHaveBeenCalledWith(300, expect.any(Number), 0.05);

    engine.updateEngine(10000);
    expect(engine.engineOsc.frequency.setTargetAtTime).toHaveBeenCalledWith(200, expect.any(Number), 0.05);
    expect(engine.engineFilter.frequency.setTargetAtTime).toHaveBeenCalledWith(4300, expect.any(Number), 0.05);
  });

  it('ignores non-finite RPM values without writing invalid AudioParam values', () => {
    engine.start();
    engine.engineOsc.frequency.setTargetAtTime.mockClear();
    engine.engineFilter.frequency.setTargetAtTime.mockClear();

    expect(() => engine.updateEngine(NaN)).not.toThrow();
    expect(() => engine.updateEngine(Infinity)).not.toThrow();
    expect(() => engine.updateEngine(-Infinity)).not.toThrow();
    expect(engine.engineOsc.frequency.setTargetAtTime).not.toHaveBeenCalled();
    expect(engine.engineFilter.frequency.setTargetAtTime).not.toHaveBeenCalled();
  });

  it('handles unsupported AudioContext gracefully', () => {
    const origAudioContext = global.AudioContext;
    const origWebkitAudioContext = global.webkitAudioContext;

    global.AudioContext = undefined;
    global.webkitAudioContext = undefined;

    const noSupportEngine = new AudioEngine();
    expect(() => noSupportEngine.init()).not.toThrow();
    expect(noSupportEngine.ctx).toBeNull();

    expect(() => noSupportEngine.start()).not.toThrow();
    expect(() => noSupportEngine.stop()).not.toThrow();
    expect(() => noSupportEngine.updateEngine(3000)).not.toThrow();

    global.AudioContext = origAudioContext;
    global.webkitAudioContext = origWebkitAudioContext;
  });

  it('handles throwing AudioContext constructor gracefully', () => {
    const origAudioContext = global.AudioContext;

    global.AudioContext = class {
      constructor() {
        throw new Error('AudioContext initialization blocked by policy');
      }
    };

    const throwingEngine = new AudioEngine();
    expect(() => throwingEngine.init()).not.toThrow();
    expect(throwingEngine.ctx).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      'AudioContext not supported or blocked:',
      expect.any(Error)
    );

    global.AudioContext = origAudioContext;
  });

  it('handles rejected ctx.resume() promise gracefully on start()', async () => {
    engine.init();
    engine.ctx.resume = vi.fn().mockRejectedValue(new Error('Resume rejected'));
    
    engine.start();
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(console.warn).toHaveBeenCalledWith(
      'AudioContext resume failed:',
      expect.any(Error)
    );
  });
});
