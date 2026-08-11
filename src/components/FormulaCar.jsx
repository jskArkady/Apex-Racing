import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useGameStore } from '../store/gameStore'
import playerFormulaLiveryAtlasUrl from '../assets/textures/player-formula-livery-surface-atlas-1024.webp'
import aiBlueFormulaLiveryAtlasUrl from '../assets/textures/ai-blue-formula-livery-surface-atlas-1024.webp'
import aiGreenFormulaLiveryAtlasUrl from '../assets/textures/ai-green-formula-livery-surface-atlas-1024.webp'
import aiOrangeFormulaLiveryAtlasUrl from '../assets/textures/ai-orange-formula-livery-surface-atlas-1024.webp'
import playerFormulaBodyworkAtlasUrl from '../assets/textures/player-formula-bodywork-surface-atlas-1024.webp'
import aiBlueFormulaBodyworkAtlasUrl from '../assets/textures/ai-blue-formula-bodywork-surface-atlas-1024.webp'
import aiGreenFormulaBodyworkAtlasUrl from '../assets/textures/ai-green-formula-bodywork-surface-atlas-1024.webp'
import aiOrangeFormulaBodyworkAtlasUrl from '../assets/textures/ai-orange-formula-bodywork-surface-atlas-1024.webp'
import sharedFormulaTyreWheelAtlasUrl from '../assets/textures/shared-formula-tyre-wheel-surface-atlas-1024.webp'
import sharedFormulaCockpitMechanicalAtlasUrl from '../assets/textures/shared-formula-cockpit-mechanical-surface-atlas-1024.webp'

export const FORMULA_LIVERY_ATLASES = Object.freeze({
  player: Object.freeze({
    id: 'player',
    url: playerFormulaLiveryAtlasUrl,
    bodyworkUrl: playerFormulaBodyworkAtlasUrl,
  }),
  aiBlue: Object.freeze({
    id: 'ai-blue',
    url: aiBlueFormulaLiveryAtlasUrl,
    bodyworkUrl: aiBlueFormulaBodyworkAtlasUrl,
  }),
  aiGreen: Object.freeze({
    id: 'ai-green',
    url: aiGreenFormulaLiveryAtlasUrl,
    bodyworkUrl: aiGreenFormulaBodyworkAtlasUrl,
  }),
  aiOrange: Object.freeze({
    id: 'ai-orange',
    url: aiOrangeFormulaLiveryAtlasUrl,
    bodyworkUrl: aiOrangeFormulaBodyworkAtlasUrl,
  }),
})

const FORMULA_CAR_DIMENSIONS = Object.freeze({
  length: 4.82,
  width: 2.18,
  height: 1.28,
  frontWheelRadius: 0.35,
  rearWheelRadius: 0.42,
})

const CARBON = '#111515'
const CARBON_EDGE = '#242a29'
const METAL = '#8d9692'
const TREAD_STRIPE = '#f2d33b'
export const FORMULA_TYRE_SURFACE_VARIANTS = Object.freeze({
  tread: 0,
  outerSidewall: 1,
  innerSidewall: 2,
  wheelCover: 3,
})
export const FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS = Object.freeze({
  cockpitCarbon: 0,
  mechanicalMetal: 1,
  aeroCarbon: 2,
  tintableComposite: 3,
})
const SUSPENSION_STRUTS = Object.freeze([
  [[-0.36, 0.34, -1.18], [-0.82, 0.35, -1.42]],
  [[-0.34, 0.55, -0.95], [-0.82, 0.48, -1.42]],
  [[0.36, 0.34, -1.18], [0.82, 0.35, -1.42]],
  [[0.34, 0.55, -0.95], [0.82, 0.48, -1.42]],
  [[-0.52, 0.34, 0.92], [-0.8, 0.38, 1.28]],
  [[-0.5, 0.58, 0.72], [-0.8, 0.53, 1.28]],
  [[0.52, 0.34, 0.92], [0.8, 0.38, 1.28]],
  [[0.5, 0.58, 0.72], [0.8, 0.53, 1.28]],
])
const FRONT_WING_PLANES = Object.freeze([
  { position: [0, 0.22, -2.27], rotation: [0, 0, 0], size: [2.18, 0.07, 0.38], material: 'carbon' },
  { position: [0, 0.31, -2.1], rotation: [-0.12, 0, 0], size: [1.9, 0.055, 0.22], material: 'accent' },
  { position: [0, 0.38, -1.96], rotation: [-0.19, 0, 0], size: [1.68, 0.045, 0.17], material: 'carbon' },
  { position: [0, 0.43, -1.86], rotation: [-0.24, 0, 0], size: [1.34, 0.035, 0.12], material: 'primary' },
])
const REAR_WING_PLANES = Object.freeze([
  { position: [0, 1.08, 1.88], rotation: [-0.07, 0, 0], size: [1.56, 0.14, 0.34], material: 'primary' },
  { position: [0, 0.9, 1.74], rotation: [-0.16, 0, 0], size: [1.43, 0.085, 0.22], material: 'accent' },
  { position: [0, 0.79, 1.68], rotation: [-0.22, 0, 0], size: [1.32, 0.055, 0.18], material: 'carbon' },
  { position: [0, 0.66, 1.54], rotation: [-0.27, 0, 0], size: [1.16, 0.045, 0.14], material: 'carbon' },
])
const FLOOR_FENCES = Object.freeze([-0.44, -0.2, 0.2, 0.44])
const DIFFUSER_FINS = Object.freeze([-0.52, -0.26, 0.26, 0.52])
const SIDEPOD_LOUVERS = Object.freeze([-0.36, -0.18, 0, 0.18, 0.36])
const REAR_LIGHT_STRIPS = Object.freeze([
  [-0.7, 0.78, 2.06],
  [0, 0.58, 2.1],
  [0.7, 0.78, 2.06],
])
const TYRE_TAG_ANGLES = Object.freeze([-2.18, -0.62, 0.82, 2.28])
const LIVERY_DETAILS = Object.freeze([
  { key: 'nose-number-panel', position: [0, 0.91, -1.03], rotation: [0.08, 0, 0], size: [0.36, 0.026, 0.44], material: 'accent' },
  { key: 'nose-number-left', position: [-0.075, 0.94, -1.03], rotation: [0.08, 0, 0], size: [0.045, 0.031, 0.29], material: 'carbon' },
  { key: 'nose-number-right', position: [0.075, 0.94, -1.03], rotation: [0.08, 0, 0], size: [0.045, 0.031, 0.29], material: 'carbon' },
  { key: 'sharkfin-panel', position: [0, 1.04, 0.96], rotation: [0.08, 0, 0], size: [0.06, 0.46, 0.72], material: 'accent' },
  { key: 'airbox-number-panel', position: [0, 1.23, 0.28], rotation: [0, 0, 0], size: [0.2, 0.055, 0.3], material: 'primary' },
])
const SIDE_DECALS = Object.freeze([
  { offset: -0.42, width: 0.42, material: 'accent' },
  { offset: 0.02, width: 0.5, material: 'primary' },
  { offset: 0.46, width: 0.32, material: 'warm' },
])
const ACTIVE_AERO_MARKERS = Object.freeze([
  { key: 'front-active-hinge-left', position: [-0.58, 0.52, -1.93], rotation: [0, 0, -0.14], size: [0.08, 0.22, 0.08], material: 'metal' },
  { key: 'front-active-hinge-right', position: [0.58, 0.52, -1.93], rotation: [0, 0, 0.14], size: [0.08, 0.22, 0.08], material: 'metal' },
  { key: 'rear-active-hinge-left', position: [-0.42, 1.0, 1.68], rotation: [-0.07, 0, 0], size: [0.09, 0.22, 0.08], material: 'metal' },
  { key: 'rear-active-hinge-right', position: [0.42, 1.0, 1.68], rotation: [-0.07, 0, 0], size: [0.09, 0.22, 0.08], material: 'metal' },
  { key: 'rear-overtake-mode-strip', position: [0, 1.2, 1.7], rotation: [-0.07, 0, 0], size: [1.08, 0.034, 0.04], material: 'lime', emissive: true },
])
const SIDE_SAFETY_LIGHTS = Object.freeze([
  [-0.83, 0.74, 0.46],
  [0.83, 0.74, 0.46],
])
const WHEEL_LAYOUT = Object.freeze([
  { index: 0, side: -1, x: -0.96, z: -1.42, radius: FORMULA_CAR_DIMENSIONS.frontWheelRadius },
  { index: 1, side: 1, x: 0.96, z: -1.42, radius: FORMULA_CAR_DIMENSIONS.frontWheelRadius },
  { index: 2, side: -1, x: -0.96, z: 1.28, radius: FORMULA_CAR_DIMENSIONS.rearWheelRadius },
  { index: 3, side: 1, x: 0.96, z: 1.28, radius: FORMULA_CAR_DIMENSIONS.rearWheelRadius },
])

let sharedFormulaTyreSurfaceAssets = null
let sharedFormulaTyreSurfaceReferenceCount = 0
let sharedFormulaCockpitMechanicalAssets = null
let sharedFormulaCockpitMechanicalReferenceCount = 0

function acquireSharedFormulaTyreSurfaceAssets() {
  if (!sharedFormulaTyreSurfaceAssets) {
    const texture = new THREE.TextureLoader().load(sharedFormulaTyreWheelAtlasUrl)
    texture.name = 'generated-shared-formula-tyre-wheel-surface-atlas'
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 4

    const tyreMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.FrontSide,
    })
    tyreMaterial.name = 'shared-formula-tyre-surface-material'

    const wheelCoverMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.4,
      metalness: 0.58,
      side: THREE.FrontSide,
    })
    wheelCoverMaterial.name = 'shared-formula-wheel-cover-surface-material'
    sharedFormulaTyreSurfaceAssets = { texture, tyreMaterial, wheelCoverMaterial }
  }
  sharedFormulaTyreSurfaceReferenceCount += 1
  return sharedFormulaTyreSurfaceAssets
}

function releaseSharedFormulaTyreSurfaceAssets() {
  sharedFormulaTyreSurfaceReferenceCount = Math.max(
    sharedFormulaTyreSurfaceReferenceCount - 1,
    0,
  )
  if (sharedFormulaTyreSurfaceReferenceCount !== 0 || !sharedFormulaTyreSurfaceAssets) return
  sharedFormulaTyreSurfaceAssets.tyreMaterial.dispose()
  sharedFormulaTyreSurfaceAssets.wheelCoverMaterial.dispose()
  sharedFormulaTyreSurfaceAssets.texture.dispose()
  sharedFormulaTyreSurfaceAssets = null
}

function acquireSharedFormulaCockpitMechanicalAssets() {
  if (!sharedFormulaCockpitMechanicalAssets) {
    const texture = new THREE.TextureLoader().load(
      sharedFormulaCockpitMechanicalAtlasUrl,
    )
    texture.name = 'generated-shared-formula-cockpit-mechanical-surface-atlas'
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 4

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      vertexColors: true,
      roughness: 0.38,
      metalness: 0.58,
      side: THREE.FrontSide,
    })
    material.name = 'shared-formula-cockpit-mechanical-surface-material'
    sharedFormulaCockpitMechanicalAssets = { texture, material }
  }
  sharedFormulaCockpitMechanicalReferenceCount += 1
  return sharedFormulaCockpitMechanicalAssets
}

function releaseSharedFormulaCockpitMechanicalAssets() {
  sharedFormulaCockpitMechanicalReferenceCount = Math.max(
    sharedFormulaCockpitMechanicalReferenceCount - 1,
    0,
  )
  if (
    sharedFormulaCockpitMechanicalReferenceCount !== 0
    || !sharedFormulaCockpitMechanicalAssets
  ) return
  sharedFormulaCockpitMechanicalAssets.material.dispose()
  sharedFormulaCockpitMechanicalAssets.texture.dispose()
  sharedFormulaCockpitMechanicalAssets = null
}

const freezeLiveryPanel = panel => Object.freeze({
  ...panel,
  position: Object.freeze(panel.position),
  rotation: Object.freeze(panel.rotation),
  size: Object.freeze(panel.size),
})

const overlayPosition = (position, normal, distance) => position.map((value, index) => (
  value + normal[index] * distance
))

const FORMULA_BODYWORK_SHELLS = Object.freeze([
  Object.freeze({
    key: 'engine-cover',
    position: Object.freeze([0, 0.74, 0.72]),
    frontWidth: 0.48,
    rearWidth: 0.16,
    frontHeight: 0.62,
    rearHeight: 0.3,
    length: 1.7,
    variant: 0,
  }),
  Object.freeze({
    key: 'monocoque-shoulder',
    position: Object.freeze([0, 0.53, -0.13]),
    frontWidth: 0.38,
    rearWidth: 0.98,
    frontHeight: 0.3,
    rearHeight: 0.7,
    length: 3.18,
    variant: 1,
  }),
  Object.freeze({
    key: 'nose-upper',
    position: Object.freeze([0, 0.39, -1.74]),
    frontWidth: 0.2,
    rearWidth: 0.38,
    frontHeight: 0.16,
    rearHeight: 0.28,
    length: 1.42,
    variant: 2,
  }),
])

const FORMULA_BODYWORK_SIDEPODS = Object.freeze([
  Object.freeze({
    key: 'sidepod-left',
    position: Object.freeze([-0.61, 0.5, 0.25]),
    frontWidth: 0.38,
    rearWidth: 0.68,
    frontHeight: 0.32,
    rearHeight: 0.58,
    length: 1.62,
    outerSideSign: -1,
    variant: 1,
  }),
  Object.freeze({
    key: 'sidepod-right',
    position: Object.freeze([0.61, 0.5, 0.25]),
    frontWidth: 0.38,
    rearWidth: 0.68,
    frontHeight: 0.32,
    rearHeight: 0.58,
    length: 1.62,
    outerSideSign: 1,
    variant: 1,
  }),
])

const frontWingBodyworkPanels = FRONT_WING_PLANES.map((plane, index) => {
  const angle = plane.rotation[0]
  const topNormal = [0, Math.cos(angle), Math.sin(angle)]
  return freezeLiveryPanel({
    key: `front-wing-${index}-top`,
    position: overlayPosition(plane.position, topNormal, plane.size[1] / 2 + 0.002),
    rotation: [angle - Math.PI / 2, 0, 0],
    size: [plane.size[0] - 0.04, plane.size[2] - 0.02],
    variant: 3,
    type: 'plane',
  })
})

const frontEndplateBodyworkPanels = [-1, 1].flatMap(sideSign => [
  freezeLiveryPanel({
    key: `front-endplate-${sideSign < 0 ? 'left' : 'right'}-outer`,
    position: [sideSign * (1.05 + 0.07 / 2 + 0.002), 0.32, -2.22],
    rotation: [0, sideSign * Math.PI / 2, 0],
    size: [0.51, 0.27],
    variant: 3,
    mirrorU: sideSign < 0,
    type: 'plane',
  }),
  freezeLiveryPanel({
    key: `front-endplate-${sideSign < 0 ? 'left' : 'right'}-inner`,
    position: [sideSign * (1.05 - 0.07 / 2 - 0.002), 0.32, -2.22],
    rotation: [0, -sideSign * Math.PI / 2, 0],
    size: [0.51, 0.27],
    variant: 3,
    mirrorU: sideSign > 0,
    type: 'plane',
  }),
])

const floorBodyworkPanels = [
  freezeLiveryPanel({
    key: 'underfloor-rear-face',
    position: [0, 0.18, 1.902],
    rotation: [0, 0, 0],
    size: [1.58, 0.086],
    variant: 3,
    type: 'plane',
  }),
  freezeLiveryPanel({
    key: 'underfloor-rear-deck',
    position: [0, 0.237, 1.4],
    rotation: [-Math.PI / 2, 0, 0],
    size: [1.58, 0.92],
    variant: 3,
    type: 'plane',
  }),
]

export const PLAYER_BODYWORK_GRAPHICS_LAYOUT = Object.freeze([
  ...FORMULA_BODYWORK_SHELLS.flatMap(shell => (
    ['top', 'side'].flatMap(facetBand => (
      [-1, 1].map(sideSign => Object.freeze({
        ...shell,
        key: `${shell.key}-${sideSign < 0 ? 'left' : 'right'}-${facetBand}-facet`,
        facetBand,
        sideSign,
        type: 'shell-facet',
      }))
    ))
  )),
  ...FORMULA_BODYWORK_SIDEPODS.flatMap(shell => [
    ...[-1, 1].map(sideSign => Object.freeze({
      ...shell,
      key: `${shell.key}-${sideSign < 0 ? 'left' : 'right'}-top-facet`,
      facetBand: 'top',
      sideSign,
      type: 'shell-facet',
    })),
    Object.freeze({
      ...shell,
      key: `${shell.key}-outer-side-facet`,
      facetBand: 'side',
      sideSign: shell.outerSideSign,
      type: 'shell-facet',
    }),
  ]),
  ...frontWingBodyworkPanels,
  ...frontEndplateBodyworkPanels,
  ...floorBodyworkPanels,
])

const rearAeroLiveryPanels = REAR_WING_PLANES.slice(1).flatMap((plane, index) => {
  const angle = plane.rotation[0]
  const rearNormal = [0, -Math.sin(angle), Math.cos(angle)]
  const topNormal = [0, Math.cos(angle), Math.sin(angle)]
  return [
    freezeLiveryPanel({
      key: `rear-wing-lower-${index + 1}-rear-face`,
      position: overlayPosition(plane.position, rearNormal, plane.size[2] / 2 + 0.002),
      rotation: [...plane.rotation],
      size: [plane.size[0] - 0.04, Math.max(plane.size[1] - 0.012, 0.025)],
      variant: 0,
    }),
    freezeLiveryPanel({
      key: `rear-wing-lower-${index + 1}-top`,
      position: overlayPosition(plane.position, topNormal, plane.size[1] / 2 + 0.002),
      rotation: [angle - Math.PI / 2, 0, 0],
      size: [plane.size[0] - 0.04, plane.size[2] - 0.02],
      variant: 1,
    }),
  ]
})

const rearEndplateLiveryPanels = [-1, 1].flatMap(sideSign => [
  freezeLiveryPanel({
    key: `rear-endplate-${sideSign < 0 ? 'left' : 'right'}-outer`,
    position: [sideSign * (0.76 + 0.075 / 2 + 0.002), 0.8, 1.81],
    rotation: [0, sideSign * Math.PI / 2, 0],
    size: [0.46, 0.64],
    variant: 3,
    mirrorU: sideSign < 0,
  }),
  freezeLiveryPanel({
    key: `rear-endplate-${sideSign < 0 ? 'left' : 'right'}-inner`,
    position: [sideSign * (0.76 - 0.075 / 2 - 0.002), 0.8, 1.81],
    rotation: [0, -sideSign * Math.PI / 2, 0],
    size: [0.46, 0.64],
    variant: 3,
    mirrorU: sideSign > 0,
  }),
])

const beamWingLiveryPanels = [-0.52, 0.52].map(x => {
  const angle = -0.18
  const topNormal = [0, Math.cos(angle), Math.sin(angle)]
  return freezeLiveryPanel({
    key: `beam-wing-${x < 0 ? 'left' : 'right'}-top`,
    position: overlayPosition([x, 0.58, 1.47], topNormal, 0.045 / 2 + 0.002),
    rotation: [angle - Math.PI / 2, 0, 0],
    size: [0.39, 0.15],
    variant: 1,
    mirrorU: x > 0,
  })
})

export const PLAYER_LIVERY_GRAPHICS_LAYOUT = Object.freeze([
  freezeLiveryPanel({
    key: 'rear-wing-rear-face',
    position: [0, 1.09203, 2.051579],
    rotation: [-0.07, 0, 0],
    size: [1.48, 0.112],
    variant: 0,
  }),
  freezeLiveryPanel({
    key: 'rear-wing-top',
    position: [0, 1.151824, 1.874964],
    rotation: [-Math.PI / 2 - 0.07, 0, 0],
    size: [1.48, 0.3],
    variant: 1,
  }),
  freezeLiveryPanel({
    key: 'monocoque-top-spine',
    position: [0, 0.917066, -0.238903],
    rotation: [-Math.PI / 2 + 0.06, 0, 0],
    size: [0.252, 1.08],
    variant: 2,
  }),
  freezeLiveryPanel({
    key: 'sidepod-top-left',
    position: [-0.61, 0.6695, 0.16],
    rotation: [-Math.PI / 2, 0, 0],
    size: [0.452, 0.78],
    variant: 3,
  }),
  freezeLiveryPanel({
    key: 'sidepod-top-right',
    position: [0.61, 0.6695, 0.16],
    rotation: [-Math.PI / 2, 0, 0],
    size: [0.452, 0.78],
    variant: 3,
    mirrorU: true,
  }),
  ...rearAeroLiveryPanels,
  ...rearEndplateLiveryPanels,
  ...beamWingLiveryPanels,
  freezeLiveryPanel({
    key: 'rear-center-pillar-rear-face',
    position: [0, 0.51, 1.897],
    rotation: [0, 0, 0],
    size: [0.11, 0.65],
    variant: 3,
  }),
])

export function createPlayerLiveryGraphicsGeometry(owner = 'player') {
  const atlasInset = 1 / 1024
  const parts = PLAYER_LIVERY_GRAPHICS_LAYOUT.map(panel => {
    const geometry = new THREE.PlaneGeometry(...panel.size)
    const column = panel.variant % 2
    const row = Math.floor(panel.variant / 2)
    const minU = column * 0.5 + atlasInset
    const maxU = (column + 1) * 0.5 - atlasInset
    const minV = row === 0 ? 0.5 + atlasInset : atlasInset
    const maxV = row === 0 ? 1 - atlasInset : 0.5 - atlasInset
    const uvs = geometry.getAttribute('uv')
    for (let vertex = 0; vertex < uvs.count; vertex += 1) {
      const sourceU = panel.mirrorU ? 1 - uvs.getX(vertex) : uvs.getX(vertex)
      uvs.setXY(
        vertex,
        THREE.MathUtils.lerp(minU, maxU, sourceU),
        THREE.MathUtils.lerp(minV, maxV, uvs.getY(vertex)),
      )
    }
    uvs.needsUpdate = true

    const transform = new THREE.Matrix4().compose(
      new THREE.Vector3(...panel.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...panel.rotation)),
      new THREE.Vector3(1, 1, 1),
    )
    geometry.applyMatrix4(transform)
    return geometry
  })

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  if (!merged) throw new Error('Player livery graphics geometry could not be merged')
  merged.name = `${owner}-formula-livery-graphics-geometry`
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

function getAtlasModuleBounds(variant) {
  const atlasInset = 1 / 1024
  const column = variant % 2
  const row = Math.floor(variant / 2)
  return {
    minU: column * 0.5 + atlasInset,
    maxU: (column + 1) * 0.5 - atlasInset,
    minV: row === 0 ? 0.5 + atlasInset : atlasInset,
    maxV: row === 0 ? 1 - atlasInset : 0.5 - atlasInset,
  }
}

function remapGeometryUvVertices(geometry, vertexIndices, variant) {
  const { minU, maxU, minV, maxV } = getAtlasModuleBounds(variant)
  const uvs = geometry.getAttribute('uv')
  for (const vertex of vertexIndices) {
    const sourceU = THREE.MathUtils.clamp(uvs.getX(vertex), 0, 1)
    const sourceV = THREE.MathUtils.clamp(uvs.getY(vertex), 0, 1)
    uvs.setXY(
      vertex,
      THREE.MathUtils.lerp(minU, maxU, sourceU),
      THREE.MathUtils.lerp(minV, maxV, sourceV),
    )
  }
  uvs.needsUpdate = true
}

function tintGeometryVertices(geometry, color) {
  const tint = new THREE.Color(color)
  const positions = geometry.getAttribute('position')
  const colors = new Float32Array(positions.count * 3)
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    colors[vertex * 3] = tint.r
    colors[vertex * 3 + 1] = tint.g
    colors[vertex * 3 + 2] = tint.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function createStrutGeometry(from, to, radius = 0.027, radialSegments = 6) {
  const start = new THREE.Vector3(...from)
  const end = new THREE.Vector3(...to)
  const direction = end.clone().sub(start)
  const length = direction.length()
  const midpoint = start.clone().add(end).multiplyScalar(0.5)
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  )
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    length,
    radialSegments,
  )
  geometry.applyMatrix4(new THREE.Matrix4().compose(
    midpoint,
    quaternion,
    new THREE.Vector3(1, 1, 1),
  ))
  return geometry
}

export function createFormulaCockpitMechanicalGeometry({
  primary = '#ef3157',
  accent = '#f4f6ef',
  detail = 'hero',
} = {}) {
  if (!['hero', 'race', 'low'].includes(detail)) {
    throw new RangeError(`Unsupported Formula cockpit detail tier: ${detail}`)
  }
  const showHeroDetail = detail === 'hero'
  const showRaceDetail = detail !== 'low'
  const parts = []

  const addPart = ({
    geometry,
    variant,
    color = '#ffffff',
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
  }) => {
    remapGeometryUvVertices(
      geometry,
      Array.from(
        { length: geometry.getAttribute('uv').count },
        (_, index) => index,
      ),
      variant,
    )
    tintGeometryVertices(geometry, color)
    geometry.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    ))
    parts.push(geometry)
  }

  if (showRaceDetail) {
    for (const x of FLOOR_FENCES) {
      addPart({
        geometry: new THREE.BoxGeometry(0.035, 0.28, 1.04),
        variant: FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.aeroCarbon,
        position: [x, 0.31, -0.72],
        rotation: [0.08, 0, 0],
      })
    }
  }

  addPart({
    geometry: new THREE.SphereGeometry(1, 12, 8),
    variant: FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.cockpitCarbon,
    position: [0, 1.04, 0.58],
    scale: [0.2, 0.3, 0.18],
  })
  addPart({
    geometry: new THREE.BoxGeometry(0.16, 0.1, 0.24),
    variant: FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.tintableComposite,
    color: accent,
    position: [0, 1.27, 0.52],
  })

  if (showRaceDetail) {
    for (const x of [-0.64, 0.64]) {
      const support = createStrutGeometry(
        [Math.sign(x) * 0.36, 0.86, -0.18],
        [x, 0.96, -0.32],
      )
      addPart({
        geometry: support,
        variant: FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.mechanicalMetal,
      })
      addPart({
        geometry: new THREE.SphereGeometry(1, 10, 6),
        variant: FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.tintableComposite,
        color: primary,
        position: [x, 0.97, -0.34],
        scale: [0.18, 0.08, 0.11],
      })
    }
  }

  addPart({
    geometry: new THREE.SphereGeometry(1, 16, 8),
    variant: FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.cockpitCarbon,
    position: [0, 0.78, 0.04],
    scale: [0.43, 0.23, 0.63],
  })
  addPart({
    geometry: new THREE.SphereGeometry(1, 16, 10),
    variant: FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.tintableComposite,
    color: accent,
    position: [0, 1.0, 0.08],
    scale: [0.22, 0.24, 0.23],
  })
  addPart({
    geometry: new THREE.TorusGeometry(0.39, 0.045, 7, 22, Math.PI),
    variant: FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.cockpitCarbon,
    position: [0, 1.0, 0.08],
    rotation: [Math.PI / 2, 0, 0],
  })
  addPart({
    geometry: new THREE.BoxGeometry(0.075, 0.075, 0.77),
    variant: FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.cockpitCarbon,
    position: [0, 0.91, -0.27],
    rotation: [0.12, 0, 0],
  })
  addPart({
    geometry: new THREE.CylinderGeometry(0.105, 0.12, 0.3, 12),
    variant: FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.mechanicalMetal,
    position: [0, 0.73, 1.63],
    rotation: [Math.PI / 2, 0, 0],
  })

  if (showHeroDetail) {
    for (const x of DIFFUSER_FINS) {
      addPart({
        geometry: new THREE.BoxGeometry(0.05, 0.23, 0.5),
        variant: FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.aeroCarbon,
        position: [x, 0.23, 1.77],
        rotation: [-0.28, 0, 0],
      })
    }
    for (const [from, to] of SUSPENSION_STRUTS) {
      addPart({
        geometry: createStrutGeometry(from, to),
        variant: FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.mechanicalMetal,
      })
    }
  }

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  if (!merged) {
    throw new Error('Formula cockpit mechanical geometry could not be merged')
  }
  merged.name = `formula-cockpit-mechanical-${detail}-geometry`
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

export function createFormulaTyreSurfaceGeometry(radius, width, side, compact = false) {
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius * 0.985,
    width,
    compact ? 14 : 24,
    1,
  )
  const indices = geometry.getIndex()
  for (const group of geometry.groups) {
    const vertices = new Set()
    for (let offset = group.start; offset < group.start + group.count; offset += 1) {
      vertices.add(indices.getX(offset))
    }
    const variant = group.materialIndex === 0
      ? FORMULA_TYRE_SURFACE_VARIANTS.tread
      : group.materialIndex === 1
        ? (side < 0
            ? FORMULA_TYRE_SURFACE_VARIANTS.outerSidewall
            : FORMULA_TYRE_SURFACE_VARIANTS.innerSidewall)
        : (side < 0
            ? FORMULA_TYRE_SURFACE_VARIANTS.innerSidewall
            : FORMULA_TYRE_SURFACE_VARIANTS.outerSidewall)
    remapGeometryUvVertices(geometry, vertices, variant)
  }
  geometry.name = 'formula-tyre-surface-geometry'
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function createFormulaWheelCoverSurfaceGeometry(radius) {
  const geometry = new THREE.CircleGeometry(radius * 0.52, 24)
  remapGeometryUvVertices(
    geometry,
    Array.from({ length: geometry.getAttribute('uv').count }, (_, index) => index),
    FORMULA_TYRE_SURFACE_VARIANTS.wheelCover,
  )
  geometry.name = 'formula-wheel-cover-surface-geometry'
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createBodyworkShellFacetGeometry(panel) {
  const {
    frontWidth,
    rearWidth,
    frontHeight,
    rearHeight,
    length,
    position,
    sideSign,
    facetBand,
    variant,
  } = panel
  const diagonal = Math.SQRT1_2
  const surfaceOffset = 0.002
  const frontZ = position[2] - length / 2
  const rearZ = position[2] + length / 2
  const sideOffset = facetBand === 'side' ? sideSign * surfaceOffset : 0
  const frontUpper = [
    position[0] + sideSign * frontWidth * diagonal / 2,
    position[1] + frontHeight * diagonal / 2,
    frontZ,
  ]
  const rearUpper = [
    position[0] + sideSign * rearWidth * diagonal / 2,
    position[1] + rearHeight * diagonal / 2,
    rearZ,
  ]
  const frontRidge = [position[0], position[1] + frontHeight / 2, frontZ]
  const rearRidge = [position[0], position[1] + rearHeight / 2, rearZ]
  const frontEquator = [
    position[0] + sideSign * frontWidth / 2,
    position[1],
    frontZ,
  ]
  const rearEquator = [
    position[0] + sideSign * rearWidth / 2,
    position[1],
    rearZ,
  ]
  const baseVertices = facetBand === 'side'
    ? sideSign < 0
      ? [frontUpper, frontEquator, rearEquator, rearUpper]
      : [frontEquator, frontUpper, rearUpper, rearEquator]
    : sideSign < 0
      ? [frontRidge, frontUpper, rearUpper, rearRidge]
      : [frontUpper, frontRidge, rearRidge, rearUpper]
  const vertices = baseVertices.map(([x, y, z]) => [
    x + sideOffset,
    y + surfaceOffset,
    z,
  ])
  const { minU, maxU, minV, maxV } = getAtlasModuleBounds(variant)
  const midU = (minU + maxU) / 2
  const uvs = sideSign < 0
    ? [[midU, minV], [minU, minV], [minU, maxV], [midU, maxV]]
    : [[maxU, minV], [midU, minV], [midU, maxV], [maxU, maxV]]
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs.flat(), 2))
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  geometry.computeVertexNormals()
  return geometry
}

function createBodyworkPlaneGeometry(panel) {
  const geometry = new THREE.PlaneGeometry(...panel.size)
  const { minU, maxU, minV, maxV } = getAtlasModuleBounds(panel.variant)
  const uvs = geometry.getAttribute('uv')
  for (let vertex = 0; vertex < uvs.count; vertex += 1) {
    const sourceU = panel.mirrorU ? 1 - uvs.getX(vertex) : uvs.getX(vertex)
    uvs.setXY(
      vertex,
      THREE.MathUtils.lerp(minU, maxU, sourceU),
      THREE.MathUtils.lerp(minV, maxV, uvs.getY(vertex)),
    )
  }
  uvs.needsUpdate = true
  const transform = new THREE.Matrix4().compose(
    new THREE.Vector3(...panel.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...panel.rotation)),
    new THREE.Vector3(1, 1, 1),
  )
  geometry.applyMatrix4(transform)
  return geometry
}

export function createPlayerBodyworkGraphicsGeometry(ownerId = 'player') {
  const parts = PLAYER_BODYWORK_GRAPHICS_LAYOUT.map(panel => (
    panel.type === 'shell-facet'
      ? createBodyworkShellFacetGeometry(panel)
      : createBodyworkPlaneGeometry(panel)
  ))
  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  if (!merged) throw new Error('Player bodywork graphics geometry could not be merged')
  merged.name = `${ownerId}-formula-bodywork-graphics-geometry`
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

function TaperedShell({
  frontWidth,
  rearWidth,
  frontHeight,
  rearHeight,
  length,
  children,
  ...meshProps
}) {
  const geometry = useMemo(() => {
    const ringSize = 8
    const positions = []
    const indices = []
    for (const [z, width, height] of [
      [-length / 2, frontWidth, frontHeight],
      [length / 2, rearWidth, rearHeight],
    ]) {
      for (let index = 0; index < ringSize; index += 1) {
        const angle = (index / ringSize) * Math.PI * 2
        positions.push(
          Math.cos(angle) * width / 2,
          Math.sin(angle) * height / 2,
          z,
        )
      }
    }
    for (let index = 0; index < ringSize; index += 1) {
      const next = (index + 1) % ringSize
      indices.push(index, next, ringSize + index, next, ringSize + next, ringSize + index)
    }
    for (let index = 1; index < ringSize - 1; index += 1) {
      indices.push(0, index + 1, index)
      indices.push(ringSize, ringSize + index, ringSize + index + 1)
    }
    const buffer = new THREE.BufferGeometry()
    buffer.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    buffer.setIndex(indices)
    buffer.computeVertexNormals()
    buffer.name = 'formula-tapered-shell-geometry'
    return buffer
  }, [frontHeight, frontWidth, length, rearHeight, rearWidth])
  useEffect(() => () => geometry.dispose(), [geometry])

  return <mesh geometry={geometry} {...meshProps}>{children}</mesh>
}

function resolvePaint(material, palette, accent) {
  if (material === 'accent') return accent
  if (material === 'primary') return palette.primary
  if (material === 'highlight') return palette.highlight
  if (material === 'shadow') return palette.shadow
  if (material === 'metal') return METAL
  if (material === 'warm') return TREAD_STRIPE
  if (material === 'lime') return '#bfff35'
  if (material === 'white') return '#f4f6ef'
  if (material === 'red') return '#ff2727'
  return CARBON_EDGE
}

function AeroPlane({ name, plane, palette, accent, castShadow = false }) {
  const color = resolvePaint(plane.material, palette, accent)

  return (
    <mesh name={name} position={plane.position} rotation={plane.rotation} castShadow={castShadow}>
      <boxGeometry args={plane.size} />
      <meshStandardMaterial color={color} roughness={0.38} metalness={0.6} />
    </mesh>
  )
}

function DetailBox({ detail, palette, accent }) {
  const color = resolvePaint(detail.material, palette, accent)
  return (
    <mesh name={detail.key} position={detail.position} rotation={detail.rotation ?? [0, 0, 0]} castShadow={detail.castShadow}>
      <boxGeometry args={detail.size} />
      <meshStandardMaterial
        color={color}
        roughness={detail.material === 'carbon' ? 0.48 : 0.34}
        metalness={detail.material === 'accent' || detail.material === 'primary' ? 0.42 : 0.62}
        emissive={detail.emissive ? color : '#000000'}
        emissiveIntensity={detail.emissive ? 1.8 : 0}
      />
    </mesh>
  )
}

function Wheel({
  index,
  side,
  x,
  z,
  radius,
  wheelRefs,
  surfaceAssets,
  showTyreTags = true,
  compact = false,
}) {
  const width = radius > 0.4 ? 0.34 : 0.29
  if (compact) {
    return (
      <group
        name={`formula-wheel-${index}`}
        ref={(node) => { wheelRefs.current[index] = node }}
        position={[x, radius, z]}
      >
        {surfaceAssets && (
          <mesh
            name="formula-tyre-surface"
            rotation={[0, 0, Math.PI / 2]}
            geometry={surfaceAssets.tyreGeometry}
            material={surfaceAssets.tyreMaterial}
            castShadow
          />
        )}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[radius * 0.34, radius * 0.34, width + 0.018, 10]} />
          <meshStandardMaterial color={METAL} roughness={0.28} metalness={0.88} />
        </mesh>
      </group>
    )
  }

  return (
    <group
      name={`formula-wheel-${index}`}
      ref={(node) => { wheelRefs.current[index] = node }}
      position={[x, radius, z]}
    >
      {surfaceAssets && (
        <mesh
          name="formula-tyre-surface"
          rotation={[0, 0, Math.PI / 2]}
          geometry={surfaceAssets.tyreGeometry}
          material={surfaceAssets.tyreMaterial}
          castShadow
          receiveShadow
        />
      )}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.43, radius * 0.43, width + 0.012, 16]} />
        <meshStandardMaterial color={CARBON_EDGE} roughness={0.3} metalness={0.82} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
        <cylinderGeometry args={[radius * 0.31, radius * 0.31, width + 0.02, 20]} />
        <meshStandardMaterial color="#6c7370" roughness={0.34} metalness={0.9} />
      </mesh>
      {surfaceAssets?.wheelCoverGeometry && (
        <mesh
          name="formula-wheel-cover-surface"
          rotation={[0, side * Math.PI / 2, 0]}
          position={[side * (width / 2 + 0.016), 0, 0]}
          geometry={surfaceAssets.wheelCoverGeometry}
          material={surfaceAssets.wheelCoverMaterial}
        />
      )}
      <mesh position={[side * (width / 2 + 0.022), radius * 0.08, 0]}>
        <boxGeometry args={[0.035, radius * 0.28, radius * 0.13]} />
        <meshStandardMaterial color="#e23c32" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh rotation={[0, side * Math.PI / 2, 0]} position={[side * (width / 2 + 0.008), 0, 0]}>
        <torusGeometry args={[radius * 0.72, 0.018, 5, 28]} />
        <meshStandardMaterial color={TREAD_STRIPE} roughness={0.48} />
      </mesh>
      {showTyreTags && TYRE_TAG_ANGLES.map((angle, tagIndex) => (
        <mesh
          key={`tyre-tag-${tagIndex}`}
          name="formula-tyre-tag"
          position={[
            side * (width / 2 + 0.034),
            Math.cos(angle) * radius * 0.58,
            Math.sin(angle) * radius * 0.58,
          ]}
          rotation={[0, side * Math.PI / 2, angle]}
        >
          <boxGeometry args={[0.014, 0.07, 0.026]} />
          <meshStandardMaterial color={TREAD_STRIPE} roughness={0.44} />
        </mesh>
      ))}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.14, radius * 0.14, width + 0.026, 12]} />
        <meshStandardMaterial color={METAL} roughness={0.24} metalness={0.92} />
      </mesh>
    </group>
  )
}

export default function FormulaCar({
  color = '#ef3157',
  accent = '#f4f6ef',
  isPlayer = false,
  liveryAtlas = null,
  rigidBodyRef,
  detail = 'hero',
}) {
  const rootRef = useRef()
  const wheelRefs = useRef([])
  // The player remains the close-camera hero. AI cars get a race LOD, with an
  // additional low-quality silhouette tier that removes hidden mechanical
  // pieces and multi-element aero while retaining the recognizable outline.
  const showHeroDetail = isPlayer || detail === 'hero'
  const isLowDetail = !isPlayer && detail === 'low'
  const showRaceDetail = !isLowDetail
  const palette = useMemo(() => {
    const primary = new THREE.Color(color)
    return {
      primary: `#${primary.getHexString()}`,
      highlight: `#${primary.clone().lerp(new THREE.Color('#ffffff'), 0.24).getHexString()}`,
      shadow: `#${primary.clone().lerp(new THREE.Color('#050505'), 0.5).getHexString()}`,
    }
  }, [color])
  const resolvedLiveryAtlas = isPlayer ? FORMULA_LIVERY_ATLASES.player : liveryAtlas
  const [liveryAssets, setLiveryAssets] = useState(null)
  const [bodyworkAssets, setBodyworkAssets] = useState(null)
  const [tyreSurfaceAssets, setTyreSurfaceAssets] = useState(null)
  const [cockpitMechanicalAssets, setCockpitMechanicalAssets] = useState(null)

  useEffect(() => {
    if (!resolvedLiveryAtlas) {
      setLiveryAssets(null)
      return undefined
    }
    const geometry = createPlayerLiveryGraphicsGeometry(resolvedLiveryAtlas.id)
    const texture = new THREE.TextureLoader().load(resolvedLiveryAtlas.url)
    texture.name = `generated-${resolvedLiveryAtlas.id}-formula-livery-surface-atlas`
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 4
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.42,
      metalness: 0.44,
      emissive: '#ffffff',
      emissiveMap: texture,
      emissiveIntensity: 0.045,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
    material.name = `${resolvedLiveryAtlas.id}-formula-livery-graphics-material`
    const assets = { geometry, material, texture }
    setLiveryAssets(assets)
    return () => {
      assets.geometry.dispose()
      assets.material.dispose()
      assets.texture.dispose()
    }
  }, [resolvedLiveryAtlas])

  useEffect(() => {
    if (!resolvedLiveryAtlas?.bodyworkUrl) {
      setBodyworkAssets(null)
      return undefined
    }
    const geometry = createPlayerBodyworkGraphicsGeometry(resolvedLiveryAtlas.id)
    const texture = new THREE.TextureLoader().load(resolvedLiveryAtlas.bodyworkUrl)
    texture.name = `generated-${resolvedLiveryAtlas.id}-formula-bodywork-surface-atlas`
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 4
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.4,
      metalness: 0.42,
      emissive: '#ffffff',
      emissiveMap: texture,
      emissiveIntensity: 0.035,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
    material.name = `${resolvedLiveryAtlas.id}-formula-bodywork-graphics-material`
    const assets = { geometry, material, texture }
    setBodyworkAssets(assets)
    return () => {
      assets.geometry.dispose()
      assets.material.dispose()
      assets.texture.dispose()
    }
  }, [resolvedLiveryAtlas])

  useEffect(() => {
    const sharedAssets = acquireSharedFormulaTyreSurfaceAssets()
    const wheels = WHEEL_LAYOUT.map(({ radius, side }) => ({
      tyreGeometry: createFormulaTyreSurfaceGeometry(
        radius,
        radius > 0.4 ? 0.34 : 0.29,
        side,
        isLowDetail,
      ),
      wheelCoverGeometry: isLowDetail
        ? null
        : createFormulaWheelCoverSurfaceGeometry(radius),
      tyreMaterial: sharedAssets.tyreMaterial,
      wheelCoverMaterial: sharedAssets.wheelCoverMaterial,
    }))
    const assets = { compact: isLowDetail, wheels }
    setTyreSurfaceAssets(assets)
    return () => {
      for (const wheel of wheels) {
        wheel.tyreGeometry.dispose()
        wheel.wheelCoverGeometry?.dispose()
      }
      releaseSharedFormulaTyreSurfaceAssets()
    }
  }, [isLowDetail])

  useEffect(() => {
    const detailTier = isLowDetail
      ? 'low'
      : showHeroDetail ? 'hero' : 'race'
    const sharedAssets = acquireSharedFormulaCockpitMechanicalAssets()
    const geometry = createFormulaCockpitMechanicalGeometry({
      primary: palette.primary,
      accent,
      detail: detailTier,
    })
    const assets = {
      detailTier,
      geometry,
      material: sharedAssets.material,
    }
    setCockpitMechanicalAssets(assets)
    return () => {
      geometry.dispose()
      releaseSharedFormulaCockpitMechanicalAssets()
    }
  }, [accent, isLowDetail, palette.primary, showHeroDetail])

  useFrame((state, delta) => {
    const gameState = useGameStore.getState().gameState
    if (gameState !== 'playing') return
    let speedKmh = isPlayer ? Math.abs(useGameStore.getState().speed) : 0
    if (typeof rigidBodyRef?.current?.linvel === 'function') {
      const velocity = rigidBodyRef.current.linvel()
      speedKmh = Math.hypot(velocity.x, velocity.z) * 3.6
    }
    const angularStep = Math.min(speedKmh / 3.6, 95) * Math.min(delta, 0.05)
    wheelRefs.current.forEach((wheel, index) => {
      if (!wheel?.rotation || typeof wheel.rotation.x !== 'number') return
      const radius = index < 2
        ? FORMULA_CAR_DIMENSIONS.frontWheelRadius
        : FORMULA_CAR_DIMENSIONS.rearWheelRadius
      wheel.rotation.x -= angularStep / radius
    })
    if (rootRef.current?.position && typeof rootRef.current.position.y === 'number') {
      const vibration = Math.min(speedKmh / 260, 1) * 0.007
      rootRef.current.position.y = Math.sin(state.clock.elapsedTime * 48) * vibration
    }
  })

  return (
    <group ref={rootRef} name={isPlayer ? 'player-formula-car' : 'ai-formula-car'}>
      {/* Floor, plank and diffuser establish the very low ground-effect stance. */}
      <mesh position={[0, 0.18, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[1.62, 0.11, 3.72]} />
        <meshStandardMaterial color={CARBON} roughness={0.54} metalness={0.62} />
      </mesh>
      <mesh position={[0, 0.105, 0]}>
        <boxGeometry args={[0.34, 0.045, 3.52]} />
        <meshStandardMaterial color="#b8a884" roughness={0.8} metalness={0.08} />
      </mesh>
      {[-0.58, 0.58].map(x => (
        <mesh key={`floor-edge-${x}`} position={[x, 0.235, 0.18]}>
          <boxGeometry args={[0.16, 0.09, 3.05]} />
          <meshStandardMaterial color={accent} roughness={0.48} metalness={0.35} />
        </mesh>
      ))}
      {/* Tapered monocoque, nose and sidepods replace the former box chassis. */}
      <TaperedShell
        name="formula-monocoque"
        position={[0, 0.53, -0.13]}
        frontWidth={0.38}
        rearWidth={0.98}
        frontHeight={0.3}
        rearHeight={0.7}
        length={3.18}
        castShadow
      >
        <meshPhysicalMaterial color={palette.primary} roughness={0.26} metalness={0.34} clearcoat={0.72} clearcoatRoughness={0.2} />
      </TaperedShell>
      {showRaceDetail && LIVERY_DETAILS.map(detail => (
        <DetailBox key={detail.key} detail={detail} palette={palette} accent={accent} />
      ))}
      {showRaceDetail && <mesh position={[0, 0.9, -0.28]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.28, 0.035, 1.28]} />
        <meshStandardMaterial color={accent} roughness={0.3} metalness={0.38} />
      </mesh>}
      <TaperedShell
        position={[0, 0.39, -1.74]}
        frontWidth={0.2}
        rearWidth={0.38}
        frontHeight={0.16}
        rearHeight={0.28}
        length={1.42}
        castShadow
      >
        <meshPhysicalMaterial color={palette.highlight} roughness={0.24} metalness={0.32} clearcoat={0.76} />
      </TaperedShell>
      {[-0.61, 0.61].map(x => (
        <group key={`sidepod-${x}`}>
          <TaperedShell
            position={[x, 0.5, 0.25]}
            frontWidth={0.38}
            rearWidth={0.68}
            frontHeight={0.32}
            rearHeight={0.58}
            length={1.62}
            castShadow
          >
            <meshPhysicalMaterial color={palette.shadow} roughness={0.3} metalness={0.38} clearcoat={0.62} />
          </TaperedShell>
          {showRaceDetail && <mesh position={[x, 0.59, -0.36]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.17, 0.18, 8]} />
            <meshStandardMaterial color={CARBON} roughness={0.78} metalness={0.18} />
          </mesh>}
          {showRaceDetail && <mesh position={[x, 0.64, 0.06]}>
            <boxGeometry args={[0.48, 0.055, 1.02]} />
            <meshStandardMaterial color={accent} roughness={0.38} metalness={0.34} />
          </mesh>}
          {showHeroDetail && SIDE_DECALS.map((detail, index) => (
            <mesh
              key={`sidepod-decal-${x}-${index}`}
              name="formula-sidepod-decal"
              position={[x + Math.sign(x) * 0.018, 0.72, detail.offset]}
              rotation={[0, 0, x > 0 ? -0.18 : 0.18]}
            >
              <boxGeometry args={[0.042, 0.08, detail.width]} />
              <meshStandardMaterial color={resolvePaint(detail.material, palette, accent)} roughness={0.36} metalness={0.36} />
            </mesh>
          ))}
          {showHeroDetail && SIDEPOD_LOUVERS.map((offset, index) => (
            <mesh name="formula-sidepod-louver" key={`sidepod-louver-${x}-${index}`} position={[x, 0.82, -0.22 + offset]} rotation={[0, 0, x > 0 ? -0.18 : 0.18]}>
              <boxGeometry args={[0.05, 0.035, 0.24]} />
              <meshStandardMaterial color={CARBON} roughness={0.52} metalness={0.48} />
            </mesh>
          ))}
        </group>
      ))}
      <TaperedShell
        position={[0, 0.74, 0.72]}
        frontWidth={0.48}
        rearWidth={0.16}
        frontHeight={0.62}
        rearHeight={0.3}
        length={1.7}
        castShadow
      >
        <meshPhysicalMaterial color={palette.primary} roughness={0.28} metalness={0.34} clearcoat={0.7} />
      </TaperedShell>
      {liveryAssets && (
        <mesh
          name={isPlayer ? 'player-formula-livery-graphics' : 'ai-formula-livery-graphics'}
          geometry={liveryAssets.geometry}
          material={liveryAssets.material}
        />
      )}
      {bodyworkAssets && (
        <mesh
          name={isPlayer ? 'player-formula-bodywork-graphics' : 'ai-formula-bodywork-graphics'}
          geometry={bodyworkAssets.geometry}
          material={bodyworkAssets.material}
        />
      )}

      {/* One atlas draw preserves the cockpit, halo and mechanical silhouette. */}
      {cockpitMechanicalAssets && (
        <mesh
          name="formula-cockpit-mechanical-surfaces"
          geometry={cockpitMechanicalAssets.geometry}
          material={cockpitMechanicalAssets.material}
          castShadow
          receiveShadow
        />
      )}

      {/* Multi-element wings and endplates create recognizable aero surfaces. */}
      {(isLowDetail ? FRONT_WING_PLANES.slice(0, 1) : FRONT_WING_PLANES)
        .map(({ position, rotation, size, material }, index) => (
        <AeroPlane
          key={`front-wing-plane-${index}`}
          name={`formula-front-wing-${index}`}
          plane={{ position, rotation, size, material }}
          palette={palette}
          accent={accent}
          castShadow={index === 0}
        />
      ))}
      {showHeroDetail && ACTIVE_AERO_MARKERS.filter(detail => detail.key.startsWith('front')).map(detail => (
        <DetailBox key={detail.key} detail={detail} palette={palette} accent={accent} />
      ))}
      {[-1.05, 1.05].map(x => (
        <mesh key={`front-endplate-${x}`} position={[x, 0.32, -2.22]}>
          <boxGeometry args={[0.07, 0.31, 0.55]} />
          <meshStandardMaterial color={palette.primary} roughness={0.34} metalness={0.54} />
        </mesh>
      ))}
      {showRaceDetail && [-0.86, 0.86].map(x => (
        <mesh key={`front-slot-gap-${x}`} position={[x, 0.44, -2.03]} rotation={[0, 0, x > 0 ? 0.18 : -0.18]}>
          <boxGeometry args={[0.06, 0.24, 0.5]} />
          <meshStandardMaterial color={CARBON} roughness={0.48} metalness={0.58} />
        </mesh>
      ))}
      {(isLowDetail ? REAR_WING_PLANES.slice(0, 1) : REAR_WING_PLANES)
        .map(({ position, rotation, size, material }, index) => (
        <AeroPlane
          key={`rear-wing-plane-${index}`}
          name={`formula-rear-wing-${index}`}
          plane={{ position, rotation, size, material }}
          palette={palette}
          accent={accent}
          castShadow={index === 0}
        />
      ))}
      {showHeroDetail && ACTIVE_AERO_MARKERS.filter(detail => !detail.key.startsWith('front')).map(detail => (
        <DetailBox key={detail.key} detail={detail} palette={palette} accent={accent} />
      ))}
      {[-0.76, 0.76].map(x => (
        <mesh key={`rear-endplate-${x}`} position={[x, 0.8, 1.81]}>
          <boxGeometry args={[0.075, 0.68, 0.5]} />
          <meshStandardMaterial color={CARBON} roughness={0.44} metalness={0.64} />
        </mesh>
      ))}
      {showRaceDetail && [-0.52, 0.52].map(x => (
        <mesh key={`beam-wing-${x}`} position={[x, 0.58, 1.47]} rotation={[-0.18, 0, 0]}>
          <boxGeometry args={[0.42, 0.045, 0.18]} />
          <meshStandardMaterial color={accent} roughness={0.38} metalness={0.48} />
        </mesh>
      ))}
      <mesh position={[0, 0.51, 1.83]}>
        <boxGeometry args={[0.13, 0.7, 0.13]} />
        <meshStandardMaterial color={CARBON_EDGE} roughness={0.4} metalness={0.7} />
      </mesh>
      {REAR_LIGHT_STRIPS.filter((_, index) => showRaceDetail || index === 1).map(([x, y, z], index) => (
        <mesh key={`rear-light-${index}`} position={[x, y, z]}>
          <boxGeometry args={index === 1 ? [0.2, 0.09, 0.05] : [0.055, 0.26, 0.05]} />
          <meshStandardMaterial color="#ff2727" emissive="#d40808" emissiveIntensity={2.7} />
        </mesh>
      ))}
      {showRaceDetail && SIDE_SAFETY_LIGHTS.map(([x, y, z]) => (
        <mesh key={`side-safety-light-${x}`} position={[x, y, z]}>
          <boxGeometry args={[0.05, 0.16, 0.06]} />
          <meshStandardMaterial color="#41d6ff" emissive="#1789ff" emissiveIntensity={1.6} roughness={0.3} />
        </mesh>
      ))}
      {WHEEL_LAYOUT.map(wheel => (
        <Wheel
          key={`wheel-${wheel.index}`}
          {...wheel}
          wheelRefs={wheelRefs}
          surfaceAssets={tyreSurfaceAssets?.compact === isLowDetail
            ? tyreSurfaceAssets.wheels[wheel.index]
            : null}
          showTyreTags={showHeroDetail}
          compact={isLowDetail}
        />
      ))}
    </group>
  )
}
