import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion } from 'three'
import { racerTelemetry } from '../utils/racerTelemetry'
import { useGameStore } from '../store/gameStore'
import { ghostInterval, validGhostSamples } from '../utils/ghostLap'
import FormulaCar from './FormulaCar'

export default function GhostCar() {
  const root = useRef()
  const ghostEnabled = useGameStore(state => state.ghostEnabled)
  const telemetry = useRef({ visible: false, x: 0, y: 0, z: 0, time: 0 })
  useEffect(() => () => { racerTelemetry.ghost = null }, [])
  const leftRotation = useMemo(() => new Quaternion(), [])
  const rightRotation = useMemo(() => new Quaternion(), [])
  const trackId = useGameStore(state => state.selectedTrackId)
  const record = useGameStore(state => state.lapRecords[trackId])
  const best = useGameStore(state => state.personalBests[trackId])
  const samples = useMemo(() => record?.time === best && validGhostSamples(record?.samples, record?.time)
    ? record.samples : null, [record, best])

  useFrame(() => {
    if (!root.current) { racerTelemetry.ghost = null; return }
    const state = useGameStore.getState()
    const interval = ghostInterval(samples, state.currentTime)
    root.current.visible = Boolean(interval && state.ghostEnabled && state.gameMode === 'time_trial'
      && (state.gameState === 'playing' || state.gameState === 'paused'))
    telemetry.current.visible = root.current.visible
    racerTelemetry.ghost = telemetry.current
    if (!root.current.visible) return
    const { left, right, alpha } = interval
    root.current.position.set(
      left[1] + (right[1] - left[1]) * alpha,
      left[2] + (right[2] - left[2]) * alpha,
      left[3] + (right[3] - left[3]) * alpha,
    )
    telemetry.current.x = root.current.position.x
    telemetry.current.y = root.current.position.y
    telemetry.current.z = root.current.position.z
    telemetry.current.time = state.currentTime
    leftRotation.set(left[4], left[5], left[6], left[7])
    rightRotation.set(right[4], right[5], right[6], right[7])
    root.current.quaternion.copy(leftRotation).slerp(rightRotation, alpha)
  })

  if (!samples || !ghostEnabled) return null
  return <group ref={root} name="personal-best-ghost" visible={false}>
    <FormulaCar color="#77e6ff" accent="#bff6ff" detail="low" ghost />
  </group>
}
