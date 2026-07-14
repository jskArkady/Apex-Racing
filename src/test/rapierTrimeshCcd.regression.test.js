import { beforeAll, describe, expect, it } from 'vitest'
import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import {
  createRoadColliderGeometry,
  ROAD_SEGMENTS,
} from '../components/trackGeometry'
import { TRACK_PRESETS, trackCurve } from '../utils/trackData'
import {
  calculateVehicleActuation,
  getForwardEngineForce,
  VEHICLE_DYNAMICS,
} from '../utils/vehicleDynamics'

beforeAll(async () => {
  await RAPIER.init()
})

function runRoadContactSimulation(ccdEnabled) {
  const geometry = createRoadColliderGeometry(trackCurve)
  const vertices = geometry.getAttribute('position').array
  const indices = Uint32Array.from(geometry.getIndex().array)
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  world.timestep = VEHICLE_DYNAMICS.physicsStep

  const roadBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
  world.createCollider(
    RAPIER.ColliderDesc.trimesh(
      vertices,
      indices,
      RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES,
    ).setFriction(1.25).setRestitution(0.02),
    roadBody,
  )

  const progress = 0.005
  const point = trackCurve.getPointAt(progress)
  const tangent = trackCurve.getTangentAt(progress).setY(0).normalize()
  const yaw = Math.atan2(-tangent.x, -tangent.z)
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(point.x, point.y + 1, point.z)
      .setRotation({
        x: 0,
        y: Math.sin(yaw / 2),
        z: 0,
        w: Math.cos(yaw / 2),
      })
      .setLinearDamping(VEHICLE_DYNAMICS.linearDamping)
      .setAngularDamping(VEHICLE_DYNAMICS.angularDamping)
      .enabledRotations(false, true, false)
      .setCcdEnabled(ccdEnabled),
  )
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(1, 0.45, 2)
      .setTranslation(0, 0.45, 0)
      .setMass(VEHICLE_DYNAMICS.mass)
      .setFriction(0)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
      .setRestitution(0.2),
    body,
  )

  for (let step = 0; step < 90; step += 1) world.step()
  body.setLinvel({
    x: tangent.x * VEHICLE_DYNAMICS.nominalTopSpeed,
    y: 0,
    z: tangent.z * VEHICLE_DYNAMICS.nominalTopSpeed,
  }, true)

  let previousSpeed = VEHICLE_DYNAMICS.nominalTopSpeed
  let maximumStepLoss = 0
  for (let step = 0; step < 30; step += 1) {
    world.step()
    const velocity = body.linvel()
    const speed = Math.hypot(velocity.x, velocity.z)
    maximumStepLoss = Math.max(maximumStepLoss, previousSpeed - speed)
    previousSpeed = speed
  }

  const result = { finalSpeed: previousSpeed, maximumStepLoss }
  geometry.dispose()
  world.free()
  return result
}

function runProductionRoadStep(track, progress, initialSpeed) {
  const samples = Math.max(ROAD_SEGMENTS, Math.ceil(track.length / 3.5))
  const geometry = createRoadColliderGeometry(track.curve, samples, track.roadWidth)
  const vertices = geometry.getAttribute('position').array
  const indices = Uint32Array.from(geometry.getIndex().array)
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  world.timestep = VEHICLE_DYNAMICS.physicsStep

  const roadBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
  world.createCollider(
    RAPIER.ColliderDesc.trimesh(
      vertices,
      indices,
      RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES,
    ).setFriction(1.25).setRestitution(0.02),
    roadBody,
  )

  const point = track.curve.getPointAt(progress)
  const tangent = track.curve.getTangentAt(progress).setY(0).normalize()
  const yaw = Math.atan2(-tangent.x, -tangent.z)
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(point.x, point.y + 1, point.z)
      .setRotation({
        x: 0,
        y: Math.sin(yaw / 2),
        z: 0,
        w: Math.cos(yaw / 2),
      })
      .setLinearDamping(VEHICLE_DYNAMICS.linearDamping)
      .setAngularDamping(VEHICLE_DYNAMICS.angularDamping)
      .enabledRotations(false, true, false)
      .setCcdEnabled(false),
  )
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(1, 0.45, 2)
      .setTranslation(0, 0.45, 0)
      .setMass(VEHICLE_DYNAMICS.mass)
      .setFriction(0)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
      .setRestitution(0.2),
    body,
  )

  for (let step = 0; step < 75; step += 1) world.step()
  const rotationBefore = body.rotation()
  body.setLinvel({
    x: tangent.x * initialSpeed,
    y: 0,
    z: tangent.z * initialSpeed,
  }, true)
  world.step()

  const velocity = body.linvel()
  const finalSpeed = Math.hypot(velocity.x, velocity.z)
  const rotationAfter = body.rotation()
  const quaternionDot = (
    rotationBefore.x * rotationAfter.x
    + rotationBefore.y * rotationAfter.y
    + rotationBefore.z * rotationAfter.z
    + rotationBefore.w * rotationAfter.w
  )
  const headingChange = 2 * Math.acos(Math.min(1, Math.abs(quaternionDot)))
  const result = {
    finalSpeed,
    speedLoss: initialSpeed - finalSpeed,
    headingChange,
  }
  geometry.dispose()
  world.free()
  return result
}

function runBarrierEscapeSimulation(escapeEnabled = true) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  world.timestep = VEHICLE_DYNAMICS.physicsStep
  const ground = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0),
  )
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(20, 0.5, 20).setFriction(1.25),
    ground,
  )
  const barrier = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1, -6),
  )
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(10, 1, 0.25)
      .setFriction(0.15)
      .setRestitution(0.12),
    barrier,
  )
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 0.01, 0)
      .setLinearDamping(VEHICLE_DYNAMICS.linearDamping)
      .setAngularDamping(VEHICLE_DYNAMICS.angularDamping)
      .enabledRotations(false, true, false)
      .setCcdEnabled(false),
  )
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(1, 0.45, 2)
      .setTranslation(0, 0.45, 0)
      .setMass(VEHICLE_DYNAMICS.mass)
      .setFriction(0)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
      .setRestitution(0.2),
    body,
  )
  body.setLinvel({ x: 0, y: 0, z: -13 }, true)

  const forward = new THREE.Vector3()
  const right = new THREE.Vector3()
  const velocity = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  let stalledSeconds = 0
  let currentStoppedSteps = 0
  let maximumStoppedSteps = 0
  let escapeActivated = false

  for (let step = 0; step < 360; step += 1) {
    const rotation = body.rotation()
    const linearVelocity = body.linvel()
    quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    forward.set(0, 0, -1).applyQuaternion(quaternion).setY(0).normalize()
    right.set(-forward.z, 0, forward.x)
    velocity.set(linearVelocity.x, linearVelocity.y, linearVelocity.z)
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z)
    const forwardSpeed = velocity.dot(forward)
    const actuation = calculateVehicleActuation({
      engineForce: getForwardEngineForce(Math.abs(forwardSpeed)),
      steeringInput: 1,
      forwardSpeed,
      lateralSpeed: velocity.dot(right),
      mass: body.mass(),
      delta: VEHICLE_DYNAMICS.physicsStep,
    })
    stalledSeconds = horizontalSpeed < VEHICLE_DYNAMICS.collisionEscapeMaxSpeed
      ? stalledSeconds + actuation.controlDelta
      : 0
    const escapeActive = escapeEnabled
      && stalledSeconds >= VEHICLE_DYNAMICS.collisionEscapeArmSeconds
    escapeActivated ||= escapeActive

    body.applyImpulse({
      x: forward.x * actuation.forwardImpulse + right.x * actuation.lateralImpulse,
      y: 0,
      z: forward.z * actuation.forwardImpulse + right.z * actuation.lateralImpulse,
    }, true)
    body.applyTorqueImpulse({ x: 0, y: actuation.steeringImpulse, z: 0 }, true)
    const angularVelocity = body.angvel()
    const minimumYawRate = escapeActive
      ? VEHICLE_DYNAMICS.collisionEscapeYawRate
      : 0.22 + actuation.steeringSpeedFactor * 0.28
    if (Math.abs(angularVelocity.y) < minimumYawRate) {
      const blend = escapeActive ? 1 : Math.min(10 * actuation.controlDelta, 1)
      body.setAngvel({
        x: angularVelocity.x,
        y: THREE.MathUtils.lerp(angularVelocity.y, minimumYawRate, blend),
        z: angularVelocity.z,
      }, true)
    }

    world.step()
    const outputVelocity = body.linvel()
    const outputSpeed = Math.hypot(outputVelocity.x, outputVelocity.z)
    if (step > 45 && outputSpeed <= 0.5) {
      currentStoppedSteps += 1
      maximumStoppedSteps = Math.max(maximumStoppedSteps, currentStoppedSteps)
    } else {
      currentStoppedSteps = 0
    }
  }

  const finalVelocity = body.linvel()
  const result = {
    finalSpeed: Math.hypot(finalVelocity.x, finalVelocity.z),
    maximumStoppedSteps,
    escapeActivated,
  }
  world.free()
  return result
}

describe('actual Rapier road contact regression', () => {
  it('does not let the top-surface trimesh erase speed with either CCD setting', () => {
    const withoutCcd = runRoadContactSimulation(false)
    const withCcd = runRoadContactSimulation(true)

    expect(withoutCcd.maximumStepLoss).toBeLessThan(1)
    expect(withoutCcd.finalSpeed).toBeGreaterThan(40)
    expect(withCcd.maximumStepLoss).toBeLessThan(1)
    expect(withCcd.finalSpeed).toBeGreaterThan(40)
  })

  it.each([
    ['Apex representative', 'apex', 0.5],
    ['Harbour former ghost edge', 'harbour', 0.75],
    ['Temple former ghost edge', 'temple', 0.3359375],
  ])('preserves speed and heading on the production road surface at %s', (
    _label,
    venue,
    progress,
  ) => {
    const track = TRACK_PRESETS.find(preset => preset.venue === venue)

    for (const initialSpeed of [20, 30]) {
      const result = runProductionRoadStep(track, progress, initialSpeed)

      expect(result.speedLoss).toBeLessThan(1)
      expect(result.finalSpeed).toBeGreaterThan(initialSpeed * 0.9)
      expect(THREE.MathUtils.radToDeg(result.headingChange)).toBeLessThan(5)
    }
  })

  it('escapes a barrier contact while throttle and steering remain held', () => {
    const withoutEscape = runBarrierEscapeSimulation(false)
    const result = runBarrierEscapeSimulation(true)

    expect(withoutEscape.maximumStoppedSteps).toBeGreaterThan(60)
    expect(withoutEscape.finalSpeed).toBeLessThan(0.5)
    expect(result.escapeActivated).toBe(true)
    expect(result.maximumStoppedSteps).toBeLessThan(60)
    expect(result.finalSpeed).toBeGreaterThan(2)
  })
})
