import React from 'react'
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import FormulaCar from './FormulaCar'
import SkyBackdrop from './SkyBackdrop'
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

  it('scales circuit floodlights with the selected graphics budget', () => {
    const view = render(<Track graphicsQuality="high" />)
    const count = () => view.container
      .querySelectorAll('[name^="circuit-floodlight-"]').length
    const highCount = count()

    expect(highCount).toBeGreaterThan(0)
    view.rerender(<Track graphicsQuality="medium" />)
    expect(count()).toBe(Math.ceil(highCount / 2))
    view.rerender(<Track graphicsQuality="low" />)
    expect(count()).toBe(0)
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
    expect(textureDispose.mock.calls.length - textureDisposalsBeforeUnmount).toBe(4)
  })

  it.each([
    ['apex_gp', 'apex-desert-infield-albedo-512.webp'],
    ['harbour_street', 'harbour-concrete-infield-albedo-512.webp'],
    ['temple_speedway', 'temple-turf-infield-albedo-512.webp'],
  ])('loads the shared asphalt and venue-specific infield albedos for %s', (trackId, infieldFile) => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const view = render(<Track track={getTrackPreset(trackId)} />)

    expect(textureLoad).toHaveBeenCalledTimes(2)
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining('track-asphalt-albedo-512.webp'),
    )
    expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(infieldFile))
    view.unmount()
  })

  it.each([
    ['apex_gp', 'apex-night-sky-panorama-1024.webp'],
    ['harbour_street', 'harbour-day-sky-panorama-1024.webp'],
    ['temple_speedway', 'temple-day-sky-panorama-1024.webp'],
  ])('loads the venue-specific sky panorama for %s', (trackId, skyFile) => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const view = render(<SkyBackdrop track={getTrackPreset(trackId)} />)

    expect(textureLoad).toHaveBeenCalledOnce()
    expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(skyFile))
    view.unmount()
  })

  it('disposes the generated sky panorama when the backdrop unmounts', () => {
    const textureDispose = vi.spyOn(THREE.Texture.prototype, 'dispose')
    const view = render(<SkyBackdrop track={getTrackPreset('apex_gp')} />)
    const disposalsBeforeUnmount = textureDispose.mock.calls.length

    view.unmount()

    expect(textureDispose.mock.calls.length - disposalsBeforeUnmount).toBe(1)
  })

  it('disposes all five custom tapered-shell buffers when a car unmounts', () => {
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose')
    const view = render(<FormulaCar />)
    const disposalsBeforeUnmount = geometryDispose.mock.calls.length

    view.unmount()

    expect(geometryDispose.mock.calls.length - disposalsBeforeUnmount).toBe(5)
  })
})
