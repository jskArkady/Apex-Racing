import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';
import { getLiveRacerRank } from '../utils/raceLogic';

const startPlaying = (mode = 'single') => {
  useGameStore.setState({ gameState: 'menu' });
  useGameStore.getState().startGame(mode);
  useGameStore.setState({ gameState: 'playing', countdown: 0 });
};

describe('game store race-state regressions', () => {
  beforeEach(() => {
    useGameStore.setState({ gameState: 'menu' });
    useGameStore.getState().startGame('single');
  });

  it('keeps all exactly tied starters at shared first place', () => {
    useGameStore.setState({ gameState: 'playing', countdown: 0 });
    useGameStore.getState().updateRacerProgress('ai_1', 1, 1, 0, false, 0, 0);

    expect(useGameStore.getState().position).toBe(1);
  });

  it('does not overwrite the continuous live rank with a later AI checkpoint report', () => {
    startPlaying();
    useGameStore.setState((state) => ({
      racers: state.racers.map((racer) => ({
        ...racer,
        nextCheckpointIndex: 5,
        lastCheckpointTime: racer.id === 'player' ? 20 : 19,
      })),
    }));
    const state = useGameStore.getState();
    const liveRank = getLiveRacerRank(state.racers, {
      player: 150,
      ai_1: 149,
      ai_2: 142,
      ai_3: 140,
    });
    state.updatePosition(liveRank);

    // Mirrors the callback order in a render frame: Car publishes the live
    // overtake first, then an AI publishes its unchanged checkpoint snapshot.
    useGameStore.getState().updateRacerProgress('ai_1', 1, 5, 19, false, 0, 10);

    expect(useGameStore.getState().position).toBe(1);
    expect(useGameStore.getState().racers.find((racer) => racer.id === 'ai_1'))
      .toMatchObject({ nextCheckpointIndex: 5, lastCheckpointTime: 19, currentTime: 10 });
  });

  it('rejects non-finite runtime samples without contaminating race state', () => {
    startPlaying();
    const before = useGameStore.getState();

    useGameStore.getState().incrementTime(Number.NaN);
    useGameStore.getState().updateTelemetry(Infinity, Number.NaN, -3);
    useGameStore.getState().updateRacerProgress(
      'ai_1',
      Number.NaN,
      Infinity,
      -10,
      false,
      Number.NaN,
      Infinity
    );

    const after = useGameStore.getState();
    const ai = after.racers.find((racer) => racer.id === 'ai_1');
    expect(after.currentTime).toBe(before.currentTime);
    expect(after.speed).toBe(before.speed);
    expect(after.rpm).toBe(before.rpm);
    expect(after.gear).toBe(before.gear);
    expect(ai).toMatchObject({
      lap: 1,
      nextCheckpointIndex: 1,
      lastCheckpointTime: 0,
      totalTime: 0,
      currentTime: 0
    });
  });

  it('publishes frame time and telemetry through one atomic update', () => {
    startPlaying();
    useGameStore.setState({ currentTime: 2, speed: 0, rpm: 0, gear: 1 });

    useGameStore.getState().updateRaceFrame(1 / 60, 72, 3160, 2);

    expect(useGameStore.getState()).toMatchObject({
      currentTime: 2 + 1 / 60,
      speed: 72,
      rpm: 3160,
      gear: 2
    });
  });

  it('synchronizes the player leaderboard entry on checkpoint and finish transitions', () => {
    startPlaying();
    useGameStore.setState({
      lap: 3,
      maxLaps: 3,
      nextCheckpointIndex: 0,
      currentTime: 30,
      totalTime: 60
    });

    useGameStore.getState().passCheckpoint(0);

    const state = useGameStore.getState();
    expect(state.gameState).toBe('finished');
    expect(state.racers.find((racer) => racer.id === 'player')).toMatchObject({
      lap: 3,
      nextCheckpointIndex: 0,
      finished: true,
      totalTime: 90,
      currentTime: 30
    });
  });

  it('fully resets race-only state for restart, menu, and time trial', () => {
    startPlaying();
    useGameStore.setState({ isDrivingBackwards: true, speed: 123, position: 4 });
    useGameStore.getState().restartRace();
    expect(useGameStore.getState()).toMatchObject({
      gameState: 'countdown',
      isDrivingBackwards: false,
      speed: 0,
      position: 1,
      totalRacers: 4
    });

    useGameStore.getState().returnToMenu();
    useGameStore.getState().startGame('time_trial');
    const trial = useGameStore.getState();
    expect(trial.totalRacers).toBe(1);
    expect(trial.racers.map((racer) => racer.id)).toEqual(['player']);
  });

  it('rejects race-state actions outside their valid transitions', () => {
    useGameStore.getState().returnToMenu();

    useGameStore.getState().pauseGame();
    useGameStore.getState().resumeGame();
    useGameStore.getState().finishGame();
    useGameStore.getState().decrementCountdown();

    expect(useGameStore.getState().gameState).toBe('menu');
  });

  it('does not let finite addition overflow the race clock', () => {
    startPlaying();
    useGameStore.setState({ currentTime: Number.MAX_VALUE });

    useGameStore.getState().incrementTime(Number.MAX_VALUE);

    expect(useGameStore.getState().currentTime).toBe(Number.MAX_VALUE);
  });

  it('includes the active lap when the explicit finish action is used', () => {
    startPlaying();
    useGameStore.setState({ currentTime: 20, totalTime: 30 });

    useGameStore.getState().finishGame();

    const state = useGameStore.getState();
    expect(state.totalTime).toBe(50);
    expect(state.racers.find((racer) => racer.id === 'player').totalTime).toBe(50);
  });
});
