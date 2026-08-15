import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { START_FINISH_PROGRESS, TRACK_CENTERLINE_Y, TRACK_PRESETS, trackCurve, trackLength } from '../utils/trackData'
import { START_GRID, START_GRID_DISTANCE_BEHIND_LINE, getStartGridPose } from '../utils/startGrid'
import {
  BARRIER_GRAPHICS_BOTTOM_OFFSET,
  BARRIER_GRAPHICS_HEIGHT,
  BARRIER_SEGMENTS,
  BARRIER_STRUCTURAL_SURFACE_VARIANTS,
  BRAKING_BOARD_LABELS,
  BRAKING_BOARD_PANEL,
  BRAKING_BOARD_WORLD_SCALE,
  APEX_PIT_STAFF_APPROACH_PROGRESS_OFFSET,
  APEX_PIT_STAFF_LAYOUT,
  APEX_PALM_TREE_LAYOUT,
  APEX_PIT_GARAGE_HEADER,
  APEX_PIT_APRON_LAYOUT,
  APEX_PIT_LANE_EQUIPMENT_LAYOUT,
  APEX_PIT_LANE_LIGHT_LAYOUT,
  APEX_PIT_WALL_ACCENT_LAYOUT,
  APEX_PIT_BAY_SERVICE_LAYOUT,
  APEX_PIT_BAY_TRIM_LAYOUT,
  APEX_PIT_SERVICE_PAD_LAYOUT,
  APEX_MARSHAL_POST_ROOF,
  APEX_PIT_WALL_DISPLAY_LAYOUT,
  APEX_RACE_CONTROL_LAYOUT,
  APEX_RACE_CONTROL_ROOF_LAYOUT,
  APEX_RACE_CONTROL_ROOF_SURFACE_VARIANTS,
  APEX_MARSHAL_WINDOW_SURFACE_LAYOUT,
  APEX_MARSHAL_WINDOW_SURFACE_VARIANTS,
  APEX_TIMING_MAST_LAYOUT,
  APEX_TENT_CANOPY_LAYOUT,
  BROADCAST_CAMERA_PROGRESS,
  BROADCAST_CAMERA_SUPPORT_LAYOUT,
  CATCH_FENCE_TEXTURE_WORLD_WIDTH,
  createApexPitStaffBillboardGeometry,
  createApexMarshalWindowSurfaceGeometry,
  createApexGravelRunoffGeometry,
  createApexRaceControlFacadeGeometry,
  createApexRaceControlRoofSurfaceGeometry,
  createApexTentCanopyGeometry,
  createApexTowerRingSurfaceGeometry,
  createApexVenueFacadeGeometry,
  createBarrierGraphicsGeometry,
  createBarrierGeometry,
  createBarrierStructuralSurfaceGeometry,
  createBrakingBoardGraphicsGeometry,
  createCatchFenceGeometry,
  createCircuitGlowGeometry,
  createCircuitSceneryGeometry,
  createCrowdPanelGeometry,
  createGantryDisplayGeometry,
  createGantryStructureSurfaceGeometry,
  createGrandstandStructureGeometry,
  createHarbourApartmentUpperSurfaceGeometry,
  createHarbourBuildingFacadeGeometry,
  createHarbourHairpinIslandSurfaceGeometry,
  createHarbourMarinaSurfaceGeometry,
  createHarbourRetainingWallFacadeGeometry,
  createHarbourSwimmingPoolSurfaceGeometry,
  createHarbourTunnelCeilingPortalGeometry,
  createHarbourTunnelWallGeometry,
  createHarbourYachtFacadeGeometry,
  createHarbourYachtRigSurfaceGeometry,
  createHarbourYachtUpperSurfaceGeometry,
  createKerbSurfaceGeometry,
  createPitComplexStructureGeometry,
  createPitGarageFacadeGeometry,
  createPalmTreeBillboardGeometry,
  createPalmTrunkSurfaceGeometry,
  createRoadColliderGeometry,
  createRoadGeometry,
  createTempleGrassVergeGeometry,
  createTempleGravelRunoffGeometry,
  createTempleTreeBillboardGeometry,
  createTempleVenueFacadeGeometry,
  createTrackLightingGraphicsGeometry,
  createTrackSurfaceWearGeometry,
  createTracksideOperationsGraphicsGeometry,
  APEX_VENUE_FACADE_LAYOUT,
  APEX_TOWER_RING_LAYOUT,
  APEX_TOWER_RING_SURFACE_VARIANTS,
  CHEVRON_LANE_CENTERS,
  CURB_CENTER_OFFSET,
  CURB_LENGTH_FACTOR,
  CURB_SEGMENTS,
  CURB_WIDTH,
  DIRECTION_MARKER_PROGRESS,
  EDGE_LINE_OFFSET,
  EDGE_LINE_WIDTH,
  FINISH_LINE_LEVEL,
  FLOODLIGHT_COUNT,
  GANTRY_DISPLAY_LAYOUTS,
  GANTRY_ACCENT_CARRIER_LAYOUTS,
  GANTRY_STRUCTURE_VARIANTS,
  KERB_SURFACE_VARIANTS,
  PALM_TRUNK_SURFACE_VARIANTS,
  getCurbSegmentLength,
  getApexGravelRunoffLayout,
  getApexPitStraightRunoffLayout,
  getBrakingBoardGraphicsLayout,
  getFloodlightPositions,
  getGantryStructureLayout,
  getKerbSurfaceLayout,
  getTempleGravelRunoffLayout,
  getBrakingBoardLayout,
  getHarbourTunnelLayout,
  getHarbourTunnelLightingLayout,
  getPalmTreeLayout,
  getApexRaceControlFacadeLayout,
  getTrackLightingGraphicsLayout,
  getTracksideOperationsGraphicsLayout,
  GRANDSTAND_ACCENT_CANOPY,
  GRANDSTAND_LAYOUTS,
  GRANDSTAND_ROOF_RIB,
  HARBOUR_BUILDINGS,
  HARBOUR_HAIRPIN_ISLAND_LAYOUT,
  HARBOUR_APARTMENT_UPPER_SURFACE_VARIANTS,
  HARBOUR_MARINA_LAYOUT,
  HARBOUR_RETAINING_WALL_LAYOUT,
  HARBOUR_SWIMMING_POOL_PANELS,
  HARBOUR_TUNNEL_END_PROGRESS,
  HARBOUR_TUNNEL_LIGHT_COUNT,
  HARBOUR_TUNNEL_LIGHT_FIXTURE,
  HARBOUR_TUNNEL_LIGHT_HEIGHT,
  HARBOUR_TUNNEL_STRUCTURAL_RIB,
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
  INFIELD_ALBEDO_REPEAT,
  LOW_DETAIL_SURFACE_SEGMENTS,
  MARSHAL_POST_PROGRESS,
  PIT_GARAGE_FACADE_LAYOUTS,
  PIT_GARAGE_GLASS_LAYOUTS,
  ROAD_SEGMENTS,
  ROAD_WIDTH,
  ROAD_TOP_OFFSET,
  SECTOR_LANDMARK_PROGRESS,
  SHOULDER_CENTER_OFFSET,
  SHOULDER_WIDTH,
  START_GANTRY_PROGRESS,
  START_GRID_BOX,
  START_LIGHT_LATERALS,
  START_SIGNAL_BODY,
  APEX_FLOODLIGHT_LAYOUT,
  SURFACE_LEVELS,
  SURFACE_SEGMENTS,
  TEMPLE_BANKING_LAYOUT,
  YACHT_RIG_SURFACE_VARIANTS,
  YACHT_UPPER_SURFACE_VARIANTS,
  TEMPLE_PIT_BAY_TRIM_LAYOUT,
  TEMPLE_START_GANTRY_TRIM_LAYOUT,
  TEMPLE_TURF_WORLD_TILE_SIZE,
  TEMPLE_GRAVEL_WORLD_TILE_SIZE,
  TEMPLE_TIMING_TOWER_LAYOUT,
  TEMPLE_TIMING_TOWER_CAP,
  TEMPLE_TIMING_TOWER_FLOOR_BANDS,
  TEMPLE_TIMING_TOWER_GLASS,
  TEMPLE_TREE_LAYOUT,
  TRACKSIDE_BARRIER_POST_LAYOUT,
  TRACK_LIGHTING_GRAPHICS_VARIANTS,
  TRACK_GLOW_SURFACE_VARIANTS,
  TRACK_SURFACE_WEAR_VARIANTS,
  TRACKSIDE_OPERATIONS_VARIANTS,
  TRACKSIDE_OPERATIONS_BODY_LAYOUTS,
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
        createBarrierStructuralSurfaceGeometry(
          preset.curve,
          preset.venue,
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
        createTrackLightingGraphicsGeometry(
          preset.curve,
          preset.venue,
          preset.roadWidth,
        ),
        createTrackSurfaceWearGeometry(
          preset.curve,
          preset.venue,
          preset.roadWidth,
        ),
        createCircuitSceneryGeometry(preset.curve, preset.venue, preset.roadWidth),
        createKerbSurfaceGeometry(preset.curve, preset.venue, preset.roadWidth),
        createCrowdPanelGeometry(preset.curve, preset.venue),
        createGrandstandStructureGeometry(preset.curve, preset.venue),
        createPitComplexStructureGeometry(preset.curve, preset.venue),
        createPitGarageFacadeGeometry(preset.curve, preset.venue),
        createGantryDisplayGeometry(preset.curve, preset.venue),
        createGantryStructureSurfaceGeometry(
          preset.curve,
          preset.venue,
          preset.roadWidth,
        ),
        ...(preset.venue === 'apex'
          ? [
            createApexVenueFacadeGeometry(preset.curve),
            createApexRaceControlFacadeGeometry(preset.curve, preset.roadWidth),
            createApexPitStaffBillboardGeometry(preset.curve),
            createApexTentCanopyGeometry(preset.curve),
            createApexTowerRingSurfaceGeometry(preset.curve),
            createApexGravelRunoffGeometry(preset.curve, preset.roadWidth),
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
            createHarbourApartmentUpperSurfaceGeometry(preset.curve),
            createHarbourRetainingWallFacadeGeometry(
              preset.curve,
              preset.roadWidth,
            ),
            createHarbourSwimmingPoolSurfaceGeometry(),
            createHarbourYachtFacadeGeometry(),
            createHarbourYachtUpperSurfaceGeometry(),
            createHarbourYachtRigSurfaceGeometry(),
          ]
          : []),
        ...(['apex', 'harbour'].includes(preset.venue)
          ? [
            createPalmTreeBillboardGeometry(preset.curve, preset.venue),
            createPalmTrunkSurfaceGeometry(preset.curve, preset.venue),
          ]
          : []),
        ...(preset.venue === 'temple'
          ? [
            createTempleGrassVergeGeometry(preset.curve, preset.roadWidth),
            createTempleGravelRunoffGeometry(preset.curve, preset.roadWidth),
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
        expect(layouts[panel].approachOffset).toBe(panel === 0 ? -0.402 : -0.382)
        const carrier = GANTRY_ACCENT_CARRIER_LAYOUTS[preset.venue][panel]
        const carrierApproachFace = -(
          carrier.size[2] / 2 + carrier.surfaceOffset
        )
        expect(layouts[panel].approachOffset).toBeLessThan(
          carrierApproachFace - 0.005,
        )
        const tangent = preset.curve
          .getTangentAt(layouts[panel].progress)
          .normalize()
        const normal = new THREE.Vector3().fromBufferAttribute(normals, panel * 4)
        expect(normal.dot(tangent)).toBeLessThan(-0.9)
      }

      geometry.dispose()
    }
  })

  it('covers every gantry and Apex timing-mast face with atlas-safe surfaces', () => {
    const atlasInset = 1 / 1024
    expect(Object.isFrozen(APEX_PIT_LANE_LIGHT_LAYOUT)).toBe(true)
    expect(APEX_PIT_LANE_LIGHT_LAYOUT).toHaveLength(2)
    expect(APEX_PIT_LANE_LIGHT_LAYOUT.every(light => (
      Object.isFrozen(light)
      && Object.isFrozen(light.pole)
      && Object.isFrozen(light.pole.size)
      && Object.isFrozen(light.arm)
      && Object.isFrozen(light.arm.size)
      && Object.isFrozen(light.head)
      && Object.isFrozen(light.head.size)
    ))).toBe(true)
    expect(Object.isFrozen(BROADCAST_CAMERA_SUPPORT_LAYOUT)).toBe(true)
    expect(Object.isFrozen(BROADCAST_CAMERA_SUPPORT_LAYOUT.pole)).toBe(true)
    expect(Object.isFrozen(BROADCAST_CAMERA_SUPPORT_LAYOUT.pole.size)).toBe(true)
    expect(Object.isFrozen(BROADCAST_CAMERA_SUPPORT_LAYOUT.arm)).toBe(true)
    expect(Object.isFrozen(BROADCAST_CAMERA_SUPPORT_LAYOUT.arm.size)).toBe(true)
    for (const preset of TRACK_PRESETS) {
      const geometry = createGantryStructureSurfaceGeometry(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const layouts = getGantryStructureLayout(preset.venue, preset.roadWidth)
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const variantCounts = [0, 0, 0, 0]
      let expectedQuads = 0
      let quadOffset = 0

      for (const layout of layouts) {
        const [barWidth, barHeight] = layout.crossbar.size
        const [, postHeight] = layout.post.size
        const barPanels = Math.ceil(barWidth / 2)
        const postBaseY = layout.post.centerY - postHeight / 2
        const postTopY = Math.min(
          layout.post.centerY + postHeight / 2,
          layout.crossbar.centerY - barHeight / 2,
        )
        const postPanels = Math.ceil((postTopY - postBaseY) / 1)
        const layoutQuads = barPanels * 4 + 2 + postPanels * 8
        expectedQuads += layoutQuads

        const tangent = preset.curve.getTangentAt(layout.progress).normalize()
        const side = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          tangent,
        ).normalize()
        const axes = [tangent, side, new THREE.Vector3(0, 1, 0)]
        for (let quad = quadOffset; quad < quadOffset + layoutQuads; quad += 1) {
          const normal = new THREE.Vector3().fromBufferAttribute(normals, quad * 4)
          expect(normal.length()).toBeCloseTo(1, 5)
          expect(Math.max(...axes.map(axis => Math.abs(normal.dot(axis))))).toBeGreaterThan(0.9999)
        }
        quadOffset += layoutQuads
      }

      const [, barrierPostHeight] = TRACKSIDE_BARRIER_POST_LAYOUT.size
      const barrierPostBaseY = Math.max(
        0,
        TRACKSIDE_BARRIER_POST_LAYOUT.centerY - barrierPostHeight / 2,
      )
      const exposedBarrierPostHeight = (
        TRACKSIDE_BARRIER_POST_LAYOUT.centerY
        + barrierPostHeight / 2
        - barrierPostBaseY
      )
      const barrierPostPanels = Math.ceil(exposedBarrierPostHeight / 1)
      const barrierPostQuadsPerSide = barrierPostPanels * 4 + 1
      const barrierPostQuads = (
        TRACKSIDE_BARRIER_POST_LAYOUT.count * 2 * barrierPostQuadsPerSide
      )
      const firstBarrierQuad = quadOffset
      for (
        let post = 0;
        post < TRACKSIDE_BARRIER_POST_LAYOUT.count;
        post += 1
      ) {
        const tangent = preset.curve
          .getTangentAt(post / TRACKSIDE_BARRIER_POST_LAYOUT.count)
          .normalize()
        const side = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          tangent,
        ).normalize()
        const axes = [tangent, side, new THREE.Vector3(0, 1, 0)]
        const postFirstQuad = quadOffset + post * barrierPostQuadsPerSide * 2
        for (
          let quad = postFirstQuad;
          quad < postFirstQuad + barrierPostQuadsPerSide * 2;
          quad += 1
        ) {
          const normal = new THREE.Vector3().fromBufferAttribute(normals, quad * 4)
          expect(normal.length()).toBeCloseTo(1, 5)
          expect(
            Math.max(...axes.map(axis => Math.abs(normal.dot(axis)))),
          ).toBeGreaterThan(0.9999)
        }
      }
      expectedQuads += barrierPostQuads
      quadOffset += barrierPostQuads

      const firstBarrierU = Array.from(
        { length: 4 },
        (_, vertex) => uvs.getX(firstBarrierQuad * 4 + vertex),
      )
      const firstBarrierV = Array.from(
        { length: 4 },
        (_, vertex) => uvs.getY(firstBarrierQuad * 4 + vertex),
      )
      const mappedBarrierAspect = (
        (Math.max(...firstBarrierU) - Math.min(...firstBarrierU))
        / (Math.max(...firstBarrierV) - Math.min(...firstBarrierV))
      )
      expect(mappedBarrierAspect).toBeCloseTo(
        TRACKSIDE_BARRIER_POST_LAYOUT.size[0]
          / (exposedBarrierPostHeight / barrierPostPanels),
        6,
      )

      const brakingBoardLayout = getBrakingBoardLayout(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const brakingBoardPoleCount = brakingBoardLayout.length
      const brakingBoardPoleQuads = brakingBoardPoleCount * 5
      for (let board = 0; board < brakingBoardPoleCount; board += 1) {
        const progress = brakingBoardLayout[board].progress
        const tangent = preset.curve.getTangentAt(progress).normalize()
        const side = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          tangent,
        ).normalize()
        const axes = [tangent, side, new THREE.Vector3(0, 1, 0)]
        const firstQuad = quadOffset + board * 5
        for (let quad = firstQuad; quad < firstQuad + 5; quad += 1) {
          const normal = new THREE.Vector3().fromBufferAttribute(normals, quad * 4)
          expect(normal.length()).toBeCloseTo(1, 5)
          expect(
            Math.max(...axes.map(axis => Math.abs(normal.dot(axis)))),
          ).toBeGreaterThan(0.9999)
        }
      }
      const firstBrakingPoleU = Array.from(
        { length: 4 },
        (_, vertex) => uvs.getX(quadOffset * 4 + vertex),
      )
      const firstBrakingPoleV = Array.from(
        { length: 4 },
        (_, vertex) => uvs.getY(quadOffset * 4 + vertex),
      )
      expect(
        (Math.max(...firstBrakingPoleU) - Math.min(...firstBrakingPoleU))
          / (Math.max(...firstBrakingPoleV) - Math.min(...firstBrakingPoleV)),
      ).toBeCloseTo(
        BRAKING_BOARD_PANEL.poleWidth / BRAKING_BOARD_PANEL.poleHeight,
        6,
      )
      expectedQuads += brakingBoardPoleQuads
      quadOffset += brakingBoardPoleQuads

      const timingMastPolePanels = preset.venue === 'apex'
        ? Math.ceil(APEX_TIMING_MAST_LAYOUT.pole.size[1] / 1)
        : 0
      const timingMastBarPanels = preset.venue === 'apex'
        ? APEX_TIMING_MAST_LAYOUT.crossbars.reduce((sum, crossbar) => (
          sum + Math.ceil(crossbar.size[0] / 2)
        ), 0)
        : 0
      const timingMastQuads = preset.venue === 'apex'
        ? timingMastPolePanels * 4
          + 1
          + timingMastBarPanels * 4
          + APEX_TIMING_MAST_LAYOUT.crossbars.length * 2
        : 0
      if (timingMastQuads > 0) {
        const tangent = preset.curve
          .getTangentAt(APEX_TIMING_MAST_LAYOUT.progress)
          .normalize()
        const side = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          tangent,
        ).normalize()
        const axes = [tangent, side, new THREE.Vector3(0, 1, 0)]
        for (let quad = quadOffset; quad < quadOffset + timingMastQuads; quad += 1) {
          const normal = new THREE.Vector3().fromBufferAttribute(normals, quad * 4)
          expect(normal.length()).toBeCloseTo(1, 5)
          expect(
            Math.max(...axes.map(axis => Math.abs(normal.dot(axis)))),
          ).toBeGreaterThan(0.9999)
        }
        expectedQuads += timingMastQuads
      }

      const pitLightPolePanels = preset.venue === 'apex'
        ? Math.ceil(APEX_PIT_LANE_LIGHT_LAYOUT[0].pole.size[1])
        : 0
      const pitLightArmPanels = preset.venue === 'apex'
        ? Math.ceil(APEX_PIT_LANE_LIGHT_LAYOUT[0].arm.size[2])
        : 0
      const pitLightStructureQuads = preset.venue === 'apex'
        ? APEX_PIT_LANE_LIGHT_LAYOUT.length * (
          pitLightPolePanels * 4 + 1
          + pitLightArmPanels * 4 + 2
        )
        : 0
      expectedQuads += pitLightStructureQuads
      const broadcastPolePanels = Math.ceil(
        BROADCAST_CAMERA_SUPPORT_LAYOUT.pole.size[1],
      )
      const broadcastArmPanels = Math.ceil(
        BROADCAST_CAMERA_SUPPORT_LAYOUT.arm.size[0],
      )
      const broadcastStructureQuads = BROADCAST_CAMERA_PROGRESS.length * (
        broadcastPolePanels * 4
        + broadcastArmPanels * 4 + 2
      )
      expectedQuads += broadcastStructureQuads
      const floodlightPolePanels = preset.venue === 'apex'
        ? Math.ceil(APEX_FLOODLIGHT_LAYOUT.pole.size[1])
        : 0
      const floodlightPoleQuads = (
        floodlightPolePanels * FLOODLIGHT_COUNT * 4
      )
      expectedQuads += floodlightPoleQuads
      const towerFlagPolePanels = preset.venue === 'apex'
        ? Math.ceil(APEX_VENUE_FACADE_LAYOUT.tower.flagPole.size[1])
        : 0
      const towerFlagPoleQuads = preset.venue === 'apex'
        ? towerFlagPolePanels * 4 + 1
        : 0
      expectedQuads += towerFlagPoleQuads

      expect(positions.count).toBe(expectedQuads * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(expectedQuads * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)

      for (let quad = 0; quad < expectedQuads; quad += 1) {
        const quadUvs = Array.from({ length: 4 }, (_, vertex) => ({
          u: uvs.getX(quad * 4 + vertex),
          v: uvs.getY(quad * 4 + vertex),
        }))
        const minU = Math.min(...quadUvs.map(uv => uv.u))
        const maxU = Math.max(...quadUvs.map(uv => uv.u))
        const minV = Math.min(...quadUvs.map(uv => uv.v))
        const maxV = Math.max(...quadUvs.map(uv => uv.v))
        expect(minU).toBeGreaterThanOrEqual(atlasInset)
        expect(maxU).toBeLessThanOrEqual(1 - atlasInset)
        expect(minV).toBeGreaterThanOrEqual(atlasInset)
        expect(maxV).toBeLessThanOrEqual(1 - atlasInset)
        expect(maxU <= 0.5 - atlasInset || minU >= 0.5 + atlasInset).toBe(true)
        expect(maxV <= 0.5 - atlasInset || minV >= 0.5 + atlasInset).toBe(true)
        const column = minU > 0.5 ? 1 : 0
        const row = minV > 0.5 ? 0 : 1
        variantCounts[row * 2 + column] += 1
      }

      const expectedBarPanels = layouts.reduce((sum, layout) => (
        sum + Math.ceil(layout.crossbar.size[0] / 2)
      ), 0)
      const firstLayoutBarPanels = Math.ceil(layouts[0].crossbar.size[0] / 2)
      const firstPostFrontQuad = firstLayoutBarPanels * 4 + 2
      expect(
        uvs.getX(firstPostFrontQuad * 4)
        + uvs.getX((firstPostFrontQuad + 4) * 4),
      ).toBeCloseTo(1.5, 6)
      const expectedPostPanels = layouts.reduce((sum, layout) => {
        const [, barHeight] = layout.crossbar.size
        const [, postHeight] = layout.post.size
        const postBaseY = layout.post.centerY - postHeight / 2
        const postTopY = Math.min(
          layout.post.centerY + postHeight / 2,
          layout.crossbar.centerY - barHeight / 2,
        )
        return sum + Math.ceil((postTopY - postBaseY) / 1)
      }, 0)
      expect(variantCounts[GANTRY_STRUCTURE_VARIANTS.crossbarFront]).toBe(
        expectedBarPanels
          + timingMastBarPanels
          + pitLightArmPanels * APEX_PIT_LANE_LIGHT_LAYOUT.length
          + broadcastArmPanels * BROADCAST_CAMERA_PROGRESS.length,
      )
      expect(variantCounts[GANTRY_STRUCTURE_VARIANTS.upright]).toBe(
        expectedPostPanels * 4
          + barrierPostPanels * TRACKSIDE_BARRIER_POST_LAYOUT.count * 2 * 4
          + brakingBoardPoleCount * 4
          + timingMastPolePanels * 4
          + pitLightPolePanels * APEX_PIT_LANE_LIGHT_LAYOUT.length * 4
          + broadcastPolePanels * BROADCAST_CAMERA_PROGRESS.length * 4
          + floodlightPoleQuads
          + towerFlagPolePanels * 4,
      )
      expect(variantCounts[GANTRY_STRUCTURE_VARIANTS.underside]).toBe(
        expectedBarPanels
          + timingMastBarPanels
          + pitLightArmPanels * APEX_PIT_LANE_LIGHT_LAYOUT.length
          + broadcastArmPanels * BROADCAST_CAMERA_PROGRESS.length,
      )
      expect(variantCounts[GANTRY_STRUCTURE_VARIANTS.serviceBackEnd]).toBe(
        expectedBarPanels * 2
          + layouts.length * 2
          + expectedPostPanels * 4
          + TRACKSIDE_BARRIER_POST_LAYOUT.count * 2
          + brakingBoardPoleCount
          + (preset.venue === 'apex'
            ? timingMastBarPanels * 2
              + APEX_TIMING_MAST_LAYOUT.crossbars.length * 2
              + 1
              + APEX_PIT_LANE_LIGHT_LAYOUT.length * (
                1 + pitLightArmPanels * 2 + 2
              )
            : 0)
          + BROADCAST_CAMERA_PROGRESS.length * (
            broadcastArmPanels * 2 + 2
          )
          + (preset.venue === 'apex' ? 1 : 0),
      )
      expect(geometry.boundingBox.min.y).toBeCloseTo(0, 5)
      expect(geometry.boundingBox.max.y).toBeCloseTo(
        preset.venue === 'apex' ? 35.212 : 7.562,
        5,
      )
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

  it('covers every Apex tower-ring top, underside, and outer fascia', () => {
    const apex = TRACK_PRESETS.find(track => track.venue === 'apex')
    const geometry = createApexTowerRingSurfaceGeometry(apex.curve)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const colors = geometry.getAttribute('color')
    const index = geometry.getIndex()
    const atlasInset = 1 / 1024
    const expectedVertices = APEX_TOWER_RING_LAYOUT.reduce((sum, ring) => (
      sum + (ring.segments + 1) * 2 * 3
    ), 0)
    const expectedIndices = APEX_TOWER_RING_LAYOUT.reduce((sum, ring) => (
      sum + ring.segments * 6 * 3
    ), 0)
    const variantCounts = [0, 0, 0, 0]

    expect(Object.isFrozen(APEX_TOWER_RING_LAYOUT)).toBe(true)
    expect(APEX_TOWER_RING_LAYOUT).toHaveLength(17)
    expect(APEX_TOWER_RING_LAYOUT.every(Object.isFrozen)).toBe(true)
    expect(positions.count).toBe(expectedVertices)
    expect(normals.count).toBe(expectedVertices)
    expect(uvs.count).toBe(expectedVertices)
    expect(colors.count).toBe(expectedVertices)
    expect(index.count).toBe(expectedIndices)
    expect(index.count / 3).toBe(2_040)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(colors.array).every(Number.isFinite)).toBe(true)
    expect(geometry.boundingBox.min.y).toBeCloseTo(1.948, 5)
    expect(geometry.boundingBox.max.y).toBeCloseTo(26.537, 5)

    let vertexOffset = 0
    for (const ring of APEX_TOWER_RING_LAYOUT) {
      const verticesPerPart = (ring.segments + 1) * 2
      const expectedVariants = [
        ring.topVariant,
        ring.undersideVariant,
        ring.fasciaVariant,
      ]
      const expectedTint = new THREE.Color(ring.tint)

      for (let part = 0; part < 3; part += 1) {
        const partUvs = Array.from({ length: verticesPerPart }, (_, vertex) => ({
          u: uvs.getX(vertexOffset + vertex),
          v: uvs.getY(vertexOffset + vertex),
        }))
        const minU = Math.min(...partUvs.map(uv => uv.u))
        const maxU = Math.max(...partUvs.map(uv => uv.u))
        const minV = Math.min(...partUvs.map(uv => uv.v))
        const maxV = Math.max(...partUvs.map(uv => uv.v))
        const variant = expectedVariants[part]
        const column = variant % 2
        const row = Math.floor(variant / 2)
        const moduleMinV = row === 0 ? 0.5 : 0
        const moduleMaxV = row === 0 ? 1 : 0.5

        expect(minU).toBeGreaterThan(column * 0.5 + atlasInset - 1e-6)
        expect(maxU).toBeLessThan((column + 1) * 0.5 - atlasInset + 1e-6)
        expect(minV).toBeGreaterThan(moduleMinV + atlasInset - 1e-6)
        expect(maxV).toBeLessThan(moduleMaxV - atlasInset + 1e-6)
        expect(colors.getX(vertexOffset)).toBeCloseTo(expectedTint.r, 5)
        expect(colors.getY(vertexOffset)).toBeCloseTo(expectedTint.g, 5)
        expect(colors.getZ(vertexOffset)).toBeCloseTo(expectedTint.b, 5)
        variantCounts[variant] += 1
        vertexOffset += verticesPerPart
      }
    }

    expect(variantCounts[APEX_TOWER_RING_SURFACE_VARIANTS.ledgeTop]).toBe(9)
    expect(variantCounts[APEX_TOWER_RING_SURFACE_VARIANTS.underside]).toBe(25)
    expect(variantCounts[APEX_TOWER_RING_SURFACE_VARIANTS.paleFascia]).toBe(8)
    expect(variantCounts[APEX_TOWER_RING_SURFACE_VARIANTS.accentFascia]).toBe(9)

    for (let triangle = 0; triangle < index.count; triangle += 3) {
      const ia = index.getX(triangle)
      const ib = index.getX(triangle + 1)
      const ic = index.getX(triangle + 2)
      const a = new THREE.Vector3().fromBufferAttribute(positions, ia)
      const b = new THREE.Vector3().fromBufferAttribute(positions, ib)
      const c = new THREE.Vector3().fromBufferAttribute(positions, ic)
      const cross = b.clone().sub(a).cross(c.clone().sub(a)).normalize()
      const averageNormal = new THREE.Vector3()
        .fromBufferAttribute(normals, ia)
        .add(new THREE.Vector3().fromBufferAttribute(normals, ib))
        .add(new THREE.Vector3().fromBufferAttribute(normals, ic))
        .normalize()
      expect(cross.dot(averageNormal)).toBeGreaterThan(0.99)
    }

    geometry.dispose()
  })

  it('covers every Apex race-control floor face with isolated atlas modules', () => {
    const apex = TRACK_PRESETS.find(track => track.venue === 'apex')
    const layout = getApexRaceControlFacadeLayout(apex.roadWidth)
    const geometry = createApexRaceControlFacadeGeometry(
      apex.curve,
      apex.roadWidth,
    )
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const kindCounts = {
      trackFacingFloor: 0,
      outerServiceFloor: 0,
      approachEndFloor: 0,
      departureEndFloor: 0,
    }

    expect(Object.isFrozen(APEX_RACE_CONTROL_LAYOUT)).toBe(true)
    expect(Object.isFrozen(APEX_RACE_CONTROL_LAYOUT.size)).toBe(true)
    expect(Object.isFrozen(layout)).toBe(true)
    expect(layout.every(Object.isFrozen)).toBe(true)
    expect(layout).toHaveLength(APEX_RACE_CONTROL_LAYOUT.floors * 4)
    expect(positions.count).toBe(layout.length * 4)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(geometry.getIndex().count).toBe(layout.length * 6)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value > 0 && value < 1
    ))).toBe(true)

    const tangent = apex.curve
      .getTangentAt(APEX_RACE_CONTROL_LAYOUT.progress)
      .normalize()
    const side = new THREE.Vector3().crossVectors(
      new THREE.Vector3(0, 1, 0),
      tangent,
    ).normalize()

    for (let index = 0; index < layout.length; index += 1) {
      const panel = layout[index]
      const vertex = index * 4
      const actualNormal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
      const expectedNormal = (panel.faceAxis === 'side' ? side : tangent)
        .clone()
        .multiplyScalar(panel.faceSign)
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

      expect(actualNormal.dot(expectedNormal)).toBeGreaterThan(0.99)
      expect(Math.min(...faceU)).toBeGreaterThan(expectedColumn * 0.5)
      expect(Math.max(...faceU)).toBeLessThan((expectedColumn + 1) * 0.5)
      if (expectedAtlasRow === 0) {
        expect(Math.min(...faceV)).toBeGreaterThan(0.5)
      } else {
        expect(Math.max(...faceV)).toBeLessThan(0.5)
      }
      expect(Math.min(...Array.from(
        { length: 4 },
        (_, offset) => positions.getY(vertex + offset),
      ))).toBeCloseTo(panel.centerY - panel.height / 2, 5)
      kindCounts[panel.kind] += 1
    }

    expect(kindCounts).toEqual({
      trackFacingFloor: 4,
      outerServiceFloor: 4,
      approachEndFloor: 4,
      departureEndFloor: 4,
    })
    geometry.dispose()
  })

  it('skins the Apex race-control roof cap on all exposed faces', () => {
    const apex = TRACK_PRESETS.find(track => track.venue === 'apex')
    const geometry = createApexRaceControlRoofSurfaceGeometry(
      apex.curve,
      apex.roadWidth,
    )
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const index = geometry.getIndex()
    const expectedVariants = [
      APEX_RACE_CONTROL_ROOF_SURFACE_VARIANTS.roofFascia,
      APEX_RACE_CONTROL_ROOF_SURFACE_VARIANTS.roofFascia,
      APEX_RACE_CONTROL_ROOF_SURFACE_VARIANTS.roofTop,
      APEX_RACE_CONTROL_ROOF_SURFACE_VARIANTS.underside,
      APEX_RACE_CONTROL_ROOF_SURFACE_VARIANTS.serviceEnd,
      APEX_RACE_CONTROL_ROOF_SURFACE_VARIANTS.serviceEnd,
    ]

    expect(Object.isFrozen(APEX_RACE_CONTROL_ROOF_LAYOUT)).toBe(true)
    expect(Object.isFrozen(APEX_RACE_CONTROL_ROOF_SURFACE_VARIANTS)).toBe(true)
    expect(positions.count).toBe(24)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(index.count).toBe(36)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value > 0 && value < 1
    ))).toBe(true)

    const tangent = apex.curve
      .getTangentAt(APEX_RACE_CONTROL_LAYOUT.progress)
      .normalize()
    const side = new THREE.Vector3().crossVectors(
      new THREE.Vector3(0, 1, 0),
      tangent,
    ).normalize()
    const expectedNormals = [
      side,
      side.clone().multiplyScalar(-1),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      tangent,
      tangent.clone().multiplyScalar(-1),
    ]
    for (let face = 0; face < expectedVariants.length; face += 1) {
      const vertex = face * 4
      const actualNormal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
      expect(actualNormal.dot(expectedNormals[face])).toBeGreaterThan(0.99)
      const column = expectedVariants[face] % 2
      const row = Math.floor(expectedVariants[face] / 2)
      const faceU = Array.from(
        { length: 4 },
        (_, offset) => uvs.getX(vertex + offset),
      )
      const faceV = Array.from(
        { length: 4 },
        (_, offset) => uvs.getY(vertex + offset),
      )
      expect(Math.min(...faceU)).toBeGreaterThan(column * 0.5)
      expect(Math.max(...faceU)).toBeLessThan((column + 1) * 0.5)
      if (row === 0) expect(Math.min(...faceV)).toBeGreaterThan(0.5)
      else expect(Math.max(...faceV)).toBeLessThan(0.5)

      const triangleStart = face * 6
      for (let triangle = triangleStart; triangle < triangleStart + 6; triangle += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(
          positions,
          index.getX(triangle),
        )
        const b = new THREE.Vector3().fromBufferAttribute(
          positions,
          index.getX(triangle + 1),
        )
        const c = new THREE.Vector3().fromBufferAttribute(
          positions,
          index.getX(triangle + 2),
        )
        expect(
          b.clone().sub(a).cross(c.clone().sub(a)).normalize().dot(actualNormal),
        ).toBeGreaterThan(0.99)
      }
    }

    const bounds = geometry.boundingBox
    expect(bounds.min.y).toBeCloseTo(
      APEX_RACE_CONTROL_LAYOUT.centerY
        + APEX_RACE_CONTROL_LAYOUT.size[1] / 2
        - APEX_RACE_CONTROL_ROOF_LAYOUT.capHeight
        + APEX_RACE_CONTROL_ROOF_LAYOUT.faceOffset,
      5,
    )
    expect(bounds.max.y).toBeCloseTo(
      APEX_RACE_CONTROL_LAYOUT.centerY
        + APEX_RACE_CONTROL_LAYOUT.size[1] / 2
        + APEX_RACE_CONTROL_ROOF_LAYOUT.faceOffset,
      5,
    )
    geometry.dispose()
  })

  it('skins every Apex marshal observation-window box with isolated atlas faces', () => {
    const apex = TRACK_PRESETS.find(track => track.venue === 'apex')
    const geometry = createApexMarshalWindowSurfaceGeometry(
      apex.curve,
      apex.roadWidth,
    )
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const colors = geometry.getAttribute('color')
    const uvs = geometry.getAttribute('uv')
    const index = geometry.getIndex()
    const expectedVariants = [
      APEX_MARSHAL_WINDOW_SURFACE_VARIANTS.frameTrim,
      APEX_MARSHAL_WINDOW_SURFACE_VARIANTS.frameTrim,
      APEX_MARSHAL_WINDOW_SURFACE_VARIANTS.windowGlass,
      APEX_MARSHAL_WINDOW_SURFACE_VARIANTS.underside,
      APEX_MARSHAL_WINDOW_SURFACE_VARIANTS.serviceFascia,
      APEX_MARSHAL_WINDOW_SURFACE_VARIANTS.serviceFascia,
    ]
    const variantCounts = [0, 0, 0, 0]
    const [width, height, length] = APEX_MARSHAL_WINDOW_SURFACE_LAYOUT.size
    const expanded = [
      width + APEX_MARSHAL_WINDOW_SURFACE_LAYOUT.faceOffset * 2,
      height + APEX_MARSHAL_WINDOW_SURFACE_LAYOUT.faceOffset * 2,
      length + APEX_MARSHAL_WINDOW_SURFACE_LAYOUT.faceOffset * 2,
    ]

    expect(Object.isFrozen(APEX_MARSHAL_WINDOW_SURFACE_LAYOUT)).toBe(true)
    expect(Object.isFrozen(APEX_MARSHAL_WINDOW_SURFACE_LAYOUT.size)).toBe(true)
    expect(Object.isFrozen(APEX_MARSHAL_WINDOW_SURFACE_VARIANTS)).toBe(true)
    expect(positions.count).toBe(MARSHAL_POST_PROGRESS.length * 24)
    expect(normals.count).toBe(positions.count)
    expect(colors.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(index.count).toBe(MARSHAL_POST_PROGRESS.length * 36)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(colors.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value > 0 && value < 1
    ))).toBe(true)

    for (let box = 0; box < MARSHAL_POST_PROGRESS.length; box += 1) {
      const tangent = apex.curve
        .getTangentAt(MARSHAL_POST_PROGRESS[box])
        .setY(0)
        .normalize()
      const side = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, 1, 0),
        tangent,
      ).normalize()
      const expectedNormals = [
        side,
        side.clone().multiplyScalar(-1),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, -1, 0),
        tangent,
        tangent.clone().multiplyScalar(-1),
      ]
      for (let face = 0; face < expectedVariants.length; face += 1) {
        const vertex = box * 24 + face * 4
        const actualNormal = new THREE.Vector3()
          .fromBufferAttribute(normals, vertex)
        expect(actualNormal.dot(expectedNormals[face])).toBeGreaterThan(0.99)
        const variant = expectedVariants[face]
        const minU = Math.min(...Array.from(
          { length: 4 },
          (_, offset) => uvs.getX(vertex + offset),
        ))
        const maxU = Math.max(...Array.from(
          { length: 4 },
          (_, offset) => uvs.getX(vertex + offset),
        ))
        const minV = Math.min(...Array.from(
          { length: 4 },
          (_, offset) => uvs.getY(vertex + offset),
        ))
        const maxV = Math.max(...Array.from(
          { length: 4 },
          (_, offset) => uvs.getY(vertex + offset),
        ))
        expect(minU).toBeGreaterThan((variant % 2) * 0.5)
        expect(maxU).toBeLessThan((variant % 2 + 1) * 0.5)
        if (Math.floor(variant / 2) === 0) expect(minV).toBeGreaterThan(0.5)
        else expect(maxV).toBeLessThan(0.5)
        variantCounts[variant] += 1

        for (let triangle = face * 6; triangle < face * 6 + 6; triangle += 3) {
          const a = new THREE.Vector3().fromBufferAttribute(
            positions,
            index.getX(box * 36 + triangle),
          )
          const b = new THREE.Vector3().fromBufferAttribute(
            positions,
            index.getX(box * 36 + triangle + 1),
          )
          const c = new THREE.Vector3().fromBufferAttribute(
            positions,
            index.getX(box * 36 + triangle + 2),
          )
          expect(
            b.clone().sub(a).cross(c.clone().sub(a)).normalize().dot(actualNormal),
          ).toBeGreaterThan(0.99)
        }
      }
    }
    expect(variantCounts).toEqual([5, 10, 5, 10])
    expect(geometry.boundingBox.min.y).toBeCloseTo(
      APEX_MARSHAL_WINDOW_SURFACE_LAYOUT.centerY - expanded[1] / 2,
      5,
    )
    expect(geometry.boundingBox.max.y).toBeCloseTo(
      APEX_MARSHAL_WINDOW_SURFACE_LAYOUT.centerY + expanded[1] / 2,
      5,
    )
    geometry.dispose()
  })

  it('maps one facade panel across every configured pit-garage section', () => {
    for (const preset of TRACK_PRESETS) {
      const geometry = createPitGarageFacadeGeometry(preset.curve, preset.venue)
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const layout = PIT_GARAGE_FACADE_LAYOUTS[preset.venue]
      const glass = PIT_GARAGE_GLASS_LAYOUTS[preset.venue]
      const glassFaceCount = layout.panelCount * 2
      const faceCount = layout.panelCount + glassFaceCount

      expect(Object.isFrozen(glass)).toBe(true)
      expect(Object.isFrozen(glass.size)).toBe(true)

      expect(positions.count).toBe(faceCount * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(faceCount * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(value => (
        Number.isFinite(value) && value >= 0 && value <= 1
      ))).toBe(true)
      expect(geometry.boundingBox.min.y).toBeGreaterThan(0.2)
      expect(geometry.boundingBox.max.y).toBeLessThanOrEqual(
        glass.centerY + glass.size[1] / 2 + 0.001,
      )

      const tangent = preset.curve.getTangentAt(layout.progress).normalize()
      const side = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, 1, 0),
        tangent,
      ).normalize()
      const normal = new THREE.Vector3().fromBufferAttribute(normals, 0)
      expect(normal.dot(side)).toBeGreaterThan(0.9)

      const glassFirstFace = layout.panelCount
      const firstGlassNormal = new THREE.Vector3().fromBufferAttribute(
        normals,
        glassFirstFace * 4,
      )
      const oppositeGlassNormal = new THREE.Vector3().fromBufferAttribute(
        normals,
        (glassFirstFace + layout.panelCount) * 4,
      )
      expect(firstGlassNormal.dot(oppositeGlassNormal)).toBeLessThan(-0.99)
      const glassPanelLength = glass.size[2] / layout.panelCount
      const glassPanelHeight = glass.size[1]
      const glassU = Array.from(
        { length: 4 },
        (_, vertex) => uvs.getX(glassFirstFace * 4 + vertex),
      )
      const glassV = Array.from(
        { length: 4 },
        (_, vertex) => uvs.getY(glassFirstFace * 4 + vertex),
      )
      expect(
        4 * (Math.max(...glassU) - Math.min(...glassU))
          / (Math.max(...glassV) - Math.min(...glassV)),
      ).toBeCloseTo(glassPanelLength / glassPanelHeight, 6)
      expect(Math.min(...glassU)).toBeGreaterThan(0)
      expect(Math.max(...glassU)).toBeLessThan(1)
      expect(Math.min(...glassV)).toBeGreaterThan(0)
      expect(Math.max(...glassV)).toBeLessThan(1)

      const indices = geometry.getIndex()
      for (
        let index = glassFirstFace * 6;
        index < indices.count;
        index += 3
      ) {
        const aIndex = indices.getX(index)
        const bIndex = indices.getX(index + 1)
        const cIndex = indices.getX(index + 2)
        const a = new THREE.Vector3().fromBufferAttribute(positions, aIndex)
        const b = new THREE.Vector3().fromBufferAttribute(positions, bIndex)
        const c = new THREE.Vector3().fromBufferAttribute(positions, cIndex)
        const geometricNormal = b.clone().sub(a).cross(c.clone().sub(a)).normalize()
        const averageNormal = new THREE.Vector3()
          .fromBufferAttribute(normals, aIndex)
          .add(new THREE.Vector3().fromBufferAttribute(normals, bIndex))
          .add(new THREE.Vector3().fromBufferAttribute(normals, cIndex))
          .normalize()
        expect(geometricNormal.dot(averageNormal)).toBeGreaterThan(0.999)
      }

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
      const colors = geometry.getAttribute('color')
      const layouts = GRANDSTAND_LAYOUTS[preset.venue]
      const faceCount = layouts.reduce(
        (count, layout) => (
          count + (layout.tiers + 2 + GRANDSTAND_ROOF_RIB.count) * 6
        ),
        0,
      )

      expect(Object.isFrozen(GRANDSTAND_ACCENT_CANOPY)).toBe(true)
      expect(Object.isFrozen(GRANDSTAND_ROOF_RIB)).toBe(true)
      expect(positions.count).toBe(faceCount * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(colors.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(faceCount * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(value => (
        Number.isFinite(value) && value > 0 && value < 1
      ))).toBe(true)
      expect(geometry.boundingBox.min.y).toBeGreaterThan(0.08)
      expect(geometry.boundingBox.max.y).toBeCloseTo(
        GRANDSTAND_ROOF_RIB.centerY
          + GRANDSTAND_ROOF_RIB.height / 2
          + 0.012,
        5,
      )

      const scenery = createCircuitSceneryGeometry(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const expectedCombinedTopology = {
        apex: { positions: 18_684, indices: 33_216 },
        harbour: { positions: 14_228, indices: 25_596 },
        temple: { positions: 14_200, indices: 25_428 },
      }[preset.venue]
      const yachtRig = preset.venue === 'harbour'
        ? createHarbourYachtRigSurfaceGeometry()
        : null
      const surfaceWear = createTrackSurfaceWearGeometry(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const palmTrunk = ['apex', 'harbour'].includes(preset.venue)
        ? createPalmTrunkSurfaceGeometry(preset.curve, preset.venue)
        : null
      expect(
        positions.count
          + scenery.getAttribute('position').count
          + surfaceWear.getAttribute('position').count
          + (yachtRig?.getAttribute('position').count ?? 0)
          + (palmTrunk?.getAttribute('position').count ?? 0),
      ).toBe(expectedCombinedTopology.positions)
      expect(
        geometry.getIndex().count
          + scenery.getIndex().count
          + surfaceWear.getIndex().count
          + (yachtRig?.getIndex().count ?? 0)
          + (palmTrunk?.getIndex().count ?? 0),
      ).toBe(expectedCombinedTopology.indices)
      yachtRig?.dispose()
      palmTrunk?.dispose()
      surfaceWear.dispose()
      scenery.dispose()

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

        const accentFace = roofFace + 6
        const expectedAccent = new THREE.Color(layout.accent ?? '#d8b45c')
        for (let face = 0; face < 6; face += 1) {
          for (let vertex = 0; vertex < 4; vertex += 1) {
            const color = new THREE.Color().fromBufferAttribute(
              colors,
              (accentFace + face) * 4 + vertex,
            )
            expect(color.r).toBeCloseTo(expectedAccent.r, 5)
            expect(color.g).toBeCloseTo(expectedAccent.g, 5)
            expect(color.b).toBeCloseTo(expectedAccent.b, 5)
          }
        }
        const accentBottomVertex = (accentFace + 4) * 4
        const accentTopVertex = (accentFace + 5) * 4
        const accentBottomNormal = new THREE.Vector3().fromBufferAttribute(
          normals,
          accentBottomVertex,
        )
        const accentTopNormal = new THREE.Vector3().fromBufferAttribute(
          normals,
          accentTopVertex,
        )
        expect(accentBottomNormal.y).toBeLessThan(-0.99)
        expect(accentTopNormal.y).toBeGreaterThan(0.99)
        for (const [vertex, expectedColumn] of [
          [accentBottomVertex, 1],
          [accentTopVertex, 0],
        ]) {
          const surfaceU = Array.from(
            { length: 4 },
            (_, index) => uvs.getX(vertex + index),
          )
          const surfaceV = Array.from(
            { length: 4 },
            (_, index) => uvs.getY(vertex + index),
          )
          if (expectedColumn === 1) expect(Math.min(...surfaceU)).toBeGreaterThan(0.5)
          else expect(Math.max(...surfaceU)).toBeLessThan(0.5)
          expect(Math.max(...surfaceV)).toBeLessThan(0.5)
        }

        for (let face = standFaceOffset; face < accentFace; face += 1) {
          for (let vertex = 0; vertex < 4; vertex += 1) {
            const color = new THREE.Color().fromBufferAttribute(
              colors,
              face * 4 + vertex,
            )
            expect(color.r).toBeCloseTo(1, 5)
            expect(color.g).toBeCloseTo(1, 5)
            expect(color.b).toBeCloseTo(1, 5)
          }
        }

        const firstRibFace = accentFace + 6
        const expectedRibColor = new THREE.Color('#3e4746')
        for (let rib = 0; rib < GRANDSTAND_ROOF_RIB.count; rib += 1) {
          const ribFace = firstRibFace + rib * 6
          for (let face = 0; face < 6; face += 1) {
            const vertex = (ribFace + face) * 4
            const faceU = Array.from(
              { length: 4 },
              (_, index) => uvs.getX(vertex + index),
            )
            const faceV = Array.from(
              { length: 4 },
              (_, index) => uvs.getY(vertex + index),
            )
            const spanU = Math.max(...faceU) - Math.min(...faceU)
            const spanV = Math.max(...faceV) - Math.min(...faceV)
            const ribVerticalFaceHeight = Math.max(
              0.04,
              GRANDSTAND_ROOF_RIB.height - 0.04,
            )
            const physical = face < 2
              ? [GRANDSTAND_ROOF_RIB.depth - 0.06, ribVerticalFaceHeight]
              : face < 4
                ? [GRANDSTAND_ROOF_RIB.width - 0.06, ribVerticalFaceHeight]
                : [
                    GRANDSTAND_ROOF_RIB.width - 0.06,
                    GRANDSTAND_ROOF_RIB.depth - 0.06,
                  ]
            expect(spanU / spanV).toBeCloseTo(physical[0] / physical[1], 2)
            for (let offset = 0; offset < 4; offset += 1) {
              const color = new THREE.Color().fromBufferAttribute(
                colors,
                vertex + offset,
              )
              expect(color.r).toBeCloseTo(expectedRibColor.r, 5)
              expect(color.g).toBeCloseTo(expectedRibColor.g, 5)
              expect(color.b).toBeCloseTo(expectedRibColor.b, 5)
            }
          }
        }

        standFaceOffset += (
          layout.tiers + 2 + GRANDSTAND_ROOF_RIB.count
        ) * 6
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
      const extraBoxTints = preset.venue === 'apex'
        ? [
            ...Array.from(
              { length: MARSHAL_POST_PROGRESS.length },
              () => APEX_MARSHAL_POST_ROOF.color,
            ),
            APEX_PIT_GARAGE_HEADER.color,
            ...APEX_PIT_BAY_SERVICE_LAYOUT.map(bay => bay.color),
            ...APEX_PIT_BAY_TRIM_LAYOUT.map(trim => trim.color),
            APEX_PIT_APRON_LAYOUT.color,
            APEX_PIT_WALL_ACCENT_LAYOUT.color,
            ...APEX_PIT_SERVICE_PAD_LAYOUT.map(pad => pad.color),
            ...GANTRY_ACCENT_CARRIER_LAYOUTS.apex.map(carrier => carrier.color),
          ]
        : preset.venue === 'temple'
          ? [
              TEMPLE_TIMING_TOWER_CAP.color,
              ...TEMPLE_TIMING_TOWER_FLOOR_BANDS.map(band => band.color),
              ...TEMPLE_PIT_BAY_TRIM_LAYOUT.map(trim => trim.color),
              ...TEMPLE_START_GANTRY_TRIM_LAYOUT.map(trim => trim.color),
              ...GANTRY_ACCENT_CARRIER_LAYOUTS.temple.map(carrier => carrier.color),
            ]
          : GANTRY_ACCENT_CARRIER_LAYOUTS.harbour.map(carrier => carrier.color)
      const extraBoxCount = extraBoxTints.length
      const serviceFacadeExtraCount = preset.venue === 'apex'
        ? APEX_PIT_BAY_SERVICE_LAYOUT.length
        : 0
      if (preset.venue === 'apex') {
        expect(Object.isFrozen(APEX_PIT_GARAGE_HEADER)).toBe(true)
        expect(Object.isFrozen(APEX_PIT_GARAGE_HEADER.size)).toBe(true)
        for (const layout of [
          APEX_PIT_BAY_SERVICE_LAYOUT,
          APEX_PIT_BAY_TRIM_LAYOUT,
          APEX_PIT_SERVICE_PAD_LAYOUT,
        ]) {
          expect(Object.isFrozen(layout)).toBe(true)
          expect(layout).toHaveLength(11)
          for (const box of layout) {
            expect(Object.isFrozen(box)).toBe(true)
            expect(Object.isFrozen(box.size)).toBe(true)
          }
        }
        expect(Object.isFrozen(APEX_PIT_APRON_LAYOUT)).toBe(true)
        expect(Object.isFrozen(APEX_PIT_APRON_LAYOUT.size)).toBe(true)
        expect(Object.isFrozen(APEX_PIT_WALL_ACCENT_LAYOUT)).toBe(true)
        expect(Object.isFrozen(APEX_PIT_WALL_ACCENT_LAYOUT.size)).toBe(true)
      } else if (preset.venue === 'temple') {
        expect(Object.isFrozen(TEMPLE_PIT_BAY_TRIM_LAYOUT)).toBe(true)
        expect(TEMPLE_PIT_BAY_TRIM_LAYOUT).toHaveLength(11)
        for (const trim of TEMPLE_PIT_BAY_TRIM_LAYOUT) {
          expect(Object.isFrozen(trim)).toBe(true)
          expect(Object.isFrozen(trim.size)).toBe(true)
        }
        expect(Object.isFrozen(TEMPLE_START_GANTRY_TRIM_LAYOUT)).toBe(true)
        expect(TEMPLE_START_GANTRY_TRIM_LAYOUT).toHaveLength(3)
        for (const trim of TEMPLE_START_GANTRY_TRIM_LAYOUT) {
          expect(Object.isFrozen(trim)).toBe(true)
          expect(Object.isFrozen(trim.size)).toBe(true)
        }
      }
      const expectedQuadrants = {
        '0,1': buildingPanels * 2 + serviceFacadeExtraCount * 4,
        '1,1': 2 + roofPanels * 2 + 2 + pitWallFaces + 2
          + (extraBoxCount - serviceFacadeExtraCount) * 4,
        '0,0': roofPanels + 1 + extraBoxCount,
        '1,0': roofPanels + 1 + extraBoxCount,
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
      const colors = geometry.getAttribute('color')
      const quadrantCounts = { '0,1': 0, '1,1': 0, '0,0': 0, '1,0': 0 }

      expect(positions.count).toBe(faceCount * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(colors.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(faceCount * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(value => (
        Number.isFinite(value) && value > 0 && value < 1
      ))).toBe(true)
      expect(geometry.boundingBox.min.y).toBeCloseTo(0, 4)
      const priorExpectedMaxY = preset.venue === 'temple'
        ? TEMPLE_TIMING_TOWER_CAP.centerY
          + TEMPLE_TIMING_TOWER_CAP.size[1] / 2
          + 0.012
        : layout.roof.centerY + layout.roof.size[1] / 2 + 0.012
      const carrierExpectedMaxY = Math.max(
        ...GANTRY_ACCENT_CARRIER_LAYOUTS[preset.venue].map(carrier => (
          carrier.centerY + carrier.size[1] / 2 + carrier.surfaceOffset
        )),
      )
      const expectedMaxY = Math.max(priorExpectedMaxY, carrierExpectedMaxY)
      expect(geometry.boundingBox.max.y).toBeCloseTo(
        expectedMaxY,
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
        const color = new THREE.Color().fromBufferAttribute(colors, vertex)
        quadrantCounts[quadrant] += 1

        expect((Math.max(...faceU) < 0.5) || (Math.min(...faceU) > 0.5)).toBe(true)
        expect((Math.max(...faceV) < 0.5) || (Math.min(...faceV) > 0.5)).toBe(true)
        if (quadrant === '0,0') expect(normal.y).toBeGreaterThan(0.99)
        else if (quadrant === '1,0') expect(normal.y).toBeLessThan(-0.99)
        else expect(Math.abs(normal.y)).toBeLessThan(0.01)
        if (face >= faceCount - extraBoxCount * 6) {
          const extraFace = face - (faceCount - extraBoxCount * 6)
          const tint = new THREE.Color(extraBoxTints[Math.floor(extraFace / 6)])
          expect(color.r).toBeCloseTo(tint.r, 6)
          expect(color.g).toBeCloseTo(tint.g, 6)
          expect(color.b).toBeCloseTo(tint.b, 6)
        } else {
          expect(color.r).toBeCloseTo(1, 6)
          expect(color.g).toBeCloseTo(1, 6)
          expect(color.b).toBeCloseTo(1, 6)
        }
      }

      expect(quadrantCounts).toEqual(expectedQuadrants)

      const glass = PIT_GARAGE_GLASS_LAYOUTS[preset.venue]
      const glassFirstFace = faceCount - extraBoxCount * 6 - 4
      const glassPhysicalAspects = [
        glass.size[0] / glass.size[2],
        glass.size[0] / glass.size[2],
        glass.size[0] / glass.size[1],
        glass.size[0] / glass.size[1],
      ]
      for (let glassFace = 0; glassFace < 4; glassFace += 1) {
        const face = glassFirstFace + glassFace
        const faceU = Array.from(
          { length: 4 },
          (_, vertex) => uvs.getX(face * 4 + vertex),
        )
        const faceV = Array.from(
          { length: 4 },
          (_, vertex) => uvs.getY(face * 4 + vertex),
        )
        expect(
          (Math.max(...faceU) - Math.min(...faceU))
            / (Math.max(...faceV) - Math.min(...faceV)),
        ).toBeCloseTo(glassPhysicalAspects[glassFace], 6)
      }
      const glassTopNormal = new THREE.Vector3().fromBufferAttribute(
        normals,
        glassFirstFace * 4,
      )
      const glassBottomNormal = new THREE.Vector3().fromBufferAttribute(
        normals,
        (glassFirstFace + 1) * 4,
      )
      const glassEndA = new THREE.Vector3().fromBufferAttribute(
        normals,
        (glassFirstFace + 2) * 4,
      )
      const glassEndB = new THREE.Vector3().fromBufferAttribute(
        normals,
        (glassFirstFace + 3) * 4,
      )
      expect(glassTopNormal.dot(glassBottomNormal)).toBeLessThan(-0.99)
      expect(glassEndA.dot(glassEndB)).toBeLessThan(-0.99)
      const physicalAspectBoxes = [
        ...(preset.venue === 'apex'
          ? [
            ...APEX_PIT_BAY_SERVICE_LAYOUT,
            ...APEX_PIT_BAY_TRIM_LAYOUT,
            APEX_PIT_APRON_LAYOUT,
            APEX_PIT_WALL_ACCENT_LAYOUT,
            ...APEX_PIT_SERVICE_PAD_LAYOUT,
          ]
          : preset.venue === 'temple'
            ? [
              ...TEMPLE_PIT_BAY_TRIM_LAYOUT,
              ...TEMPLE_START_GANTRY_TRIM_LAYOUT,
            ]
            : []),
        ...GANTRY_ACCENT_CARRIER_LAYOUTS[preset.venue],
      ]
      if (physicalAspectBoxes.length > 0) {
        const firstFace = faceCount - physicalAspectBoxes.length * 6
        for (let boxIndex = 0; boxIndex < physicalAspectBoxes.length; boxIndex += 1) {
          const box = physicalAspectBoxes[boxIndex]
          const [width, height, length] = box.size
          const physicalAspects = [
            width / length,
            width / length,
            length / height,
            length / height,
            width / height,
            width / height,
          ]
          for (let localFace = 0; localFace < 6; localFace += 1) {
            const face = firstFace + boxIndex * 6 + localFace
            const faceU = Array.from(
              { length: 4 },
              (_, vertex) => uvs.getX(face * 4 + vertex),
            )
            const faceV = Array.from(
              { length: 4 },
              (_, vertex) => uvs.getY(face * 4 + vertex),
            )
            const mappedAspect = (
              (Math.max(...faceU) - Math.min(...faceU))
                / (Math.max(...faceV) - Math.min(...faceV))
            )
            expect(
              Math.abs(mappedAspect / physicalAspects[localFace] - 1),
            ).toBeLessThan(0.0001)
          }
        }
      }
      if (preset.venue === 'apex' || preset.venue === 'temple') {
        const scenery = createCircuitSceneryGeometry(
          preset.curve,
          preset.venue,
          preset.roadWidth,
        )
        const garageFacade = createPitGarageFacadeGeometry(
          preset.curve,
          preset.venue,
        )
        const surfaceWear = createTrackSurfaceWearGeometry(
          preset.curve,
          preset.venue,
          preset.roadWidth,
        )
        const palmTrunk = preset.venue === 'apex'
          ? createPalmTrunkSurfaceGeometry(preset.curve, preset.venue)
          : null
        const expectedCombined = preset.venue === 'apex'
          ? { positions: 19_216, indices: 34_014 }
          : { positions: 14_316, indices: 25_602 }
        expect(
          positions.count
          + scenery.getAttribute('position').count
          + garageFacade.getAttribute('position').count
          + surfaceWear.getAttribute('position').count
          + (palmTrunk?.getAttribute('position').count ?? 0),
        )
          .toBe(expectedCombined.positions)
        expect(
          geometry.getIndex().count
          + scenery.getIndex().count
          + garageFacade.getIndex().count
          + surfaceWear.getIndex().count
          + (palmTrunk?.getIndex().count ?? 0),
        )
          .toBe(expectedCombined.indices)
        scenery.dispose()
        garageFacade.dispose()
        surfaceWear.dispose()
        palmTrunk?.dispose()
      }
      totalFaceCount += faceCount
      geometry.dispose()
    }
    expect(totalFaceCount).toBe(554)
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

  it('moves every palm trunk side and cap into one closed atlas geometry', () => {
    const atlasInset = 1 / 1024
    const template = new THREE.CylinderGeometry(0.22, 0.22, 1, 8)
    const verticesPerTrunk = template.getAttribute('position').count
    const indicesPerTrunk = template.getIndex().count

    for (const preset of TRACK_PRESETS.filter(track => (
      ['apex', 'harbour'].includes(track.venue)
    ))) {
      const layout = getPalmTreeLayout(preset.curve, preset.venue)
      const geometry = createPalmTrunkSurfaceGeometry(
        preset.curve,
        preset.venue,
      )
      const scenery = createCircuitSceneryGeometry(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const indices = geometry.getIndex()

      expect(geometry.name).toBe('shared-palm-trunk-surface-geometry')
      expect(positions.count).toBe(layout.length * verticesPerTrunk)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(indices.count).toBe(layout.length * indicesPerTrunk)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)

      for (const [treeIndex] of layout.entries()) {
        const vertexOffset = treeIndex * verticesPerTrunk
        for (const group of template.groups) {
          const variant = group.materialIndex === 0
            ? treeIndex % 2 === 0
              ? PALM_TRUNK_SURFACE_VARIANTS.datePalmBark
              : PALM_TRUNK_SURFACE_VARIANTS.fanPalmBark
            : group.materialIndex === 1
              ? PALM_TRUNK_SURFACE_VARIANTS.crownCap
              : PALM_TRUNK_SURFACE_VARIANTS.baseCap
          const column = variant % 2
          const row = Math.floor(variant / 2)
          const groupVertices = new Set()
          for (let offset = group.start; offset < group.start + group.count; offset += 1) {
            groupVertices.add(
              template.getIndex().getX(offset) + vertexOffset,
            )
          }
          const groupUvs = [...groupVertices].map(vertex => ({
            u: uvs.getX(vertex),
            v: uvs.getY(vertex),
          }))
          expect(Math.min(...groupUvs.map(uv => uv.u))).toBeGreaterThanOrEqual(
            column * 0.5 + atlasInset,
          )
          expect(Math.max(...groupUvs.map(uv => uv.u))).toBeLessThanOrEqual(
            (column + 1) * 0.5 - atlasInset,
          )
          expect(Math.min(...groupUvs.map(uv => uv.v))).toBeGreaterThanOrEqual(
            row === 0 ? 0.5 + atlasInset : atlasInset,
          )
          expect(Math.max(...groupUvs.map(uv => uv.v))).toBeLessThanOrEqual(
            row === 0 ? 1 - atlasInset : 0.5 - atlasInset,
          )
        }
      }

      for (let triangle = 0; triangle < indices.count; triangle += 3) {
        const aIndex = indices.getX(triangle)
        const bIndex = indices.getX(triangle + 1)
        const cIndex = indices.getX(triangle + 2)
        const pointA = new THREE.Vector3().fromBufferAttribute(positions, aIndex)
        const pointB = new THREE.Vector3().fromBufferAttribute(positions, bIndex)
        const pointC = new THREE.Vector3().fromBufferAttribute(positions, cIndex)
        const windingNormal = pointB.clone().sub(pointA)
          .cross(pointC.clone().sub(pointA))
          .normalize()
        const averageNormal = new THREE.Vector3()
          .add(new THREE.Vector3().fromBufferAttribute(normals, aIndex))
          .add(new THREE.Vector3().fromBufferAttribute(normals, bIndex))
          .add(new THREE.Vector3().fromBufferAttribute(normals, cIndex))
          .normalize()
        expect(windingNormal.dot(averageNormal)).toBeGreaterThan(0.92)
      }

      const expectedCombined = preset.venue === 'apex'
        ? { positions: 13_100, indices: 20_712 }
        : { positions: 8_956, indices: 13_452 }
      expect(
        scenery.getAttribute('position').count + positions.count,
      ).toBe(expectedCombined.positions)
      expect(scenery.getIndex().count + indices.count).toBe(expectedCombined.indices)

      geometry.dispose()
      scenery.dispose()
    }

    template.dispose()
  })

  it('reuses generated turf across the complete Harbour hairpin island', () => {
    const harbour = TRACK_PRESETS.find(track => track.venue === 'harbour')
    const layout = HARBOUR_HAIRPIN_ISLAND_LAYOUT
    const geometry = createHarbourHairpinIslandSurfaceGeometry(harbour.curve)
    const template = new THREE.CylinderGeometry(
      layout.radius,
      layout.radius,
      layout.height,
      layout.segments,
    )
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const colors = geometry.getAttribute('color')
    const expectedColor = new THREE.Color(layout.color)
    const palm = getPalmTreeLayout(harbour.curve, 'harbour')[0]
    const tangent = harbour.curve.getTangentAt(layout.progress).normalize()
    const side = new THREE.Vector3().crossVectors(
      new THREE.Vector3(0, 1, 0),
      tangent,
    ).normalize()
    const center = harbour.curve.getPointAt(layout.progress)
      .addScaledVector(
        side,
        Math.sign(palm.lateral) * layout.lateralFromTurnCenter,
      )
      .addScaledVector(new THREE.Vector3(0, 1, 0), layout.centerY)
    const matrix = new THREE.Matrix4().makeBasis(
      side,
      new THREE.Vector3(0, 1, 0),
      tangent,
    )
    matrix.setPosition(center)
    const inverse = matrix.clone().invert()

    expect(Object.isFrozen(layout)).toBe(true)
    expect(positions.count).toBe(template.getAttribute('position').count)
    expect(geometry.getIndex().count).toBe(template.getIndex().count)
    expect(positions.count).toBe(64)
    expect(geometry.getIndex().count).toBe(120)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(colors.count).toBe(positions.count)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)

    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      const local = new THREE.Vector3()
        .fromBufferAttribute(positions, vertex)
        .applyMatrix4(inverse)
      const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
      if (Math.abs(normal.y) > 0.9) {
        expect(uvs.getX(vertex)).toBeCloseTo(
          (local.x + layout.radius) / layout.tileSize,
          5,
        )
        expect(uvs.getY(vertex)).toBeCloseTo(
          (local.z + layout.radius) / layout.tileSize,
          5,
        )
      } else {
        const angle = Math.atan2(local.z, local.x)
        expect(uvs.getX(vertex)).toBeCloseTo(
          (angle / (Math.PI * 2) + 0.5)
            * Math.PI * 2 * layout.radius / layout.tileSize,
          5,
        )
        expect(uvs.getY(vertex)).toBeCloseTo(
          (local.y + layout.height / 2) / layout.tileSize,
          5,
        )
      }
      expect(colors.getX(vertex)).toBeCloseTo(expectedColor.r, 6)
      expect(colors.getY(vertex)).toBeCloseTo(expectedColor.g, 6)
      expect(colors.getZ(vertex)).toBeCloseTo(expectedColor.b, 6)
    }

    const indices = geometry.getIndex()
    for (let triangle = 0; triangle < indices.count; triangle += 3) {
      const aIndex = indices.getX(triangle)
      const bIndex = indices.getX(triangle + 1)
      const cIndex = indices.getX(triangle + 2)
      const a = new THREE.Vector3().fromBufferAttribute(positions, aIndex)
      const b = new THREE.Vector3().fromBufferAttribute(positions, bIndex)
      const c = new THREE.Vector3().fromBufferAttribute(positions, cIndex)
      const geometricNormal = b.sub(a).cross(c.sub(a)).normalize()
      const averageNormal = new THREE.Vector3()
        .fromBufferAttribute(normals, aIndex)
        .add(new THREE.Vector3().fromBufferAttribute(normals, bIndex))
        .add(new THREE.Vector3().fromBufferAttribute(normals, cIndex))
        .normalize()
      expect(geometricNormal.dot(averageNormal)).toBeGreaterThan(0.99)
    }

    expect(geometry.name).toBe('harbour-hairpin-island-surface-geometry')
    expect(geometry.boundingBox.min.y).toBeCloseTo(0.02, 6)
    expect(geometry.boundingBox.max.y).toBeCloseTo(0.42, 6)
    const scenery = createCircuitSceneryGeometry(
      harbour.curve,
      harbour.venue,
      harbour.roadWidth,
    )
    const yachtRig = createHarbourYachtRigSurfaceGeometry()
    const surfaceWear = createTrackSurfaceWearGeometry(
      harbour.curve,
      harbour.venue,
      harbour.roadWidth,
    )
    const palmTrunk = createPalmTrunkSurfaceGeometry(
      harbour.curve,
      harbour.venue,
    )
    expect(
      scenery.getAttribute('position').count
        + positions.count
        + yachtRig.getAttribute('position').count
        + surfaceWear.getAttribute('position').count
        + palmTrunk.getAttribute('position').count,
    ).toBe(14_028)
    expect(
      scenery.getIndex().count
        + geometry.getIndex().count
        + yachtRig.getIndex().count
        + surfaceWear.getIndex().count
        + palmTrunk.getIndex().count,
    ).toBe(25_320)

    template.dispose()
    scenery.dispose()
    yachtRig.dispose()
    surfaceWear.dispose()
    palmTrunk.dispose()
    geometry.dispose()
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

  it('maps every Apex tent, tower crown, hospitality roof, and flag to the canopy atlas', () => {
    const apex = TRACK_PRESETS.find(track => track.venue === 'apex')
    const geometry = createApexTentCanopyGeometry(apex.curve)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const colors = geometry.getAttribute('color')
    const tentTemplate = new THREE.ConeGeometry(1, 1, 4)
    const crownTemplate = new THREE.ConeGeometry(1, 1, 10)
    const roofTemplate = new THREE.BoxGeometry(1, 1, 1)
    const tentVertices = tentTemplate.getAttribute('position').count
    const tentIndices = tentTemplate.getIndex().count
    const crownVertices = crownTemplate.getAttribute('position').count
    const crownIndices = crownTemplate.getIndex().count
    const roofVertices = roofTemplate.getAttribute('position').count
    const roofIndices = roofTemplate.getIndex().count
    tentTemplate.dispose()
    crownTemplate.dispose()
    roofTemplate.dispose()
    const tower = APEX_VENUE_FACADE_LAYOUT.tower
    const crown = tower.crown
    const hospitality = APEX_VENUE_FACADE_LAYOUT.hospitality
    const expectedVertices = (
      APEX_TENT_CANOPY_LAYOUT.length * tentVertices
      + crown.count * crownVertices
      + hospitality.length * roofVertices
      + roofVertices
    )
    const expectedIndices = (
      APEX_TENT_CANOPY_LAYOUT.length * tentIndices
      + crown.count * crownIndices
      + hospitality.length * roofIndices
      + roofIndices
    )
    const atlasInset = 1 / 1024

    expect(Object.isFrozen(APEX_TENT_CANOPY_LAYOUT)).toBe(true)
    expect(APEX_TENT_CANOPY_LAYOUT).toHaveLength(9)
    expect(APEX_TENT_CANOPY_LAYOUT.every(Object.isFrozen)).toBe(true)
    expect(Object.isFrozen(crown)).toBe(true)
    expect(Object.isFrozen(crown.variants)).toBe(true)
    expect(crown.count).toBe(8)
    expect(crown.variants).toHaveLength(crown.count)
    expect(hospitality).toHaveLength(4)
    expect(hospitality.every(building => Object.isFrozen(building.roof))).toBe(true)
    expect(hospitality.every(building => Object.isFrozen(building.roof.size))).toBe(true)
    expect(Object.isFrozen(tower.flag)).toBe(true)
    expect(Object.isFrozen(tower.flag.size)).toBe(true)
    expect(expectedVertices).toBe(635)
    expect(expectedIndices).toBe(876)
    expect(positions.count).toBe(expectedVertices)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(colors.count).toBe(positions.count)
    expect(geometry.getIndex().count).toBe(expectedIndices)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value > 0 && value < 1
    ))).toBe(true)
    expect(Array.from(colors.array).every(value => (
      Number.isFinite(value) && value >= 0 && value <= 1
    ))).toBe(true)

    const indices = geometry.getIndex()
    for (let triangle = 0; triangle < indices.count; triangle += 3) {
      const indexA = indices.getX(triangle)
      const indexB = indices.getX(triangle + 1)
      const indexC = indices.getX(triangle + 2)
      const pointA = new THREE.Vector3().fromBufferAttribute(positions, indexA)
      const pointB = new THREE.Vector3().fromBufferAttribute(positions, indexB)
      const pointC = new THREE.Vector3().fromBufferAttribute(positions, indexC)
      const geometricNormal = pointB.sub(pointA).cross(pointC.sub(pointA)).normalize()
      const vertexNormal = new THREE.Vector3()
        .fromBufferAttribute(normals, indexA)
        .add(new THREE.Vector3().fromBufferAttribute(normals, indexB))
        .add(new THREE.Vector3().fromBufferAttribute(normals, indexC))
        .normalize()
      expect(geometricNormal.dot(vertexNormal)).toBeGreaterThan(0)
    }

    const expectPrimitive = ({
      vertexStart,
      vertexCount,
      variant,
      minY,
      maxY,
      color = '#ffffff',
    }) => {
      const primitiveU = Array.from(
        { length: vertexCount },
        (_, offset) => uvs.getX(vertexStart + offset),
      )
      const primitiveV = Array.from(
        { length: vertexCount },
        (_, offset) => uvs.getY(vertexStart + offset),
      )
      const primitiveY = Array.from(
        { length: vertexCount },
        (_, offset) => positions.getY(vertexStart + offset),
      )
      const column = variant % 2
      const row = Math.floor(variant / 2)

      expect(Math.min(...primitiveU)).toBeCloseTo(column * 0.5 + atlasInset, 6)
      expect(Math.max(...primitiveU)).toBeCloseTo(
        (column + 1) * 0.5 - atlasInset,
        6,
      )
      expect(Math.min(...primitiveV)).toBeCloseTo(
        (row === 0 ? 0.5 : 0) + atlasInset,
        6,
      )
      expect(Math.max(...primitiveV)).toBeCloseTo(
        (row === 0 ? 1 : 0.5) - atlasInset,
        6,
      )
      expect(Math.min(...primitiveY)).toBeCloseTo(minY, 5)
      expect(Math.max(...primitiveY)).toBeCloseTo(maxY, 5)
      const expectedColor = new THREE.Color(color)
      for (let vertex = vertexStart; vertex < vertexStart + vertexCount; vertex += 1) {
        expect(colors.getX(vertex)).toBeCloseTo(expectedColor.r, 6)
        expect(colors.getY(vertex)).toBeCloseTo(expectedColor.g, 6)
        expect(colors.getZ(vertex)).toBeCloseTo(expectedColor.b, 6)
      }
    }

    let vertexStart = 0
    for (let index = 0; index < APEX_TENT_CANOPY_LAYOUT.length; index += 1) {
      const canopy = APEX_TENT_CANOPY_LAYOUT[index]
      expectPrimitive({
        vertexStart,
        vertexCount: tentVertices,
        variant: canopy.variant,
        minY: canopy.centerY - canopy.height / 2,
        maxY: canopy.centerY + canopy.height / 2,
      })
      vertexStart += tentVertices
    }

    for (let peak = 0; peak < crown.count; peak += 1) {
      expectPrimitive({
        vertexStart,
        vertexCount: crownVertices,
        variant: crown.variants[peak],
        minY: crown.centerY - crown.height / 2,
        maxY: crown.centerY + crown.height / 2,
      })
      vertexStart += crownVertices
    }

    for (const building of hospitality) {
      const [, roofHeight] = building.roof.size
      expectPrimitive({
        vertexStart,
        vertexCount: roofVertices,
        variant: building.roof.variant,
        minY: building.roof.centerY - roofHeight / 2,
        maxY: building.roof.centerY + roofHeight / 2,
      })
      vertexStart += roofVertices
    }
    expectPrimitive({
      vertexStart,
      vertexCount: roofVertices,
      variant: tower.flag.variant,
      minY: tower.flag.centerY - tower.flag.size[1] / 2,
      maxY: tower.flag.centerY + tower.flag.size[1] / 2,
      color: tower.flag.tint,
    })
    vertexStart += roofVertices
    expect(vertexStart).toBe(positions.count)

    expect(APEX_TENT_CANOPY_LAYOUT.map(canopy => canopy.along)).toEqual([
      -28, -21, -14, -7, 0, 7, 14, 21, 28,
    ])
    expect(APEX_TENT_CANOPY_LAYOUT.map(canopy => canopy.variant)).toEqual([
      0, 1, 2, 3, 0, 1, 2, 3, 0,
    ])
    expect(crown.variants).toEqual([0, 3, 0, 3, 0, 3, 0, 3])
    expect(hospitality.map(building => building.roof.variant)).toEqual([0, 3, 0, 3])
    expect(tower.flag.variant).toBe(0)
    expect(tower.flag.tint).toBe('#d23d43')
    expect(geometry.name).toBe('apex-canopy-surface-geometry')
    expect(geometry.boundingBox.min.x).toBeCloseTo(-161.857025, 5)
    expect(geometry.boundingBox.min.y).toBeCloseTo(3.595, 5)
    expect(geometry.boundingBox.min.z).toBeCloseTo(-70.43837, 5)
    expect(geometry.boundingBox.max.x).toBeCloseTo(88.163956, 5)
    expect(geometry.boundingBox.max.y).toBeCloseTo(34.875, 5)
    expect(geometry.boundingBox.max.z).toBeCloseTo(175.946945, 5)

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

  it('keeps generated surface wear and remaining landmarks finite after extraction', () => {
    const geometry = createCircuitSceneryGeometry(trackCurve)
    const surfaceWear = createTrackSurfaceWearGeometry(trackCurve)
    const palmTrunk = createPalmTrunkSurfaceGeometry(trackCurve, 'apex')
    const positions = geometry.getAttribute('position')
    const colors = geometry.getAttribute('color')
    const wearPositions = surfaceWear.getAttribute('position')
    const wearColors = surfaceWear.getAttribute('color')
    const uniqueColors = new Set()

    // Keep the finite-geometry guard cheap enough to run with the full suite.
    // Thousands of individual Vitest assertions added seconds of framework
    // overhead and could hit the default timeout under parallel load.
    for (const candidate of [geometry, surfaceWear, palmTrunk]) {
      for (const attribute of Object.values(candidate.attributes)) {
        expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true)
      }
      expect(Array.from(candidate.index.array).every(index => (
        Number.isInteger(index)
          && index >= 0
          && index < candidate.getAttribute('position').count
      ))).toBe(true)
    }
    for (const attribute of [colors, wearColors]) {
      for (let index = 0; index < attribute.count; index += 1) {
        uniqueColors.add([
          attribute.getX(index).toFixed(3),
          attribute.getY(index).toFixed(3),
          attribute.getZ(index).toFixed(3),
        ].join(':'))
      }
    }

    expect(colors.count).toBe(positions.count)
    expect(wearColors.count).toBe(wearPositions.count)
    expect(uniqueColors.size).toBeGreaterThanOrEqual(12)
    const combinedTriangles = (
      geometry.index.count + surfaceWear.index.count + palmTrunk.index.count
    ) / 3
    expect(combinedTriangles).toBeLessThan(25_000)
    expect(combinedTriangles).toBeGreaterThan(10_600)
    expect(geometry.boundingBox.min.y).toBeLessThan(0)
    expect(geometry.boundingBox.max.y).toBeGreaterThan(12)
    expect(surfaceWear.boundingBox.min.y).toBeGreaterThan(ROAD_TOP_OFFSET - 0.02)
    expect(surfaceWear.boundingBox.max.y).toBeLessThan(0.15)

    geometry.dispose()
    surfaceWear.dispose()
    palmTrunk.dispose()
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
    const totalSurfaceCounts = {
      front: 0,
      rear: 0,
      nearEnd: 0,
      farEnd: 0,
      bottom: 0,
      top: 0,
    }

    for (const preset of TRACK_PRESETS) {
      const boardLayout = getBrakingBoardLayout(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const graphicsLayout = getBrakingBoardGraphicsLayout(
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

      expect(Object.isFrozen(boardLayout)).toBe(true)
      expect(boardLayout).toHaveLength(expectedBoardCounts[preset.venue])
      expect(boardLayout.every(Object.isFrozen)).toBe(true)
      expect(Object.isFrozen(graphicsLayout)).toBe(true)
      expect(graphicsLayout).toHaveLength(boardLayout.length * 6)
      expect(graphicsLayout.every(Object.isFrozen)).toBe(true)
      expect(positions.count).toBe(graphicsLayout.length * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(graphicsLayout.length * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(value => (
        Number.isFinite(value) && value > 0 && value < 1
      ))).toBe(true)

      for (let index = 0; index < graphicsLayout.length; index += 1) {
        const panel = graphicsLayout[index]
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
        const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize()
        const expectedNormal = panel.normalAxis === 'lateral'
          ? side.multiplyScalar(panel.normalSign)
          : panel.normalAxis === 'along'
            ? tangent.multiplyScalar(panel.normalSign)
            : new THREE.Vector3(0, panel.normalSign, 0)
        const actualNormal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
        const distanceBeforeCorner = (
          ((panel.cornerProgress - panel.progress) % 1 + 1) % 1
        ) * preset.length

        expect(BRAKING_BOARD_LABELS).toContain(panel.label)
        expect(panel.variant).toBe(panel.surface === 'front'
          ? BRAKING_BOARD_LABELS.indexOf(panel.label)
          : 3)
        expect(distanceBeforeCorner).toBeCloseTo(
          panel.label * BRAKING_BOARD_WORLD_SCALE,
          5,
        )
        expect(Math.min(...faceU)).toBeGreaterThan(expectedColumn * 0.5)
        expect(Math.max(...faceU)).toBeLessThan((expectedColumn + 1) * 0.5)
        if (expectedAtlasRow === 0) {
          expect(Math.min(...faceV)).toBeGreaterThan(0.5)
        } else {
          expect(Math.max(...faceV)).toBeLessThan(0.5)
        }
        expect(actualNormal.dot(expectedNormal)).toBeGreaterThan(0.99)
        const faceY = Array.from(
          { length: 4 },
          (_, offset) => positions.getY(vertex + offset),
        )
        if (panel.normalAxis === 'vertical') {
          expect(faceY.every(y => Math.abs(y - panel.centerY) < 0.00001)).toBe(true)
        } else {
          expect(Math.min(...faceY)).toBeCloseTo(panel.centerY - panel.height / 2, 5)
        }
        if (panel.atlasCropU || panel.atlasCropV) {
          const uvAspect = (Math.max(...faceU) - Math.min(...faceU))
            / (Math.max(...faceV) - Math.min(...faceV))
          expect(uvAspect).toBeCloseTo(panel.width / panel.height, 4)
        }
        totalSurfaceCounts[panel.surface] += 1
      }

      for (let index = 0; index < boardLayout.length; index += BRAKING_BOARD_LABELS.length) {
        expect(boardLayout.slice(index, index + BRAKING_BOARD_LABELS.length)
          .map(board => board.label)).toEqual(BRAKING_BOARD_LABELS)
      }
      for (let index = 0; index < graphicsLayout.length; index += 6) {
        expect(graphicsLayout.slice(index, index + 6).map(panel => panel.surface)).toEqual([
          'front',
          'rear',
          'nearEnd',
          'farEnd',
          'bottom',
          'top',
        ])
        expect(new Set(graphicsLayout.slice(index, index + 6).map(panel => panel.label)).size)
          .toBe(1)
      }

      totalBoardCount += boardLayout.length
      geometry.dispose()
    }

    expect(totalBoardCount).toBe(54)
    expect(totalSurfaceCounts).toEqual({
      front: 54,
      rear: 54,
      nearEnd: 54,
      farEnd: 54,
      bottom: 54,
      top: 54,
    })
  })

  it('maps every player-visible trackside operations box face to its atlas module', () => {
    const expectedPanelCounts = {
      apex: 218,
      harbour: 68,
      temple: 68,
    }
    const totalFrontKindCounts = {
      marshalPost: 0,
      broadcastLens: 0,
      pitWallDisplay: 0,
      broadcastCabinet: 0,
      broadcastHead: 0,
      pitLaneCabinet: 0,
      pitLaneModule: 0,
    }
    const totalKindSurfaceCounts = {
      marshalPost: 0,
      broadcastLens: 0,
      pitWallDisplay: 0,
      broadcastCabinet: 0,
      broadcastHead: 0,
      pitLaneCabinet: 0,
      pitLaneModule: 0,
    }
    const totalSurfaceCounts = {
      front: 0,
      rear: 0,
      nearEnd: 0,
      farEnd: 0,
      top: 0,
      bottom: 0,
    }

    expect(Object.isFrozen(TRACKSIDE_OPERATIONS_VARIANTS)).toBe(true)
    expect(Object.isFrozen(TRACKSIDE_OPERATIONS_BODY_LAYOUTS)).toBe(true)
    expect(Object.values(TRACKSIDE_OPERATIONS_BODY_LAYOUTS).every(
      body => Object.isFrozen(body) && Object.isFrozen(body.size),
    )).toBe(true)
    expect(Object.isFrozen(APEX_PIT_WALL_DISPLAY_LAYOUT)).toBe(true)
    expect(APEX_PIT_WALL_DISPLAY_LAYOUT).toHaveLength(14)
    expect(APEX_PIT_WALL_DISPLAY_LAYOUT.every(Object.isFrozen)).toBe(true)
    expect(Object.isFrozen(APEX_PIT_LANE_EQUIPMENT_LAYOUT)).toBe(true)
    expect(APEX_PIT_LANE_EQUIPMENT_LAYOUT).toHaveLength(10)
    expect(APEX_PIT_LANE_EQUIPMENT_LAYOUT.every(equipment => (
      Object.isFrozen(equipment) && Object.isFrozen(equipment.size)
    ))).toBe(true)
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
      const colors = geometry.getAttribute('color')

      expect(Object.isFrozen(layout)).toBe(true)
      expect(layout).toHaveLength(expectedPanelCounts[preset.venue])
      expect(layout.every(Object.isFrozen)).toBe(true)
      expect(positions.count).toBe(layout.length * 4)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(colors.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(layout.length * 6)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(colors.array).every(Number.isFinite)).toBe(true)
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
        const expectedNormal = panel.normalAxis === 'lateral'
          ? side.multiplyScalar(panel.normalSign)
          : panel.normalAxis === 'along'
            ? tangent.multiplyScalar(panel.normalSign)
            : new THREE.Vector3(0, panel.normalSign, 0)
        const actualNormal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
        const actualColor = new THREE.Color().fromBufferAttribute(colors, vertex)
        const expectedColor = new THREE.Color(panel.color)

        expect(panel.variant).toBe(
          panel.surface === 'front'
            ? TRACKSIDE_OPERATIONS_VARIANTS[panel.kind]
            : TRACKSIDE_OPERATIONS_VARIANTS.broadcastCabinet,
        )
        expect(Math.min(...faceU)).toBeGreaterThan(expectedColumn * 0.5)
        expect(Math.max(...faceU)).toBeLessThan((expectedColumn + 1) * 0.5)
        if (expectedAtlasRow === 0) {
          expect(Math.min(...faceV)).toBeGreaterThan(0.5)
        } else {
          expect(Math.max(...faceV)).toBeLessThan(0.5)
        }
        expect(actualNormal.dot(expectedNormal)).toBeGreaterThan(0.99)
        expect(actualColor.r).toBeCloseTo(expectedColor.r, 6)
        expect(actualColor.g).toBeCloseTo(expectedColor.g, 6)
        expect(actualColor.b).toBeCloseTo(expectedColor.b, 6)
        const faceYs = Array.from(
          { length: 4 },
          (_, offset) => positions.getY(vertex + offset),
        )
        if (panel.normalAxis === 'vertical') {
          expect(Math.min(...faceYs)).toBeCloseTo(panel.centerY, 5)
          expect(Math.max(...faceYs)).toBeCloseTo(panel.centerY, 5)
        } else {
          expect(Math.min(...faceYs)).toBeCloseTo(panel.centerY - panel.height / 2, 5)
          expect(Math.max(...faceYs)).toBeCloseTo(panel.centerY + panel.height / 2, 5)
        }
        if (panel.cropToPhysicalAspect) {
          expect(
            (Math.max(...faceU) - Math.min(...faceU))
            / (Math.max(...faceV) - Math.min(...faceV)),
          ).toBeCloseTo(panel.width / panel.height, 5)
        }
        if (panel.surface === 'front') totalFrontKindCounts[panel.kind] += 1
        totalKindSurfaceCounts[panel.kind] += 1
        totalSurfaceCounts[panel.surface] += 1
      }

      geometry.dispose()
    }

    expect(totalFrontKindCounts).toEqual({
      marshalPost: 5,
      broadcastLens: 12,
      pitWallDisplay: 14,
      broadcastCabinet: 12,
      broadcastHead: 12,
      pitLaneCabinet: 5,
      pitLaneModule: 5,
    })
    expect(totalKindSurfaceCounts).toEqual({
      marshalPost: 20,
      broadcastLens: 72,
      pitWallDisplay: 70,
      broadcastCabinet: 60,
      broadcastHead: 72,
      pitLaneCabinet: 30,
      pitLaneModule: 30,
    })
    expect(totalSurfaceCounts).toEqual({
      front: 65,
      rear: 65,
      nearEnd: 65,
      farEnd: 65,
      top: 60,
      bottom: 34,
    })
  })

  it('maps all start signals, floodlight faces, and tunnel luminaires to one atlas', () => {
    const expectedPanelCounts = { apex: 166, harbour: 154, temple: 70 }
    const totalKindCounts = {
      floodlightFront: 0,
      startSignal: 0,
      startSignalService: 0,
      tunnelLuminaire: 0,
      tunnelLuminaireService: 0,
      floodlightRear: 0,
    }
    const startSignalServiceSurfaceCounts = {
      frontHousing: 0,
      rear: 0,
      nearEnd: 0,
      farEnd: 0,
      top: 0,
      bottom: 0,
    }
    const apexFloodlightSurfaceCounts = {
      front: 0,
      rear: 0,
      nearEnd: 0,
      farEnd: 0,
      top: 0,
      bottom: 0,
    }
    const tunnelLuminaireServiceSurfaceCounts = {
      nearEnd: 0,
      farEnd: 0,
      left: 0,
      right: 0,
      top: 0,
      bottomHousing: 0,
    }

    expect(Object.isFrozen(TRACK_LIGHTING_GRAPHICS_VARIANTS)).toBe(true)
    expect(Object.isFrozen(START_SIGNAL_BODY)).toBe(true)
    expect(Object.isFrozen(START_SIGNAL_BODY.size)).toBe(true)
    expect(Object.isFrozen(APEX_FLOODLIGHT_LAYOUT)).toBe(true)
    expect(Object.isFrozen(APEX_FLOODLIGHT_LAYOUT.pole)).toBe(true)
    expect(Object.isFrozen(APEX_FLOODLIGHT_LAYOUT.pole.size)).toBe(true)
    expect(Object.isFrozen(APEX_FLOODLIGHT_LAYOUT.head)).toBe(true)
    expect(Object.isFrozen(APEX_FLOODLIGHT_LAYOUT.head.size)).toBe(true)
    expect(Object.isFrozen(HARBOUR_TUNNEL_LIGHT_FIXTURE)).toBe(true)
    expect(Object.isFrozen(HARBOUR_TUNNEL_LIGHT_FIXTURE.size)).toBe(true)

    for (const preset of TRACK_PRESETS) {
      const layout = getTrackLightingGraphicsLayout(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const geometry = createTrackLightingGraphicsGeometry(
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
        const actualNormal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
        const tangent = preset.curve.getTangentAt(panel.progress).normalize()
        const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize()
        const expectedNormal = panel.normalAxis === 'lateral'
          ? side.multiplyScalar(panel.normalSign)
          : panel.normalAxis === 'along'
            ? tangent.multiplyScalar(panel.normalSign)
            : new THREE.Vector3(0, panel.normalSign, 0)

        expect(panel.variant).toBe(TRACK_LIGHTING_GRAPHICS_VARIANTS[panel.kind])
        expect(Math.min(...faceU)).toBeGreaterThan(expectedColumn * 0.5)
        expect(Math.max(...faceU)).toBeLessThan((expectedColumn + 1) * 0.5)
        if (expectedAtlasRow === 0) {
          expect(Math.min(...faceV)).toBeGreaterThan(0.5)
        } else {
          expect(Math.max(...faceV)).toBeLessThan(0.5)
        }
        expect(actualNormal.dot(expectedNormal)).toBeGreaterThan(0.99)
        if (panel.normalAxis === 'vertical') {
          expect(Array.from(
            { length: 4 },
            (_, offset) => positions.getY(vertex + offset),
          ).every(y => Math.abs(y - panel.centerY) < 0.00001)).toBe(true)
        } else {
          expect(Math.min(...Array.from(
            { length: 4 },
            (_, offset) => positions.getY(vertex + offset),
          ))).toBeCloseTo(panel.centerY - panel.height / 2, 5)
        }
        if (panel.atlasCropU || panel.atlasCropV) {
          const uvAspect = (Math.max(...faceU) - Math.min(...faceU))
            / (Math.max(...faceV) - Math.min(...faceV))
          expect(uvAspect).toBeCloseTo(panel.width / panel.height, 4)
        }
        totalKindCounts[panel.kind] += 1
        if (panel.kind === 'startSignalService') {
          startSignalServiceSurfaceCounts[panel.surface] += 1
        }
        if (preset.venue === 'apex' && panel.kind.startsWith('floodlight')) {
          apexFloodlightSurfaceCounts[panel.surface] += 1
        }
        if (panel.kind === 'tunnelLuminaireService') {
          tunnelLuminaireServiceSurfaceCounts[panel.surface] += 1
        }
      }

      const signals = layout.filter(panel => panel.kind === 'startSignal')
      const frontHousings = layout.filter(panel => (
        panel.kind === 'startSignalService'
        && panel.surface === 'frontHousing'
      ))
      expect(signals).toHaveLength(10)
      expect(frontHousings).toHaveLength(10)
      for (const signal of signals) {
        const housing = frontHousings.find(panel => (
          panel.lateral === signal.lateral
          && panel.centerY === signal.centerY
        ))
        expect(housing).toBeTruthy()
        expect(housing.along - signal.along).toBeCloseTo(0.002, 6)
      }

      if (preset.venue === 'harbour') {
        const luminaires = layout.filter(panel => panel.kind === 'tunnelLuminaire')
        const servicePanels = layout.filter(panel => (
          panel.kind === 'tunnelLuminaireService'
        ))
        expect(luminaires).toHaveLength(HARBOUR_TUNNEL_LIGHT_COUNT * 2)
        expect(servicePanels).toHaveLength(HARBOUR_TUNNEL_LIGHT_COUNT * 2 * 6)
        for (const luminaire of luminaires) {
          const body = servicePanels.filter(panel => (
            panel.progress === luminaire.progress
            && (
              panel.normalAxis === 'lateral'
                ? Math.abs(panel.lateral - luminaire.lateral)
                  <= HARBOUR_TUNNEL_LIGHT_FIXTURE.size[0] / 2 + 1e-6
                : panel.lateral === luminaire.lateral
            )
          ))
          expect(body).toHaveLength(6)
          const bottomHousing = body.find(panel => (
            panel.surface === 'bottomHousing'
          ))
          expect(bottomHousing).toBeTruthy()
          expect(bottomHousing.centerY - luminaire.centerY).toBeCloseTo(
            0.012,
            6,
          )
          expect(bottomHousing.width).toBeGreaterThan(luminaire.width)
          expect(bottomHousing.height).toBeGreaterThan(luminaire.height)
        }
      }

      geometry.dispose()
    }

    expect(totalKindCounts).toEqual({
      floodlightFront: 16,
      startSignal: 30,
      startSignalService: 180,
      tunnelLuminaire: 12,
      tunnelLuminaireService: 72,
      floodlightRear: 80,
    })
    expect(startSignalServiceSurfaceCounts).toEqual({
      frontHousing: 30,
      rear: 30,
      nearEnd: 30,
      farEnd: 30,
      top: 30,
      bottom: 30,
    })
    expect(apexFloodlightSurfaceCounts).toEqual({
      front: 16,
      rear: 16,
      nearEnd: 16,
      farEnd: 16,
      top: 16,
      bottom: 16,
    })
    expect(tunnelLuminaireServiceSurfaceCounts).toEqual({
      nearEnd: 12,
      farEnd: 12,
      left: 12,
      right: 12,
      top: 12,
      bottomHousing: 12,
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

  it('moves all persistent track-surface wear into four isolated repeating strips', () => {
    const lowRibbonVertices = (LOW_DETAIL_SURFACE_SEGMENTS + 1) * 2
    const surfaceRibbonVertices = (SURFACE_SEGMENTS + 1) * 2
    const paintBoxCount = 32 + 26 + 1
    const expected = {
      apex: {
        cornerCount: 7,
        positions: 4_696,
        indices: 11_172,
        sceneryPositions: 13_100,
        sceneryIndices: 20_712,
        min: [-207.39679, 0.065, -105.301575],
        max: [171.01178, 0.1465, 144.211182],
      },
      harbour: {
        cornerCount: 5,
        positions: 4_432,
        indices: 10_776,
        sceneryPositions: 8_956,
        sceneryIndices: 13_452,
        min: [-201.381607, 0.094, -81.340172],
        max: [176.30693, 0.1465, 77.560463],
      },
      temple: {
        cornerCount: 6,
        positions: 4_624,
        indices: 11_064,
        sceneryPositions: 8_976,
        sceneryIndices: 13_464,
        min: [-252.617859, 0.065, -142.562653],
        max: [283.69162, 0.1465, 131.672531],
      },
    }

    expect(Object.isFrozen(TRACK_SURFACE_WEAR_VARIANTS)).toBe(true)
    expect(TRACK_SURFACE_WEAR_VARIANTS).toEqual({
      paint: 0,
      shoulderAsphalt: 1,
      rubberDeposit: 2,
      runoffCoating: 3,
    })

    for (const preset of TRACK_PRESETS) {
      const geometry = createTrackSurfaceWearGeometry(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const scenery = createCircuitSceneryGeometry(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const palmTrunk = ['apex', 'harbour'].includes(preset.venue)
        ? createPalmTrunkSurfaceGeometry(preset.curve, preset.venue)
        : null
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const colors = geometry.getAttribute('color')
      const indices = geometry.getIndex()
      const venueExpected = expected[preset.venue]
      const stripCounts = [0, 0, 0, 0]

      expect(geometry.name).toBe('track-surface-wear-geometry')
      expect(positions.count).toBe(venueExpected.positions)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(colors.count).toBe(positions.count)
      expect(indices.count).toBe(venueExpected.indices)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(colors.array).every(Number.isFinite)).toBe(true)

      for (let vertex = 0; vertex < uvs.count; vertex += 1) {
        const u = uvs.getX(vertex)
        const strip = Math.floor(u * 4)
        expect(strip).toBeGreaterThanOrEqual(0)
        expect(strip).toBeLessThan(4)
        expect(u).toBeGreaterThan(strip * 0.25)
        expect(u).toBeLessThan((strip + 1) * 0.25)
        expect(uvs.getY(vertex)).toBeGreaterThanOrEqual(0)
        stripCounts[strip] += 1
      }

      expect(stripCounts).toEqual([
        surfaceRibbonVertices * 2 + paintBoxCount * 24,
        lowRibbonVertices * 2,
        lowRibbonVertices * 2 + venueExpected.cornerCount * 2 * 24,
        preset.venue === 'harbour' ? 0 : venueExpected.cornerCount * 24,
      ])

      for (let triangle = 0; triangle < indices.count; triangle += 3) {
        const aIndex = indices.getX(triangle)
        const bIndex = indices.getX(triangle + 1)
        const cIndex = indices.getX(triangle + 2)
        const a = new THREE.Vector3().fromBufferAttribute(positions, aIndex)
        const b = new THREE.Vector3().fromBufferAttribute(positions, bIndex)
        const c = new THREE.Vector3().fromBufferAttribute(positions, cIndex)
        const winding = b.clone().sub(a).cross(c.clone().sub(a)).normalize()
        const averageNormal = new THREE.Vector3()
          .fromBufferAttribute(normals, aIndex)
          .add(new THREE.Vector3().fromBufferAttribute(normals, bIndex))
          .add(new THREE.Vector3().fromBufferAttribute(normals, cIndex))
          .normalize()
        expect(winding.dot(averageNormal)).toBeGreaterThan(0.99)
      }

      expect(geometry.boundingBox.min.x).toBeCloseTo(venueExpected.min[0], 5)
      expect(geometry.boundingBox.min.y).toBeCloseTo(venueExpected.min[1], 5)
      expect(geometry.boundingBox.min.z).toBeCloseTo(venueExpected.min[2], 5)
      expect(geometry.boundingBox.max.x).toBeCloseTo(venueExpected.max[0], 5)
      expect(geometry.boundingBox.max.y).toBeCloseTo(venueExpected.max[1], 5)
      expect(geometry.boundingBox.max.z).toBeCloseTo(venueExpected.max[2], 5)
      expect(
        scenery.getAttribute('position').count
          + positions.count
          + (palmTrunk?.getAttribute('position').count ?? 0),
      ).toBe(venueExpected.sceneryPositions + venueExpected.positions)
      expect(
        scenery.getIndex().count
          + indices.count
          + (palmTrunk?.getIndex().count ?? 0),
      ).toBe(venueExpected.sceneryIndices + venueExpected.indices)

      scenery.dispose()
      palmTrunk?.dispose()
      geometry.dispose()
    }
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

  it('moves every kerb box into one tintable, physically scaled atlas geometry', () => {
    const atlasInset = 1 / 1024
    const palettes = {
      apex: ['#d23d43', '#fff4df'],
      harbour: ['#d23d43', '#fff4df'],
      temple: ['#d23d43', '#fff4df', '#168447'],
    }
    const expectedBounds = {
      apex: {
        min: [-208.322662, 0.055, -105.40168],
        max: [172.451538, 0.185, 143.954956],
      },
      harbour: {
        min: [-202.361298, 0, -82.232239],
        max: [177.152832, 0.185, 78.410667],
      },
      temple: {
        min: [-253.606476, 0.055, -143.407776],
        max: [282.978638, 0.185, 132.492737],
      },
    }
    const expectedKinds = {
      apex: { boundary: 574, corner: 35, chicane: 0 },
      harbour: { boundary: 574, corner: 25, chicane: 13 },
      temple: { boundary: 574, corner: 30, chicane: 0 },
    }

    for (const preset of TRACK_PRESETS) {
      const layout = getKerbSurfaceLayout(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const geometry = createKerbSurfaceGeometry(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const colors = geometry.getAttribute('color')
      const indices = geometry.getIndex()
      const boxCount = layout.length
      const kindCounts = Object.fromEntries(
        ['boundary', 'corner', 'chicane'].map(kind => [
          kind,
          layout.filter(kerb => kerb.kind === kind).length,
        ]),
      )

      expect(geometry.name).toBe('shared-kerb-surface-geometry')
      expect(kindCounts).toEqual(expectedKinds[preset.venue])
      expect(positions.count).toBe(boxCount * 24)
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(colors.count).toBe(positions.count)
      expect(indices.count).toBe(boxCount * 36)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(value => (
        Number.isFinite(value) && value > 0 && value < 1
      ))).toBe(true)
      expect(Array.from(colors.array).every(Number.isFinite)).toBe(true)

      for (let segment = 0; segment < CURB_SEGMENTS; segment += 1) {
        const expectedTint = new THREE.Color(
          palettes[preset.venue][Math.floor(segment / 2) % palettes[preset.venue].length],
        )
        for (const sideIndex of [0, 1]) {
          const kerbIndex = segment * 2 + sideIndex
          const colorVertex = kerbIndex * 24
          expect(layout[kerbIndex].kind).toBe('boundary')
          expect(colors.getX(colorVertex)).toBeCloseTo(expectedTint.r, 5)
          expect(colors.getY(colorVertex)).toBeCloseTo(expectedTint.g, 5)
          expect(colors.getZ(colorVertex)).toBeCloseTo(expectedTint.b, 5)
        }
      }

      for (const [kerbIndex, kerb] of layout.entries()) {
        const expectedTint = new THREE.Color(kerb.color)
        const colorVertex = kerbIndex * 24
        expect(colors.getX(colorVertex)).toBeCloseTo(expectedTint.r, 5)
        expect(colors.getY(colorVertex)).toBeCloseTo(expectedTint.g, 5)
        expect(colors.getZ(colorVertex)).toBeCloseTo(expectedTint.b, 5)
        expect(kerb.size.every(value => Number.isFinite(value) && value > 0)).toBe(true)
        expect([
          KERB_SURFACE_VARIANTS.ribbedTread,
          KERB_SURFACE_VARIANTS.smoothTread,
        ]).toContain(kerb.topVariant)
      }

      const sampledBoxes = new Set([0, 1, CURB_SEGMENTS * 2 - 2, CURB_SEGMENTS * 2 - 1])
      for (const kind of ['corner', 'chicane']) {
        const first = layout.findIndex(kerb => kerb.kind === kind)
        const last = layout.findLastIndex(kerb => kerb.kind === kind)
        if (first >= 0) sampledBoxes.add(first)
        if (last >= 0) sampledBoxes.add(last)
      }

      for (const boxIndex of sampledBoxes) {
        const kerb = layout[boxIndex]
        const progress = ((kerb.progress % 1) + 1) % 1
        const tangent = preset.curve.getTangentAt(progress).normalize()
        const side = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          tangent,
        ).normalize()
        const [width, height, length] = kerb.size
        const physicalCrop = (physicalU, physicalV) => {
          const maxDimension = Math.max(physicalU, physicalV)
          return [physicalU / maxDimension, physicalV / maxDimension]
        }
        const [sideCropU, sideCropV] = physicalCrop(length, height)
        const [topCropU, topCropV] = physicalCrop(width, length)
        const [endCropU, endCropV] = physicalCrop(width, height)
        const faces = [
          {
            vertex: 0,
            variant: KERB_SURFACE_VARIANTS.edgeFascia,
            normal: side,
            cropU: sideCropU,
            cropV: sideCropV,
          },
          {
            vertex: 4,
            variant: KERB_SURFACE_VARIANTS.edgeFascia,
            normal: side.clone().multiplyScalar(-1),
            cropU: sideCropU,
            cropV: sideCropV,
          },
          {
            vertex: 8,
            variant: kerb.topVariant,
            normal: new THREE.Vector3(0, 1, 0),
            cropU: topCropU,
            cropV: topCropV,
          },
          {
            vertex: 12,
            variant: KERB_SURFACE_VARIANTS.endService,
            normal: new THREE.Vector3(0, -1, 0),
            cropU: topCropU,
            cropV: topCropV,
          },
          {
            vertex: 16,
            variant: KERB_SURFACE_VARIANTS.endService,
            normal: tangent,
            cropU: endCropU,
            cropV: endCropV,
          },
          {
            vertex: 20,
            variant: KERB_SURFACE_VARIANTS.endService,
            normal: tangent.clone().multiplyScalar(-1),
            cropU: endCropU,
            cropV: endCropV,
          },
        ]

        for (const [faceIndex, face] of faces.entries()) {
          const vertex = boxIndex * 24 + face.vertex
          const triangle = boxIndex * 36 + faceIndex * 6
          const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
          const pointA = new THREE.Vector3().fromBufferAttribute(
            positions,
            indices.getX(triangle),
          )
          const pointB = new THREE.Vector3().fromBufferAttribute(
            positions,
            indices.getX(triangle + 1),
          )
          const pointC = new THREE.Vector3().fromBufferAttribute(
            positions,
            indices.getX(triangle + 2),
          )
          const windingNormal = pointB.sub(pointA).cross(pointC.sub(pointA)).normalize()
          const column = face.variant % 2
          const centerU = column * 0.5 + 0.25
          const centerV = face.variant < 2 ? 0.75 : 0.25
          const spanU = (0.5 - atlasInset * 2) * face.cropU
          const spanV = (0.5 - atlasInset * 2) * face.cropV
          const faceU = Array.from(
            { length: 4 },
            (_, offset) => uvs.getX(vertex + offset),
          )
          const faceV = Array.from(
            { length: 4 },
            (_, offset) => uvs.getY(vertex + offset),
          )

          expect(normal.dot(face.normal)).toBeGreaterThan(0.99)
          expect(windingNormal.dot(normal)).toBeGreaterThan(0.99)
          expect(Math.min(...faceU)).toBeCloseTo(centerU - spanU / 2, 6)
          expect(Math.max(...faceU)).toBeCloseTo(centerU + spanU / 2, 6)
          expect(Math.min(...faceV)).toBeCloseTo(centerV - spanV / 2, 6)
          expect(Math.max(...faceV)).toBeCloseTo(centerV + spanV / 2, 6)
        }
      }

      for (const [axis, component] of ['x', 'y', 'z'].entries()) {
        expect(geometry.boundingBox.min[component]).toBeCloseTo(
          expectedBounds[preset.venue].min[axis],
          5,
        )
        expect(geometry.boundingBox.max[component]).toBeCloseTo(
          expectedBounds[preset.venue].max[axis],
          5,
        )
      }

      geometry.dispose()
    }
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

  it('maps every barrier cap and outer service face to its structural module', () => {
    const up = new THREE.Vector3(0, 1, 0)
    const atlasInset = 1 / 1024

    for (const preset of TRACK_PRESETS) {
      const panelCount = Math.max(
        BARRIER_SEGMENTS,
        Math.ceil(preset.length / 4.25),
      )
      const geometry = createBarrierStructuralSurfaceGeometry(
        preset.curve,
        preset.venue,
        panelCount,
        preset.roadWidth,
      )
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const topVariant = preset.venue === 'apex'
        ? BARRIER_STRUCTURAL_SURFACE_VARIANTS.concreteCap
        : BARRIER_STRUCTURAL_SURFACE_VARIANTS.steelCap
      const outerVariant = preset.venue === 'apex'
        ? BARRIER_STRUCTURAL_SURFACE_VARIANTS.concreteOuter
        : BARRIER_STRUCTURAL_SURFACE_VARIANTS.steelOuter
      const retainingCapFaceCount = preset.venue === 'harbour'
        ? HARBOUR_RETAINING_WALL_LAYOUT.progresses.length * 6
        : 0
      const retainingWallTopFaceCount = preset.venue === 'harbour'
        ? HARBOUR_RETAINING_WALL_LAYOUT.progresses.length
        : 0
      const harbourStructuralFaceCount = retainingCapFaceCount
        + retainingWallTopFaceCount

      expect(geometry.name).toBe('shared-barrier-structural-surface-geometry')
      expect(positions.count).toBe(
        panelCount * 2 * 2 * 4 + harbourStructuralFaceCount * 4,
      )
      expect(normals.count).toBe(positions.count)
      expect(uvs.count).toBe(positions.count)
      expect(geometry.getIndex().count).toBe(
        panelCount * 2 * 2 * 6 + harbourStructuralFaceCount * 6,
      )
      expect(geometry.boundingBox.min.y).toBeCloseTo(
        TRACK_CENTERLINE_Y + BARRIER_GRAPHICS_BOTTOM_OFFSET,
        5,
      )
      expect(geometry.boundingBox.max.y).toBeCloseTo(
        preset.venue === 'harbour'
          ? HARBOUR_RETAINING_WALL_LAYOUT.capCenterY
            + HARBOUR_RETAINING_WALL_LAYOUT.capSize[1] / 2
          : TRACK_CENTERLINE_Y + 1.358,
        5,
      )

      for (let panel = 0; panel < panelCount; panel += 1) {
        const start = preset.curve.getPointAt(panel / panelCount)
        const end = preset.curve.getPointAt((panel + 1) / panelCount)
        const panelLength = start.distanceTo(end)
        const progress = (panel + 0.5) / panelCount
        const tangent = preset.curve.getTangentAt(progress).normalize()
        const side = new THREE.Vector3().crossVectors(up, tangent).normalize()

        for (const [sideOffset, sideSign] of [[0, -1], [1, 1]]) {
          for (const [faceOffset, variant] of [[0, topVariant], [1, outerVariant]]) {
            const quad = panel * 4 + sideOffset * 2 + faceOffset
            const vertex = quad * 4
            const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
            const moduleUvs = Array.from(
              { length: 4 },
              (_, index) => [uvs.getX(vertex + index), uvs.getY(vertex + index)],
            )
            const moduleMinU = variant % 2 * 0.5 + atlasInset
            const moduleMaxU = (variant % 2 + 1) * 0.5 - atlasInset
            const moduleMinV = variant < 2 ? 0.5 + atlasInset : atlasInset
            const moduleMaxV = variant < 2 ? 1 - atlasInset : 0.5 - atlasInset
            const uSpan = Math.max(...moduleUvs.map(([u]) => u))
              - Math.min(...moduleUvs.map(([u]) => u))
            const vSpan = Math.max(...moduleUvs.map(([, v]) => v))
              - Math.min(...moduleUvs.map(([, v]) => v))

            expect(Math.min(...moduleUvs.map(([u]) => u))).toBeGreaterThanOrEqual(
              moduleMinU,
            )
            expect(Math.max(...moduleUvs.map(([u]) => u))).toBeLessThanOrEqual(
              moduleMaxU,
            )
            expect(Math.min(...moduleUvs.map(([, v]) => v))).toBeGreaterThanOrEqual(
              moduleMinV,
            )
            expect(Math.max(...moduleUvs.map(([, v]) => v))).toBeLessThanOrEqual(
              moduleMaxV,
            )
            if (faceOffset === 0) {
              expect(normal.dot(up)).toBeGreaterThan(0.99)
              expect(uSpan / vSpan).toBeCloseTo(0.5 / panelLength, 5)
            } else {
              expect(normal.dot(side) * sideSign).toBeGreaterThan(0.9)
              expect(uSpan / vSpan).toBeCloseTo(
                panelLength / (1.342 - BARRIER_GRAPHICS_BOTTOM_OFFSET),
                5,
              )
            }
          }
        }
      }

      if (preset.venue === 'harbour') {
        const baseVertex = panelCount * 2 * 2 * 4
        const capFaceCount = HARBOUR_RETAINING_WALL_LAYOUT.progresses.length * 6
        const colors = geometry.getAttribute('color')
        expect(colors.count).toBe(positions.count)
        for (let face = 0; face < capFaceCount; face += 1) {
          const vertex = baseVertex + face * 4
          const capIndex = Math.floor(face / 6)
          const faceIndex = face % 6
          const variant = faceIndex === 5
            ? BARRIER_STRUCTURAL_SURFACE_VARIANTS.concreteCap
            : BARRIER_STRUCTURAL_SURFACE_VARIANTS.concreteOuter
          const expectedTint = new THREE.Color(capIndex % 2 ? '#d23d43' : '#fff4df')
          const moduleMinU = variant % 2 * 0.5 + atlasInset
          const moduleMaxU = (variant % 2 + 1) * 0.5 - atlasInset
          const moduleMinV = variant < 2 ? 0.5 + atlasInset : atlasInset
          const moduleMaxV = variant < 2 ? 1 - atlasInset : 0.5 - atlasInset
          const faceUvs = Array.from({ length: 4 }, (_, offset) => [
            uvs.getX(vertex + offset),
            uvs.getY(vertex + offset),
          ])

          expect(Math.min(...faceUvs.map(([u]) => u))).toBeGreaterThanOrEqual(moduleMinU)
          expect(Math.max(...faceUvs.map(([u]) => u))).toBeLessThanOrEqual(moduleMaxU)
          expect(Math.min(...faceUvs.map(([, v]) => v))).toBeGreaterThanOrEqual(moduleMinV)
          expect(Math.max(...faceUvs.map(([, v]) => v))).toBeLessThanOrEqual(moduleMaxV)
          expect(colors.getX(vertex)).toBeCloseTo(expectedTint.r, 5)
          expect(colors.getY(vertex)).toBeCloseTo(expectedTint.g, 5)
          expect(colors.getZ(vertex)).toBeCloseTo(expectedTint.b, 5)
        }

        const wallTopBaseVertex = baseVertex + capFaceCount * 4
        const concreteCap = BARRIER_STRUCTURAL_SURFACE_VARIANTS.concreteCap
        const moduleMinU = concreteCap % 2 * 0.5 + atlasInset
        const moduleMaxU = (concreteCap % 2 + 1) * 0.5 - atlasInset
        const moduleMinV = 0.5 + atlasInset
        const moduleMaxV = 1 - atlasInset
        for (
          let wall = 0;
          wall < HARBOUR_RETAINING_WALL_LAYOUT.progresses.length;
          wall += 1
        ) {
          const vertex = wallTopBaseVertex + wall * 4
          const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
          const faceUvs = Array.from({ length: 4 }, (_, offset) => [
            uvs.getX(vertex + offset),
            uvs.getY(vertex + offset),
          ])
          const uSpan = Math.max(...faceUvs.map(([u]) => u))
            - Math.min(...faceUvs.map(([u]) => u))
          const vSpan = Math.max(...faceUvs.map(([, v]) => v))
            - Math.min(...faceUvs.map(([, v]) => v))

          expect(normal.dot(up)).toBeGreaterThan(0.99)
          expect(positions.getY(vertex)).toBeCloseTo(
            HARBOUR_RETAINING_WALL_LAYOUT.centerY
              + HARBOUR_RETAINING_WALL_LAYOUT.height / 2
              + 0.008,
            5,
          )
          expect(Math.min(...faceUvs.map(([u]) => u))).toBeGreaterThanOrEqual(moduleMinU)
          expect(Math.max(...faceUvs.map(([u]) => u))).toBeLessThanOrEqual(moduleMaxU)
          expect(Math.min(...faceUvs.map(([, v]) => v))).toBeGreaterThanOrEqual(moduleMinV)
          expect(Math.max(...faceUvs.map(([, v]) => v))).toBeLessThanOrEqual(moduleMaxV)
          expect(uSpan / vSpan).toBeCloseTo(
            HARBOUR_RETAINING_WALL_LAYOUT.width
              / HARBOUR_RETAINING_WALL_LAYOUT.length,
            5,
          )
          expect(colors.getX(vertex)).toBeCloseTo(1, 5)
          expect(colors.getY(vertex)).toBeCloseTo(1, 5)
          expect(colors.getZ(vertex)).toBeCloseTo(1, 5)
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

  it('maps a finite repeating catch-fence skin above both circuit barriers', () => {
    const samples = 64
    const geometry = createCatchFenceGeometry(trackCurve, samples)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const indices = geometry.getIndex()

    expect(geometry.name).toBe('shared-catch-fence-surface-geometry')
    expect(positions.count).toBe((samples + 1) * 2 * 2)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(indices.count).toBe(samples * 2 * 6)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)
    expect(geometry.boundingBox.min.y).toBeCloseTo(1.28, 5)
    expect(geometry.boundingBox.max.y).toBeCloseTo(4.7, 5)
    expect(geometry.boundingBox.min.x).toBeLessThan(trackCurve.getPointAt(0).x)
    expect(geometry.boundingBox.max.x).toBeGreaterThan(trackCurve.getPointAt(0).x)
    expect(uvs.getY(1)).toBe(1)

    const verticesPerSide = (samples + 1) * 2
    for (const [sideIndex, sideSign] of [-1, 1].entries()) {
      const sideOffset = sideIndex * verticesPerSide
      const firstU = uvs.getX(sideOffset)
      const lastU = uvs.getX(sideOffset + samples * 2)
      const repeatSpan = lastU - firstU
      let sideDistance = 0
      for (let point = 1; point <= samples; point += 1) {
        const previous = new THREE.Vector3().fromBufferAttribute(
          positions,
          sideOffset + (point - 1) * 2,
        )
        const current = new THREE.Vector3().fromBufferAttribute(
          positions,
          sideOffset + point * 2,
        )
        sideDistance += current.distanceTo(previous)
      }
      expect(repeatSpan).toBeCloseTo(Math.round(repeatSpan), 5)
      expect(sideDistance / repeatSpan).toBeCloseTo(
        CATCH_FENCE_TEXTURE_WORLD_WIDTH,
        2,
      )
      expect(THREE.MathUtils.euclideanModulo(lastU, 1)).toBeCloseTo(
        THREE.MathUtils.euclideanModulo(firstU, 1),
        5,
      )
      for (let point = 0; point <= samples; point += 1) {
        const bottom = sideOffset + point * 2
        expect(uvs.getX(bottom)).toBeCloseTo(uvs.getX(bottom + 1), 6)
        expect(uvs.getY(bottom)).toBe(0)
        expect(uvs.getY(bottom + 1)).toBe(1)
      }

      for (let panel = 0; panel < samples; panel += 1) {
        const indexOffset = (sideIndex * samples + panel) * 6
        const a = new THREE.Vector3().fromBufferAttribute(
          positions,
          indices.getX(indexOffset),
        )
        const b = new THREE.Vector3().fromBufferAttribute(
          positions,
          indices.getX(indexOffset + 1),
        )
        const c = new THREE.Vector3().fromBufferAttribute(
          positions,
          indices.getX(indexOffset + 2),
        )
        const faceNormal = new THREE.Vector3()
          .crossVectors(b.clone().sub(a), c.clone().sub(a))
          .normalize()
        const trackSide = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          trackCurve.getTangentAt((panel + 0.5) / samples).normalize(),
        ).normalize()
        expect(faceNormal.dot(trackSide.multiplyScalar(-sideSign))).toBeGreaterThan(0.96)
      }
    }

    expect(() => createCatchFenceGeometry(null, samples)).toThrow(TypeError)
    expect(() => createCatchFenceGeometry({
      getPointAt: () => new THREE.Vector3(),
    }, samples)).toThrow(TypeError)
    expect(() => createCatchFenceGeometry({
      getPointAt: () => new THREE.Vector3(),
      getTangentAt: () => new THREE.Vector3(0, 0, 1),
    }, samples)).toThrow(RangeError)
    expect(() => createCatchFenceGeometry(trackCurve, 2)).toThrow(RangeError)
    expect(() => createCatchFenceGeometry(trackCurve, samples, 4)).toThrow(RangeError)

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
    const baseFacadeCount = layout.panelCount * facesPerPanel + 2
    const ribFaceCount = HARBOUR_TUNNEL_LIGHT_COUNT * 6
    const facadeCount = baseFacadeCount + ribFaceCount

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

    const rib = HARBOUR_TUNNEL_STRUCTURAL_RIB
    const ribWidth = harbour.roadWidth - rib.widthInset
    const lighting = getHarbourTunnelLightingLayout(
      harbour.curve,
      harbour.roadWidth,
    )
    for (const [ribIndex, progress] of lighting.progresses.entries()) {
      const point = harbour.curve.getPointAt(progress)
      const tangent = harbour.curve.getTangentAt(progress).normalize()
      const side = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, 1, 0),
        tangent,
      ).normalize()
      const ribCenter = point.clone().addScaledVector(
        new THREE.Vector3(0, 1, 0),
        rib.centerY,
      )
      const expectedNormals = [
        tangent.clone().multiplyScalar(-1),
        tangent,
        side.clone().multiplyScalar(-1),
        side,
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 1, 0),
      ]
      const expectedOffsets = [
        rib.depth / 2 + rib.faceOffset,
        rib.depth / 2 + rib.faceOffset,
        ribWidth / 2 + rib.faceOffset,
        ribWidth / 2 + rib.faceOffset,
        rib.height / 2 + rib.faceOffset,
        rib.height / 2 + rib.faceOffset,
      ]
      const expectedAspectRatios = [
        ribWidth / rib.height,
        ribWidth / rib.height,
        rib.depth / rib.height,
        rib.depth / rib.height,
        ribWidth / rib.depth,
        ribWidth / rib.depth,
      ]
      const ribFaceOffset = (baseFacadeCount + ribIndex * 6) * 4

      for (let face = 0; face < 6; face += 1) {
        const vertex = ribFaceOffset + face * 4
        const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
        const center = new THREE.Vector3()
        const faceUvs = []
        for (let corner = 0; corner < 4; corner += 1) {
          center.add(new THREE.Vector3().fromBufferAttribute(
            positions,
            vertex + corner,
          ))
          faceUvs.push({
            u: uvs.getX(vertex + corner),
            v: uvs.getY(vertex + corner),
          })
        }
        center.multiplyScalar(0.25)
        const minU = Math.min(...faceUvs.map(uv => uv.u))
        const maxU = Math.max(...faceUvs.map(uv => uv.u))
        const minV = Math.min(...faceUvs.map(uv => uv.v))
        const maxV = Math.max(...faceUvs.map(uv => uv.v))

        expect(normal.dot(expectedNormals[face])).toBeGreaterThan(0.99)
        expect(
          center.clone().sub(ribCenter).dot(expectedNormals[face]),
        ).toBeCloseTo(expectedOffsets[face], 5)
        expect(minU).toBeGreaterThan((ribIndex % 2) * 0.5)
        expect(maxU).toBeLessThan((ribIndex % 2 + 1) * 0.5)
        expect(minV).toBeGreaterThan(0)
        expect(maxV).toBeLessThan(0.5)
        expect((maxU - minU) / (maxV - minV)).toBeCloseTo(
          expectedAspectRatios[face],
          3,
        )
      }
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

  it('moves every Harbour apartment roof, balcony, and glass box into one atlas geometry', () => {
    const harbour = TRACK_PRESETS.find(track => track.venue === 'harbour')
    const geometry = createHarbourApartmentUpperSurfaceGeometry(harbour.curve)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const colors = geometry.getAttribute('color')
    const indices = geometry.getIndex()
    const atlasInset = 1 / 1024
    const worldUp = new THREE.Vector3(0, 1, 0)
    const expectedFloorCounts = [6, 9, 8, 10, 7, 6, 10, 5, 8, 7, 9, 9, 8, 7]
    const expectedBoxes = []

    for (const [buildingIndex, building] of HARBOUR_BUILDINGS.entries()) {
      expectedBoxes.push({
        kind: 'roof',
        progress: building.progress,
        lateral: building.lateral,
        centerY: building.height + 0.45,
        size: [building.width + 1.1, 0.7, 14],
        color: '#b9694e',
      })

      let floorCount = 0
      for (let floor = 3; floor < building.height - 1; floor += 3.2) {
        const sideSign = Math.sign(building.lateral) || 1
        expectedBoxes.push({
          kind: 'glass',
          progress: building.progress,
          lateral: building.lateral - sideSign * (building.width / 2 + 0.08),
          centerY: floor,
          size: [0.12, 0.24, 10.8],
          color: '#172629',
        })
        expectedBoxes.push({
          kind: 'balcony',
          progress: building.progress,
          lateral: building.lateral - sideSign * (building.width / 2 + 0.52),
          centerY: floor - 0.58,
          size: [1.15, 0.16, 14.2],
          color: '#d4d0c4',
        })
        floorCount += 1
      }
      expect(floorCount).toBe(expectedFloorCounts[buildingIndex])
    }

    const kindCounts = Object.fromEntries(
      ['roof', 'glass', 'balcony'].map(kind => [
        kind,
        expectedBoxes.filter(box => box.kind === kind).length,
      ]),
    )
    expect(HARBOUR_APARTMENT_UPPER_SURFACE_VARIANTS).toEqual({
      roofTop: 0,
      roofFasciaSoffit: 1,
      balconyStone: 2,
      glassBand: 3,
    })
    expect(kindCounts).toEqual({ roof: 14, glass: 109, balcony: 109 })
    expect(expectedBoxes).toHaveLength(232)
    expect(geometry.name).toBe('harbour-apartment-upper-surface-geometry')
    expect(positions.count).toBe(5_568)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(colors.count).toBe(positions.count)
    expect(indices.count).toBe(8_352)
    expect(indices.count / 3).toBe(2_784)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(value => (
      Number.isFinite(value) && value > 0 && value < 1
    ))).toBe(true)
    expect(Array.from(colors.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(indices.array).every(index => (
      Number.isInteger(index) && index >= 0 && index < positions.count
    ))).toBe(true)

    for (const [boxIndex, box] of expectedBoxes.entries()) {
      const point = harbour.curve.getPointAt(box.progress)
      const tangent = harbour.curve.getTangentAt(box.progress).normalize()
      const side = new THREE.Vector3().crossVectors(worldUp, tangent).normalize()
      const center = point.clone()
        .addScaledVector(side, box.lateral)
        .addScaledVector(worldUp, box.centerY)
      const boxVertex = boxIndex * 24
      const expectedTint = new THREE.Color(box.color)
      const axes = [side, worldUp, tangent]

      for (const [axisIndex, axis] of axes.entries()) {
        const projected = Array.from({ length: 24 }, (_, vertexOffset) => (
          new THREE.Vector3()
            .fromBufferAttribute(positions, boxVertex + vertexOffset)
            .sub(center)
            .dot(axis)
        ))
        expect(Math.min(...projected)).toBeCloseTo(-box.size[axisIndex] / 2, 4)
        expect(Math.max(...projected)).toBeCloseTo(box.size[axisIndex] / 2, 4)
      }

      for (let vertexOffset = 0; vertexOffset < 24; vertexOffset += 1) {
        const vertex = boxVertex + vertexOffset
        expect(colors.getX(vertex)).toBeCloseTo(expectedTint.r, 5)
        expect(colors.getY(vertex)).toBeCloseTo(expectedTint.g, 5)
        expect(colors.getZ(vertex)).toBeCloseTo(expectedTint.b, 5)
      }

      const defaultVariant = box.kind === 'balcony'
        ? HARBOUR_APARTMENT_UPPER_SURFACE_VARIANTS.balconyStone
        : HARBOUR_APARTMENT_UPPER_SURFACE_VARIANTS.glassBand
      const faceVariants = box.kind === 'roof'
        ? [
          HARBOUR_APARTMENT_UPPER_SURFACE_VARIANTS.roofFasciaSoffit,
          HARBOUR_APARTMENT_UPPER_SURFACE_VARIANTS.roofFasciaSoffit,
          HARBOUR_APARTMENT_UPPER_SURFACE_VARIANTS.roofTop,
          HARBOUR_APARTMENT_UPPER_SURFACE_VARIANTS.roofFasciaSoffit,
          HARBOUR_APARTMENT_UPPER_SURFACE_VARIANTS.roofFasciaSoffit,
          HARBOUR_APARTMENT_UPPER_SURFACE_VARIANTS.roofFasciaSoffit,
        ]
        : Array.from({ length: 6 }, () => defaultVariant)
      const [width, height, length] = box.size
      const faceDimensions = [
        [length, height],
        [length, height],
        [width, length],
        [width, length],
        [width, height],
        [width, height],
      ]
      const faceNormals = [
        side,
        side.clone().multiplyScalar(-1),
        worldUp,
        worldUp.clone().multiplyScalar(-1),
        tangent,
        tangent.clone().multiplyScalar(-1),
      ]

      for (let face = 0; face < 6; face += 1) {
        const vertex = boxVertex + face * 4
        const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
        const variant = faceVariants[face]
        const column = variant % 2
        const centerU = column * 0.5 + 0.25
        const centerV = variant < 2 ? 0.75 : 0.25
        const [physicalU, physicalV] = faceDimensions[face]
        const maxDimension = Math.max(physicalU, physicalV)
        const spanU = (0.5 - atlasInset * 2) * physicalU / maxDimension
        const spanV = (0.5 - atlasInset * 2) * physicalV / maxDimension
        const faceU = Array.from(
          { length: 4 },
          (_, offset) => uvs.getX(vertex + offset),
        )
        const faceV = Array.from(
          { length: 4 },
          (_, offset) => uvs.getY(vertex + offset),
        )

        expect(normal.dot(faceNormals[face])).toBeGreaterThan(0.99)
        expect(Math.min(...faceU)).toBeCloseTo(centerU - spanU / 2, 6)
        expect(Math.max(...faceU)).toBeCloseTo(centerU + spanU / 2, 6)
        expect(Math.min(...faceV)).toBeCloseTo(centerV - spanV / 2, 6)
        expect(Math.max(...faceV)).toBeCloseTo(centerV + spanV / 2, 6)
      }
    }

    for (let triangle = 0; triangle < indices.count; triangle += 3) {
      const vertexA = indices.getX(triangle)
      const vertexB = indices.getX(triangle + 1)
      const vertexC = indices.getX(triangle + 2)
      const pointA = new THREE.Vector3().fromBufferAttribute(positions, vertexA)
      const pointB = new THREE.Vector3().fromBufferAttribute(positions, vertexB)
      const pointC = new THREE.Vector3().fromBufferAttribute(positions, vertexC)
      const geometricNormal = pointB.clone()
        .sub(pointA)
        .cross(pointC.clone().sub(pointA))
        .normalize()
      const averagedNormal = new THREE.Vector3()
        .fromBufferAttribute(normals, vertexA)
        .add(new THREE.Vector3().fromBufferAttribute(normals, vertexB))
        .add(new THREE.Vector3().fromBufferAttribute(normals, vertexC))
        .normalize()
      expect(geometricNormal.dot(averagedNormal)).toBeGreaterThan(0.99)
    }

    expect(geometry.boundingBox.min.x).toBeCloseTo(-215.229736, 5)
    expect(geometry.boundingBox.min.y).toBeCloseTo(2.34, 5)
    expect(geometry.boundingBox.min.z).toBeCloseTo(-96.879921, 5)
    expect(geometry.boundingBox.max.x).toBeCloseTo(203.885284, 5)
    expect(geometry.boundingBox.max.y).toBeCloseTo(36.8, 5)
    expect(geometry.boundingBox.max.z).toBeCloseTo(93.008812, 5)

    const scenery = createCircuitSceneryGeometry(
      harbour.curve,
      harbour.venue,
      harbour.roadWidth,
    )
    const yachtRig = createHarbourYachtRigSurfaceGeometry()
    const surfaceWear = createTrackSurfaceWearGeometry(
      harbour.curve,
      harbour.venue,
      harbour.roadWidth,
    )
    const palmTrunk = createPalmTrunkSurfaceGeometry(
      harbour.curve,
      harbour.venue,
    )
    expect(scenery.getAttribute('position').count).toBe(8_904)
    expect(scenery.getIndex().count).toBe(13_356)
    expect(scenery.getIndex().count / 3).toBe(4_452)
    expect(
      scenery.getAttribute('position').count
        + positions.count
        + yachtRig.getAttribute('position').count
        + surfaceWear.getAttribute('position').count
        + palmTrunk.getAttribute('position').count,
    ).toBe(19_532)
    expect(
      scenery.getIndex().count
        + indices.count
        + yachtRig.getIndex().count
        + surfaceWear.getIndex().count
        + palmTrunk.getIndex().count,
    ).toBe(33_552)
    expect((
      scenery.getIndex().count
        + indices.count
        + yachtRig.getIndex().count
        + surfaceWear.getIndex().count
        + palmTrunk.getIndex().count
    ) / 3).toBe(11_184)

    scenery.dispose()
    yachtRig.dispose()
    surfaceWear.dispose()
    palmTrunk.dispose()
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

  it('covers every player-visible yacht upper surface with tinted atlas panels', () => {
    const geometry = createHarbourYachtUpperSurfaceGeometry()
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const colors = geometry.getAttribute('color')
    const indices = geometry.getIndex()
    const atlasInset = 1 / 1024
    const facesPerYacht = 7
    const faceCount = HARBOUR_YACHT_LAYOUT.boats.length * facesPerYacht
    const white = new THREE.Color('#fff4df')
    const red = new THREE.Color('#d23d43')
    const cyan = new THREE.Color('#42a9bf')

    expect(positions.count).toBe(faceCount * 4)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(colors.count).toBe(positions.count)
    expect(indices.count).toBe(faceCount * 6)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(colors.array).every(Number.isFinite)).toBe(true)

    for (const [yachtIndex, yacht] of HARBOUR_YACHT_LAYOUT.boats.entries()) {
      const yachtFace = yachtIndex * facesPerYacht
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
      const equipmentTint = yachtIndex % 2 === 0 ? red : cyan
      const faces = [
        {
          offset: 0,
          expectedNormal: new THREE.Vector3(0, 1, 0),
          variant: YACHT_UPPER_SURFACE_VARIANTS.deckTop,
          tint: white,
          expectedY: 0.842,
        },
        {
          offset: 1,
          expectedNormal: new THREE.Vector3(0, 1, 0),
          variant: YACHT_UPPER_SURFACE_VARIANTS.cabinRoof,
          tint: white,
          expectedY: 1.967,
        },
        {
          offset: 2,
          expectedNormal: new THREE.Vector3(0, 1, 0),
          variant: YACHT_UPPER_SURFACE_VARIANTS.serviceRoof,
          tint: equipmentTint,
          expectedY: 2.342,
        },
        {
          offset: 3,
          expectedNormal: right.clone().multiplyScalar(-1),
          variant: YACHT_UPPER_SURFACE_VARIANTS.serviceFascia,
          tint: equipmentTint,
        },
        {
          offset: 4,
          expectedNormal: right,
          variant: YACHT_UPPER_SURFACE_VARIANTS.serviceFascia,
          tint: equipmentTint,
        },
        {
          offset: 5,
          expectedNormal: forward.clone().multiplyScalar(-1),
          variant: YACHT_UPPER_SURFACE_VARIANTS.serviceFascia,
          tint: equipmentTint,
        },
        {
          offset: 6,
          expectedNormal: forward,
          variant: YACHT_UPPER_SURFACE_VARIANTS.serviceFascia,
          tint: equipmentTint,
        },
      ]

      for (const face of faces) {
        const faceIndex = yachtFace + face.offset
        const vertex = faceIndex * 4
        const triangle = faceIndex * 6
        const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
        const pointA = new THREE.Vector3().fromBufferAttribute(
          positions,
          indices.getX(triangle),
        )
        const pointB = new THREE.Vector3().fromBufferAttribute(
          positions,
          indices.getX(triangle + 1),
        )
        const pointC = new THREE.Vector3().fromBufferAttribute(
          positions,
          indices.getX(triangle + 2),
        )
        const windingNormal = pointB.sub(pointA).cross(pointC.sub(pointA)).normalize()
        const tint = new THREE.Color(
          colors.getX(vertex),
          colors.getY(vertex),
          colors.getZ(vertex),
        )
        const column = face.variant % 2
        const isTopRow = face.variant < 2
        const faceU = Array.from({ length: 4 }, (_, index) => uvs.getX(vertex + index))
        const faceV = Array.from({ length: 4 }, (_, index) => uvs.getY(vertex + index))

        expect(normal.dot(face.expectedNormal)).toBeGreaterThan(0.99)
        expect(windingNormal.dot(normal)).toBeGreaterThan(0.99)
        expect(tint.r).toBeCloseTo(face.tint.r, 5)
        expect(tint.g).toBeCloseTo(face.tint.g, 5)
        expect(tint.b).toBeCloseTo(face.tint.b, 5)
        expect(Math.min(...faceU)).toBeCloseTo(column * 0.5 + atlasInset, 6)
        expect(Math.max(...faceU)).toBeCloseTo((column + 1) * 0.5 - atlasInset, 6)
        expect(Math.min(...faceV)).toBeCloseTo(
          (isTopRow ? 0.5 : 0) + atlasInset,
          6,
        )
        expect(Math.max(...faceV)).toBeCloseTo(
          (isTopRow ? 1 : 0.5) - atlasInset,
          6,
        )
        if (Number.isFinite(face.expectedY)) {
          expect(positions.getY(vertex)).toBeCloseTo(face.expectedY, 5)
        }
      }
    }

    expect(geometry.boundingBox.min.x).toBeCloseTo(-113.947563, 5)
    expect(geometry.boundingBox.min.y).toBeCloseTo(0.842, 5)
    expect(geometry.boundingBox.min.z).toBeCloseTo(97.12043, 5)
    expect(geometry.boundingBox.max.x).toBeCloseTo(163.947556, 5)
    expect(geometry.boundingBox.max.y).toBeCloseTo(2.342, 5)
    expect(geometry.boundingBox.max.z).toBeCloseTo(132.879562, 5)

    geometry.dispose()
  })

  it('replaces every yacht mast and boom face with a complete rig atlas skin', () => {
    const geometry = createHarbourYachtRigSurfaceGeometry()
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const colors = geometry.getAttribute('color')
    const indices = geometry.getIndex()
    const atlasInset = 1 / 1024
    const mastVertexCount = 40
    const boomVertexCount = 24
    const verticesPerYacht = mastVertexCount + boomVertexCount
    const indicesPerYacht = 108
    const rigTint = new THREE.Color('#d5d8d6')

    expect(Object.isFrozen(YACHT_RIG_SURFACE_VARIANTS)).toBe(true)
    expect(Object.isFrozen(HARBOUR_YACHT_LAYOUT.mast)).toBe(true)
    expect(Object.isFrozen(HARBOUR_YACHT_LAYOUT.boom)).toBe(true)
    expect(Object.isFrozen(HARBOUR_YACHT_LAYOUT.boom.size)).toBe(true)
    expect(YACHT_RIG_SURFACE_VARIANTS).toEqual({
      mastSide: 0,
      boomSide: 1,
      mastCap: 2,
      boomEnd: 3,
    })
    expect(positions.count).toBe(
      HARBOUR_YACHT_LAYOUT.boats.length * verticesPerYacht,
    )
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(colors.count).toBe(positions.count)
    expect(indices.count).toBe(
      HARBOUR_YACHT_LAYOUT.boats.length * indicesPerYacht,
    )
    expect(indices.count / 3).toBe(324)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(colors.array).every(Number.isFinite)).toBe(true)

    const assertVariant = (start, count, variant) => {
      const column = variant % 2
      const isTopRow = variant < 2
      const minU = column * 0.5 + atlasInset
      const maxU = (column + 1) * 0.5 - atlasInset
      const minV = (isTopRow ? 0.5 : 0) + atlasInset
      const maxV = (isTopRow ? 1 : 0.5) - atlasInset
      for (let vertex = start; vertex < start + count; vertex += 1) {
        expect(uvs.getX(vertex)).toBeGreaterThanOrEqual(minU - 1e-7)
        expect(uvs.getX(vertex)).toBeLessThanOrEqual(maxU + 1e-7)
        expect(uvs.getY(vertex)).toBeGreaterThanOrEqual(minV - 1e-7)
        expect(uvs.getY(vertex)).toBeLessThanOrEqual(maxV + 1e-7)
      }
    }

    for (const [yachtIndex, yacht] of HARBOUR_YACHT_LAYOUT.boats.entries()) {
      const vertexStart = yachtIndex * verticesPerYacht
      const mastStart = vertexStart
      const boomStart = vertexStart + mastVertexCount
      assertVariant(
        mastStart,
        14,
        YACHT_RIG_SURFACE_VARIANTS.mastSide,
      )
      assertVariant(
        mastStart + 14,
        26,
        YACHT_RIG_SURFACE_VARIANTS.mastCap,
      )
      assertVariant(
        boomStart,
        16,
        YACHT_RIG_SURFACE_VARIANTS.boomSide,
      )
      assertVariant(
        boomStart + 16,
        8,
        YACHT_RIG_SURFACE_VARIANTS.boomEnd,
      )

      const mastYs = Array.from(
        { length: mastVertexCount },
        (_, offset) => positions.getY(mastStart + offset),
      )
      expect(Math.min(...mastYs)).toBeCloseTo(
        HARBOUR_YACHT_LAYOUT.mast.centerY
          - HARBOUR_YACHT_LAYOUT.mast.height / 2,
        5,
      )
      expect(Math.max(...mastYs)).toBeCloseTo(
        HARBOUR_YACHT_LAYOUT.mast.centerY
          + HARBOUR_YACHT_LAYOUT.mast.height / 2,
        5,
      )

      const boomCenter = new THREE.Vector3()
      for (let offset = 0; offset < boomVertexCount; offset += 1) {
        boomCenter.add(new THREE.Vector3().fromBufferAttribute(
          positions,
          boomStart + offset,
        ))
      }
      boomCenter.divideScalar(boomVertexCount)
      expect(boomCenter.x).toBeCloseTo(yacht.x, 5)
      expect(boomCenter.y).toBeCloseTo(HARBOUR_YACHT_LAYOUT.boom.centerY, 5)
      expect(boomCenter.z).toBeCloseTo(
        yacht.z + HARBOUR_YACHT_LAYOUT.boom.zOffset,
        5,
      )

      for (let offset = 0; offset < verticesPerYacht; offset += 1) {
        const color = new THREE.Color(
          colors.getX(vertexStart + offset),
          colors.getY(vertexStart + offset),
          colors.getZ(vertexStart + offset),
        )
        expect(color.r).toBeCloseTo(rigTint.r, 5)
        expect(color.g).toBeCloseTo(rigTint.g, 5)
        expect(color.b).toBeCloseTo(rigTint.b, 5)
      }
    }

    for (let triangle = 0; triangle < indices.count; triangle += 3) {
      const aIndex = indices.getX(triangle)
      const bIndex = indices.getX(triangle + 1)
      const cIndex = indices.getX(triangle + 2)
      const pointA = new THREE.Vector3().fromBufferAttribute(positions, aIndex)
      const pointB = new THREE.Vector3().fromBufferAttribute(positions, bIndex)
      const pointC = new THREE.Vector3().fromBufferAttribute(positions, cIndex)
      const windingNormal = pointB.clone().sub(pointA)
        .cross(pointC.clone().sub(pointA))
        .normalize()
      const averageNormal = new THREE.Vector3()
        .add(new THREE.Vector3().fromBufferAttribute(normals, aIndex))
        .add(new THREE.Vector3().fromBufferAttribute(normals, bIndex))
        .add(new THREE.Vector3().fromBufferAttribute(normals, cIndex))
        .normalize()
      // The low-poly mast intentionally uses smooth radial normals, so each
      // triangle normal can differ by half a six-sided segment angle.
      expect(windingNormal.dot(averageNormal)).toBeGreaterThan(0.98)
    }

    expect(geometry.boundingBox.min.x).toBeCloseTo(-112.235619, 5)
    expect(geometry.boundingBox.min.y).toBeCloseTo(1.05, 5)
    expect(geometry.boundingBox.min.z).toBeCloseTo(99.902245, 5)
    expect(geometry.boundingBox.max.x).toBeCloseTo(162.235626, 5)
    expect(geometry.boundingBox.max.y).toBeCloseTo(7.65, 5)
    expect(geometry.boundingBox.max.z).toBeCloseTo(130.29776, 5)

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

  it('maps both full-lap Temple grass verges with physical-scale generated turf', () => {
    const temple = TRACK_PRESETS.find(track => track.venue === 'temple')
    const geometry = createTempleGrassVergeGeometry(
      temple.curve,
      temple.roadWidth,
    )
    const scenery = createCircuitSceneryGeometry(
      temple.curve,
      temple.venue,
      temple.roadWidth,
    )
    const surfaceWear = createTrackSurfaceWearGeometry(
      temple.curve,
      temple.venue,
      temple.roadWidth,
    )
    const gravelRunoff = createTempleGravelRunoffGeometry(
      temple.curve,
      temple.roadWidth,
    )
    const pitStructure = createPitComplexStructureGeometry(
      temple.curve,
      temple.venue,
      temple.roadWidth,
    )
    const templeVenue = createTempleVenueFacadeGeometry(
      temple.curve,
      temple.roadWidth,
    )
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const colors = geometry.getAttribute('color')
    const indices = geometry.getIndex()
    const verticesPerVerge = (LOW_DETAIL_SURFACE_SEGMENTS + 1) * 2
    const indicesPerVerge = LOW_DETAIL_SURFACE_SEGMENTS * 6
    const expectedColor = new THREE.Color('#376638')

    expect(geometry.name).toBe('temple-grass-verge-geometry')
    expect(positions.count).toBe(verticesPerVerge * 2)
    expect(normals.count).toBe(positions.count)
    expect(uvs.count).toBe(positions.count)
    expect(colors.count).toBe(positions.count)
    expect(indices.count).toBe(indicesPerVerge * 2)
    expect(indices.count / 3).toBe(692)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(colors.array).every(Number.isFinite)).toBe(true)
    expect(geometry.boundingBox.min.toArray()).toEqual([
      -259.2823181152344,
      0.052000001072883606,
      -149.3540802001953,
    ])
    expect(geometry.boundingBox.max.toArray()).toEqual([
      288.8153076171875,
      0.052000001072883606,
      138.50193786621094,
    ])

    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      expect(normals.getY(vertex)).toBeGreaterThan(0.999)
      expect(colors.getX(vertex)).toBeCloseTo(expectedColor.r, 6)
      expect(colors.getY(vertex)).toBeCloseTo(expectedColor.g, 6)
      expect(colors.getZ(vertex)).toBeCloseTo(expectedColor.b, 6)
    }

    for (let verge = 0; verge < 2; verge += 1) {
      const vertexOffset = verge * verticesPerVerge
      const phase = verge * 0.37
      expect(uvs.getX(vertexOffset) * INFIELD_ALBEDO_REPEAT).toBeCloseTo(phase, 6)
      expect(
        uvs.getX(vertexOffset + 1) * INFIELD_ALBEDO_REPEAT,
      ).toBeCloseTo(phase + 5.5 / TEMPLE_TURF_WORLD_TILE_SIZE, 6)

      for (let sample = 1; sample <= LOW_DETAIL_SURFACE_SEGMENTS; sample += 1) {
        const previousVertex = vertexOffset + (sample - 1) * 2
        const currentVertex = vertexOffset + sample * 2
        const previousCenter = new THREE.Vector3()
          .fromBufferAttribute(positions, previousVertex)
          .add(new THREE.Vector3().fromBufferAttribute(positions, previousVertex + 1))
          .multiplyScalar(0.5)
        const currentCenter = new THREE.Vector3()
          .fromBufferAttribute(positions, currentVertex)
          .add(new THREE.Vector3().fromBufferAttribute(positions, currentVertex + 1))
          .multiplyScalar(0.5)
        const mappedDistance = (
          uvs.getY(currentVertex) - uvs.getY(previousVertex)
        ) * INFIELD_ALBEDO_REPEAT * TEMPLE_TURF_WORLD_TILE_SIZE
        expect(mappedDistance).toBeCloseTo(previousCenter.distanceTo(currentCenter), 3)
      }
    }

    for (let index = 0; index < indices.count; index += 3) {
      const aIndex = indices.getX(index)
      const bIndex = indices.getX(index + 1)
      const cIndex = indices.getX(index + 2)
      const a = new THREE.Vector3().fromBufferAttribute(positions, aIndex)
      const b = new THREE.Vector3().fromBufferAttribute(positions, bIndex)
      const c = new THREE.Vector3().fromBufferAttribute(positions, cIndex)
      const geometricNormal = b.clone().sub(a).cross(c.clone().sub(a)).normalize()
      const averageNormal = new THREE.Vector3()
        .fromBufferAttribute(normals, aIndex)
        .add(new THREE.Vector3().fromBufferAttribute(normals, bIndex))
        .add(new THREE.Vector3().fromBufferAttribute(normals, cIndex))
        .normalize()
      expect(
        geometricNormal.dot(averageNormal),
        `Temple verge triangle ${index / 3}`,
      ).toBeGreaterThan(0.999)
    }

    expect(
      scenery.getAttribute('position').count
      + positions.count
      + gravelRunoff.getAttribute('position').count
      + pitStructure.getAttribute('position').count
      + templeVenue.getAttribute('position').count
      + surfaceWear.getAttribute('position').count,
    ).toBe(16_992)
    expect(
      scenery.getIndex().count
      + indices.count
      + gravelRunoff.getIndex().count
      + pitStructure.getIndex().count
      + templeVenue.getIndex().count
      + surfaceWear.getIndex().count,
    ).toBe(30_648)
    expect(
      (
        scenery.getIndex().count
        + indices.count
        + gravelRunoff.getIndex().count
        + pitStructure.getIndex().count
        + templeVenue.getIndex().count
        + surfaceWear.getIndex().count
      ) / 3,
    ).toBe(10_216)

    geometry.dispose()
    scenery.dispose()
    gravelRunoff.dispose()
    pitStructure.dispose()
    templeVenue.dispose()
    surfaceWear.dispose()
  })

  it('maps every Temple corner gravel block at a consistent physical texture scale', () => {
    const temple = TRACK_PRESETS.find(track => track.venue === 'temple')
    const layout = getTempleGravelRunoffLayout(temple.curve, temple.roadWidth)
    const geometry = createTempleGravelRunoffGeometry(temple.curve, temple.roadWidth)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const colors = geometry.getAttribute('color')
    const indices = geometry.getIndex()
    const expectedColor = new THREE.Color('#b9a67c')

    expect(layout).toHaveLength(78)
    expect(geometry.name).toBe('temple-gravel-runoff-geometry')
    expect(positions.count).toBe(1_872)
    expect(normals.count).toBe(1_872)
    expect(uvs.count).toBe(1_872)
    expect(colors.count).toBe(1_872)
    expect(indices.count).toBe(2_808)
    expect(indices.count / 3).toBe(936)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(colors.array).every(Number.isFinite)).toBe(true)
    expect(geometry.boundingBox.min.x).toBeCloseTo(-242.332916, 5)
    expect(geometry.boundingBox.min.y).toBeCloseTo(0, 8)
    expect(geometry.boundingBox.min.z).toBeCloseTo(-145.584381, 5)
    expect(geometry.boundingBox.max.x).toBeCloseTo(287.514557, 5)
    expect(geometry.boundingBox.max.y).toBeCloseTo(0.07, 6)
    expect(geometry.boundingBox.max.z).toBeCloseTo(108.925278, 5)

    const facePhysicalSizes = [
      [0.92, 0.07],
      [0.92, 0.07],
      [5.2, 0.92],
      [5.2, 0.92],
      [5.2, 0.07],
      [5.2, 0.07],
    ]
    for (let box = 0; box < layout.length; box += 1) {
      for (let vertex = box * 24; vertex < box * 24 + 24; vertex += 1) {
        expect(colors.getX(vertex)).toBeCloseTo(expectedColor.r, 6)
        expect(colors.getY(vertex)).toBeCloseTo(expectedColor.g, 6)
        expect(colors.getZ(vertex)).toBeCloseTo(expectedColor.b, 6)
        expect(new THREE.Vector3().fromBufferAttribute(normals, vertex).length()).toBeCloseTo(1, 6)
      }
      for (let face = 0; face < 6; face += 1) {
        const uvStart = box * 24 + face * 4
        const faceUvs = Array.from({ length: 4 }, (_, vertex) => ({
          u: uvs.getX(uvStart + vertex),
          v: uvs.getY(uvStart + vertex),
        }))
        const spanU = Math.max(...faceUvs.map(uv => uv.u)) - Math.min(...faceUvs.map(uv => uv.u))
        const spanV = Math.max(...faceUvs.map(uv => uv.v)) - Math.min(...faceUvs.map(uv => uv.v))
        expect(spanU * TEMPLE_GRAVEL_WORLD_TILE_SIZE).toBeCloseTo(
          facePhysicalSizes[face][0],
          5,
        )
        expect(spanV * TEMPLE_GRAVEL_WORLD_TILE_SIZE).toBeCloseTo(
          facePhysicalSizes[face][1],
          5,
        )
      }
    }

    for (let index = 0; index < indices.count; index += 3) {
      const aIndex = indices.getX(index)
      const bIndex = indices.getX(index + 1)
      const cIndex = indices.getX(index + 2)
      const a = new THREE.Vector3().fromBufferAttribute(positions, aIndex)
      const b = new THREE.Vector3().fromBufferAttribute(positions, bIndex)
      const c = new THREE.Vector3().fromBufferAttribute(positions, cIndex)
      const geometricNormal = b.clone().sub(a).cross(c.clone().sub(a)).normalize()
      const averageNormal = new THREE.Vector3()
        .fromBufferAttribute(normals, aIndex)
        .add(new THREE.Vector3().fromBufferAttribute(normals, bIndex))
        .add(new THREE.Vector3().fromBufferAttribute(normals, cIndex))
        .normalize()
      expect(geometricNormal.dot(averageNormal)).toBeGreaterThan(0.999)
    }

    geometry.dispose()
  })

  it('moves every Apex corner and pit-straight runoff block into one generated surface', () => {
    const apex = TRACK_PRESETS.find(track => track.venue === 'apex')
    const layout = getApexGravelRunoffLayout(apex.curve, apex.roadWidth)
    const pitStraightLayout = getApexPitStraightRunoffLayout(apex.roadWidth)
    const geometry = createApexGravelRunoffGeometry(apex.curve, apex.roadWidth)
    const scenery = createCircuitSceneryGeometry(apex.curve, apex.venue, apex.roadWidth)
    const surfaceWear = createTrackSurfaceWearGeometry(
      apex.curve,
      apex.venue,
      apex.roadWidth,
    )
    const pitStructure = createPitComplexStructureGeometry(
      apex.curve,
      apex.venue,
      apex.roadWidth,
    )
    const palmTrunk = createPalmTrunkSurfaceGeometry(apex.curve, apex.venue)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')
    const colors = geometry.getAttribute('color')
    const indices = geometry.getIndex()

    expect(Object.isFrozen(layout)).toBe(true)
    expect(layout).toHaveLength(97)
    expect(layout.filter(runoff => runoff.kind === 'corner')).toHaveLength(91)
    expect(layout.filter(runoff => runoff.kind === 'pitStraight')).toHaveLength(6)
    expect(Object.isFrozen(pitStraightLayout)).toBe(true)
    expect(pitStraightLayout).toEqual(layout.slice(-6))
    for (const [index, lateral] of [
      -9.65,
      -10.67,
      -11.69,
      9.65,
      10.67,
      11.69,
    ].entries()) {
      expect(pitStraightLayout[index].lateral).toBeCloseTo(lateral, 8)
    }
    expect(layout.every(Object.isFrozen)).toBe(true)
    expect(layout.every(runoff => Object.isFrozen(runoff.size))).toBe(true)
    expect(geometry.name).toBe('apex-gravel-runoff-geometry')
    expect(positions.count).toBe(2_328)
    expect(normals.count).toBe(2_328)
    expect(uvs.count).toBe(2_328)
    expect(colors.count).toBe(2_328)
    expect(indices.count).toBe(3_492)
    expect(indices.count / 3).toBe(1_164)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(colors.array).every(Number.isFinite)).toBe(true)
    expect(geometry.boundingBox.min.x).toBeCloseTo(-208.81749, 5)
    expect(geometry.boundingBox.min.y).toBeCloseTo(0, 8)
    expect(geometry.boundingBox.min.z).toBeCloseTo(-109.377037, 5)
    expect(geometry.boundingBox.max.x).toBeCloseTo(148.975647, 5)
    expect(geometry.boundingBox.max.y).toBeCloseTo(0.0825, 6)
    expect(geometry.boundingBox.max.z).toBeCloseTo(148.07074, 5)
    expect(
      positions.count
      + scenery.getAttribute('position').count
      + pitStructure.getAttribute('position').count
      + surfaceWear.getAttribute('position').count
      + palmTrunk.getAttribute('position').count,
    ).toBe(21_508)
    expect(
      indices.count
      + scenery.getIndex().count
      + pitStructure.getIndex().count
      + surfaceWear.getIndex().count
      + palmTrunk.getIndex().count,
    ).toBe(37_452)

    for (let box = 0; box < layout.length; box += 1) {
      const runoff = layout[box]
      const [width, height, length] = runoff.size
      const expectedColor = new THREE.Color(runoff.color)
      const facePhysicalSizes = [
        [length, height],
        [length, height],
        [width, length],
        [width, length],
        [width, height],
        [width, height],
      ]
      for (let vertex = box * 24; vertex < box * 24 + 24; vertex += 1) {
        expect(colors.getX(vertex)).toBeCloseTo(expectedColor.r, 6)
        expect(colors.getY(vertex)).toBeCloseTo(expectedColor.g, 6)
        expect(colors.getZ(vertex)).toBeCloseTo(expectedColor.b, 6)
        expect(new THREE.Vector3().fromBufferAttribute(normals, vertex).length())
          .toBeCloseTo(1, 6)
      }
      for (let face = 0; face < 6; face += 1) {
        const uvStart = box * 24 + face * 4
        const faceUvs = Array.from({ length: 4 }, (_, vertex) => ({
          u: uvs.getX(uvStart + vertex),
          v: uvs.getY(uvStart + vertex),
        }))
        const spanU = Math.max(...faceUvs.map(uv => uv.u))
          - Math.min(...faceUvs.map(uv => uv.u))
        const spanV = Math.max(...faceUvs.map(uv => uv.v))
          - Math.min(...faceUvs.map(uv => uv.v))
        expect(spanU * TEMPLE_GRAVEL_WORLD_TILE_SIZE).toBeCloseTo(
          facePhysicalSizes[face][0],
          5,
        )
        expect(spanV * TEMPLE_GRAVEL_WORLD_TILE_SIZE).toBeCloseTo(
          facePhysicalSizes[face][1],
          5,
        )
      }
    }

    for (let index = 0; index < indices.count; index += 3) {
      const aIndex = indices.getX(index)
      const bIndex = indices.getX(index + 1)
      const cIndex = indices.getX(index + 2)
      const a = new THREE.Vector3().fromBufferAttribute(positions, aIndex)
      const b = new THREE.Vector3().fromBufferAttribute(positions, bIndex)
      const c = new THREE.Vector3().fromBufferAttribute(positions, cIndex)
      const geometricNormal = b.clone().sub(a).cross(c.clone().sub(a)).normalize()
      const averageNormal = new THREE.Vector3()
        .fromBufferAttribute(normals, aIndex)
        .add(new THREE.Vector3().fromBufferAttribute(normals, bIndex))
        .add(new THREE.Vector3().fromBufferAttribute(normals, cIndex))
        .normalize()
      expect(geometricNormal.dot(averageNormal)).toBeGreaterThan(0.999)
    }

    geometry.dispose()
    scenery.dispose()
    pitStructure.dispose()
    surfaceWear.dispose()
    palmTrunk.dispose()
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
    const glassFaces = 6
    const facadeCount = bankingFaces + towerFaces + glassFaces

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

    const glassFirstFace = towerFirstFace + towerFaces
    const glassNormals = Array.from({ length: glassFaces }, (_, face) => (
      new THREE.Vector3().fromBufferAttribute(
        normals,
        (glassFirstFace + face) * 4,
      )
    ))
    expect(glassNormals[0].dot(glassNormals[1])).toBeLessThan(-0.99)
    expect(glassNormals[2].dot(glassNormals[3])).toBeLessThan(-0.99)
    expect(glassNormals[4].y).toBeLessThan(-0.99)
    expect(glassNormals[5].y).toBeGreaterThan(0.99)

    const [glassWidth, glassHeight, glassLength] = TEMPLE_TIMING_TOWER_GLASS.size
    for (const [face, physicalU, physicalV] of [
      [glassFirstFace + 2, glassWidth, glassHeight],
      [glassFirstFace + 3, glassWidth, glassHeight],
      [glassFirstFace + 4, glassWidth, glassLength],
      [glassFirstFace + 5, glassWidth, glassLength],
    ]) {
      const faceU = Array.from(
        { length: 4 },
        (_, index) => uvs.getX(face * 4 + index),
      )
      const faceV = Array.from(
        { length: 4 },
        (_, index) => uvs.getY(face * 4 + index),
      )
      const mappedAspect = (
        (Math.max(...faceU) - Math.min(...faceU))
        / (Math.max(...faceV) - Math.min(...faceV))
      )
      expect(mappedAspect).toBeCloseTo(physicalU / physicalV, 6)
    }

    const indices = geometry.getIndex()
    for (
      let index = glassFirstFace * 6;
      index < facadeCount * 6;
      index += 3
    ) {
      const aIndex = indices.getX(index)
      const bIndex = indices.getX(index + 1)
      const cIndex = indices.getX(index + 2)
      const a = new THREE.Vector3().fromBufferAttribute(positions, aIndex)
      const b = new THREE.Vector3().fromBufferAttribute(positions, bIndex)
      const c = new THREE.Vector3().fromBufferAttribute(positions, cIndex)
      const geometricNormal = b.clone().sub(a).cross(c.clone().sub(a)).normalize()
      const averageNormal = new THREE.Vector3()
        .fromBufferAttribute(normals, aIndex)
        .add(new THREE.Vector3().fromBufferAttribute(normals, bIndex))
        .add(new THREE.Vector3().fromBufferAttribute(normals, cIndex))
        .normalize()
      expect(geometricNormal.dot(averageNormal)).toBeGreaterThan(0.999)
    }

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

  it('maps glow primitives to isolated generated emissive atlas quadrants', () => {
    expect(TRACK_GLOW_SURFACE_VARIANTS).toEqual({
      signalLens: 0,
      amberRail: 1,
      ringBand: 2,
      waterShimmer: 3,
    })

    for (const preset of TRACK_PRESETS) {
      const geometry = createCircuitGlowGeometry(
        preset.curve,
        preset.venue,
        preset.roadWidth,
      )
      const uvs = geometry.getAttribute('uv')
      expect(uvs).toBeTruthy()
      const modules = new Set()
      for (let vertex = 0; vertex < uvs.count; vertex += 1) {
        const u = uvs.getX(vertex)
        const v = uvs.getY(vertex)
        expect(Number.isFinite(u)).toBe(true)
        expect(Number.isFinite(v)).toBe(true)
        expect(u).toBeGreaterThanOrEqual(1 / 1024)
        expect(u).toBeLessThanOrEqual(1 - 1 / 1024)
        expect(v).toBeGreaterThanOrEqual(1 / 1024)
        expect(v).toBeLessThanOrEqual(1 - 1 / 1024)
        modules.add(`${Math.floor(u * 2)}:${Math.floor(v * 2)}`)
      }
      expect(modules.size).toBeGreaterThanOrEqual(3)
      geometry.dispose()
    }
  })
})
