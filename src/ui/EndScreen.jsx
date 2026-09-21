import { championshipStandings, RACER_NAMES } from '../utils/championship'
import { sortRacersWithCheckpoints, getRacerRank } from '../utils/raceLogic'
import { useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { formatTime } from '../utils/formatTime'
import { useDialogFocus } from './useDialogFocus'

const ordinal = (value) => {
  const number = Number.isFinite(value) ? value : 1
  const tens = number % 100
  if (tens >= 11 && tens <= 13) return number + 'TH'
  return number + ({ 1: 'ST', 2: 'ND', 3: 'RD' }[number % 10] ?? 'TH')
}

export default function EndScreen() {
  const {
    totalTime, bestLapTime, lastLapTime, position, maxLaps,
    racers, championship, nextChampionshipRound, lastLapSplits, gameMode, restartRace, returnToMenu
  } = useGameStore()
  const cupComplete = championship && championship.round === championship.trackIds.length - 1
  const classification = sortRacersWithCheckpoints(racers)
  const standings = championshipStandings(championship)
  const isTimeTrial = gameMode === 'time_trial'
  const raceAgainRef = useRef(null)
  const dialogRef = useDialogFocus(raceAgainRef)

  return (
    <div
      ref={dialogRef}
      className="menu-overlay finish-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-title"
      tabIndex={-1}
    >
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
          <div><dt>Personal best</dt><dd>{bestLapTime > 0 ? formatTime(bestLapTime) : '--:--:---'}</dd></div>
          <div><dt>Final lap</dt><dd>{lastLapTime > 0 ? formatTime(lastLapTime) : '--:--:---'}</dd></div>
          {lastLapSplits?.map((time, index) => (
            <div key={index}><dt>Sector {index + 1}</dt><dd>{formatTime(time - (lastLapSplits[index - 1] ?? 0))}</dd></div>
          ))}
        </dl>

        {!isTimeTrial && (
          <ol className="race-classification" aria-label="Race classification">
            {classification.map(racer => <li key={racer.id}><span>{getRacerRank(classification, racer.id)}. {RACER_NAMES[racer.id]}</span><strong>{racer.finished ? formatTime(racer.totalTime) : 'Classified'}</strong></li>)}
          </ol>
        )}
        {championship && (
          <section className="championship-results" aria-label="Championship standings">
            <h2>{cupComplete ? 'Championship complete' : `Round ${championship.round + 1} / ${championship.trackIds.length}`}</h2>
            {cupComplete && <p>{standings.filter(racer => racer.position === 1).map(racer => RACER_NAMES[racer.id]).join(' & ')} · Champion</p>}
            <ol>{standings.map(racer => <li key={racer.id}><span>{racer.position}. {RACER_NAMES[racer.id]}</span><strong>{racer.points} pts</strong></li>)}</ol>
            <small>Race ends when you finish. Unfinished cars are classified by checkpoint progress. Equal points share a place.</small>
          </section>
        )}
        <div className="menu-actions finish-actions">
          {championship && !cupComplete && <button ref={raceAgainRef} className="btn btn-primary interactive" onClick={nextChampionshipRound}>Next Round</button>}
          <button ref={championship && !cupComplete ? undefined : raceAgainRef} className={championship && !cupComplete ? 'btn interactive' : 'btn btn-primary interactive'} onClick={restartRace}>Race Again</button>
          <button className="btn interactive" onClick={returnToMenu}>Continue</button>
        </div>
      </section>
    </div>
  )
}
