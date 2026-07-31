import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { START_FINISH_PROGRESS, TRACK_CENTERLINE_Y, TRACK_PRESETS, trackCurve, trackLength } from '../utils/trackData'
import { START_GRID, START_GRID_DISTANCE_BEHIND_LINE, getStartGridPose } from '../utils/startGrid'
import {
  BARRIER_GRAPHICS_BOTTOM_OFFSET,
  BARRIER_GRAPHICS_HEIGHT,
  BARRIER_SEGMENTS,
  createBarrierGraphicsGeometry,
  createBarrierGeometry,
  createCatchFenceGeometry,
  createCircuitGlowGeometry,
  createCircuitSceneryGeometry,
  createCrowdPanelGeometry,
  createGantryDisplayGeometry,
  createHarbourBuildingFacadeGeometry,
  createHarbourRetainingWallFacadeGeometry,
  createHarbourTunnelCeilingPortalGeometry,
  createHarbourTunnelWallGeometry,
  createPitGarageFacadeGeometry,
  createRoadColliderGeometry,
  createRoadGeometry,
  createTempleTreeBillboardGeometry,
  CHEVRON_LANE_CENTERS,
  CURB_CENTER_OFFSET,
  CURB_LENGTH_FACTOR,
  CURB_SEGMENTS,
  CURB_WIDTH,
  DIRECTION_MARKER_PROGRESS,
  EDGE_LINE_OFFSET,
  EDGE_LINE_WIDTH,
  FINISH_LINE_LEVEL,
  GANTRY_DISPLAY_LAYOUTS,
  getCurbSegmentLength,
  getFloodlightPositions,
  getHarbourTunnelLayout,
  getHarbourTunnelLightingLayout,
  GRANDSTAND_LAYOUTS,
  HARBOUR_BUILDINGS,
  HARBOUR_RETAINING_WALL_LAYOUT,
  HARBOUR_SWIMMING_POOL_PANELS,
  HARBOUR_TUNNEL_END_PROGRESS,
  HARBOUR_TUNNEL_LIGHT_COUNT,
  HARBOUR_TUNNEL_LIGHT_HEIGHT,
  HARBOUR_TUNNEL_LINER_INNER_OFFSET,
  HARBOUR_TUNNEL_PANEL_OVERLAP,
  HARBOUR_TUNNEL_ROOF_CENTER_Y,
  HARBOUR_TUNNEL_ROOF_HEIGHT,
  HARBOUR_TUNNEL_ROOF_UNDERSIDE,
  HARBOUR_TUNNEL_START_PROGRESS,
  HARBOUR_WATER,
  HARBOUR_WATER_SURFACE_Y,
  PIT_GARAGE_FACADE_LAYOUTS,
  ROAD_SEGMENTS,
  ROAD_WIDTH,
  ROAD_TOP_OFFSET,
  SECTOR_LANDMARK_PROGRESS,
  SHOULDER_CENTER_OFFSET,
  SHOULDER_WIDTH,
  START_GANTRY_PROGRESS,
  START_GRID_BOX,
  START_LIGHT_LATERALS,
  SURFACE_LEVELS,
  TEMPLE_BANKING_LAYOUT,
  TEMPLE_TREE_LAYOUT,
} from './trackGeometry'

describe('circuit visual geometry', () => {
  it('builds finite render and collider geometry for every selectable circuit', () => {
    for (const preset of TRACK_PRESETS) {
      const geometries = [
        createRoadGeometry(preset.curve, Math.ceil(preset.length / 3.5), preset.roadWidth),
        createRoadColliderGeometry(preset.curve, Math.ceil(preset.length / 3.5), preset.roadWidth),
        createBarrierGeometry(preset.curve, Math.ceil(preset.length / 4.25), preset.roadWidth),
        createBarrierGraphicsGeometry(
          preset.curve,
          Math.max(BARRIER_SEGMENTS, Math.ceil(preset.length / 4.25)),
          preset.roadWidth,
        ),
        createCircuitSceneryGeometry(preset.curve, preset.venue, preset.roadWidth),
        createCrowdPanelGeometry(preset.curve, preset.venue),
        createPitGarageFacadeGeometry(preset.curve, preset.venue),
        createGantryDisplayGeometry(preset.curve, preset.venue),
        ...(preset.venue === 'harbour'
          ? [
            createHarbourTunnelWallGeometry(preset.curve, preset.roadWidth),
            createHarbourTunnelCeilingPortalGeometry(
              preset.curve,
              preset.roadWidth,
            ),
            createHarbourBuildingFacadeGeometry(preset.curve),
            createHarbourRetainingWallFacadeGeometry(
              preset.curve,
              preset.roadWidth,
            ),
          ]
          : []),
        ...(preset.venue === 'temple'
          ? [createTempleTreeBillboardGeometry(preset.curve)]
          : []),
        createCircuitGlowGeometry(preset.curve, preset.venue, preset.roadWidth),
        createCatchFenceGeometry(preset.curve, Math.ceil(preset.length / 10), preset.roadWidth),
      ]

      for (const geometry of geometries) {
        const positions = geometry.getAttribute('position')
        const index = geometry.getIndex()

        expect(positions.count).toBeGreaterThan(0)
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
        if (index) {
          expect(Array.from(index.array).every(entry => (
            Number.isInteger(entry) && entry >= 0 && entry < positions.count
          ))).toBe(true)
        }
        expect(geometry.boundingBox).toBeTruthy()
        expect(geometry.boundingBox.min.toArray().every(Number.isFinite)).toBe(true)
        expect(geometry.boundingBox.max.toArray().every(Number.isFinite)).toBe(true)

        geometry.dispose()
      }
    }
  })

  it('faces every generated gantry display toward approaching drivers', () => {
    for (const preset of TRACK_PRESETS) {
      const geometry = createGantryDisplayGeometry(preset.curve, preset.venue)
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const layouts = GANTRY_DISPLAY_LAYOUTS[preset.venue]

      expect(positions.count).toBe(layouts.length * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(layouts.length * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(value => value === 0 || value === 1)).toBe(true)
      expect(geometry.boundingBox.min.y).toBeGreaterThan(5)
      expect(geometry.boundingBox.max.y).toBeLessThan(7.6)

      for (let panel = 0; panel < layouts.length; panel += 1) {
        const tangent = preset.curve
          .getTangentAt(layouts[panel].progress)
          .normalize()
        const normal = new THREE.Vector3().fromBufferAttribute(normals, panel * 4)
        expect(normal.dot(tangent)).toBeLessThan(-0.9)
      }

      geometry.dispose()
    }
  })

  it('maps one facade panel across every configured pit-garage section', () => {
    for (const preset of TRACK_PRESETS) {
      const geometry = createPitGarageFacadeGeometry(preset.curve, preset.venue)
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const layout = PIT_GARAGE_FACADE_LAYOUTS[preset.venue]

      expect(positions.count).toBe(layout.panelCount * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(layout.panelCount * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(value => value === 0 || value === 1)).toBe(true)
      expect(geometry.boundingBox.min.y).toBeGreaterThan(0.2)
      expect(geometry.boundingBox.max.y).toBeLessThan(5.7)

      const tangent = preset.curve.getTangentAt(layout.progress).normalize()
      const side = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, 1, 0),
        tangent,
      ).normalize()
      const normal = new THREE.Vector3().fromBufferAttribute(normals, 0)
      expect(normal.dot(side)).toBeGreaterThan(0.9)

      geometry.dispose()
    }
  })

  it('maps one finite crowd facade across every configured grandstand', () => {
    for (const preset of TRACK_PRESETS) {
      const geometry = createCrowdPanelGeometry(preset.curve, preset.venue)
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const layouts = GRANDSTAND_LAYOUTS[preset.venue]

      expect(positions.count).toBe(layouts.length * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(layouts.length * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(value => value === 0 || value === 1)).toBe(true)
      expect(geometry.boundingBox.min.y).toBeGreaterThan(0.8)
      expect(geometry.boundingBox.max.y).toBeLessThan(5)

      for (let panel = 0; panel < layouts.length; panel += 1) {
        const { progress, side: sideSign } = layouts[panel]
        const tangent = preset.curve.getTangentAt(progress).normalize()
        const side = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          tangent,
        ).normalize()
        const normal = new THREE.Vector3().fromBufferAttribute(normals, panel * 4)

        expect(normal.dot(side) * sideSign).toBeLessThan(-0.1)
      }

      geometry.dispose()
    }
  })

  it('uses each venue width for its road, barriers, paint, and catch fencing', () => {
    for (const preset of TRACK_PRESETS) {
      const road = createRoadGeometry(preset.curve, 32, preset.roadWidth)
      const roadCollider = createRoadColliderGeometry(preset.curve, 32, preset.roadWidth)
      const positions = road.getAttribute('position')
      const colliderPositions = roadCollider.getAttribute('position')

      expect(positions.count).toBe(32 * 4)
      expect(road.getIndex().count).toBe(32 * 24)
      expect(colliderPositions.count).toBe(32 * 2)
      expect(roadCollider.getIndex().count).toBe(32 * 6)
      expect(
        new THREE.Vector3().fromBufferAttribute(positions, 0).distanceTo(
          new THREE.Vector3().fromBufferAttribute(positions, 1),
        ),
      ).toBeCloseTo(preset.roadWidth, 4)
      expect(
        new THREE.Vector3().fromBufferAttribute(colliderPositions, 0).distanceTo(
          new THREE.Vector3().fromBufferAttribute(colliderPositions, 1),
        ),
      ).toBeCloseTo(preset.roadWidth, 4)

      road.dispose()
      roadCollider.dispose()
    }

    expect(TRACK_PRESETS.find(track => track.venue === 'harbour').roadWidth).toBeLessThan(ROAD_WIDTH)
    expect(TRACK_PRESETS.find(track => track.venue === 'temple').roadWidth).toBeLessThan(ROAD_WIDTH)
  })

  it('merges guides, corner markings, and landmarks into one finite geometry', () => {
    const geometry = createCircuitSceneryGeometry(trackCurve)
    const positions = geometry.getAttribute('position')
    const colors = geometry.getAttribute('color')
    const uniqueColors = new Set()

    // Keep the finite-geometry guard cheap enough to run with the full suite.
    // Thousands of individual Vitest assertions added seconds of framework
    // overhead and could hit the default timeout under parallel load.
    for (const attribute of Object.values(geometry.attributes)) {
      expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true)
    }
    expect(Array.from(geometry.index.array).every(index => (
      Number.isInteger(index) && index >= 0 && index < positions.count
    ))).toBe(true)
    for (let index = 0; index < colors.count; index += 1) {
      uniqueColors.add([
        colors.getX(index).toFixed(3),
        colors.getY(index).toFixed(3),
        colors.getZ(index).toFixed(3),
      ].join(':'))
    }

    expect(colors.count).toBe(positions.count)
    expect(uniqueColors.size).toBeGreaterThanOrEqual(12)
    expect(geometry.index.count / 3).toBeLessThan(25_000)
    expect(geometry.index.count / 3).toBeGreaterThan(12_000)
    expect(geometry.boundingBox.min.y).toBeLessThan(0)
    expect(geometry.boundingBox.max.y).toBeGreaterThan(12)

    geometry.dispose()
  })

  it('keeps direction and sector markers ordered, unique, and on the lap', () => {
    for (const markers of [DIRECTION_MARKER_PROGRESS, SECTOR_LANDMARK_PROGRESS]) {
      expect(markers).toEqual([...markers].sort((a, b) => a - b))
      expect(new Set(markers).size).toBe(markers.length)
      expect(markers.every(progress => progress > 0 && progress < 1)).toBe(true)
    }

    expect(DIRECTION_MARKER_PROGRESS).toHaveLength(8)
    expect(SECTOR_LANDMARK_PROGRESS).toEqual([1 / 3, 2 / 3])

    expect(CHEVRON_LANE_CENTERS).toEqual([-3.5, 3.5])
    expect(CHEVRON_LANE_CENTERS.every(center => (
      Math.abs(center) + 1 < EDGE_LINE_OFFSET
    ))).toBe(true)

    // Markers should remain legible instead of folding across a sharp bend.
    for (const progress of DIRECTION_MARKER_PROGRESS) {
      const before = trackCurve.getTangentAt((progress - 0.004 + 1) % 1).normalize()
      const after = trackCurve.getTangentAt((progress + 0.004) % 1).normalize()
      expect(THREE.MathUtils.radToDeg(before.angleTo(after))).toBeLessThan(7)
    }
  })

  it('layers both shoulders and edge lines across the full road without coplanar paint', () => {
    expect(ROAD_WIDTH).toBe(16)
    expect(SHOULDER_CENTER_OFFSET).toBeGreaterThan(ROAD_WIDTH / 2 - 2)
    expect(SHOULDER_CENTER_OFFSET).toBeLessThan(EDGE_LINE_OFFSET)
    expect(EDGE_LINE_OFFSET).toBeLessThan(ROAD_WIDTH / 2)

    const shoulderOuterEdge = SHOULDER_CENTER_OFFSET + SHOULDER_WIDTH / 2
    const lineInnerEdge = EDGE_LINE_OFFSET - EDGE_LINE_WIDTH / 2
    const lineOuterEdge = EDGE_LINE_OFFSET + EDGE_LINE_WIDTH / 2
    const curbInnerEdge = CURB_CENTER_OFFSET - CURB_WIDTH / 2
    const curbOuterEdge = CURB_CENTER_OFFSET + CURB_WIDTH / 2
    expect(shoulderOuterEdge).toBeLessThan(lineInnerEdge)
    expect(lineOuterEdge).toBeLessThan(curbInnerEdge)
    expect(curbOuterEdge).toBeLessThanOrEqual(ROAD_WIDTH / 2)

    // The decorative ribbons are raised above the physical road top. Their
    // offsets are intentionally separated to avoid flickering coplanar layers.
    const levels = Object.values(SURFACE_LEVELS)
    expect(levels.every(level => level > ROAD_TOP_OFFSET + 0.01)).toBe(true)
    expect(new Set(levels).size).toBe(levels.length)
    expect(SURFACE_LEVELS.shoulder).toBeGreaterThan(SURFACE_LEVELS.tyreTrace)
    expect(SURFACE_LEVELS.edgeLine).toBeGreaterThan(SURFACE_LEVELS.shoulder)
    expect(START_GRID_BOX.level).toBeGreaterThan(ROAD_TOP_OFFSET + 0.01)
    expect(Object.values(SURFACE_LEVELS)).not.toContain(START_GRID_BOX.level)
    expect(FINISH_LINE_LEVEL).toBeGreaterThan(Math.max(...Object.values(SURFACE_LEVELS)))
  })

  it('paints the shared four-car physics grid without overlapping the finish line or road edge', () => {
    const trackLength = trackCurve.getLength()
    const poses = Object.keys(START_GRID.single).map(racerId => (
      getStartGridPose(racerId, 'single', trackCurve, trackLength)
    ))

    expect(poses.map(pose => pose.racerId).sort()).toEqual(['ai_1', 'ai_2', 'ai_3', 'player'])
    expect(poses.map(pose => pose.distanceBehindLine)).toEqual([
      START_GRID_DISTANCE_BEHIND_LINE,
      START_GRID_DISTANCE_BEHIND_LINE,
      START_GRID_DISTANCE_BEHIND_LINE,
      START_GRID_DISTANCE_BEHIND_LINE,
    ])
    expect(poses.map(pose => pose.row)).toEqual([0, 0, 0, 0])
    expect(poses.map(pose => pose.lateralOffset).sort((a, b) => a - b)).toEqual([-5.4, -1.8, 1.8, 5.4])
    for (const pose of poses) {
      expect(Math.abs(pose.lateralOffset) + START_GRID_BOX.width / 2).toBeLessThan(EDGE_LINE_OFFSET)
      expect(pose.distanceBehindLine - START_GRID_BOX.length / 2).toBeGreaterThan(0.8)
      expect(pose.point.toArray().every(Number.isFinite)).toBe(true)
      expect(pose.rotation.toArray().every(Number.isFinite)).toBe(true)
    }

    // Every same-row pair has a full painted-box gap, including the player.
    for (let first = 0; first < poses.length; first += 1) {
      for (let second = first + 1; second < poses.length; second += 1) {
        const lateralGap = Math.abs(poses[first].lateralOffset - poses[second].lateralOffset)
        expect(lateralGap).toBeGreaterThan(START_GRID_BOX.width)
      }
    }
  })

  it('keeps the five-cell starting gantry ordered and inside its support span', () => {
    expect(START_GANTRY_PROGRESS).toBe(START_FINISH_PROGRESS)
    expect(START_LIGHT_LATERALS).toHaveLength(5)
    expect(START_LIGHT_LATERALS).toEqual([...START_LIGHT_LATERALS].sort((a, b) => a - b))
    expect(new Set(START_LIGHT_LATERALS).size).toBe(5)
    expect(START_LIGHT_LATERALS.every(lateral => Math.abs(lateral) < ROAD_WIDTH / 2)).toBe(true)
  })

  it('keeps both kerb ribbons closed through bends at length-scaled density', () => {
    expect(CURB_SEGMENTS).toBe(Math.ceil(trackLength / 6))
    expect(CURB_LENGTH_FACTOR).toBeLessThanOrEqual(1.05)

    for (const lateral of [-ROAD_WIDTH / 2 + 0.38, ROAD_WIDTH / 2 - 0.38]) {
      const centers = []
      const lengths = []
      for (let index = 0; index < CURB_SEGMENTS; index += 1) {
        const progress = (index + 0.5) / CURB_SEGMENTS
        const point = trackCurve.getPointAt(progress)
        const tangent = trackCurve.getTangentAt(progress).normalize()
        const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tangent).normalize()
        centers.push(point.addScaledVector(side, lateral))
        lengths.push(getCurbSegmentLength(trackCurve, index, lateral))
      }

      for (let index = 0; index < CURB_SEGMENTS; index += 1) {
        const next = (index + 1) % CURB_SEGMENTS
        const centerSpacing = centers[index].distanceTo(centers[next])
        expect((lengths[index] + lengths[next]) / 2).toBeGreaterThan(centerSpacing)
      }
    }
  })

  it('keeps render solids closed and the physics road open only at its lateral edges', () => {
    const geometries = [
      createRoadGeometry(trackCurve),
      createBarrierGeometry(trackCurve),
    ]

    for (const geometry of geometries) {
      const positions = geometry.getAttribute('position')
      const indices = geometry.getIndex().array
      const edgeUse = new Map()

      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      for (let offset = 0; offset < indices.length; offset += 3) {
        const triangle = [indices[offset], indices[offset + 1], indices[offset + 2]]
        for (let edge = 0; edge < 3; edge += 1) {
          const first = triangle[edge]
          const second = triangle[(edge + 1) % 3]
          const key = first < second ? `${first}:${second}` : `${second}:${first}`
          edgeUse.set(key, (edgeUse.get(key) ?? 0) + 1)
        }
      }

      expect(Array.from(edgeUse.values()).every(uses => uses === 2)).toBe(true)
      geometry.dispose()
    }

    const roadCollider = createRoadColliderGeometry(trackCurve)
    const positions = roadCollider.getAttribute('position')
    const normals = roadCollider.getAttribute('normal')
    const indices = roadCollider.getIndex().array
    const edgeUse = new Map()

    expect(positions.count).toBe(ROAD_SEGMENTS * 2)
    expect(indices).toHaveLength(ROAD_SEGMENTS * 6)
    for (let index = 0; index < positions.count; index += 1) {
      expect(positions.getY(index)).toBeCloseTo(TRACK_CENTERLINE_Y + ROAD_TOP_OFFSET, 6)
      expect(normals.getY(index)).toBeGreaterThan(0.999)
    }
    for (let offset = 0; offset < indices.length; offset += 3) {
      const triangle = [indices[offset], indices[offset + 1], indices[offset + 2]]
      for (let edge = 0; edge < 3; edge += 1) {
        const first = triangle[edge]
        const second = triangle[(edge + 1) % 3]
        const key = first < second ? `${first}:${second}` : `${second}:${first}`
        edgeUse.set(key, (edgeUse.get(key) ?? 0) + 1)
      }
    }
    expect(Array.from(edgeUse.values()).filter(uses => uses === 1)).toHaveLength(ROAD_SEGMENTS * 2)
    expect(Array.from(edgeUse.values()).every(uses => uses === 1 || uses === 2)).toBe(true)
    roadCollider.dispose()
  })

  it('keeps removed Harbour and Temple props out of the drivable lane', () => {
    const cases = [
      { venue: 'harbour', progresses: [0.075, 0.18, 0.285, 0.67, 0.82, 0.93] },
      { venue: 'temple', progresses: [0.19, 0.35, 0.695] },
    ]

    for (const { venue, progresses } of cases) {
      const preset = TRACK_PRESETS.find(track => track.venue === venue)
      const geometry = createCircuitSceneryGeometry(preset.curve, venue, preset.roadWidth)
      const positions = geometry.getAttribute('position')

      for (const progress of progresses) {
        const anchor = preset.curve.getPointAt(progress)
        const tangent = preset.curve.getTangentAt(progress).setY(0).normalize()
        const side = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          tangent,
        ).normalize()
        let raisedLaneVertices = 0

        for (let index = 0; index < positions.count; index += 1) {
          const relative = new THREE.Vector3().fromBufferAttribute(positions, index).sub(anchor)
          const height = relative.y
          if (
            Math.abs(relative.dot(tangent)) <= 5
            && Math.abs(relative.dot(side)) <= preset.roadWidth / 2 - 1
            && height > ROAD_TOP_OFFSET + 0.075
            && height < 3
          ) {
            raisedLaneVertices += 1
          }
        }

        expect(raisedLaneVertices, `${venue} lane clutter at ${progress}`).toBe(0)
      }
      geometry.dispose()
    }
  })

  it('keeps road and barrier colliders at constant physical heights for the full lap', () => {
    const roadGeometry = createRoadGeometry(trackCurve)
    const roadColliderGeometry = createRoadColliderGeometry(trackCurve)
    const barrierGeometry = createBarrierGeometry(trackCurve)
    const roadPositions = roadGeometry.getAttribute('position')
    const roadColliderPositions = roadColliderGeometry.getAttribute('position')
    const barrierPositions = barrierGeometry.getAttribute('position')
    const roadLevels = new Set()
    const barrierLevels = new Set()

    for (let index = 0; index < roadPositions.count; index += 1) {
      roadLevels.add(roadPositions.getY(index).toFixed(5))
    }
    for (let index = 0; index < barrierPositions.count; index += 1) {
      barrierLevels.add(barrierPositions.getY(index).toFixed(5))
    }

    expect([...roadLevels].sort()).toEqual(['-0.52000', ROAD_TOP_OFFSET.toFixed(5)])
    expect(new Set(Array.from(
      { length: roadColliderPositions.count },
      (_, index) => roadColliderPositions.getY(index).toFixed(5),
    ))).toEqual(new Set([ROAD_TOP_OFFSET.toFixed(5)]))
    expect([...barrierLevels].sort()).toEqual(['-0.10000', '1.35000'])
    expect(roadGeometry.boundingBox.max.y).toBeCloseTo(
      TRACK_CENTERLINE_Y + ROAD_TOP_OFFSET,
      6,
    )
    expect(roadGeometry.boundingBox.min.y).toBeCloseTo(TRACK_CENTERLINE_Y - 0.52, 6)
    expect(barrierGeometry.boundingBox.min.y).toBeCloseTo(TRACK_CENTERLINE_Y - 0.1, 6)
    expect(barrierGeometry.boundingBox.max.y).toBeCloseTo(TRACK_CENTERLINE_Y + 1.35, 6)

    roadGeometry.dispose()
    roadColliderGeometry.dispose()
    barrierGeometry.dispose()
  })

  it('wraps alternating atlas modules around both road-facing barrier walls', () => {
    for (const preset of TRACK_PRESETS) {
      const geometry = createBarrierGraphicsGeometry(
        preset.curve,
        Math.max(BARRIER_SEGMENTS, Math.ceil(preset.length / 4.25)),
        preset.roadWidth,
      )
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const panelCount = Math.max(
        BARRIER_SEGMENTS,
        Math.ceil(preset.length / 4.25),
      )

      expect(positions.count).toBe(panelCount * 2 * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(panelCount * 2 * 6)
      expect(geometry.boundingBox.min.y).toBeCloseTo(
        TRACK_CENTERLINE_Y + BARRIER_GRAPHICS_BOTTOM_OFFSET,
        5,
      )
      expect(geometry.boundingBox.max.y).toBeCloseTo(
        TRACK_CENTERLINE_Y
          + BARRIER_GRAPHICS_BOTTOM_OFFSET
          + BARRIER_GRAPHICS_HEIGHT,
        5,
      )

      for (let panel = 0; panel < panelCount; panel += 1) {
        const progress = (panel + 0.5) / panelCount
        const tangent = preset.curve.getTangentAt(progress).normalize()
        const side = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          tangent,
        ).normalize()

        for (const [sideOffset, sideSign] of [[0, -1], [1, 1]]) {
          const vertex = (panel * 2 + sideOffset) * 4
          const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
          const moduleUvs = Array.from(
            { length: 4 },
            (_, index) => uvs.getX(vertex + index),
          )
          const verticalUvs = Array.from(
            { length: 4 },
            (_, index) => uvs.getY(vertex + index),
          )
          const expectedVariant = (panel + (sideSign > 0 ? 0 : 1)) % 2

          expect(normal.dot(side) * sideSign).toBeLessThan(-0.9)
          expect(Math.min(...moduleUvs)).toBeGreaterThan(expectedVariant * 0.5)
          expect(Math.max(...moduleUvs)).toBeLessThan(
            (expectedVariant + 1) * 0.5,
          )
          expect(Math.min(...verticalUvs)).toBeGreaterThan(0)
          expect(Math.max(...verticalUvs)).toBeLessThan(1)
        }
      }

      geometry.dispose()
    }
  })

  it('keeps the eight real lights finite and distributed around the lap', () => {
    const positions = getFloodlightPositions(trackCurve)

    expect(positions).toHaveLength(8)
    expect(new Set(positions.map(position => position.join(','))).size).toBe(8)
    for (const position of positions) {
      expect(position).toHaveLength(3)
      expect(position.every(Number.isFinite)).toBe(true)
      expect(position[1]).toBeGreaterThan(2)
    }
  })

  it('builds a finite catch fence above both circuit barriers', () => {
    const geometry = createCatchFenceGeometry(trackCurve)
    const positions = geometry.getAttribute('position')

    expect(positions.count).toBeGreaterThan(2000)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(geometry.boundingBox.min.y).toBeGreaterThan(1)
    expect(geometry.boundingBox.max.y).toBeGreaterThan(4.5)
    expect(geometry.boundingBox.min.x).toBeLessThan(trackCurve.getPointAt(0).x)
    expect(geometry.boundingBox.max.x).toBeGreaterThan(trackCurve.getPointAt(0).x)

    geometry.dispose()
  })

  it('covers the full Monaco tunnel with overlapping roof and wall panels', () => {
    const harbour = TRACK_PRESETS.find(track => track.venue === 'harbour')
    const layout = getHarbourTunnelLayout(harbour.curve)
    const halfPanelProgress = layout.panelLength / harbour.length / 2
    const firstCoveredProgress = layout.progresses[0] - halfPanelProgress
    const lastCoveredProgress = layout.progresses.at(-1) + halfPanelProgress

    expect(layout.panelCount).toBeGreaterThan(15)
    expect(layout.panelLength).toBeCloseTo(
      layout.panelSpacing * HARBOUR_TUNNEL_PANEL_OVERLAP,
      8,
    )
    expect(layout.panelLength).toBeGreaterThan(layout.panelSpacing)
    expect(firstCoveredProgress).toBeLessThanOrEqual(HARBOUR_TUNNEL_START_PROGRESS)
    expect(lastCoveredProgress).toBeGreaterThanOrEqual(HARBOUR_TUNNEL_END_PROGRESS)
    for (let index = 1; index < layout.progresses.length; index += 1) {
      const spacing = (layout.progresses[index] - layout.progresses[index - 1])
        * harbour.length
      expect(spacing).toBeLessThan(layout.panelLength)
    }
  })

  it('alternates two atlas modules across inward-facing Monaco tunnel walls', () => {
    const harbour = TRACK_PRESETS.find(track => track.venue === 'harbour')
    const layout = getHarbourTunnelLayout(harbour.curve)
    const geometry = createHarbourTunnelWallGeometry(
      harbour.curve,
      harbour.roadWidth,
    )
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')

    expect(positions.count).toBe(layout.panelCount * 2 * 4)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(geometry.getIndex().count).toBe(layout.panelCount * 2 * 6)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value >= 0 && value <= 1
    ))).toBe(true)
    expect(geometry.boundingBox.min.y).toBeGreaterThan(0)
    expect(geometry.boundingBox.max.y).toBeLessThan(
      HARBOUR_TUNNEL_ROOF_UNDERSIDE,
    )
    expect(HARBOUR_TUNNEL_LINER_INNER_OFFSET).toBeLessThan(0.77)

    for (let panel = 0; panel < layout.panelCount; panel += 1) {
      const tangent = harbour.curve
        .getTangentAt(layout.progresses[panel])
        .normalize()
      const side = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, 1, 0),
        tangent,
      ).normalize()
      for (const [sideOffset, sideSign] of [[0, -1], [1, 1]]) {
        const vertex = (panel * 2 + sideOffset) * 4
        const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
        const moduleUvs = Array.from(
          { length: 4 },
          (_, index) => uvs.getX(vertex + index),
        )
        const expectedVariant = (panel + (sideSign > 0 ? 0 : 1)) % 2

        expect(normal.dot(side) * sideSign).toBeLessThan(-0.9)
        expect(Math.min(...moduleUvs)).toBeGreaterThan(expectedVariant * 0.5)
        expect(Math.max(...moduleUvs)).toBeLessThan((expectedVariant + 1) * 0.5)
      }
    }

    geometry.dispose()
  })

  it('textures the Harbour tunnel ceiling, soffits, joints, and portal ends', () => {
    const harbour = TRACK_PRESETS.find(track => track.venue === 'harbour')
    const layout = getHarbourTunnelLayout(harbour.curve)
    const geometry = createHarbourTunnelCeilingPortalGeometry(
      harbour.curve,
      harbour.roadWidth,
    )
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const facesPerPanel = 7
    const facadeCount = layout.panelCount * facesPerPanel + 2

    expect(positions.count).toBe(facadeCount * 4)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(geometry.getIndex().count).toBe(facadeCount * 6)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value > 0 && value < 1
    ))).toBe(true)
    expect(geometry.boundingBox.min.y).toBeGreaterThan(0)
    expect(geometry.boundingBox.max.y).toBeLessThan(
      HARBOUR_TUNNEL_ROOF_CENTER_Y + HARBOUR_TUNNEL_ROOF_HEIGHT / 2,
    )

    for (let panel = 0; panel < layout.panelCount; panel += 1) {
      const vertex = panel * facesPerPanel * 4
      const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
      const panelUvs = Array.from(
        { length: 4 },
        (_, index) => ({
          u: uvs.getX(vertex + index),
          v: uvs.getY(vertex + index),
        }),
      )
      const expectedColumn = panel % 2

      expect(normal.dot(new THREE.Vector3(0, -1, 0))).toBeGreaterThan(0.99)
      expect(Math.min(...panelUvs.map(uv => uv.u))).toBeGreaterThan(
        expectedColumn * 0.5,
      )
      expect(Math.max(...panelUvs.map(uv => uv.u))).toBeLessThan(
        (expectedColumn + 1) * 0.5,
      )
      expect(Math.min(...panelUvs.map(uv => uv.v))).toBeGreaterThan(0.5)
      expect(Math.max(...panelUvs.map(uv => uv.v))).toBeLessThan(1)

      for (const soffitFace of [1, 4]) {
        const soffitVertex = vertex + soffitFace * 4
        const soffitNormal = new THREE.Vector3().fromBufferAttribute(
          normals,
          soffitVertex,
        )
        expect(soffitNormal.y).toBeLessThan(-0.8)
      }

      for (const jointFace of [2, 3, 5, 6]) {
        const jointVertex = vertex + jointFace * 4
        const jointUvs = Array.from(
          { length: 4 },
          (_, index) => uvs.getY(jointVertex + index),
        )
        expect(Math.min(...jointUvs)).toBeGreaterThan(0)
        expect(Math.max(...jointUvs)).toBeLessThan(0.5)
      }
    }

    const portalVertexOffset = layout.panelCount * facesPerPanel * 4
    for (const [endIndex, endSign] of [[0, -1], [1, 1]]) {
      const progress = endIndex === 0
        ? layout.progresses[0]
        : layout.progresses.at(-1)
      const tangent = harbour.curve.getTangentAt(progress).normalize()

      const vertex = portalVertexOffset + endIndex * 4
      const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
      const verticalUvs = Array.from(
        { length: 4 },
        (_, index) => uvs.getY(vertex + index),
      )

      expect(normal.dot(tangent) * endSign).toBeGreaterThan(0.9)
      expect(Math.min(...verticalUvs)).toBeGreaterThan(0)
      expect(Math.max(...verticalUvs)).toBeLessThan(0.5)
    }

    geometry.dispose()
  })

  it('spaces a bounded set of finite lights inside the Monaco tunnel', () => {
    const harbour = TRACK_PRESETS.find(track => track.venue === 'harbour')
    const layout = getHarbourTunnelLightingLayout(harbour.curve, harbour.roadWidth)

    expect(layout.count).toBe(HARBOUR_TUNNEL_LIGHT_COUNT)
    expect(layout.lights).toHaveLength(HARBOUR_TUNNEL_LIGHT_COUNT)
    expect(layout.spacing).toBeGreaterThan(0)
    expect(layout.spacing * (layout.count + 1)).toBeCloseTo(layout.tunnelArcLength, 8)
    expect(layout.fixtureLateral).toBeLessThan(harbour.roadWidth / 2)
    for (const light of layout.lights) {
      const trackY = harbour.curve.getPointAt(light.progress).y
      expect(light.progress).toBeGreaterThan(HARBOUR_TUNNEL_START_PROGRESS)
      expect(light.progress).toBeLessThan(HARBOUR_TUNNEL_END_PROGRESS)
      expect(light.position).toHaveLength(3)
      expect(light.position.every(Number.isFinite)).toBe(true)
      expect(light.position[1] - trackY).toBeCloseTo(HARBOUR_TUNNEL_LIGHT_HEIGHT, 8)
      expect(light.position[1] - trackY).toBeLessThan(HARBOUR_TUNNEL_ROOF_UNDERSIDE)
    }
  })

  it('maps four atlas variants onto every visible Monaco apartment face', () => {
    const harbour = TRACK_PRESETS.find(track => track.venue === 'harbour')
    const geometry = createHarbourBuildingFacadeGeometry(harbour.curve)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')

    expect(positions.count).toBe(HARBOUR_BUILDINGS.length * 4 * 4)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(geometry.getIndex().count).toBe(HARBOUR_BUILDINGS.length * 4 * 6)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(geometry.boundingBox.min.y).toBeGreaterThan(0)
    expect(geometry.boundingBox.max.y).toBeGreaterThan(35)

    for (const [buildingIndex, building] of HARBOUR_BUILDINGS.entries()) {
      const vertex = buildingIndex * 4 * 4
      const tangent = harbour.curve
        .getTangentAt(building.progress)
        .normalize()
      const side = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, 1, 0),
        tangent,
      ).normalize()
      const sideSign = Math.sign(building.lateral) || 1
      const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
      const moduleUvs = Array.from(
        { length: 4 },
        (_, index) => uvs.getX(vertex + index),
      )
      const expectedVariant = buildingIndex % 4

      expect(normal.dot(side) * sideSign).toBeLessThan(-0.9)
      expect(Math.min(...moduleUvs)).toBeGreaterThan(expectedVariant * 0.25)
      expect(Math.max(...moduleUvs)).toBeLessThan((expectedVariant + 1) * 0.25)

      const outsideVertex = vertex + 4
      const outsideNormal = new THREE.Vector3().fromBufferAttribute(
        normals,
        outsideVertex,
      )
      const outsideUvs = Array.from(
        { length: 4 },
        (_, index) => uvs.getX(outsideVertex + index),
      )
      const outsideVariant = (buildingIndex + 3) % 4

      expect(outsideNormal.dot(side) * sideSign).toBeGreaterThan(0.9)
      expect(Math.min(...outsideUvs)).toBeGreaterThan(outsideVariant * 0.25)
      expect(Math.max(...outsideUvs)).toBeLessThan((outsideVariant + 1) * 0.25)

      for (const [endOffset, endSign] of [[2, -1], [3, 1]]) {
        const endVertex = vertex + endOffset * 4
        const endNormal = new THREE.Vector3().fromBufferAttribute(
          normals,
          endVertex,
        )
        const endUvs = Array.from(
          { length: 4 },
          (_, index) => uvs.getX(endVertex + index),
        )
        const endVariant = (
          buildingIndex + (endSign < 0 ? 1 : 2)
        ) % 4

        expect(endNormal.dot(tangent) * endSign).toBeGreaterThan(0.9)
        expect(Math.min(...endUvs)).toBeGreaterThan(endVariant * 0.25)
        expect(Math.max(...endUvs)).toBeLessThan((endVariant + 1) * 0.25)
      }
    }

    geometry.dispose()
  })

  it('covers every player-visible face of the Harbour retaining structures', () => {
    const harbour = TRACK_PRESETS.find(track => track.venue === 'harbour')
    const geometry = createHarbourRetainingWallFacadeGeometry(
      harbour.curve,
      harbour.roadWidth,
    )
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const wallCount = HARBOUR_RETAINING_WALL_LAYOUT.progresses.length
    const tunnelLayout = getHarbourTunnelLayout(harbour.curve)
    const facadeCount = wallCount * 4 + tunnelLayout.panelCount * 2

    expect(positions.count).toBe(facadeCount * 4)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(geometry.getIndex().count).toBe(facadeCount * 6)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value > 0 && value < 1
    ))).toBe(true)
    expect(geometry.boundingBox.min.y).toBeGreaterThan(0)
    expect(geometry.boundingBox.max.y).toBeLessThan(
      HARBOUR_TUNNEL_ROOF_UNDERSIDE,
    )

    for (const [wallIndex, progress] of (
      HARBOUR_RETAINING_WALL_LAYOUT.progresses.entries()
    )) {
      const vertex = wallIndex * 4 * 4
      const tangent = harbour.curve.getTangentAt(progress).normalize()
      const side = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, 1, 0),
        tangent,
      ).normalize()
      const frontNormal = new THREE.Vector3().fromBufferAttribute(
        normals,
        vertex,
      )
      const rearNormal = new THREE.Vector3().fromBufferAttribute(
        normals,
        vertex + 4,
      )
      const frontUvs = Array.from(
        { length: 4 },
        (_, index) => uvs.getX(vertex + index),
      )
      const frontVariant = wallIndex % 2

      expect(frontNormal.dot(side)).toBeLessThan(-0.9)
      expect(rearNormal.dot(side)).toBeGreaterThan(0.9)
      expect(Math.min(...frontUvs)).toBeGreaterThan(frontVariant * 0.5)
      expect(Math.max(...frontUvs)).toBeLessThan((frontVariant + 1) * 0.5)

      for (const [endOffset, endSign] of [[2, -1], [3, 1]]) {
        const endVertex = vertex + endOffset * 4
        const endNormal = new THREE.Vector3().fromBufferAttribute(
          normals,
          endVertex,
        )
        const endUvs = Array.from(
          { length: 4 },
          (_, index) => uvs.getX(endVertex + index),
        )

        expect(endNormal.dot(tangent) * endSign).toBeGreaterThan(0.9)
        expect(Math.max(...endUvs) - Math.min(...endUvs)).toBeLessThan(0.08)
        expect(Math.max(...endUvs) - Math.min(...endUvs)).toBeGreaterThan(0.05)
      }
    }

    const tunnelVertexOffset = wallCount * 4 * 4
    for (let panel = 0; panel < tunnelLayout.panelCount; panel += 1) {
      const tangent = harbour.curve
        .getTangentAt(tunnelLayout.progresses[panel])
        .normalize()
      const side = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, 1, 0),
        tangent,
      ).normalize()

      for (const [sideOffset, sideSign] of [[0, -1], [1, 1]]) {
        const vertex = tunnelVertexOffset + (panel * 2 + sideOffset) * 4
        const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
        const moduleUvs = Array.from(
          { length: 4 },
          (_, index) => uvs.getX(vertex + index),
        )
        const expectedVariant = (panel + (sideSign > 0 ? 0 : 1)) % 2

        expect(normal.dot(side) * sideSign).toBeGreaterThan(0.9)
        expect(Math.min(...moduleUvs)).toBeGreaterThan(expectedVariant * 0.5)
        expect(Math.max(...moduleUvs)).toBeLessThan(
          (expectedVariant + 1) * 0.5,
        )
      }
    }

    geometry.dispose()
  })

  it('keeps every Monaco apartment footprint clear of every road branch', () => {
    const harbour = TRACK_PRESETS.find(track => track.venue === 'harbour')
    const sampleCount = 16_384
    const worldUp = new THREE.Vector3(0, 1, 0)

    for (const building of HARBOUR_BUILDINGS) {
      const anchor = harbour.curve.getPointAt(building.progress)
      const tangent = harbour.curve.getTangentAt(building.progress).setY(0).normalize()
      const side = new THREE.Vector3().crossVectors(worldUp, tangent).normalize()
      const center = anchor.clone().addScaledVector(side, building.lateral)
      const footprintHalfWidth = building.width / 2 + 1.1
      const footprintHalfLength = 7.1
      let minimumRoadEdgeGap = Infinity

      for (let index = 0; index < sampleCount; index += 1) {
        const roadPoint = harbour.curve.getPointAt(index / sampleCount)
        const relative = roadPoint.sub(center)
        const outsideWidth = Math.max(0, Math.abs(relative.dot(side)) - footprintHalfWidth)
        const outsideLength = Math.max(0, Math.abs(relative.dot(tangent)) - footprintHalfLength)
        const centerlineGap = Math.hypot(outsideWidth, outsideLength)
        minimumRoadEdgeGap = Math.min(
          minimumRoadEdgeGap,
          centerlineGap - harbour.roadWidth / 2,
        )
      }

      expect(
        minimumRoadEdgeGap,
        `building at ${building.progress}/${building.lateral}m road-edge gap`,
      ).toBeGreaterThan(1)
    }
  })

  it('keeps Monaco apartment balcony footprints mutually separated', () => {
    const harbour = TRACK_PRESETS.find(track => track.venue === 'harbour')
    const worldUp = new THREE.Vector3(0, 1, 0)
    const footprints = HARBOUR_BUILDINGS.map(building => {
      const anchor = harbour.curve.getPointAt(building.progress)
      const tangent = harbour.curve.getTangentAt(building.progress).setY(0).normalize()
      const side = new THREE.Vector3().crossVectors(worldUp, tangent).normalize()
      return {
        building,
        center: anchor.clone().addScaledVector(side, building.lateral),
        side,
        tangent,
        halfWidth: building.width / 2 + 1.1,
        halfLength: 7.1,
      }
    })

    for (let first = 0; first < footprints.length; first += 1) {
      for (let second = first + 1; second < footprints.length; second += 1) {
        const a = footprints[first]
        const b = footprints[second]
        const delta = b.center.clone().sub(a.center)
        let separatingAxisGap = -Infinity

        for (const axis of [a.side, a.tangent, b.side, b.tangent]) {
          const firstRadius = (
            a.halfWidth * Math.abs(a.side.dot(axis))
            + a.halfLength * Math.abs(a.tangent.dot(axis))
          )
          const secondRadius = (
            b.halfWidth * Math.abs(b.side.dot(axis))
            + b.halfLength * Math.abs(b.tangent.dot(axis))
          )
          separatingAxisGap = Math.max(
            separatingAxisGap,
            Math.abs(delta.dot(axis)) - firstRadius - secondRadius,
          )
        }

        expect(
          separatingAxisGap,
          `buildings at ${a.building.progress} and ${b.building.progress}`,
        ).toBeGreaterThan(1)
      }
    }
  })

  it('keeps the Swimming Pool panels above the rendered harbour surface', () => {
    expect(HARBOUR_WATER_SURFACE_Y).toBeCloseTo(
      HARBOUR_WATER.position[1] + HARBOUR_WATER.size[1] / 2,
      8,
    )
    for (const panel of HARBOUR_SWIMMING_POOL_PANELS) {
      const panelBottom = panel.position[1] - panel.size[1] / 2
      expect(panelBottom - HARBOUR_WATER_SURFACE_Y).toBeGreaterThanOrEqual(0.009)
    }
  })

  it('maps four alpha-atlas tree variants across the full Temple woodland', () => {
    const temple = TRACK_PRESETS.find(track => track.venue === 'temple')
    const geometry = createTempleTreeBillboardGeometry(temple.curve)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')

    expect(TEMPLE_TREE_LAYOUT).toHaveLength(144)
    expect(positions.count).toBe(TEMPLE_TREE_LAYOUT.length * 4)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(geometry.getIndex().count).toBe(TEMPLE_TREE_LAYOUT.length * 6)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value > 0 && value < 1
    ))).toBe(true)
    expect(geometry.boundingBox.min.y).toBeGreaterThan(0)
    expect(geometry.boundingBox.max.y).toBeLessThan(14)

    for (const [treeIndex, tree] of TEMPLE_TREE_LAYOUT.entries()) {
      const vertex = treeIndex * 4
      const tangent = temple.curve.getTangentAt(tree.progress).normalize()
      const side = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, 1, 0),
        tangent,
      ).normalize()
      const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
      const moduleUvs = Array.from(
        { length: 4 },
        (_, index) => ({
          u: uvs.getX(vertex + index),
          v: uvs.getY(vertex + index),
        }),
      )
      const column = tree.variant % 2
      const row = Math.floor(tree.variant / 2)

      expect(normal.dot(side) * -Math.sign(tree.lateral)).toBeGreaterThan(0.9)
      expect(Math.min(...moduleUvs.map(uv => uv.u))).toBeGreaterThan(column * 0.5)
      expect(Math.max(...moduleUvs.map(uv => uv.u))).toBeLessThan(
        (column + 1) * 0.5,
      )
      if (row === 0) {
        expect(Math.min(...moduleUvs.map(uv => uv.v))).toBeGreaterThan(0.5)
      } else {
        expect(Math.max(...moduleUvs.map(uv => uv.v))).toBeLessThan(0.5)
      }
    }

    geometry.dispose()
  })

  it('joins the historic Monza banking arms, deck, supports, and cap beam', () => {
    const temple = TRACK_PRESETS.find(track => track.venue === 'temple')
    const banking = TEMPLE_BANKING_LAYOUT
    const deck = {
      center: new THREE.Vector2(0, banking.deckCenterY),
      axes: [new THREE.Vector2(1, 0), new THREE.Vector2(0, 1)],
      halfExtents: [
        (temple.roadWidth + banking.deckExtraWidth) / 2,
        banking.deckHeight / 2,
      ],
    }

    for (const side of [-1, 1]) {
      const roll = side * banking.armRoll
      const arm = {
        center: new THREE.Vector2(
          side * banking.armCenterLateral,
          banking.armCenterY,
        ),
        axes: [
          new THREE.Vector2(Math.cos(roll), Math.sin(roll)),
          new THREE.Vector2(-Math.sin(roll), Math.cos(roll)),
        ],
        halfExtents: [banking.armSize[0] / 2, banking.armSize[1] / 2],
      }
      const delta = arm.center.clone().sub(deck.center)
      let separatingAxisGap = -Infinity

      for (const axis of [...deck.axes, ...arm.axes]) {
        const deckRadius = deck.halfExtents.reduce((radius, extent, index) => (
          radius + extent * Math.abs(deck.axes[index].dot(axis))
        ), 0)
        const armRadius = arm.halfExtents.reduce((radius, extent, index) => (
          radius + extent * Math.abs(arm.axes[index].dot(axis))
        ), 0)
        separatingAxisGap = Math.max(
          separatingAxisGap,
          Math.abs(delta.dot(axis)) - deckRadius - armRadius,
        )
      }

      expect(separatingAxisGap, `${side < 0 ? 'left' : 'right'} banking joint`).toBeLessThan(0)
      expect(separatingAxisGap).toBeGreaterThan(-1)
    }

    const supportTop = banking.supportCenterY + banking.supportSize[1] / 2
    const deckBottom = banking.deckCenterY - banking.deckHeight / 2
    const deckTop = banking.deckCenterY + banking.deckHeight / 2
    const beamBottom = banking.beamCenterY - banking.beamHeight / 2
    expect(supportTop).toBeGreaterThan(deckBottom)
    expect(beamBottom).toBeCloseTo(deckTop, 8)
  })

  it('keeps venue lighting finite and isolated in one emissive draw geometry', () => {
    const geometry = createCircuitGlowGeometry(trackCurve)
    const positions = geometry.getAttribute('position')
    const colors = geometry.getAttribute('color')

    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(colors.count).toBe(positions.count)
    expect(geometry.index.count / 3).toBeLessThan(5_000)
    expect(geometry.boundingBox.max.y).toBeGreaterThan(20)

    geometry.dispose()
  })
})
