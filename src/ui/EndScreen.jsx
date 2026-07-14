import { useGameStore } from '../store/gameStore'
import { formatTime } from '../utils/formatTime'

const ordinal = (value) => {
  const number = Number.isFinite(value) ? value : 1
  const tens = number % 100
  if (tens >= 11 && tens <= 13) return number + 'TH'
  return number + ({ 1: 'ST', 2: 'ND', 3: 'RD' }[number % 10] ?? 'TH')
}

export default function EndScreen() {
  const {
    totalTime, bestLapTime, lastLapTime, position, maxLaps,
    gameMode, restartRace, returnToMenu
  } = useGameStore()
  const isTimeTrial = gameMode === 'time_trial'

  return (
    <div className="menu-overlay finish-overlay" role="dialog" aria-modal="true" aria-labelledby="finish-title">
      <section className="menu-content finish-content">
        <div className="menu-heading">
          <span className="eyebrow">{isTimeTrial ? 'Session complete' : 'Chequered flag'}</span>
          <h1 className="menu-title" id="finish-title">RACE<br />COMPLETE</h1>
        </div>

        <div className="finish-result">
          <span>{isTimeTrial ? maxLaps + (maxLaps === 1 ? ' LAP' : ' LAPS') : 'FINAL POSITION'}</span>
          <strong>{isTimeTrial ? formatTime(totalTime) : ordinal(position)}</strong>
        </div>

        <dl className="result-times">
          <div><dt>Total time</dt><dd>{formatTime(totalTime)}</dd></div>
          <div><dt>Best lap</dt><dd>{bestLapTime > 0 ? formatTime(bestLapTime) : '--:--:---'}</dd></div>
          <div><dt>Final lap</dt><dd>{lastLapTime > 0 ? formatTime(lastLapTime) : '--:--:---'}</dd></div>
        </dl>

        <div className="menu-actions finish-actions">
          <button className="btn btn-primary interactive" onClick={restartRace}>Race Again</button>
          <button className="btn interactive" onClick={returnToMenu}>Continue</button>
        </div>
      </section>
    </div>
  )
}
