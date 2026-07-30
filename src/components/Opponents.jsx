import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, useBeforePhysicsStep } from '@react-three/rapier'
import { CoefficientCombineRule } from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore'
import { getTrackPreset } from '../utils/trackData'
import {
  calculateLiveRaceScore,
  handleCheckpointPass,
  hasCrossedFinishLine
} from '../utils/raceLogic'
import { getStartGridPose } from '../utils/startGrid'
import FormulaCar from './FormulaCar'
import { isClearlyBelowTrack } from '../utils/drivingGuards'
import {
  advanceAIMergeDistance,
  calculateVehicleActuation,
  getAIMergeLateralOffset,
  getAITrafficTargetSpeed,
  getBrakingForce,
  getContinuousGripScale,
  getForwardEngineForce,
  getNearbyCarAvoidanceSteer,
  getTrackEdgeAvoidanceSteer,
  moveTowards,
  VEHICLE_COLLIDER_HALF_EXTENTS,
  VEHICLE_DYNAMICS
} from '../utils/vehicleDynamics'
import {
  createProgressGuardState,
  didConfirmForwardSeamCrossing,
  getSignedWrappedProgressDelta,
  snapProgressAtClosedCurveSeam,
  updateProgressGuardState
} from '../utils/progressGuard'
import {
  recordRuntimeDiagnostic,
  RUNTIME_EVENT_ID,
  snapshotVector
} from '../utils/runtimeDiagnostics'

// Pre-allocated vectors and quaternions for garbage-free calculations in useFrame
const tempCarPos = new THREE.Vector3()
const tempCurvePoint = new THREE.Vector3()
const tempP1 = new THREE.Vector3()
const tempP2 = new THREE.Vector3()
const tempTangent = new THREE.Vector3()
const tempSampleTangent = new THREE.Vector3()
const tempTrackRight = new THREE.Vector3()
const tempVecToCar = new THREE.Vector3()
const tempRelVec = new THREE.Vector3()
const tempForward = new THREE.Vector3()
const tempRight = new THREE.Vector3()
const tempDirToTarget = new THREE.Vector3()
const tempForceVec = new THREE.Vector3()
const tempTorqueVec = new THREE.Vector3()
const tempLateralCorrection = new THREE.Vector3()
const tempVelocity = new THREE.Vector3()
const tempAngularVelocity = new THREE.Vector3()
const tempCarQuaternion = new THREE.Quaternion()

const UP_VECTOR = new THREE.Vector3(0, 1, 0)
const FALL_RECOVERY_SPEED = 8
const PROJECTION_REFINEMENT_ITERATIONS = 14
const AI_TRAFFIC_SCAN_DISTANCE = 110
const wrapProgress = (t) => ((t % 1.0) + 1.0) % 1.0
const OPPONENT_CONFIG = Object.freeze([
  Object.freeze({ id: 1, racerId: 'ai_1', color: '#2774ff', accent: '#f4f6ef', laneBias: -0.7, paceScale: 0.985 }),
  Object.freeze({ id: 2, racerId: 'ai_2', color: '#12b886', accent: '#d7ff42', laneBias: 0.7, paceScale: 1 }),
  Object.freeze({ id: 3, racerId: 'ai_3', color: '#ff9d24', accent: '#171a19', laneBias: 0, paceScale: 0.97 }),
])

function projectPositionToCurve(curve, curveLength, carPos, estimatedProgress) {
  // Keep projection windows physical as the circuit length changes.
  const deltaBack = 30 / curveLength
  const deltaForward = 50 / curveLength
  const numSamples = 13
  
  let bestT = estimatedProgress
  let minSqDist = Infinity
  
  const totalRange = deltaBack + deltaForward
  const startT = estimatedProgress - deltaBack
  
  // Phase 1: Coarse local sampling
  for (let i = 0; i < numSamples; i++) {
    const t = wrapProgress(startT + (i / (numSamples - 1)) * totalRange)
    
    // Write directly to pre-allocated temp vector
    curve.getPointAt(t, tempCurvePoint)
    const sqDist = carPos.distanceToSquared(tempCurvePoint)
    
    if (sqDist < minSqDist) {
      minSqDist = sqDist
      bestT = t
    }
  }
  
  // Global Fallback
  if (minSqDist > 225) { // distance > 15m
    minSqDist = Infinity
    const globalSamples = Math.max(50, Math.ceil(curveLength / 18))
    for (let i = 0; i < globalSamples; i++) {
      const t = i / globalSamples
      curve.getPointAt(t, tempCurvePoint)
      const sqDist = carPos.distanceToSquared(tempCurvePoint)
      if (sqDist < minSqDist) {
        minSqDist = sqDist
        bestT = t
      }
    }
  }
  
  // Phase 2: High-precision refinement using Ternary Search around bestT
  const searchRange = totalRange / (numSamples - 1)
  let left = bestT - searchRange
  let right = bestT + searchRange
  
  // Match the player's projection precision. Six iterations leave a roughly
  // 30cm uncertainty on this search window, large enough to return 0.9998 for
  // the exact 0.0 seam and miss the finish line. Fourteen narrows the endpoint
  // below the shared two-centimetre canonicalization threshold.
  for (let iter = 0; iter < PROJECTION_REFINEMENT_ITERATIONS; iter++) {
    const m1 = left + (right - left) / 3
    const m2 = right - (right - left) / 3
    
    curve.getPointAt(wrapProgress(m1), tempP1)
    curve.getPointAt(wrapProgress(m2), tempP2)
    
    const d1 = carPos.distanceToSquared(tempP1)
    const d2 = carPos.distanceToSquared(tempP2)
    
    if (d1 < d2) {
      right = m2
    } else {
      left = m1
    }
  }
  
  return snapProgressAtClosedCurveSeam((left + right) / 2, curveLength)
}

export default function Opponents({ track = getTrackPreset() }) {
  const gameState = useGameStore(state => state.gameState)
  const raceSessionId = useGameStore(state => state.raceSessionId)
  const raceTrack = track ?? getTrackPreset()

  return (
    <group>
      {OPPONENT_CONFIG.map(opp => (
        <AIOpponent
          key={opp.id}
          data={opp}
          gameState={gameState}
          raceSessionId={raceSessionId}
          track={raceTrack}
          visualDetail="race"
        />
      ))}
    </group>
  )
}

function AIOpponent({ data, gameState, raceSessionId, track, visualDetail }) {
  const bodyRef = useRef()
  const trackCurve = track.curve
  const trackLength = track.length
  const opponentTopSpeed = VEHICLE_DYNAMICS.nominalTopSpeed * data.paceScale
  const startPose = useMemo(
    () => getStartGridPose(data.racerId, 'single', trackCurve, trackLength),
    [data.racerId, trackCurve, trackLength]
  )
  const progressRef = useRef(startPose.progress)
  const lapRef = useRef(1)

  const { totalCheckpoints, maxLaps, updateRacerProgress } = useGameStore.getState()

  const nextCheckpointIndexRef = useRef(1)
  const lastCheckpointTimeRef = useRef(0)
  const bestLapTimeRef = useRef(0)
  const currentTimeRef = useRef(0)
  const totalTimeRef = useRef(0)
  const finishedRef = useRef(false)
  const progressGuardRef = useRef(createProgressGuardState())

  // Stuck recovery state refs
  const stuckTimerRef = useRef(0)
  const recoveryStateRef = useRef('normal') // 'normal', 'reversing', 'realigning'
  const recoveryTimerRef = useRef(0)
  const recoverySteerDirRef = useRef(0)
  const checkpointStallTimerRef = useRef(0)
  const checkpointAgeRef = useRef(0)
  const progressWatchAnchorRef = useRef(startPose.progress)
  const racerReportElapsedRef = useRef(0.1)
  const projectionElapsedRef = useRef(1 / 30)
  const routePlanElapsedRef = useRef(1 / 30)
  const laneMergeDistanceRef = useRef(0)
  const plannedTargetSpeedRef = useRef(opponentTopSpeed)
  const controlledTargetSpeedRef = useRef(opponentTopSpeed)
  const plannedDirectionRef = useRef(startPose.tangent.clone())
  const driveCommandRef = useRef({
    engineForce: 0,
    brakeForce: 0,
    steeringInput: 0,
    gripScale: 1,
  })

  // Cached ID and racer positions object to avoid GC allocations
  const myIdRef = useRef(data.racerId)
  const myId = myIdRef.current
  const racerPosObjRef = useRef({ x: 0, z: 0, vx: 0, vz: 0, color: data.color })

  // Reset when game starts
  useEffect(() => {
    if (gameState === 'countdown' || gameState === 'menu') {
      if (window.racerProgress) delete window.racerProgress[myId]
      if (window.racerPositions) delete window.racerPositions[myId]
      progressRef.current = startPose.progress
      lapRef.current = 1
      nextCheckpointIndexRef.current = 1
      lastCheckpointTimeRef.current = 0
      bestLapTimeRef.current = 0
      currentTimeRef.current = 0
      totalTimeRef.current = 0
      finishedRef.current = false
      stuckTimerRef.current = 0
      recoveryStateRef.current = 'normal'
      recoveryTimerRef.current = 0
      recoverySteerDirRef.current = 0
      checkpointStallTimerRef.current = 0
      checkpointAgeRef.current = 0
      progressWatchAnchorRef.current = startPose.progress
      racerReportElapsedRef.current = 0.1
      projectionElapsedRef.current = 1 / 30
      routePlanElapsedRef.current = 1 / 30
      laneMergeDistanceRef.current = 0
      plannedTargetSpeedRef.current = opponentTopSpeed
      controlledTargetSpeedRef.current = opponentTopSpeed
      plannedDirectionRef.current.copy(startPose.tangent)
      driveCommandRef.current.engineForce = 0
      driveCommandRef.current.brakeForce = 0
      driveCommandRef.current.steeringInput = 0
      driveCommandRef.current.gripScale = 1
      progressGuardRef.current = createProgressGuardState()

      if (bodyRef.current) {
        bodyRef.current.setTranslation({
          x: startPose.position[0],
          y: startPose.position[1],
          z: startPose.position[2]
        }, true)
        bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
        bodyRef.current.setRotation(startPose.rotation, true)
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
  }, [gameState, myId, opponentTopSpeed, raceSessionId, startPose.position, startPose.progress, startPose.rotation, startPose.tangent, trackLength])

  useEffect(() => () => {
    if (window.racerProgress) delete window.racerProgress[myId]
    if (window.racerPositions) delete window.racerPositions[myId]
  }, [myId])

  useBeforePhysicsStep((world) => {
    if (gameState !== 'playing' || finishedRef.current || !bodyRef.current) return

    const body = bodyRef.current
    const command = driveCommandRef.current
    const linVel = body.linvel()
    const rot = body.rotation()
    const velocity = tempVelocity.set(linVel.x, linVel.y, linVel.z)
    tempCarQuaternion.set(rot.x, rot.y, rot.z, rot.w)
    const forwardVector = tempForward.set(0, 0, -1).applyQuaternion(tempCarQuaternion)
    forwardVector.y = 0
    if (forwardVector.lengthSq() < 1e-6) {
      forwardVector.set(0, 0, -1)
    } else {
      forwardVector.normalize()
    }
    const rightVector = tempRight.set(-forwardVector.z, 0, forwardVector.x)
    const forwardSpeed = velocity.dot(forwardVector)
    const lateralSpeed = velocity.dot(rightVector)
    const actuation = calculateVehicleActuation({
      engineForce: command.engineForce,
      brakingForce: command.brakeForce,
      steeringInput: command.steeringInput,
      forwardSpeed,
      lateralSpeed,
      mass: body.mass(),
      delta: world?.timestep || VEHICLE_DYNAMICS.physicsStep,
      gripScale: command.gripScale,
    })

    body.applyImpulse(
      tempForceVec.copy(forwardVector).multiplyScalar(actuation.forwardImpulse),
      true,
    )
    body.applyTorqueImpulse(
      tempTorqueVec.set(0, actuation.steeringImpulse, 0),
      true,
    )
    body.applyImpulse(
      tempLateralCorrection.copy(rightVector).multiplyScalar(actuation.lateralImpulse),
      true,
    )

    if (actuation.steeringForce !== 0 && typeof body.setAngvel === 'function') {
      const angularVelocity = typeof body.angvel === 'function'
        ? body.angvel()
        : { x: 0, y: 0, z: 0 }
      const steeringDirection = Math.sign(actuation.steeringForce)
      const minimumYawRate = steeringDirection * (0.22 + actuation.steeringSpeedFactor * 0.28)
      if (Math.abs(angularVelocity.y) < Math.abs(minimumYawRate)) {
        const yawBlend = Math.min(10 * actuation.controlDelta, 1)
        tempAngularVelocity.set(
          angularVelocity.x,
          THREE.MathUtils.lerp(angularVelocity.y, minimumYawRate, yawBlend),
          angularVelocity.z,
        )
        body.setAngvel(tempAngularVelocity, true)
      }
    }
  })
  
  useFrame((state, delta) => {
    if (gameState !== 'playing' || !bodyRef.current) return

    const elapsedTimeDelta = Number.isFinite(delta) && delta > 0 ? delta : 0
    const frameDelta = Math.min(elapsedTimeDelta, 0.1)
    if (frameDelta === 0) return
    racerReportElapsedRef.current += elapsedTimeDelta
    if (finishedRef.current) {
      // Do not turn a finished racer into an immovable obstacle on the finish
      // line. Repeatedly overwriting velocity with zero makes a following
      // player's perfectly normal contact look like a sudden physics stop.
      // With no more drive impulses, ordinary body damping lets it coast down
      // while remaining a physically movable 1,200kg chassis.
      const finishedPosition = bodyRef.current.translation()
      const finishedVelocity = bodyRef.current.linvel()
      if (!window.racerPositions) window.racerPositions = {}
      const racerPosObj = racerPosObjRef.current
      racerPosObj.x = finishedPosition.x
      racerPosObj.z = finishedPosition.z
      racerPosObj.vx = finishedVelocity.x
      racerPosObj.vz = finishedVelocity.z
      window.racerPositions[myId] = racerPosObj
      return
    }
    currentTimeRef.current += elapsedTimeDelta
    
    const pos = bodyRef.current.translation()
    const rot = bodyRef.current.rotation()
    const linVel = bodyRef.current.linvel()
    
    // Fall-off recovery is relative to the road at the last trusted progress.
    // An absolute world-Y threshold turns an ordinary low-elevation section
    // into a false respawn as soon as the track gains elevation changes.
    trackCurve.getPointAt(progressRef.current, tempCurvePoint)
    if (isClearlyBelowTrack(pos.y, tempCurvePoint.y)) {
       const checkpointCount = Number.isFinite(totalCheckpoints) && totalCheckpoints > 0
         ? Math.floor(totalCheckpoints)
         : 10
       const nextCheckpointIndex = Number.isFinite(nextCheckpointIndexRef.current)
         ? Math.min(checkpointCount - 1, Math.max(0, Math.floor(nextCheckpointIndexRef.current)))
         : 0
       const hasNotReachedFirstCheckpoint = lapRef.current === 1
         && nextCheckpointIndex === 1
         && lastCheckpointTimeRef.current === 0
       const recoveryCheckpointIndex = (nextCheckpointIndex - 1 + checkpointCount) % checkpointCount
       const recoveryProgress = hasNotReachedFirstCheckpoint
         ? startPose.progress
         : recoveryCheckpointIndex / checkpointCount
       if (hasNotReachedFirstCheckpoint) {
         tempCurvePoint.copy(startPose.point)
         tempTangent.copy(startPose.tangent)
       } else {
         trackCurve.getPointAt(recoveryProgress, tempCurvePoint)
         trackCurve.getTangentAt(recoveryProgress, tempTangent)
       }
       tempTangent.y = 0
       tempTangent.normalize()
       tempCarQuaternion.setFromUnitVectors(tempForward.set(0, 0, -1), tempTangent)

       // Never materialize a recovered AI on top of a live racer. If the
       // checkpoint area is occupied, leave it out of play and retry later.
       let recoveryOccupied = false
       if (window.racerPositions) {
         for (const racerId in window.racerPositions) {
           if (racerId === myId) continue
           const racerPosition = window.racerPositions[racerId]
           if (!racerPosition) continue
           const dx = racerPosition.x - tempCurvePoint.x
           const dz = racerPosition.z - tempCurvePoint.z
           if (dx * dx + dz * dz < 9) {
             recoveryOccupied = true
             break
           }
         }
       }
       if (recoveryOccupied) return

       bodyRef.current.setTranslation({ x: tempCurvePoint.x, y: tempCurvePoint.y + 1, z: tempCurvePoint.z }, true)
       bodyRef.current.setLinvel({
         x: tempTangent.x * FALL_RECOVERY_SPEED,
         y: 0,
         z: tempTangent.z * FALL_RECOVERY_SPEED
       }, true)
       bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
       bodyRef.current.setRotation(tempCarQuaternion, true)
       recordRuntimeDiagnostic(RUNTIME_EVENT_ID.AI_FALL_RECOVERY, {
         causeId: 'confirmed-below-track',
         racerId: myId,
         raceSessionId,
         from: snapshotVector(pos),
         to: { x: tempCurvePoint.x, y: tempCurvePoint.y + 1, z: tempCurvePoint.z },
         recoverySpeed: FALL_RECOVERY_SPEED,
       })
       progressRef.current = recoveryProgress

       progressGuardRef.current = createProgressGuardState()
       updateProgressGuardState(
         progressGuardRef.current,
         { x: tempCurvePoint.x, y: tempCurvePoint.y + 1, z: tempCurvePoint.z },
         recoveryProgress,
         hasNotReachedFirstCheckpoint ? Math.abs(startPose.lateralOffset) : 0,
         FALL_RECOVERY_SPEED,
         Math.max(frameDelta, 1 / 120),
         trackLength
       )

       // Falling off is a physical recovery, not a new race. Preserve all
       // checkpoint, lap, and timing state so AI racers receive the same
       // recovery semantics as the player.
       stuckTimerRef.current = 0
       recoveryStateRef.current = 'normal'
       recoveryTimerRef.current = 0
       recoverySteerDirRef.current = 0
       checkpointStallTimerRef.current = 0
       checkpointAgeRef.current = 0
       progressWatchAnchorRef.current = recoveryProgress
       projectionElapsedRef.current = 1 / 30
       routePlanElapsedRef.current = 1 / 30
       plannedTargetSpeedRef.current = opponentTopSpeed
       controlledTargetSpeedRef.current = opponentTopSpeed
       plannedDirectionRef.current.copy(tempTangent)
       driveCommandRef.current.engineForce = 0
       driveCommandRef.current.brakeForce = 0
       driveCommandRef.current.steeringInput = 0
       driveCommandRef.current.gripScale = 1

       if (!window.racerProgress) window.racerProgress = {}
       if (!window.racerPositions) window.racerPositions = {}
       window.racerProgress[myId] = calculateLiveRaceScore(
         lapRef.current,
         nextCheckpointIndexRef.current,
         recoveryProgress
       )
       const racerPosObj = racerPosObjRef.current
       racerPosObj.x = tempCurvePoint.x
       racerPosObj.z = tempCurvePoint.z
       racerPosObj.vx = tempTangent.x * FALL_RECOVERY_SPEED
       racerPosObj.vz = tempTangent.z * FALL_RECOVERY_SPEED
       window.racerPositions[myId] = racerPosObj

       updateRacerProgress(
         myId,
         lapRef.current,
         nextCheckpointIndexRef.current,
         lastCheckpointTimeRef.current,
         finishedRef.current,
         totalTimeRef.current,
         currentTimeRef.current,
         raceSessionId
       )
       racerReportElapsedRef.current = 0.1
       return
    }

    tempCarQuaternion.set(rot.x, rot.y, rot.z, rot.w)
    const forwardVector = tempForward.set(0, 0, -1).applyQuaternion(tempCarQuaternion)
    forwardVector.y = 0
    if (forwardVector.lengthSq() < 1e-6) {
      forwardVector.set(0, 0, -1)
    } else {
      forwardVector.normalize()
    }
    const rightVector = tempRight.set(-forwardVector.z, 0, forwardVector.x)

    tempVelocity.set(linVel.x, linVel.y, linVel.z)
    const currentSpeed = Math.hypot(tempVelocity.x, tempVelocity.z)
    const forwardSpeed = tempVelocity.dot(forwardVector)
    checkpointAgeRef.current += frameDelta
    
    // 1. Zero-allocation path projection onto trackCurve using local sampling + Ternary Search
    const previousT = progressRef.current
    const estimatedProgress = wrapProgress(previousT + (forwardSpeed * frameDelta) / (trackLength || 1))
    tempCarPos.set(pos.x, pos.y, pos.z)
    projectionElapsedRef.current += frameDelta
    if (projectionElapsedRef.current >= 1 / 30 || frameDelta >= 0.1) {
      progressRef.current = projectPositionToCurve(trackCurve, trackLength, tempCarPos, estimatedProgress)
      projectionElapsedRef.current %= 1 / 30
    } else {
      progressRef.current = estimatedProgress
    }

    const currentT = progressRef.current
    laneMergeDistanceRef.current = advanceAIMergeDistance(
      laneMergeDistanceRef.current,
      previousT,
      currentT,
      trackLength,
    )
    const laneTargetOffset = getAIMergeLateralOffset(
      startPose.lateralOffset,
      laneMergeDistanceRef.current,
      track.roadWidth,
      data.laneBias,
    )
    const watchedProgressAdvance = getSignedWrappedProgressDelta(
      progressWatchAnchorRef.current,
      currentT
    )
    if (watchedProgressAdvance > 0.005) {
      progressWatchAnchorRef.current = currentT
      checkpointStallTimerRef.current = 0
    } else {
      checkpointStallTimerRef.current += frameDelta
    }
    trackCurve.getPointAt(currentT, tempCurvePoint)
    trackCurve.getTangentAt(currentT, tempTangent)
    tempTangent.y = 0
    tempTangent.normalize()
    const centerlineDistance = tempCarPos.distanceTo(tempCurvePoint)

    // Route failures request the existing physical reverse/realign controller.
    // They must never teleport an AI into an occupied lane or silently reset
    // its speed; that could also stop the player through a solver collision.
    const checkpointTimedOut = checkpointAgeRef.current > Math.max(12, trackLength / 75)
    const checkpointStalled = checkpointStallTimerRef.current > 8 || checkpointTimedOut
    if (centerlineDistance > 9 || checkpointStalled) {
      if (recoveryStateRef.current === 'normal') {
        recoveryStateRef.current = 'reversing'
        recoveryTimerRef.current = 1.2
        tempTrackRight.copy(tempTangent).cross(UP_VECTOR).normalize()
        tempVecToCar.set(pos.x - tempCurvePoint.x, 0, pos.z - tempCurvePoint.z)
        const side = tempVecToCar.dot(tempTrackRight)
        recoverySteerDirRef.current = side > 0 ? 0.8 : -0.8
      }
      checkpointStallTimerRef.current = 0
      checkpointAgeRef.current = 0
      progressWatchAnchorRef.current = currentT
    }

    const hasContinuousProgress = updateProgressGuardState(
      progressGuardRef.current,
      pos,
      currentT,
      centerlineDistance,
      currentSpeed,
      elapsedTimeDelta,
      trackLength
    )
    const confirmedForwardSeamCrossing = didConfirmForwardSeamCrossing(
      progressGuardRef.current
    )

    // 2. Wall avoidance uses the selected venue's physical road width and the
    // shared chassis collider half-width. The barrier inner face sits exactly
    // at roadWidth / 2, so this is the remaining centre-point clearance.
    tempTrackRight.copy(tempTangent).cross(UP_VECTOR).normalize()
    tempVecToCar.set(pos.x - tempCurvePoint.x, 0, pos.z - tempCurvePoint.z)
    const lateralOffset = tempVecToCar.dot(tempTrackRight)
    const wallAvoidanceSteer = getTrackEdgeAvoidanceSteer(
      lateralOffset,
      track.roadWidth,
      laneTargetOffset,
    )

    // 3. Car-to-car avoidance: slow down if another car is ahead, steer away if laterally close
    let carAvoidanceSteer = 0
    let trafficTargetSpeed = opponentTopSpeed

    if (window.racerPositions) {
      for (const id in window.racerPositions) {
        if (Object.prototype.hasOwnProperty.call(window.racerPositions, id)) {
          if (id === myId) continue
          const otherCar = window.racerPositions[id]
          if (!otherCar) continue
          const dx = otherCar.x - pos.x
          const dz = otherCar.z - pos.z
          const distance = Math.sqrt(dx * dx + dz * dz)

          if (distance < AI_TRAFFIC_SCAN_DISTANCE) {
            tempRelVec.set(dx, 0, dz)
            const forwardDist = tempRelVec.dot(forwardVector)
            const lateralDist = tempRelVec.dot(rightVector)

            const otherForwardSpeed = Number.isFinite(otherCar.vx)
              && Number.isFinite(otherCar.vz)
              ? otherCar.vx * forwardVector.x + otherCar.vz * forwardVector.z
              : Number.NaN
            trafficTargetSpeed = Math.min(
              trafficTargetSpeed,
              getAITrafficTargetSpeed(
                opponentTopSpeed,
                forwardDist,
                lateralDist,
                forwardSpeed,
                otherForwardSpeed,
              ),
            )
            carAvoidanceSteer += getNearbyCarAvoidanceSteer(
              distance,
              forwardDist,
              lateralDist,
            )
          }
        }
      }
    }

    // 4. Route planning runs at 30Hz while physical impulses run at fixed 60Hz.
    // Holding the last target between plans avoids redundant curve/acos work
    // without changing Rapier integration or the 25m checkpoint gate.
    routePlanElapsedRef.current += frameDelta
    if (routePlanElapsedRef.current >= 1 / 30 || frameDelta >= 0.1) {
      const speedVal = Math.max(0, forwardSpeed)
      const steerDistance = 6 + 0.6 * speedVal
      const brakingDistance = 6 + 0.8 * speedVal + (speedVal * speedVal) / 24
      const lookAheadProgress = wrapProgress(
        progressRef.current + steerDistance / (trackLength || 1)
      )
      trackCurve.getPointAt(lookAheadProgress, tempCurvePoint)
      trackCurve.getTangentAt(lookAheadProgress, tempSampleTangent)
      tempSampleTangent.y = 0
      tempSampleTangent.normalize()
      tempTrackRight.copy(tempSampleTangent).cross(UP_VECTOR).normalize()
      tempCurvePoint.addScaledVector(tempTrackRight, laneTargetOffset)
      plannedDirectionRef.current
        .set(tempCurvePoint.x - pos.x, 0, tempCurvePoint.z - pos.z)
        .normalize()

      let maxCurvature = 0
      const sampleDistance = brakingDistance / 4
      for (let index = 1; index <= 4; index += 1) {
        const distance = index * sampleDistance
        const sampleProgress = wrapProgress(
          progressRef.current + distance / (trackLength || 1)
        )
        trackCurve.getTangentAt(sampleProgress, tempSampleTangent)
        const angle = Math.acos(THREE.MathUtils.clamp(
          tempTangent.dot(tempSampleTangent),
          -1,
          1
        ))
        maxCurvature = Math.max(maxCurvature, angle / (distance || 1))
      }
      const safeSpeed = Math.sqrt(
        VEHICLE_DYNAMICS.lateralGripAcceleration / (maxCurvature + 1e-4)
      )
      plannedTargetSpeedRef.current = Math.min(
        opponentTopSpeed,
        safeSpeed * data.paceScale,
      )
      routePlanElapsedRef.current %= 1 / 30
    }
    tempDirToTarget.copy(plannedDirectionRef.current)
    // Smooth route-curvature changes to avoid throttle/brake chatter. A nearby
    // car remains an immediate safety constraint and is applied afterwards,
    // so continuity never delays collision avoidance.
    const desiredTargetSpeed = plannedTargetSpeedRef.current
    const targetRate = desiredTargetSpeed < controlledTargetSpeedRef.current
      ? VEHICLE_DYNAMICS.targetDeceleration
      : VEHICLE_DYNAMICS.targetAcceleration
    controlledTargetSpeedRef.current = moveTowards(
      controlledTargetSpeedRef.current,
      desiredTargetSpeed,
      targetRate * frameDelta,
    )
    const finalTargetSpeed = Math.min(controlledTargetSpeedRef.current, trafficTargetSpeed)
    const speedError = finalTargetSpeed - forwardSpeed

    let engineForce = 0
    let brakeForce = 0
    const maxEngineForce = getForwardEngineForce(Math.abs(forwardSpeed))
    const maxBrakeForce = getBrakingForce(Math.abs(forwardSpeed))

    let steerDir = 0

    // 5. 3-state stuck recovery machine
    if (recoveryStateRef.current === 'reversing') {
      recoveryTimerRef.current -= frameDelta
      // Recovery changes the requested direction, not the vehicle's available
      // performance. Use the same reverse force as the player controller.
      engineForce = -VEHICLE_DYNAMICS.reverseEngineForce
      brakeForce = 0
      steerDir = recoverySteerDirRef.current

      if (recoveryTimerRef.current <= 0) {
        recoveryStateRef.current = 'realigning'
        recoveryTimerRef.current = 0.8
      }
    } else if (recoveryStateRef.current === 'realigning') {
      recoveryTimerRef.current -= frameDelta
      engineForce = maxEngineForce
      brakeForce = 0
      steerDir = lateralOffset > 0 ? -0.8 : 0.8

      if (recoveryTimerRef.current <= 0) {
        recoveryStateRef.current = 'normal'
        stuckTimerRef.current = 0
      }
    } else {
      // normal driving
      if (speedError > VEHICLE_DYNAMICS.speedControlDeadband) {
        const throttle = Math.min(1.0, speedError / 5.0)
        engineForce = maxEngineForce * throttle
      } else if (speedError < -VEHICLE_DYNAMICS.speedControlDeadband) {
        const brake = Math.min(1.0, -speedError / 3.0)
        brakeForce = maxBrakeForce * brake
      }

      const baseSteer = rightVector.dot(tempDirToTarget)
      steerDir = Math.max(-1.2, Math.min(1.2, baseSteer + wallAvoidanceSteer + carAvoidanceSteer))

      // Stuck detection: speed remains < 1 m/s while throttle is applied
      if (currentSpeed < 1.0 && Math.abs(engineForce) > 500 && speedError > 1.0) {
        stuckTimerRef.current += frameDelta
        if (stuckTimerRef.current > 1.5) {
          recoveryStateRef.current = 'reversing'
          recoveryTimerRef.current = 1.2
          recoverySteerDirRef.current = lateralOffset > 0 ? 0.8 : -0.8
        }
      } else {
        stuckTimerRef.current = 0
      }
    }

    const steeringInput = THREE.MathUtils.clamp(-steerDir, -1, 1)
    const brakingInput = maxBrakeForce > 0 ? brakeForce / maxBrakeForce : 0
    const gripScale = getContinuousGripScale(
      currentSpeed,
      steeringInput,
      brakingInput,
    )
    driveCommandRef.current.engineForce = engineForce
    driveCommandRef.current.brakeForce = brakeForce
    driveCommandRef.current.steeringInput = steeringInput
    driveCommandRef.current.gripScale = gripScale

    // Checkpoint proximity detection
    const aiCPProgress = nextCheckpointIndexRef.current / (totalCheckpoints || 1)
    trackCurve.getPointAt(aiCPProgress, tempCurvePoint)
    
    const dx = pos.x - tempCurvePoint.x
    const dy = pos.y - tempCurvePoint.y
    const dz = pos.z - tempCurvePoint.z
    const cpDist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    const isMoving = currentSpeed > 0.2
    const movingAgainstTrack = tempVelocity.dot(tempTangent) < -0.2
    const facingAgainstTrack = forwardVector.dot(tempTangent) < -0.2
    const hasValidCheckpointDirection = !facingAgainstTrack && (!isMoving || !movingAgainstTrack)

    let progressChangedThisFrame = false
    const reachedCheckpoint = nextCheckpointIndexRef.current === 0
      ? hasCrossedFinishLine(previousT, currentT) || confirmedForwardSeamCrossing
      : cpDist < 25
    const hasCheckpointContinuity = hasContinuousProgress
      || (nextCheckpointIndexRef.current === 0 && confirmedForwardSeamCrossing)
    if (reachedCheckpoint && hasValidCheckpointDirection && hasCheckpointContinuity) {
      const aiState = {
        nextCheckpointIndex: nextCheckpointIndexRef.current,
        totalCheckpoints: totalCheckpoints,
        lap: lapRef.current,
        maxLaps: maxLaps,
        bestLapTime: bestLapTimeRef.current,
        currentTime: currentTimeRef.current,
        totalTime: totalTimeRef.current,
        gameState: 'playing'
      }
      
      const updatedAIState = handleCheckpointPass(aiState, nextCheckpointIndexRef.current)
      if (updatedAIState !== aiState) {
        progressChangedThisFrame = true
        checkpointStallTimerRef.current = 0
        checkpointAgeRef.current = 0
        progressWatchAnchorRef.current = progressRef.current
        if (Number.isFinite(updatedAIState.nextCheckpointIndex)) {
          nextCheckpointIndexRef.current = updatedAIState.nextCheckpointIndex
        }
        if (Number.isFinite(updatedAIState.lap)) {
          lapRef.current = updatedAIState.lap
        }
        if (Number.isFinite(updatedAIState.bestLapTime)) {
          bestLapTimeRef.current = updatedAIState.bestLapTime
        }
        currentTimeRef.current = Number.isFinite(updatedAIState.currentTime) ? updatedAIState.currentTime : 0
        if (Number.isFinite(updatedAIState.totalTime)) {
          totalTimeRef.current = updatedAIState.totalTime
        }
        lastCheckpointTimeRef.current = updatedAIState.gameState === 'finished'
          ? totalTimeRef.current
          : totalTimeRef.current + currentTimeRef.current
        if (updatedAIState.gameState === 'finished') {
          finishedRef.current = true
        }
      }
    }
    
    // Update global progress for position calculation
    if (!window.racerProgress) window.racerProgress = {}
    if (!window.racerPositions) window.racerPositions = {}
    
    window.racerProgress[myId] = calculateLiveRaceScore(
      lapRef.current,
      nextCheckpointIndexRef.current,
      progressRef.current
    )
    
    const racerPosObj = racerPosObjRef.current
    racerPosObj.x = pos.x
    racerPosObj.z = pos.z
    racerPosObj.vx = linVel.x
    racerPosObj.vz = linVel.z
    window.racerPositions[myId] = racerPosObj

    // Regularly report AI's race metrics to the store
    if (progressChangedThisFrame || racerReportElapsedRef.current >= 0.1) {
      updateRacerProgress(
        myId,
        lapRef.current,
        nextCheckpointIndexRef.current,
        lastCheckpointTimeRef.current,
        finishedRef.current,
        totalTimeRef.current,
        currentTimeRef.current,
        raceSessionId
      )
      racerReportElapsedRef.current %= 0.1
    }
  })

  return (
    <RigidBody 
      ref={bodyRef}
      name={myId}
      position={startPose.position}
      rotation={[0, startPose.yaw, 0]}
      colliders={false}
      linearDamping={VEHICLE_DYNAMICS.linearDamping}
      angularDamping={VEHICLE_DYNAMICS.angularDamping}
      enabledRotations={[false, true, false]}
    >
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
      <group>
        <FormulaCar
          color={data.color}
          accent={data.accent}
          detail={visualDetail}
          rigidBodyRef={bodyRef}
        />
      </group>
    </RigidBody>
  )
}
