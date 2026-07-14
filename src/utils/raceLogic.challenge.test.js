import { handleCheckpointPass, sortRacersWithCheckpoints, sortRacers } from './raceLogic';

describe('raceLogic challenger stress tests', () => {

  it('verifies bestLapTime stays null forever if initialized to null', () => {
    const state = {
      nextCheckpointIndex: 9,
      totalCheckpoints: 10,
      lap: 1,
      maxLaps: 3,
      bestLapTime: null, // Null initialization
      currentTime: 15.0,
      totalTime: 0
    };

    const result = handleCheckpointPass({ ...state, nextCheckpointIndex: 0 }, 0);
    // Since bestLapTime was null, we expect it to be updated to 15.0.
    // Let's see what the implementation actually does.
    expect(result.bestLapTime).toBe(15.0);
  });

  it('verifies finished racer ranking bug in sortRacersWithCheckpoints', () => {
    // Racer A has finished the race (lap 3 completed, nextCheckpointIndex stays 9, lastCheckpointTime at finish was 45)
    const racerA = {
      id: 'racerA',
      lap: 3,
      nextCheckpointIndex: 9,
      lastCheckpointTime: 45,
      gameState: 'finished'
    };

    // Racer B is still on lap 3, next checkpoint is 9 (passed checkpoint 8 at time 40)
    const racerB = {
      id: 'racerB',
      lap: 3,
      nextCheckpointIndex: 9,
      lastCheckpointTime: 40,
      gameState: 'playing'
    };

    const sorted = sortRacersWithCheckpoints([racerA, racerB]);
    
    // Racer A has finished the race, so they should be ranked ahead of Racer B (who has NOT finished).
    // Let's see who is actually sorted first.
    expect(sorted[0].id).toBe('racerA');
  });

  it('verifies finished racer ranking bug in sortRacers', () => {
    // Racer A has finished the race (lap 3 completed)
    // Their final score: lap 3 * 100 + checkpointProgress 0 (since it resets or stays 0) = 300
    const racerA = {
      id: 'racerA',
      lap: 3,
      checkpointProgress: 0,
      gameState: 'finished'
    };

    // Racer B is still on lap 3, checkpoint 8
    // Their score: lap 3 * 100 + checkpointProgress 80 = 380
    const racerB = {
      id: 'racerB',
      lap: 3,
      checkpointProgress: 80,
      gameState: 'playing'
    };

    const sorted = sortRacers([racerA, racerB]);

    // Racer A has finished, so they should be ranked first.
    expect(sorted[0].id).toBe('racerA');
  });
});
