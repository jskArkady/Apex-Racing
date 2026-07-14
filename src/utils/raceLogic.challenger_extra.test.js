import { describe, it, expect } from 'vitest';
import {
  isNearCheckpoint,
  handleCheckpointPass,
  sortRacers,
  sortRacersWithCheckpoints,
  getRacerRank,
  validateProgress
} from './raceLogic';

describe('Challenger Extra Empirical Verification', () => {

  describe('isNearCheckpoint edge cases', () => {
    it('handles empty coordinate objects and arrays', () => {
      expect(isNearCheckpoint([], [], 1)).toBe(true);
      expect(isNearCheckpoint({}, {}, 1)).toBe(true);
      expect(isNearCheckpoint([undefined], { y: undefined }, 1)).toBe(true);
    });

    it('handles non-numeric string values in coordinates gracefully', () => {
      expect(isNearCheckpoint(['abc', 0, 0], [0, 0, 0], 5)).toBe(false);
      expect(isNearCheckpoint({ x: 'abc', y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 5)).toBe(false);
    });

    it('handles extremely small thresholds', () => {
      expect(isNearCheckpoint([0, 0, 0], [0, 0, 1e-10], 1e-9)).toBe(true);
      expect(isNearCheckpoint([0, 0, 0], [0, 0, 1e-9], 1e-10)).toBe(false);
    });
  });

  describe('handleCheckpointPass deep validation', () => {
    it('does not crash or mutate when nextCheckpointIndex is undefined or null', () => {
      const state1 = { totalCheckpoints: 10 };
      const res1 = handleCheckpointPass(state1, 0);
      expect(res1.nextCheckpointIndex).toBe(undefined);

      const state2 = { nextCheckpointIndex: null, totalCheckpoints: 10 };
      const res2 = handleCheckpointPass(state2, 0);
      expect(res2.nextCheckpointIndex).toBe(null);
    });

    it('handles totalCheckpoints value edge cases', () => {
      // If totalCheckpoints is 1, indexPassed is 0, it should complete lap
      const state = { nextCheckpointIndex: 0, totalCheckpoints: 1, lap: 1, maxLaps: 3 };
      const res = handleCheckpointPass(state, 0);
      expect(res.lap).toBe(2);
      expect(res.nextCheckpointIndex).toBe(0);
    });
  });

  describe('sortRacers stability & strict weak ordering', () => {
    it('handles NaN and undefined score fields gracefully', () => {
      const racer1 = { id: 'r1', score: NaN };
      const racer2 = { id: 'r2', score: 100 };
      const racer3 = { id: 'r3', score: undefined };

      const sorted = sortRacers([racer1, racer2, racer3]);
      expect(sorted).toBeInstanceOf(Array);
      expect(sorted.length).toBe(3);
    });

    it('satisfies transitivity in sorting under mixed finished and playing states', () => {
      const rFinished1 = { id: 'rf1', gameState: 'finished', totalTime: 50 };
      const rFinished2 = { id: 'rf2', gameState: 'finished', totalTime: 60 };
      const rPlaying1 = { id: 'rp1', gameState: 'playing', score: 200 };
      const rPlaying2 = { id: 'rp2', gameState: 'playing', score: 100 };

      const sorted = sortRacers([rPlaying2, rFinished2, rPlaying1, rFinished1]);
      
      // Expected: rf1 (finished, 50s) -> rf2 (finished, 60s) -> rp1 (playing, 200) -> rp2 (playing, 100)
      expect(sorted[0].id).toBe('rf1');
      expect(sorted[1].id).toBe('rf2');
      expect(sorted[2].id).toBe('rp1');
      expect(sorted[3].id).toBe('rp2');
    });

    it('satisfies transitivity in sortRacersWithCheckpoints', () => {
      const rFinished1 = { id: 'rf1', gameState: 'finished', totalTime: 50 };
      const rFinished2 = { id: 'rf2', gameState: 'finished', totalTime: 60 };
      const rPlaying1 = { id: 'rp1', gameState: 'playing', lap: 2, checkpointIndex: 5, lastCheckpointTime: 10 };
      const rPlaying2 = { id: 'rp2', gameState: 'playing', lap: 2, checkpointIndex: 4, lastCheckpointTime: 10 };
      const rPlaying3 = { id: 'rp3', gameState: 'playing', lap: 1, checkpointIndex: 8, lastCheckpointTime: 5 };

      const sorted = sortRacersWithCheckpoints([rPlaying3, rPlaying1, rFinished2, rPlaying2, rFinished1]);

      expect(sorted[0].id).toBe('rf1');
      expect(sorted[1].id).toBe('rf2');
      expect(sorted[2].id).toBe('rp1'); // lap 2, CP 5
      expect(sorted[3].id).toBe('rp2'); // lap 2, CP 4
      expect(sorted[4].id).toBe('rp3'); // lap 1, CP 8
    });
  });

  describe('getRacerRank check', () => {
    it('returns -1 for invalid sortedRacers or targetRacerId', () => {
      expect(getRacerRank(null, 'r1')).toBe(-1);
      expect(getRacerRank([], null)).toBe(-1);
      expect(getRacerRank([{ id: 'r1' }], undefined)).toBe(-1);
    });

    it('resolves rank by id and racerId', () => {
      const sorted = [
        { id: 'r1' },
        { racerId: 'r2' }
      ];
      expect(getRacerRank(sorted, 'r1')).toBe(1);
      expect(getRacerRank(sorted, 'r2')).toBe(2);
      expect(getRacerRank(sorted, 'r3')).toBe(-1);
    });
  });

  describe('validateProgress checks', () => {
    it('returns false for invalid maxAllowedJump', () => {
      expect(validateProgress(0, 10, -5)).toBe(false);
      expect(validateProgress(0, 10, NaN)).toBe(false);
    });

    it('handles equal progress values', () => {
      expect(validateProgress(5.5, 5.5, 0)).toBe(true);
    });
  });

  describe('Robustness fixes verification', () => {
    it('test_handleCheckpointPass_coerces_null_state_properties_with_double_question_mark', () => {
      const state = {
        nextCheckpointIndex: null,
        totalCheckpoints: null,
        lap: null,
        maxLaps: null,
        bestLapTime: null,
        currentTime: null,
        totalTime: null
      };
      const res1 = handleCheckpointPass(state, 0);
      expect(res1.nextCheckpointIndex).toBe(null);

      const res2 = handleCheckpointPass({ ...state, nextCheckpointIndex: 0 }, 0);
      expect(res2.lap).toBe(1);
      expect(res2.nextCheckpointIndex).toBe(0);
      expect(res2.gameState).toBe('finished');
      expect(res2.bestLapTime).toBe(0);
      expect(res2.totalTime).toBe(0);
    });

    it('test_sortRacers_handles_nan_and_non_finite_values_gracefully', () => {
      const racer1 = { id: 'r1', score: NaN };
      const racer2 = { id: 'r2', score: Infinity };
      const racer3 = { id: 'r3', score: 100 };
      const racer4 = { id: 'r4', gameState: 'finished', totalTime: NaN };
      const racer5 = { id: 'r5', gameState: 'finished', totalTime: Infinity };
      const racer6 = { id: 'r6', gameState: 'finished', totalTime: 50 };

      const sorted = sortRacers([racer1, racer2, racer3, racer4, racer5, racer6]);
      expect(sorted[0].id).toBe('r6');
      expect(sorted[1].gameState).toBe('finished');
      expect(sorted[2].gameState).toBe('finished');
      expect(sorted[3].id).toBe('r3');
    });

    it('test_sortRacersWithCheckpoints_handles_non_finite_laps_checkpoints_and_times', () => {
      const racer1 = { id: 'r1', lap: NaN, checkpointIndex: 2 };
      const racer2 = { id: 'r2', lap: 2, checkpointIndex: NaN };
      const racer3 = { id: 'r3', lap: 2, checkpointIndex: 2, lastCheckpointTime: NaN };
      const racer4 = { id: 'r4', lap: 2, checkpointIndex: 2, lastCheckpointTime: Infinity };
      const racer5 = { id: 'r5', lap: 2, checkpointIndex: 2, lastCheckpointTime: 20 };

      const sorted = sortRacersWithCheckpoints([racer1, racer2, racer3, racer4, racer5]);
      expect(sorted[0].id).toBe('r5');
      expect(sorted[3].id).toBe('r2');
      expect(sorted[4].id).toBe('r1');
    });
  });
});
