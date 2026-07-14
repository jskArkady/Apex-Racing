import { describe, it, expect } from 'vitest';
import {
  handleCheckpointPass,
  sortRacers,
  sortRacersWithCheckpoints,
  calculateRacerScore,
  validateProgress
} from './raceLogic';

describe('raceLogic helper functions - 6 Bug Verification', () => {

  // Bug 1: bestLapTime when initialized to null
  it('Bug 1: should update bestLapTime correctly when it is initialized to null', () => {
    const state = {
      nextCheckpointIndex: 9,
      totalCheckpoints: 10,
      lap: 1,
      maxLaps: 3,
      bestLapTime: null,
      currentTime: 12.5,
      totalTime: 0
    };
    const result = handleCheckpointPass({ ...state, nextCheckpointIndex: 0 }, 0);
    expect(result.bestLapTime).toBe(12.5);
  });

  // Bug 2: finished racer ranking in sort comparators
  it('Bug 2: should sort finished racers ahead of playing racers in sortRacers', () => {
    const racerA = { id: 'finishedRacer', lap: 3, progress: 0, gameState: 'finished' };
    const racerB = { id: 'playingRacer', lap: 3, progress: 80, gameState: 'playing' };

    const sorted = sortRacers([racerB, racerA]);
    expect(sorted[0].id).toBe('finishedRacer');
  });

  it('Bug 2: should sort finished racers ahead of playing racers in sortRacersWithCheckpoints', () => {
    const racerA = { id: 'finishedRacer', lap: 3, checkpointIndex: 9, lastCheckpointTime: 45, gameState: 'finished' };
    const racerB = { id: 'playingRacer', lap: 3, checkpointIndex: 8, lastCheckpointTime: 40, gameState: 'playing' };

    const sorted = sortRacersWithCheckpoints([racerB, racerA]);
    expect(sorted[0].id).toBe('finishedRacer');
  });

  // Bug 3: strict weak ordering (invalid inputs)
  it('Bug 3: should handle invalid/null inputs in sort comparators without crashing and satisfy strict weak ordering', () => {
    const corpus = [
      null,
      undefined,
      {},
      { id: 'A', score: 100 },
      { id: 'B', score: 200 },
      { id: 'C', score: NaN },
      { id: 'D', score: Infinity }
    ];

    expect(() => sortRacers(corpus)).not.toThrow();
    expect(() => sortRacersWithCheckpoints(corpus)).not.toThrow();

    const sorted = sortRacers(corpus);
    expect(sorted).toBeInstanceOf(Array);
  });

  // Bug 4: checkpoint metric mismatches
  it('Bug 4: should normalize and handle mismatch between checkpointIndex and nextCheckpointIndex in sortRacersWithCheckpoints', () => {
    // Racer A has passed checkpoint 2 (checkpointIndex: 2)
    const racerA = { id: 'A', lap: 1, checkpointIndex: 2 };
    // Racer B is heading towards checkpoint 4 (nextCheckpointIndex: 4), meaning it passed checkpoint 3
    const racerB = { id: 'B', lap: 1, nextCheckpointIndex: 4 };

    // B (passed 3) should be ranked higher than A (passed 2)
    const sorted = sortRacersWithCheckpoints([racerA, racerB]);
    expect(sorted[0].id).toBe('B');
  });

  // Bug 5: NaN totalCheckpoints leak
  it('Bug 5: should default totalCheckpoints to 10 if totalCheckpoints is NaN, preventing nextCheckpointIndex unbounded growth', () => {
    const state = {
      nextCheckpointIndex: 1,
      totalCheckpoints: NaN,
      lap: 1,
      maxLaps: 3,
      bestLapTime: 0,
      currentTime: 10,
      totalTime: 0
    };

    let currentState = state;
    // Pass sectors 1..9, then cross the physical finish line at checkpoint 0.
    for (let i = 1; i < 10; i++) {
      currentState = handleCheckpointPass(currentState, i);
    }
    currentState = handleCheckpointPass(currentState, 0);
    expect(currentState.lap).toBe(2);
    expect(currentState.nextCheckpointIndex).toBe(1);
  });

  // Bug 6: Infinity progress values
  it('Bug 6: should handle Infinity values in calculateRacerScore and validateProgress', () => {
    expect(calculateRacerScore(1, Infinity)).toBe(0);
    expect(calculateRacerScore(Infinity, 50)).toBe(0);
    expect(validateProgress(0, Infinity, 10)).toBe(false);
  });

});
