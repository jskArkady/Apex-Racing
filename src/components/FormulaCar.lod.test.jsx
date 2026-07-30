import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FormulaCar from './FormulaCar'

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

    view.rerender(<FormulaCar isPlayer detail="race" />)
    expect(view.container.querySelector('[name="player-formula-car"]')).toBeTruthy()
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
    expect(lowMeshCount).toBeLessThanOrEqual(Math.floor(raceMeshCount * 0.65))
  })
})
