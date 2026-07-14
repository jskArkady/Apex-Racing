import { useGameStore } from '../store/gameStore'
import { formatTime } from '../utils/formatTime'

export default function PauseMenu() {
  const {
    resumeGame, restartRace, returnToMenu, lap, maxLaps,
    currentTime, totalTime, position, totalRacers, gameMode
  } = useGameStore()

  return (
    <div className="menu-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <section className="menu-content pause-content">
        <div className="menu-heading">
          <span className="eyebrow">Race suspended</span>
          <h1 className="menu-title" id="pause-title">PAUSED</h1>
        </div>

        <dl className="pause-summary">
          <div><dt>Lap</dt><dd>{Math.min(lap, maxLaps)} / {maxLaps}</dd></div>
          {gameMode === 'single' && <div><dt>Position</dt><dd>{position} / {totalRacers}</dd></div>}
          <div><dt>Elapsed</dt><dd>{formatTime(totalTime + currentTime)}</dd></div>
        </dl>

        <div className="menu-actions">
          <button className="btn btn-primary interactive" onClick={resumeGame}>Resume</button>
          <button className="btn interactive" onClick={restartRace}>Restart Race</button>
          <button className="btn btn-quiet interactive" onClick={returnToMenu}>Quit to Menu</button>
        </div>

        <p className="keyboard-note"><kbd>Esc</kbd> also resumes the race</p>
      </section>
    </div>
  )
}
