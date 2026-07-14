import { describe, expect, it } from 'vitest'
import {
  AI_CAR_AVOIDANCE_MAX_STEER,
  AI_LANE_MERGE_DISTANCE,
  advanceAIMergeDistance,
  calculateVehicleActuation,
  getAIMergeLateralOffset,
  getAITrafficTargetSpeed,
  getBrakingForce,
  getContinuousGripScale,
  getForwardEngineForce,
  getLateralCorrectionDelta,
  getNearbyCarAvoidanceSteer,
  getSteeringSpeedFactor,
  getTrackEdgeAvoidanceSteer,
  moveTowards,
  TRACK_EDGE_AVOIDANCE_MAX_STEER,
  VEHICLE_COLLIDER_HALF_EXTENTS,
  VEHICLE_DYNAMICS
} from './vehicleDynamics'

describe('shared vehicle dynamics', () => {
  it('defines one 1,200kg performance envelope for player and AI controllers', () => {
    expect(VEHICLE_DYNAMICS.mass).toBe(1200)
    expect(VEHICLE_DYNAMICS.launchEngineForce / VEHICLE_DYNAMICS.mass).toBe(10)
    expect(VEHICLE_DYNAMICS.maxEngineForce / VEHICLE_DYNAMICS.mass).toBe(15)
    expect(VEHICLE_DYNAMICS.reverseEngineForce / VEHICLE_DYNAMICS.mass).toBe(7.5)
    expect(VEHICLE_DYNAMICS.brakingForce / VEHICLE_DYNAMICS.mass).toBe(15)
    expect(VEHICLE_DYNAMICS.highSpeedBrakingForce / VEHICLE_DYNAMICS.mass).toBe(20)
    expect(VEHICLE_DYNAMICS.linearDamping).toBe(0.3)
    expect(VEHICLE_DYNAMICS.angularDamping).toBe(5)
    expect(VEHICLE_DYNAMICS.nominalTopSpeed).toBe(55)
  })

  it('uses the same acceleration ramp and braking forces', () => {
    expect(getForwardEngineForce(0)).toBe(VEHICLE_DYNAMICS.launchEngineForce)
    expect(getForwardEngineForce(30)).toBe(VEHICLE_DYNAMICS.maxEngineForce)
    expect(getForwardEngineForce(VEHICLE_DYNAMICS.nominalTopSpeed)).toBe(0)
    expect(getForwardEngineForce(VEHICLE_DYNAMICS.nominalTopSpeed + 20)).toBe(0)
    expect(getBrakingForce(0)).toBe(VEHICLE_DYNAMICS.brakingForce)
    expect(getBrakingForce(20)).toBe(VEHICLE_DYNAMICS.highSpeedBrakingForce)
    expect(getBrakingForce(20, true)).toBe(VEHICLE_DYNAMICS.emergencyBrakingForce)
  })

  it('caps lateral correction by acceleration instead of velocity percentage', () => {
    expect(getLateralCorrectionDelta(40, 1 / 60)).toBeCloseTo(-10 / 60)
    expect(getLateralCorrectionDelta(-40, 1 / 60)).toBeCloseTo(10 / 60)
    expect(getLateralCorrectionDelta(40, 1 / 60, 0.6)).toBeCloseTo(-6 / 60)
    expect(getLateralCorrectionDelta(0.05, 1 / 60)).toBeCloseTo(-0.05)
    expect(getLateralCorrectionDelta(Number.NaN, 1 / 60)).toBe(0)
  })

  it('produces frame-rate independent impulse totals from fixed physics steps', () => {
    const oneStep = calculateVehicleActuation({
      engineForce: VEHICLE_DYNAMICS.launchEngineForce,
      forwardSpeed: 0,
      lateralSpeed: 0,
      delta: VEHICLE_DYNAMICS.physicsStep,
    })
    const twelveStepTotal = oneStep.forwardImpulse * 12
    expect(twelveStepTotal).toBeCloseTo(
      VEHICLE_DYNAMICS.launchEngineForce * 0.2,
      8,
    )
    expect(oneStep.controlDelta).toBe(VEHICLE_DYNAMICS.physicsStep)
  })

  it('clamps braking to remaining momentum without reversing at low speed', () => {
    const actuation = calculateVehicleActuation({
      engineForce: VEHICLE_DYNAMICS.launchEngineForce,
      brakingForce: VEHICLE_DYNAMICS.emergencyBrakingForce,
      forwardSpeed: 0.1,
      lateralSpeed: 0,
      mass: VEHICLE_DYNAMICS.mass,
      delta: VEHICLE_DYNAMICS.physicsStep,
    })
    expect(actuation.forwardImpulse).toBeCloseTo(-120)
  })

  it('lets braking dominate throttle continuously through zero speed', () => {
    const impulseAt = forwardSpeed => calculateVehicleActuation({
      engineForce: VEHICLE_DYNAMICS.launchEngineForce,
      brakingForce: VEHICLE_DYNAMICS.emergencyBrakingForce,
      forwardSpeed,
      lateralSpeed: 0,
      mass: VEHICLE_DYNAMICS.mass,
      delta: VEHICLE_DYNAMICS.physicsStep,
    }).forwardImpulse

    expect(impulseAt(0)).toBe(0)
    expect(impulseAt(-0.001)).toBeCloseTo(1.2)
    expect(impulseAt(0.001)).toBeCloseTo(-1.2)
    expect(Math.abs(impulseAt(-0.001) - impulseAt(0.001))).toBeLessThan(3)
  })

  it('varies synthetic grip continuously around the former 30m/s boundary', () => {
    const below = getContinuousGripScale(29.999, 1, 0)
    const at = getContinuousGripScale(30, 1, 0)
    const above = getContinuousGripScale(30.001, 1, 0)

    expect(below).toBeGreaterThan(at)
    expect(at).toBeGreaterThan(above)
    expect(Math.abs(below - above)).toBeLessThan(0.001)
    expect(getContinuousGripScale(0, 1, 0)).toBe(1)
    expect(getContinuousGripScale(55, 1, 0)).toBe(0.6)
    expect(getContinuousGripScale(20, 0, 0.5)).toBe(0.8)
  })

  it('keeps shared steering and target-speed transitions continuous', () => {
    expect(getSteeringSpeedFactor(0)).toBe(0.22)
    expect(getSteeringSpeedFactor(12)).toBe(1)
    expect(getSteeringSpeedFactor(55)).toBe(0.4)
    expect(moveTowards(55, 20, 0.8)).toBeCloseTo(54.2)
    expect(moveTowards(20, 55, 0.5)).toBeCloseTo(20.5)
  })

  it('derives AI edge avoidance from each road width and the shared collider', () => {
    expect(VEHICLE_COLLIDER_HALF_EXTENTS).toEqual({ width: 1, height: 0.45, length: 2 })
    expect(getTrackEdgeAvoidanceSteer(0, 14.4)).toBe(0)
    expect(getTrackEdgeAvoidanceSteer(5.4, 16)).toBeCloseTo(-0.3)
    expect(getTrackEdgeAvoidanceSteer(5.4, 14.4)).toBeCloseTo(-0.9)
    expect(getTrackEdgeAvoidanceSteer(-5.4, 14.4)).toBeCloseTo(0.9)
    expect(getTrackEdgeAvoidanceSteer(5.4, 14.4, 5.4)).toBe(0)
    expect(getTrackEdgeAvoidanceSteer(5.8, 14.4, 5.4)).toBeLessThan(0)
    expect(getTrackEdgeAvoidanceSteer(20, 14.4)).toBe(-TRACK_EDGE_AVOIDANCE_MAX_STEER)
    expect(getTrackEdgeAvoidanceSteer(Number.NaN, 14.4)).toBe(0)
    expect(getTrackEdgeAvoidanceSteer(1, 0)).toBe(0)
  })

  it('holds each AI grid lane before smoothly merging to the centreline', () => {
    expect(getAIMergeLateralOffset(5.4, 0, 14.4)).toBeCloseTo(5.4)
    expect(getAIMergeLateralOffset(5.4, AI_LANE_MERGE_DISTANCE / 2, 14.4)).toBeCloseTo(2.7)
    expect(getAIMergeLateralOffset(5.4, AI_LANE_MERGE_DISTANCE, 14.4)).toBe(0)
    expect(getAIMergeLateralOffset(8, 0, 14.4)).toBeCloseTo(5.7)
    expect(getAIMergeLateralOffset(Number.NaN, 0, 14.4)).toBe(0)
    expect(getAIMergeLateralOffset(5.4, AI_LANE_MERGE_DISTANCE, 14.4, -0.7))
      .toBeCloseTo(-0.7)
  })

  it('finishes lane merging once without reopening it later in the lap', () => {
    let distance = advanceAIMergeDistance(0, 0.99, 0.01, 1000)
    expect(distance).toBeCloseTo(20)
    distance = advanceAIMergeDistance(distance, 0.01, 0.06, 1000)
    expect(distance).toBe(AI_LANE_MERGE_DISTANCE)
    expect(advanceAIMergeDistance(distance, 0.49, 0.51, 1000))
      .toBe(AI_LANE_MERGE_DISTANCE)
    expect(advanceAIMergeDistance(distance, 0.51, 0.49, 1000))
      .toBe(AI_LANE_MERGE_DISTANCE)
  })

  it('does not dodge a correctly spaced same-row grid neighbour', () => {
    expect(getNearbyCarAvoidanceSteer(3.6, 0, 3.6)).toBe(0)
    expect(getNearbyCarAvoidanceSteer(5, 5, 0)).toBeLessThan(0)
    expect(getNearbyCarAvoidanceSteer(2, 0, 2)).toBeLessThan(0)
    expect(getNearbyCarAvoidanceSteer(2, 0, -2)).toBeGreaterThan(0)
    expect(getNearbyCarAvoidanceSteer(0, 0, 0)).toBe(-AI_CAR_AVOIDANCE_MAX_STEER)
    expect(getNearbyCarAvoidanceSteer(2, -3, 0)).toBe(0)
  })

  it('uses closing speed and chassis length to set an early traffic speed limit', () => {
    const targetSpeed = VEHICLE_DYNAMICS.nominalTopSpeed
    expect(getAITrafficTargetSpeed(targetSpeed, 40, 0, 55, 40)).toBe(targetSpeed)
    expect(getAITrafficTargetSpeed(targetSpeed, 12, 0, 55, 40)).toBeLessThan(targetSpeed)
    expect(getAITrafficTargetSpeed(targetSpeed, 12, 0, 55, 40)).toBeGreaterThanOrEqual(40)
    expect(getAITrafficTargetSpeed(targetSpeed, 7, 0, 55, 0)).toBe(0)
    expect(getAITrafficTargetSpeed(targetSpeed, 7, 4, 55, 0)).toBe(targetSpeed)
    expect(getAITrafficTargetSpeed(targetSpeed, 10, 0, 20, Number.NaN))
      .toBeLessThan(targetSpeed)
    const beforeOneSecondTtc = getAITrafficTargetSpeed(targetSpeed, 19.999, 0, 55, 40)
    const afterOneSecondTtc = getAITrafficTargetSpeed(targetSpeed, 20.001, 0, 55, 40)
    expect(Math.abs(beforeOneSecondTtc - afterOneSecondTtc)).toBeLessThan(0.1)
  })
})
