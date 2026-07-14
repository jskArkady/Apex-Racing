import { create } from 'zustand';
import { handleCheckpointPass, sortRacersWithCheckpoints, getRacerRank } from '../utils/raceLogic';
import { RACE_LAPS } from '../utils/raceConfig';
import { DEFAULT_TRACK_ID, isTrackId } from '../utils/trackData';

const createRacers = (gameMode = 'single') => [
  { id: 'player', lap: 1, nextCheckpointIndex: 1, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 },
  ...(gameMode === 'time_trial' ? [] : [
    { id: 'ai_1', lap: 1, nextCheckpointIndex: 1, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 },
    { id: 'ai_2', lap: 1, nextCheckpointIndex: 1, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 },
    { id: 'ai_3', lap: 1, nextCheckpointIndex: 1, lastCheckpointTime: 0, finished: false, totalTime: 0, currentTime: 0 }
  ])
];

const nextRaceSessionId = (value) => (
  Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER
    ? value + 1
    : 1
);

const normalizeTrackId = (trackId) => isTrackId(trackId) ? trackId : DEFAULT_TRACK_ID;

const TOUCH_CONTROL_NAMES = [
  'forward',
  'backward',
  'left',
  'right',
  'brake',
  'reset'
];
const TOUCH_CONTROL_NAME_SET = new Set(TOUCH_CONTROL_NAMES);

const createTouchControls = () => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  brake: false,
  reset: false
});

const hasActiveTouchControl = (controls) => (
  controls && TOUCH_CONTROL_NAMES.some((name) => controls[name] === true)
);

const createRaceReset = (
  gameMode,
  gameState = 'countdown',
  previousSessionId = 0,
  selectedTrackId = DEFAULT_TRACK_ID
) => ({
  gameState,
  gameMode,
  selectedTrackId: normalizeTrackId(selectedTrackId),
  raceSessionId: nextRaceSessionId(previousSessionId),
  lap: 1,
  maxLaps: RACE_LAPS,
  position: 1,
  totalRacers: gameMode === 'time_trial' ? 1 : 4,
  currentTime: 0,
  bestLapTime: 0,
  lastLapTime: 0,
  totalTime: 0,
  countdown: gameState === 'countdown' ? 3 : 0,
  speed: 0,
  rpm: 0,
  gear: 1,
  nextCheckpointIndex: 1,
  totalCheckpoints: 10,
  isDrivingBackwards: false,
  touchControls: createTouchControls(),
  racers: createRacers(gameMode)
});

const finiteNonNegativeOr = (value, fallback) => (
  Number.isFinite(value) && value >= 0 ? value : fallback
);

const addFiniteNonNegative = (left, right, fallback) => {
  const sum = left + right;
  return Number.isFinite(sum) && sum >= 0 ? sum : fallback;
};

const getLeaderboardPosition = (racers, fallback = 1) => {
  const rank = getRacerRank(sortRacersWithCheckpoints(racers), 'player');
  return rank === -1 ? fallback : rank;
};

export const useGameStore = create((set) => ({
  gameState: 'menu', // 'menu', 'countdown', 'playing', 'paused', 'finished'
  gameMode: 'single', // 'single', 'time_trial'
  selectedTrackId: DEFAULT_TRACK_ID,
  raceSessionId: 0,
  
  // Settings
  settings: {
    audio: 50,
    graphics: 'high',
  },
  updateSettings: (newSettings) => set((state) => {
    const candidate = newSettings && typeof newSettings === 'object' ? newSettings : {};
    const updated = { ...state.settings };
    if (Object.prototype.hasOwnProperty.call(candidate, 'audio')) {
      const audio = Number(candidate.audio);
      updated.audio = Number.isFinite(audio)
        ? Math.max(0, Math.min(100, audio))
        : state.settings.audio;
    }
    if (Object.prototype.hasOwnProperty.call(candidate, 'graphics')
      && ['low', 'medium', 'high'].includes(candidate.graphics)) {
      updated.graphics = candidate.graphics;
    }
    return { settings: updated };
  }),
  
  // Race state
  lap: 1,
  maxLaps: RACE_LAPS,
  position: 1,
  totalRacers: 4,
  
  // Times
  currentTime: 0,
  bestLapTime: 0,
  lastLapTime: 0,
  totalTime: 0,
  countdown: 3,
  
  // Telemetry (for HUD)
  speed: 0,
  rpm: 0,
  gear: 1,
  
  // Checkpoints
  totalCheckpoints: 10,
  nextCheckpointIndex: 1,

  // Driving backwards state
  isDrivingBackwards: false,
  setDrivingBackwards: (isBackwards) => set({ isDrivingBackwards: isBackwards === true }),

  // Touch input is kept separate from drei's keyboard state. The car combines
  // the sources at read time so releasing one device cannot cancel another.
  touchControls: createTouchControls(),
  setTouchControl: (name, pressed) => set((state) => {
    if (!TOUCH_CONTROL_NAME_SET.has(name)) return state;
    const nextPressed = pressed === true;
    const currentControls = state.touchControls ?? createTouchControls();
    if (currentControls[name] === nextPressed) return state;
    return {
      touchControls: {
        ...currentControls,
        [name]: nextPressed
      }
    };
  }),
  releaseTouchControls: () => set((state) => (
    hasActiveTouchControl(state.touchControls)
      ? { touchControls: createTouchControls() }
      : state
  )),

  // Racers
  racers: createRacers(),
  
  // Actions
  startGame: (mode = 'single') => set((state) => {
    if (state.gameState !== 'menu') return state;
    const safeMode = mode === 'time_trial' ? 'time_trial' : 'single';
    return createRaceReset(safeMode, 'countdown', state.raceSessionId, state.selectedTrackId);
  }),
  restartRace: () => set((state) => createRaceReset(
    state.gameMode,
    'countdown',
    state.raceSessionId,
    state.selectedTrackId
  )),
  returnToMenu: () => set((state) => createRaceReset(
    state.gameMode,
    'menu',
    state.raceSessionId,
    state.selectedTrackId
  )),
  selectTrack: (trackId) => set((state) => {
    if (state.gameState !== 'menu') return state;
    const selectedTrackId = normalizeTrackId(trackId);
    return selectedTrackId === state.selectedTrackId ? state : { selectedTrackId };
  }),
  decrementCountdown: () => set((state) => {
    if (state.gameState !== 'countdown') return state;
    if (state.countdown <= 1) {
      return { countdown: 0, gameState: 'playing' };
    }
    return { countdown: state.countdown - 1 };
  }),
  pauseGame: () => set((state) => (
    state.gameState === 'playing' || state.gameState === 'countdown'
      ? { gameState: 'paused', touchControls: createTouchControls() }
      : state
  )),
  resumeGame: () => set((state) => (
    state.gameState === 'paused'
      ? { gameState: state.countdown > 0 ? 'countdown' : 'playing' }
      : state
  )),
  finishGame: () => set((state) => {
    if (state.gameState !== 'playing') return state;
    const accumulatedTime = finiteNonNegativeOr(state.totalTime, 0);
    const activeLapTime = finiteNonNegativeOr(state.currentTime, 0);
    const finalTotalTime = addFiniteNonNegative(
      accumulatedTime,
      activeLapTime,
      accumulatedTime
    );
    const finalLapTime = activeLapTime > 0 ? activeLapTime : state.lastLapTime;
    const bestLapTime = activeLapTime > 0
      && (!Number.isFinite(state.bestLapTime) || state.bestLapTime <= 0 || activeLapTime < state.bestLapTime)
      ? activeLapTime
      : finiteNonNegativeOr(state.bestLapTime, 0);
    const racers = state.racers.map((racer) => racer.id === 'player'
      ? {
          ...racer,
          lap: state.lap,
          nextCheckpointIndex: state.nextCheckpointIndex,
          finished: true,
          totalTime: finalTotalTime,
          currentTime: activeLapTime
        }
      : racer);
    return {
      gameState: 'finished',
      totalTime: finalTotalTime,
      lastLapTime: finalLapTime,
      bestLapTime,
      racers,
      touchControls: createTouchControls(),
      position: getLeaderboardPosition(racers, state.position)
    };
  }),
  
  passCheckpoint: (index) => set((state) => {
    if (state.gameState !== 'playing') return state;

    const nextState = handleCheckpointPass(state, index);
    if (nextState === state) return state;

    const accumulatedTime = finiteNonNegativeOr(nextState.totalTime, 0);
    const absoluteCheckpointTime = nextState.gameState === 'finished'
      ? accumulatedTime
      : addFiniteNonNegative(
          accumulatedTime,
          finiteNonNegativeOr(nextState.currentTime, 0),
          accumulatedTime
        );
    const racers = state.racers.map((racer) => racer.id === 'player'
      ? {
          ...racer,
          lap: nextState.lap,
          nextCheckpointIndex: nextState.nextCheckpointIndex,
          lastCheckpointTime: absoluteCheckpointTime,
          finished: nextState.gameState === 'finished',
          totalTime: finiteNonNegativeOr(nextState.totalTime, racer.totalTime),
          currentTime: finiteNonNegativeOr(nextState.currentTime, racer.currentTime)
        }
      : racer);

    return {
      ...nextState,
      racers,
      ...(nextState.gameState === 'finished'
        ? { touchControls: createTouchControls() }
        : {}),
      position: getLeaderboardPosition(racers, state.position)
    };
  }),
  
  updateRacerProgress: (
    id,
    lap,
    nextCheckpointIndex,
    lastCheckpointTime,
    finished,
    totalTime,
    currentTime,
    reportSessionId
  ) => set((state) => {
    if (state.gameState !== 'playing') return state;
    // Render-loop work from the previous race can arrive after a fast restart.
    // Callers that know their session must not be allowed to mutate the new one.
    if (reportSessionId !== undefined && reportSessionId !== state.raceSessionId) return state;
    if (!state.racers.some((racer) => racer.id === id)) return state;

    const normalizedCheckpointCount = Math.floor(state.totalCheckpoints);
    const checkpointCount = Number.isSafeInteger(normalizedCheckpointCount) && normalizedCheckpointCount > 0
      ? normalizedCheckpointCount
      : 10;
    const normalizedMaxLaps = Math.floor(state.maxLaps);
    const maxLaps = Number.isSafeInteger(normalizedMaxLaps) && normalizedMaxLaps >= 1
      ? normalizedMaxLaps
      : RACE_LAPS;
    const updatedRacers = state.racers.map(racer => {
      if (racer.id === id) {
        // Once a result is official it is immutable. A render-loop callback
        // already queued before the finish must not rewrite the result or rank.
        if (racer.finished) return racer;

        const currentLap = Number.isSafeInteger(racer.lap) && racer.lap >= 1 && racer.lap <= maxLaps
          ? racer.lap
          : 1;
        const normalizedLap = Math.floor(lap);
        if (!Number.isSafeInteger(normalizedLap)
          || normalizedLap < currentLap
          || normalizedLap > maxLaps) return racer;
        const candidateLap = normalizedLap;
        const currentCheckpoint = Number.isSafeInteger(racer.nextCheckpointIndex)
          && racer.nextCheckpointIndex >= 0
          && racer.nextCheckpointIndex < checkpointCount
          ? racer.nextCheckpointIndex
          : 1;
        const normalizedCheckpoint = Math.floor(nextCheckpointIndex);
        if (!Number.isSafeInteger(normalizedCheckpoint)
          || normalizedCheckpoint < 0
          || normalizedCheckpoint >= checkpointCount) return racer;
        const candidateCheckpoint = normalizedCheckpoint;
        const checkpointOrdinal = (checkpoint) => checkpoint === 0 ? checkpointCount : checkpoint;
        const lapAdvanced = candidateLap > currentLap;
        // Some harnesses/hydration paths provide an otherwise blank racer at
        // checkpoint zero. Let the first authoritative report establish its
        // real checkpoint; once any timing exists, progression is monotonic.
        const allowBlankCheckpointZeroRebase = currentLap === 1
          && currentCheckpoint === 0
          && finiteNonNegativeOr(racer.lastCheckpointTime, 0) === 0
          && finiteNonNegativeOr(racer.totalTime, 0) === 0
          && finiteNonNegativeOr(racer.currentTime, 0) === 0;
        const sameLapRegressed = !allowBlankCheckpointZeroRebase && !lapAdvanced
          && checkpointOrdinal(candidateCheckpoint) < checkpointOrdinal(currentCheckpoint);
        const hasFinishTime = Number.isFinite(totalTime) && totalTime >= 0;
        const acceptedTotalTime = finiteNonNegativeOr(racer.totalTime, 0);
        const acceptedCheckpointTime = finiteNonNegativeOr(racer.lastCheckpointTime, 0);
        // The player's authoritative lap/checkpoint state is advanced by
        // passCheckpoint. updateRacerProgress is only used to reconcile its
        // leaderboard entry during physical recovery, so it may legitimately
        // bridge more than one stored checkpoint after an interrupted frame.
        const isPlayerRecoveryReport = id === 'player';
        const isValidFinish = finished === true
          && hasFinishTime
          && candidateLap === maxLaps
          && candidateCheckpoint === 0
          && totalTime >= acceptedTotalTime
          && totalTime >= acceptedCheckpointTime
          && totalTime >= finiteNonNegativeOr(currentTime, 0);
        // A purported finish without a valid final time/position is rejected
        // atomically rather than partially moving the racer to the finish line.
        if (finished === true && !isValidFinish) return racer;
        if (!isPlayerRecoveryReport && !isValidFinish && (sameLapRegressed || (lapAdvanced
          && (candidateLap !== currentLap + 1 || candidateCheckpoint !== 1)))) return racer;
        const nextCurrentTime = finiteNonNegativeOr(currentTime, racer.currentTime);
        return {
          ...racer,
          lap: candidateLap,
          nextCheckpointIndex: candidateCheckpoint,
          lastCheckpointTime: Math.max(
            finiteNonNegativeOr(racer.lastCheckpointTime, 0),
            finiteNonNegativeOr(lastCheckpointTime, finiteNonNegativeOr(racer.lastCheckpointTime, 0))
          ),
          finished: isValidFinish,
          totalTime: Math.max(
            finiteNonNegativeOr(racer.totalTime, 0),
            finiteNonNegativeOr(totalTime, finiteNonNegativeOr(racer.totalTime, 0))
          ),
          // Within one lap elapsed time is monotonic. It may reset only after
          // a validated lap transition.
          currentTime: lapAdvanced
            ? nextCurrentTime
            : Math.max(finiteNonNegativeOr(racer.currentTime, 0), nextCurrentTime)
        };
      }
      return racer;
    });

    // Racer reports update official checkpoint/result data only. The player's
    // in-race HUD rank is authored by the continuous progress sampler in Car;
    // recomputing a checkpoint-only rank here would let a later AI callback in
    // the same frame overwrite a genuine on-track overtake.
    return { racers: updatedRacers };
  }),
  
  updatePosition: (newPos) => set((state) => {
    if (!Number.isInteger(newPos) || newPos < 1 || newPos > state.totalRacers) return state;
    if (state.position !== newPos) return { position: newPos };
    return state;
  }),
  
  updateTelemetry: (speed, rpm, gear) => set((state) => ({
    speed: finiteNonNegativeOr(speed, state.speed),
    rpm: finiteNonNegativeOr(rpm, state.rpm),
    gear: Number.isFinite(gear) && gear >= 1 ? Math.floor(gear) : state.gear
  })),
  // The vehicle controller used to publish time and telemetry through two
  // separate Zustand writes every frame. Keep one atomic frame report so HUD
  // subscribers and leaderboard listeners are notified only once.
  updateRaceFrame: (delta, speed, rpm, gear) => set((state) => {
    if (state.gameState !== 'playing') return state;
    const currentTime = Number.isFinite(delta) && delta > 0
      ? addFiniteNonNegative(state.currentTime, delta, state.currentTime)
      : state.currentTime;
    const nextSpeed = finiteNonNegativeOr(speed, state.speed);
    const nextRpm = finiteNonNegativeOr(rpm, state.rpm);
    const nextGear = Number.isFinite(gear) && gear >= 1 ? Math.floor(gear) : state.gear;
    if (currentTime === state.currentTime
      && nextSpeed === state.speed
      && nextRpm === state.rpm
      && nextGear === state.gear) return state;
    return { currentTime, speed: nextSpeed, rpm: nextRpm, gear: nextGear };
  }),
  incrementTime: (delta) => set((state) => {
    if (state.gameState !== 'playing' || !Number.isFinite(delta) || delta <= 0) return state;
    const currentTime = addFiniteNonNegative(state.currentTime, delta, state.currentTime);
    return currentTime === state.currentTime ? state : { currentTime };
  })
}));
