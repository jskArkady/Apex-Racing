export const RACE_LAPS = 1
export const START_FINISH_PROGRESS = 0

export const LAP_OPTIONS = Object.freeze([1, 3, 5])
export const AI_DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ label: 'Easy', pace: 0.78, brakingLookAhead: 1.2 }),
  normal: Object.freeze({ label: 'Normal', pace: 0.9, brakingLookAhead: 1.1 }),
  hard: Object.freeze({ label: 'Hard', pace: 1, brakingLookAhead: 1 }),
})
export const DEFAULT_RACE_OPTIONS = Object.freeze({ laps: RACE_LAPS, difficulty: 'hard' })
