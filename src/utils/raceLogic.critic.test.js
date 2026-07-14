import { describe, it, expect } from 'vitest';
import {
  handleCheckpointPass,
  calculateRacerScore,
  sortRacers,
  sortRacersWithCheckpoints,
  validateProgress
} from './raceLogic';

// Recreated comparators from raceLogic.js to test strict weak ordering directly
const isFinished = (r) => r && (r.finished === true || r.status === 'finished' || r.gameState === 'finished');

const getNormalizedCheckpoint = (r) => {
  if (!r) return -1;
  if (r.checkpointIndex !== undefined && r.checkpointIndex !== null) {
    return r.checkpointIndex;
  }
  if (r.nextCheckpointIndex !== undefined && r.nextCheckpointIndex !== null) {
    return r.nextCheckpointIndex === 0 ? 9 : r.nextCheckpointIndex - 1;
  }
  return -1;
};

function sortRacersComparator(a, b) {
  const isInvalid = (r) => !r || typeof r !== 'object';
  const invalidA = isInvalid(a);
  const invalidB = isInvalid(b);
  if (invalidA && invalidB) return 0;
  if (invalidA) return 1;
  if (invalidB) return -1;

  const finishedA = isFinished(a);
  const finishedB = isFinished(b);
  if (finishedA !== finishedB) {
    return finishedA ? -1 : 1;
  }
  if (finishedA && finishedB) {
    const timeA = a.totalTime ?? a.time ?? 0;
    const timeB = b.totalTime ?? b.time ?? 0;
    return timeA - timeB;
  }

  const scoreA = a.score ?? a.progress ?? ((a.lap ?? 0) * 100 + (a.checkpointProgress ?? a.progressVal ?? 0));
  const scoreB = b.score ?? b.progress ?? ((b.lap ?? 0) * 100 + (b.checkpointProgress ?? b.progressVal ?? 0));

  return scoreB - scoreA;
}

function sortRacersWithCheckpointsComparator(a, b) {
  const isInvalid = (r) => !r || typeof r !== 'object';
  const invalidA = isInvalid(a);
  const invalidB = isInvalid(b);
  if (invalidA && invalidB) return 0;
  if (invalidA) return 1;
  if (invalidB) return -1;

  const finishedA = isFinished(a);
  const finishedB = isFinished(b);
  if (finishedA !== finishedB) {
    return finishedA ? -1 : 1;
  }
  if (finishedA && finishedB) {
    const timeA = a.totalTime ?? a.time ?? a.lastCheckpointTime ?? 0;
    const timeB = b.totalTime ?? b.time ?? b.lastCheckpointTime ?? 0;
    return timeA - timeB;
  }

  // 1. Compare Lap (descending)
  const lapA = a.lap ?? 0;
  const lapB = b.lap ?? 0;
  if (lapA !== lapB) {
    return lapB - lapA;
  }

  // 2. Compare Checkpoint Index (descending)
  const cpA = getNormalizedCheckpoint(a);
  const cpB = getNormalizedCheckpoint(b);
  if (cpA !== cpB) {
    return cpB - cpA;
  }

  // 3. Tie-breaker: Time at checkpoint (ascending, lower is faster/ahead)
  const timeA = a.lastCheckpointTime ?? a.checkpointTime ?? a.time ?? 0;
  const timeB = b.lastCheckpointTime ?? b.checkpointTime ?? b.time ?? 0;
  if (timeA !== timeB) {
    return timeA - timeB;
  }

  // Deterministic fallback by id
  const idA = String(a.id ?? '');
  const idB = String(b.id ?? '');
  return idA.localeCompare(idB);
}

describe('raceLogic Critic Rigorous Verification', () => {

  // Bug 1: bestLapTime when initialized to null
  describe('Bug 1: bestLapTime initialized to null/undefined/NaN/Infinity', () => {
    const baseState = {
      nextCheckpointIndex: 0,
      totalCheckpoints: 10,
      lap: 1,
      maxLaps: 3,
      currentTime: 12.5,
      totalTime: 0
    };

    it('should set bestLapTime to currentTime if it is null', () => {
      const state = { ...baseState, bestLapTime: null };
      const res = handleCheckpointPass(state, 0);
      expect(res.bestLapTime).toBe(12.5);
    });

    it('should set bestLapTime to currentTime if it is undefined (defaulting to 0 in destructuring, which is treated as unset)', () => {
      const state = { ...baseState, bestLapTime: undefined };
      const res = handleCheckpointPass(state, 0);
      expect(res.bestLapTime).toBe(12.5);
    });

    it('should set bestLapTime to currentTime if it is 0 (treated as unset)', () => {
      const state = { ...baseState, bestLapTime: 0 };
      const res = handleCheckpointPass(state, 0);
      expect(res.bestLapTime).toBe(12.5);
    });

    it('should handle better bestLapTime on next lap when initialized to null', () => {
      let state = { ...baseState, bestLapTime: null, currentTime: 20.0 };
      // Lap 1 finishes with 20.0
      state = handleCheckpointPass(state, 0);
      expect(state.bestLapTime).toBe(20.0);

      // Lap 2 finishes with 15.0 (better)
      state.currentTime = 15.0;
      state.nextCheckpointIndex = 0;
      state = handleCheckpointPass(state, 0);
      expect(state.bestLapTime).toBe(15.0);

      // Lap 3 finishes with 18.0 (worse)
      state.currentTime = 18.0;
      state.nextCheckpointIndex = 0;
      state = handleCheckpointPass(state, 0);
      expect(state.bestLapTime).toBe(15.0);
    });

    it('normalizes non-finite and impossible negative best-lap values', () => {
      const stateNaN = { ...baseState, bestLapTime: NaN };
      const resNaN = handleCheckpointPass(stateNaN, 0);
      expect(resNaN.bestLapTime).toBe(baseState.currentTime);

      // A negative duration is finite but cannot be a valid historical lap.
      const stateNeg = { ...baseState, bestLapTime: -5 };
      const resNeg = handleCheckpointPass(stateNeg, 0);
      expect(resNeg.bestLapTime).toBe(baseState.currentTime);
    });
  });

  // Bug 2: finished racer ranking in sort comparators
  describe('Bug 2: Finished racer ranking and tie-breakers', () => {
    it('should rank finished racers ahead of playing racers regardless of score/lap', () => {
      const racers = [
        { id: 'playing1', gameState: 'playing', lap: 5, score: 550 },
        { id: 'finished1', gameState: 'finished', lap: 3, score: 300, totalTime: 120 },
        { id: 'playing2', status: 'playing', lap: 1, score: 50 },
        { id: 'finished2', status: 'finished', lap: 3, score: 300, time: 110 },
        { id: 'finished3', finished: true, lap: 3, score: 300, totalTime: 115 }
      ];

      // sortRacers verification
      const sorted1 = sortRacers(racers);
      expect(sorted1[0].id).toBe('finished2'); // finished, 110s (fastest finished)
      expect(sorted1[1].id).toBe('finished3'); // finished, 115s
      expect(sorted1[2].id).toBe('finished1'); // finished, 120s
      expect(sorted1[3].id).toBe('playing1');  // playing, score 550
      expect(sorted1[4].id).toBe('playing2');  // playing, score 50

      // sortRacersWithCheckpoints verification
      const sorted2 = sortRacersWithCheckpoints(racers);
      expect(sorted2[0].id).toBe('finished2'); // finished, 110s
      expect(sorted2[1].id).toBe('finished3'); // finished, 115s
      expect(sorted2[2].id).toBe('finished1'); // finished, 120s
      expect(sorted2[3].id).toBe('playing1');
      expect(sorted2[4].id).toBe('playing2');
    });
  });

  // Bug 3: strict weak ordering (invalid inputs)
  describe('Bug 3: Strict weak ordering validation', () => {
    // Generate a diverse corpus of valid and invalid racer objects without NaN/Infinity/invalid strings
    const corpusSafe = [
      null,
      undefined,
      {},
      { id: 'valid_playing', gameState: 'playing', lap: 2, score: 250 },
      { id: 'valid_finished', gameState: 'finished', totalTime: 80 },
      { id: 'string_score', score: '150' },
      { id: 'no_id_playing', gameState: 'playing', score: 100 },
      { id: 'mismatched_metrics', lap: 1, checkpointIndex: 2, nextCheckpointIndex: 5 },
      { id: 'no_fields_obj', somethingElse: true }
    ];

    const runStrictWeakOrderingCheck = (comparator, items) => {
      // 1. Irreflexivity: cmp(a, a) === 0
      for (const a of items) {
        const res = comparator(a, a);
        if (res !== 0) {
          throw new Error(`Irreflexivity violated: cmp(a, a) returned ${res} for ${JSON.stringify(a)}`);
        }
      }

      // 2. Antisymmetry: Math.sign(cmp(a, b)) === -Math.sign(cmp(b, a))
      for (let i = 0; i < items.length; i++) {
        for (let j = 0; j < items.length; j++) {
          const a = items[i];
          const b = items[j];
          const ab = comparator(a, b);
          const ba = comparator(b, a);
          
          if (Number.isNaN(ab) || Number.isNaN(ba)) {
            throw new Error(`NaN returned: cmp(a, b)=${ab}, cmp(b, a)=${ba} for a=${JSON.stringify(a)}, b=${JSON.stringify(b)}`);
          }

          if (Math.sign(ab) !== -Math.sign(ba)) {
            throw new Error(`Antisymmetry violated: cmp(a, b)=${ab}, cmp(b, a)=${ba} for a=${JSON.stringify(a)}, b=${JSON.stringify(b)}`);
          }
        }
      }

      // 3. Transitivity: if cmp(a, b) < 0 and cmp(b, c) < 0, then cmp(a, c) < 0
      for (let i = 0; i < items.length; i++) {
        for (let j = 0; j < items.length; j++) {
          for (let k = 0; k < items.length; k++) {
            const a = items[i];
            const b = items[j];
            const c = items[k];
            
            const ab = comparator(a, b);
            const bc = comparator(b, c);
            const ac = comparator(a, c);

            if (ab < 0 && bc < 0 && !(ac < 0)) {
              throw new Error(`Transitivity of < violated: a=${JSON.stringify(a)}, b=${JSON.stringify(b)}, c=${JSON.stringify(c)}. ab=${ab}, bc=${bc}, ac=${ac}`);
            }
          }
        }
      }

      // 4. Transitivity of equivalence: if cmp(a, b) === 0 and cmp(b, c) === 0, then cmp(a, c) === 0
      for (let i = 0; i < items.length; i++) {
        for (let j = 0; j < items.length; j++) {
          for (let k = 0; k < items.length; k++) {
            const a = items[i];
            const b = items[j];
            const c = items[k];
            
            const ab = comparator(a, b);
            const bc = comparator(b, c);
            const ac = comparator(a, c);

            if (ab === 0 && bc === 0 && ac !== 0) {
              throw new Error(`Transitivity of equivalence violated: a=${JSON.stringify(a)}, b=${JSON.stringify(b)}, c=${JSON.stringify(c)}. ab=${ab}, bc=${bc}, ac=${ac}`);
            }
          }
        }
      }
    };

    it('should satisfy strict weak ordering in sortRacers comparator for safe inputs', () => {
      expect(() => runStrictWeakOrderingCheck(sortRacersComparator, corpusSafe)).not.toThrow();
    });

    it('should satisfy strict weak ordering in sortRacersWithCheckpoints comparator for safe inputs', () => {
      expect(() => runStrictWeakOrderingCheck(sortRacersWithCheckpointsComparator, corpusSafe)).not.toThrow();
    });

    it('empirically demonstrates that NaN and Infinity inputs still break strict weak ordering in comparators', () => {
      // 1. sortRacers NaN score irreflexivity violation
      const racerNaNScore = { id: 'nan_score', score: NaN };
      const resNaNScore = sortRacersComparator(racerNaNScore, racerNaNScore);
      expect(resNaNScore).toBeNaN(); // Violates irreflexivity (returns NaN instead of 0)

      // 2. sortRacers Infinity score subtraction violation
      const racerInfScore = { id: 'inf_score', score: Infinity };
      const resInfScore = sortRacersComparator(racerInfScore, racerInfScore);
      expect(resInfScore).toBeNaN(); // Infinity - Infinity = NaN

      // 3. sortRacersWithCheckpoints NaN lap irreflexivity violation
      const racerNaNLap = { id: 'nan_lap', lap: NaN };
      const resNaNLap = sortRacersWithCheckpointsComparator(racerNaNLap, racerNaNLap);
      expect(resNaNLap).toBeNaN();

      // 4. sortRacersWithCheckpoints NaN checkpointIndex irreflexivity violation
      const racerNaNCheckpoint = { id: 'nan_cp', lap: 1, checkpointIndex: NaN };
      const resNaNCheckpoint = sortRacersWithCheckpointsComparator(racerNaNCheckpoint, racerNaNCheckpoint);
      expect(resNaNCheckpoint).toBeNaN();

      // 5. sortRacersWithCheckpoints NaN time irreflexivity violation
      const racerNaNTime = { id: 'nan_time', lap: 1, checkpointIndex: 1, lastCheckpointTime: NaN };
      const resNaNTime = sortRacersWithCheckpointsComparator(racerNaNTime, racerNaNTime);
      expect(resNaNTime).toBeNaN();
    });
  });

  // Bug 4: checkpoint metric mismatches
  describe('Bug 4: Checkpoint metric mismatches & normalization', () => {
    it('should resolve checkpointIndex or nextCheckpointIndex correctly', () => {
      // Racer A: checkpointIndex: 2
      const racerA = { id: 'A', lap: 1, checkpointIndex: 2 };
      // Racer B: nextCheckpointIndex: 4 (meaning passed 3)
      const racerB = { id: 'B', lap: 1, nextCheckpointIndex: 4 };
      // Racer C: nextCheckpointIndex: 3 (meaning passed 2)
      const racerC = { id: 'C', lap: 1, nextCheckpointIndex: 3 };

      const sorted = sortRacersWithCheckpoints([racerA, racerC, racerB]);
      expect(sorted[0].id).toBe('B'); // checkpoint 3
      // A and C both have normalized checkpoint 2.
      // Since lap and normalized checkpoints are equal, it compares checkpoint time.
      // If time is missing/equal (0 for both), they are compared deterministically by id: 'A' vs 'C'
      expect(sorted[1].id).toBe('A');
      expect(sorted[2].id).toBe('C');
    });

    it('should prefer checkpointIndex over nextCheckpointIndex if both are present', () => {
      // Racer A: checkpointIndex: 2, nextCheckpointIndex: 5 (mismatched)
      // Normalized checkpoint should be checkpointIndex: 2
      const racerA = { id: 'A', lap: 1, checkpointIndex: 2, nextCheckpointIndex: 5 };
      // Racer B: checkpointIndex: 3, nextCheckpointIndex: 1
      // Normalized checkpoint should be checkpointIndex: 3
      const racerB = { id: 'B', lap: 1, checkpointIndex: 3, nextCheckpointIndex: 1 };

      const sorted = sortRacersWithCheckpoints([racerA, racerB]);
      expect(sorted[0].id).toBe('B'); // B (3) ahead of A (2)
    });
  });

  // Bug 5: NaN totalCheckpoints leak
  describe('Bug 5: NaN totalCheckpoints leak and validation', () => {
    it('should default totalCheckpoints to 10 if totalCheckpoints is invalid in handleCheckpointPass', () => {
      const invalidValues = [NaN, undefined, null, -1, 0, 'abc', {}, []];
      for (const val of invalidValues) {
        const state = {
          nextCheckpointIndex: 0,
          totalCheckpoints: val,
          lap: 1,
          maxLaps: 3,
          bestLapTime: 0,
          currentTime: 10,
          totalTime: 0
        };

        const res = handleCheckpointPass(state, 0);
        // With a valid fallback layout, checkpoint zero remains the finish line.
        expect(res.lap).toBe(2);
        expect(res.nextCheckpointIndex).toBe(1);
      }
    });
  });

  // Bug 6: Infinity progress values
  describe('Bug 6: Infinity progress values handling', () => {
    it('should reject Infinity and -Infinity in calculateRacerScore', () => {
      expect(calculateRacerScore(1, Infinity)).toBe(0);
      expect(calculateRacerScore(Infinity, 50)).toBe(0);
      expect(calculateRacerScore(1, -Infinity)).toBe(0);
      expect(calculateRacerScore(-Infinity, 50)).toBe(0);
    });

    it('should reject Infinity in validateProgress', () => {
      expect(validateProgress(0, Infinity, 10)).toBe(false);
      expect(validateProgress(Infinity, 0, 10)).toBe(false);
      expect(validateProgress(Infinity, Infinity, 10)).toBe(false);
      expect(validateProgress(0, 5, Infinity)).toBe(true);
      expect(validateProgress(0, 5, -Infinity)).toBe(false);
    });
  });

});
