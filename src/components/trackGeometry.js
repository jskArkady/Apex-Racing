import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { START_GRID, getStartGridPose } from '../utils/startGrid.js'
import { START_FINISH_PROGRESS, trackLength } from '../utils/trackData.js'

export const ROAD_WIDTH = 16
export const ROAD_SEGMENTS = Math.ceil(trackLength / 3.5)
export const BARRIER_SEGMENTS = Math.ceil(trackLength / 4.25)
export const BARRIER_GRAPHICS_BOTTOM_OFFSET = 0.02
export const BARRIER_GRAPHICS_HEIGHT = 1.32
export const CURB_SEGMENTS = Math.ceil(trackLength / 6)
export const SURFACE_SEGMENTS = Math.ceil(trackLength / 5)
export const LOW_DETAIL_SURFACE_SEGMENTS = Math.ceil(trackLength / 10)
export const ROAD_TOP_OFFSET = 0.08
export const EDGE_LINE_OFFSET = ROAD_WIDTH / 2 - 0.92
export const EDGE_LINE_WIDTH = 0.18
export const SHOULDER_CENTER_OFFSET = ROAD_WIDTH / 2 - 1.45
export const SHOULDER_WIDTH = 0.72
export const CURB_CENTER_OFFSET = ROAD_WIDTH / 2 - 0.38
export const CURB_WIDTH = 0.72
export const CHEVRON_LANE_CENTERS = Object.freeze([-3.5, 3.5])
export const START_GRID_BOX = Object.freeze({
  width: 2.8,
  length: 5.2,
  lineWidth: 0.12,
  level: 0.122,
})
export const START_GANTRY_PROGRESS = START_FINISH_PROGRESS
export const START_LIGHT_LATERALS = Object.freeze([-5, -2.5, 0, 2.5, 5])
export const START_LIGHT_ROW_LEVELS = Object.freeze([6.56, 6.9])
export const BROADCAST_CAMERA_PROGRESS = Object.freeze([0.075, 0.285, 0.515, 0.815])
export const FINISH_LINE_LEVEL = 0.134
export const HARBOUR_TUNNEL_ROOF_CENTER_Y = 6.45
export const HARBOUR_TUNNEL_ROOF_HEIGHT = 0.42
export const HARBOUR_TUNNEL_ROOF_UNDERSIDE = (
  HARBOUR_TUNNEL_ROOF_CENTER_Y - HARBOUR_TUNNEL_ROOF_HEIGHT / 2
)
export const HARBOUR_TUNNEL_START_PROGRESS = 0.43
export const HARBOUR_TUNNEL_END_PROGRESS = 0.562
export const HARBOUR_TUNNEL_MAX_PANEL_SPACING = 6.5
export const HARBOUR_TUNNEL_PANEL_OVERLAP = 1.2
export const HARBOUR_TUNNEL_LIGHT_COUNT = 6
export const HARBOUR_TUNNEL_LIGHT_HEIGHT = 5.55
export const HARBOUR_TUNNEL_LINER_INNER_OFFSET = 0.758
const HARBOUR_TUNNEL_SIDE_WALL_CENTER_OFFSET = 1.02
const HARBOUR_TUNNEL_SIDE_WALL_WIDTH = 0.5
export const HARBOUR_WATER = Object.freeze({
  size: Object.freeze([300, 0.08, 76]),
  position: Object.freeze([20, 0.105, 121]),
})
export const HARBOUR_WATER_SURFACE_Y = (
  HARBOUR_WATER.position[1] + HARBOUR_WATER.size[1] / 2
)
export const HARBOUR_MARINA_LAYOUT = Object.freeze({
  quay: Object.freeze({
    size: Object.freeze([300, 1.1, 0.7]),
    position: Object.freeze([20, 0.55, 82]),
    panelWidth: 6,
  }),
  promenade: Object.freeze({
    minX: -130,
    maxX: 170,
    minZ: 66,
    maxZ: 81.64,
    surfaceY: 0.16,
    rows: 3,
  }),
})
export const HARBOUR_YACHT_LAYOUT = Object.freeze({
  hull: Object.freeze({
    size: Object.freeze([3.2, 0.7, 9.5]),
    centerY: 0.48,
    zOffset: 0,
  }),
  cabin: Object.freeze({
    size: Object.freeze([2.15, 1.35, 4.5]),
    centerY: 1.28,
    zOffset: -0.2,
  }),
  boats: Object.freeze(
    [-112, -82, -48, -12, 24, 61, 98, 132, 162].map((x, index) => (
      Object.freeze({
        x,
        z: 102 + (index % 3) * 13,
        yaw: index % 2 === 0 ? 0.08 : -0.12,
      })
    )),
  ),
})
export const TEMPLE_BANKING_LAYOUT = Object.freeze({
  progress: 0.665,
  supportCenterLateral: 12.5,
  supportCenterY: 3.2,
  supportSize: Object.freeze([1.1, 6.4, 4.6]),
  deckCenterY: 6.35,
  deckExtraWidth: 16,
  deckHeight: 0.8,
  deckLength: 7.2,
  armCenterLateral: 28,
  armCenterY: 13,
  armSize: Object.freeze([29, 0.75, 10]),
  armRoll: 0.48,
  beamCenterY: 6.82,
  beamExtraWidth: 14,
  beamHeight: 0.14,
  beamLength: 7.5,
})
const PIT_STRAIGHT_PROGRESS = 0.02
const PIT_BAYS = Object.freeze([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5])
const PIT_WALL_SCREEN_ALONG = Object.freeze([-26, -19.5, -13, -6.5, 0, 6.5, 13, 19.5, 26])
const BARRIER_POST_COUNT = 48
const FLOODLIGHT_COUNT = 14
export const SURFACE_LEVELS = Object.freeze({
  tyreTrace: 0.094,
  shoulder: 0.096,
  edgeLine: 0.112,
  chevron: 0.116,
  apex: 0.126,
})
// Offset kerbs travel farther around the outside of a corner than the
// centreline and less around the inside. Segment lengths are measured on each
// offset ribbon; this small overlap then hides tangent/chord approximation.
export const CURB_LENGTH_FACTOR = 1.03

const WORLD_UP = new THREE.Vector3(0, 1, 0)
const _point = new THREE.Vector3()
const _tangent = new THREE.Vector3()
const _side = new THREE.Vector3()
const _matrix = new THREE.Matrix4()
const _rotationMatrix = new THREE.Matrix4()
const _quaternion = new THREE.Quaternion()
const _scale = new THREE.Vector3(1, 1, 1)

const COLORS = {
  concrete: '#c7cac3',
  dark: '#171b1b',
  groove: '#0d1111',
  shoulder: '#343a38',
  red: '#d23d43',
  white: '#fff4df',
  lime: '#c7ff36',
  warm: '#ffd58a',
  steel: '#3e4746',
  glass: '#172629',
  seat: '#293231',
  panel: '#101716',
  runoffBlue: '#2d7fd3',
  runoffPink: '#b03f68',
  orange: '#f47b2e',
  water: '#134b68',
  waterGlow: '#41d6ff',
  forest: '#19391f',
  hedge: '#2d5c2f',
  tunnel: '#11181b',
  tunnelRib: '#596462',
  stone: '#d4d0c4',
  crowdBlue: '#55a7ff',
  crowdAmber: '#ffb44a',
  crowdRed: '#f15a55',
  crowdPale: '#d9e2dc',
  signal: '#bfff35',
  cyan: '#41d6ff',
  sand: '#c8b184',
  sandLight: '#ded0ad',
  desertRock: '#806849',
  navy: '#15243a',
  gold: '#d8b45c',
  marina: '#17677d',
  marinaLight: '#42a9bf',
  terracotta: '#b9694e',
  salmon: '#d99a82',
  cream: '#e7dfca',
  apartment: '#c8b99e',
  italianGreen: '#168447',
  runoffGreen: '#2f7c46',
  gravel: '#b9a67c',
  grass: '#376638',
  tifosi: '#d92f39',
}
export const HARBOUR_SWIMMING_POOL_PANELS = Object.freeze([
  Object.freeze({
    size: Object.freeze([8, 0.08, 19]),
    position: Object.freeze([-118, 0.195, 92]),
    color: COLORS.marinaLight,
  }),
  Object.freeze({
    size: Object.freeze([0.6, 0.12, 20]),
    position: Object.freeze([-123, 0.215, 92]),
    color: COLORS.white,
  }),
])
export const HARBOUR_RETAINING_WALL_LAYOUT = Object.freeze({
  progresses: Object.freeze([0.045, 0.085, 0.125, 0.165, 0.205, 0.245]),
  lateralOffsetFromRoad: 4.2,
  capLateralOffsetFromRoad: 3.78,
  centerY: 2.3,
  width: 0.7,
  height: 4.6,
  length: 15,
  capCenterY: 4.52,
  capSize: Object.freeze([0.16, 0.24, 14.5]),
})
export const HARBOUR_BUILDINGS = Object.freeze([
  { progress: 0.08, lateral: 16, height: 22, width: 11, color: COLORS.cream },
  { progress: 0.11, lateral: 38, height: 31, width: 12, color: COLORS.apartment },
  { progress: 0.14, lateral: 32, height: 29, width: 12, color: COLORS.salmon },
  { progress: 0.175, lateral: 18, height: 36, width: 14, color: COLORS.cream },
  { progress: 0.21, lateral: -34, height: 25, width: 10, color: COLORS.apartment },
  { progress: 0.255, lateral: 39, height: 23, width: 11, color: COLORS.salmon },
  { progress: 0.29, lateral: 30, height: 34, width: 13, color: COLORS.cream },
  { progress: 0.36, lateral: -31, height: 20, width: 10, color: COLORS.salmon },
  { progress: 0.405, lateral: 34, height: 28, width: 12, color: COLORS.apartment },
  { progress: 0.61, lateral: -36, height: 24, width: 11, color: COLORS.cream },
  { progress: 0.68, lateral: 38, height: 30, width: 13, color: COLORS.salmon },
  { progress: 0.79, lateral: -39, height: 32, width: 13, color: COLORS.apartment },
  { progress: 0.88, lateral: 32, height: 27, width: 11, color: COLORS.apartment },
  { progress: 0.94, lateral: -41, height: 24, width: 12, color: COLORS.cream },
].map(building => Object.freeze(building)))
const CROWD_PALETTE = Object.freeze([
  COLORS.crowdBlue,
  COLORS.crowdAmber,
  COLORS.crowdRed,
  COLORS.crowdPale,
])
export const GRANDSTAND_LAYOUTS = Object.freeze({
  apex: Object.freeze([
    Object.freeze({
      progress: PIT_STRAIGHT_PROGRESS,
      side: 1,
      tiers: 6,
      length: 66,
      seatStart: 15.5,
      crowdSeats: 7,
      crowdSpacing: 4.1,
    }),
    Object.freeze({
      progress: 0.2,
      side: -1,
      tiers: 5,
      length: 28,
      seatStart: 16,
      crowdSeats: 6,
      crowdSpacing: 2.05,
    }),
    Object.freeze({
      progress: 0.75,
      side: 1,
      tiers: 5,
      length: 28,
      seatStart: 16,
      crowdSeats: 6,
      crowdSpacing: 2.05,
    }),
  ]),
  harbour: Object.freeze([
    Object.freeze({
      progress: 0.72,
      side: 1,
      tiers: 4,
      length: 30,
      seatStart: 15,
      crowdSeats: 7,
      crowdSpacing: 2,
      accent: COLORS.red,
    }),
  ]),
  temple: Object.freeze([
    Object.freeze({
      progress: PIT_STRAIGHT_PROGRESS,
      side: 1,
      tiers: 6,
      length: 64,
      seatStart: 15.5,
      crowdSeats: 9,
      crowdSpacing: 3.2,
      accent: COLORS.italianGreen,
    }),
    Object.freeze({
      progress: 0.2,
      side: -1,
      tiers: 5,
      length: 34,
      seatStart: 17,
      crowdSeats: 8,
      crowdSpacing: 2.1,
      accent: COLORS.red,
    }),
  ]),
})
export const PIT_GARAGE_FACADE_LAYOUTS = Object.freeze({
  apex: Object.freeze({
    progress: PIT_STRAIGHT_PROGRESS,
    lateral: -16.66,
    centerY: 2.55,
    totalWidth: 54,
    height: 4.4,
    panelCount: 3,
    panelGap: 0.25,
  }),
  harbour: Object.freeze({
    progress: 0.985,
    lateral: -12.78,
    centerY: 3.35,
    totalWidth: 31,
    height: 3.8,
    panelCount: 2,
    panelGap: 0.25,
  }),
  temple: Object.freeze({
    progress: PIT_STRAIGHT_PROGRESS,
    lateral: -16.3,
    centerY: 3,
    totalWidth: 54,
    height: 4.4,
    panelCount: 3,
    panelGap: 0.25,
  }),
})
const MEDIA_BRIDGE_PROGRESS = Object.freeze([0.245, 0.585, 0.855])
export const GANTRY_DISPLAY_LAYOUTS = Object.freeze({
  apex: Object.freeze([
    Object.freeze({
      progress: START_GANTRY_PROGRESS,
      centerY: 7.28,
      width: 7.2,
      height: 0.48,
      approachOffset: -0.39,
    }),
    ...MEDIA_BRIDGE_PROGRESS.map(progress => Object.freeze({
      progress,
      centerY: 5.5,
      width: 7.2,
      height: 0.54,
      approachOffset: -0.37,
    })),
  ]),
  harbour: Object.freeze([
    Object.freeze({
      progress: START_GANTRY_PROGRESS,
      centerY: 7.28,
      width: 7.2,
      height: 0.48,
      approachOffset: -0.39,
    }),
  ]),
  temple: Object.freeze([
    Object.freeze({
      progress: START_GANTRY_PROGRESS,
      centerY: 7.28,
      width: 7.2,
      height: 0.48,
      approachOffset: -0.39,
    }),
  ]),
})
const MARSHAL_POST_PROGRESS = Object.freeze([0.12, 0.31, 0.47, 0.66, 0.84])
const GRID_SLOT_LABEL_PATTERNS = Object.freeze({
  ai_1: Object.freeze([-0.48]),
  player: Object.freeze([-0.3, 0.3]),
  ai_2: Object.freeze([-0.48, 0, 0.48]),
  ai_3: Object.freeze([-0.6, -0.2, 0.2, 0.6]),
})

// These markers sit on straights immediately after complex corner groups.
// Keeping the list explicit makes their direction and spacing easy to audit.
export const DIRECTION_MARKER_PROGRESS = Object.freeze([
  0.035,
  0.105,
  0.205,
  0.35,
  0.48,
  0.61,
  0.89,
  0.98,
])

export const MAJOR_CORNER_PROGRESS = Object.freeze([0.168, 0.504, 0.544, 0.59, 0.716, 0.906, 0.952])
export const SECTOR_LANDMARK_PROGRESS = Object.freeze([1 / 3, 2 / 3])
const VENUE_CORNER_PROGRESS = Object.freeze({
  apex: Object.freeze([0.135, 0.255, 0.445, 0.585, 0.705, 0.805, 0.925]),
  harbour: Object.freeze([0.055, 0.234, 0.59, 0.735, 0.905]),
  temple: Object.freeze([0.19, 0.35, 0.475, 0.535, 0.695, 0.91]),
})

function getTrackFrame(curve, progress, point = _point, tangent = _tangent, side = _side) {
  curve.getPointAt(((progress % 1) + 1) % 1, point)
  curve.getTangentAt(((progress % 1) + 1) % 1, tangent).normalize()
  side.crossVectors(WORLD_UP, tangent)
  if (side.lengthSq() < 1e-8) side.set(1, 0, 0)
  side.normalize()
  return { point, tangent, side }
}

function buildSweptBox(curve, { samples, lateralOffset, width, height, bottomOffset }) {
  // Reuse the first cross-section for the closing segment. A duplicated final
  // ring is visually identical, but leaves coincident, disconnected boundary
  // edges in the Rapier trimesh exactly on the start/finish line.
  const ringCount = samples
  const positions = new Float32Array(ringCount * 4 * 3)
  const uvs = new Float32Array(ringCount * 4 * 2)
  const indices = []
  const halfWidth = width / 2
  const point = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const side = new THREE.Vector3()

  for (let i = 0; i < ringCount; i += 1) {
    getTrackFrame(curve, i / samples, point, tangent, side)
    const center = point.clone().addScaledVector(side, lateralOffset)
    const ring = [
      center.clone().addScaledVector(side, -halfWidth).addScaledVector(WORLD_UP, bottomOffset + height),
      center.clone().addScaledVector(side, halfWidth).addScaledVector(WORLD_UP, bottomOffset + height),
      center.clone().addScaledVector(side, -halfWidth).addScaledVector(WORLD_UP, bottomOffset),
      center.clone().addScaledVector(side, halfWidth).addScaledVector(WORLD_UP, bottomOffset),
    ]

    for (let j = 0; j < 4; j += 1) {
      const vertexOffset = (i * 4 + j) * 3
      positions[vertexOffset] = ring[j].x
      positions[vertexOffset + 1] = ring[j].y
      positions[vertexOffset + 2] = ring[j].z
      const uvOffset = (i * 4 + j) * 2
      uvs[uvOffset] = j % 2
      uvs[uvOffset + 1] = i / samples
    }
  }

  for (let i = 0; i < samples; i += 1) {
    const a = i * 4
    const b = ((i + 1) % ringCount) * 4
    indices.push(
      a, b, a + 1, a + 1, b, b + 1,
      a + 2, a + 3, b + 2, a + 3, b + 3, b + 2,
      a, a + 2, b, a + 2, b + 2, b,
      a + 1, b + 1, a + 3, a + 3, b + 1, b + 3,
    )
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function buildSweptSurface(curve, { samples, lateralOffset, width, yOffset }) {
  // The physics road is an open top surface. Reusing the first cross-section
  // for the closing segment keeps the start/finish seam connected without
  // exposing vertical side faces to the contact solver.
  const ringCount = samples
  const positions = new Float32Array(ringCount * 2 * 3)
  const indices = new Uint32Array(samples * 6)
  const halfWidth = width / 2
  const point = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const side = new THREE.Vector3()

  for (let i = 0; i < ringCount; i += 1) {
    getTrackFrame(curve, i / samples, point, tangent, side)
    const center = point.clone()
      .addScaledVector(side, lateralOffset)
      .addScaledVector(WORLD_UP, yOffset)
    const left = center.clone().addScaledVector(side, -halfWidth)
    const right = center.clone().addScaledVector(side, halfWidth)
    const vertexOffset = i * 6
    positions[vertexOffset] = left.x
    positions[vertexOffset + 1] = left.y
    positions[vertexOffset + 2] = left.z
    positions[vertexOffset + 3] = right.x
    positions[vertexOffset + 4] = right.y
    positions[vertexOffset + 5] = right.z
  }

  for (let i = 0; i < samples; i += 1) {
    const indexOffset = i * 6
    const current = i * 2
    const next = ((i + 1) % ringCount) * 2
    indices[indexOffset] = current
    indices[indexOffset + 1] = next
    indices[indexOffset + 2] = current + 1
    indices[indexOffset + 3] = current + 1
    indices[indexOffset + 4] = next
    indices[indexOffset + 5] = next + 1
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function createRoadGeometry(curve, samples = ROAD_SEGMENTS, roadWidth = ROAD_WIDTH) {
  // The profile remains explicit so the physical road always has real width
  // and thickness instead of relying on a zero-area extruded line.
  const profile = new THREE.Shape()
  profile.moveTo(-roadWidth / 2, ROAD_TOP_OFFSET)
  profile.lineTo(roadWidth / 2, ROAD_TOP_OFFSET)
  profile.lineTo(roadWidth / 2, -0.52)
  profile.lineTo(-roadWidth / 2, -0.52)
  profile.closePath()
  const bounds = new THREE.Box2().setFromPoints(profile.getPoints())

  return buildSweptBox(curve, {
    samples,
    lateralOffset: 0,
    width: bounds.max.x - bounds.min.x,
    height: bounds.max.y - bounds.min.y,
    bottomOffset: bounds.min.y,
  })
}

export function createRoadColliderGeometry(
  curve,
  samples = ROAD_SEGMENTS,
  roadWidth = ROAD_WIDTH,
) {
  return buildSweptSurface(curve, {
    samples,
    lateralOffset: 0,
    width: roadWidth,
    yOffset: ROAD_TOP_OFFSET,
  })
}

export function createBarrierGeometry(curve, samples = BARRIER_SEGMENTS, roadWidth = ROAD_WIDTH) {
  const profile = new THREE.Shape()
  profile.moveTo(-0.25, -0.1)
  profile.lineTo(0.25, -0.1)
  profile.lineTo(0.25, 1.35)
  profile.lineTo(-0.25, 1.35)
  profile.closePath()
  const bounds = new THREE.Box2().setFromPoints(profile.getPoints())
  const offset = roadWidth / 2 + (bounds.max.x - bounds.min.x) / 2
  const options = {
    samples,
    width: bounds.max.x - bounds.min.x,
    height: bounds.max.y - bounds.min.y,
    bottomOffset: bounds.min.y,
  }
  const left = buildSweptBox(curve, { ...options, lateralOffset: -offset })
  const right = buildSweptBox(curve, { ...options, lateralOffset: offset })
  const geometry = mergeGeometries([left, right])
  left.dispose()
  right.dispose()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function createBarrierGraphicsGeometry(
  curve,
  samples = BARRIER_SEGMENTS,
  roadWidth = ROAD_WIDTH,
) {
  if (!curve || typeof curve.getLength !== 'function') {
    throw new TypeError('Barrier graphics require a finite track curve')
  }
  if (!Number.isInteger(samples) || samples < 3) {
    throw new RangeError('Barrier graphics require at least three samples')
  }
  if (!Number.isFinite(roadWidth) || roadWidth <= 4) {
    throw new RangeError('Barrier graphics require a usable road width')
  }

  const length = curve.getLength()
  if (!Number.isFinite(length) || length <= 0) {
    throw new RangeError('Barrier graphics require a positive track length')
  }

  const panelCount = samples
  const faceInset = 0.008
  const atlasInset = 1 / 1024
  const parts = []

  for (let panelIndex = 0; panelIndex < panelCount; panelIndex += 1) {
    const startProgress = panelIndex / panelCount
    const endProgress = (panelIndex + 1) / panelCount
    for (const sideSign of [-1, 1]) {
      const start = new THREE.Vector3()
      const startTangent = new THREE.Vector3()
      const startSide = new THREE.Vector3()
      const end = new THREE.Vector3()
      const endTangent = new THREE.Vector3()
      const endSide = new THREE.Vector3()
      getTrackFrame(curve, startProgress, start, startTangent, startSide)
      getTrackFrame(curve, endProgress, end, endTangent, endSide)
      const lateral = sideSign * (roadWidth / 2 - faceInset)
      start.addScaledVector(startSide, lateral)
      end.addScaledVector(endSide, lateral)

      const startBottom = start.clone().addScaledVector(
        WORLD_UP,
        BARRIER_GRAPHICS_BOTTOM_OFFSET,
      )
      const endBottom = end.clone().addScaledVector(
        WORLD_UP,
        BARRIER_GRAPHICS_BOTTOM_OFFSET,
      )
      const startTop = startBottom.clone().addScaledVector(
        WORLD_UP,
        BARRIER_GRAPHICS_HEIGHT,
      )
      const endTop = endBottom.clone().addScaledVector(
        WORLD_UP,
        BARRIER_GRAPHICS_HEIGHT,
      )
      // Reversing the horizontal order on the left wall keeps both faces
      // pointed toward the racing line. Endpoints are shared exactly with the
      // next panel, preventing gaps on the outside of tight corners.
      const [topLeft, topRight, bottomLeft, bottomRight] = sideSign > 0
        ? [startTop, endTop, startBottom, endBottom]
        : [endTop, startTop, endBottom, startBottom]
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([
        topLeft.x, topLeft.y, topLeft.z,
        topRight.x, topRight.y, topRight.z,
        bottomLeft.x, bottomLeft.y, bottomLeft.z,
        bottomRight.x, bottomRight.y, bottomRight.z,
      ], 3))
      geometry.setIndex([0, 2, 1, 2, 3, 1])

      // Alternate both atlas halves and phase-shift the opposite wall so a
      // chase camera never sees a mechanically mirrored pair.
      const variant = (panelIndex + (sideSign > 0 ? 0 : 1)) % 2
      const moduleMin = variant * 0.5 + atlasInset
      const moduleMax = (variant + 1) * 0.5 - atlasInset
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
        moduleMin, 1 - atlasInset,
        moduleMax, 1 - atlasInset,
        moduleMin, atlasInset,
        moduleMax, atlasInset,
      ], 2))
      geometry.computeVertexNormals()
      parts.push(geometry)
    }
  }

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

function addVertexColor(geometry, color) {
  const rgb = new THREE.Color(color)
  const count = geometry.getAttribute('position').count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = rgb.r
    colors[i * 3 + 1] = rgb.g
    colors[i * 3 + 2] = rgb.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function pushBox(parts, size, position, quaternion, color) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2])
  _matrix.compose(position, quaternion, _scale)
  geometry.applyMatrix4(_matrix)
  addVertexColor(geometry, color)
  parts.push(geometry)
}

function pushWorldBox(parts, size, position, color, yaw = 0) {
  const quaternion = new THREE.Quaternion().setFromAxisAngle(WORLD_UP, yaw)
  pushBox(parts, size, new THREE.Vector3(...position), quaternion, color)
}

function pushWorldCylinder(parts, radius, height, position, color, segments = 8) {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, segments)
  _matrix.compose(new THREE.Vector3(...position), new THREE.Quaternion(), _scale)
  geometry.applyMatrix4(_matrix)
  addVertexColor(geometry, color)
  parts.push(geometry)
}

function pushTrackBox(parts, curve, progress, lateral, y, size, color, along = 0) {
  const point = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const side = new THREE.Vector3()
  getTrackFrame(curve, progress, point, tangent, side)
  point.addScaledVector(side, lateral).addScaledVector(tangent, along)
  point.y += y
  _rotationMatrix.makeBasis(side, WORLD_UP, tangent)
  _quaternion.setFromRotationMatrix(_rotationMatrix)
  pushBox(parts, size, point, _quaternion, color)
}

function pushTrackBoxYaw(parts, curve, progress, lateral, y, size, color, along, yaw) {
  const point = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const side = new THREE.Vector3()
  const rotatedSide = new THREE.Vector3()
  const rotatedForward = new THREE.Vector3()
  getTrackFrame(curve, progress, point, tangent, side)
  point.addScaledVector(side, lateral).addScaledVector(tangent, along)
  point.y += y

  const cosine = Math.cos(yaw)
  const sine = Math.sin(yaw)
  rotatedSide.copy(side).multiplyScalar(cosine).addScaledVector(tangent, sine)
  rotatedForward.copy(tangent).multiplyScalar(cosine).addScaledVector(side, -sine)
  _rotationMatrix.makeBasis(rotatedSide, WORLD_UP, rotatedForward)
  _quaternion.setFromRotationMatrix(_rotationMatrix)
  pushBox(parts, size, point, _quaternion, color)
}

function pushTrackPrimitive(parts, curve, progress, lateral, y, geometry, color, along = 0, localRotation) {
  const point = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const side = new THREE.Vector3()
  getTrackFrame(curve, progress, point, tangent, side)
  point.addScaledVector(side, lateral).addScaledVector(tangent, along)
  point.y += y
  _rotationMatrix.makeBasis(side, WORLD_UP, tangent)
  _quaternion.setFromRotationMatrix(_rotationMatrix)
  if (localRotation) _quaternion.multiply(localRotation)
  _matrix.compose(point, _quaternion, _scale)
  geometry.applyMatrix4(_matrix)
  addVertexColor(geometry, color)
  parts.push(geometry)
}

function pushTrackCylinder(parts, curve, progress, lateral, y, radius, height, color, along = 0, segments = 10) {
  pushTrackPrimitive(
    parts,
    curve,
    progress,
    lateral,
    y,
    new THREE.CylinderGeometry(radius, radius, height, segments),
    color,
    along,
  )
}

function pushTrackCone(parts, curve, progress, lateral, y, radius, height, color, along = 0, segments = 10) {
  pushTrackPrimitive(
    parts,
    curve,
    progress,
    lateral,
    y,
    new THREE.ConeGeometry(radius, height, segments),
    color,
    along,
  )
}

function pushTrackBoxBanked(parts, curve, progress, lateral, y, size, color, along, roll) {
  const localRotation = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    roll,
  )
  pushTrackPrimitive(
    parts,
    curve,
    progress,
    lateral,
    y,
    new THREE.BoxGeometry(...size),
    color,
    along,
    localRotation,
  )
}

function buildSurfaceRibbon(curve, {
  samples = SURFACE_SEGMENTS,
  lateralOffset = 0,
  width,
  yOffset = SURFACE_LEVELS.edgeLine,
  color,
  offsetAt = () => 0,
}) {
  const positions = new Float32Array((samples + 1) * 2 * 3)
  const normals = new Float32Array((samples + 1) * 2 * 3)
  const uvs = new Float32Array((samples + 1) * 2 * 2)
  const indices = new Uint32Array(samples * 6)
  const point = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const side = new THREE.Vector3()
  const surfaceNormal = new THREE.Vector3()

  for (let i = 0; i <= samples; i += 1) {
    const progress = i / samples
    getTrackFrame(curve, progress, point, tangent, side)
    const center = point.clone()
      .addScaledVector(side, lateralOffset + offsetAt(progress))
      .addScaledVector(WORLD_UP, yOffset)
    surfaceNormal.crossVectors(tangent, side).normalize()

    for (let edge = 0; edge < 2; edge += 1) {
      const vertex = center.clone().addScaledVector(side, (edge - 0.5) * width)
      const positionOffset = (i * 2 + edge) * 3
      positions[positionOffset] = vertex.x
      positions[positionOffset + 1] = vertex.y
      positions[positionOffset + 2] = vertex.z
      normals[positionOffset] = surfaceNormal.x
      normals[positionOffset + 1] = surfaceNormal.y
      normals[positionOffset + 2] = surfaceNormal.z

      const uvOffset = (i * 2 + edge) * 2
      uvs[uvOffset] = edge
      uvs[uvOffset + 1] = progress
    }
  }

  for (let i = 0; i < samples; i += 1) {
    const indexOffset = i * 6
    const current = i * 2
    const next = current + 2
    indices[indexOffset] = current
    indices[indexOffset + 1] = next
    indices[indexOffset + 2] = current + 1
    indices[indexOffset + 3] = current + 1
    indices[indexOffset + 4] = next
    indices[indexOffset + 5] = next + 1
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  return addVertexColor(geometry, color)
}

function getTurnSide(curve, progress) {
  const before = curve.getTangentAt(((progress - 0.008) % 1 + 1) % 1).normalize()
  const after = curve.getTangentAt((progress + 0.008) % 1).normalize()
  const turn = new THREE.Vector3().crossVectors(before, after).y
  return turn === 0 ? 1 : Math.sign(turn)
}

function getOffsetTrackPoint(curve, progress, lateralOffset, target) {
  const tangent = new THREE.Vector3()
  const side = new THREE.Vector3()
  getTrackFrame(curve, progress, target, tangent, side)
  return target.addScaledVector(side, lateralOffset)
}

export function getCurbSegmentLength(curve, segmentIndex, lateralOffset) {
  const centerProgress = (segmentIndex + 0.5) / CURB_SEGMENTS
  const previous = getOffsetTrackPoint(
    curve,
    centerProgress - 1 / CURB_SEGMENTS,
    lateralOffset,
    new THREE.Vector3(),
  )
  const center = getOffsetTrackPoint(curve, centerProgress, lateralOffset, new THREE.Vector3())
  const next = getOffsetTrackPoint(
    curve,
    centerProgress + 1 / CURB_SEGMENTS,
    lateralOffset,
    new THREE.Vector3(),
  )

  return Math.max(previous.distanceTo(center), center.distanceTo(next)) * CURB_LENGTH_FACTOR
}

function addSurfaceGuides(parts, curve, roadWidth = ROAD_WIDTH) {
  const shoulderCenterOffset = roadWidth / 2 - 1.45
  const edgeLineOffset = roadWidth / 2 - 0.92
  // A broad, low-contrast shoulder on each side makes the full driving width
  // legible. The bright edge lines then define the limit, not a centre lane.
  for (const lateralOffset of [-shoulderCenterOffset, shoulderCenterOffset]) {
    parts.push(buildSurfaceRibbon(curve, {
      samples: LOW_DETAIL_SURFACE_SEGMENTS,
      lateralOffset,
      width: SHOULDER_WIDTH,
      yOffset: SURFACE_LEVELS.shoulder,
      color: COLORS.shoulder,
    }))
  }

  // Thin continuous paint reads more cleanly than hundreds of separate boxes
  // and remains a single draw call after the final geometry merge.
  for (const lateralOffset of [-edgeLineOffset, edgeLineOffset]) {
    parts.push(buildSurfaceRibbon(curve, {
      lateralOffset,
      width: EDGE_LINE_WIDTH,
      color: COLORS.white,
    }))
  }

  // Twin tyre traces imply use across the road without creating a false
  // centre-line that could make normal lateral movement look off-course.
  for (const lateralOffset of [-1.45, 1.45]) {
    parts.push(buildSurfaceRibbon(curve, {
      samples: LOW_DETAIL_SURFACE_SEGMENTS,
      lateralOffset,
      width: 0.42,
      yOffset: SURFACE_LEVELS.tyreTrace,
      color: COLORS.groove,
      offsetAt: progress => Math.sin(progress * Math.PI * 10) * 0.24,
    }))
  }
}

function addCornerReadability(parts, curve, venue, roadWidth = ROAD_WIDTH) {
  const cornerProgress = VENUE_CORNER_PROGRESS[venue] ?? MAJOR_CORNER_PROGRESS
  for (const progress of cornerProgress) {
    const turnSide = getTurnSide(curve, progress)
    const inside = turnSide * (roadWidth / 2 - 1.28)
    const outside = -turnSide * (roadWidth / 2 + 2.05)

    // Real F1 circuits use painted kerb blocks rather than directional neon.
    for (let tick = -2; tick <= 2; tick += 1) {
      pushTrackBox(
        parts,
        curve,
        progress + tick * 0.00065,
        inside,
        SURFACE_LEVELS.apex,
        [1.25, 0.035, 0.42],
        tick % 2 === 0 ? COLORS.red : COLORS.white,
      )
    }

    const runoffColor = venue === 'apex'
      ? COLORS.sandLight
      : venue === 'temple' ? COLORS.gravel : null
    const isNouvelleChicane = venue === 'harbour' && Math.abs(progress - 0.59) < 0.03
    for (let stripe = -6; stripe <= 6 && (runoffColor || isNouvelleChicane); stripe += 1) {
      pushTrackBox(
        parts,
        curve,
        progress + stripe * 0.001,
        outside,
        0.035,
        [venue === 'temple' ? 5.2 : 4.1, 0.07, 0.92],
        isNouvelleChicane
          ? (stripe % 2 === 0 ? COLORS.red : COLORS.white)
          : runoffColor,
      )
    }

    if (venue === 'apex' || venue === 'temple') {
      pushTrackBox(
        parts,
        curve,
        progress,
        outside + turnSide * 2.15,
        0.085,
        [0.65, 0.04, 12],
        venue === 'temple' ? COLORS.italianGreen : COLORS.runoffGreen,
      )
    }

    // Paired rubber marks tell the driver where heavy braking begins.
    for (const lateral of [-0.78, 0.78]) {
      pushTrackBox(parts, curve, progress - 0.018, lateral, 0.114, [0.34, 0.022, 8], COLORS.groove)
    }
  }
}

function addCircuitLandmarks(parts, curve, venue, roadWidth = ROAD_WIDTH) {
  const venueAccent = venue === 'temple'
    ? COLORS.italianGreen
    : venue === 'harbour' ? COLORS.red : COLORS.gold
  // Start/finish gantry: a high-contrast anchor visible from the final corner.
  for (const lateral of [-roadWidth / 2 - 1.35, roadWidth / 2 + 1.35]) {
    pushTrackBox(parts, curve, START_GANTRY_PROGRESS, lateral, 3.7, [0.48, 7.4, 0.48], COLORS.steel)
  }
  pushTrackBox(parts, curve, START_GANTRY_PROGRESS, 0, 7.15, [roadWidth + 3.2, 0.8, 0.72], COLORS.dark)
  pushTrackBox(parts, curve, START_GANTRY_PROGRESS, 0, 7.18, [7.2, 0.22, 0.78], venueAccent)
  // Five light columns in two rows read as a real F1 start gantry rather than
  // generic floodlights. They stay inside the existing merged scenery draw.
  for (const lateral of START_LIGHT_LATERALS) {
    for (const rowLevel of START_LIGHT_ROW_LEVELS) {
      pushTrackBox(parts, curve, START_GANTRY_PROGRESS, lateral, rowLevel, [0.68, 0.22, 0.78], COLORS.red)
    }
  }

  if (venue === 'temple') {
    for (const [index, color] of [COLORS.italianGreen, COLORS.white, COLORS.red].entries()) {
      pushTrackBox(parts, curve, START_GANTRY_PROGRESS, -2.6 + index * 2.6, 7.48, [2.35, 0.18, 0.78], color)
    }
  }

  if (venue !== 'apex') return

  // Sakhir's timing structures are concentrated around the pit complex.
  pushTrackBox(parts, curve, 0.35, roadWidth / 2 + 15, 5.1, [5.8, 10.2, 4.4], COLORS.dark)
  pushTrackBox(parts, curve, 0.35, roadWidth / 2 + 12.75, 5.4, [0.34, 7.8, 3.4], COLORS.glass)
  for (let floor = 0; floor < 4; floor += 1) {
    pushTrackBox(parts, curve, 0.35, roadWidth / 2 + 12.52, 2.25 + floor * 1.75, [0.16, 0.12, 3], COLORS.gold)
  }

  pushTrackBox(parts, curve, 0.69, -roadWidth / 2 - 17, 8.5, [0.3, 17, 0.3], COLORS.steel)
  pushTrackBox(parts, curve, 0.69, -roadWidth / 2 - 17, 17.2, [4.2, 0.25, 0.25], COLORS.warm)
  pushTrackBox(parts, curve, 0.69, -roadWidth / 2 - 17, 13.5, [2.5, 0.18, 0.18], COLORS.gold)
}

function addNightVenueDetails(parts, curve, roadWidth = ROAD_WIDTH) {
  // Repeated media bridges and marshal posts establish a believable FIA-grade
  // venue rhythm without relying on copyrighted sponsor textures.
  for (const progress of MEDIA_BRIDGE_PROGRESS) {
    for (const lateral of [-roadWidth / 2 - 1.15, roadWidth / 2 + 1.15]) {
      pushTrackBox(parts, curve, progress, lateral, 2.8, [0.34, 5.6, 0.34], COLORS.steel)
    }
    pushTrackBox(parts, curve, progress, 0, 5.5, [roadWidth + 2.8, 0.72, 0.68], COLORS.dark)
    pushTrackBox(parts, curve, progress, 0, 5.52, [7.2, 0.16, 0.72], COLORS.gold)
  }

  for (const [index, progress] of MARSHAL_POST_PROGRESS.entries()) {
    const side = index % 2 === 0 ? -1 : 1
    const lateral = side * (roadWidth / 2 + 3.15)
    pushTrackBox(parts, curve, progress, lateral, 1.15, [2.1, 2.3, 1.8], COLORS.dark)
    pushTrackBox(parts, curve, progress, lateral, 2.42, [2.35, 0.25, 2.05], COLORS.red)
    pushTrackBox(parts, curve, progress, lateral - side * 0.05, 1.2, [2.16, 0.18, 1.1], COLORS.glass)
  }

}

function addBroadcastCameras(parts, curve, roadWidth = ROAD_WIDTH) {
  // Elevated TV cameras and crane arms are visible in real F1 broadcasts and
  // give the street circuit a stronger event-production silhouette.
  for (const [index, progress] of BROADCAST_CAMERA_PROGRESS.entries()) {
    const side = index % 2 === 0 ? 1 : -1
    const lateral = side * (roadWidth / 2 + 6.2)
    pushTrackBox(parts, curve, progress, lateral, 2.2, [0.18, 4.4, 0.18], COLORS.steel)
    pushTrackBox(parts, curve, progress, lateral - side * 0.7, 4.35, [1.55, 0.16, 0.16], COLORS.steel)
    pushTrackBox(parts, curve, progress, lateral - side * 1.4, 4.28, [0.48, 0.28, 0.42], COLORS.panel)
    pushTrackBox(parts, curve, progress, lateral - side * 1.68, 4.26, [0.18, 0.18, 0.22], COLORS.glass)
    pushTrackBox(parts, curve, progress, lateral + side * 0.28, 0.86, [1.28, 1.72, 1.16], COLORS.dark)
  }
}

function addKerbs(parts, curve, venue, roadWidth = ROAD_WIDTH) {
  // Alternating red/white kerbs establish a readable boundary at speed.
  for (let i = 0; i < CURB_SEGMENTS; i += 1) {
    const palette = venue === 'temple'
      ? [COLORS.red, COLORS.white, COLORS.italianGreen]
      : [COLORS.red, COLORS.white]
    const color = palette[Math.floor(i / 2) % palette.length]
    const progress = (i + 0.5) / CURB_SEGMENTS
    const curbCenterOffset = roadWidth / 2 - 0.38
    const leftLateral = -curbCenterOffset
    const rightLateral = curbCenterOffset
    pushTrackBox(
      parts,
      curve,
      progress,
      leftLateral,
      0.12,
      [CURB_WIDTH, 0.13, getCurbSegmentLength(curve, i, leftLateral)],
      color,
    )
    pushTrackBox(
      parts,
      curve,
      progress,
      rightLateral,
      0.12,
      [CURB_WIDTH, 0.13, getCurbSegmentLength(curve, i, rightLateral)],
      color,
    )
  }
}

function addFinishStripe(parts, curve, roadWidth = ROAD_WIDTH) {
  const gridColumns = 16
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < gridColumns; column += 1) {
      const lateral = -roadWidth / 2 + (column + 0.5) * (roadWidth / gridColumns)
      const color = (row + column) % 2 === 0 ? COLORS.white : COLORS.dark
      pushTrackBox(parts, curve, START_FINISH_PROGRESS, lateral, FINISH_LINE_LEVEL, [roadWidth / gridColumns, 0.025, 0.8], color, row * 0.8 - 0.4)
    }
  }
}

function addStartGridMarkings(parts, curve) {
  // Paint the exact shared physics grid instead of maintaining a second set
  // of approximate world-space boxes. The player's slot gets one lime edge,
  // enough to orient the chase camera without adding road clutter.
  const gridTrackLength = curve.getLength()
  const halfGridWidth = START_GRID_BOX.width / 2
  const halfGridLength = START_GRID_BOX.length / 2
  for (const racerId of Object.keys(START_GRID.single)) {
    const pose = getStartGridPose(racerId, 'single', curve, gridTrackLength)
    const frontColor = racerId === 'player' ? COLORS.lime : COLORS.white
    for (const along of [-halfGridLength, halfGridLength]) {
      pushTrackBox(
        parts,
        curve,
        pose.progress,
        pose.lateralOffset,
        START_GRID_BOX.level,
        [START_GRID_BOX.width, 0.025, START_GRID_BOX.lineWidth],
        along === halfGridLength ? frontColor : COLORS.white,
        along,
      )
    }
    for (const side of [-1, 1]) {
      pushTrackBox(
        parts,
        curve,
        pose.progress,
        pose.lateralOffset + side * halfGridWidth,
        START_GRID_BOX.level,
        [START_GRID_BOX.lineWidth, 0.025, START_GRID_BOX.length],
        COLORS.white,
      )
    }
    for (const mark of GRID_SLOT_LABEL_PATTERNS[racerId] ?? []) {
      pushTrackBox(
        parts,
        curve,
        pose.progress,
        pose.lateralOffset + mark,
        START_GRID_BOX.level + 0.008,
        [0.16, 0.024, 0.78],
        racerId === 'player' ? COLORS.lime : COLORS.warm,
        -0.82,
      )
    }
  }
}

function addPitStraightRunoff(parts, curve, roadWidth = ROAD_WIDTH) {
  // Sakhir uses pale sand-coloured aprons with sparse green painted limits.
  for (const sideSign of [-1, 1]) {
    const base = sideSign * (roadWidth / 2 + 1.65)
    const palette = [COLORS.sandLight, COLORS.sand, COLORS.runoffGreen]
    palette.forEach((color, index) => {
      pushTrackBox(
        parts,
        curve,
        PIT_STRAIGHT_PROGRESS,
        base + sideSign * index * 1.02,
        0.055,
        [0.9, 0.055, 75],
        color,
      )
    })
  }
}

function addBrakingBoards(parts, curve, venue, roadWidth = ROAD_WIDTH) {
  for (const corner of VENUE_CORNER_PROGRESS[venue] ?? MAJOR_CORNER_PROGRESS) {
    for (let marker = 0; marker < 3; marker += 1) {
      const progress = corner - marker * 0.012
      const lateral = roadWidth / 2 + 2.15
      pushTrackBox(parts, curve, progress, lateral, 0.75, [0.12, 1.5, 0.12], COLORS.steel)
      pushTrackBox(parts, curve, progress, lateral, 1.65, [1.25, 1.1, 0.14], COLORS.white)
      pushTrackBox(parts, curve, progress, lateral, 1.65, [0.18 + marker * 0.14, 0.18, 0.16], COLORS.red)
    }
  }
}

function addTracksideInfrastructure(parts, curve, venue, roadWidth = ROAD_WIDTH) {
  for (let i = 0; i < BARRIER_POST_COUNT; i += 1) {
    const progress = i / BARRIER_POST_COUNT
    pushTrackBox(parts, curve, progress, -roadWidth / 2 - 0.45, 0.58, [0.16, 1.25, 0.16], COLORS.steel)
    pushTrackBox(parts, curve, progress, roadWidth / 2 + 0.45, 0.58, [0.16, 1.25, 0.16], COLORS.steel)
  }
  if (venue !== 'apex') return
  for (let i = 0; i < FLOODLIGHT_COUNT; i += 1) {
    const progress = i / FLOODLIGHT_COUNT + 0.018
    const lateral = (i % 2 === 0 ? -1 : 1) * (roadWidth / 2 + 3.5)
    pushTrackBox(parts, curve, progress, lateral, 3.7, [0.2, 7.4, 0.2], COLORS.steel)
    pushTrackBox(parts, curve, progress, lateral, 7.25, [3.1, 2.0, 0.18], COLORS.dark)
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        pushTrackBox(
          parts,
          curve,
          progress,
          lateral - 1.12 + column * 0.56,
          6.62 + row * 0.62,
          [0.38, 0.38, 0.22],
          COLORS.warm,
        )
      }
    }
  }
}

function addPitComplex(parts, curve) {
  pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -9.4, 0.55, [0.28, 1.1, 74], COLORS.concrete)
  pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -9.2, 1.08, [0.16, 0.12, 74], COLORS.red)
  pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -18, 0.12, [8.5, 0.18, 72], COLORS.concrete)
  pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -23, 3.1, [10, 6.2, 58], COLORS.dark)
  pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -17.7, 3.3, [0.8, 5.6, 57], COLORS.glass)
  pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -17.2, 5.65, [2.6, 0.28, 58], COLORS.gold)
  pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -23, 6.35, [11, 0.35, 60], COLORS.steel)
  for (const bay of PIT_BAYS) {
    pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -17.15, 1.45, [0.85, 2.5, 4.1], COLORS.dark, bay * 4.8)
    pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -17.08, 2.65, [0.16, 0.18, 4.1], bay % 2 === 0 ? COLORS.red : COLORS.concrete, bay * 4.8)
    pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -13.2, 0.16, [1.8, 0.055, 3.1], bay % 2 === 0 ? COLORS.sandLight : COLORS.navy, bay * 4.8)
  }
  for (let screen = -4; screen <= 4; screen += 2) {
    pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -8.95, 1.55, [0.14, 0.7, 1.8], COLORS.panel, screen * 5.2)
    pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -8.86, 1.58, [0.08, 0.42, 1.4], screen % 4 === 0 ? COLORS.gold : COLORS.warm, screen * 5.2)
  }
  for (const [index, along] of PIT_WALL_SCREEN_ALONG.entries()) {
    pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -8.72, 0.85, [0.16, 1.08, 1.85], COLORS.panel, along)
    pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -8.62, 1.08, [0.08, 0.46, 1.34], index % 3 === 0 ? COLORS.navy : COLORS.gold, along)
  }
}

function addPitLaneLife(parts, curve) {
  // Small silhouettes and equipment make the pit lane read like an active GP
  // venue while remaining far outside the drivable surface and non-colliding.
  for (const bay of PIT_BAYS.filter(bay => bay % 2 === 0)) {
    const along = bay * 4.8
    for (const offset of [-0.42, 0.42]) {
      pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -11.8 + offset, 0.58, [0.24, 1.05, 0.22], COLORS.dark, along)
      pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -11.8 + offset, 1.18, [0.28, 0.22, 0.28], bay % 4 === 0 ? COLORS.lime : COLORS.red, along)
    }
    pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -12.65, 0.38, [0.55, 0.55, 0.9], COLORS.panel, along + 0.6)
    pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -12.62, 0.72, [0.36, 0.2, 0.7], COLORS.warm, along + 0.6)
  }

  for (const along of [-21, 18]) {
    pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, 10.4, 2.35, [0.18, 4.7, 0.18], COLORS.steel, along)
    pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, 10.1, 4.62, [0.18, 0.18, 1.5], COLORS.steel, along)
    pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, 9.8, 4.5, [0.42, 0.3, 0.48], COLORS.panel, along)
  }
}

function addGrandstand(parts, curve, {
  progress,
  side,
  tiers,
  length,
  seatStart,
  crowdSeats,
  crowdSpacing,
  accent = COLORS.gold,
}) {
  for (let tier = 0; tier < tiers; tier += 1) {
    pushTrackBox(
      parts,
      curve,
      progress,
      side * (seatStart + tier * 1.18),
      0.55 + tier * 0.62,
      [2.5, 0.9 + tier * 0.35, length],
      tier % 2 === 0 ? COLORS.seat : COLORS.steel,
    )
  }
  pushTrackBox(parts, curve, progress, side * (seatStart + tiers * 1.22 + 0.5), 6.15, [11.5, 0.32, length + 2], COLORS.concrete)
  pushTrackBox(parts, curve, progress, side * (seatStart + tiers * 1.22 + 0.5), 5.82, [11.7, 0.18, length + 2.2], accent)
  for (let rib = -2; rib <= 2; rib += 1) {
    pushTrackBox(
      parts,
      curve,
      progress,
      side * (seatStart + tiers * 1.22 + 0.45),
      6.36,
      [10.8, 0.14, 0.16],
      COLORS.steel,
      rib * (length / 5),
    )
  }
  for (let tier = 0; tier < tiers; tier += 1) {
    for (let seat = -crowdSeats; seat <= crowdSeats; seat += 1) {
      pushTrackBox(
        parts,
        curve,
        progress,
        side * (seatStart - 1.1 + tier * 1.16),
        1.05 + tier * 0.72,
        [0.24, 0.34, crowdSpacing * 0.55],
        CROWD_PALETTE[(seat + tier + 12) % CROWD_PALETTE.length],
        seat * crowdSpacing,
      )
    }
  }
}

function addGrandstands(parts, curve, venue = 'apex') {
  for (const layout of GRANDSTAND_LAYOUTS[venue] ?? GRANDSTAND_LAYOUTS.apex) {
    addGrandstand(parts, curve, layout)
  }
}

export function createCrowdPanelGeometry(curve, venue = 'apex') {
  const parts = []
  const layouts = GRANDSTAND_LAYOUTS[venue] ?? GRANDSTAND_LAYOUTS.apex

  for (const {
    progress,
    side: sideSign,
    tiers,
    length,
    seatStart,
    crowdSeats,
    crowdSpacing,
  } of layouts) {
    const point = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const side = new THREE.Vector3()
    getTrackFrame(curve, progress, point, tangent, side)

    const lower = point.clone()
      .addScaledVector(side, sideSign * (seatStart - 1.1))
      .addScaledVector(WORLD_UP, 0.84)
    const upper = point.clone()
      .addScaledVector(side, sideSign * (seatStart - 1.1 + (tiers - 1) * 1.16))
      .addScaledVector(WORLD_UP, 1.27 + (tiers - 1) * 0.72)
    const panelUp = upper.clone().sub(lower)
    const panelHeight = panelUp.length()
    panelUp.normalize()

    // Orient the positive panel normal toward the circuit for both sides.
    // This keeps the lit front face visible while preserving a right-handed
    // transform and avoids relying on duplicated back-face geometry.
    const panelAcross = tangent.clone().multiplyScalar(sideSign)
    const panelNormal = new THREE.Vector3()
      .crossVectors(panelAcross, panelUp)
      .normalize()
    const center = lower.clone()
      .add(upper)
      .multiplyScalar(0.5)
      .addScaledVector(side, -sideSign * 0.16)
    const panelWidth = Math.min(
      length - 1,
      crowdSeats * 2 * crowdSpacing + crowdSpacing * 0.55,
    )
    const geometry = new THREE.PlaneGeometry(panelWidth, panelHeight)
    const matrix = new THREE.Matrix4().makeBasis(panelAcross, panelUp, panelNormal)
    matrix.setPosition(center)
    geometry.applyMatrix4(matrix)
    parts.push(geometry)
  }

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

export function createPitGarageFacadeGeometry(curve, venue = 'apex') {
  const layout = PIT_GARAGE_FACADE_LAYOUTS[venue] ?? PIT_GARAGE_FACADE_LAYOUTS.apex
  const {
    progress,
    lateral,
    centerY,
    totalWidth,
    height,
    panelCount,
    panelGap,
  } = layout
  const point = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const side = new THREE.Vector3()
  getTrackFrame(curve, progress, point, tangent, side)

  const sideSign = Math.sign(lateral) || -1
  const panelAcross = tangent.clone().multiplyScalar(sideSign)
  const panelNormal = new THREE.Vector3()
    .crossVectors(panelAcross, WORLD_UP)
    .normalize()
  const panelWidth = (totalWidth - panelGap * (panelCount - 1)) / panelCount
  const parts = []

  for (let panel = 0; panel < panelCount; panel += 1) {
    const along = (panel - (panelCount - 1) / 2) * (panelWidth + panelGap)
    const center = point.clone()
      .addScaledVector(side, lateral)
      .addScaledVector(tangent, along)
      .addScaledVector(WORLD_UP, centerY)
    const geometry = new THREE.PlaneGeometry(panelWidth, height)
    const matrix = new THREE.Matrix4().makeBasis(panelAcross, WORLD_UP, panelNormal)
    matrix.setPosition(center)
    geometry.applyMatrix4(matrix)
    parts.push(geometry)
  }

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

export function createGantryDisplayGeometry(curve, venue = 'apex') {
  const layouts = GANTRY_DISPLAY_LAYOUTS[venue] ?? GANTRY_DISPLAY_LAYOUTS.apex
  const parts = []

  for (const {
    progress,
    centerY,
    width,
    height,
    approachOffset,
  } of layouts) {
    const point = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const side = new THREE.Vector3()
    getTrackFrame(curve, progress, point, tangent, side)

    // Drivers approach each gantry along +tangent. Put the display just in
    // front of the crossbar and orient its positive normal back toward them.
    const panelAcross = side.clone().multiplyScalar(-1)
    const panelNormal = tangent.clone().multiplyScalar(-1)
    const center = point.clone()
      .addScaledVector(tangent, approachOffset)
      .addScaledVector(WORLD_UP, centerY)
    const geometry = new THREE.PlaneGeometry(width, height)
    const matrix = new THREE.Matrix4().makeBasis(panelAcross, WORLD_UP, panelNormal)
    matrix.setPosition(center)
    geometry.applyMatrix4(matrix)
    parts.push(geometry)
  }

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

function addPalm(parts, curve, progress, lateral, height = 6, along = 0) {
  pushTrackCylinder(parts, curve, progress, lateral, height / 2, 0.22, height, COLORS.desertRock, along, 8)
  for (let leaf = 0; leaf < 4; leaf += 1) {
    pushTrackBoxYaw(
      parts,
      curve,
      progress,
      lateral,
      height + 0.2,
      [0.32, 0.12, 4.3],
      COLORS.hedge,
      along,
      leaf * Math.PI / 2,
    )
  }
}

export function getHarbourTunnelLayout(curve) {
  if (!curve || typeof curve.getLength !== 'function') {
    throw new TypeError('Harbour tunnel layout requires a finite track curve')
  }
  const trackLength = curve.getLength()
  if (!Number.isFinite(trackLength) || trackLength <= 0) {
    throw new RangeError('Harbour tunnel layout requires a positive track length')
  }

  const progressSpan = HARBOUR_TUNNEL_END_PROGRESS - HARBOUR_TUNNEL_START_PROGRESS
  const tunnelArcLength = progressSpan * trackLength
  const panelCount = Math.ceil(tunnelArcLength / HARBOUR_TUNNEL_MAX_PANEL_SPACING)
  const panelSpacing = tunnelArcLength / panelCount
  const panelLength = panelSpacing * HARBOUR_TUNNEL_PANEL_OVERLAP
  const progressStep = progressSpan / panelCount
  const progresses = Array.from(
    { length: panelCount },
    (_, index) => HARBOUR_TUNNEL_START_PROGRESS + (index + 0.5) * progressStep,
  )

  return {
    progresses,
    panelCount,
    panelLength,
    panelSpacing,
    tunnelArcLength,
  }
}

export function createHarbourTunnelWallGeometry(curve, roadWidth = ROAD_WIDTH) {
  if (!Number.isFinite(roadWidth) || roadWidth <= 4) {
    throw new RangeError('Harbour tunnel wall graphics require a usable road width')
  }

  const layout = getHarbourTunnelLayout(curve)
  const wallHeight = HARBOUR_TUNNEL_ROOF_UNDERSIDE - 0.08
  const wallCenterY = HARBOUR_TUNNEL_ROOF_UNDERSIDE / 2
  const atlasInset = 1 / 1024
  const parts = []

  for (const [panelIndex, progress] of layout.progresses.entries()) {
    for (const sideSign of [-1, 1]) {
      const point = new THREE.Vector3()
      const tangent = new THREE.Vector3()
      const side = new THREE.Vector3()
      getTrackFrame(curve, progress, point, tangent, side)

      // Positive normals face the road on both tunnel walls. Reversing the
      // across vector on the left wall keeps each transform right-handed.
      const panelAcross = tangent.clone().multiplyScalar(sideSign)
      const panelNormal = side.clone().multiplyScalar(-sideSign)
      const center = point.clone()
        .addScaledVector(
          side,
          sideSign * (roadWidth / 2 + HARBOUR_TUNNEL_LINER_INNER_OFFSET),
        )
        .addScaledVector(WORLD_UP, wallCenterY)
      const geometry = new THREE.PlaneGeometry(
        layout.panelLength,
        wallHeight,
      )
      const matrix = new THREE.Matrix4().makeBasis(
        panelAcross,
        WORLD_UP,
        panelNormal,
      )
      matrix.setPosition(center)
      geometry.applyMatrix4(matrix)

      // Alternate the two square atlas modules down the tunnel and offset the
      // opposite wall so the driver's peripheral view never sees a mirrored
      // pair. A one-texel inset prevents mip bleeding across the center split.
      const variant = (panelIndex + (sideSign > 0 ? 0 : 1)) % 2
      const moduleMin = variant * 0.5 + atlasInset
      const moduleMax = (variant + 1) * 0.5 - atlasInset
      const uvs = geometry.getAttribute('uv')
      for (let vertex = 0; vertex < uvs.count; vertex += 1) {
        uvs.setX(vertex, THREE.MathUtils.lerp(
          moduleMin,
          moduleMax,
          uvs.getX(vertex),
        ))
      }
      uvs.needsUpdate = true
      parts.push(geometry)
    }
  }

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

export function createHarbourTunnelCeilingPortalGeometry(
  curve,
  roadWidth = ROAD_WIDTH,
) {
  if (!Number.isFinite(roadWidth) || roadWidth <= 4) {
    throw new RangeError('Harbour tunnel ceiling graphics require a usable road width')
  }

  const layout = getHarbourTunnelLayout(curve)
  const atlasInset = 1 / 1024
  const ceilingWidth = roadWidth - 1.58
  const ceilingY = HARBOUR_TUNNEL_ROOF_UNDERSIDE - 0.012
  const portalWallHeight = HARBOUR_TUNNEL_ROOF_UNDERSIDE - 0.08
  const portalWallCenterY = HARBOUR_TUNNEL_ROOF_UNDERSIDE / 2
  const portalFaceOffset = 0.018
  const soffitRollRadians = 0.55
  const soffitWidth = 2.8 - 0.06
  const soffitThickness = 0.42
  const parts = []

  const addAtlasPlane = ({
    width,
    height,
    center,
    across,
    vertical,
    normal,
    column,
    row,
    moduleCropX = 1,
    moduleCropY = 1,
  }) => {
    const geometry = new THREE.PlaneGeometry(width, height)
    const matrix = new THREE.Matrix4().makeBasis(across, vertical, normal)
    matrix.setPosition(center)
    geometry.applyMatrix4(matrix)

    const moduleCenterU = column * 0.5 + 0.25
    const moduleCenterV = row === 0 ? 0.75 : 0.25
    const moduleSpanU = (0.5 - atlasInset * 2) * moduleCropX
    const moduleSpanV = (0.5 - atlasInset * 2) * moduleCropY
    const moduleMinU = moduleCenterU - moduleSpanU / 2
    const moduleMaxU = moduleCenterU + moduleSpanU / 2
    const moduleMinV = moduleCenterV - moduleSpanV / 2
    const moduleMaxV = moduleCenterV + moduleSpanV / 2
    const uvs = geometry.getAttribute('uv')
    for (let vertex = 0; vertex < uvs.count; vertex += 1) {
      uvs.setXY(
        vertex,
        THREE.MathUtils.lerp(moduleMinU, moduleMaxU, uvs.getX(vertex)),
        THREE.MathUtils.lerp(moduleMinV, moduleMaxV, uvs.getY(vertex)),
      )
    }
    uvs.needsUpdate = true
    parts.push(geometry)
  }

  for (const [panelIndex, progress] of layout.progresses.entries()) {
    const point = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const side = new THREE.Vector3()
    getTrackFrame(curve, progress, point, tangent, side)

    addAtlasPlane({
      width: ceilingWidth,
      height: layout.panelLength,
      center: point.clone().addScaledVector(WORLD_UP, ceilingY),
      across: side,
      vertical: tangent,
      normal: WORLD_UP.clone().multiplyScalar(-1),
      column: panelIndex % 2,
      row: 0,
    })

    for (const sideSign of [-1, 1]) {
      const roll = sideSign * -soffitRollRadians
      const rotatedAcross = side.clone()
        .multiplyScalar(Math.cos(roll))
        .addScaledVector(WORLD_UP, Math.sin(roll))
      const soffitNormal = side.clone()
        .multiplyScalar(Math.sin(roll))
        .addScaledVector(WORLD_UP, -Math.cos(roll))
      const soffitCenter = point.clone()
        .addScaledVector(side, sideSign * (roadWidth / 2 - 0.25))
        .addScaledVector(
          WORLD_UP,
          HARBOUR_TUNNEL_ROOF_UNDERSIDE - soffitThickness,
        )
        .addScaledVector(
          soffitNormal,
          soffitThickness / 2 + portalFaceOffset,
        )

      addAtlasPlane({
        width: soffitWidth,
        height: layout.panelLength,
        center: soffitCenter,
        across: rotatedAcross,
        vertical: tangent,
        normal: soffitNormal,
        column: (panelIndex + (sideSign > 0 ? 1 : 0)) % 2,
        row: 0,
      })

      // Curved tangent boxes expose narrow end faces at each panel joint.
      // Portal-casing center crops turn those former bright slivers into
      // intentional structural ribs without introducing a new material.
      for (const endSign of [-1, 1]) {
        const pillarWidth = HARBOUR_TUNNEL_SIDE_WALL_WIDTH - 0.04
        addAtlasPlane({
          width: pillarWidth,
          height: portalWallHeight,
          center: point.clone()
            .addScaledVector(
              side,
              sideSign * (
                roadWidth / 2 + HARBOUR_TUNNEL_SIDE_WALL_CENTER_OFFSET
              ),
            )
            .addScaledVector(
              tangent,
              endSign * (layout.panelLength / 2 + portalFaceOffset),
            )
            .addScaledVector(WORLD_UP, portalWallCenterY),
          across: side.clone().multiplyScalar(endSign),
          vertical: WORLD_UP,
          normal: tangent.clone().multiplyScalar(endSign),
          column: (
            panelIndex
            + (sideSign > 0 ? 1 : 0)
            + (endSign > 0 ? 1 : 0)
          ) % 2,
          row: 1,
          moduleCropX: pillarWidth / portalWallHeight,
        })
      }
    }
  }

  // Cap the entrance and exit edges that remain visible before entering and
  // after leaving the tunnel. Center crops preserve the portal material scale
  // on the thin roof fascia and narrow structural side-wall ends.
  for (const [endIndex, endSign] of [[0, -1], [1, 1]]) {
    const progress = endIndex === 0
      ? layout.progresses[0]
      : layout.progresses.at(-1)
    const point = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const side = new THREE.Vector3()
    getTrackFrame(curve, progress, point, tangent, side)
    const endpoint = point.clone().addScaledVector(
      tangent,
      endSign * (layout.panelLength / 2 + portalFaceOffset),
    )
    const portalNormal = tangent.clone().multiplyScalar(endSign)
    const portalAcross = side.clone().multiplyScalar(endSign)
    const roofFasciaHeight = HARBOUR_TUNNEL_ROOF_HEIGHT - 0.04

    addAtlasPlane({
      width: ceilingWidth,
      height: roofFasciaHeight,
      center: endpoint.clone().addScaledVector(
        WORLD_UP,
        HARBOUR_TUNNEL_ROOF_CENTER_Y,
      ),
      across: portalAcross,
      vertical: WORLD_UP,
      normal: portalNormal,
      column: endIndex,
      row: 1,
      moduleCropY: roofFasciaHeight / ceilingWidth,
    })

  }

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

export function createHarbourBuildingFacadeGeometry(curve) {
  const buildingLength = 13
  const roadFacadeWidth = buildingLength - 0.45
  const faceOffset = 0.025
  const atlasInset = 1 / 1024
  const parts = []

  for (const [buildingIndex, building] of HARBOUR_BUILDINGS.entries()) {
    const point = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const side = new THREE.Vector3()
    getTrackFrame(curve, building.progress, point, tangent, side)

    const sideSign = Math.sign(building.lateral) || 1
    const panelHeight = building.height - 0.3
    const facadeCenter = point.clone()
      .addScaledVector(
        side,
        building.lateral - sideSign * (building.width / 2 + faceOffset),
      )
      .addScaledVector(WORLD_UP, building.height / 2 + 0.03)

    const addFacade = ({
      width,
      center,
      across,
      normal,
      variant,
    }) => {
      const geometry = new THREE.PlaneGeometry(width, panelHeight)
      const matrix = new THREE.Matrix4().makeBasis(across, WORLD_UP, normal)
      matrix.setPosition(center)
      geometry.applyMatrix4(matrix)

      const moduleMin = variant * 0.25 + atlasInset
      const moduleMax = (variant + 1) * 0.25 - atlasInset
      const uvs = geometry.getAttribute('uv')
      for (let vertex = 0; vertex < uvs.count; vertex += 1) {
        uvs.setX(vertex, THREE.MathUtils.lerp(
          moduleMin,
          moduleMax,
          uvs.getX(vertex),
        ))
      }
      uvs.needsUpdate = true
      parts.push(geometry)
    }

    addFacade({
      width: roadFacadeWidth,
      center: facadeCenter,
      across: tangent.clone().multiplyScalar(sideSign),
      normal: side.clone().multiplyScalar(-sideSign),
      variant: buildingIndex % 4,
    })

    // Tight street-circuit turns expose even the nominally outside face.
    addFacade({
      width: roadFacadeWidth,
      center: point.clone()
        .addScaledVector(
          side,
          building.lateral + sideSign * (building.width / 2 + faceOffset),
        )
        .addScaledVector(WORLD_UP, building.height / 2 + 0.03),
      across: tangent.clone().multiplyScalar(-sideSign),
      normal: side.clone().multiplyScalar(sideSign),
      variant: (buildingIndex + 3) % 4,
    })

    // Both approach and departure views expose a tower's short end face.
    for (const endSign of [-1, 1]) {
      addFacade({
        width: building.width - 0.15,
        center: point.clone()
          .addScaledVector(side, building.lateral)
          .addScaledVector(
            tangent,
            endSign * (buildingLength / 2 + faceOffset),
          )
          .addScaledVector(WORLD_UP, building.height / 2 + 0.03),
        across: side.clone().multiplyScalar(endSign),
        normal: tangent.clone().multiplyScalar(endSign),
        variant: (
          buildingIndex + (endSign < 0 ? 1 : 2)
        ) % 4,
      })
    }
  }

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

export function createHarbourRetainingWallFacadeGeometry(
  curve,
  roadWidth = ROAD_WIDTH,
) {
  if (!Number.isFinite(roadWidth) || roadWidth <= 4) {
    throw new RangeError('Harbour retaining-wall graphics require a usable road width')
  }

  const {
    progresses,
    lateralOffsetFromRoad,
    centerY,
    width,
    height,
    length,
  } = HARBOUR_RETAINING_WALL_LAYOUT
  const lateral = roadWidth / 2 + lateralOffsetFromRoad
  const panelHeight = height - 0.08
  const faceOffset = 0.018
  const atlasInset = 1 / 1024
  const parts = []

  const addFacade = ({
    facadeWidth,
    facadeHeight = panelHeight,
    center,
    across,
    normal,
    variant,
    moduleCrop = 1,
  }) => {
    const geometry = new THREE.PlaneGeometry(facadeWidth, facadeHeight)
    const matrix = new THREE.Matrix4().makeBasis(across, WORLD_UP, normal)
    matrix.setPosition(center)
    geometry.applyMatrix4(matrix)

    const moduleCenter = variant * 0.5 + 0.25
    const moduleSpan = (0.5 - atlasInset * 2) * moduleCrop
    const moduleMin = moduleCenter - moduleSpan / 2
    const moduleMax = moduleCenter + moduleSpan / 2
    const uvs = geometry.getAttribute('uv')
    for (let vertex = 0; vertex < uvs.count; vertex += 1) {
      uvs.setXY(
        vertex,
        THREE.MathUtils.lerp(moduleMin, moduleMax, uvs.getX(vertex)),
        THREE.MathUtils.lerp(atlasInset, 1 - atlasInset, uvs.getY(vertex)),
      )
    }
    uvs.needsUpdate = true
    parts.push(geometry)
  }

  for (const [wallIndex, progress] of progresses.entries()) {
    const point = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const side = new THREE.Vector3()
    getTrackFrame(curve, progress, point, tangent, side)

    addFacade({
      facadeWidth: length - 0.08,
      center: point.clone()
        .addScaledVector(side, lateral - width / 2 - faceOffset)
        .addScaledVector(WORLD_UP, centerY),
      across: tangent,
      normal: side.clone().multiplyScalar(-1),
      variant: wallIndex % 2,
    })

    // The hairpin and adjacent road branches expose the nominal rear face.
    addFacade({
      facadeWidth: length - 0.08,
      center: point.clone()
        .addScaledVector(side, lateral + width / 2 + faceOffset)
        .addScaledVector(WORLD_UP, centerY),
      across: tangent.clone().multiplyScalar(-1),
      normal: side,
      variant: (wallIndex + 1) % 2,
    })

    // Use only a narrow center slice of a module on each short end face. This
    // preserves material scale instead of squeezing a square wall bay into a
    // 0.7 m-wide column.
    const endModuleCrop = (width - 0.08) / panelHeight
    for (const endSign of [-1, 1]) {
      addFacade({
        facadeWidth: width - 0.08,
        center: point.clone()
          .addScaledVector(side, lateral)
          .addScaledVector(tangent, endSign * (length / 2 + faceOffset))
          .addScaledVector(WORLD_UP, centerY),
        across: side.clone().multiplyScalar(endSign),
        normal: tangent.clone().multiplyScalar(endSign),
        variant: (wallIndex + (endSign > 0 ? 0 : 1)) % 2,
        moduleCrop: endModuleCrop,
      })
    }
  }

  // These same structural boxes form the tunnel interior and a large exposed
  // retaining wall beside the adjacent hairpin. Cover their outward faces so
  // they do not remain an untextured strip in the player's chase-camera view.
  const tunnelLayout = getHarbourTunnelLayout(curve)
  const tunnelWallHeight = HARBOUR_TUNNEL_ROOF_UNDERSIDE - 0.08
  const tunnelWallCenterY = HARBOUR_TUNNEL_ROOF_UNDERSIDE / 2
  const tunnelOuterOffset = (
    roadWidth / 2
    + HARBOUR_TUNNEL_SIDE_WALL_CENTER_OFFSET
    + HARBOUR_TUNNEL_SIDE_WALL_WIDTH / 2
    + faceOffset
  )
  for (const [panelIndex, progress] of tunnelLayout.progresses.entries()) {
    const point = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const side = new THREE.Vector3()
    getTrackFrame(curve, progress, point, tangent, side)

    for (const sideSign of [-1, 1]) {
      addFacade({
        facadeWidth: tunnelLayout.panelLength,
        facadeHeight: tunnelWallHeight,
        center: point.clone()
          .addScaledVector(side, sideSign * tunnelOuterOffset)
          .addScaledVector(WORLD_UP, tunnelWallCenterY),
        across: tangent.clone().multiplyScalar(-sideSign),
        normal: side.clone().multiplyScalar(sideSign),
        variant: (panelIndex + (sideSign > 0 ? 0 : 1)) % 2,
      })
    }
  }

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

export function createHarbourMarinaSurfaceGeometry() {
  const { quay, promenade } = HARBOUR_MARINA_LAYOUT
  const [quayWidth, quayHeight, quayDepth] = quay.size
  const [quayCenterX, quayCenterY, quayCenterZ] = quay.position
  const quayMinX = quayCenterX - quayWidth / 2
  const quayMaxX = quayCenterX + quayWidth / 2
  const promenadeWidth = promenade.maxX - promenade.minX
  if (
    Math.abs(quayMinX - promenade.minX) > 0.001
    || Math.abs(quayMaxX - promenade.maxX) > 0.001
  ) {
    throw new RangeError('Harbour promenade must span the complete quay')
  }
  const panelCount = Math.ceil(promenadeWidth / quay.panelWidth)
  const panelWidth = promenadeWidth / panelCount
  const promenadeDepth = promenade.maxZ - promenade.minZ
  const promenadeRowDepth = promenadeDepth / promenade.rows
  const atlasInset = 1 / 1024
  const parts = []

  const remapAtlasQuadrant = (geometry, column, row) => {
    const minU = column * 0.5 + atlasInset
    const maxU = (column + 1) * 0.5 - atlasInset
    const minV = row * 0.5 + atlasInset
    const maxV = (row + 1) * 0.5 - atlasInset
    const uvs = geometry.getAttribute('uv')
    for (let vertex = 0; vertex < uvs.count; vertex += 1) {
      uvs.setXY(
        vertex,
        THREE.MathUtils.lerp(minU, maxU, uvs.getX(vertex)),
        THREE.MathUtils.lerp(minV, maxV, uvs.getY(vertex)),
      )
    }
    uvs.needsUpdate = true
  }

  const addVerticalPanel = (panelIndex) => {
    const center = new THREE.Vector3(
      quayMinX + (panelIndex + 0.5) * panelWidth,
      quayCenterY,
      quayCenterZ - quayDepth / 2 - 0.012,
    )
    const geometry = new THREE.PlaneGeometry(panelWidth, quayHeight - 0.04)
    const matrix = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(-1, 0, 0),
      WORLD_UP,
      new THREE.Vector3(0, 0, -1),
    )
    matrix.setPosition(center)
    geometry.applyMatrix4(matrix)
    remapAtlasQuadrant(geometry, panelIndex % 2, 1)
    parts.push(geometry)
  }

  const addHorizontalPanel = ({
    centerX,
    centerZ,
    depth,
    surfaceY,
    variant,
  }) => {
    const geometry = new THREE.PlaneGeometry(panelWidth, depth)
    const matrix = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, -1),
      WORLD_UP,
    )
    matrix.setPosition(centerX, surfaceY, centerZ)
    geometry.applyMatrix4(matrix)
    remapAtlasQuadrant(geometry, variant, 0)
    parts.push(geometry)
  }

  for (let panelIndex = 0; panelIndex < panelCount; panelIndex += 1) {
    const centerX = quayMinX + (panelIndex + 0.5) * panelWidth
    addVerticalPanel(panelIndex)

    for (let row = 0; row < promenade.rows; row += 1) {
      addHorizontalPanel({
        centerX,
        centerZ: promenade.minZ + (row + 0.5) * promenadeRowDepth,
        depth: promenadeRowDepth,
        surfaceY: promenade.surfaceY,
        variant: (panelIndex + row) % 2,
      })
    }

    addHorizontalPanel({
      centerX,
      centerZ: quayCenterZ,
      depth: quayDepth,
      surfaceY: quayCenterY + quayHeight / 2 + 0.012,
      variant: (panelIndex + 1) % 2,
    })
  }

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

export function createHarbourYachtFacadeGeometry() {
  const atlasInset = 1 / 1024
  const faceOffset = 0.012
  const parts = []

  const addFace = ({
    center,
    across,
    normal,
    width,
    height,
    column,
    row,
  }) => {
    const geometry = new THREE.PlaneGeometry(width, height)
    const matrix = new THREE.Matrix4().makeBasis(across, WORLD_UP, normal)
    matrix.setPosition(center)
    geometry.applyMatrix4(matrix)

    const minU = column * 0.5 + atlasInset
    const maxU = (column + 1) * 0.5 - atlasInset
    const minV = row * 0.5 + atlasInset
    const maxV = (row + 1) * 0.5 - atlasInset
    const uvs = geometry.getAttribute('uv')
    for (let vertex = 0; vertex < uvs.count; vertex += 1) {
      uvs.setXY(
        vertex,
        THREE.MathUtils.lerp(minU, maxU, uvs.getX(vertex)),
        THREE.MathUtils.lerp(minV, maxV, uvs.getY(vertex)),
      )
    }
    uvs.needsUpdate = true
    parts.push(geometry)
  }

  const addBoxFacades = ({ yacht, box, row }) => {
    const [width, height, length] = box.size
    const localRight = new THREE.Vector3(
      Math.cos(yacht.yaw),
      0,
      -Math.sin(yacht.yaw),
    )
    const localForward = new THREE.Vector3(
      Math.sin(yacht.yaw),
      0,
      Math.cos(yacht.yaw),
    )
    const boxCenter = new THREE.Vector3(
      yacht.x,
      box.centerY,
      yacht.z + box.zOffset,
    )

    for (const sideSign of [-1, 1]) {
      addFace({
        center: boxCenter.clone().addScaledVector(
          localRight,
          sideSign * (width / 2 + faceOffset),
        ),
        across: localForward.clone().multiplyScalar(-sideSign),
        normal: localRight.clone().multiplyScalar(sideSign),
        width: length - 0.05,
        height: height - 0.04,
        column: 0,
        row,
      })
    }

    for (const endSign of [-1, 1]) {
      addFace({
        center: boxCenter.clone().addScaledVector(
          localForward,
          endSign * (length / 2 + faceOffset),
        ),
        across: localRight.clone().multiplyScalar(endSign),
        normal: localForward.clone().multiplyScalar(endSign),
        width: width - 0.05,
        height: height - 0.04,
        column: 1,
        row,
      })
    }
  }

  for (const yacht of HARBOUR_YACHT_LAYOUT.boats) {
    addBoxFacades({ yacht, box: HARBOUR_YACHT_LAYOUT.hull, row: 1 })
    addBoxFacades({ yacht, box: HARBOUR_YACHT_LAYOUT.cabin, row: 0 })
  }

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

export function getHarbourTunnelLightingLayout(curve, roadWidth = ROAD_WIDTH) {
  if (!Number.isFinite(roadWidth) || roadWidth <= 4) {
    throw new RangeError('Harbour tunnel lighting requires a usable road width')
  }

  const tunnelLayout = getHarbourTunnelLayout(curve)
  const progressSpan = HARBOUR_TUNNEL_END_PROGRESS - HARBOUR_TUNNEL_START_PROGRESS
  const progressStep = progressSpan / (HARBOUR_TUNNEL_LIGHT_COUNT + 1)
  const fixtureLateral = Math.max(1.8, roadWidth / 2 - 2.05)
  const progresses = Array.from(
    { length: HARBOUR_TUNNEL_LIGHT_COUNT },
    (_, index) => HARBOUR_TUNNEL_START_PROGRESS + (index + 1) * progressStep,
  )
  const lights = progresses.map((progress, index) => {
    const point = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const side = new THREE.Vector3()
    getTrackFrame(curve, progress, point, tangent, side)
    const lateral = (index % 2 === 0 ? -1 : 1) * fixtureLateral
    point.addScaledVector(side, lateral)
    point.y += HARBOUR_TUNNEL_LIGHT_HEIGHT
    return {
      progress,
      lateral,
      position: point.toArray(),
    }
  })

  return {
    count: lights.length,
    spacing: progressStep * curve.getLength(),
    progressStep,
    progresses,
    fixtureLateral,
    lights,
    tunnelArcLength: tunnelLayout.tunnelArcLength,
  }
}

function addSakhirSignature(parts, curve) {
  // Official race photography is dominated by the dark cylindrical VIP tower,
  // bright horizontal light bands and its ring of tent-like roof peaks.
  const towerProgress = 0.53
  const towerLateral = -36
  pushTrackCylinder(parts, curve, towerProgress, towerLateral, 13, 7.25, 26, COLORS.navy, 0, 20)
  for (let floor = 0; floor < 8; floor += 1) {
    const floorY = 2.15 + floor * 3.15
    pushTrackCylinder(parts, curve, towerProgress, towerLateral, floorY, 7.8, 0.38, COLORS.cream, 0, 20)
    pushTrackCylinder(
      parts,
      curve,
      towerProgress,
      towerLateral,
      floorY + 1.38,
      7.38,
      0.16,
      floor % 2 === 0 ? COLORS.cyan : COLORS.gold,
      0,
      20,
    )
  }
  pushTrackCylinder(parts, curve, towerProgress, towerLateral, 26.3, 8.5, 0.45, COLORS.steel, 0, 20)
  for (let peak = 0; peak < 8; peak += 1) {
    const angle = peak / 8 * Math.PI * 2
    pushTrackCone(
      parts,
      curve,
      towerProgress,
      towerLateral + Math.cos(angle) * 5.8,
      28.15,
      2.45,
      4.2,
      COLORS.cream,
      Math.sin(angle) * 5.8,
      10,
    )
  }
  pushTrackBox(parts, curve, towerProgress, towerLateral, 31.8, [0.18, 6.8, 0.18], COLORS.steel)
  pushTrackBox(parts, curve, towerProgress, towerLateral + 1.4, 34.2, [2.8, 1.35, 0.12], COLORS.red)

  for (const [index, progress] of [0.12, 0.3, 0.62, 0.84].entries()) {
    const side = index % 2 === 0 ? 1 : -1
    pushTrackBox(parts, curve, progress, side * 30, 1.8, [19, 3.6, 12], COLORS.sand)
    pushTrackBox(parts, curve, progress, side * 30, 3.72, [20, 0.25, 13], COLORS.cream)
  }

  for (const [index, progress] of [0.04, 0.075, 0.11, 0.72, 0.755].entries()) {
    addPalm(parts, curve, progress, index < 3 ? -31 : 28, 5 + (index % 2), (index % 3 - 1) * 6)
  }

  // Repeated pale tent peaks reproduce the main-straight roofline.
  for (let tent = -4; tent <= 4; tent += 1) {
    pushTrackCone(parts, curve, PIT_STRAIGHT_PROGRESS, 22, 8.2, 5.1, 3.8, COLORS.cream, tent * 7, 4)
  }
}

function addHarbourSignature(parts, curve, roadWidth = ROAD_WIDTH) {
  // Monaco's hairpin precedes the tunnel, which then opens onto the harbour.
  const hairpinProgress = 0.234
  const hairpinSide = getTurnSide(curve, hairpinProgress)
  pushTrackCylinder(parts, curve, hairpinProgress, hairpinSide * 11.2, 0.22, 3.4, 0.4, COLORS.grass)
  addPalm(parts, curve, hairpinProgress, hairpinSide * 11.2, 5.3)

  const tunnelLayout = getHarbourTunnelLayout(curve)
  for (const progress of tunnelLayout.progresses) {
    pushTrackBox(
      parts,
      curve,
      progress,
      0,
      HARBOUR_TUNNEL_ROOF_CENTER_Y,
      [roadWidth - 1.5, HARBOUR_TUNNEL_ROOF_HEIGHT, tunnelLayout.panelLength],
      COLORS.tunnel,
    )
    for (const side of [-1, 1]) {
      pushTrackBox(
        parts,
        curve,
        progress,
        side * (
          roadWidth / 2 + HARBOUR_TUNNEL_SIDE_WALL_CENTER_OFFSET
        ),
        HARBOUR_TUNNEL_ROOF_UNDERSIDE / 2,
        [
          HARBOUR_TUNNEL_SIDE_WALL_WIDTH,
          HARBOUR_TUNNEL_ROOF_UNDERSIDE,
          tunnelLayout.panelLength,
        ],
        COLORS.stone,
      )
      pushTrackBoxBanked(
        parts,
        curve,
        progress,
        side * (roadWidth / 2 - 0.25),
        HARBOUR_TUNNEL_ROOF_UNDERSIDE - 0.42,
        [2.8, 0.42, tunnelLayout.panelLength],
        COLORS.tunnel,
        0,
        side * -0.55,
      )
    }
  }

  const tunnelLighting = getHarbourTunnelLightingLayout(curve, roadWidth)
  // Pale structural ribs break up the former uninterrupted black ceiling.
  // Their lower face remains exactly flush with the documented roof underside,
  // so neither the camera nor vehicle clearance contract changes.
  for (const progress of tunnelLighting.progresses) {
    pushTrackBox(
      parts,
      curve,
      progress,
      0,
      HARBOUR_TUNNEL_ROOF_UNDERSIDE + 0.09,
      [roadWidth - 1.8, 0.18, 0.3],
      COLORS.tunnelRib,
    )
    for (const side of [-1, 1]) {
      pushTrackBox(
        parts,
        curve,
        progress,
        side * tunnelLighting.fixtureLateral,
        HARBOUR_TUNNEL_ROOF_UNDERSIDE + 0.055,
        [1.3, 0.11, 1.05],
        COLORS.steel,
      )
    }
  }

  pushWorldBox(
    parts,
    [HARBOUR_WATER.size[0], 0.05, HARBOUR_WATER.size[2]],
    [HARBOUR_WATER.position[0], 0.025, HARBOUR_WATER.position[2]],
    COLORS.marina,
  )
  pushWorldBox(
    parts,
    HARBOUR_MARINA_LAYOUT.quay.size,
    HARBOUR_MARINA_LAYOUT.quay.position,
    COLORS.stone,
  )
  for (const [index, yacht] of HARBOUR_YACHT_LAYOUT.boats.entries()) {
    const { x, z, yaw } = yacht
    const { hull, cabin } = HARBOUR_YACHT_LAYOUT
    // Monaco's harbour is read from behind the Armco. Give the yachts a
    // proper raised superstructure and mast so they remain identifiable from
    // the chase camera instead of reducing to sub-pixel hulls behind the quay.
    pushWorldBox(parts, hull.size, [x, hull.centerY, z + hull.zOffset], COLORS.white, yaw)
    pushWorldBox(parts, cabin.size, [x, cabin.centerY, z + cabin.zOffset], COLORS.white, yaw)
    pushWorldBox(parts, [1.72, 0.5, 2.8], [x, 2.08, z - 0.45], index % 2 === 0 ? COLORS.red : COLORS.marinaLight, yaw)
    pushWorldCylinder(parts, 0.08, 6.6, [x, 4.35, z + 0.4], COLORS.steel, 6)
    pushWorldBox(parts, [0.12, 0.12, 4.4], [x, 4.55, z + 0.1], COLORS.steel, yaw)
  }

  for (const building of HARBOUR_BUILDINGS) {
    pushTrackBox(parts, curve, building.progress, building.lateral, building.height / 2, [building.width, building.height, 13], building.color)
    pushTrackBox(parts, curve, building.progress, building.lateral, building.height + 0.45, [building.width + 1.1, 0.7, 14], COLORS.terracotta)
    for (let floor = 3; floor < building.height - 1; floor += 3.2) {
      pushTrackBox(parts, curve, building.progress, building.lateral - Math.sign(building.lateral) * (building.width / 2 + 0.08), floor, [0.12, 0.24, 10.8], COLORS.glass)
      pushTrackBox(
        parts,
        curve,
        building.progress,
        building.lateral - Math.sign(building.lateral) * (building.width / 2 + 0.52),
        floor - 0.58,
        [1.15, 0.16, 14.2],
        COLORS.stone,
      )
    }
  }

  // Retaining walls, road furniture and patched asphalt make the opening
  // sector read as a converted city street rather than a permanent circuit.
  for (const [index, progress] of HARBOUR_RETAINING_WALL_LAYOUT.progresses.entries()) {
    const layout = HARBOUR_RETAINING_WALL_LAYOUT
    pushTrackBox(
      parts,
      curve,
      progress,
      roadWidth / 2 + layout.lateralOffsetFromRoad,
      layout.centerY,
      [layout.width, layout.height, layout.length],
      COLORS.stone,
    )
    pushTrackBox(
      parts,
      curve,
      progress,
      roadWidth / 2 + layout.capLateralOffsetFromRoad,
      layout.capCenterY,
      layout.capSize,
      index % 2 ? COLORS.red : COLORS.white,
    )
  }
  // Swimming Pool and compact harbour stands frame the final sector.
  for (const panel of HARBOUR_SWIMMING_POOL_PANELS) {
    pushWorldBox(parts, panel.size, panel.position, panel.color)
  }
  addGrandstands(parts, curve, 'harbour')

  // Short pit buildings avoid crossing the curving street-circuit start line.
  pushTrackBox(parts, curve, 0.985, -18, 3.4, [9, 6.8, 34], COLORS.cream)
  pushTrackBox(parts, curve, 0.985, -13.2, 3.7, [0.7, 5.2, 33], COLORS.glass)
  pushTrackBox(parts, curve, 0.985, -17.8, 7.0, [10, 0.35, 35], COLORS.terracotta)
}

export const TEMPLE_TREE_LAYOUT = Object.freeze(
  Array.from({ length: 36 }, (_, index) => (
    [-1, 1].flatMap(side => (
      [0, 1].map(band => Object.freeze({
        progress: (
          (index + 0.5 + band * 0.46) / 36
        ) % 1,
        lateral: side * (18 + (index % 4) * 3.2 + band * 11),
        height: 7.2 + (index % 6) * 1.05 - band * 0.55,
        along: (
          (index % 3 - 1) * 4.2
          + band * (index % 2 === 0 ? -2.8 : 2.8)
        ),
        variant: (
          index
          + (side > 0 ? 0 : 1)
          + band * 2
        ) % 4,
      }))
    ))
  )).flat(),
)

export function createTempleTreeBillboardGeometry(curve) {
  if (!curve || typeof curve.getPointAt !== 'function') {
    throw new TypeError('Temple tree graphics require a finite track curve')
  }

  const atlasInset = 1 / 1024
  const parts = []
  for (const tree of TEMPLE_TREE_LAYOUT) {
    const point = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const side = new THREE.Vector3()
    getTrackFrame(curve, tree.progress, point, tangent, side)
    const lateralSign = Math.sign(tree.lateral)
    const billboardHeight = tree.height * 1.08
    const billboardWidth = tree.height
    const center = point.clone()
      .addScaledVector(side, tree.lateral)
      .addScaledVector(tangent, tree.along)
      .addScaledVector(WORLD_UP, billboardHeight / 2 + 0.006)
    const across = tangent.clone().multiplyScalar(lateralSign)
    const normal = side.clone().multiplyScalar(-lateralSign)
    const geometry = new THREE.PlaneGeometry(
      billboardWidth,
      billboardHeight,
    )
    const matrix = new THREE.Matrix4().makeBasis(across, WORLD_UP, normal)
    matrix.setPosition(center)
    geometry.applyMatrix4(matrix)

    const column = tree.variant % 2
    const row = Math.floor(tree.variant / 2)
    const moduleMinU = column * 0.5 + atlasInset
    const moduleMaxU = (column + 1) * 0.5 - atlasInset
    const moduleMinV = row === 0 ? 0.5 + atlasInset : atlasInset
    const moduleMaxV = row === 0 ? 1 - atlasInset : 0.5 - atlasInset
    const uvs = geometry.getAttribute('uv')
    for (let vertex = 0; vertex < uvs.count; vertex += 1) {
      uvs.setXY(
        vertex,
        THREE.MathUtils.lerp(moduleMinU, moduleMaxU, uvs.getX(vertex)),
        THREE.MathUtils.lerp(moduleMinV, moduleMaxV, uvs.getY(vertex)),
      )
    }
    uvs.needsUpdate = true
    parts.push(geometry)
  }

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

function addTempleSignature(parts, curve, roadWidth = ROAD_WIDTH) {
  // Dense woodland, gravel traps and tricolore paint establish Monza's park.
  for (const side of [-1, 1]) {
    parts.push(buildSurfaceRibbon(curve, {
      samples: LOW_DETAIL_SURFACE_SEGMENTS,
      lateralOffset: side * (roadWidth / 2 + 3.25),
      width: 5.5,
      yOffset: 0.052,
      color: COLORS.grass,
    }))
  }
  // Preserved oval banking crosses over the modern Serraglio run to Ascari.
  const banking = TEMPLE_BANKING_LAYOUT
  for (const side of [-1, 1]) {
    pushTrackBox(
      parts,
      curve,
      banking.progress,
      side * banking.supportCenterLateral,
      banking.supportCenterY,
      banking.supportSize,
      COLORS.concrete,
    )
  }
  pushTrackBox(
    parts,
    curve,
    banking.progress,
    0,
    banking.deckCenterY,
    [roadWidth + banking.deckExtraWidth, banking.deckHeight, banking.deckLength],
    COLORS.concrete,
  )
  for (const side of [-1, 1]) {
    pushTrackBoxBanked(
      parts,
      curve,
      banking.progress,
      side * banking.armCenterLateral,
      banking.armCenterY,
      banking.armSize,
      COLORS.concrete,
      0,
      side * banking.armRoll,
    )
  }
  pushTrackBox(
    parts,
    curve,
    banking.progress,
    0,
    banking.beamCenterY,
    [roadWidth + banking.beamExtraWidth, banking.beamHeight, banking.beamLength],
    COLORS.steel,
  )

  addGrandstands(parts, curve, 'temple')

  // Low, white pit building and red timing tower match the Monza straight.
  pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -22, 3.1, [10, 6.2, 58], COLORS.cream)
  pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -16.8, 3.3, [0.7, 5.4, 57], COLORS.glass)
  pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -22, 6.45, [11, 0.4, 60], COLORS.red)
  for (let bay = -5; bay <= 5; bay += 1) {
    pushTrackBox(
      parts,
      curve,
      PIT_STRAIGHT_PROGRESS,
      -16.42,
      2.0,
      [0.12, 2.7, 3.45],
      [COLORS.italianGreen, COLORS.white, COLORS.red][(bay + 6) % 3],
      bay * 4.75,
    )
  }
  pushTrackBox(parts, curve, 0.03, -31, 9, [7, 18, 6], COLORS.red)
  pushTrackBox(parts, curve, 0.03, -27.35, 9.4, [0.28, 14.6, 4.8], COLORS.glass)
  for (let floor = 0; floor < 5; floor += 1) {
    pushTrackBox(parts, curve, 0.03, -27.18, 3.25 + floor * 2.85, [0.12, 0.34, 4.2], COLORS.white)
  }
  pushTrackBox(parts, curve, 0.03, -31, 18.4, [8.2, 0.55, 7.2], COLORS.cream)
}

function addVenueSignature(parts, curve, venue, roadWidth = ROAD_WIDTH) {
  if (venue === 'harbour') {
    addHarbourSignature(parts, curve, roadWidth)
  } else if (venue === 'temple') {
    addTempleSignature(parts, curve, roadWidth)
  } else {
    addSakhirSignature(parts, curve)
  }
}

export function createCircuitSceneryGeometry(curve, venue = 'apex', roadWidth = ROAD_WIDTH) {
  const parts = []

  addSurfaceGuides(parts, curve, roadWidth)
  addCornerReadability(parts, curve, venue, roadWidth)
  addCircuitLandmarks(parts, curve, venue, roadWidth)
  if (venue === 'apex') addNightVenueDetails(parts, curve, roadWidth)
  addBroadcastCameras(parts, curve, roadWidth)
  addKerbs(parts, curve, venue, roadWidth)
  addFinishStripe(parts, curve, roadWidth)
  addStartGridMarkings(parts, curve)
  if (venue === 'apex') addPitStraightRunoff(parts, curve, roadWidth)

  const pitExitColor = venue === 'temple'
    ? COLORS.italianGreen
    : venue === 'harbour' ? COLORS.white : COLORS.runoffGreen
  pushTrackBox(parts, curve, 0.055, -roadWidth / 2 + 1.25, 0.11, [0.12, 0.03, 18], pitExitColor)
  addBrakingBoards(parts, curve, venue, roadWidth)
  addTracksideInfrastructure(parts, curve, venue, roadWidth)
  if (venue === 'apex') {
    addPitComplex(parts, curve)
    addPitLaneLife(parts, curve)
    addGrandstands(parts, curve)
  }
  addVenueSignature(parts, curve, venue, roadWidth)

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

export function createCircuitGlowGeometry(curve, venue = 'apex', roadWidth = ROAD_WIDTH) {
  const parts = []
  for (const lateral of START_LIGHT_LATERALS) {
    for (const rowLevel of START_LIGHT_ROW_LEVELS) {
      pushTrackBox(parts, curve, START_GANTRY_PROGRESS, lateral, rowLevel, [0.5, 0.13, 0.56], COLORS.red)
    }
  }

  if (venue === 'apex') {
    for (let index = 0; index < FLOODLIGHT_COUNT; index += 1) {
      const progress = index / FLOODLIGHT_COUNT + 0.018
      const lateral = (index % 2 === 0 ? -1 : 1) * (ROAD_WIDTH / 2 + 3.5)
      for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 5; column += 1) {
          pushTrackBox(
            parts,
            curve,
            progress,
            lateral - 1.12 + column * 0.56,
            6.62 + row * 0.62,
            [0.3, 0.3, 0.24],
            COLORS.warm,
          )
        }
      }
    }
    for (const bay of PIT_BAYS) {
      pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -17.05, 2.78, [0.12, 0.12, 3.4], COLORS.warm, bay * 4.8)
    }
    for (let screen = -4; screen <= 4; screen += 2) {
      pushTrackBox(parts, curve, PIT_STRAIGHT_PROGRESS, -8.84, 1.62, [0.06, 0.32, 1.2], screen % 4 === 0 ? COLORS.gold : COLORS.warm, screen * 5.2)
    }
    for (const progress of [START_GANTRY_PROGRESS, ...MEDIA_BRIDGE_PROGRESS]) {
      pushTrackBox(parts, curve, progress, 0, progress === START_GANTRY_PROGRESS ? 7.18 : 5.53, [6.9, 0.13, 0.74], COLORS.gold)
    }
    for (let floor = 0; floor < 8; floor += 1) {
      pushTrackCylinder(parts, curve, 0.53, -36, 3.53 + floor * 3.15, 7.48, 0.12, floor % 2 === 0 ? COLORS.cyan : COLORS.gold, 0, 20)
    }
  } else if (venue === 'harbour') {
    const tunnelLayout = getHarbourTunnelLayout(curve)
    const tunnelLighting = getHarbourTunnelLightingLayout(curve, roadWidth)
    // Continuous side service strips give the eye a direction line through the
    // bend without adding another transparent material or draw call.
    for (const progress of tunnelLayout.progresses) {
      for (const side of [-1, 1]) {
        pushTrackBox(
          parts,
          curve,
          progress,
          side * (roadWidth / 2 - 0.72),
          3.82,
          [0.1, 0.1, tunnelLayout.panelLength],
          COLORS.warm,
        )
      }
    }
    // Paired ceiling fixtures remain visible from the chase camera while six
    // alternating real lights supply the illumination in Track.jsx.
    for (const progress of tunnelLighting.progresses) {
      for (const side of [-1, 1]) {
        pushTrackBox(
          parts,
          curve,
          progress,
          side * tunnelLighting.fixtureLateral,
          HARBOUR_TUNNEL_ROOF_UNDERSIDE - 0.01,
          [1.04, 0.06, 0.78],
          COLORS.warm,
        )
      }
    }
    pushWorldBox(parts, [285, 0.04, 62], [20, 0.065, 121], COLORS.waterGlow)
  } else {
    for (const [index, color] of [COLORS.italianGreen, COLORS.white, COLORS.red].entries()) {
      pushTrackBox(parts, curve, START_GANTRY_PROGRESS, -2.6 + index * 2.6, 7.5, [2.2, 0.1, 0.7], color)
    }
    pushTrackBox(parts, curve, 0.03, -27.45, 13.8, [0.08, 0.5, 4.6], COLORS.red)
  }

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

export function getFloodlightPositions(curve, venue = 'apex', roadWidth = ROAD_WIDTH) {
  if (venue !== 'apex') return []
  return [0.015, 0.14, 0.28, 0.42, 0.56, 0.7, 0.82, 0.94].map((progress, index) => {
    const point = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const side = new THREE.Vector3()
    getTrackFrame(curve, progress, point, tangent, side)
    point.addScaledVector(side, (index % 2 === 0 ? -1 : 1) * (roadWidth / 2 + 3.5))
    point.y += 7.1
    return point.toArray()
  })
}

export function createCatchFenceGeometry(
  curve,
  samples = Math.ceil(trackLength / 10),
  roadWidth = ROAD_WIDTH,
) {
  const positions = []
  const fenceOffset = roadWidth / 2 + 0.48
  const baseHeight = 1.28
  const topHeight = 4.7
  const wireHeights = [1.58, 2.2, 2.82, 3.46, 4.12, 4.58]

  const pushSegment = (start, end) => {
    positions.push(start.x, start.y, start.z, end.x, end.y, end.z)
  }

  for (const sideSign of [-1, 1]) {
    const pointsAtHeight = (progress, height, lean = 0) => {
      const point = new THREE.Vector3()
      const tangent = new THREE.Vector3()
      const side = new THREE.Vector3()
      getTrackFrame(curve, progress, point, tangent, side)
      point.addScaledVector(side, sideSign * (fenceOffset - lean))
      point.y += height
      return point
    }

    for (let index = 0; index < samples; index += 1) {
      const progress = index / samples
      const nextProgress = (index + 1) / samples
      const base = pointsAtHeight(progress, baseHeight)
      const top = pointsAtHeight(progress, topHeight, 0.34)
      pushSegment(base, top)

      for (const height of wireHeights) {
        const lean = Math.max(0, height - 3.7) * 0.34
        pushSegment(
          pointsAtHeight(progress, height, lean),
          pointsAtHeight(nextProgress, height, lean),
        )
      }

    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
