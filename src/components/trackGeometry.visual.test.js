import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { START_FINISH_PROGRESS, TRACK_CENTERLINE_Y, TRACK_PRESETS, trackCurve, trackLength } from '../utils/trackData'
import { START_GRID, START_GRID_DISTANCE_BEHIND_LINE, getStartGridPose } from '../utils/startGrid'
import {
  BARRIER_GRAPHICS_BOTTOM_OFFSET,
  BARRIER_GRAPHICS_HEIGHT,
  BARRIER_SEGMENTS,
  BRAKING_BOARD_LABELS,
  BRAKING_BOARD_PANEL,
  BRAKING_BOARD_WORLD_SCALE,
  APEX_PIT_STAFF_APPROACH_PROGRESS_OFFSET,
  APEX_PIT_STAFF_LAYOUT,
  APEX_PALM_TREE_LAYOUT,
  APEX_PIT_WALL_DISPLAY_LAYOUT,
  APEX_TENT_CANOPY_LAYOUT,
  BROADCAST_CAMERA_PROGRESS,
  createApexPitStaffBillboardGeometry,
  createApexTentCanopyGeometry,
  createApexVenueFacadeGeometry,
  createBarrierGraphicsGeometry,
  createBarrierGeometry,
  createBrakingBoardGraphicsGeometry,
  createCatchFenceGeometry,
  createCircuitGlowGeometry,
  createCircuitSceneryGeometry,
  createCrowdPanelGeometry,
  createGantryDisplayGeometry,
  createGrandstandStructureGeometry,
  createHarbourBuildingFacadeGeometry,
  createHarbourMarinaSurfaceGeometry,
  createHarbourRetainingWallFacadeGeometry,
  createHarbourSwimmingPoolSurfaceGeometry,
  createHarbourTunnelCeilingPortalGeometry,
  createHarbourTunnelWallGeometry,
  createHarbourYachtFacadeGeometry,
  createPitComplexStructureGeometry,
  createPitGarageFacadeGeometry,
  createPalmTreeBillboardGeometry,
  createRoadColliderGeometry,
  createRoadGeometry,
  createTempleTreeBillboardGeometry,
  createTempleVenueFacadeGeometry,
  createTracksideOperationsGraphicsGeometry,
  APEX_VENUE_FACADE_LAYOUT,
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
  getBrakingBoardLayout,
  getHarbourTunnelLayout,
  getHarbourTunnelLightingLayout,
  getPalmTreeLayout,
  getTracksideOperationsGraphicsLayout,
  GRANDSTAND_LAYOUTS,
  HARBOUR_BUILDINGS,
  HARBOUR_MARINA_LAYOUT,
  HARBOUR_RETAINING_WALL_LAYOUT,
  HARBOUR_SWIMMING_POOL_PANELS,
  HARBOUR_TUNNEL_END_PROGRESS,
  HARBOUR_TUNNEL_LIGHT_COUNT,
  HARBOUR_TUNNEL_LIGHT_HEIGHT,
  HARBOUR_TUNNEL_LINER_INNER_OFFSET,
  HARBOUR_TUNNEL_PANEL_OVERLAP,
  HARBOUR_TUNNEL_ROOF_CENTER_Y,
  PIT_COMPLEX_STRUCTURE_LAYOUTS,
  PALM_TREE_APPROACH_PROGRESS_OFFSET,
  HARBOUR_TUNNEL_ROOF_HEIGHT,
  HARBOUR_TUNNEL_ROOF_UNDERSIDE,
  HARBOUR_TUNNEL_START_PROGRESS,
  HARBOUR_WATER,
  HARBOUR_WATER_SURFACE_Y,
  HARBOUR_YACHT_LAYOUT,
  MARSHAL_POST_PROGRESS,
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
  TEMPLE_TIMING_TOWER_LAYOUT,
  TEMPLE_TREE_LAYOUT,
  TRACKSIDE_OPERATIONS_VARIANTS,
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
        createBrakingBoardGraphicsGeometry(
          preset.curve,
          preset.venue,
          preset.roadWidth,
        ),
        createTracksideOperationsGraphicsGeometry(
          preset.curve,
          preset.venue,
          preset.roadWidth,
        ),
        createCircuitSceneryGeometry(preset.curve, preset.venue, preset.roadWidth),
        createCrowdPanelGeometry(preset.curve, preset.venue),
        createGrandstandStructureGeometry(preset.curve, preset.venue),
        createPitComplexStructureGeometry(preset.curve, preset.venue),
        createPitGarageFacadeGeometry(preset.curve, preset.venue),
        createGantryDisplayGeometry(preset.curve, preset.venue),
        ...(preset.venue === 'apex'
          ? [
            createApexVenueFacadeGeometry(preset.curve),
            createApexPitStaffBillboardGeometry(preset.curve),
            createApexTentCanopyGeometry(preset.curve),
          ]
          : []),
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
            createHarbourSwimmingPoolSurfaceGeometry(),
            createHarbourYachtFacadeGeometry(),
          ]
          : []),
        ...(['apex', 'harbour'].includes(preset.venue)
          ? [createPalmTreeBillboardGeometry(preset.curve, preset.venue)]
          : []),
        ...(preset.venue === 'temple'
          ? [
            createTempleTreeBillboardGeometry(preset.curve),
            createTempleVenueFacadeGeometry(preset.curve, preset.roadWidth),
          ]
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

  it('covers the Apex tower and every hospitality-building side from one atlas', () => {
    const apex = TRACK_PRESETS.find(track => track.venue === 'apex')
    const geometry = createApexVenueFacadeGeometry(apex.curve)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const towerFaces = APEX_VENUE_FACADE_LAYOUT.tower.panels
    const hospitalityFaces = (
      APEX_VENUE_FACADE_LAYOUT.hospitality.length * 4
    )
    const facadeCount = towerFaces + hospitalityFaces

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
    expect(geometry.boundingBox.max.y).toBeLessThan(26.1)

    for (let face = 0; face < facadeCount; face += 1) {
      const vertex = face * 4
      const faceU = Array.from(
        { length: 4 },
        (_, index) => uvs.getX(vertex + index),
      )
      const faceV = Array.from(
        { length: 4 },
        (_, index) => uvs.getY(vertex + index),
      )
      const expectedColumn = face < towerFaces
        ? face % 2
        : (
          Math.floor((face - towerFaces) / 4)
          + (face - towerFaces) % 4
        ) % 2
      const expectedRow = face < towerFaces ? 1 : 0

      expect(Math.min(...faceU)).toBeGreaterThan(expectedColumn * 0.5)
      expect(Math.max(...faceU)).toBeLessThan((expectedColumn + 1) * 0.5)
      expect(Math.min(...faceV)).toBeGreaterThan(expectedRow * 0.5)
      expect(Math.max(...faceV)).toBeLessThan((expectedRow + 1) * 0.5)
    }

    for (let building = 0; building < (
      APEX_VENUE_FACADE_LAYOUT.hospitality.length
    ); building += 1) {
      const firstFace = towerFaces + building * 4
      const normalA = new THREE.Vector3().fromBufferAttribute(
        normals,
        firstFace * 4,
      )
      const normalB = new THREE.Vector3().fromBufferAttribute(
        normals,
        (firstFace + 1) * 4,
      )
      const normalC = new THREE.Vector3().fromBufferAttribute(
        normals,
        (firstFace + 2) * 4,
      )
      const normalD = new THREE.Vector3().fromBufferAttribute(
        normals,
        (firstFace + 3) * 4,
      )
      expect(normalA.dot(normalB)).toBeLessThan(-0.99)
      expect(normalC.dot(normalD)).toBeLessThan(-0.99)
      expect(Math.abs(normalA.dot(normalC))).toBeLessThan(0.01)
    }

    geometry.dispose()
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

  it('covers every major grandstand box face from one structure atlas', () => {
    for (const preset of TRACK_PRESETS) {
      const geometry = createGrandstandStructureGeometry(
        preset.curve,
        preset.venue,
      )
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const layouts = GRANDSTAND_LAYOUTS[preset.venue]
      const faceCount = layouts.reduce(
        (count, layout) => count + (layout.tiers + 1) * 6,
        0,
      )

      expect(positions.count).toBe(faceCount * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(faceCount * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(value => (
        Number.isFinite(value) && value > 0 && value < 1
      ))).toBe(true)
      expect(geometry.boundingBox.min.y).toBeGreaterThan(0.08)
      expect(geometry.boundingBox.max.y).toBeLessThan(6.4)

      let standFaceOffset = 0
      for (const layout of layouts) {
        for (let tier = 0; tier < layout.tiers; tier += 1) {
          const boxFace = standFaceOffset + tier * 6
          for (let face = 0; face < 5; face += 1) {
            const vertex = (boxFace + face) * 4
            const faceU = Array.from(
              { length: 4 },
              (_, index) => uvs.getX(vertex + index),
            )
            const faceV = Array.from(
              { length: 4 },
              (_, index) => uvs.getY(vertex + index),
            )
            expect(Math.min(...faceU)).toBeGreaterThan(0.5)
            expect(Math.min(...faceV)).toBeGreaterThan(0.5)
          }

          const topVertex = (boxFace + 5) * 4
          const topNormal = new THREE.Vector3().fromBufferAttribute(
            normals,
            topVertex,
          )
          const topU = Array.from(
            { length: 4 },
            (_, index) => uvs.getX(topVertex + index),
          )
          const topV = Array.from(
            { length: 4 },
            (_, index) => uvs.getY(topVertex + index),
          )
          expect(topNormal.y).toBeGreaterThan(0.99)
          expect(Math.max(...topU)).toBeLessThan(0.5)
          expect(Math.min(...topV)).toBeGreaterThan(0.5)

          const bottomNormal = new THREE.Vector3().fromBufferAttribute(
            normals,
            (boxFace + 4) * 4,
          )
          expect(bottomNormal.y).toBeLessThan(-0.99)
        }

        const roofFace = standFaceOffset + layout.tiers * 6
        for (let face = 0; face < 4; face += 1) {
          const vertex = (roofFace + face) * 4
          const faceU = Array.from(
            { length: 4 },
            (_, index) => uvs.getX(vertex + index),
          )
          const faceV = Array.from(
            { length: 4 },
            (_, index) => uvs.getY(vertex + index),
          )
          expect(Math.min(...faceU)).toBeGreaterThan(0.5)
          expect(Math.min(...faceV)).toBeGreaterThan(0.5)
        }

        const roofBottomVertex = (roofFace + 4) * 4
        const roofTopVertex = (roofFace + 5) * 4
        const roofBottomU = Array.from(
          { length: 4 },
          (_, index) => uvs.getX(roofBottomVertex + index),
        )
        const roofBottomV = Array.from(
          { length: 4 },
          (_, index) => uvs.getY(roofBottomVertex + index),
        )
        const roofTopU = Array.from(
          { length: 4 },
          (_, index) => uvs.getX(roofTopVertex + index),
        )
        const roofTopV = Array.from(
          { length: 4 },
          (_, index) => uvs.getY(roofTopVertex + index),
        )
        expect(Math.min(...roofBottomU)).toBeGreaterThan(0.5)
        expect(Math.max(...roofBottomV)).toBeLessThan(0.5)
        expect(Math.max(...roofTopU)).toBeLessThan(0.5)
        expect(Math.max(...roofTopV)).toBeLessThan(0.5)

        standFaceOffset += (layout.tiers + 1) * 6
      }
      expect(standFaceOffset).toBe(faceCount)

      geometry.dispose()
    }
  })

  it('covers every exposed pit-complex structure face from one atlas', () => {
    let totalFaceCount = 0
    for (const preset of TRACK_PRESETS) {
      const layout = PIT_COMPLEX_STRUCTURE_LAYOUTS[preset.venue]
      const buildingPanels = Math.ceil(
        layout.building.size[2] / layout.maxPanelLength,
      )
      const roofPanels = Math.ceil(
        layout.roof.size[2] / layout.maxPanelLength,
      )
      const pitWallPanels = layout.pitWall
        ? Math.ceil(layout.pitWall.size[2] / layout.pitWall.maxPanelLength)
        : 0
      const pitWallFaces = layout.pitWall ? pitWallPanels * 2 + 2 : 0
      const expectedQuadrants = {
        '0,1': buildingPanels * 2,
        '1,1': 2 + roofPanels * 2 + 2 + pitWallFaces,
        '0,0': roofPanels,
        '1,0': roofPanels,
      }
      const faceCount = Object.values(expectedQuadrants).reduce(
        (count, value) => count + value,
        0,
      )
      const geometry = createPitComplexStructureGeometry(
        preset.curve,
        preset.venue,
      )
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const quadrantCounts = { '0,1': 0, '1,1': 0, '0,0': 0, '1,0': 0 }

      expect(positions.count).toBe(faceCount * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(faceCount * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(value => (
        Number.isFinite(value) && value > 0 && value < 1
      ))).toBe(true)
      expect(geometry.boundingBox.min.y).toBeCloseTo(0, 4)
      expect(geometry.boundingBox.max.y).toBeCloseTo(
        layout.roof.centerY + layout.roof.size[1] / 2 + 0.012,
        4,
      )

      for (let face = 0; face < faceCount; face += 1) {
        const vertex = face * 4
        const faceU = Array.from(
          { length: 4 },
          (_, index) => uvs.getX(vertex + index),
        )
        const faceV = Array.from(
          { length: 4 },
          (_, index) => uvs.getY(vertex + index),
        )
        const column = Math.min(...faceU) > 0.5 ? 1 : 0
        const row = Math.min(...faceV) > 0.5 ? 1 : 0
        const quadrant = `${column},${row}`
        const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
        quadrantCounts[quadrant] += 1

        expect((Math.max(...faceU) < 0.5) || (Math.min(...faceU) > 0.5)).toBe(true)
        expect((Math.max(...faceV) < 0.5) || (Math.min(...faceV) > 0.5)).toBe(true)
        if (quadrant === '0,0') expect(normal.y).toBeGreaterThan(0.99)
        else if (quadrant === '1,0') expect(normal.y).toBeLessThan(-0.99)
        else expect(Math.abs(normal.y)).toBeLessThan(0.01)
      }

      expect(quadrantCounts).toEqual(expectedQuadrants)
      totalFaceCount += faceCount
      geometry.dispose()
    }
    expect(totalFaceCount).toBe(140)
  })

  it('replaces every low-poly palm crown with one road-facing atlas billboard', () => {
    let totalPalmCount = 0

    expect(Object.isFrozen(APEX_PALM_TREE_LAYOUT)).toBe(true)
    expect(APEX_PALM_TREE_LAYOUT).toHaveLength(5)

    for (const preset of TRACK_PRESETS.filter(track => (
      ['apex', 'harbour'].includes(track.venue)
    ))) {
      const layout = getPalmTreeLayout(preset.curve, preset.venue)
      const geometry = createPalmTreeBillboardGeometry(
        preset.curve,
        preset.venue,
      )
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')

      expect(layout).toHaveLength(preset.venue === 'apex' ? 5 : 1)
      expect(positions.count).toBe(layout.length * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(layout.length * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(value => (
        Number.isFinite(value) && value > 0 && value < 1
      ))).toBe(true)
      expect(geometry.boundingBox.min.y).toBeGreaterThan(0)
      expect(geometry.boundingBox.max.y).toBeLessThan(9)

      for (let palm = 0; palm < layout.length; palm += 1) {
        const tree = layout[palm]
        const vertex = palm * 4
        const faceU = Array.from(
          { length: 4 },
          (_, index) => uvs.getX(vertex + index),
        )
        const faceV = Array.from(
          { length: 4 },
          (_, index) => uvs.getY(vertex + index),
        )
        const expectedColumn = tree.variant % 2
        const expectedAtlasRow = Math.floor(tree.variant / 2)
        const tangent = preset.curve.getTangentAt(tree.progress).normalize()
        const roadSide = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          tangent,
        ).normalize()
        const treeCenter = preset.curve.getPointAt(tree.progress)
          .addScaledVector(roadSide, tree.lateral)
          .addScaledVector(tangent, tree.along)
        const expectedNormal = preset.curve.getPointAt(
          ((tree.progress - PALM_TREE_APPROACH_PROGRESS_OFFSET) % 1 + 1) % 1,
        ).sub(treeCenter).setY(0).normalize()
        const actualNormal = new THREE.Vector3().fromBufferAttribute(normals, vertex)

        expect(Math.min(...faceU)).toBeGreaterThan(expectedColumn * 0.5)
        expect(Math.max(...faceU)).toBeLessThan((expectedColumn + 1) * 0.5)
        if (expectedAtlasRow === 0) {
          expect(Math.min(...faceV)).toBeGreaterThan(0.5)
        } else {
          expect(Math.max(...faceV)).toBeLessThan(0.5)
        }
        expect(actualNormal.dot(expectedNormal)).toBeGreaterThan(0.99)
      }

      totalPalmCount += layout.length
      geometry.dispose()
    }

    expect(totalPalmCount).toBe(6)
  })

  it('replaces every Apex pit-lane staff box silhouette with an atlas billboard', () => {
    const apex = TRACK_PRESETS.find(track => track.venue === 'apex')
    const geometry = createApexPitStaffBillboardGeometry(apex.curve)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')

    expect(Object.isFrozen(APEX_PIT_STAFF_LAYOUT)).toBe(true)
    expect(APEX_PIT_STAFF_LAYOUT).toHaveLength(10)
    expect(positions.count).toBe(APEX_PIT_STAFF_LAYOUT.length * 4)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(geometry.getIndex().count).toBe(APEX_PIT_STAFF_LAYOUT.length * 6)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value > 0 && value < 1
    ))).toBe(true)
    expect(geometry.boundingBox.min.y).toBeGreaterThan(0)
    expect(geometry.boundingBox.max.y).toBeLessThan(2.2)

    for (let index = 0; index < APEX_PIT_STAFF_LAYOUT.length; index += 1) {
      const staff = APEX_PIT_STAFF_LAYOUT[index]
      const vertex = index * 4
      const faceU = Array.from(
        { length: 4 },
        (_, offset) => uvs.getX(vertex + offset),
      )
      const faceV = Array.from(
        { length: 4 },
        (_, offset) => uvs.getY(vertex + offset),
      )
      const expectedColumn = staff.variant % 2
      const expectedAtlasRow = Math.floor(staff.variant / 2)
      const tangent = apex.curve.getTangentAt(staff.progress).normalize()
      const side = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, 1, 0),
        tangent,
      ).normalize()
      const staffCenter = apex.curve.getPointAt(staff.progress)
        .addScaledVector(side, staff.lateral)
        .addScaledVector(tangent, staff.along)
      const expectedNormal = apex.curve.getPointAt(
        ((staff.progress - APEX_PIT_STAFF_APPROACH_PROGRESS_OFFSET) % 1 + 1) % 1,
      ).sub(staffCenter).setY(0).normalize()
      const actualNormal = new THREE.Vector3().fromBufferAttribute(normals, vertex)

      expect(Math.min(...faceU)).toBeGreaterThan(expectedColumn * 0.5)
      expect(Math.max(...faceU)).toBeLessThan((expectedColumn + 1) * 0.5)
      if (expectedAtlasRow === 0) {
        expect(Math.min(...faceV)).toBeGreaterThan(0.5)
      } else {
        expect(Math.max(...faceV)).toBeLessThan(0.5)
      }
      expect(actualNormal.dot(expectedNormal)).toBeGreaterThan(0.99)
    }

    geometry.dispose()
  })

  it('maps every Apex main-straight tent canopy to one atlas quadrant', () => {
    const apex = TRACK_PRESETS.find(track => track.venue === 'apex')
    const geometry = createApexTentCanopyGeometry(apex.curve)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const template = new THREE.ConeGeometry(1, 1, 4)
    const verticesPerCanopy = template.getAttribute('position').count
    const indicesPerCanopy = template.getIndex().count
    template.dispose()

    expect(Object.isFrozen(APEX_TENT_CANOPY_LAYOUT)).toBe(true)
    expect(APEX_TENT_CANOPY_LAYOUT).toHaveLength(9)
    expect(APEX_TENT_CANOPY_LAYOUT.every(Object.isFrozen)).toBe(true)
    expect(positions.count).toBe(APEX_TENT_CANOPY_LAYOUT.length * verticesPerCanopy)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(geometry.getIndex().count).toBe(
      APEX_TENT_CANOPY_LAYOUT.length * indicesPerCanopy,
    )
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value > 0 && value < 1
    ))).toBe(true)

    for (let index = 0; index < APEX_TENT_CANOPY_LAYOUT.length; index += 1) {
      const canopy = APEX_TENT_CANOPY_LAYOUT[index]
      const vertexStart = index * verticesPerCanopy
      const faceU = Array.from(
        { length: verticesPerCanopy },
        (_, offset) => uvs.getX(vertexStart + offset),
      )
      const faceV = Array.from(
        { length: verticesPerCanopy },
        (_, offset) => uvs.getY(vertexStart + offset),
      )
      const faceY = Array.from(
        { length: verticesPerCanopy },
        (_, offset) => positions.getY(vertexStart + offset),
      )
      const expectedColumn = canopy.variant % 2
      const expectedAtlasRow = Math.floor(canopy.variant / 2)

      expect(Math.min(...faceU)).toBeGreaterThan(expectedColumn * 0.5)
      expect(Math.max(...faceU)).toBeLessThan((expectedColumn + 1) * 0.5)
      if (expectedAtlasRow === 0) {
        expect(Math.min(...faceV)).toBeGreaterThan(0.5)
      } else {
        expect(Math.max(...faceV)).toBeLessThan(0.5)
      }
      expect(Math.min(...faceY)).toBeCloseTo(canopy.centerY - canopy.height / 2, 5)
      expect(Math.max(...faceY)).toBeCloseTo(canopy.centerY + canopy.height / 2, 5)
    }

    expect(APEX_TENT_CANOPY_LAYOUT.map(canopy => canopy.along)).toEqual([
      -28, -21, -14, -7, 0, 7, 14, 21, 28,
    ])
    expect(APEX_TENT_CANOPY_LAYOUT.map(canopy => canopy.variant)).toEqual([
      0, 1, 2, 3, 0, 1, 2, 3, 0,
    ])

    geometry.dispose()
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

  it('places readable 150, 100, and 50 boards before every major braking zone', () => {
    const expectedBoardCounts = {
      apex: 21,
      harbour: 15,
      temple: 18,
    }
    let totalBoardCount = 0

    for (const preset of TRACK_PRESETS) {
      const layout = getBrakingBoardLayout(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const geometry = createBrakingBoardGraphicsGeometry(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')

      expect(Object.isFrozen(layout)).toBe(true)
      expect(layout).toHaveLength(expectedBoardCounts[preset.venue])
      expect(layout.every(Object.isFrozen)).toBe(true)
      expect(positions.count).toBe(layout.length * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(layout.length * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(value => (
        Number.isFinite(value) && value > 0 && value < 1
      ))).toBe(true)

      for (let index = 0; index < layout.length; index += 1) {
        const board = layout[index]
        const vertex = index * 4
        const expectedColumn = board.variant % 2
        const expectedAtlasRow = Math.floor(board.variant / 2)
        const faceU = Array.from(
          { length: 4 },
          (_, offset) => uvs.getX(vertex + offset),
        )
        const faceV = Array.from(
          { length: 4 },
          (_, offset) => uvs.getY(vertex + offset),
        )
        const approachNormal = preset.curve.getTangentAt(board.progress)
          .normalize()
          .multiplyScalar(-1)
        const actualNormal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
        const distanceBeforeCorner = (
          ((board.cornerProgress - board.progress) % 1 + 1) % 1
        ) * preset.length

        expect(board.label).toBe(BRAKING_BOARD_LABELS[board.variant])
        expect(distanceBeforeCorner).toBeCloseTo(
          board.label * BRAKING_BOARD_WORLD_SCALE,
          5,
        )
        expect(Math.min(...faceU)).toBeGreaterThan(expectedColumn * 0.5)
        expect(Math.max(...faceU)).toBeLessThan((expectedColumn + 1) * 0.5)
        if (expectedAtlasRow === 0) {
          expect(Math.min(...faceV)).toBeGreaterThan(0.5)
        } else {
          expect(Math.max(...faceV)).toBeLessThan(0.5)
        }
        expect(actualNormal.dot(approachNormal)).toBeGreaterThan(0.99)
        expect(Math.min(
          ...Array.from(
            { length: 4 },
            (_, offset) => positions.getY(vertex + offset),
          ),
        )).toBeCloseTo(BRAKING_BOARD_PANEL.centerY - BRAKING_BOARD_PANEL.height / 2, 5)
      }

      for (let index = 0; index < layout.length; index += BRAKING_BOARD_LABELS.length) {
        expect(layout.slice(index, index + BRAKING_BOARD_LABELS.length)
          .map(board => board.label)).toEqual(BRAKING_BOARD_LABELS)
      }

      totalBoardCount += layout.length
      geometry.dispose()
    }

    expect(totalBoardCount).toBe(54)
  })

  it('maps every player-facing trackside operations panel to its atlas module', () => {
    const expectedPanelCounts = {
      apex: 27,
      harbour: 8,
      temple: 8,
    }
    const totalKindCounts = {
      marshalPost: 0,
      broadcastLens: 0,
      pitWallDisplay: 0,
      broadcastCabinet: 0,
    }

    expect(Object.isFrozen(TRACKSIDE_OPERATIONS_VARIANTS)).toBe(true)
    expect(Object.isFrozen(APEX_PIT_WALL_DISPLAY_LAYOUT)).toBe(true)
    expect(APEX_PIT_WALL_DISPLAY_LAYOUT).toHaveLength(14)
    expect(APEX_PIT_WALL_DISPLAY_LAYOUT.every(Object.isFrozen)).toBe(true)
    expect(MARSHAL_POST_PROGRESS).toHaveLength(5)
    expect(BROADCAST_CAMERA_PROGRESS).toHaveLength(4)

    for (const preset of TRACK_PRESETS) {
      const layout = getTracksideOperationsGraphicsLayout(
        preset.venue,
        preset.roadWidth,
      )
      const geometry = createTracksideOperationsGraphicsGeometry(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')

      expect(Object.isFrozen(layout)).toBe(true)
      expect(layout).toHaveLength(expectedPanelCounts[preset.venue])
      expect(layout.every(Object.isFrozen)).toBe(true)
      expect(positions.count).toBe(layout.length * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(layout.length * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(value => (
        Number.isFinite(value) && value > 0 && value < 1
      ))).toBe(true)

      for (let index = 0; index < layout.length; index += 1) {
        const panel = layout[index]
        const vertex = index * 4
        const expectedColumn = panel.variant % 2
        const expectedAtlasRow = Math.floor(panel.variant / 2)
        const faceU = Array.from(
          { length: 4 },
          (_, offset) => uvs.getX(vertex + offset),
        )
        const faceV = Array.from(
          { length: 4 },
          (_, offset) => uvs.getY(vertex + offset),
        )
        const tangent = preset.curve.getTangentAt(panel.progress).normalize()
        const side = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          tangent,
        ).normalize()
        const expectedNormal = side.multiplyScalar(panel.normalLateralSign)
        const actualNormal = new THREE.Vector3().fromBufferAttribute(normals, vertex)

        expect(panel.variant).toBe(TRACKSIDE_OPERATIONS_VARIANTS[panel.kind])
        expect(Math.min(...faceU)).toBeGreaterThan(expectedColumn * 0.5)
        expect(Math.max(...faceU)).toBeLessThan((expectedColumn + 1) * 0.5)
        if (expectedAtlasRow === 0) {
          expect(Math.min(...faceV)).toBeGreaterThan(0.5)
        } else {
          expect(Math.max(...faceV)).toBeLessThan(0.5)
        }
        expect(actualNormal.dot(expectedNormal)).toBeGreaterThan(0.99)
        expect(Math.min(
          ...Array.from(
            { length: 4 },
            (_, offset) => positions.getY(vertex + offset),
          ),
        )).toBeCloseTo(panel.centerY - panel.height / 2, 5)
        totalKindCounts[panel.kind] += 1
      }

      geometry.dispose()
    }

    expect(totalKindCounts).toEqual({
      marshalPost: 5,
      broadcastLens: 12,
      pitWallDisplay: 14,
      broadcastCabinet: 12,
    })
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

  it('tiles the Harbour quay front, cap, and road-clear promenade from one atlas', () => {
    const harbour = TRACK_PRESETS.find(track => track.venue === 'harbour')
    const geometry = createHarbourMarinaSurfaceGeometry()
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const { quay, promenade } = HARBOUR_MARINA_LAYOUT
    const panelCount = Math.ceil(quay.size[0] / quay.panelWidth)
    const quadCount = panelCount * (promenade.rows + 2)

    expect(positions.count).toBe(quadCount * 4)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(geometry.getIndex().count).toBe(quadCount * 6)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value > 0 && value < 1
    ))).toBe(true)
    expect(geometry.boundingBox.min.x).toBeCloseTo(promenade.minX, 3)
    expect(geometry.boundingBox.max.x).toBeCloseTo(promenade.maxX, 3)
    expect(geometry.boundingBox.min.z).toBeCloseTo(promenade.minZ, 3)
    expect(geometry.boundingBox.max.z).toBeCloseTo(
      quay.position[2] + quay.size[2] / 2,
      3,
    )

    const facadeNormal = new THREE.Vector3().fromBufferAttribute(normals, 0)
    const facadeV = Array.from({ length: 4 }, (_, index) => uvs.getY(index))
    expect(facadeNormal.z).toBeLessThan(-0.99)
    expect(Math.min(...facadeV)).toBeGreaterThan(0.5)
    expect(Math.max(...facadeV)).toBeLessThan(1)

    const firstPromenadeVertex = 4
    const promenadeNormal = new THREE.Vector3().fromBufferAttribute(
      normals,
      firstPromenadeVertex,
    )
    const promenadeV = Array.from(
      { length: 4 },
      (_, index) => uvs.getY(firstPromenadeVertex + index),
    )
    expect(promenadeNormal.y).toBeGreaterThan(0.99)
    expect(Math.min(...promenadeV)).toBeGreaterThan(0)
    expect(Math.max(...promenadeV)).toBeLessThan(0.5)

    let minimumRoadEdgeGap = Infinity
    for (let sample = 0; sample < 16_384; sample += 1) {
      const point = harbour.curve.getPointAt(sample / 16_384)
      const deltaX = Math.max(
        promenade.minX - point.x,
        0,
        point.x - promenade.maxX,
      )
      const deltaZ = Math.max(
        promenade.minZ - point.z,
        0,
        point.z - promenade.maxZ,
      )
      minimumRoadEdgeGap = Math.min(
        minimumRoadEdgeGap,
        Math.hypot(deltaX, deltaZ) - harbour.roadWidth / 2,
      )
    }
    expect(minimumRoadEdgeGap).toBeGreaterThan(1)

    geometry.dispose()
  })

  it('covers every exposed Harbour Swimming Pool surface from one atlas', () => {
    const harbour = TRACK_PRESETS.find(track => track.venue === 'harbour')
    const geometry = createHarbourSwimmingPoolSurfaceGeometry()
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const water = HARBOUR_SWIMMING_POOL_PANELS.find(
      panel => panel.role === 'water',
    )
    const deck = HARBOUR_SWIMMING_POOL_PANELS.find(
      panel => panel.role === 'deck',
    )
    const topFaceCount = HARBOUR_SWIMMING_POOL_PANELS.reduce(
      (count, panel) => count + panel.topGrid[0] * panel.topGrid[1],
      0,
    )
    const sideFaceCount = HARBOUR_SWIMMING_POOL_PANELS.reduce(
      (count, panel) => count + 2 * (panel.topGrid[0] + panel.topGrid[1]),
      0,
    )
    const faceCount = topFaceCount + sideFaceCount

    expect(water).toBeTruthy()
    expect(deck).toBeTruthy()
    expect(topFaceCount).toBe(13)
    expect(sideFaceCount).toBe(24)
    expect(positions.count).toBe(faceCount * 4)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(geometry.getIndex().count).toBe(faceCount * 6)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value > 0 && value < 1
    ))).toBe(true)

    const waterTopFaces = water.topGrid[0] * water.topGrid[1]
    const deckTopFaces = deck.topGrid[0] * deck.topGrid[1]
    for (let face = 0; face < waterTopFaces; face += 1) {
      const vertex = face * 4
      const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
      const faceV = Array.from(
        { length: 4 },
        (_, index) => uvs.getY(vertex + index),
      )
      expect(normal.y).toBeGreaterThan(0.99)
      expect(Math.min(...faceV)).toBeGreaterThan(0.5)
    }

    for (let face = waterTopFaces; face < topFaceCount; face += 1) {
      const vertex = face * 4
      const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
      const faceU = Array.from(
        { length: 4 },
        (_, index) => uvs.getX(vertex + index),
      )
      const faceV = Array.from(
        { length: 4 },
        (_, index) => uvs.getY(vertex + index),
      )
      expect(normal.y).toBeGreaterThan(0.99)
      expect(Math.max(...faceU)).toBeLessThan(0.5)
      expect(Math.max(...faceV)).toBeLessThan(0.5)
    }
    expect(topFaceCount - waterTopFaces).toBe(deckTopFaces)

    for (let face = topFaceCount; face < faceCount; face += 1) {
      const vertex = face * 4
      const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
      const faceU = Array.from(
        { length: 4 },
        (_, index) => uvs.getX(vertex + index),
      )
      const faceV = Array.from(
        { length: 4 },
        (_, index) => uvs.getY(vertex + index),
      )
      expect(Math.abs(normal.y)).toBeLessThan(0.01)
      expect(Math.min(...faceU)).toBeGreaterThan(0.5)
      expect(Math.max(...faceV)).toBeLessThan(0.5)
    }

    const poolMinX = Math.min(...HARBOUR_SWIMMING_POOL_PANELS.map(
      panel => panel.position[0] - panel.size[0] / 2,
    ))
    const poolMaxX = Math.max(...HARBOUR_SWIMMING_POOL_PANELS.map(
      panel => panel.position[0] + panel.size[0] / 2,
    ))
    const poolMinZ = Math.min(...HARBOUR_SWIMMING_POOL_PANELS.map(
      panel => panel.position[2] - panel.size[2] / 2,
    ))
    const poolMaxZ = Math.max(...HARBOUR_SWIMMING_POOL_PANELS.map(
      panel => panel.position[2] + panel.size[2] / 2,
    ))
    expect(geometry.boundingBox.min.x).toBeLessThan(poolMinX)
    expect(geometry.boundingBox.max.x).toBeGreaterThan(poolMaxX)
    expect(geometry.boundingBox.min.z).toBeLessThan(poolMinZ)
    expect(geometry.boundingBox.max.z).toBeGreaterThan(poolMaxZ)
    expect(geometry.boundingBox.min.y).toBeGreaterThan(HARBOUR_WATER_SURFACE_Y)

    let minimumRoadEdgeGap = Infinity
    for (let sample = 0; sample < 16_384; sample += 1) {
      const point = harbour.curve.getPointAt(sample / 16_384)
      const deltaX = Math.max(poolMinX - point.x, 0, point.x - poolMaxX)
      const deltaZ = Math.max(poolMinZ - point.z, 0, point.z - poolMaxZ)
      minimumRoadEdgeGap = Math.min(
        minimumRoadEdgeGap,
        Math.hypot(deltaX, deltaZ) - harbour.roadWidth / 2,
      )
    }
    expect(minimumRoadEdgeGap).toBeGreaterThan(16)

    geometry.dispose()
  })

  it('maps all four yacht facade projections onto both sides of every boat', () => {
    const geometry = createHarbourYachtFacadeGeometry()
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const facadesPerYacht = 8
    const facadeCount = HARBOUR_YACHT_LAYOUT.boats.length * facadesPerYacht

    expect(positions.count).toBe(facadeCount * 4)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(geometry.getIndex().count).toBe(facadeCount * 6)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value > 0 && value < 1
    ))).toBe(true)
    expect(geometry.boundingBox.min.y).toBeGreaterThan(0.14)
    expect(geometry.boundingBox.max.y).toBeLessThan(1.96)

    for (const [yachtIndex, yacht] of HARBOUR_YACHT_LAYOUT.boats.entries()) {
      const yachtVertex = yachtIndex * facadesPerYacht * 4
      const right = new THREE.Vector3(
        Math.cos(yacht.yaw),
        0,
        -Math.sin(yacht.yaw),
      )
      const forward = new THREE.Vector3(
        Math.sin(yacht.yaw),
        0,
        Math.cos(yacht.yaw),
      )
      const faces = [
        { offset: 0, expectedNormal: right.clone().multiplyScalar(-1), column: 0, row: 1 },
        { offset: 1, expectedNormal: right, column: 0, row: 1 },
        { offset: 2, expectedNormal: forward.clone().multiplyScalar(-1), column: 1, row: 1 },
        { offset: 3, expectedNormal: forward, column: 1, row: 1 },
        { offset: 4, expectedNormal: right.clone().multiplyScalar(-1), column: 0, row: 0 },
        { offset: 5, expectedNormal: right, column: 0, row: 0 },
        { offset: 6, expectedNormal: forward.clone().multiplyScalar(-1), column: 1, row: 0 },
        { offset: 7, expectedNormal: forward, column: 1, row: 0 },
      ]

      for (const face of faces) {
        const vertex = yachtVertex + face.offset * 4
        const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
        const faceU = Array.from({ length: 4 }, (_, index) => uvs.getX(vertex + index))
        const faceV = Array.from({ length: 4 }, (_, index) => uvs.getY(vertex + index))

        expect(normal.dot(face.expectedNormal)).toBeGreaterThan(0.99)
        expect(Math.min(...faceU)).toBeGreaterThan(face.column * 0.5)
        expect(Math.max(...faceU)).toBeLessThan((face.column + 1) * 0.5)
        expect(Math.min(...faceV)).toBeGreaterThan(face.row * 0.5)
        expect(Math.max(...faceV)).toBeLessThan((face.row + 1) * 0.5)
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

  it('covers every exposed Temple banking surface and timing-tower side', () => {
    const temple = TRACK_PRESETS.find(track => track.venue === 'temple')
    const geometry = createTempleVenueFacadeGeometry(
      temple.curve,
      temple.roadWidth,
    )
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const bankingFaces = 26
    const towerFaces = 4
    const facadeCount = bankingFaces + towerFaces

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
    expect(geometry.boundingBox.max.y).toBeLessThan(20.5)

    for (let face = 0; face < facadeCount; face += 1) {
      const vertex = face * 4
      const faceV = Array.from(
        { length: 4 },
        (_, index) => uvs.getY(vertex + index),
      )
      if (face < bankingFaces) {
        expect(Math.min(...faceV)).toBeGreaterThan(0.5)
      } else {
        expect(Math.max(...faceV)).toBeLessThan(0.5)
      }
    }

    for (const soffitFace of [12, 13, 18, 19, 24, 25]) {
      const faceU = Array.from(
        { length: 4 },
        (_, index) => uvs.getX(soffitFace * 4 + index),
      )
      expect(Math.min(...faceU)).toBeGreaterThan(0.5)
    }

    const deckBottomNormal = new THREE.Vector3().fromBufferAttribute(
      normals,
      12 * 4,
    )
    const deckTopNormal = new THREE.Vector3().fromBufferAttribute(
      normals,
      13 * 4,
    )
    expect(deckBottomNormal.y).toBeLessThan(-0.99)
    expect(deckTopNormal.y).toBeGreaterThan(0.99)

    const towerFirstFace = bankingFaces
    const towerNormals = Array.from({ length: towerFaces }, (_, face) => (
      new THREE.Vector3().fromBufferAttribute(
        normals,
        (towerFirstFace + face) * 4,
      )
    ))
    expect(towerNormals[0].dot(towerNormals[1])).toBeLessThan(-0.99)
    expect(towerNormals[2].dot(towerNormals[3])).toBeLessThan(-0.99)
    expect(Math.abs(towerNormals[0].dot(towerNormals[2]))).toBeLessThan(0.01)
    expect(TEMPLE_TIMING_TOWER_LAYOUT.size[1]).toBe(18)

    geometry.dispose()
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
