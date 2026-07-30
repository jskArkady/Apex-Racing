import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { formatTime } from '../utils/formatTime'
import { START_FINISH_PROGRESS, getTrackPreset, trackBounds } from '../utils/trackData'
import MobileDrivingControls from './MobileDrivingControls'

const safeNumber = (value, fallback = 0) => Number.isFinite(value) ? value : fallback
const MINIMAP_PADDING = 7
const MINIMAP_SPAN = 100 - MINIMAP_PADDING * 2
const MINIMAP_TRACK_SAMPLES = 120

const clampPercent = value => Math.max(0, Math.min(100, value))
const formatMapCoordinate = value => clampPercent(value).toFixed(2)

export function getSpeedEffectIntensity(speed) {
  const progress = Math.min(1, Math.max(0, (safeNumber(speed) - 150) / 130))
  return progress * progress * (3 - 2 * progress)
}

export function projectWorldToMinimap(point, bounds = trackBounds) {
  const scale = MINIMAP_SPAN / Math.max(bounds.width, bounds.depth)
  const horizontalInset = (MINIMAP_SPAN - bounds.width * scale) / 2
  const verticalInset = (MINIMAP_SPAN - bounds.depth * scale) / 2
  const rawLeft = MINIMAP_PADDING
    + horizontalInset
    + (safeNumber(point.x) - bounds.minX) * scale
  const rawTop = MINIMAP_PADDING
    + verticalInset
    + (safeNumber(point.z) - bounds.minZ) * scale

  return {
    left: clampPercent(rawLeft),
    top: clampPercent(rawTop)
  }
}

function createMinimapTrackPoints(track) {
  return track.curve
    .getSpacedPoints(MINIMAP_TRACK_SAMPLES)
    .map(point => {
      const mapPoint = projectWorldToMinimap(point, track.bounds)
      return `${formatMapCoordinate(mapPoint.left)},${formatMapCoordinate(mapPoint.top)}`
    })
    .join(' ')
}

function createMinimapStartPoint(track) {
  return projectWorldToMinimap(track.curve.getPointAt(START_FINISH_PROGRESS), track.bounds)
}

const defaultMinimapTrack = getTrackPreset()
const defaultMinimapTrackPoints = createMinimapTrackPoints(defaultMinimapTrack)

export const minimapTrackPoints = defaultMinimapTrackPoints

export default function HUD() {
  const lap = useGameStore(state => state.lap)
  const maxLaps = useGameStore(state => state.maxLaps)
  const position = useGameStore(state => state.position)
  const totalRacers = useGameStore(state => state.totalRacers)
  const totalTime = useGameStore(state => state.totalTime)
  const bestLapTime = useGameStore(state => state.bestLapTime)
  const lastLapTime = useGameStore(state => state.lastLapTime)
  const countdown = useGameStore(state => state.countdown)
  const gameState = useGameStore(state => state.gameState)
  const isDrivingBackwards = useGameStore(state => state.isDrivingBackwards)
  const nextCheckpointIndex = useGameStore(state => state.nextCheckpointIndex)
  const totalCheckpoints = useGameStore(state => state.totalCheckpoints)
  const gameMode = useGameStore(state => state.gameMode)
  const selectedTrackId = useGameStore(state => state.selectedTrackId)
  const [liveReadout, setLiveReadout] = useState(() => {
    const state = useGameStore.getState()
    return {
      dots: [],
      speed: state.speed,
      gear: state.gear,
      rpm: state.rpm,
      currentTime: state.currentTime
    }
  })
  const [startCue, setStartCue] = useState('')
  const previousGameState = useRef(gameState)

  useEffect(() => {
    let cueTimer
    if (previousGameState.current === 'countdown' && gameState === 'playing') {
      setStartCue('GO')
      cueTimer = window.setTimeout(() => setStartCue(''), 900)
    }
    previousGameState.current = gameState
    return () => window.clearTimeout(cueTimer)
  }, [gameState])

  useEffect(() => {
    if (gameState !== 'playing') return undefined

    const interval = window.setInterval(() => {
      const state = useGameStore.getState()
      const dots = window.racerPositions
        ? Object.entries(window.racerPositions).map(([id, pos]) => ({
            id,
            x: pos.x,
            z: pos.z,
            color: pos.color
          }))
        : []
      setLiveReadout({
        dots,
        speed: state.speed,
        gear: state.gear,
        rpm: state.rpm,
        currentTime: state.currentTime
      })
    }, 1000 / 15)

    return () => window.clearInterval(interval)
  }, [gameState])

  const { dots, speed, gear, rpm, currentTime } = liveReadout

  const safeLap = Math.max(1, safeNumber(lap, 1))
  const safeMaxLaps = Math.max(1, safeNumber(maxLaps, 1))
  const safeCheckpoint = Math.max(0, safeNumber(nextCheckpointIndex))
  const safeTotalCheckpoints = Math.max(1, safeNumber(totalCheckpoints, 1))
  const raceProgress = Math.min(100,
    (((safeLap - 1) * safeTotalCheckpoints +
      (safeCheckpoint === 0 ? safeTotalCheckpoints - 1 : safeCheckpoint - 1)) /
      (safeMaxLaps * safeTotalCheckpoints)) * 100
  )
  const rpmPercent = Math.min(100, Math.max(0, (safeNumber(rpm) / 8000) * 100))
  // Ordinary race pace stays optically clean. Peripheral motion builds only
  // once the car is genuinely fast, preserving the racing line and scenery.
  const speedIntensity = getSpeedEffectIntensity(speed)
  const countdownCue = countdown > 0 ? countdown : startCue
  const selectedTrack = useMemo(() => getTrackPreset(selectedTrackId), [selectedTrackId])
  const minimapPath = useMemo(() => createMinimapTrackPoints(selectedTrack), [selectedTrack])
  const minimapStartPoint = useMemo(() => createMinimapStartPoint(selectedTrack), [selectedTrack])

  return (
    <div
      className="hud-container"
      aria-label="Race dashboard"
      style={{ '--speed-intensity': speedIntensity.toFixed(3) }}
    >
      <div
        className="hud-speed-effects"
        data-active={speedIntensity > 0 ? 'true' : 'false'}
        aria-hidden="true"
      />

      {countdownCue && (
        <div key={countdownCue} className={'countdown ' + (startCue === 'GO' ? 'countdown-go' : '')} role="status" aria-live="assertive">
          <span>{countdownCue}</span>
          <small>{startCue === 'GO' ? 'FULL THROTTLE' : 'HOLD'}</small>
        </div>
      )}

      {isDrivingBackwards && (
        <div className="wrong-way" role="alert">
          <strong>WRONG WAY</strong>
          <span>Turn around safely</span>
        </div>
      )}

      <header className="hud-top">
        <section className="hud-readout hud-race-position" aria-label="Race position">
          {gameMode === 'single' ? (
            <div>
              <span className="hud-label">Position</span>
              <strong>{safeNumber(position, 1)}<small> / {safeNumber(totalRacers, 1)}</small></strong>
            </div>
          ) : (
            <div>
              <span className="hud-label">Session</span>
              <strong className="hud-mode">TIME ATTACK</strong>
            </div>
          )}
          <div>
            <span className="hud-label">Lap</span>
            <strong>{Math.min(safeLap, safeMaxLaps)}<small> / {safeMaxLaps}</small></strong>
          </div>
          <div
            className="checkpoint-readout"
            aria-label={safeCheckpoint === 0
              ? 'Next checkpoint finish'
              : `Next checkpoint ${Math.min(safeCheckpoint, safeTotalCheckpoints - 1)} of ${safeTotalCheckpoints - 1}`}
          >
            <span className="hud-label">Next checkpoint</span>
            {safeCheckpoint === 0 ? (
              <strong className="hud-mode">FINISH</strong>
            ) : (
              <strong>
                <span className="checkpoint-prefix" aria-hidden="true">CP </span>
                {Math.min(safeCheckpoint, safeTotalCheckpoints - 1)}
                <small> / {safeTotalCheckpoints - 1}</small>
              </strong>
            )}
          </div>
        </section>

        <section className="hud-readout hud-timing" aria-label="Race timing">
          <div className="timing-current"><span>Current</span><strong>{formatTime(safeNumber(currentTime))}</strong></div>
          <div className="timing-total"><span>Total</span><strong>{formatTime(safeNumber(totalTime) + safeNumber(currentTime))}</strong></div>
          <div className="timing-best"><span>PB</span><strong>{bestLapTime > 0 ? formatTime(bestLapTime) : '--:--:---'}</strong></div>
          {lastLapTime > 0 && <div className="timing-last"><span>Last</span><strong>{formatTime(lastLapTime)}</strong></div>}
        </section>

        <div className="race-progress" aria-label={'Race progress ' + Math.round(raceProgress) + ' percent'}>
          <span style={{ width: raceProgress + '%' }} />
        </div>
      </header>

      <div className="hud-bottom-left minimap" aria-label="Track position map" role="img">
        <svg className="minimap-track" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <polyline className="minimap-track-shadow" points={minimapPath} />
          <polyline className="minimap-track-line" points={minimapPath} />
          <circle
            className="minimap-start-node"
            cx={formatMapCoordinate(minimapStartPoint.left)}
            cy={formatMapCoordinate(minimapStartPoint.top)}
            r="1.85"
          />
        </svg>
        {dots.map(dot => {
          const { left, top } = projectWorldToMinimap(dot, selectedTrack.bounds)
          return (
            <span
              key={dot.id}
              className={'minimap-dot ' + (dot.id === 'player' ? 'minimap-dot-player' : '')}
              style={{
                left: left + '%',
                top: top + '%',
                backgroundColor: dot.color,
                zIndex: dot.id === 'player' ? 10 : 1
              }}
            />
          )
        })}
      </div>

      <section className="hud-bottom telemetry" aria-label="Vehicle telemetry">
        <div className="speed-display">
          <strong>{Math.max(0, Math.round(safeNumber(speed)))}</strong>
          <span>KM/H</span>
        </div>
        <div className="gear-display">GEAR {gear ?? ''}</div>
        <div className="rpm-bar-container" aria-label={'Engine speed ' + Math.round(rpmPercent) + ' percent'}>
          <div className="rpm-bar" style={{ width: rpmPercent + '%' }} />
        </div>
      </section>

      {(gameState === 'playing' || gameState === 'countdown') && <MobileDrivingControls />}
    </div>
  )
}
