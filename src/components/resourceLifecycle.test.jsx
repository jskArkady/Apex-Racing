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

    expect(geometryDispose.mock.calls.length - geometryDisposalsBeforeUnmount).toBe(16)
    expect(materialDispose.mock.calls.length - materialDisposalsBeforeUnmount).toBe(16)
    expect(textureDispose.mock.calls.length - textureDisposalsBeforeUnmount).toBe(14)
  })

  it.each([
    [
      'apex_gp',
      'apex-desert-infield-albedo-512.webp',
      'apex-night-barrier-atlas-1024.webp',
      'apex-night-crowd-panel-1024.webp',
      'apex-night-pit-garage-facade-1024.webp',
      'apex-night-gantry-display-1024.webp',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      'harbour_street',
      'harbour-concrete-infield-albedo-512.webp',
      'harbour-day-barrier-atlas-1024.webp',
      'harbour-day-crowd-panel-1024.webp',
      'harbour-day-pit-garage-facade-1024.webp',
      'harbour-day-gantry-display-1024.webp',
      'harbour-tunnel-wall-atlas-1024.webp',
      'harbour-tunnel-ceiling-portal-atlas-1024.webp',
      'harbour-apartment-facade-atlas-1024.webp',
      'harbour-day-retaining-wall-atlas-1024.webp',
      'harbour-marina-quay-promenade-atlas-1024.webp',
      'harbour-yacht-facade-atlas-1024.webp',
      null,
    ],
    [
      'temple_speedway',
      'temple-turf-infield-albedo-512.webp',
      'temple-day-barrier-atlas-1024.webp',
      'temple-day-crowd-panel-1024.webp',
      'temple-day-pit-garage-facade-1024.webp',
      'temple-day-gantry-display-1024.webp',
      null,
      null,
      null,
      null,
      null,
      null,
      'temple-tree-sprite-atlas-1024.webp',
    ],
  ])('loads the shared road and venue-specific surface graphics for %s', (
    trackId,
    infieldFile,
    barrierAtlasFile,
    crowdPanelFile,
    pitGarageFacadeFile,
    gantryDisplayFile,
    tunnelWallFile,
    tunnelCeilingPortalFile,
    buildingFacadeFile,
    retainingWallFacadeFile,
    marinaSurfaceFile,
    yachtFacadeFile,
    treeBillboardFile,
  ) => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const view = render(<Track track={getTrackPreset(trackId)} />)

    expect(textureLoad).toHaveBeenCalledTimes(
      6
        + Number(Boolean(tunnelWallFile))
        + Number(Boolean(tunnelCeilingPortalFile))
        + Number(Boolean(buildingFacadeFile))
        + Number(Boolean(retainingWallFacadeFile))
        + Number(Boolean(marinaSurfaceFile))
        + Number(Boolean(yachtFacadeFile))
        + Number(Boolean(treeBillboardFile)),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining('track-asphalt-albedo-512.webp'),
    )
    expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(infieldFile))
    expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(barrierAtlasFile))
    expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(crowdPanelFile))
    expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(pitGarageFacadeFile))
    expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(gantryDisplayFile))
    expect(view.container.querySelector('[name="track-barrier-graphics"]')).toBeTruthy()
    if (tunnelWallFile) {
      expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(tunnelWallFile))
      expect(view.container.querySelector('[name="track-harbour-tunnel-walls"]')).toBeTruthy()
    } else {
      expect(view.container.querySelector('[name="track-harbour-tunnel-walls"]')).toBeNull()
    }
    if (tunnelCeilingPortalFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(tunnelCeilingPortalFile),
      )
      expect(
        view.container.querySelector('[name="track-harbour-tunnel-ceiling-portal"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-harbour-tunnel-ceiling-portal"]'),
      ).toBeNull()
    }
    if (buildingFacadeFile) {
      expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(buildingFacadeFile))
      expect(view.container.querySelector('[name="track-harbour-building-facades"]')).toBeTruthy()
    } else {
      expect(view.container.querySelector('[name="track-harbour-building-facades"]')).toBeNull()
    }
    if (retainingWallFacadeFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(retainingWallFacadeFile),
      )
      expect(
        view.container.querySelector('[name="track-harbour-retaining-wall-facades"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-harbour-retaining-wall-facades"]'),
      ).toBeNull()
    }
    if (marinaSurfaceFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(marinaSurfaceFile),
      )
      expect(
        view.container.querySelector('[name="track-harbour-marina-surfaces"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-harbour-marina-surfaces"]'),
      ).toBeNull()
    }
    if (yachtFacadeFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(yachtFacadeFile),
      )
      expect(
        view.container.querySelector('[name="track-harbour-yacht-facades"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-harbour-yacht-facades"]'),
      ).toBeNull()
    }
    if (treeBillboardFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(treeBillboardFile),
      )
      expect(
        view.container.querySelector('[name="track-temple-tree-billboards"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-temple-tree-billboards"]'),
      ).toBeNull()
    }
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
