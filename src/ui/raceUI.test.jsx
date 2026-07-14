import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../store/gameStore'
import HUD, { getSpeedEffectIntensity, projectWorldToMinimap } from './HUD'
import PauseMenu from './PauseMenu'
import EndScreen from './EndScreen'
import MainMenu, {
  createTrackPreview,
  projectPreviewPoint,
  TRACK_PREVIEW_PILL_SIZE,
} from './MainMenu'
import { DEFAULT_TRACK_ID, TRACK_PRESETS } from '../utils/trackData'

const initialState = useGameStore.getState()

beforeEach(() => {
  act(() => useGameStore.setState(initialState, true))
})

describe('race session actions', () => {
  it('starts a time trial with only the player on the timing board', () => {
    act(() => useGameStore.getState().startGame('time_trial'))

    const state = useGameStore.getState()
    expect(state.gameState).toBe('countdown')
    expect(state.totalRacers).toBe(1)
    expect(state.racers.map(racer => racer.id)).toEqual(['player'])
  })

  it('preserves the selected circuit when a race starts and returns to menu', () => {
    act(() => useGameStore.getState().selectTrack('harbour_street'))
    act(() => useGameStore.getState().startGame('single'))

    expect(useGameStore.getState()).toMatchObject({
      gameState: 'countdown',
      selectedTrackId: 'harbour_street'
    })

    act(() => useGameStore.getState().returnToMenu())
    expect(useGameStore.getState()).toMatchObject({
      gameState: 'menu',
      selectedTrackId: 'harbour_street'
    })
  })

  it('restarts the active mode with a clean countdown and telemetry', () => {
    act(() => {
      useGameStore.setState({
        gameState: 'paused',
        gameMode: 'single',
        lap: 3,
        currentTime: 42,
        totalTime: 120,
        speed: 190,
        nextCheckpointIndex: 7,
        isDrivingBackwards: true
      })
      useGameStore.getState().restartRace()
    })

    const state = useGameStore.getState()
    expect(state).toMatchObject({
      gameState: 'countdown',
      countdown: 3,
      gameMode: 'single',
      lap: 1,
      currentTime: 0,
      totalTime: 0,
      speed: 0,
      nextCheckpointIndex: 1,
      isDrivingBackwards: false,
      totalRacers: 4
    })
    expect(state.racers).toHaveLength(4)
  })

  it('returns to menu with race progress cleared', () => {
    act(() => {
      useGameStore.setState({ gameState: 'finished', lap: 3, bestLapTime: 31 })
      useGameStore.getState().returnToMenu()
    })

    expect(useGameStore.getState()).toMatchObject({
      gameState: 'menu',
      lap: 1,
      bestLapTime: 0,
      countdown: 0
    })
  })
})

describe('race interface', () => {
  it('preserves X/Z proportions in minimap and menu projections', () => {
    const bounds = {
      minX: -100,
      maxX: 100,
      minZ: -50,
      maxZ: 50,
      width: 200,
      depth: 100,
    }
    const minimapMin = projectWorldToMinimap({ x: bounds.minX, z: bounds.minZ }, bounds)
    const minimapMax = projectWorldToMinimap({ x: bounds.maxX, z: bounds.maxZ }, bounds)
    const previewMin = projectPreviewPoint({ x: bounds.minX, z: bounds.minZ }, bounds)
    const previewMax = projectPreviewPoint({ x: bounds.maxX, z: bounds.maxZ }, bounds)

    expect((minimapMax.left - minimapMin.left) / (minimapMax.top - minimapMin.top)).toBeCloseTo(2)
    expect(minimapMin.top).toBeCloseTo(28.5)
    expect(minimapMax.top).toBeCloseTo(71.5)
    expect((previewMax.x - previewMin.x) / (previewMax.y - previewMin.y)).toBeCloseTo(2)
    expect(previewMin.x).toBeCloseTo(7)
    expect(previewMax.x).toBeCloseTo(113)
    expect(previewMin.y).toBeCloseTo(9.5)
    expect(previewMax.y).toBeCloseTo(62.5)
  })

  it('keeps every circuit and menu landmark inside the wide preview canvas', () => {
    for (const track of TRACK_PRESETS) {
      const preview = createTrackPreview(track)
      const pathCoordinates = preview.path
        .split(/[ ,]/)
        .map(Number)

      for (let index = 0; index < pathCoordinates.length; index += 2) {
        expect(pathCoordinates[index]).toBeGreaterThanOrEqual(7)
        expect(pathCoordinates[index]).toBeLessThanOrEqual(113)
        expect(pathCoordinates[index + 1]).toBeGreaterThanOrEqual(7)
        expect(pathCoordinates[index + 1]).toBeLessThanOrEqual(65)
      }

      for (const landmark of preview.landmarks) {
        expect(landmark.point.x).toBeGreaterThanOrEqual(7)
        expect(landmark.point.x).toBeLessThanOrEqual(113)
        expect(landmark.point.y).toBeGreaterThanOrEqual(7)
        expect(landmark.point.y).toBeLessThanOrEqual(65)
        expect(landmark.pill.x).toBeGreaterThanOrEqual(12.6)
        expect(landmark.pill.x).toBeLessThanOrEqual(107.4)
        expect(landmark.pill.y).toBeGreaterThanOrEqual(11.2)
        expect(landmark.pill.y).toBeLessThanOrEqual(60.8)
      }

      for (let firstIndex = 0; firstIndex < preview.landmarks.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < preview.landmarks.length; secondIndex += 1) {
          const first = preview.landmarks[firstIndex].pill
          const second = preview.landmarks[secondIndex].pill
          const separatedHorizontally = Math.abs(first.x - second.x)
            >= TRACK_PREVIEW_PILL_SIZE.width + TRACK_PREVIEW_PILL_SIZE.gutter
          const separatedVertically = Math.abs(first.y - second.y)
            >= TRACK_PREVIEW_PILL_SIZE.height + TRACK_PREVIEW_PILL_SIZE.gutter

          expect(separatedHorizontally || separatedVertically).toBe(true)
        }
      }
    }
  })

  it('provides inline settings backed by the store', () => {
    render(<MainMenu />)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))

    fireEvent.change(screen.getByRole('slider', { name: /Audio/i }), { target: { value: '65' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Graphics' }), { target: { value: 'low' } })

    expect(useGameStore.getState().settings).toMatchObject({
      audio: 65,
      graphics: 'low'
    })
  })

  it('offers three selectable circuits in the main menu', () => {
    render(<MainMenu />)

    for (const track of TRACK_PRESETS) {
      expect(screen.getByRole('radio', { name: `Select ${track.name}` })).toBeInTheDocument()
    }
    expect(screen.getByRole('radiogroup', { name: 'Choose circuit' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Select Apex Grand Prix' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/Selected ·/i)).toBeInTheDocument()
    const initialPreviewPath = screen
      .getByLabelText('Apex Grand Prix circuit preview')
      .querySelector('.track-preview-line')
      .getAttribute('points')

    fireEvent.click(screen.getByRole('radio', { name: 'Select Harbour Street' }))

    const harbourPreview = screen.getByLabelText('Harbour Street circuit preview')
    expect(harbourPreview.closest('.track-preview-map-frame')).toBeInTheDocument()
    expect(harbourPreview.querySelectorAll('.track-preview-cue')).toHaveLength(0)
    expect(harbourPreview.querySelectorAll('.track-preview-landmark')).toHaveLength(3)
    expect(harbourPreview.querySelector('.track-preview-start')).toBeInTheDocument()
    expect(harbourPreview.querySelector('.track-preview-start circle')).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Circuit landmarks' })).toHaveTextContent('Grand Hotel hairpin')
    expect(harbourPreview.closest('figure').querySelector('figcaption')).toHaveTextContent('HBR · Circuit map · S/F and race direction')

    fireEvent.click(screen.getByRole('radio', { name: 'Select Temple Speedway' }))

    const templePreview = screen.getByLabelText('Temple Speedway circuit preview')
    expect(useGameStore.getState().selectedTrackId).toBe('temple_speedway')
    expect(templePreview.querySelectorAll('.track-preview-cue')).toHaveLength(0)
    expect(templePreview.querySelectorAll('.track-preview-landmark')).toHaveLength(3)
    expect(templePreview.querySelector('.track-preview-line').getAttribute('points')).not.toBe(initialPreviewPath)
    expect(screen.getByRole('list', { name: 'Circuit landmarks' })).toHaveTextContent('Ascari complex')
    expect(templePreview.closest('figure').querySelector('figcaption')).toHaveTextContent('TMP · Circuit map · S/F and race direction')
    expect(screen.getByText(/long straights/i)).toBeInTheDocument()
  })

  it('moves the single circuit selection with radio-group arrow keys', () => {
    render(<MainMenu />)
    const apex = screen.getByRole('radio', { name: 'Select Apex Grand Prix' })

    apex.focus()
    fireEvent.keyDown(apex, { key: 'ArrowDown' })

    const harbour = screen.getByRole('radio', { name: 'Select Harbour Street' })
    expect(harbour).toHaveFocus()
    expect(harbour).toHaveAttribute('aria-checked', 'true')
    expect(apex).toHaveAttribute('aria-checked', 'false')
    expect(useGameStore.getState().selectedTrackId).toBe('harbour_street')

    fireEvent.keyDown(harbour, { key: 'End' })
    expect(screen.getByRole('radio', { name: 'Select Temple Speedway' })).toHaveFocus()
    expect(useGameStore.getState().selectedTrackId).toBe('temple_speedway')
  })

  it('announces GO when countdown transitions to racing', () => {
    act(() => useGameStore.setState({ gameState: 'countdown', countdown: 1 }))
    render(<HUD />)

    act(() => useGameStore.getState().decrementCountdown())

    expect(screen.getByRole('status')).toHaveTextContent('GO')
    expect(screen.getByRole('status')).toHaveTextContent('FULL THROTTLE')
  })

  it('shows checkpoint, timing, progress, and wrong-way status', () => {
    act(() => useGameStore.setState({
      gameState: 'playing',
      lap: 2,
      maxLaps: 3,
      nextCheckpointIndex: 5,
      totalCheckpoints: 10,
      currentTime: 12,
      totalTime: 40,
      bestLapTime: 38,
      isDrivingBackwards: true
    }))
    render(<HUD />)

    expect(screen.getByText('Next checkpoint')).toBeInTheDocument()
    expect(screen.getByLabelText('Next checkpoint 5 of 9')).toHaveTextContent('CP 5 / 9')
    expect(screen.getByLabelText('Race progress 47 percent')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('WRONG WAY')
    expect(screen.getByLabelText('Race timing')).toHaveTextContent('Current')
    expect(screen.getByLabelText('Race timing')).toHaveTextContent('Best')
    expect(screen.getByLabelText('Race timing').querySelector('.timing-current')).toBeInTheDocument()
    expect(screen.getByLabelText('Race timing').querySelector('.timing-best')).toBeInTheDocument()
  })

  it('keeps a semantic finish checkpoint and scales peripheral speed effects', () => {
    act(() => useGameStore.setState({
      gameState: 'playing',
      nextCheckpointIndex: 0,
      speed: 0,
    }))
    const stopped = render(<HUD />)

    const stoppedDashboard = screen.getByLabelText('Race dashboard')
    expect(screen.getByLabelText('Next checkpoint finish')).toHaveTextContent('FINISH')
    expect(stoppedDashboard.style.getPropertyValue('--speed-intensity')).toBe('0.000')
    expect(stoppedDashboard.querySelector('.hud-speed-effects')).toHaveAttribute('data-active', 'false')
    expect(stoppedDashboard.querySelector('.hud-speed-effects')).toHaveAttribute('aria-hidden', 'true')

    stopped.unmount()
    act(() => useGameStore.setState({ speed: 120 }))
    const racePace = render(<HUD />)
    expect(screen.getByLabelText('Race dashboard').querySelector('.hud-speed-effects'))
      .toHaveAttribute('data-active', 'false')

    racePace.unmount()
    act(() => useGameStore.setState({ speed: 240 }))
    render(<HUD />)

    const fastDashboard = screen.getByLabelText('Race dashboard')
    expect(Number(fastDashboard.style.getPropertyValue('--speed-intensity'))).toBeGreaterThan(0.7)
    expect(fastDashboard.querySelector('.hud-speed-effects')).toHaveAttribute('data-active', 'true')
    expect(getSpeedEffectIntensity(120)).toBe(0)
    expect(getSpeedEffectIntensity(170)).toBeGreaterThan(0)
    expect(getSpeedEffectIntensity(170)).toBeLessThan(0.1)
    expect(getSpeedEffectIntensity(300)).toBe(1)
  })

  it('draws the circuit silhouette in the minimap behind racer dots', () => {
    act(() => useGameStore.setState({ gameState: 'playing' }))
    render(<HUD />)

    const map = screen.getByLabelText('Track position map')
    const trackLine = map.querySelector('.minimap-track-line')
    const trackShadow = map.querySelector('.minimap-track-shadow')
    const startNode = map.querySelector('.minimap-start-node')

    expect(trackLine).toBeInTheDocument()
    expect(trackShadow).toBeInTheDocument()
    expect(startNode).toBeInTheDocument()

    const coordinates = trackLine
      .getAttribute('points')
      .trim()
      .split(/\s+/)
      .map(pair => pair.split(',').map(Number))
    const xValues = coordinates.map(([x]) => x)
    const yValues = coordinates.map(([, y]) => y)

    expect(coordinates.length).toBeGreaterThan(80)
    expect(Math.min(...xValues)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...xValues)).toBeLessThanOrEqual(100)
    expect(Math.max(...xValues) - Math.min(...xValues)).toBeGreaterThan(60)
    const projectedAspect = (Math.max(...xValues) - Math.min(...xValues))
      / (Math.max(...yValues) - Math.min(...yValues))
    const selectedTrack = TRACK_PRESETS.find(track => track.id === DEFAULT_TRACK_ID)
    expect(projectedAspect).toBeCloseTo(selectedTrack.bounds.width / selectedTrack.bounds.depth, 1)
    expect(Number(startNode.getAttribute('cx'))).toBeGreaterThanOrEqual(0)
    expect(Number(startNode.getAttribute('cy'))).toBeGreaterThanOrEqual(0)
  })

  it('updates the minimap circuit silhouette for the selected track', () => {
    act(() => useGameStore.setState({ gameState: 'playing', selectedTrackId: DEFAULT_TRACK_ID }))
    const { rerender } = render(<HUD />)

    const initialPath = screen
      .getByLabelText('Track position map')
      .querySelector('.minimap-track-line')
      .getAttribute('points')

    act(() => useGameStore.setState({ selectedTrackId: 'harbour_street' }))
    rerender(<HUD />)

    const harbourPath = screen
      .getByLabelText('Track position map')
      .querySelector('.minimap-track-line')
      .getAttribute('points')

    expect(harbourPath).not.toBe(initialPath)
  })

  it('offers resume, restart, and menu navigation while paused', () => {
    act(() => useGameStore.setState({ gameState: 'paused', countdown: 0 }))
    render(<PauseMenu />)

    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restart Race' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Quit to Menu' }))
    expect(useGameStore.getState().gameState).toBe('menu')
  })

  it('renders final placement and provides replay', () => {
    act(() => useGameStore.setState({
      gameState: 'finished',
      gameMode: 'single',
      position: 2,
      totalTime: 95,
      bestLapTime: 30,
      lastLapTime: 31
    }))
    render(<EndScreen />)

    expect(screen.getByText('2ND')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Race Again' }))
    expect(useGameStore.getState()).toMatchObject({ gameState: 'countdown', countdown: 3 })
  })
})
