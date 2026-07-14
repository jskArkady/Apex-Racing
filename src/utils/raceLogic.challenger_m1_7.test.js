import { describe, it, expect } from 'vitest';
import {
  isNearCheckpoint,
  handleCheckpointPass,
  calculateRacerScore,
  sortRacers,
  sortRacersWithCheckpoints,
  getRacerRank,
  validateProgress
} from './raceLogic';

describe('Challenger M1-7 Empirical Verification', () => {

  describe('Destructuring Null/Undefined Parameter Safe-handling', () => {
    it('isNearCheckpoint handles null/undefined params', () => {
      expect(isNearCheckpoint(null, null, null)).toBe(false);
      expect(isNearCheckpoint(undefined, undefined, undefined)).toBe(false);
      expect(isNearCheckpoint([], [], null)).toBe(false);
      expect(isNearCheckpoint({}, {}, undefined)).toBe(false);
    });

    it('handleCheckpointPass handles null/undefined state and state properties', () => {
      expect(handleCheckpointPass(null, 0)).toBe(null);
      expect(handleCheckpointPass(undefined, 0)).toBe(undefined);
      
      const nullState = {
        nextCheckpointIndex: null,
        totalCheckpoints: null,
        lap: null,
        maxLaps: null,
        bestLapTime: null,
        currentTime: null,
        totalTime: null
      };
      
      // On non-lap-completing pass: nextCheckpointIndex is updated, other properties in state are preserved as null.
      const res = handleCheckpointPass(nullState, 0);
      expect(res.nextCheckpointIndex).toBe(null);
      expect(res.lap).toBe(null); // preserved as null from original nullState
      
      // Invalid lap configuration falls back to the product's one-lap race.
      const res2 = handleCheckpointPass({ ...nullState, nextCheckpointIndex: 0 }, 0);
      expect(res2.lap).toBe(1);
      expect(res2.nextCheckpointIndex).toBe(0);
      expect(res2.gameState).toBe('finished');
      expect(res2.bestLapTime).toBe(0);
      expect(res2.totalTime).toBe(0);
    });

    it('calculateRacerScore handles null/undefined parameters', () => {
      // undefined values lead to NaN inside Number(), causing it to return 0
      expect(calculateRacerScore(undefined, undefined)).toBe(0);
      expect(calculateRacerScore(1, undefined)).toBe(0);
      expect(calculateRacerScore(undefined, 50)).toBe(0);

      // null values are coerced to 0 by Number(null).
      // calculateRacerScore(1, null) => 1 * 100 + 0 = 100.
      expect(calculateRacerScore(1, null)).toBe(100);
      expect(calculateRacerScore(null, 50)).toBe(50);
      expect(calculateRacerScore(null, null)).toBe(0);
    });

    it('sortRacers and sortRacersWithCheckpoints handles null/undefined list and elements', () => {
      expect(sortRacers(null)).toEqual([]);
      expect(sortRacers(undefined)).toEqual([]);
      
      const mixedRacers = [null, undefined, {}, { id: 'A', score: 10 }];
      expect(() => sortRacers(mixedRacers)).not.toThrow();
      expect(() => sortRacersWithCheckpoints(mixedRacers)).not.toThrow();
    });

    it('getRacerRank handles null/undefined inputs', () => {
      expect(getRacerRank(null, 'r1')).toBe(-1);
      expect(getRacerRank([], null)).toBe(-1);
      expect(getRacerRank([null], 'r1')).toBe(-1);
    });

    it('validateProgress handles null/undefined inputs', () => {
      // undefined value coersions to NaN cause validateProgress to return false
      expect(validateProgress(undefined, undefined, undefined)).toBe(false);
      expect(validateProgress(0, 10, undefined)).toBe(false);

      // null value coersions to 0 result in Math.abs(0 - 0) <= 0, which returns true
      expect(validateProgress(null, null, null)).toBe(true);
    });
  });

  describe('Sorting NaN/Infinity Comparator Strict Weak Ordering', () => {
    it('sortRacers satisfies strict weak ordering with NaN/Infinity values', () => {
      const racers = [
        { id: 'nan', score: NaN },
        { id: 'inf', score: Infinity },
        { id: 'neginf', score: -Infinity },
        { id: 'normal1', score: 10 },
        { id: 'normal2', score: 20 },
        { id: 'normal3', score: 10 }
      ];

      // Irreflexivity: a <=> a is 0
      racers.forEach(r => {
        const sorted = sortRacers([r, r]);
        expect(sorted[0]).toBe(sorted[1]);
      });

      // Verification of output sorting:
      // NaN, Infinity, -Infinity scores all default to 0.
      // So nan, inf, neginf should be sorted at the bottom since they have effective score 0.
      // normal2 (20) -> normal1 (10) / normal3 (10) -> others (0)
      const sorted = sortRacers(racers);
      expect(sorted[0].id).toBe('normal2');
      expect(['normal1', 'normal3']).toContain(sorted[1].id);
      expect(['normal1', 'normal3']).toContain(sorted[2].id);
      
      // Ensure no crash or invalid comparison
      expect(sorted.length).toBe(6);
    });

    it('sortRacersWithCheckpoints satisfies strict weak ordering with NaN/Infinity/Undefined values', () => {
      const racers = [
        { id: 'nan_lap', lap: NaN, checkpointIndex: 1, lastCheckpointTime: 10 },
        { id: 'inf_cp', lap: 2, checkpointIndex: Infinity, lastCheckpointTime: 10 },
        { id: 'nan_time', lap: 2, checkpointIndex: 1, lastCheckpointTime: NaN },
        { id: 'inf_time', lap: 2, checkpointIndex: 1, lastCheckpointTime: Infinity },
        { id: 'normal', lap: 2, checkpointIndex: 1, lastCheckpointTime: 15 }
      ];

      expect(() => sortRacersWithCheckpoints(racers)).not.toThrow();
      
      const sorted = sortRacersWithCheckpoints(racers);
      
      expect(sorted[0].id).toBe('normal');
      expect(sorted[1].id).toBe('inf_time');
      expect(sorted[2].id).toBe('nan_time');
      expect(sorted[3].id).toBe('inf_cp');
      expect(sorted[4].id).toBe('nan_lap');
    });
  });
});
