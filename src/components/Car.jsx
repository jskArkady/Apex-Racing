import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { CuboidCollider, RigidBody, useBeforePhysicsStep } from '@react-three/rapier'
import { CoefficientCombineRule } from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore'
import { audioEngine } from '../utils/AudioEngine'
import { getTrackPreset } from '../utils/trackData'
import {
  calculateLiveRaceScore,
  getLiveRacerRank,
  hasCrossedFinishLine,
  isNearCheckpoint
} from '../utils/raceLogic'
import { getStartGridPose, getTrackPoseAtProgress } from '../utils/startGrid'
import FormulaCar from './FormulaCar'
import {
  createWrongWayState,
  isReverseCheckpointCrossing,
  PLAYER_TRANSLATION_REASON,
  resetWrongWayState,
  setPlayerTranslation,
  updateWrongWayState
} from '../utils/drivingGuards'
import {
  calculateVehicleActuation,
  getBrakingForce,
  getContinuousGripScale,
  getForwardEngineForce,
  VEHICLE_COLLIDER_HALF_EXTENTS,
  VEHICLE_DYNAMICS
} from '../utils/vehicleDynamics'
import {
  createProgressGuardState,
  didConfirmForwardSeamCrossing,
  getSignedWrappedProgressDelta,
  PROGRESS_CORRIDOR_LIMIT,
  projectPointOntoClosedCurve,
  updateProgressGuardState
} from '../utils/progressGuard'
import {
  createPhysicsObservationState,
  observePlayerPhysics,
  recordRuntimeDiagnostic,
  resetPhysicsObservation,
  RUNTIME_EVENT_ID,
  snapshotVector,
} from '../utils/runtimeDiagnostics'

const RECOVERY_DIRECTION_GRACE_SECONDS = 0.4
const LOCAL_PROJECTION_MAX_FRAME_DELTA = 0.25
const CHASE_CAMERA_LOOK_AHEAD = 10
const CHASE_CAMERA_BASE_FOV = 58
const CHASE_CAMERA_MAX_DESKTOP_FOV = 68
const CHASE_CAMERA_MAX_PORTRAIT_FOV = 63
const CHASE_CAMERA_FULL_EFFECT_SPEED = 220
const MAX_PORTRAIT_CAMERA_SCALE = 2.25
const WORLD_UP = new THREE.Vector3(0, 1, 0)
const tempPosition = new THREE.Vector3()
const tempVelocity = new THREE.Vector3()
const tempCarQuaternion = new THREE.Quaternion()
const tempForward = new THREE.Vector3()
const tempRight = new THREE.Vector3()
const tempForce = new THREE.Vector3()
const tempTorqueBuffers = [new THREE.Vector3(), new THREE.Vector3()]
const tempLateralCorrection = new THREE.Vector3()
const tempVisualPosition = new THREE.Vector3()
const tempVisualQuaternion = new THREE.Quaternion()
const tempVisualForward = new THREE.Vector3()
const tempCameraPosition = new THREE.Vector3()
const tempCameraOffset = new THREE.Vector3()
const tempCameraTarget = new THREE.Vector3()
const tempChaseCameraFraming = { distance: 0, height: 0 }
const tempChaseCameraLens = { fov: CHASE_CAMERA_BASE_FOV, lookAhead: CHASE_CAMERA_LOOK_AHEAD }
const tempFlatTrackTangent = new THREE.Vector3()
const tempTrackTangent = new THREE.Vector3()
const tempCheckpointPosition = new THREE.Vector3()
const tempCaptureProjectedTarget = new THREE.Vector3()
const tempCaptureProjectedCar = new THREE.Vector3()
const tempCaptureTrackPoint = new THREE.Vector3()
const DRIVING_CONTROL_NAMES = [
  'forward',
  'backward',
  'left',
  'right',
  'brake',
  'reset',
]

export function mergeDrivingControlSources(keyboard = {}, touch = {}, target = {}) {
  for (const name of DRIVING_CONTROL_NAMES) {
    target[name] = keyboard?.[name] === true || touch?.[name] === true
  }
  return target
}

const createTrackYawRotation = (direction) => {
  // Build a Y-axis-only rotation. setFromUnitVectors can choose an X axis for
  // the exact 180-degree case, which visually flips the chassis and leaves the
  // camera/forward-vector contract ambiguous after a respawn.
  const yaw = Math.atan2(-direction.x, -direction.z)
  return new THREE.Quaternion().setFromAxisAngle(WORLD_UP, yaw)
}

export function calculateChaseCameraFraming(speedKmH, aspect, target = {}) {
  const safeSpeed = Number.isFinite(speedKmH) ? Math.max(0, speedKmH) : 0
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const portraitScale = Math.min(
    MAX_PORTRAIT_CAMERA_SCALE,
    Math.max(1, 1 / safeAspect)
  )
  const baseDistance = 6 + (safeSpeed / 100) * 1.5
  const distance = baseDistance * portraitScale
  const baseHeight = 2.5 + (safeSpeed / 100) * 0.5

  target.distance = distance
  // Preserve the desktop sightline while widening portrait framing.
  target.height = baseHeight
    * ((distance + CHASE_CAMERA_LOOK_AHEAD) / (baseDistance + CHASE_CAMERA_LOOK_AHEAD))
  return target
}

export function calculateChaseCameraLens(
  speedKmH,
  aspect,
  reducedMotion = false,
  target = {},
) {
  const safeSpeed = Number.isFinite(speedKmH) ? Math.max(0, speedKmH) : 0
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const linearProgress = Math.min(1, safeSpeed / CHASE_CAMERA_FULL_EFFECT_SPEED)
  const progress = reducedMotion
    ? 0
    : linearProgress * linearProgress * (3 - 2 * linearProgress)
  const maximumFov = safeAspect < 0.8
    ? CHASE_CAMERA_MAX_PORTRAIT_FOV
    : CHASE_CAMERA_MAX_DESKTOP_FOV
  target.fov = CHASE_CAMERA_BASE_FOV
    + (maximumFov - CHASE_CAMERA_BASE_FOV) * progress
  target.lookAhead = CHASE_CAMERA_LOOK_AHEAD + 5 * progress
  return target
}

export default function Car({ track = getTrackPreset(), captureRequest = null }) {
  const bodyRef = useRef()
  const visualRef = useRef()
  const [, getKeys] = useKeyboardControls()
  const raceTrack = track ?? getTrackPreset()
  const trackCurve = raceTrack.curve
  const trackLength = raceTrack.length
  
  const gameState = useGameStore(state => state.gameState)
  const gameMode = useGameStore(state => state.gameMode)
  const raceSessionId = useGameStore(state => state.raceSessionId)
  const captureProgress = captureRequest?.captureProgress ?? null
  const startPose = useMemo(
    () => Number.isFinite(captureProgress)
      ? getTrackPoseAtProgress(captureProgress, 0, trackCurve)
      : getStartGridPose('player', gameMode, trackCurve, trackLength),
    [captureProgress, gameMode, trackCurve, trackLength]
  )
  const captureLookTarget = useMemo(() => {
    if (!captureRequest || !Number.isFinite(captureRequest.targetProgress)) return null
    const point = trackCurve.getPointAt(captureRequest.targetProgress)
    const tangent = trackCurve.getTangentAt(captureRequest.targetProgress).setY(0).normalize()
    const right = new THREE.Vector3(-tangent.z, 0, tangent.x)
    return point
      .addScaledVector(right, captureRequest.targetLateral)
      .addScaledVector(WORLD_UP, captureRequest.targetHeight)
  }, [captureRequest, trackCurve])
  
  const {
    passCheckpoint,
    setDrivingBackwards,
    updateRaceFrame,
    updateRacerProgress
  } = useGameStore.getState()

  const playerLastCheckpointTimeRef = useRef(0)
  const recoveryAnchorRef = useRef(null)
  const progressGuardRef = useRef(createProgressGuardState())
  const resetKeyDownRef = useRef(false)
  const recoveryDirectionGraceRef = useRef(0)
  const wrongWayStateRef = useRef(createWrongWayState())
  const gridCameraPendingRef = useRef(true)
  const physicsObservationRef = useRef(createPhysicsObservationState())
  const telemetryElapsedRef = useRef(0)
  const racerReportElapsedRef = useRef(0)
  const lastRacerReportRef = useRef({ lap: 1, nextCheckpointIndex: 1 })
  const cameraLookTargetRef = useRef(new THREE.Vector3())
  const cameraInitializedRef = useRef(false)
  const reducedMotionRef = useRef(false)
  const torqueBufferIndexRef = useRef(0)
  const skipNextActuationRef = useRef(false)
  const collisionEscapeSecondsRef = useRef(0)
  const collisionEscapeActiveRef = useRef(false)
  const blockingCollisionHandlesRef = useRef(new Set())
  const captureFrameTimesRef = useRef([])
  const playerPositionRef = useRef({ x: 0, z: 0, vx: 0, vz: 0, color: '#ff3366' })
  const mergedControlsRef = useRef(mergeDrivingControlSources())
  const physicsSampleRef = useRef({
    position: null,
    velocity: null,
    delta: 0,
    raceSessionId: null,
    gameState: 'menu',
    controls: { forward: false, backward: false, brake: false, reset: false },
  })

  const readDrivingControls = () => mergeDrivingControlSources(
    getKeys(),
    useGameStore.getState().touchControls,
    mergedControlsRef.current,
  )

  useEffect(() => {
    if (gameState === 'countdown' || gameState === 'menu') {
      playerLastCheckpointTimeRef.current = 0
      progressGuardRef.current = createProgressGuardState()
      resetKeyDownRef.current = false
      recoveryDirectionGraceRef.current = 0
      resetWrongWayState(wrongWayStateRef.current)
      gridCameraPendingRef.current = true
      telemetryElapsedRef.current = 0
      racerReportElapsedRef.current = 0
      lastRacerReportRef.current = { lap: 1, nextCheckpointIndex: 1 }
      cameraInitializedRef.current = false
      skipNextActuationRef.current = false
      collisionEscapeSecondsRef.current = 0
      collisionEscapeActiveRef.current = false
      blockingCollisionHandlesRef.current.clear()
      captureFrameTimesRef.current.length = 0
      recoveryAnchorRef.current = {
        nextCheckpointIndex: 1,
        progress: startPose.progress,
        position: {
          x: startPose.position[0],
          y: startPose.position[1],
          z: startPose.position[2],
        },
        tangent: {
          x: startPose.tangent.x,
          y: 0,
          z: startPose.tangent.z,
        },
        centerlineDistance: Math.abs(startPose.lateralOffset),
      }
      setDrivingBackwards(false)

      // RigidBody remains mounted when Pause -> Restart changes the state to
      // countdown, so its JSX position prop is not reapplied. Every race
      // session explicitly restores the player to the shared grid pose.
      if (bodyRef.current) {
        setPlayerTranslation(bodyRef.current, {
          x: startPose.position[0],
          y: startPose.position[1],
          z: startPose.position[2]
        }, PLAYER_TRANSLATION_REASON.SESSION_RESET, {
          raceSessionId,
          gameState,
          trigger: 'race-session-effect',
        })
        bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
        bodyRef.current.setRotation(startPose.rotation, true)
        resetPhysicsObservation(physicsObservationRef.current, {
          position: bodyRef.current.translation(),
          velocity: bodyRef.current.linvel(),
          raceSessionId,
        })

        updateProgressGuardState(
          progressGuardRef.current,
          { x: startPose.position[0], y: startPose.position[1], z: startPose.position[2] },
          startPose.progress,
          Math.abs(startPose.lateralOffset),
          0,
          1 / 60,
          trackLength
        )
      }
    }
  }, [gameMode, gameState, raceSessionId, setDrivingBackwards, startPose.lateralOffset, startPose.position, startPose.progress, startPose.rotation, trackLength])

  useEffect(() => {
    return () => {
      audioEngine.stop()
    }
  }, [])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => {
      reducedMotionRef.current = preference.matches
    }
    updatePreference()
    preference.addEventListener?.('change', updatePreference)
    return () => preference.removeEventListener?.('change', updatePreference)
  }, [])

  // Actuation belongs to Rapier's fixed step, not the render callback. During
  // a delayed render frame Rapier can execute many 60Hz steps; applying drive
  // here keeps propulsion, braking and grip continuous through every one.
  useBeforePhysicsStep((world) => {
    if (gameState !== 'playing' || !bodyRef.current) return

    const body = bodyRef.current
    const controls = readDrivingControls()
    if (skipNextActuationRef.current) {
      skipNextActuationRef.current = false
      return
    }
    const linVel = body.linvel()
    const rot = body.rotation()
    const velocity = tempVelocity.set(linVel.x, linVel.y, linVel.z)
    const carQuaternion = tempCarQuaternion.set(rot.x, rot.y, rot.z, rot.w)
    const forwardVector = tempForward.set(0, 0, -1).applyQuaternion(carQuaternion)
    forwardVector.y = 0
    if (forwardVector.lengthSq() < 1e-6) {
      forwardVector.set(0, 0, -1)
    } else {
      forwardVector.normalize()
    }
    const rightVector = tempRight.set(-forwardVector.z, 0, forwardVector.x)
    const forwardSpeed = velocity.dot(forwardVector)
    const lateralSpeed = velocity.dot(rightVector)
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z)
    const forwardRequested = controls.forward === true
    const backwardRequested = controls.backward === true
    const throttleInput = Number(forwardRequested) - Number(backwardRequested)
    const steeringInput = Number(controls.left) - Number(controls.right)
    const longitudinalSpeed = Math.abs(forwardSpeed)

    let engineForce = 0
    let brakingForce = 0
    if (backwardRequested && forwardSpeed > 1) {
      // A mobile player commonly lands the brake thumb before lifting the
      // accelerator. Braking must win over the overlapping throttle input.
      brakingForce = getBrakingForce(longitudinalSpeed)
    } else if (forwardRequested && forwardSpeed < -1) {
      brakingForce = getBrakingForce(longitudinalSpeed)
    } else if (forwardRequested && !backwardRequested) {
      // Lateral motion after a contact must not cut the engine. Top-speed
      // taper is a longitudinal drivetrain limit, not a total-speed limit.
      engineForce = getForwardEngineForce(longitudinalSpeed)
    } else if (backwardRequested && !forwardRequested) {
      // Reverse engages only after throttle release. With both pedals held at
      // rest the car remains stationary instead of unexpectedly backing up.
      engineForce = -VEHICLE_DYNAMICS.reverseEngineForce
    }
    if (controls.brake) {
      brakingForce = getBrakingForce(longitudinalSpeed, true)
    }

    const gripScale = getContinuousGripScale(
      horizontalSpeed,
      steeringInput,
      brakingForce > 0 ? 1 : 0,
    )
    const actuation = calculateVehicleActuation({
      engineForce,
      brakingForce,
      steeringInput: forwardSpeed < -0.1 ? -steeringInput : steeringInput,
      forwardSpeed,
      lateralSpeed,
      mass: body.mass(),
      delta: world?.timestep || VEHICLE_DYNAMICS.physicsStep,
      gripScale,
    })
    const isSteeringAgainstContact = throttleInput > 0
      && steeringInput !== 0
      && !controls.brake
      && horizontalSpeed < VEHICLE_DYNAMICS.collisionEscapeMaxSpeed
      && blockingCollisionHandlesRef.current.size > 0
    collisionEscapeSecondsRef.current = isSteeringAgainstContact
      ? collisionEscapeSecondsRef.current + actuation.controlDelta
      : 0
    const collisionEscapeActive = collisionEscapeSecondsRef.current
      >= VEHICLE_DYNAMICS.collisionEscapeArmSeconds
    if (collisionEscapeActive && !collisionEscapeActiveRef.current) {
      recordRuntimeDiagnostic(RUNTIME_EVENT_ID.COLLISION_ESCAPE, {
        causeId: 'sustained-throttle-steering-at-contact',
        raceSessionId,
        stalledSeconds: collisionEscapeSecondsRef.current,
        position: snapshotVector(body.translation()),
        velocity: snapshotVector(linVel),
      })
    }
    collisionEscapeActiveRef.current = collisionEscapeActive

    body.applyImpulse(
      tempForce.copy(forwardVector).multiplyScalar(actuation.forwardImpulse),
      true,
    )
    const torqueVec = tempTorqueBuffers[torqueBufferIndexRef.current]
      .set(0, actuation.steeringImpulse, 0)
    torqueBufferIndexRef.current = 1 - torqueBufferIndexRef.current
    body.applyTorqueImpulse(torqueVec, true)
    body.applyImpulse(
      tempLateralCorrection.copy(rightVector).multiplyScalar(actuation.lateralImpulse),
      true,
    )

    if (actuation.steeringForce !== 0 && typeof body.setAngvel === 'function') {
      const angularVelocity = typeof body.angvel === 'function'
        ? body.angvel()
        : { x: 0, y: 0, z: 0 }
      const steeringDirection = Math.sign(actuation.steeringForce)
      const minimumYawRate = steeringDirection * (collisionEscapeActive
        ? VEHICLE_DYNAMICS.collisionEscapeYawRate
        : 0.22 + actuation.steeringSpeedFactor * 0.28)
      if (Math.abs(angularVelocity.y) < Math.abs(minimumYawRate)) {
        const yawBlend = collisionEscapeActive
          ? 1
          : Math.min(10 * actuation.controlDelta, 1)
        body.setAngvel({
          x: angularVelocity.x,
          y: THREE.MathUtils.lerp(angularVelocity.y, minimumYawRate, yawBlend),
          z: angularVelocity.z,
        }, true)
      }
    }
  })

  useFrame((state, delta) => {
    if (gameState === 'countdown') {
       if (gridCameraPendingRef.current && bodyRef.current) {
         const gridCenterPoint = startPose.point.clone()
           .addScaledVector(startPose.right, -startPose.lateralOffset)
         const gridCameraPosition = gridCenterPoint.clone()
           .addScaledVector(startPose.tangent, -8)
           .add(new THREE.Vector3(0, 3.5, 0))
         state.camera.position.lerp(gridCameraPosition, 1)
         state.camera.lookAt(
           gridCenterPoint
             .addScaledVector(startPose.tangent, 10)
             .add(new THREE.Vector3(0, 1, 0))
         )
         gridCameraPendingRef.current = false
       }
       audioEngine.start()
       audioEngine.updateEngine(1000)
    }

    if (gameState !== 'playing') {
       // Keep the reset edge detector synchronized while physics is paused.
       // Otherwise an R key pressed during a menu/countdown/pause is mistaken
       // for a fresh in-race recovery on the first resumed frame.
       resetKeyDownRef.current = readDrivingControls().reset
       if (gameState === 'paused' || gameState === 'finished') {
         audioEngine.stop()
       }
       return
    }
    
    // Render loops can occasionally report a zero/invalid delta while a tab is
    // being restored. Never let that sample contaminate timing or physics.
    const frameDelta = Number.isFinite(delta) && delta > 0 ? delta : 0
    if (!bodyRef.current) return
    
    const controls = readDrivingControls()
    const resetKeyDown = controls.reset
    const resetPressed = resetKeyDown && !resetKeyDownRef.current
    resetKeyDownRef.current = resetKeyDown
    
    // Get current physics state
    const linVel = bodyRef.current.linvel()
    const rot = bodyRef.current.rotation()
    const pos = bodyRef.current.translation()
    const posVec = tempPosition.set(pos.x, pos.y, pos.z)

    const physicsSample = physicsSampleRef.current
    physicsSample.position = pos
    physicsSample.velocity = linVel
    physicsSample.delta = frameDelta
    physicsSample.raceSessionId = raceSessionId
    physicsSample.gameState = gameState
    physicsSample.controls.forward = controls.forward
    physicsSample.controls.backward = controls.backward
    physicsSample.controls.brake = controls.brake
    physicsSample.controls.reset = resetKeyDown
    observePlayerPhysics(physicsObservationRef.current, physicsSample)

    // During active racing only the rising edge of the player's R input may
    // relocate the rigid body. WRONG WAY, projection continuity, road distance,
    // height and velocity are observations, not proof that teleporting is safe.
    // This closed contract eliminates every calculation-driven auto-respawn.
    if (resetPressed) {
      skipNextActuationRef.current = true
      const recoveryState = useGameStore.getState()
      const checkpointCount = Number.isFinite(recoveryState.totalCheckpoints) && recoveryState.totalCheckpoints > 0
        ? Math.floor(recoveryState.totalCheckpoints)
        : 10
      const nextCheckpointIndex = Number.isFinite(recoveryState.nextCheckpointIndex)
        ? Math.min(checkpointCount - 1, Math.max(0, Math.floor(recoveryState.nextCheckpointIndex)))
        : 0
      // nextCheckpointIndex=0 now means CP9 was validated and the car still
      // has to cross the start/finish line. The previous checkpoint is thus
      // always the wrapped predecessor (initial races start by targeting CP1).
      const hasNotReachedFirstCheckpoint = recoveryState.lap === 1
        && nextCheckpointIndex === 1
        && playerLastCheckpointTimeRef.current === 0
      const recoveryCheckpointIndex = (nextCheckpointIndex - 1 + checkpointCount) % checkpointCount
      const trustedAnchor = recoveryAnchorRef.current
      const hasMatchingAnchor = trustedAnchor
        && trustedAnchor.nextCheckpointIndex === nextCheckpointIndex
      const recoveryProgress = hasMatchingAnchor
        ? trustedAnchor.progress
        : hasNotReachedFirstCheckpoint
          ? startPose.progress
          : recoveryCheckpointIndex / checkpointCount
      // Before CP1, recovery returns to the player's own grid slot. Resetting
      // to CP0 would jump a rear-row starter thirteen metres forward.
      const fallbackPoint = hasNotReachedFirstCheckpoint
        ? { x: startPose.position[0], y: startPose.position[1], z: startPose.position[2] }
        : (() => {
            const point = trackCurve.getPointAt(recoveryProgress)
            return { x: point.x, y: point.y + 1, z: point.z }
          })()
      const recoveryPosition = hasMatchingAnchor
        ? trustedAnchor.position
        : fallbackPoint
      const recoveryTangent = hasMatchingAnchor
        ? new THREE.Vector3(
            trustedAnchor.tangent.x,
            trustedAnchor.tangent.y,
            trustedAnchor.tangent.z
          )
        : hasNotReachedFirstCheckpoint
          ? startPose.tangent.clone()
          : trackCurve.getTangentAt(recoveryProgress)
      const recoveryDirection = new THREE.Vector3(recoveryTangent.x, 0, recoveryTangent.z).normalize()
      const recoveryRotation = createTrackYawRotation(recoveryDirection)

      recoveryDirectionGraceRef.current = RECOVERY_DIRECTION_GRACE_SECONDS
      collisionEscapeSecondsRef.current = 0
      collisionEscapeActiveRef.current = false
      blockingCollisionHandlesRef.current.clear()
      resetWrongWayState(wrongWayStateRef.current)
      setPlayerTranslation(
        bodyRef.current,
        recoveryPosition,
        PLAYER_TRANSLATION_REASON.MANUAL_RECOVERY,
        {
          raceSessionId,
          gameState,
          trigger: 'reset-key-rising-edge',
        },
      )
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
      bodyRef.current.setRotation(recoveryRotation, true)
      resetPhysicsObservation(physicsObservationRef.current, {
        position: bodyRef.current.translation(),
        velocity: bodyRef.current.linvel(),
        raceSessionId,
      })
      setDrivingBackwards(false)
      updateRaceFrame(frameDelta, 0, 1000, 1)
      audioEngine.updateEngine(1000)

      progressGuardRef.current = createProgressGuardState()
      updateProgressGuardState(
        progressGuardRef.current,
        recoveryPosition,
        recoveryProgress,
        hasMatchingAnchor
          ? trustedAnchor.centerlineDistance
          : hasNotReachedFirstCheckpoint ? Math.abs(startPose.lateralOffset) : 0,
        0,
        Math.max(frameDelta, 1 / 120),
        trackLength
      )

      if (!window.racerProgress) window.racerProgress = {}
      if (!window.racerPositions) window.racerPositions = {}
      window.racerProgress.player = calculateLiveRaceScore(
        recoveryState.lap,
        nextCheckpointIndex,
        recoveryProgress
      )
      const recoveryPlayerPosition = playerPositionRef.current
      recoveryPlayerPosition.x = recoveryPosition.x
      recoveryPlayerPosition.z = recoveryPosition.z
      window.racerPositions.player = recoveryPlayerPosition

      const recoveryReportState = useGameStore.getState()
      updateRacerProgress(
        'player',
        recoveryState.lap,
        nextCheckpointIndex,
        playerLastCheckpointTimeRef.current,
        recoveryReportState.gameState === 'finished',
        recoveryReportState.totalTime,
        recoveryReportState.currentTime,
        raceSessionId
      )
      racerReportElapsedRef.current = 0
      lastRacerReportRef.current = {
        lap: recoveryState.lap,
        nextCheckpointIndex
      }

      // Snap the chase camera to the same recovered heading. Letting it lerp
      // from a pre-crash heading makes a correct respawn look as if the car has
      // been rotated the wrong way for several frames.
      const recoveryCameraTarget = new THREE.Vector3(
        recoveryPosition.x,
        recoveryPosition.y,
        recoveryPosition.z
      )
      const recoveryCameraPosition = recoveryCameraTarget.clone()
        .addScaledVector(recoveryDirection, -6)
        .add(new THREE.Vector3(0, 3.5, 0))
      state.camera.position.lerp(recoveryCameraPosition, 1)
      state.camera.lookAt(
        recoveryCameraTarget.clone()
          .addScaledVector(recoveryDirection, 10)
          .add(new THREE.Vector3(0, 1, 0))
      )
      return
    }

    recoveryDirectionGraceRef.current = Math.max(
      0,
      recoveryDirectionGraceRef.current - frameDelta
    )

    // Create Three.js vectors for math
    const velocity = tempVelocity.set(linVel.x, linVel.y, linVel.z)
    const currentSpeed = Math.hypot(velocity.x, velocity.z)
    const speedKmH = currentSpeed * 3.6
    if (captureRequest && frameDelta > 0) {
      const frameTimes = captureFrameTimesRef.current
      frameTimes.push(Math.min(frameDelta * 1000, 1000))
      if (frameTimes.length > 180) frameTimes.shift()
    }
    
    // Determine forward vector
    const carQuaternion = tempCarQuaternion.set(rot.x, rot.y, rot.z, rot.w)
    const forwardVector = tempForward.set(0, 0, -1).applyQuaternion(carQuaternion)
    // Engine and steering operate in the road plane. Applying the full pitched
    // or rolled quaternion can push the car into the road and rotate it around
    // its local tilted axis after a collision.
    forwardVector.y = 0
    if (forwardVector.lengthSq() < 1e-6) {
      forwardVector.set(0, 0, -1)
    } else {
      forwardVector.normalize()
    }
    // Update telemetry HUD and Audio
    const rpm = Math.min(8000, 1000 + Math.abs(speedKmH) * 30)
    const gear = Math.max(1, Math.ceil(Math.abs(speedKmH) / 50))
    updateRaceFrame(frameDelta, speedKmH, rpm, gear)
    telemetryElapsedRef.current += frameDelta
    if (telemetryElapsedRef.current >= 1 / 20) {
      audioEngine.updateEngine(rpm)
      telemetryElapsedRef.current %= 1 / 20
    }
    
    // Camera follow
    let cameraSourcePosition = posVec
    let cameraSourceForward = forwardVector
    if (
      visualRef.current
      && typeof visualRef.current.getWorldPosition === 'function'
      && typeof visualRef.current.getWorldQuaternion === 'function'
    ) {
      visualRef.current.getWorldPosition(tempVisualPosition)
      visualRef.current.getWorldQuaternion(tempVisualQuaternion)
      tempVisualForward.set(0, 0, -1).applyQuaternion(tempVisualQuaternion).setY(0)
      if (tempVisualForward.lengthSq() > 1e-6) {
        tempVisualForward.normalize()
        cameraSourcePosition = tempVisualPosition
        cameraSourceForward = tempVisualForward
      }
    }
    const cameraPosition = tempCameraPosition.copy(cameraSourcePosition)
    // Keep the desktop chase framing, but move back on portrait screens where
    // the narrower horizontal FOV would otherwise make the car fill the view.
    const cameraFraming = calculateChaseCameraFraming(
      speedKmH,
      state.camera.aspect,
      tempChaseCameraFraming
    )
    const cameraLens = calculateChaseCameraLens(
      speedKmH,
      state.camera.aspect,
      reducedMotionRef.current,
      tempChaseCameraLens,
    )
    const cameraOffset = tempCameraOffset
      .copy(cameraSourceForward)
      .multiplyScalar(-cameraFraming.distance)
    cameraOffset.y += Number.isFinite(captureRequest?.cameraHeight)
      ? captureRequest.cameraHeight
      : cameraFraming.height
    cameraPosition.add(cameraOffset)

    const cameraDelta = Math.min(frameDelta, 0.1)
    const positionDamping = 1 - Math.exp(-7.5 * cameraDelta)
    const targetDamping = 1 - Math.exp(-12 * cameraDelta)
    if (Number.isFinite(state.camera.fov)) {
      const nextFov = THREE.MathUtils.lerp(
        state.camera.fov,
        cameraLens.fov,
        1 - Math.exp(-4.5 * cameraDelta),
      )
      if (Math.abs(nextFov - state.camera.fov) > 0.001) {
        state.camera.fov = nextFov
        state.camera.updateProjectionMatrix?.()
      }
    }
    if (captureLookTarget) {
      tempCameraTarget.copy(captureLookTarget)
    } else {
      tempCameraTarget
        .copy(cameraSourceForward)
        .multiplyScalar(cameraLens.lookAhead)
        .add(cameraSourcePosition)
    }
    if (!cameraInitializedRef.current) {
      state.camera.position.lerp(cameraPosition, 1)
      cameraLookTargetRef.current.copy(tempCameraTarget)
      cameraInitializedRef.current = true
    } else {
      state.camera.position.lerp(cameraPosition, positionDamping)
      cameraLookTargetRef.current.lerp(tempCameraTarget, targetDamping)
    }
    state.camera.lookAt(cameraLookTargetRef.current)
    if (captureRequest
      && window.__racingVisualCapture
      && typeof state.camera.updateMatrixWorld === 'function') {
      state.camera.updateMatrixWorld()
      const captureState = window.__racingVisualCapture
      captureState.speed = speedKmH
      captureState.cameraMode = captureRequest.cameraMode ?? 'landmark'
      captureState.cameraFov = Number.isFinite(state.camera.fov) ? state.camera.fov : null
      captureState.racerCount = Object.keys(window.racerPositions ?? {}).length
      captureState.frameTimes = captureFrameTimesRef.current
      captureState.renderInfo = {
        calls: state.gl?.info?.render?.calls ?? null,
        triangles: state.gl?.info?.render?.triangles ?? null,
        geometries: state.gl?.info?.memory?.geometries ?? null,
        textures: state.gl?.info?.memory?.textures ?? null,
      }
      tempCaptureProjectedCar.copy(cameraSourcePosition).project(state.camera)
      captureState.carNdc = {
        x: tempCaptureProjectedCar.x,
        y: tempCaptureProjectedCar.y,
        z: tempCaptureProjectedCar.z,
      }
      captureState.carVisible = (
        Number.isFinite(tempCaptureProjectedCar.x)
        && Number.isFinite(tempCaptureProjectedCar.y)
        && Number.isFinite(tempCaptureProjectedCar.z)
        && Math.abs(tempCaptureProjectedCar.x) <= 0.9
        && Math.abs(tempCaptureProjectedCar.y) <= 0.9
        && tempCaptureProjectedCar.z >= -1
        && tempCaptureProjectedCar.z <= 1
      )
      if (captureLookTarget) {
        tempCaptureProjectedTarget.copy(captureLookTarget).project(state.camera)
        captureState.targetNdc = {
          x: tempCaptureProjectedTarget.x,
          y: tempCaptureProjectedTarget.y,
          z: tempCaptureProjectedTarget.z,
        }
        captureState.targetVisible = (
          Number.isFinite(tempCaptureProjectedTarget.x)
          && Number.isFinite(tempCaptureProjectedTarget.y)
          && Number.isFinite(tempCaptureProjectedTarget.z)
          && Math.abs(tempCaptureProjectedTarget.x) <= 0.9
          && Math.abs(tempCaptureProjectedTarget.y) <= 0.9
          && tempCaptureProjectedTarget.z >= -1
          && tempCaptureProjectedTarget.z <= 1
        )
      }
    }

    // Detect backwards driving and derive race progress. Once initialized, the
    // projection is anchored to the last continuity-approved section. A
    // nearby/parallel section therefore cannot steal progress merely because
    // the player uses the outer half of the 16m road.
    const needsTimingReanchor = progressGuardRef.current.initialized
      && !progressGuardRef.current.segmentValid
      && progressGuardRef.current.reason === 'timing-discontinuity'
      && progressGuardRef.current.timingReanchorAllowed
    // Keep the last approved logical progress separate from the optional local
    // projection hint. A moderate render hitch can require a global nearest
    // point search while still being a continuity-valid physical sample; lap
    // crossing and signed travel must retain the pre-hitch seam history.
    const previousApprovedProgress = progressGuardRef.current.initialized
      && !needsTimingReanchor
      ? progressGuardRef.current.curveProgress
      : null
    const projectionHint = frameDelta <= LOCAL_PROJECTION_MAX_FRAME_DELTA
      ? previousApprovedProgress
      : null
    let projection = projectPointOntoClosedCurve(trackCurve, posVec, projectionHint)
    let globalProjection = projectionHint === null ? projection : null
    // A local search can miss after a sharp collision or frame gap. Before
    // classifying the car as off-track, retry globally and let the continuity
    // guard decide whether that candidate is physically reachable.
    if (projection.centerlineDistance > PROGRESS_CORRIDOR_LIMIT) {
      globalProjection = projectPointOntoClosedCurve(trackCurve, posVec, null)
      if (globalProjection.centerlineDistance < projection.centerlineDistance) {
        projection = globalProjection
      }
    }
    const closestT = projection.progress
    const minDistance = projection.centerlineDistance

    const hasContinuousProgress = updateProgressGuardState(
      progressGuardRef.current,
      pos,
      closestT,
      minDistance,
      currentSpeed,
      Math.max(frameDelta, 1 / 240),
      trackLength
    )
    const confirmedForwardSeamCrossing = didConfirmForwardSeamCrossing(
      progressGuardRef.current
    )
    // A rejected projection freezes logical progress at the last approved
    // section. It must not rotate/respawn the physical car or feed an aliased
    // tangent into WRONG WAY detection.
    const approvedProgress = hasContinuousProgress || !progressGuardRef.current.initialized
      ? closestT
      : progressGuardRef.current.curveProgress
    const trackTangent = trackCurve.getTangentAt(approvedProgress, tempTrackTangent)
    const flatTrackTangent = tempFlatTrackTangent
      .set(trackTangent.x, 0, trackTangent.z)
      .normalize()
    if (captureRequest && window.__racingVisualCapture) {
      const captureState = window.__racingVisualCapture
      const trackPoint = trackCurve.getPointAt(approvedProgress, tempCaptureTrackPoint)
      const offsetX = pos.x - trackPoint.x
      const offsetZ = pos.z - trackPoint.z
      const headingDot = THREE.MathUtils.clamp(
        forwardVector.x * flatTrackTangent.x + forwardVector.z * flatTrackTangent.z,
        -1,
        1,
      )
      const headingCrossY = forwardVector.z * flatTrackTangent.x
        - forwardVector.x * flatTrackTangent.z
      captureState.progress = approvedProgress
      captureState.centerlineDistance = minDistance
      captureState.lateralOffset = offsetX * -flatTrackTangent.z
        + offsetZ * flatTrackTangent.x
      captureState.headingError = Math.atan2(headingCrossY, headingDot)
    }
    const currentIsDrivingBackwards = useGameStore.getState().isDrivingBackwards
    const longitudinalTrackSpeed = velocity.dot(flatTrackTangent)
    const signedTrackTravel = hasContinuousProgress && Number.isFinite(previousApprovedProgress)
      ? getSignedWrappedProgressDelta(previousApprovedProgress, approvedProgress) * trackLength
      : 0
    // Direction evidence is intentionally stricter than a tangent dot product:
    // both the physical velocity and a continuity-approved curve displacement
    // must be reverse. This rejects false warnings from a stale/ambiguous
    // projection, a one-frame collision impulse, lateral drift, or a spin.
    const isBackwards = updateWrongWayState(wrongWayStateRef.current, {
      continuous: hasContinuousProgress,
      signedTrackTravel,
      longitudinalTrackSpeed,
      delta: frameDelta,
      grace: recoveryDirectionGraceRef.current > 0,
    })

    if (isBackwards !== currentIsDrivingBackwards) {
      recordRuntimeDiagnostic(RUNTIME_EVENT_ID.WRONG_WAY_TRANSITION, {
        causeId: isBackwards ? 'confirmed-reverse-entry' : 'reverse-evidence-cleared',
        active: isBackwards,
        raceSessionId,
        position: snapshotVector(pos),
        velocity: snapshotVector(linVel),
        approvedProgress,
        hasContinuousProgress,
        signedTrackTravel,
        longitudinalTrackSpeed,
        reverseSeconds: wrongWayStateRef.current.reverseSeconds,
        reverseDistance: wrongWayStateRef.current.reverseDistance,
      })
      setDrivingBackwards(isBackwards)
    }

    // Checkpoint logic against curve
    const storeState = useGameStore.getState()
    const { nextCheckpointIndex, totalCheckpoints, lap } = storeState

    const cpProgress = nextCheckpointIndex / totalCheckpoints
    const targetCPPos = trackCurve.getPointAt(cpProgress, tempCheckpointPosition)
    
    const reachedCheckpoint = nextCheckpointIndex === 0
      ? hasCrossedFinishLine(previousApprovedProgress, approvedProgress)
        || confirmedForwardSeamCrossing
      : isNearCheckpoint(pos, targetCPPos, 25)
    
    // The HUD deliberately waits for sustained reverse movement before showing
    // WRONG WAY, but checkpoint validation must reject reverse crossings from
    // the first frame. Otherwise the warning grace period becomes an exploit.
    const reverseCheckpointCrossing = isReverseCheckpointCrossing({
      continuous: hasContinuousProgress,
      signedTrackTravel,
      longitudinalTrackSpeed,
    })
    const hasCheckpointContinuity = hasContinuousProgress
      || (nextCheckpointIndex === 0 && confirmedForwardSeamCrossing)
    if (reachedCheckpoint && !isBackwards && !reverseCheckpointCrossing && hasCheckpointContinuity) {
      const prevCP = nextCheckpointIndex
      passCheckpoint(nextCheckpointIndex)
      
      const updatedNextCP = useGameStore.getState().nextCheckpointIndex
      if (updatedNextCP !== prevCP) {
        const postPassState = useGameStore.getState()
        playerLastCheckpointTimeRef.current = postPassState.totalTime + postPassState.currentTime
        recoveryAnchorRef.current = {
          nextCheckpointIndex: updatedNextCP,
          progress: approvedProgress,
          position: { x: pos.x, y: pos.y, z: pos.z },
          tangent: {
            x: flatTrackTangent.x,
            y: 0,
            z: flatTrackTangent.z,
          },
          centerlineDistance: minDistance,
        }
      }
    }

    // Update global progress for position calculation
    if (!window.racerProgress) window.racerProgress = {};
    if (!window.racerPositions) window.racerPositions = {};
    
    // Use continuous curve progress for the live leaderboard. After CP9 the
    // next checkpoint wraps to zero, but the car is still completing the final
    // 10% of the lap and must not visually drop behind the field.
    // CP0 uses a proximity gate, so the store may advance the lap a few metres
    // before the curve parameter wraps from 1 back to 0. Keep that short seam
    // interval on the previous lap to preserve monotonic visual progress.
    window.racerProgress.player = calculateLiveRaceScore(
      lap,
      nextCheckpointIndex,
      approvedProgress
    );
    const playerPosition = playerPositionRef.current
    playerPosition.x = pos.x
    playerPosition.z = pos.z
    playerPosition.vx = linVel.x
    playerPosition.vz = linVel.z
    window.racerPositions.player = playerPosition

    // Regularly report player's race metrics to the store
    const finalState = useGameStore.getState()
    racerReportElapsedRef.current += frameDelta
    const lastReport = lastRacerReportRef.current
    const progressChanged = lastReport.lap !== finalState.lap
      || lastReport.nextCheckpointIndex !== finalState.nextCheckpointIndex
    if (progressChanged || racerReportElapsedRef.current >= 0.1) {
      updateRacerProgress(
        'player',
        finalState.lap,
        finalState.nextCheckpointIndex,
        playerLastCheckpointTimeRef.current,
        finalState.gameState === 'finished',
        finalState.totalTime,
        finalState.currentTime,
        raceSessionId
      )
      const reportedState = useGameStore.getState()
      if (reportedState.gameMode === 'single' && reportedState.gameState === 'playing') {
        reportedState.updatePosition(getLiveRacerRank(
          reportedState.racers,
          window.racerProgress,
          'player',
          reportedState.position,
        ))
      }
      racerReportElapsedRef.current %= 0.1
      lastRacerReportRef.current = {
        lap: finalState.lap,
        nextCheckpointIndex: finalState.nextCheckpointIndex
      }
    }
  })

  return (
    <RigidBody 
      ref={bodyRef}
      name="player"
      position={startPose.position}
      rotation={[0, startPose.yaw, 0]}
      colliders={false}
      linearDamping={VEHICLE_DYNAMICS.linearDamping}
      angularDamping={VEHICLE_DYNAMICS.angularDamping}
      enabledRotations={[false, true, false]}
      onCollisionEnter={({ other }) => {
        // The chassis is always touching the road. Only non-road contacts may
        // arm the low-speed escape yaw; otherwise a normal road stop can turn
        // into an unexplained in-place 90-degree rotation.
        if (other?.rigidBodyObject?.name === 'track-road') return
        const handle = other?.collider?.handle
        if (Number.isFinite(handle)) blockingCollisionHandlesRef.current.add(handle)
      }}
      onCollisionExit={({ other }) => {
        const handle = other?.collider?.handle
        if (Number.isFinite(handle)) blockingCollisionHandlesRef.current.delete(handle)
      }}
    >
      {/* Mass belongs to colliders in Rapier. Keeping one explicit chassis
          collider prevents visual wheel meshes from producing a tiny,
          unpredictable compound mass. */}
      <CuboidCollider
        args={[
          VEHICLE_COLLIDER_HALF_EXTENTS.width,
          VEHICLE_COLLIDER_HALF_EXTENTS.height,
          VEHICLE_COLLIDER_HALF_EXTENTS.length,
        ]}
        position={[0, VEHICLE_COLLIDER_HALF_EXTENTS.height, 0]}
        mass={VEHICLE_DYNAMICS.mass}
        friction={0}
        frictionCombineRule={CoefficientCombineRule.Min}
        restitution={0.2}
      />
      <group ref={visualRef}>
        <FormulaCar color="#ef3157" accent="#f4f6ef" isPlayer rigidBodyRef={bodyRef} />
      </group>
    </RigidBody>
  )
}
