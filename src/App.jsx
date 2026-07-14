import React, { useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { KeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from './store/gameStore'
import Car from './components/Car'
import Track from './components/Track'
import Opponents from './components/Opponents'
import RaceLighting from './components/RaceLighting'
import MainMenu from './ui/MainMenu'
import HUD from './ui/HUD'
import PauseMenu from './ui/PauseMenu'
import EndScreen from './ui/EndScreen'
import { audioEngine } from './utils/AudioEngine'
import { VEHICLE_DYNAMICS } from './utils/vehicleDynamics'
import { getTrackPreset } from './utils/trackData'
import { parseVisualCaptureRequest } from './utils/visualCapture'

// We need a GameLoop component that handles elapsed time ticks when playing and countdown decrements
function GameLoop() {
  const gameState = useGameStore(state => state.gameState)
  const decrementCountdown = useGameStore(state => state.decrementCountdown)
  
  useEffect(() => {
    if (gameState !== 'countdown') return
    const interval = setInterval(() => {
      decrementCountdown()
    }, 1000)
    return () => clearInterval(interval)
  }, [gameState, decrementCountdown])
  
  return null
}

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'brake', keys: ['Space'] },
  { name: 'reset', keys: ['KeyR'] },
  { name: 'pause', keys: ['Escape'] },
]

const DEFAULT_TRACK_ENVIRONMENT = Object.freeze({
  skyColor: '#04070d',
  fogColor: '#080d15',
  fogNear: 240,
  fogFar: 880,
  stars: true,
  ambientColor: '#8fa8d2',
  ambientIntensity: 0.48,
  hemisphereSkyColor: '#a8c3ee',
  hemisphereGroundColor: '#252018',
  hemisphereIntensity: 0.74,
  sunColor: '#dce8ff',
  sunIntensity: 2.65,
  sunPosition: Object.freeze([-80, 120, -60]),
})

function NightStars() {
  const positions = useMemo(() => {
    const count = 720
    const points = new Float32Array(count * 3)
    let seed = 0x6d2b79f5
    for (let index = 0; index < count; index += 1) {
      seed = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed)
      const first = ((seed ^ (seed >>> 14)) >>> 0) / 4294967296
      seed = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed)
      const second = ((seed ^ (seed >>> 14)) >>> 0) / 4294967296
      const azimuth = first * Math.PI * 2
      const elevation = 0.12 + second * 1.25
      const radius = 620 + (index % 7) * 9
      points[index * 3] = Math.cos(azimuth) * Math.cos(elevation) * radius
      points[index * 3 + 1] = Math.sin(elevation) * radius
      points[index * 3 + 2] = Math.sin(azimuth) * Math.cos(elevation) * radius
    }
    return points
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#d7e3ff" size={1.35} sizeAttenuation transparent opacity={0.74} />
    </points>
  )
}

function App() {
  const visualCaptureRequest = useMemo(() => parseVisualCaptureRequest(
    typeof window === 'undefined' ? '' : window.location.search,
    import.meta.env.DEV,
  ), [])
  const gameState = useGameStore(state => state.gameState)
  const gameMode = useGameStore(state => state.gameMode)
  const selectedTrackId = useGameStore(state => state.selectedTrackId)
  const pauseGame = useGameStore(state => state.pauseGame)
  const graphicsQuality = useGameStore(state => state.settings.graphics)
  const audioVolume = useGameStore(state => state.settings.audio)
  const selectedTrack = useMemo(() => getTrackPreset(selectedTrackId), [selectedTrackId])
  const environment = useMemo(() => ({
    ...DEFAULT_TRACK_ENVIRONMENT,
    ...selectedTrack.environment,
  }), [selectedTrack])
  const shadowsEnabled = graphicsQuality !== 'low'
  const renderDpr = graphicsQuality === 'low'
    ? 1
    : graphicsQuality === 'medium' ? [1, 1.15] : [1, 1.25]

  useEffect(() => {
    if (!visualCaptureRequest) return undefined

    window.__racingVisualCapture = {
      ...visualCaptureRequest,
      status: 'booting',
    }
    document.documentElement.dataset.visualCapture = (
      `${visualCaptureRequest.trackId}:${visualCaptureRequest.view}`
    )

    const state = useGameStore.getState()
    if (state.gameState === 'menu') {
      state.selectTrack(visualCaptureRequest.trackId)
      useGameStore.getState().startGame(visualCaptureRequest.gameMode ?? 'time_trial')
      useGameStore.setState({ gameState: 'playing', countdown: 0 })
    }

    return () => {
      delete window.__racingVisualCapture
      delete document.documentElement.dataset.visualCapture
    }
  }, [visualCaptureRequest])

  useEffect(() => {
    if (!visualCaptureRequest) return

    window.__racingVisualCapture = {
      ...visualCaptureRequest,
      status: selectedTrackId === visualCaptureRequest.trackId
        ? gameState
        : 'switching-track',
    }
  }, [gameState, selectedTrackId, visualCaptureRequest])

  useEffect(() => {
    audioEngine.setVolume(audioVolume)
  }, [audioVolume])

  // Racer positions are a lightweight render-loop bridge used by the minimap
  // and AI avoidance. Clear them at every new session so switching from a
  // four-car race to Time Trial cannot leave ghost opponents on the HUD.
  useEffect(() => {
    if (gameState === 'countdown' || gameState === 'menu') {
      window.racerPositions = {}
      window.racerProgress = {}
    }
  }, [gameState, gameMode])

  // Window blur listener to pause the game automatically
  useEffect(() => {
    const handleBlur = () => {
      if (gameState === 'playing' || gameState === 'countdown') {
        pauseGame()
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        const state = useGameStore.getState().gameState
        if (state === 'playing' || state === 'countdown') {
          useGameStore.getState().pauseGame()
        } else if (state === 'paused') {
          useGameStore.getState().resumeGame()
        }
      }
    }
    window.addEventListener('blur', handleBlur)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [gameState, pauseGame])

  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas
        shadows={shadowsEnabled}
        dpr={renderDpr}
        camera={{ position: [0, 5, 12], fov: 58, near: 0.1, far: 1600 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08
        }}
      >
        <color attach="background" args={[environment.skyColor]} />
        <fog attach="fog" args={[environment.fogColor, environment.fogNear, environment.fogFar]} />
        {environment.stars && <NightStars />}
        <RaceLighting
          environment={environment}
          graphicsQuality={graphicsQuality}
          shadowsEnabled={shadowsEnabled}
          track={selectedTrack}
          gameMode={gameMode}
        />
        
        {/* Physics and Game Objects */}
        {(gameState === 'playing' || gameState === 'countdown' || gameState === 'paused' || gameState === 'finished') && (
          <Physics
            paused={gameState === 'paused' || gameState === 'finished'}
            gravity={[0, -9.81, 0]}
            timeStep={VEHICLE_DYNAMICS.physicsStep}
          >
            <Track track={selectedTrack} />
            <Car
              track={selectedTrack}
              captureRequest={visualCaptureRequest}
            />
            {gameMode === 'single' && <Opponents track={selectedTrack} />}
          </Physics>
        )}
        
        <GameLoop />
      </Canvas>
      
      {/* 2D UI Overlay */}
      <div className="ui-layer">
        {gameState === 'menu' && <MainMenu />}
        {(gameState === 'playing' || gameState === 'countdown') && <HUD />}
        {gameState === 'paused' && <PauseMenu />}
        {gameState === 'finished' && <EndScreen />}
      </div>
    </KeyboardControls>
  )
}

export default App
