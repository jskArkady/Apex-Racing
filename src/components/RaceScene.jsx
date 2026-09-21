import { useEffect } from 'react'
import { Physics } from '@react-three/rapier'
import Car from './Car'
import GhostCar from './GhostCar'
import Track from './Track'
import Opponents from './Opponents'
import { useGameStore } from '../store/gameStore'
import { VEHICLE_DYNAMICS } from '../utils/vehicleDynamics'

function RaceReady({ onReady }) {
  // Mounted inside Physics so both the scene chunk and Rapier are ready before
  // the countdown starts. Download time must never consume the starting grid.
  useEffect(() => {
    onReady(true)
    return () => onReady(false)
  }, [onReady])

  return null
}

export default function RaceScene({ track, captureRequest, onReady }) {
  const gameState = useGameStore(state => state.gameState)
  const gameMode = useGameStore(state => state.gameMode)

  return (
    <Physics
      paused={gameState === 'paused' || gameState === 'finished'}
      gravity={[0, -9.81, 0]}
      timeStep={VEHICLE_DYNAMICS.physicsStep}
    >
      <Track track={track} />
      <Car track={track} captureRequest={captureRequest} />
      {gameMode === 'time_trial' && <GhostCar />}
      {gameMode === 'single' && <Opponents track={track} />}
      <RaceReady onReady={onReady} />
    </Physics>
  )
}
