import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import FormulaCar, {
  FORMULA_LIVERY_ATLASES,
  FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS,
  FORMULA_TYRE_SURFACE_VARIANTS,
  PLAYER_BODYWORK_GRAPHICS_LAYOUT,
  PLAYER_LIVERY_GRAPHICS_LAYOUT,
  createFormulaCockpitMechanicalGeometry,
  createFormulaWheelHardwareGeometry,
  createFormulaTyreSurfaceGeometry,
  createFormulaWheelCoverSurfaceGeometry,
  createPlayerBodyworkGraphicsGeometry,
  createPlayerLiveryGraphicsGeometry,
  getPlayerBodyworkGraphicsLayout,
} from './FormulaCar'

const countMeshes = container => container.querySelectorAll('mesh').length
const countNamed = (container, name) => (
  container.querySelectorAll(`[name="${name}"]`).length
)

function expectCoreRaceSilhouette(container) {
  expect(countNamed(container, 'formula-monocoque')).toBe(1)
  expect(countNamed(container, 'formula-cockpit-mechanical-surfaces')).toBe(1)
  expect(container.querySelectorAll('[name^="formula-front-wing-"]')).toHaveLength(4)
  expect(container.querySelectorAll('[name^="formula-rear-wing-"]')).toHaveLength(4)
  expect(container.querySelectorAll('group[name^="formula-wheel-"]')).toHaveLength(4)
}

describe('FormulaCar visual LOD', () => {
  it('maps the cockpit and mechanical LOD tiers into isolated atlas modules', () => {
    expect(FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS).toEqual({
      cockpitCarbon: 0,
      mechanicalMetal: 1,
      aeroCarbon: 2,
      tintableComposite: 3,
    })

    const expectations = {
      hero: {
        positions: 2119,
        indices: 5736,
        min: [-0.91099888, 0.05038971, -2.28],
        max: [0.91099888, 1.34, 2.04204488],
        variants: [0, 1, 2, 3],
      },
      race: {
        positions: 1367,
        indices: 4512,
        min: [-0.91099888, 0.0825, -2.28],
        max: [0.91099888, 1.34, 1.9],
        variants: [0, 1, 2, 3],
      },
      low: {
        positions: 885,
        indices: 3360,
        min: [-0.81, 0.0825, -1.82],
        max: [0.81, 1.34, 1.9],
        variants: [0, 1, 2, 3],
      },
    }
    const atlasInset = 1 / 1024

    for (const [detail, expected] of Object.entries(expectations)) {
      const geometry = createFormulaCockpitMechanicalGeometry({
        primary: '#2774ff',
        accent: '#f4f6ef',
        detail,
      })
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const colors = geometry.getAttribute('color')
      const indices = geometry.getIndex()

      expect(geometry.name).toBe(`formula-cockpit-mechanical-${detail}-geometry`)
      expect(positions.count).toBe(expected.positions)
      expect(normals.count).toBe(expected.positions)
      expect(uvs.count).toBe(expected.positions)
      expect(colors.count).toBe(expected.positions)
      expect(indices.count).toBe(expected.indices)
      for (const attribute of [positions, normals, uvs, colors]) {
        expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true)
      }

      const usedVariants = new Set()
      for (let vertex = 0; vertex < uvs.count; vertex += 1) {
        const u = uvs.getX(vertex)
        const v = uvs.getY(vertex)
        const column = u < 0.5 ? 0 : 1
        const row = v > 0.5 ? 0 : 1
        const variant = row * 2 + column
        const minU = column * 0.5 + atlasInset
        const maxU = (column + 1) * 0.5 - atlasInset
        const minV = row === 0 ? 0.5 + atlasInset : atlasInset
        const maxV = row === 0 ? 1 - atlasInset : 0.5 - atlasInset
        expect(u).toBeGreaterThanOrEqual(minU)
        expect(u).toBeLessThanOrEqual(maxU)
        expect(v).toBeGreaterThanOrEqual(minV)
        expect(v).toBeLessThanOrEqual(maxV)
        usedVariants.add(variant)
      }
      expect([...usedVariants].sort()).toEqual(expected.variants)

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
        expect(geometricNormal.dot(averageNormal)).toBeGreaterThan(0.95)
      }

      expected.min.forEach((value, axis) => {
        expect(geometry.boundingBox.min.getComponent(axis)).toBeCloseTo(value, 5)
        expect(geometry.boundingBox.max.getComponent(axis)).toBeCloseTo(
          expected.max[axis],
          5,
        )
      })
      geometry.dispose()
    }

    expect(() => createFormulaCockpitMechanicalGeometry({
      detail: 'thumbnail',
    })).toThrow(RangeError)
  })

  it('maps every wheel hub and brake-caliper face into shared hardware modules', () => {
    for (const side of [-1, 1]) {
      const radius = 0.42
      const width = 0.34
      const geometry = createFormulaWheelHardwareGeometry(
        radius,
        width,
        side,
      )
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const colors = geometry.getAttribute('color')
      const indices = geometry.getIndex()

      expect(geometry.name).toBe('formula-wheel-hardware-geometry')
      expect(positions.count).toBe(324)
      expect(normals.count).toBe(324)
      expect(uvs.count).toBe(324)
      expect(colors.count).toBe(324)
      expect(indices.count).toBe(612)
      for (const attribute of [positions, normals, uvs, colors]) {
        expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true)
      }

      const usedVariants = new Set()
      for (let vertex = 0; vertex < uvs.count; vertex += 1) {
        const u = uvs.getX(vertex)
        const v = uvs.getY(vertex)
        expect(u).toBeGreaterThan(0)
        expect(u).toBeLessThan(1)
        expect(v).toBeGreaterThan(0)
        expect(v).toBeLessThan(1)
        usedVariants.add((v > 0.5 ? 0 : 2) + (u > 0.5 ? 1 : 0))
      }
      expect([...usedVariants].sort()).toEqual([
        FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.mechanicalMetal,
        FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.aeroCarbon,
        FORMULA_COCKPIT_MECHANICAL_SURFACE_VARIANTS.tintableComposite,
      ])

      const expectedOuterX = side < 0
        ? [-width / 2 - 0.0395, width / 2 + 0.013]
        : [-width / 2 - 0.013, width / 2 + 0.0395]
      expect(geometry.boundingBox.min.x).toBeCloseTo(expectedOuterX[0], 6)
      expect(geometry.boundingBox.max.x).toBeCloseTo(expectedOuterX[1], 6)
      expect(geometry.boundingBox.min.y).toBeCloseTo(-radius * 0.43, 6)
      expect(geometry.boundingBox.max.y).toBeCloseTo(radius * 0.43, 6)
      expect(geometry.boundingBox.min.z).toBeCloseTo(-radius * 0.43, 6)
      expect(geometry.boundingBox.max.z).toBeCloseTo(radius * 0.43, 6)

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
        expect(geometricNormal.dot(averageNormal)).toBeGreaterThan(0.99)
      }
      geometry.dispose()
    }

    const compact = createFormulaWheelHardwareGeometry(0.35, 0.29, -1, true)
    expect(compact.name).toBe('formula-wheel-hardware-low-geometry')
    expect(compact.getAttribute('position').count).toBe(64)
    expect(compact.getIndex().count).toBe(120)
    expect(compact.boundingBox.min.x).toBeCloseTo(-(0.29 + 0.018) / 2, 6)
    expect(compact.boundingBox.max.x).toBeCloseTo((0.29 + 0.018) / 2, 6)
    expect(compact.boundingBox.min.y).toBeCloseTo(-0.35 * 0.34 * Math.cos(Math.PI / 10), 6)
    expect(compact.boundingBox.max.y).toBeCloseTo(0.35 * 0.34 * Math.cos(Math.PI / 10), 6)
    expect(() => createFormulaWheelHardwareGeometry(0, 0.3, 1)).toThrow(RangeError)
    expect(() => createFormulaWheelHardwareGeometry(0.4, 0.3, 0)).toThrow(RangeError)
    compact.dispose()
  })

  it('maps the tread, both sidewalls, and wheel cover into isolated atlas quadrants', () => {
    expect(FORMULA_TYRE_SURFACE_VARIANTS).toEqual({
      tread: 0,
      outerSidewall: 1,
      innerSidewall: 2,
      wheelCover: 3,
    })

    for (const side of [-1, 1]) {
      const geometry = createFormulaTyreSurfaceGeometry(0.42, 0.34, side)
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      const indices = geometry.getIndex()

      expect(geometry.name).toBe('formula-tyre-surface-geometry')
      expect(positions.count).toBe(148)
      expect(normals.count).toBe(148)
      expect(uvs.count).toBe(148)
      expect(indices.count).toBe(288)
      expect(geometry.groups).toHaveLength(3)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)

      for (const group of geometry.groups) {
        const variant = group.materialIndex === 0
          ? FORMULA_TYRE_SURFACE_VARIANTS.tread
          : group.materialIndex === 1
            ? (side < 0
                ? FORMULA_TYRE_SURFACE_VARIANTS.outerSidewall
                : FORMULA_TYRE_SURFACE_VARIANTS.innerSidewall)
            : (side < 0
                ? FORMULA_TYRE_SURFACE_VARIANTS.innerSidewall
                : FORMULA_TYRE_SURFACE_VARIANTS.outerSidewall)
        const column = variant % 2
        const row = Math.floor(variant / 2)
        const atlasInset = 1 / 1024
        const minU = column * 0.5 + atlasInset
        const maxU = (column + 1) * 0.5 - atlasInset
        const minV = row === 0 ? 0.5 + atlasInset : atlasInset
        const maxV = row === 0 ? 1 - atlasInset : 0.5 - atlasInset
        const vertices = new Set()
        for (let offset = group.start; offset < group.start + group.count; offset += 1) {
          vertices.add(indices.getX(offset))
        }
        for (const vertex of vertices) {
          expect(uvs.getX(vertex)).toBeGreaterThanOrEqual(minU)
          expect(uvs.getX(vertex)).toBeLessThanOrEqual(maxU)
          expect(uvs.getY(vertex)).toBeGreaterThanOrEqual(minV)
          expect(uvs.getY(vertex)).toBeLessThanOrEqual(maxV)
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
        expect(geometricNormal.dot(averageNormal)).toBeGreaterThan(0.99)
      }
      geometry.dispose()
    }

    const cover = createFormulaWheelCoverSurfaceGeometry(0.42)
    const coverUvs = cover.getAttribute('uv')
    expect(cover.name).toBe('formula-wheel-cover-surface-geometry')
    expect(cover.getAttribute('position').count).toBe(26)
    expect(cover.getIndex().count).toBe(72)
    for (let vertex = 0; vertex < coverUvs.count; vertex += 1) {
      expect(coverUvs.getX(vertex)).toBeGreaterThan(0.5)
      expect(coverUvs.getX(vertex)).toBeLessThan(1)
      expect(coverUvs.getY(vertex)).toBeGreaterThan(0)
      expect(coverUvs.getY(vertex)).toBeLessThan(0.5)
    }
    cover.dispose()
  })

  it('maps complete bodywork skins into the matching visual LOD tier', () => {
    expect(Object.isFrozen(PLAYER_BODYWORK_GRAPHICS_LAYOUT)).toBe(true)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT).toHaveLength(80)
    expect(new Set(PLAYER_BODYWORK_GRAPHICS_LAYOUT.map(panel => panel.key)).size).toBe(80)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.every(Object.isFrozen)).toBe(true)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.type === 'shell-facet'
    ))).toHaveLength(40)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.type === 'shell-facet' && panel.facetBand === 'top'
    ))).toHaveLength(10)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.type === 'shell-facet' && panel.facetBand === 'side'
    ))).toHaveLength(10)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.type === 'shell-facet' && panel.facetBand === 'lowerSide'
    ))).toHaveLength(10)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.type === 'shell-facet' && panel.facetBand === 'bottom'
    ))).toHaveLength(10)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.type === 'shell-cap'
    ))).toHaveLength(10)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.key.startsWith('sidepod-')
    ))).toHaveLength(28)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.key.startsWith('front-wing-')
    ))).toHaveLength(4)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.key.startsWith('front-endplate-')
    ))).toHaveLength(2)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.key.startsWith('rear-wing-')
    ))).toHaveLength(4)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.key.startsWith('rear-endplate-')
    ))).toHaveLength(2)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.key.startsWith('beam-wing-')
    ))).toHaveLength(2)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.key.startsWith('underfloor-')
    ))).toHaveLength(2)
    expect(PLAYER_BODYWORK_GRAPHICS_LAYOUT.filter(panel => (
      panel.type === 'box'
    ))).toHaveLength(28)
    expect(() => getPlayerBodyworkGraphicsLayout('cinematic')).toThrow(
      'Unsupported Formula bodywork detail tier: cinematic',
    )

    const atlasInset = 1 / 1024
    const expectations = {
      low: {
        panels: 58,
        positions: 402,
        indices: 708,
        min: [-1.091, 0.137, -2.496],
        max: [1.091, 1.162786, 2.061],
      },
      race: {
        panels: 74,
        positions: 786,
        indices: 1284,
        min: [-1.091, 0.137, -2.496],
        max: [1.091, 1.29911, 2.061],
      },
      hero: {
        panels: 80,
        positions: 930,
        indices: 1500,
        min: [-1.091, 0.137, -2.496],
        max: [1.091, 1.29911, 2.061],
      },
    }

    for (const [detail, expected] of Object.entries(expectations)) {
      const layout = getPlayerBodyworkGraphicsLayout(detail)
      const geometry = createPlayerBodyworkGraphicsGeometry('player', detail)
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')

      expect(layout).toHaveLength(expected.panels)
      expect(positions.count).toBe(expected.positions)
      expect(normals.count).toBe(expected.positions)
      expect(uvs.count).toBe(expected.positions)
      expect(geometry.getIndex().count).toBe(expected.indices)
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)

      let vertexOffset = 0
      layout.forEach((panel) => {
        const column = panel.variant % 2
        const row = Math.floor(panel.variant / 2)
        const minU = column * 0.5 + atlasInset
        const maxU = (column + 1) * 0.5 - atlasInset
        const minV = row === 0 ? 0.5 + atlasInset : atlasInset
        const maxV = row === 0 ? 1 - atlasInset : 0.5 - atlasInset
        const midU = (minU + maxU) / 2
        const vertexCount = panel.type === 'shell-cap'
          ? 9
          : panel.type === 'box' ? 24 : 4
        for (let vertex = vertexOffset; vertex < vertexOffset + vertexCount; vertex += 1) {
          expect(uvs.getX(vertex)).toBeGreaterThanOrEqual(minU)
          expect(uvs.getX(vertex)).toBeLessThanOrEqual(maxU)
          expect(uvs.getY(vertex)).toBeGreaterThanOrEqual(minV)
          expect(uvs.getY(vertex)).toBeLessThanOrEqual(maxV)
          if (panel.type === 'shell-facet') {
            if (panel.sideSign < 0) expect(uvs.getX(vertex)).toBeLessThanOrEqual(midU)
            else expect(uvs.getX(vertex)).toBeGreaterThanOrEqual(midU)
            if (panel.facetBand === 'top') {
              expect(normals.getY(vertex)).toBeGreaterThan(0.5)
            } else if (panel.facetBand === 'side') {
              expect(normals.getY(vertex)).toBeGreaterThan(0.2)
              expect(normals.getX(vertex) * panel.sideSign).toBeGreaterThan(0.8)
            } else if (panel.facetBand === 'lowerSide') {
              expect(normals.getY(vertex)).toBeLessThan(-0.2)
              expect(normals.getX(vertex) * panel.sideSign).toBeGreaterThan(0.8)
            } else {
              expect(normals.getY(vertex)).toBeLessThan(-0.5)
            }
          } else if (panel.type === 'shell-cap') {
            expect(normals.getZ(vertex) * panel.endSign).toBeGreaterThan(0.99999)
          } else if (panel.type === 'plane') {
            const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
            const expectedNormal = new THREE.Vector3(0, 0, 1).applyEuler(
              new THREE.Euler(...panel.rotation),
            )
            expect(normal.dot(expectedNormal)).toBeGreaterThan(0.99999)
          } else {
            expect(new THREE.Vector3().fromBufferAttribute(normals, vertex).length())
              .toBeCloseTo(1, 5)
          }
        }
        vertexOffset += vertexCount
      })

      const indices = geometry.getIndex()
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
        expect(geometricNormal.dot(averageNormal)).toBeGreaterThan(0.99)
      }

      expected.min.forEach((value, axis) => {
        expect(geometry.boundingBox.min.getComponent(axis)).toBeCloseTo(value, 5)
      })
      expected.max.forEach((value, axis) => {
        expect(geometry.boundingBox.max.getComponent(axis)).toBeCloseTo(value, 5)
      })
      geometry.dispose()
    }
  })

  it('maps eighteen finite livery panels across the hero and rear aero surfaces', () => {
    const geometry = createPlayerLiveryGraphicsGeometry()
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')

    expect(Object.isFrozen(PLAYER_LIVERY_GRAPHICS_LAYOUT)).toBe(true)
    expect(PLAYER_LIVERY_GRAPHICS_LAYOUT).toHaveLength(18)
    expect(new Set(PLAYER_LIVERY_GRAPHICS_LAYOUT.map(panel => panel.key)).size).toBe(18)
    expect(PLAYER_LIVERY_GRAPHICS_LAYOUT.filter(panel => (
      panel.key.startsWith('rear-wing-lower-')
    ))).toHaveLength(6)
    expect(PLAYER_LIVERY_GRAPHICS_LAYOUT.filter(panel => (
      panel.key.startsWith('rear-endplate-')
    ))).toHaveLength(4)
    expect(PLAYER_LIVERY_GRAPHICS_LAYOUT.filter(panel => (
      panel.key.startsWith('beam-wing-')
    ))).toHaveLength(2)
    expect(positions.count).toBe(72)
    expect(normals.count).toBe(72)
    expect(uvs.count).toBe(72)
    expect(geometry.getIndex().count).toBe(108)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)

    const atlasInset = 1 / 1024
    PLAYER_LIVERY_GRAPHICS_LAYOUT.forEach((panel, panelIndex) => {
      const column = panel.variant % 2
      const row = Math.floor(panel.variant / 2)
      const minU = column * 0.5 + atlasInset
      const maxU = (column + 1) * 0.5 - atlasInset
      const minV = row === 0 ? 0.5 + atlasInset : atlasInset
      const maxV = row === 0 ? 1 - atlasInset : 0.5 - atlasInset
      for (let vertex = panelIndex * 4; vertex < panelIndex * 4 + 4; vertex += 1) {
        expect(uvs.getX(vertex)).toBeGreaterThanOrEqual(minU)
        expect(uvs.getX(vertex)).toBeLessThanOrEqual(maxU)
        expect(uvs.getY(vertex)).toBeGreaterThanOrEqual(minV)
        expect(uvs.getY(vertex)).toBeLessThanOrEqual(maxV)
        const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
        const expectedNormal = new THREE.Vector3(0, 0, 1).applyEuler(
          new THREE.Euler(...panel.rotation),
        )
        expect(normal.length()).toBeCloseTo(1, 5)
        expect(normal.dot(expectedNormal)).toBeGreaterThan(0.99999)
      }
    })

    const indices = geometry.getIndex()
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
      expect(geometricNormal.dot(averageNormal)).toBeGreaterThan(0.99999)
    }

    const leftSidepodUvStart = 3 * 4
    const rightSidepodUvStart = 4 * 4
    const sidepodMinU = 0.5 + atlasInset
    const sidepodMaxU = 1 - atlasInset
    for (let vertex = 0; vertex < 4; vertex += 1) {
      expect(uvs.getX(rightSidepodUvStart + vertex)).toBeCloseTo(
        sidepodMinU + sidepodMaxU - uvs.getX(leftSidepodUvStart + vertex),
        6,
      )
    }

    expect(geometry.boundingBox.min.x).toBeCloseTo(-0.836, 5)
    expect(geometry.boundingBox.min.y).toBeCloseTo(0.185, 5)
    expect(geometry.boundingBox.min.z).toBeCloseTo(-0.777931, 5)
    expect(geometry.boundingBox.max.x).toBeCloseTo(0.836, 5)
    expect(geometry.boundingBox.max.y).toBeCloseTo(1.162315, 5)
    expect(geometry.boundingBox.max.z).toBeCloseTo(2.055496, 5)
    geometry.dispose()
  })

  it('keeps the default and player cars at hero detail', () => {
    const view = render(<FormulaCar />)

    expectCoreRaceSilhouette(view.container)
    expect(countNamed(view.container, 'formula-tyre-tag')).toBe(16)
    expect(countNamed(view.container, 'formula-sidepod-decal')).toBe(6)
    expect(countNamed(view.container, 'formula-sidepod-louver')).toBe(0)
    expect(countNamed(view.container, 'formula-cockpit-mechanical-surfaces')).toBe(1)
    expect(countNamed(view.container, 'formula-diffuser-fin')).toBe(0)
    expect(countNamed(view.container, 'formula-suspension-strut')).toBe(0)
    expect(countNamed(view.container, 'front-active-hinge-left')).toBe(0)
    expect(countNamed(view.container, 'rear-overtake-mode-strip')).toBe(1)
    expect(countNamed(view.container, 'player-formula-livery-graphics')).toBe(0)
    expect(countNamed(view.container, 'formula-tyre-surface')).toBe(4)
    expect(countNamed(view.container, 'formula-wheel-cover-surface')).toBe(4)
    expect(countNamed(view.container, 'formula-wheel-hardware-surfaces')).toBe(4)

    view.rerender(<FormulaCar isPlayer detail="race" />)
    expect(view.container.querySelector('[name="player-formula-car"]')).toBeTruthy()
    expect(countNamed(view.container, 'player-formula-livery-graphics')).toBe(1)
    expect(countNamed(view.container, 'player-formula-bodywork-graphics')).toBe(1)
    expect(countNamed(view.container, 'formula-tyre-tag')).toBe(16)
    expect(countNamed(view.container, 'formula-sidepod-louver')).toBe(0)
    expect(countNamed(view.container, 'formula-wheel-hardware-surfaces')).toBe(4)
  })

  it('cuts the race mesh count by at least 28 percent', () => {
    const view = render(<FormulaCar detail="hero" />)
    const heroMeshCount = countMeshes(view.container)

    view.rerender(<FormulaCar detail="race" />)
    const raceMeshCount = countMeshes(view.container)

    expect(heroMeshCount).toBeGreaterThan(0)
    expect(raceMeshCount).toBeLessThanOrEqual(Math.floor(heroMeshCount * 0.72))
  })

  it('retains the race silhouette while omitting hero-only micro geometry', () => {
    const { container } = render(<FormulaCar detail="race" />)

    expectCoreRaceSilhouette(container)
    expect(countNamed(container, 'formula-tyre-tag')).toBe(0)
    expect(countNamed(container, 'formula-sidepod-decal')).toBe(0)
    expect(countNamed(container, 'formula-sidepod-louver')).toBe(0)
    expect(countNamed(container, 'formula-diffuser-fin')).toBe(0)
    expect(countNamed(container, 'formula-suspension-strut')).toBe(0)
    expect(countNamed(container, 'front-active-hinge-left')).toBe(0)
    expect(countNamed(container, 'rear-overtake-mode-strip')).toBe(0)
    expect(countNamed(container, 'player-formula-livery-graphics')).toBe(0)
    expect(countNamed(container, 'player-formula-bodywork-graphics')).toBe(0)
    expect(countNamed(container, 'formula-tyre-surface')).toBe(4)
    expect(countNamed(container, 'formula-wheel-cover-surface')).toBe(4)
    expect(countNamed(container, 'formula-wheel-hardware-surfaces')).toBe(4)
  })

  it.each([
    ['blue', FORMULA_LIVERY_ATLASES.aiBlue],
    ['green', FORMULA_LIVERY_ATLASES.aiGreen],
    ['orange', FORMULA_LIVERY_ATLASES.aiOrange],
  ])('applies the generated %s livery to an AI race car', (_, liveryAtlas) => {
    const { container } = render(
      <FormulaCar detail="race" liveryAtlas={liveryAtlas} />,
    )

    expectCoreRaceSilhouette(container)
    expect(countNamed(container, 'ai-formula-livery-graphics')).toBe(1)
    expect(countNamed(container, 'ai-formula-bodywork-graphics')).toBe(1)
    expect(countNamed(container, 'player-formula-livery-graphics')).toBe(0)
    expect(countNamed(container, 'player-formula-bodywork-graphics')).toBe(0)
  })

  it('adds a low-quality silhouette tier below the normal race LOD', () => {
    const view = render(<FormulaCar detail="race" />)
    const raceMeshCount = countMeshes(view.container)

    view.rerender(<FormulaCar detail="low" />)
    const lowMeshCount = countMeshes(view.container)

    expect(countNamed(view.container, 'formula-monocoque')).toBe(1)
    expect(countNamed(view.container, 'formula-cockpit-mechanical-surfaces')).toBe(1)
    expect(view.container.querySelectorAll('group[name^="formula-wheel-"]')).toHaveLength(4)
    expect(view.container.querySelectorAll('[name^="formula-front-wing-"]')).toHaveLength(1)
    expect(view.container.querySelectorAll('[name^="formula-rear-wing-"]')).toHaveLength(1)
    expect(countNamed(view.container, 'player-formula-livery-graphics')).toBe(0)
    expect(countNamed(view.container, 'player-formula-bodywork-graphics')).toBe(0)
    expect(countNamed(view.container, 'formula-tyre-surface')).toBe(4)
    expect(countNamed(view.container, 'formula-wheel-cover-surface')).toBe(0)
    expect(countNamed(view.container, 'formula-wheel-hardware-surfaces')).toBe(4)
    expect(lowMeshCount).toBeLessThanOrEqual(Math.floor(raceMeshCount * 0.65))
  })
})
