/**
 * Pure logic functions for the racing game.
 * Decoupled from UI and state presentation libraries (like Zustand, React, etc.).
 */
import { RACE_LAPS, START_FINISH_PROGRESS } from './raceConfig';

/**
 * Checkpoint proximity/collision detection.
 * Determines if a car is within a threshold distance of a checkpoint.
 *
 * @param {Array|Object} carPos - [x, y, z] or {x, y, z} representing the car's position.
 * @param {Array|Object} checkpointPos - [x, y, z] or {x, y, z} representing the checkpoint's position.
 * @param {number} threshold - The collision radius/distance threshold.
 * @returns {boolean} True if the distance is strictly less than the threshold.
 */
export function isNearCheckpoint(carPos, checkpointPos, threshold) {
  if (!carPos || !checkpointPos || typeof threshold !== 'number' || isNaN(threshold) || threshold <= 0) {
    return false;
  }

  const getCoords = (pos) => {
    if (Array.isArray(pos)) {
      return {
        x: pos[0] ?? 0,
        y: pos[1] ?? 0,
        z: pos[2] ?? 0
      };
    } else if (pos && typeof pos === 'object') {
      return {
        x: pos.x ?? 0,
        y: pos.y ?? 0,
        z: pos.z ?? 0
      };
    }
    return null;
  };

  const c1 = getCoords(carPos);
  const c2 = getCoords(checkpointPos);

  if (!c1 || !c2) {
    return false;
  }

  const dx = c1.x - c2.x;
  const dy = c1.y - c2.y;
  const dz = c1.z - c2.z;

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return distance < threshold;
}

/**
 * Detects a forward crossing of the curve seam where the painted finish line
 * lives. Proximity is intentionally insufficient: a lap completes only after
 * the car moves from the final section of the lap to the first section.
 */
export function hasCrossedFinishLine(previousProgress, currentProgress) {
  if (!Number.isFinite(previousProgress) || !Number.isFinite(currentProgress)) {
    return false;
  }
  const previous = (((previousProgress - START_FINISH_PROGRESS) % 1) + 1) % 1
  const current = (((currentProgress - START_FINISH_PROGRESS) % 1) + 1) % 1
  const signedDelta = (((current - previous + 0.5) % 1) + 1) % 1 - 0.5
  return previous > 0.5 && current < 0.5 && signedDelta > 0
}

/**
 * Checkpoint pass / lap increment state transition.
 * Computes the new race state when a checkpoint is passed.
 *
 * @param {Object} state - The current race state from the game store.
 * @param {number} indexPassed - The index of the checkpoint passed.
 * @returns {Object} The updated state object, or the original state if out of sequence.
 */
export function handleCheckpointPass(state, indexPassed) {
  if (!state || typeof state !== 'object') {
    return state;
  }

  const {
    nextCheckpointIndex: rawNextCheckpointIndex,
    totalCheckpoints: rawTotalCheckpoints,
    lap: rawLap,
    maxLaps: rawMaxLaps,
    bestLapTime: rawBestLapTime,
    currentTime: rawCurrentTime,
    totalTime: rawTotalTime
  } = state;

  const finiteNonNegativeOr = (value, fallback) => (
    Number.isFinite(value) && value >= 0 ? value : fallback
  );
  const addFinite = (left, right) => {
    const sum = left + right;
    return Number.isFinite(sum) ? sum : Math.max(left, right);
  };
  const normalizedCheckpointCount = Math.floor(rawTotalCheckpoints);
  const totalCheckpoints = Number.isSafeInteger(normalizedCheckpointCount) && normalizedCheckpointCount >= 1
    ? normalizedCheckpointCount
    : 10;
  const nextCheckpointIndex = Number.isSafeInteger(rawNextCheckpointIndex)
    && rawNextCheckpointIndex >= 0
    && rawNextCheckpointIndex < totalCheckpoints
    ? rawNextCheckpointIndex
    : totalCheckpoints > 1 ? 1 : 0;
  const normalizedLap = Math.floor(rawLap);
  const normalizedMaxLaps = Math.floor(rawMaxLaps);
  const lap = Number.isSafeInteger(normalizedLap) && normalizedLap >= 1 ? normalizedLap : 1;
  const maxLaps = Number.isSafeInteger(normalizedMaxLaps) && normalizedMaxLaps >= 1 ? normalizedMaxLaps : RACE_LAPS;
  const bestLapTime = finiteNonNegativeOr(rawBestLapTime, 0);
  const currentTime = finiteNonNegativeOr(rawCurrentTime, 0);
  const totalTime = finiteNonNegativeOr(rawTotalTime, 0);

  if (!Number.isSafeInteger(indexPassed) || indexPassed !== nextCheckpointIndex) {
    return state; // Out-of-sequence ignore
  }

  if (indexPassed === 0) {
    // Checkpoint zero is the physical start/finish line. A lap only completes
    // after checkpoints 1..N have been passed and the expected index wraps
    // back to zero, so the final section of the circuit cannot be skipped.
    const newBest = (bestLapTime === 0 || bestLapTime === null || currentTime < bestLapTime) ? currentTime : bestLapTime;
    const newLap = lap + 1;

    if (newLap > maxLaps) {
      return {
        ...state,
        lap: maxLaps,
        nextCheckpointIndex: 0,
        gameState: 'finished',
        lastLapTime: currentTime,
        bestLapTime: newBest,
        totalTime: addFinite(totalTime, currentTime)
      };
    }

    return {
      ...state,
      lap: newLap,
      lastLapTime: currentTime,
      bestLapTime: newBest,
      currentTime: 0,
      totalTime: addFinite(totalTime, currentTime),
      nextCheckpointIndex: totalCheckpoints > 1 ? 1 : 0
    };
  } else {
    return {
      ...state,
      nextCheckpointIndex: indexPassed === totalCheckpoints - 1 ? 0 : indexPassed + 1
    };
  }
}

/**
 * Racer score calculation.
 * Computes a standardized progress score based on the current lap and track progress.
 *
 * @param {number} lap - The current lap.
 * @param {number} progress - The progress along the current lap (0 to 100).
 * @returns {number} The cumulative racer progress score.
 */
export function calculateRacerScore(lap, progress) {
  const parsedLap = Number(lap);
  const parsedProgress = Number(progress);

  if (!Number.isFinite(parsedLap) || !Number.isFinite(parsedProgress) || parsedLap < 0 || parsedProgress < 0) {
    return 0;
  }

  const score = parsedLap * 100 + parsedProgress;
  return Number.isFinite(score) ? score : 0;
}

/**
 * Produces a monotonic live-race score across the start/finish seam.
 *
 * Race state starts at lap one even though the standing grid is physically
 * behind the line (curve progress near one). While CP1 is still the next
 * checkpoint, that pre-start segment belongs to the previous score band. The
 * same rule also covers the short interval after a later lap has been awarded
 * by the finish gate but before the curve projection wraps to zero.
 */
export function calculateLiveRaceScore(lap, nextCheckpointIndex, progress) {
  const parsedLap = Number(lap)
  const parsedProgress = Number(progress)
  if (!Number.isFinite(parsedLap) || !Number.isFinite(parsedProgress)) return 0

  const safeLap = Math.max(0, Math.floor(parsedLap))
  const relativeProgress = (((parsedProgress - START_FINISH_PROGRESS) % 1) + 1) % 1
  const scoreLap = Number(nextCheckpointIndex) === 1 && relativeProgress > 0.5
    ? Math.max(0, safeLap - 1)
    : safeLap
  const score = scoreLap * 100 + relativeProgress * 100
  return Number.isFinite(score) ? score : 0
}

const isFinished = (r) => r && (r.finished === true || r.status === 'finished' || r.gameState === 'finished');

const getFinishedTime = (racer) => {
  const rawTime = racer?.totalTime ?? racer?.time ?? racer?.lastCheckpointTime ?? Infinity;
  return Number.isFinite(rawTime) && rawTime >= 0 ? rawTime : Infinity;
};

const getCheckpointTime = (racer) => {
  const rawTime = racer?.lastCheckpointTime ?? racer?.checkpointTime ?? racer?.time ?? Infinity;
  return Number.isFinite(rawTime) && rawTime >= 0 ? rawTime : Infinity;
};

const getNormalizedCheckpoint = (r) => {
  if (!r) return -1;
  if (r.checkpointIndex !== undefined && r.checkpointIndex !== null) {
    const checkpoint = Number(r.checkpointIndex);
    return Number.isFinite(checkpoint) && checkpoint >= 0 ? Math.floor(checkpoint) : -1;
  }
  if (r.nextCheckpointIndex !== undefined && r.nextCheckpointIndex !== null) {
    const nextCheckpoint = Number(r.nextCheckpointIndex);
    const checkpointCount = Number.isFinite(r.totalCheckpoints) && r.totalCheckpoints > 0
      ? Math.floor(r.totalCheckpoints)
      : 10;
    if (!Number.isFinite(nextCheckpoint) || nextCheckpoint < 0 || nextCheckpoint >= checkpointCount) {
      return -1;
    }
    const normalizedNext = Math.floor(nextCheckpoint);
    return normalizedNext === 0 ? checkpointCount - 1 : normalizedNext - 1;
  }
  return -1;
};

/**
 * Racer sorting (simple progress score based).
 * Sorts racers based on their simple cumulative progress score in descending order.
 *
 * @param {Array} racers - The list of racer objects.
 * @returns {Array} The sorted list of racers.
 */
export function sortRacers(racers) {
  if (!Array.isArray(racers)) {
    return [];
  }

  return [...racers].sort((a, b) => {
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
      const timeA = getFinishedTime(a);
      const timeB = getFinishedTime(b);
      if (timeA === timeB) return 0;
      return timeA - timeB;
    }

    const rawScoreA = a.score ?? a.progress ?? ((a.lap ?? 0) * 100 + (a.checkpointProgress ?? a.progressVal ?? 0));
    const rawScoreB = b.score ?? b.progress ?? ((b.lap ?? 0) * 100 + (b.checkpointProgress ?? b.progressVal ?? 0));
    const scoreA = Number.isFinite(rawScoreA) ? rawScoreA : 0;
    const scoreB = Number.isFinite(rawScoreB) ? rawScoreB : 0;

    return scoreB - scoreA;
  });
}

/**
 * Racer sorting (precision checkpoint + tie-breaker based).
 * Sorts racers first by lap (descending), then checkpoint (descending),
 * and uses checkpoint time as an ascending tie-breaker.
 *
 * @param {Array} racers - The list of racer objects.
 * @returns {Array} The sorted list of racers.
 */
export function sortRacersWithCheckpoints(racers) {
  if (!Array.isArray(racers)) {
    return [];
  }

  return [...racers].sort((a, b) => {
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
      const timeA = getFinishedTime(a);
      const timeB = getFinishedTime(b);
      if (timeA === timeB) return 0;
      return timeA - timeB;
    }

    // 1. Compare Lap (descending)
    const rawLapA = a.lap ?? 0;
    const rawLapB = b.lap ?? 0;
    const lapA = Number.isFinite(rawLapA) ? rawLapA : 0;
    const lapB = Number.isFinite(rawLapB) ? rawLapB : 0;
    if (lapA !== lapB) {
      return lapB - lapA;
    }

    // 2. Compare Checkpoint Index (descending)
    const rawCpA = getNormalizedCheckpoint(a);
    const rawCpB = getNormalizedCheckpoint(b);
    const cpA = Number.isFinite(rawCpA) ? rawCpA : 0;
    const cpB = Number.isFinite(rawCpB) ? rawCpB : 0;
    if (cpA !== cpB) {
      return cpB - cpA;
    }

    // 3. Tie-breaker: Time at checkpoint (ascending, lower is faster/ahead)
    const cpTimeA = getCheckpointTime(a);
    const cpTimeB = getCheckpointTime(b);
    if (cpTimeA !== cpTimeB) {
      return cpTimeA - cpTimeB;
    }

    // Deterministic fallback by id
    const idA = String(a.id ?? '');
    const idB = String(b.id ?? '');
    return idA.localeCompare(idB);
  });
}

/**
 * Position rank retrieval.
 * Returns the 1-based rank of the target racer from the sorted leaderboard.
 *
 * @param {Array} sortedRacers - The sorted list of racers.
 * @param {string|number} targetRacerId - The ID of the target racer.
 * @returns {number} The 1-based rank, or -1 if the racer is not found or inputs are invalid.
 */
export function getRacerRank(sortedRacers, targetRacerId) {
  if (!Array.isArray(sortedRacers) || targetRacerId === undefined || targetRacerId === null) {
    return -1;
  }

  const index = sortedRacers.findIndex(r => r && (r.id === targetRacerId || r.racerId === targetRacerId));
  if (index === -1) {
    return -1;
  }

  // The ID fallback in sortRacersWithCheckpoints makes ordering deterministic,
  // but it is not a sporting tie-breaker. Racers with identical completed
  // checkpoints and timing share a rank; the next distinct racer keeps the
  // normal competition rank (1, 1, 3...). Objects without race metrics retain
  // their literal array rank for backwards compatibility with generic callers.
  const target = sortedRacers[index];
  const hasRaceMetrics = (racer) => racer
    && Number.isFinite(racer.lap)
    && Number.isFinite(getNormalizedCheckpoint(racer));
  const areTied = (a, b) => {
    if (!hasRaceMetrics(a) || !hasRaceMetrics(b)) return false;

    const finishedA = isFinished(a);
    const finishedB = isFinished(b);
    if (finishedA !== finishedB) return false;

    if (finishedA) {
      return getFinishedTime(a) === getFinishedTime(b);
    }

    return a.lap === b.lap
      && getNormalizedCheckpoint(a) === getNormalizedCheckpoint(b)
      && getCheckpointTime(a) === getCheckpointTime(b);
  };

  let firstTiedIndex = index;
  while (firstTiedIndex > 0 && areTied(sortedRacers[firstTiedIndex - 1], target)) {
    firstTiedIndex -= 1;
  }

  return firstTiedIndex + 1;
}

/**
 * Computes a live rank without weakening the authoritative checkpoint/result
 * contract. Finished racers always keep result priority; active racers use the
 * continuity-approved curve score published by their controllers, falling
 * back to lap/checkpoint state when a live sample is unavailable.
 */
export function getLiveRacerRank(
  racers,
  liveProgress,
  targetRacerId = 'player',
  fallback = 1,
) {
  if (!Array.isArray(racers) || racers.length === 0) return fallback
  const progressById = liveProgress && typeof liveProgress === 'object'
    ? liveProgress
    : {}
  const ranked = racers.map((racer) => {
    if (!racer || typeof racer !== 'object' || isFinished(racer)) return racer
    const liveScore = progressById[racer.id]
    if (Number.isFinite(liveScore) && liveScore >= 0) {
      return { ...racer, score: liveScore }
    }
    const checkpointCount = Number.isFinite(racer.totalCheckpoints)
      && racer.totalCheckpoints > 0
      ? Math.floor(racer.totalCheckpoints)
      : 10
    const completedCheckpoint = Math.max(0, getNormalizedCheckpoint(racer))
    const lap = Number.isFinite(racer.lap) && racer.lap >= 0 ? racer.lap : 0
    return {
      ...racer,
      score: lap * 100 + completedCheckpoint / checkpointCount * 100,
    }
  })
  const sorted = sortRacers(ranked)
  const targetIndex = sorted.findIndex((racer) => racer
    && (racer.id === targetRacerId || racer.racerId === targetRacerId))
  if (targetIndex === -1) return fallback

  const target = sorted[targetIndex]
  if (isFinished(target)) return getRacerRank(sorted, targetRacerId)

  // The generic rank helper intentionally treats identical checkpoint timing
  // as a sporting tie. During live running, however, two cars can share that
  // checkpoint snapshot while one has already passed the other on track. Use
  // the continuity-approved live score as the active-race tie breaker.
  const targetScore = Number.isFinite(target.score) ? target.score : 0
  const racersAhead = sorted.reduce((count, racer) => {
    if (!racer || racer === target) return count
    if (isFinished(racer)) return count + 1
    const racerScore = Number.isFinite(racer.score) ? racer.score : 0
    return count + (racerScore > targetScore ? 1 : 0)
  }, 0)
  return racersAhead + 1
}

/**
 * Continuous progress verification / anti-cheat filter.
 * Ensures progress updates are within physically plausible bounds.
 *
 * @param {number} lastProgress - The previous progress value.
 * @param {number} candidateProgress - The new proposed progress value.
 * @param {number} maxAllowedJump - The maximum distance/value change allowed per tick.
 * @returns {boolean} True if the candidate progress change is valid.
 */
export function validateProgress(lastProgress, candidateProgress, maxAllowedJump) {
  const last = Number(lastProgress);
  const cand = Number(candidateProgress);
  const max = Number(maxAllowedJump);

  if (isNaN(last) || isNaN(cand) || isNaN(max) || max < 0) {
    return false;
  }

  return Math.abs(cand - last) <= max;
}
