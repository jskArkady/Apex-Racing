import { describe, it, expect } from 'vitest';
import {
  isNearCheckpoint,
  hasCrossedFinishLine,
  handleCheckpointPass,
  calculateRacerScore,
  sortRacers,
  sortRacersWithCheckpoints,
  getRacerRank
} from './raceLogic';

describe('raceLogic helper functions', () => {

  describe('isNearCheckpoint', () => {
    it('should return true if car is within the threshold of the checkpoint (happy path)', () => {
      const carPos = [0, 0, 0];
      const checkpointPos = [3, 4, 0]; // distance is 5
      expect(isNearCheckpoint(carPos, checkpointPos, 10)).toBe(true);
    });

    it('should return false if car is beyond the threshold of the checkpoint (distant coords)', () => {
      const carPos = { x: 0, y: 0, z: 0 };
      const checkpointPos = { x: 8, y: 6, z: 0 }; // distance is 10
      expect(isNearCheckpoint(carPos, checkpointPos, 5)).toBe(false);
    });

    it('should handle boundary threshold values precisely', () => {
      const carPos = [0, 0, 0];
      const checkpointPos = [10, 0, 0]; // distance is exactly 10

      // Slightly below threshold
      expect(isNearCheckpoint(carPos, checkpointPos, 10.01)).toBe(true);
      // Exactly threshold
      expect(isNearCheckpoint(carPos, checkpointPos, 10)).toBe(false);
      // Slightly above threshold
      expect(isNearCheckpoint(carPos, checkpointPos, 9.99)).toBe(false);
    });

    it('should handle missing, null, or invalid coordinates gracefully', () => {
      expect(isNearCheckpoint(null, [0, 0, 0], 5)).toBe(false);
      expect(isNearCheckpoint([0, 0, 0], null, 5)).toBe(false);
      expect(isNearCheckpoint([0, 0, 0], [0, 0, 0], -5)).toBe(false);
      expect(isNearCheckpoint([0, 0, 0], [0, 0, 0], 'invalid')).toBe(false);
      expect(isNearCheckpoint({}, {}, 5)).toBe(true); // both default to (0, 0, 0)
    });
  });

  describe('hasCrossedFinishLine', () => {
    it('accepts only a forward seam crossing at the painted line', () => {
      expect(hasCrossedFinishLine(0.998, 0.002)).toBe(true);
      expect(hasCrossedFinishLine(0.98, 0.999)).toBe(false);
      expect(hasCrossedFinishLine(0.001, 0.999)).toBe(false);
    });

    it('rejects proximity, unrelated progress and invalid samples', () => {
      expect(hasCrossedFinishLine(0.99, 0.995)).toBe(false);
      expect(hasCrossedFinishLine(0.49, 0.51)).toBe(false);
      expect(hasCrossedFinishLine(undefined, 0)).toBe(false);
      expect(hasCrossedFinishLine(0.99, NaN)).toBe(false);
    });
  });

  describe('handleCheckpointPass', () => {
    const initialState = {
      nextCheckpointIndex: 1,
      totalCheckpoints: 10,
      lap: 1,
      maxLaps: 3,
      bestLapTime: 0,
      lastLapTime: 0,
      currentTime: 12.5,
      totalTime: 0,
      gameState: 'playing'
    };

    it('should increment nextCheckpointIndex for successive passes', () => {
      const state = { ...initialState };
      const result = handleCheckpointPass(state, 1);
      expect(result.nextCheckpointIndex).toBe(2);
    });

    it('should ignore out-of-sequence checkpoint passes', () => {
      const state = { ...initialState };
      const result = handleCheckpointPass(state, 2); // state.nextCheckpointIndex is 1
      expect(result).toBe(state); // returns unmodified state
    });

    it('should handle final checkpoint lap completion', () => {
      const state = {
        ...initialState,
        nextCheckpointIndex: 0,
        bestLapTime: 0,
        currentTime: 25.0,
        totalTime: 10.0
      };

      const result = handleCheckpointPass(state, 0);
      expect(result.lap).toBe(2);
      expect(result.nextCheckpointIndex).toBe(1);
      expect(result.currentTime).toBe(0);
      expect(result.lastLapTime).toBe(25.0);
      expect(result.bestLapTime).toBe(25.0);
      expect(result.totalTime).toBe(35.0);
    });

    it('should compare and set bestLapTime correctly on subsequent lap completions', () => {
      const state = {
        ...initialState,
        nextCheckpointIndex: 0,
        lap: 2,
        bestLapTime: 20.0,
        currentTime: 15.0,
        totalTime: 20.0
      };

      // 15.0 is better than 20.0
      const result = handleCheckpointPass(state, 0);
      expect(result.bestLapTime).toBe(15.0);

      const state2 = {
        ...initialState,
        nextCheckpointIndex: 0,
        lap: 2,
        bestLapTime: 20.0,
        currentTime: 25.0,
        totalTime: 20.0
      };

      // 25.0 is worse than 20.0
      const result2 = handleCheckpointPass(state2, 0);
      expect(result2.bestLapTime).toBe(20.0);
    });

    it('should transition gameState to finished when maxLaps is exceeded', () => {
      const state = {
        ...initialState,
        nextCheckpointIndex: 0,
        lap: 3,
        maxLaps: 3,
        currentTime: 30.0,
        totalTime: 60.0
      };

      const result = handleCheckpointPass(state, 0);
      expect(result.gameState).toBe('finished');
      expect(result.lastLapTime).toBe(30.0);
      expect(result.totalTime).toBe(90.0);
    });

    it('should handle invalid or missing state objects gracefully', () => {
      expect(handleCheckpointPass(null, 0)).toBe(null);
      expect(handleCheckpointPass(undefined, 0)).toBe(undefined);
    });

    it('never records negative or overflowing lap times', () => {
      const negative = handleCheckpointPass({
        ...initialState,
        nextCheckpointIndex: 0,
        currentTime: -20,
        totalTime: -5
      }, 0);
      expect(negative.lastLapTime).toBe(0);
      expect(negative.totalTime).toBe(0);

      const overflow = handleCheckpointPass({
        ...initialState,
        nextCheckpointIndex: 0,
        currentTime: Number.MAX_VALUE,
        totalTime: Number.MAX_VALUE
      }, 0);
      expect(Number.isFinite(overflow.totalTime)).toBe(true);
    });

    it('ignores non-integer checkpoint identifiers and normalizes checkpoint count', () => {
      const state = { ...initialState, totalCheckpoints: 10.8 };
      expect(handleCheckpointPass(state, 1.2)).toBe(state);
      expect(handleCheckpointPass(state, 1).nextCheckpointIndex).toBe(2);
    });
  });

  describe('calculateRacerScore', () => {
    it('should calculate score for standard inputs', () => {
      expect(calculateRacerScore(1, 50)).toBe(150);
      expect(calculateRacerScore(3, 99.5)).toBe(399.5);
    });

    it('should handle numeric string inputs correctly', () => {
      expect(calculateRacerScore('2', '75')).toBe(275);
    });

    it('should handle invalid inputs by returning 0', () => {
      expect(calculateRacerScore('invalid', 50)).toBe(0);
      expect(calculateRacerScore(1, 'invalid')).toBe(0);
      expect(calculateRacerScore(-1, 50)).toBe(0);
      expect(calculateRacerScore(1, -10)).toBe(0);
      expect(calculateRacerScore(null, undefined)).toBe(0);
    });
  });

  describe('sortRacers & sortRacersWithCheckpoints', () => {
    const racers = [
      { id: 'player', score: 150 },
      { id: 'opponent1', score: 250 },
      { id: 'opponent2', score: 100 }
    ];

    const racersWithLapProgress = [
      { id: 'player', progress: 150 },
      { id: 'opponent1', progress: 250 },
      { id: 'opponent2', progress: 100 }
    ];

    it('sortRacers should sort racers by score/progress descending (sorting correctness)', () => {
      const sorted = sortRacers(racers);
      expect(sorted[0].id).toBe('opponent1');
      expect(sorted[1].id).toBe('player');
      expect(sorted[2].id).toBe('opponent2');

      const sortedProgress = sortRacers(racersWithLapProgress);
      expect(sortedProgress[0].id).toBe('opponent1');
      expect(sortedProgress[1].id).toBe('player');
      expect(sortedProgress[2].id).toBe('opponent2');
    });

    it('sortRacers should handle empty arrays and missing fields', () => {
      expect(sortRacers([])).toEqual([]);
      expect(sortRacers(null)).toEqual([]);

      const incompleteRacers = [
        { id: 'racerA' }, // defaults score/progress to 0
        { id: 'racerB', score: 50 }
      ];
      const sorted = sortRacers(incompleteRacers);
      expect(sorted[0].id).toBe('racerB');
      expect(sorted[1].id).toBe('racerA');
    });

    it('sortRacersWithCheckpoints should sort by lap, checkpoint index, and time (tie-breaking)', () => {
      const checkpointRacers = [
        { id: 'racerA', lap: 2, checkpointIndex: 3, lastCheckpointTime: 40 },
        { id: 'racerB', lap: 2, checkpointIndex: 3, lastCheckpointTime: 30 },
        { id: 'racerC', lap: 1, checkpointIndex: 4, lastCheckpointTime: 20 }
      ];
      const sorted = sortRacersWithCheckpoints(checkpointRacers);
      expect(sorted[0].id).toBe('racerB');
      expect(sorted[1].id).toBe('racerA');
      expect(sorted[2].id).toBe('racerC');
    });

    it('only shares rank when the same timing field used for sorting is tied', () => {
      const finished = sortRacersWithCheckpoints([
        { id: 'fast', finished: true, lap: 3, checkpointIndex: 9, time: 50 },
        { id: 'slow', finished: true, lap: 3, checkpointIndex: 9, time: 55 }
      ]);
      expect(getRacerRank(finished, 'fast')).toBe(1);
      expect(getRacerRank(finished, 'slow')).toBe(2);

      const racing = sortRacersWithCheckpoints([
        { id: 'early', lap: 2, checkpointIndex: 4, checkpointTime: 30 },
        { id: 'late', lap: 2, checkpointIndex: 4, checkpointTime: 35 }
      ]);
      expect(getRacerRank(racing, 'early')).toBe(1);
      expect(getRacerRank(racing, 'late')).toBe(2);
    });
  });
});
