import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import FormulaCar, {
  PLAYER_LIVERY_GRAPHICS_LAYOUT,
  createPlayerLiveryGraphicsGeometry,
} from './FormulaCar'

const countMeshes = container => container.querySelectorAll('mesh').length
const countNamed = (container, name) => (
  container.querySelectorAll(`[name="${name}"]`).length
)

function expectCoreRaceSilhouette(container) {
  expect(countNamed(container, 'formula-monocoque')).toBe(1)
  expect(countNamed(container, 'formula-halo')).toBe(1)
  expect(container.querySelectorAll('[name^="formula-front-wing-"]')).toHaveLength(4)
  expect(container.querySelectorAll('[name^="formula-rear-wing-"]')).toHaveLength(4)
  expect(container.querySelectorAll('group[name^="formula-wheel-"]')).toHaveLength(4)
}

describe('FormulaCar visual LOD', () => {
  it('maps five finite player livery panels into isolated atlas quadrants', () => {
    const geometry = createPlayerLiveryGraphicsGeometry()
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const uvs = geometry.getAttribute('uv')

    expect(Object.isFrozen(PLAYER_LIVERY_GRAPHICS_LAYOUT)).toBe(true)
    expect(PLAYER_LIVERY_GRAPHICS_LAYOUT).toHaveLength(5)
    expect(positions.count).toBe(20)
    expect(normals.count).toBe(20)
    expect(uvs.count).toBe(20)
    expect(geometry.getIndex().count).toBe(30)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
    expect(Array.from(uvs.array).every(Number.isFinite)).toBe(true)

    const atlasInset = 1 / 1024
    const expectedNormals = [
      new THREE.Vector3(0, Math.sin(0.07), Math.cos(0.07)),
      new THREE.Vector3(0, Math.cos(0.07), -Math.sin(0.07)),
      new THREE.Vector3(0, Math.cos(0.06), Math.sin(0.06)),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 1, 0),
    ]
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
        expect(normal.length()).toBeCloseTo(1, 5)
        expect(normal.dot(expectedNormals[panelIndex])).toBeGreaterThan(0.99999)
      }
    })

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
    expect(geometry.boundingBox.min.y).toBeCloseTo(0.6695, 5)
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
    expect(countNamed(view.container, 'formula-sidepod-louver')).toBe(10)
    expect(countNamed(view.container, 'formula-diffuser-fin')).toBe(4)
    expect(countNamed(view.container, 'formula-suspension-strut')).toBe(8)
    expect(countNamed(view.container, 'front-active-hinge-left')).toBe(1)
    expect(countNamed(view.container, 'rear-overtake-mode-strip')).toBe(1)
    expect(countNamed(view.container, 'player-formula-livery-graphics')).toBe(0)

    view.rerender(<FormulaCar isPlayer detail="race" />)
    expect(view.container.querySelector('[name="player-formula-car"]')).toBeTruthy()
    expect(countNamed(view.container, 'player-formula-livery-graphics')).toBe(1)
    expect(countNamed(view.container, 'formula-tyre-tag')).toBe(16)
    expect(countNamed(view.container, 'formula-sidepod-louver')).toBe(10)
  })

  it('cuts the race mesh count by at least 35 percent', () => {
    const view = render(<FormulaCar detail="hero" />)
    const heroMeshCount = countMeshes(view.container)

    view.rerender(<FormulaCar detail="race" />)
    const raceMeshCount = countMeshes(view.container)

    expect(heroMeshCount).toBeGreaterThan(0)
    expect(raceMeshCount).toBeLessThanOrEqual(Math.floor(heroMeshCount * 0.65))
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
  })

  it('adds a low-quality silhouette tier below the normal race LOD', () => {
    const view = render(<FormulaCar detail="race" />)
    const raceMeshCount = countMeshes(view.container)

    view.rerender(<FormulaCar detail="low" />)
    const lowMeshCount = countMeshes(view.container)

    expect(countNamed(view.container, 'formula-monocoque')).toBe(1)
    expect(countNamed(view.container, 'formula-halo')).toBe(1)
    expect(view.container.querySelectorAll('group[name^="formula-wheel-"]')).toHaveLength(4)
    expect(view.container.querySelectorAll('[name^="formula-front-wing-"]')).toHaveLength(1)
    expect(view.container.querySelectorAll('[name^="formula-rear-wing-"]')).toHaveLength(1)
    expect(countNamed(view.container, 'player-formula-livery-graphics')).toBe(0)
    expect(lowMeshCount).toBeLessThanOrEqual(Math.floor(raceMeshCount * 0.65))
  })
})
