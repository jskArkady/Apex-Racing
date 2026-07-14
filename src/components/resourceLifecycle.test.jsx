import React from 'react'
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import FormulaCar from './FormulaCar'
import Track from './Track'
import { getTrackPreset } from '../utils/trackData'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('owned Three.js resource lifecycle', () => {
  it('uses at most six real tunnel lights above low graphics quality', () => {
    const harbour = getTrackPreset('harbour_street')
    const view = render(<Track track={harbour} graphicsQuality="high" />)

    expect(view.container.querySelectorAll('[name^="harbour-tunnel-light-"]')).toHaveLength(6)
    view.rerender(<Track track={harbour} graphicsQuality="medium" />)
    expect(view.container.querySelectorAll('[name^="harbour-tunnel-light-"]')).toHaveLength(3)
    view.rerender(<Track track={harbour} graphicsQuality="low" />)
    expect(view.container.querySelectorAll('[name^="harbour-tunnel-light-"]')).toHaveLength(0)
  })

  it('disposes every externally-created track geometry, material, and texture', () => {
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose')
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose')
    const textureDispose = vi.spyOn(THREE.Texture.prototype, 'dispose')
    const view = render(<Track track={getTrackPreset('harbour_street')} />)
    const geometryDisposalsBeforeUnmount = geometryDispose.mock.calls.length
    const materialDisposalsBeforeUnmount = materialDispose.mock.calls.length
    const textureDisposalsBeforeUnmount = textureDispose.mock.calls.length

    view.unmount()

    expect(geometryDispose.mock.calls.length - geometryDisposalsBeforeUnmount).toBe(6)
    expect(materialDispose.mock.calls.length - materialDisposalsBeforeUnmount).toBe(6)
    expect(textureDispose.mock.calls.length - textureDisposalsBeforeUnmount).toBe(2)
  })

  it('disposes all five custom tapered-shell buffers when a car unmounts', () => {
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose')
    const view = render(<FormulaCar />)
    const disposalsBeforeUnmount = geometryDispose.mock.calls.length

    view.unmount()

    expect(geometryDispose.mock.calls.length - disposalsBeforeUnmount).toBe(5)
  })
})
