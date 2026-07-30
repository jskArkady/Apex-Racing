import { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { RACE_LAPS } from '../utils/raceConfig'
import { START_FINISH_PROGRESS, TRACK_PRESETS } from '../utils/trackData'
import { formatTime } from '../utils/formatTime'
import { getTrackPreviewData } from '../utils/trackPreviewData'
import { getMenuHero } from '../assets/menuHeroes'

const PREVIEW_WIDTH = 120
const PREVIEW_HEIGHT = 72
const PREVIEW_PADDING = 7
const LANDMARK_PILL_HALF_WIDTH = 5.6
const LANDMARK_PILL_HALF_HEIGHT = 4.2
const LANDMARK_PILL_GUTTER = 1.5
const LANDMARK_PILL_OFFSETS = [7, 13, 19]

export const TRACK_PREVIEW_PILL_SIZE = Object.freeze({
  width: LANDMARK_PILL_HALF_WIDTH * 2,
  height: LANDMARK_PILL_HALF_HEIGHT * 2,
  gutter: LANDMARK_PILL_GUTTER,
})

const formatPreviewCoordinate = value => Number(value).toFixed(2)

function getPreviewTangent(track, progress) {
  const tangent = track.curve.getTangentAt(progress)
  const length = Math.hypot(tangent.x, tangent.z) || 1
  return { x: tangent.x / length, y: tangent.z / length }
}

function createPreviewBounds(points) {
  const xValues = points.map(point => point.x)
  const zValues = points.map(point => point.z)
  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const minZ = Math.min(...zValues)
  const maxZ = Math.max(...zValues)
  const width = Math.max(1, maxX - minX)
  const depth = Math.max(1, maxZ - minZ)

  return { minX, maxX, minZ, maxZ, width, depth }
}

export function projectPreviewPoint(point, bounds) {
  const availableWidth = PREVIEW_WIDTH - PREVIEW_PADDING * 2
  const availableHeight = PREVIEW_HEIGHT - PREVIEW_PADDING * 2
  const scale = Math.min(availableWidth / bounds.width, availableHeight / bounds.depth)
  const horizontalInset = (availableWidth - bounds.width * scale) / 2
  const verticalInset = (availableHeight - bounds.depth * scale) / 2

  return {
    x: PREVIEW_PADDING + horizontalInset + (point.x - bounds.minX) * scale,
    y: PREVIEW_PADDING + verticalInset + (point.z - bounds.minZ) * scale,
  }
}

function getMarkerPlacement(point, tangent, placedPills) {
  const normal = { x: -tangent.y, y: tangent.x }
  const candidates = LANDMARK_PILL_OFFSETS.flatMap(offset => (
    [1, -1].map(direction => ({
      x: Math.max(
        PREVIEW_PADDING + LANDMARK_PILL_HALF_WIDTH,
        Math.min(
          PREVIEW_WIDTH - PREVIEW_PADDING - LANDMARK_PILL_HALF_WIDTH,
          point.x + normal.x * offset * direction,
        ),
      ),
      y: Math.max(
        PREVIEW_PADDING + LANDMARK_PILL_HALF_HEIGHT,
        Math.min(
          PREVIEW_HEIGHT - PREVIEW_PADDING - LANDMARK_PILL_HALF_HEIGHT,
          point.y + normal.y * offset * direction,
        ),
      ),
      offset,
    }))
  ))
  const edgeScore = candidate => Math.min(
    candidate.x - PREVIEW_PADDING - LANDMARK_PILL_HALF_WIDTH,
    PREVIEW_WIDTH - PREVIEW_PADDING - LANDMARK_PILL_HALF_WIDTH - candidate.x,
    candidate.y - PREVIEW_PADDING - LANDMARK_PILL_HALF_HEIGHT,
    PREVIEW_HEIGHT - PREVIEW_PADDING - LANDMARK_PILL_HALF_HEIGHT - candidate.y,
  )
  const overlapsPlacedPill = candidate => placedPills.some(placed => (
    Math.abs(candidate.x - placed.x) < TRACK_PREVIEW_PILL_SIZE.width + LANDMARK_PILL_GUTTER
      && Math.abs(candidate.y - placed.y) < TRACK_PREVIEW_PILL_SIZE.height + LANDMARK_PILL_GUTTER
  ))
  const availableCandidates = candidates.filter(candidate => !overlapsPlacedPill(candidate))
  const candidatePool = availableCandidates.length > 0 ? availableCandidates : candidates
  const selected = candidatePool.reduce((best, candidate) => {
    const score = edgeScore(candidate) - candidate.offset * 0.06
    const bestScore = edgeScore(best) - best.offset * 0.06
    return score > bestScore ? candidate : best
  })

  return {
    pill: {
      x: selected.x,
      y: selected.y,
    },
    tick: {
      x1: point.x - normal.x * 2.5,
      y1: point.y - normal.y * 2.5,
      x2: point.x + normal.x * 2.5,
      y2: point.y + normal.y * 2.5,
    },
  }
}

export function createTrackPreview(track) {
  const previewData = getTrackPreviewData(track.id)
  const trackPoints = track.curve.getSpacedPoints(160).map(point => ({ x: point.x, z: point.z }))
  // Only the centreline establishes framing. Menu labels never shrink or shift
  // the circuit silhouette, regardless of where their callouts are placed.
  const bounds = createPreviewBounds(trackPoints)
  const path = trackPoints
    .map(point => projectPreviewPoint(point, bounds))
    .map(point => `${formatPreviewCoordinate(point.x)},${formatPreviewCoordinate(point.y)}`)
    .join(' ')
  const start = projectPreviewPoint(
    track.curve.getPointAt(START_FINISH_PROGRESS),
    bounds
  )
  const startTangent = getPreviewTangent(track, START_FINISH_PROGRESS)
  const startNormal = { x: -startTangent.y, y: startTangent.x }
  // Keep the direction glyph visually separate from the S/F label while
  // leaving enough room before the first numbered reference at ~0.16.
  const directionProgress = (START_FINISH_PROGRESS + 0.09) % 1
  const direction = projectPreviewPoint(track.curve.getPointAt(directionProgress), bounds)
  const directionTangent = getPreviewTangent(track, directionProgress)

  const placedPills = []
  const landmarks = previewData.landmarks.map(landmark => {
    const point = projectPreviewPoint(track.curve.getPointAt(landmark.progress), bounds)
    const tangent = getPreviewTangent(track, landmark.progress)
    const placement = getMarkerPlacement(point, tangent, placedPills)
    placedPills.push(placement.pill)
    return { ...landmark, point, ...placement }
  })

  return {
    path,
    code: previewData.code,
    start: {
      ...start,
      x1: start.x - startNormal.x * 4,
      y1: start.y - startNormal.y * 4,
      x2: start.x + startNormal.x * 4,
      y2: start.y + startNormal.y * 4,
      tangent: startTangent,
    },
    direction: {
      ...direction,
      angle: Math.atan2(directionTangent.y, directionTangent.x) * 180 / Math.PI,
    },
    landmarks,
  }
}

function TrackPreviewLandmark({ landmark }) {
  return (
    <g className="track-preview-landmark" aria-hidden="true">
      <line
        className="track-preview-landmark-tick"
        x1={formatPreviewCoordinate(landmark.tick.x1)}
        y1={formatPreviewCoordinate(landmark.tick.y1)}
        x2={formatPreviewCoordinate(landmark.tick.x2)}
        y2={formatPreviewCoordinate(landmark.tick.y2)}
      />
      <line
        className="track-preview-landmark-leader"
        x1={formatPreviewCoordinate(landmark.point.x)}
        y1={formatPreviewCoordinate(landmark.point.y)}
        x2={formatPreviewCoordinate(landmark.pill.x)}
        y2={formatPreviewCoordinate(landmark.pill.y)}
      />
      <g transform={`translate(${formatPreviewCoordinate(landmark.pill.x)} ${formatPreviewCoordinate(landmark.pill.y)})`}>
        <rect x={-LANDMARK_PILL_HALF_WIDTH} y={-LANDMARK_PILL_HALF_HEIGHT} width={LANDMARK_PILL_HALF_WIDTH * 2} height={LANDMARK_PILL_HALF_HEIGHT * 2} rx="1.2" />
        <text x="0" y="0.25">{landmark.shortLabel}</text>
      </g>
    </g>
  )
}

function CircuitPreview({ track }) {
  const preview = useMemo(() => createTrackPreview(track), [track])
  const titleId = `track-preview-${track.id}-title`
  const descriptionId = `track-preview-${track.id}-description`

  return (
    <figure className="track-preview">
      <div className="track-preview-map-frame">
        <svg
          viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
          focusable="false"
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
        >
          <title id={titleId}>{track.name} circuit preview</title>
          <desc id={descriptionId}>Circuit outline with start and finish, race direction, and three numbered landmarks.</desc>
          <polyline className="track-preview-shadow" points={preview.path} />
          <polyline className="track-preview-line" points={preview.path} />
          {preview.landmarks.map(landmark => (
            <TrackPreviewLandmark key={landmark.shortLabel} landmark={landmark} />
          ))}
          <g className="track-preview-start" aria-hidden="true">
            <line
              x1={formatPreviewCoordinate(preview.start.x1)}
              y1={formatPreviewCoordinate(preview.start.y1)}
              x2={formatPreviewCoordinate(preview.start.x2)}
              y2={formatPreviewCoordinate(preview.start.y2)}
            />
            <line
              x1={formatPreviewCoordinate(preview.start.x1 + preview.start.tangent.x * 1.4)}
              y1={formatPreviewCoordinate(preview.start.y1 + preview.start.tangent.y * 1.4)}
              x2={formatPreviewCoordinate(preview.start.x2 + preview.start.tangent.x * 1.4)}
              y2={formatPreviewCoordinate(preview.start.y2 + preview.start.tangent.y * 1.4)}
            />
            <text x={formatPreviewCoordinate(preview.start.x + preview.start.tangent.x * 4)} y={formatPreviewCoordinate(preview.start.y + preview.start.tangent.y * 4)}>S/F</text>
          </g>
          <path
            className="track-preview-direction"
            aria-hidden="true"
            d="M -2.7 -1.8 L 2.4 0 L -2.7 1.8 Z"
            transform={`translate(${formatPreviewCoordinate(preview.direction.x)} ${formatPreviewCoordinate(preview.direction.y)}) rotate(${preview.direction.angle.toFixed(2)})`}
          />
        </svg>
      </div>
      <figcaption><strong>{preview.code}</strong> · Circuit map · S/F and race direction</figcaption>
      <ol className="track-preview-landmarks" aria-label="Circuit landmarks">
        {preview.landmarks.map(landmark => (
          <li key={landmark.shortLabel}>
            <span>{landmark.shortLabel}</span>
            {landmark.label}
          </li>
        ))}
      </ol>
    </figure>
  )
}

export default function MainMenu() {
  const startGame = useGameStore(state => state.startGame)
  const selectedTrackId = useGameStore(state => state.selectedTrackId)
  const selectTrack = useGameStore(state => state.selectTrack)
  const settings = useGameStore(state => state.settings)
  const personalBests = useGameStore(state => state.personalBests)
  const updateSettings = useGameStore(state => state.updateSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [failedHeroId, setFailedHeroId] = useState(null)
  const selectedTrack = TRACK_PRESETS.find(track => track.id === selectedTrackId) ?? TRACK_PRESETS[0]
  const selectedPersonalBest = personalBests?.[selectedTrack.id] ?? 0
  const menuHero = failedHeroId === selectedTrack.id ? null : getMenuHero(selectedTrack.id)
  const handleTrackOptionKeyDown = (event, currentIndex) => {
    let nextIndex = null
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % TRACK_PRESETS.length
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + TRACK_PRESETS.length) % TRACK_PRESETS.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = TRACK_PRESETS.length - 1
    }

    if (nextIndex === null) return
    event.preventDefault()
    selectTrack(TRACK_PRESETS[nextIndex].id)
    event.currentTarget.parentElement
      ?.querySelectorAll('[role="radio"]')
      [nextIndex]?.focus()
  }

  return (
    <main
      className={`menu-overlay main-menu${menuHero ? ' main-menu-with-hero' : ''}`}
      data-menu-hero={menuHero ? selectedTrack.id : undefined}
    >
      {menuHero && (
        <picture className="menu-hero" aria-hidden="true">
          <source
            media="(orientation: portrait)"
            type="image/webp"
            srcSet={menuHero.portrait.srcSet}
            sizes="100vw"
          />
          <img
            className="menu-hero-image"
            src={menuHero.wide.src}
            srcSet={menuHero.wide.srcSet}
            sizes="100vw"
            width={menuHero.wide.width}
            height={menuHero.wide.height}
            alt=""
            aria-hidden="true"
            decoding="async"
            fetchPriority="high"
            loading="eager"
            draggable={false}
            onError={() => setFailedHeroId(selectedTrack.id)}
          />
        </picture>
      )}
      <section className="menu-content" aria-labelledby="game-title">
        <div className="menu-heading">
          <span className="eyebrow">{selectedTrack.shortName} · {RACE_LAPS} lap</span>
          <h1 className="menu-title" id="game-title">APEX RACING</h1>
          <p>{selectedTrack.description}</p>
          <p className="menu-personal-best">
            <span>Personal best</span>
            <strong>{selectedPersonalBest > 0 ? formatTime(selectedPersonalBest) : 'NO TIME SET'}</strong>
          </p>
        </div>

        <div className="menu-actions" aria-label="Choose race mode">
          <button aria-label="Start Race" aria-describedby="start-race-description" className="btn btn-primary interactive" onClick={() => startGame('single')}>
            <span>Start Race</span><small id="start-race-description">4-car grid · {RACE_LAPS} lap</small>
          </button>
          <button aria-label="Time Trial" aria-describedby="time-trial-description" className="btn interactive" onClick={() => startGame('time_trial')}>
            <span>Time Trial</span><small id="time-trial-description">Race the clock</small>
          </button>
          <button
            className="btn btn-quiet interactive"
            aria-expanded={settingsOpen}
            aria-controls="race-settings"
            onClick={() => setSettingsOpen(open => !open)}
          >
            Settings
          </button>
        </div>

        {settingsOpen ? (
          <aside className="settings-panel" id="race-settings" aria-labelledby="settings-title">
            <h2 id="settings-title">Settings</h2>
            <label className="range-setting">
              <span>Audio <output>{settings.audio}%</output></span>
              <input
                type="range"
                aria-label="Audio volume"
                min="0"
                max="100"
                value={settings.audio}
                onChange={event => updateSettings({ audio: Number(event.target.value) })}
              />
            </label>
          </aside>
        ) : (
          <aside className="controls-guide track-picker-panel" aria-labelledby="track-picker-title">
            <h2 id="track-picker-title">Circuit</h2>
            <CircuitPreview track={selectedTrack} />
            <div className="track-picker" role="radiogroup" aria-label="Choose circuit">
              {TRACK_PRESETS.map((track, index) => (
                <button
                  key={track.id}
                  type="button"
                  className={'track-option interactive ' + (track.id === selectedTrackId ? 'track-option-active' : '')}
                  role="radio"
                  aria-checked={track.id === selectedTrackId}
                  aria-label={`Select ${track.name}`}
                  aria-describedby={`track-description-${track.id}`}
                  tabIndex={track.id === selectedTrackId ? 0 : -1}
                  onClick={() => selectTrack(track.id)}
                  onKeyDown={event => handleTrackOptionKeyDown(event, index)}
                >
                  <span className="track-option-title">
                    <span className="track-option-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="track-option-name">{track.name}</span>
                    <span className="track-option-code">{getTrackPreviewData(track.id).code}</span>
                  </span>
                  <small id={`track-description-${track.id}`}>
                    {track.id === selectedTrackId ? <strong className="track-option-selected">Selected · </strong> : null}
                    {track.inspiration}
                  </small>
                </button>
              ))}
            </div>
            <p className="track-fidelity">{selectedTrack.fidelityMarkers.join(' · ')}</p>
          </aside>
        )}
      </section>
    </main>
  )
}
