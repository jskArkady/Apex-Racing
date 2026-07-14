import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { TRACK_CENTERLINE_Y, trackCurve } from './trackData'
import {
  START_GRID_DISTANCE_BEHIND_LINE,
  getStartGridPose,
  getStartGridPoses,
  getStartGridSlot,
  getTrackPoseAtProgress,
} from './startGrid'

describe('start grid', () => {
  it('places every single-race car in one evenly spaced row behind the line', () => {
    const poses = getStartGridPoses('single')
    expect(poses.map((pose) => pose.racerId)).toEqual(['ai_1', 'ai_2', 'ai_3', 'player'])

    for (const pose of poses) {
      expect(pose.progress).toBeGreaterThan(0.95)
      expect(pose.progress).toBeLessThan(1)
    }

    for (let i = 0; i < poses.length; i += 1) {
      for (let j = i + 1; j < poses.length; j += 1) {
        expect(poses[i].point.distanceTo(poses[j].point)).toBeGreaterThan(3.4)
      }
    }

    expect(new Set(poses.map((pose) => pose.row))).toEqual(new Set([0]))
    expect(new Set(poses.map((pose) => pose.distanceBehindLine))).toEqual(new Set([START_GRID_DISTANCE_BEHIND_LINE]))
    expect(poses.map((pose) => pose.lateralOffset).sort((a, b) => a - b)).toEqual([-5.4, -1.8, 1.8, 5.4])
    expect(getStartGridSlot('player', 'single')).toMatchObject({ row: 0, lateralOffset: -1.8 })
    expect(getStartGridSlot('ai_1', 'single')).toMatchObject({ row: 0, lateralOffset: -5.4 })
  })

  it('aligns every chassis forward vector to its local track tangent', () => {
    for (const pose of getStartGridPoses('single')) {
      const chassisForward = new THREE.Vector3(0, 0, -1).applyQuaternion(pose.rotation)
      expect(chassisForward.dot(pose.tangent)).toBeGreaterThan(0.999999)
      expect(Math.abs(pose.point.clone()
        .sub(trackCurve.getPointAt(pose.progress))
        .dot(pose.right))).toBeCloseTo(Math.abs(pose.lateralOffset), 6)
      expect(pose.point.y).toBe(TRACK_CENTERLINE_Y)
      expect(pose.position[1]).toBe(TRACK_CENTERLINE_Y + 1)
      expect(pose.tangent.y).toBe(0)
      expect(pose.right.y).toBe(0)
    }
  })

  it('uses a centered solo slot for time trial and omits opponents', () => {
    const poses = getStartGridPoses('time_trial')
    expect(poses).toHaveLength(1)
    expect(poses[0]).toMatchObject({ racerId: 'player', lateralOffset: 0, side: 0 })
    expect(getStartGridPose('ai_1', 'time_trial')).toBeNull()
  })

  it('creates a finite wrapped pose for deterministic landmark captures', () => {
    const pose = getTrackPoseAtProgress(1.25, 2.5)
    const center = trackCurve.getPointAt(0.25)
    const chassisForward = new THREE.Vector3(0, 0, -1).applyQuaternion(pose.rotation)

    expect(pose.progress).toBeCloseTo(0.25)
    expect(pose.point.clone().sub(center).dot(pose.right)).toBeCloseTo(2.5)
    expect(chassisForward.dot(pose.tangent)).toBeGreaterThan(0.999999)
    expect(pose.position.every(Number.isFinite)).toBe(true)
    expect(() => getTrackPoseAtProgress(Number.NaN)).toThrow(RangeError)
    expect(() => getTrackPoseAtProgress(0, 0, {})).toThrow(TypeError)
  })
})
