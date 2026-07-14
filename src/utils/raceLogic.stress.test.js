import { describe, it, expect } from 'vitest';
import {
  isNearCheckpoint,
  handleCheckpointPass,
  calculateRacerScore,
  sortRacers,
  sortRacersWithCheckpoints
} from './raceLogic';

describe('raceLogic challenger stress tests', () => {

  describe('isNearCheckpoint - edge cases & floating point', () => {
    it('should return false if coordinates contain non-numeric types', () => {
      const carPos = ['foo', 0, 0];
      const checkpointPos = [0, 0, 0];
      expect(isNearCheckpoint(carPos, checkpointPos, 5)).toBe(false);
    });

    it('should handle floating point precision close to threshold', () => {
      const carPos = [0, 0, 0];
      const checkpointPos = [3, 0, 0];
      expect(isNearCheckpoint(carPos, checkpointPos, 3)).toBe(false);
    });

    it('should handle object position structures containing non-numeric strings', () => {
      expect(isNearCheckpoint({ x: 'invalid', y: 0, z: 0 }, [0, 0, 0], 5)).toBe(false);
    });
  });

  describe('handleCheckpointPass - edge cases & invalid totalCheckpoints / bestLapTime', () => {
    it('should default totalCheckpoints to 10 when totalCheckpoints is invalid', () => {
      const states = [
        { totalCheckpoints: NaN },
        { totalCheckpoints: Infinity },
        { totalCheckpoints: -Infinity },
        { totalCheckpoints: 0 },
        { totalCheckpoints: -5 },
        { totalCheckpoints: null },
        { totalCheckpoints: undefined },
        { totalCheckpoints: 'not-a-number' }
      ];

      for (const baseState of states) {
        const state = {
          nextCheckpointIndex: 1,
          lap: 1,
          maxLaps: 3,
          bestLapTime: 0,
          currentTime: 10,
          totalTime: 0,
          ...baseState
        };

        let currentState = state;
        for (let i = 1; i < 10; i++) {
          currentState = handleCheckpointPass(currentState, i);
        }
        expect(currentState.nextCheckpointIndex).toBe(0);
      }
    });
  });

  describe('calculateRacerScore - stress inputs', () => {
    it('should handle infinite lap or progress by returning 0', () => {
      expect(calculateRacerScore(Infinity, 50)).toBe(0);
      expect(calculateRacerScore(1, Infinity)).toBe(0);
      expect(calculateRacerScore(-Infinity, 50)).toBe(0);
      expect(calculateRacerScore(1, -Infinity)).toBe(0);
    });
  });

  describe('sortRacers - strict weak ordering under stress', () => {
    it('should handle NaN and Infinity without crashing', () => {
      const racers = [
        { id: 'player', score: NaN },
        { id: 'opponent1', score: Infinity },
        { id: 'opponent2', score: -Infinity },
        { id: 'opponent3', score: 100 }
      ];
      expect(() => sortRacers(racers)).not.toThrow();
      expect(() => sortRacersWithCheckpoints(racers)).not.toThrow();
    });
  });
});
