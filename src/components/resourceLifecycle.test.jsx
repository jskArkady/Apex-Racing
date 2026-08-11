import React from 'react'
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import FormulaCar, { FORMULA_LIVERY_ATLASES } from './FormulaCar'
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

    expect(geometryDispose.mock.calls.length - geometryDisposalsBeforeUnmount).toBe(27)
    expect(materialDispose.mock.calls.length - materialDisposalsBeforeUnmount).toBe(27)
    expect(textureDispose.mock.calls.length - textureDisposalsBeforeUnmount).toBe(26)
  })

  it.each([
    [
      'apex_gp',
      'apex-desert-infield-albedo-512.webp',
      'apex-night-barrier-atlas-1024.webp',
      'apex-night-crowd-panel-1024.webp',
      'grandstand-structure-surface-atlas-1024.webp',
      'pit-complex-structure-surface-atlas-1024.webp',
      'apex-night-pit-garage-facade-1024.webp',
      'apex-night-gantry-display-1024.webp',
      'apex-night-tower-hospitality-atlas-1024.webp',
      'apex-pit-lane-staff-sprite-atlas-1024.webp',
      'apex-tent-canopy-surface-atlas-1024.webp',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'shared-palm-tree-sprite-atlas-1024.webp',
      null,
      'apex-desert-infield-albedo-512.webp',
    ],
    [
      'harbour_street',
      'harbour-hardscape-infield-albedo-1024.webp',
      'harbour-day-barrier-atlas-1024.webp',
      'harbour-day-crowd-panel-1024.webp',
      'grandstand-structure-surface-atlas-1024.webp',
      'pit-complex-structure-surface-atlas-1024.webp',
      'harbour-day-pit-garage-facade-1024.webp',
      'harbour-day-gantry-display-1024.webp',
      null,
      null,
      null,
      null,
      'harbour-tunnel-wall-atlas-1024.webp',
      'harbour-tunnel-ceiling-portal-atlas-1024.webp',
      'harbour-apartment-facade-atlas-1024.webp',
      'harbour-apartment-upper-surface-atlas-1024.webp',
      'harbour-day-retaining-wall-atlas-1024.webp',
      'harbour-marina-quay-promenade-atlas-1024.webp',
      'harbour-swimming-pool-surface-atlas-1024.webp',
      'harbour-open-water-ripple-height-1024.webp',
      'harbour-yacht-facade-atlas-1024.webp',
      'harbour-yacht-upper-surface-atlas-1024.webp',
      'shared-palm-tree-sprite-atlas-1024.webp',
      null,
      null,
    ],
    [
      'temple_speedway',
      'temple-turf-infield-albedo-512.webp',
      'temple-day-barrier-atlas-1024.webp',
      'temple-day-crowd-panel-1024.webp',
      'grandstand-structure-surface-atlas-1024.webp',
      'pit-complex-structure-surface-atlas-1024.webp',
      'temple-day-pit-garage-facade-1024.webp',
      'temple-day-gantry-display-1024.webp',
      null,
      null,
      null,
      'temple-day-banking-timing-atlas-1024.webp',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'temple-tree-sprite-atlas-1024.webp',
      'apex-desert-infield-albedo-512.webp',
    ],
  ])('loads the shared road and venue-specific surface graphics for %s', (
    trackId,
    infieldFile,
    barrierAtlasFile,
    crowdPanelFile,
    grandstandStructureFile,
    pitComplexStructureFile,
    pitGarageFacadeFile,
    gantryDisplayFile,
    apexVenueFacadeFile,
    apexPitStaffBillboardFile,
    apexTentCanopyFile,
    templeVenueFacadeFile,
    tunnelWallFile,
    tunnelCeilingPortalFile,
    buildingFacadeFile,
    apartmentUpperSurfaceFile,
    retainingWallFacadeFile,
    marinaSurfaceFile,
    swimmingPoolSurfaceFile,
    openWaterRippleFile,
    yachtFacadeFile,
    yachtUpperSurfaceFile,
    palmTreeBillboardFile,
    treeBillboardFile,
    gravelRunoffFile,
  ) => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const view = render(<Track track={getTrackPreset(trackId)} />)

    expect(textureLoad).toHaveBeenCalledTimes(
      13
        + Number(Boolean(tunnelWallFile))
        + Number(Boolean(apexVenueFacadeFile))
        + Number(Boolean(apexVenueFacadeFile))
        + Number(Boolean(apexPitStaffBillboardFile))
        + Number(Boolean(apexTentCanopyFile))
        + Number(Boolean(templeVenueFacadeFile))
        + Number(Boolean(tunnelCeilingPortalFile))
        + Number(Boolean(buildingFacadeFile))
        + Number(Boolean(apartmentUpperSurfaceFile))
        + Number(Boolean(retainingWallFacadeFile))
        + Number(Boolean(marinaSurfaceFile))
        + Number(Boolean(swimmingPoolSurfaceFile))
        + Number(Boolean(openWaterRippleFile))
        + Number(Boolean(yachtFacadeFile))
        + Number(Boolean(yachtUpperSurfaceFile))
        + Number(Boolean(palmTreeBillboardFile))
        + Number(Boolean(treeBillboardFile))
        + Number(Boolean(gravelRunoffFile)),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining('track-asphalt-albedo-512.webp'),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining('shared-braking-distance-board-atlas-1024.webp'),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining('shared-trackside-operations-atlas-1024.webp'),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining('shared-track-lighting-signal-atlas-1024.webp'),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining('shared-gantry-structure-surface-atlas-1024.webp'),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining('shared-kerb-surface-atlas-1024.webp'),
    )
    expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(infieldFile))
    expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(barrierAtlasFile))
    expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(crowdPanelFile))
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining(grandstandStructureFile),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining(pitComplexStructureFile),
    )
    expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(pitGarageFacadeFile))
    expect(textureLoad).toHaveBeenCalledWith(expect.stringContaining(gantryDisplayFile))
    expect(view.container.querySelector('[name="track-barrier-graphics"]')).toBeTruthy()
    expect(
      view.container.querySelector('[name="track-braking-distance-boards"]'),
    ).toBeTruthy()
    expect(
      view.container.querySelector('[name="trackside-operations-graphics"]'),
    ).toBeTruthy()
    expect(
      view.container.querySelector('[name="track-lighting-signal-graphics"]'),
    ).toBeTruthy()
    expect(
      view.container.querySelector('[name="track-grandstand-structure-surfaces"]'),
    ).toBeTruthy()
    expect(
      view.container.querySelector('[name="track-pit-complex-structure-surfaces"]'),
    ).toBeTruthy()
    expect(view.container.querySelector('[name="track-kerb-surfaces"]')).toBeTruthy()
    expect(
      view.container.querySelector('[name="track-gantry-structure-surfaces"]'),
    ).toBeTruthy()
    if (apexVenueFacadeFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(apexVenueFacadeFile),
      )
      expect(
        view.container.querySelector('[name="track-apex-venue-facades"]'),
      ).toBeTruthy()
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining('apex-night-race-control-facade-atlas-1024.webp'),
      )
      expect(
        view.container.querySelector('[name="track-apex-race-control-facades"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-apex-venue-facades"]'),
      ).toBeNull()
      expect(
        view.container.querySelector('[name="track-apex-race-control-facades"]'),
      ).toBeNull()
    }
    if (apexPitStaffBillboardFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(apexPitStaffBillboardFile),
      )
      expect(
        view.container.querySelector('[name="track-apex-pit-lane-staff-billboards"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-apex-pit-lane-staff-billboards"]'),
      ).toBeNull()
    }
    if (apexTentCanopyFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(apexTentCanopyFile),
      )
      expect(
        view.container.querySelector('[name="track-apex-tent-canopies"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-apex-tent-canopies"]'),
      ).toBeNull()
    }
    if (templeVenueFacadeFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(templeVenueFacadeFile),
      )
      expect(
        view.container.querySelector('[name="track-temple-venue-facades"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-temple-venue-facades"]'),
      ).toBeNull()
    }
    if (trackId === 'temple_speedway') {
      expect(
        view.container.querySelector('[name="track-temple-grass-verges"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-temple-grass-verges"]'),
      ).toBeNull()
    }
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
    if (apartmentUpperSurfaceFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(apartmentUpperSurfaceFile),
      )
      expect(
        view.container.querySelector('[name="track-harbour-apartment-upper-surfaces"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-harbour-apartment-upper-surfaces"]'),
      ).toBeNull()
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
    if (swimmingPoolSurfaceFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(swimmingPoolSurfaceFile),
      )
      expect(
        view.container.querySelector('[name="track-harbour-swimming-pool-surfaces"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-harbour-swimming-pool-surfaces"]'),
      ).toBeNull()
    }
    if (openWaterRippleFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(openWaterRippleFile),
      )
      expect(
        view.container.querySelector('[name="track-harbour-open-water"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-harbour-open-water"]'),
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
    if (yachtUpperSurfaceFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(yachtUpperSurfaceFile),
      )
      expect(
        view.container.querySelector('[name="track-harbour-yacht-upper-surfaces"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-harbour-yacht-upper-surfaces"]'),
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
    if (palmTreeBillboardFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(palmTreeBillboardFile),
      )
      expect(
        view.container.querySelector('[name="track-palm-tree-billboards"]'),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-palm-tree-billboards"]'),
      ).toBeNull()
    }
    if (gravelRunoffFile) {
      expect(textureLoad).toHaveBeenCalledWith(
        expect.stringContaining(gravelRunoffFile),
      )
      const gravelRunoffMeshName = trackId === 'apex_gp'
        ? 'track-apex-gravel-runoff'
        : 'track-temple-gravel-runoff'
      expect(
        view.container.querySelector(`[name="${gravelRunoffMeshName}"]`),
      ).toBeTruthy()
    } else {
      expect(
        view.container.querySelector('[name="track-apex-gravel-runoff"]'),
      ).toBeNull()
      expect(
        view.container.querySelector('[name="track-temple-gravel-runoff"]'),
      ).toBeNull()
    }
    view.unmount()
  })

  it('configures the shared gantry structure atlas and material', () => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose')
    const view = render(<Track track={getTrackPreset('apex_gp')} />)
    const loadIndex = textureLoad.mock.calls.findIndex(([url]) => (
      url.includes('shared-gantry-structure-surface-atlas-1024.webp')
    ))
    const texture = textureLoad.mock.results[loadIndex]?.value

    expect(loadIndex).toBeGreaterThanOrEqual(0)
    expect(texture).toBeInstanceOf(THREE.Texture)
    expect(texture.name).toBe('generated-shared-gantry-structure-surface-atlas')
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping)
    expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping)
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(texture.magFilter).toBe(THREE.LinearFilter)
    expect(texture.generateMipmaps).toBe(true)
    expect(texture.anisotropy).toBe(4)
    expect(
      view.container.querySelector('[name="track-gantry-structure-surfaces"]'),
    ).toBeTruthy()
    view.unmount()

    const material = materialDispose.mock.contexts.find(candidate => (
      candidate instanceof THREE.MeshStandardMaterial
      && candidate.map === texture
      && candidate.roughness === 0.68
      && candidate.metalness === 0.25
    ))
    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(material.emissiveMap).toBe(texture)
    expect(material.emissiveIntensity).toBe(0.11)
    expect(material.side).toBe(THREE.FrontSide)
  })

  it('configures the shared kerb atlas and tint material', () => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose')
    const view = render(<Track track={getTrackPreset('temple_speedway')} />)
    const loadIndex = textureLoad.mock.calls.findIndex(([url]) => (
      url.includes('shared-kerb-surface-atlas-1024.webp')
    ))
    const texture = textureLoad.mock.results[loadIndex]?.value

    expect(loadIndex).toBeGreaterThanOrEqual(0)
    expect(texture).toBeInstanceOf(THREE.Texture)
    expect(texture.name).toBe('generated-shared-kerb-surface-atlas')
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping)
    expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping)
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(texture.magFilter).toBe(THREE.LinearFilter)
    expect(texture.generateMipmaps).toBe(true)
    expect(texture.anisotropy).toBe(4)
    expect(view.container.querySelector('[name="track-kerb-surfaces"]')).toBeTruthy()
    view.unmount()

    const material = materialDispose.mock.contexts.find(candidate => (
      candidate instanceof THREE.MeshStandardMaterial
      && candidate.map === texture
      && candidate.vertexColors === true
      && candidate.roughness === 0.9
      && candidate.metalness === 0.02
    ))
    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(material.side).toBe(THREE.FrontSide)
  })

  it('tints the shared pit-structure atlas for the Apex marshal-post roofs', () => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose')
    const view = render(<Track track={getTrackPreset('apex_gp')} />)
    const loadIndex = textureLoad.mock.calls.findIndex(([url]) => (
      url.includes('pit-complex-structure-surface-atlas-1024.webp')
    ))
    const texture = textureLoad.mock.results[loadIndex]?.value

    expect(loadIndex).toBeGreaterThanOrEqual(0)
    expect(texture).toBeInstanceOf(THREE.Texture)
    expect(texture.name).toBe('generated-pit-complex-structure-surface-atlas')
    expect(
      view.container.querySelector('[name="track-pit-complex-structure-surfaces"]'),
    ).toBeTruthy()
    view.unmount()

    const material = materialDispose.mock.contexts.find(candidate => (
      candidate instanceof THREE.MeshStandardMaterial
      && candidate.map === texture
      && candidate.vertexColors === true
      && candidate.roughness === 0.86
      && candidate.metalness === 0.08
    ))
    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(material.side).toBe(THREE.DoubleSide)
  })

  it('reuses generated terrain textures for the Temple grass and gravel surfaces', () => {
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose')
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose')
    const textureDispose = vi.spyOn(THREE.Texture.prototype, 'dispose')
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const view = render(<Track track={getTrackPreset('temple_speedway')} />)
    const loadIndex = textureLoad.mock.calls.findIndex(([url]) => (
      url.includes('temple-turf-infield-albedo-512.webp')
    ))
    const texture = textureLoad.mock.results[loadIndex]?.value
    const gravelLoadIndex = textureLoad.mock.calls.findIndex(([url]) => (
      url.includes('apex-desert-infield-albedo-512.webp')
    ))
    const gravelTexture = textureLoad.mock.results[gravelLoadIndex]?.value
    const geometryDisposalsBeforeUnmount = geometryDispose.mock.calls.length
    const materialDisposalsBeforeUnmount = materialDispose.mock.calls.length
    const textureDisposalsBeforeUnmount = textureDispose.mock.calls.length

    expect(loadIndex).toBeGreaterThanOrEqual(0)
    expect(texture.name).toBe('generated-temple-infield-albedo')
    expect(texture.repeat.toArray()).toEqual([70, 70])
    expect(gravelLoadIndex).toBeGreaterThanOrEqual(0)
    expect(gravelTexture.name).toBe('generated-temple-gravel-runoff-albedo')
    expect(gravelTexture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(gravelTexture.wrapS).toBe(THREE.RepeatWrapping)
    expect(gravelTexture.wrapT).toBe(THREE.RepeatWrapping)
    expect(gravelTexture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(gravelTexture.magFilter).toBe(THREE.LinearFilter)
    expect(gravelTexture.anisotropy).toBe(4)
    expect(
      view.container.querySelector('[name="track-temple-grass-verges"]'),
    ).toBeTruthy()
    expect(
      view.container.querySelector('[name="track-temple-gravel-runoff"]'),
    ).toBeTruthy()
    view.unmount()

    expect(geometryDispose.mock.calls.length - geometryDisposalsBeforeUnmount).toBe(21)
    expect(materialDispose.mock.calls.length - materialDisposalsBeforeUnmount).toBe(20)
    expect(textureDispose.mock.calls.length - textureDisposalsBeforeUnmount).toBe(18)
    const material = materialDispose.mock.contexts.find(candidate => (
      candidate instanceof THREE.MeshStandardMaterial
      && candidate.map === texture
      && candidate.vertexColors === true
      && candidate.roughness === 1
      && candidate.metalness === 0
    ))
    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(material.side).toBe(THREE.FrontSide)
    const gravelMaterial = materialDispose.mock.contexts.find(candidate => (
      candidate instanceof THREE.MeshStandardMaterial
      && candidate.map === gravelTexture
      && candidate.vertexColors === true
      && candidate.roughness === 1
      && candidate.metalness === 0
    ))
    expect(gravelMaterial).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(gravelMaterial.side).toBe(THREE.FrontSide)
  })

  it('reuses generated fine gravel across every Apex corner runoff block', () => {
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose')
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose')
    const textureDispose = vi.spyOn(THREE.Texture.prototype, 'dispose')
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const view = render(<Track track={getTrackPreset('apex_gp')} />)
    const gravelLoadIndex = textureLoad.mock.calls.findIndex(([url], index) => (
      url.includes('apex-desert-infield-albedo-512.webp')
      && textureLoad.mock.results[index]?.value?.name === 'generated-apex-gravel-runoff-albedo'
    ))
    const gravelTexture = textureLoad.mock.results[gravelLoadIndex]?.value
    const geometryDisposalsBeforeUnmount = geometryDispose.mock.calls.length
    const materialDisposalsBeforeUnmount = materialDispose.mock.calls.length
    const textureDisposalsBeforeUnmount = textureDispose.mock.calls.length

    expect(gravelLoadIndex).toBeGreaterThanOrEqual(0)
    expect(gravelTexture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(gravelTexture.wrapS).toBe(THREE.RepeatWrapping)
    expect(gravelTexture.wrapT).toBe(THREE.RepeatWrapping)
    expect(gravelTexture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(gravelTexture.magFilter).toBe(THREE.LinearFilter)
    expect(gravelTexture.anisotropy).toBe(4)
    expect(
      view.container.querySelector('[name="track-apex-gravel-runoff"]'),
    ).toBeTruthy()
    view.unmount()

    expect(geometryDispose.mock.calls.length - geometryDisposalsBeforeUnmount).toBe(23)
    expect(materialDispose.mock.calls.length - materialDisposalsBeforeUnmount).toBe(22)
    expect(textureDispose.mock.calls.length - textureDisposalsBeforeUnmount).toBe(21)
    const gravelMaterial = materialDispose.mock.contexts.find(candidate => (
      candidate instanceof THREE.MeshStandardMaterial
      && candidate.map === gravelTexture
      && candidate.vertexColors === true
      && candidate.roughness === 1
      && candidate.metalness === 0
    ))
    expect(gravelMaterial).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(gravelMaterial.side).toBe(THREE.FrontSide)
  })

  it('configures the Harbour hardscape infield at a readable physical scale', () => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const view = render(<Track track={getTrackPreset('harbour_street')} />)
    const loadIndex = textureLoad.mock.calls.findIndex(([url]) => (
      url.includes('harbour-hardscape-infield-albedo-1024.webp')
    ))
    const texture = textureLoad.mock.results[loadIndex]?.value

    expect(loadIndex).toBeGreaterThanOrEqual(0)
    expect(texture).toBeInstanceOf(THREE.Texture)
    expect(texture.name).toBe('generated-harbour-infield-albedo')
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(texture.wrapS).toBe(THREE.RepeatWrapping)
    expect(texture.wrapT).toBe(THREE.RepeatWrapping)
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(texture.magFilter).toBe(THREE.LinearFilter)
    expect(texture.generateMipmaps).toBe(true)
    expect(texture.anisotropy).toBe(4)
    expect(texture.repeat.toArray()).toEqual([28, 28])
    view.unmount()
  })

  it('configures the Harbour apartment upper-surface atlas and material', () => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose')
    const view = render(<Track track={getTrackPreset('harbour_street')} />)
    const loadIndex = textureLoad.mock.calls.findIndex(([url]) => (
      url.includes('harbour-apartment-upper-surface-atlas-1024.webp')
    ))
    const texture = textureLoad.mock.results[loadIndex]?.value

    expect(loadIndex).toBeGreaterThanOrEqual(0)
    expect(texture).toBeInstanceOf(THREE.Texture)
    expect(texture.name).toBe('generated-harbour-apartment-upper-surface-atlas')
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping)
    expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping)
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(texture.magFilter).toBe(THREE.LinearFilter)
    expect(texture.generateMipmaps).toBe(true)
    expect(texture.anisotropy).toBe(4)
    expect(
      view.container.querySelector('[name="track-harbour-apartment-upper-surfaces"]'),
    ).toBeTruthy()
    view.unmount()

    const material = materialDispose.mock.contexts.find(candidate => (
      candidate instanceof THREE.MeshStandardMaterial
      && candidate.map === texture
      && candidate.roughness === 0.78
      && candidate.metalness === 0.04
    ))
    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(material.side).toBe(THREE.FrontSide)
  })

  it('configures the Harbour yacht upper-surface atlas and tint material', () => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose')
    const view = render(<Track track={getTrackPreset('harbour_street')} />)
    const loadIndex = textureLoad.mock.calls.findIndex(([url]) => (
      url.includes('harbour-yacht-upper-surface-atlas-1024.webp')
    ))
    const texture = textureLoad.mock.results[loadIndex]?.value

    expect(loadIndex).toBeGreaterThanOrEqual(0)
    expect(texture).toBeInstanceOf(THREE.Texture)
    expect(texture.name).toBe('generated-harbour-yacht-upper-surface-atlas')
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping)
    expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping)
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(texture.magFilter).toBe(THREE.LinearFilter)
    expect(texture.generateMipmaps).toBe(true)
    expect(texture.anisotropy).toBe(4)
    expect(
      view.container.querySelector('[name="track-harbour-yacht-upper-surfaces"]'),
    ).toBeTruthy()
    view.unmount()

    const material = materialDispose.mock.contexts.find(candidate => (
      candidate instanceof THREE.MeshStandardMaterial
      && candidate.map === texture
      && candidate.roughness === 0.64
      && candidate.metalness === 0.05
      && candidate.vertexColors === true
    ))
    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(material.side).toBe(THREE.FrontSide)
  })

  it('configures the Harbour open-water image as a repeating scalar map', () => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose')
    const view = render(<Track track={getTrackPreset('harbour_street')} />)
    const waterLoadIndex = textureLoad.mock.calls.findIndex(([url]) => (
      url.includes('harbour-open-water-ripple-height-1024.webp')
    ))
    const texture = textureLoad.mock.results[waterLoadIndex]?.value

    expect(waterLoadIndex).toBeGreaterThanOrEqual(0)
    expect(texture).toBeInstanceOf(THREE.Texture)
    expect(texture.name).toBe('generated-harbour-open-water-ripple-height')
    expect(texture.colorSpace).toBe(THREE.NoColorSpace)
    expect(texture.wrapS).toBe(THREE.RepeatWrapping)
    expect(texture.wrapT).toBe(THREE.RepeatWrapping)
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(texture.magFilter).toBe(THREE.LinearFilter)
    expect(texture.generateMipmaps).toBe(true)
    expect(texture.anisotropy).toBe(4)
    expect(texture.repeat.toArray()).toEqual([4, 1])
    expect(texture.offset.toArray()).toEqual([0.17, 0.29])
    expect(
      view.container.querySelector('[name="track-harbour-open-water"]'),
    ).toBeTruthy()
    view.unmount()

    const material = materialDispose.mock.contexts.find(candidate => (
      candidate?.name === 'harbour-open-water-material'
    ))
    expect(material).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect(material.map).toBe(texture)
    expect(material.bumpMap).toBe(texture)
    expect(material.roughnessMap).toBe(texture)
    expect(material.clearcoatRoughnessMap).toBe(texture)
    expect(material.bumpScale).toBe(0.045)
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
    const countNamedDisposals = name => geometryDispose.mock.contexts.filter(
      geometry => geometry?.name === name,
    ).length
    const taperedBeforeUnmount = countNamedDisposals('formula-tapered-shell-geometry')
    const tyreBeforeUnmount = countNamedDisposals('formula-tyre-surface-geometry')
    const coverBeforeUnmount = countNamedDisposals('formula-wheel-cover-surface-geometry')
    const cockpitBeforeUnmount = countNamedDisposals(
      'formula-cockpit-mechanical-hero-geometry',
    )

    view.unmount()

    expect(countNamedDisposals('formula-tapered-shell-geometry') - taperedBeforeUnmount).toBe(5)
    expect(countNamedDisposals('formula-tyre-surface-geometry') - tyreBeforeUnmount).toBe(4)
    expect(countNamedDisposals('formula-wheel-cover-surface-geometry') - coverBeforeUnmount).toBe(4)
    expect(
      countNamedDisposals('formula-cockpit-mechanical-hero-geometry')
      - cockpitBeforeUnmount,
    ).toBe(1)
  })

  it('shares the tyre and cockpit-mechanical atlases across a four-car field', () => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose')
    const textureDispose = vi.spyOn(THREE.Texture.prototype, 'dispose')
    const view = render(
      <>
        <FormulaCar />
        <FormulaCar detail="race" />
        <FormulaCar detail="race" />
        <FormulaCar detail="race" />
      </>,
    )
    const tyreLoads = textureLoad.mock.calls.filter(([url]) => (
      url.includes('shared-formula-tyre-wheel-surface-atlas-1024.webp')
    ))
    const tyreTexture = textureLoad.mock.results[
      textureLoad.mock.calls.findIndex(([url]) => (
        url.includes('shared-formula-tyre-wheel-surface-atlas-1024.webp')
      ))
    ]?.value
    const cockpitLoads = textureLoad.mock.calls.filter(([url]) => (
      url.includes('shared-formula-cockpit-mechanical-surface-atlas-1024.webp')
    ))
    const cockpitTexture = textureLoad.mock.results[
      textureLoad.mock.calls.findIndex(([url]) => (
        url.includes('shared-formula-cockpit-mechanical-surface-atlas-1024.webp')
      ))
    ]?.value

    expect(tyreLoads).toHaveLength(1)
    expect(cockpitLoads).toHaveLength(1)
    expect(tyreTexture).toBeInstanceOf(THREE.Texture)
    expect(tyreTexture.name).toBe('generated-shared-formula-tyre-wheel-surface-atlas')
    expect(tyreTexture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(tyreTexture.wrapS).toBe(THREE.ClampToEdgeWrapping)
    expect(tyreTexture.wrapT).toBe(THREE.ClampToEdgeWrapping)
    expect(tyreTexture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(tyreTexture.magFilter).toBe(THREE.LinearFilter)
    expect(tyreTexture.generateMipmaps).toBe(true)
    expect(tyreTexture.anisotropy).toBe(4)
    expect(cockpitTexture).toBeInstanceOf(THREE.Texture)
    expect(cockpitTexture.name).toBe(
      'generated-shared-formula-cockpit-mechanical-surface-atlas',
    )
    expect(cockpitTexture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(cockpitTexture.wrapS).toBe(THREE.ClampToEdgeWrapping)
    expect(cockpitTexture.wrapT).toBe(THREE.ClampToEdgeWrapping)
    expect(cockpitTexture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(cockpitTexture.magFilter).toBe(THREE.LinearFilter)
    expect(cockpitTexture.generateMipmaps).toBe(true)
    expect(cockpitTexture.anisotropy).toBe(4)
    expect(view.container.querySelectorAll('[name="formula-tyre-surface"]')).toHaveLength(16)
    expect(view.container.querySelectorAll('[name="formula-wheel-cover-surface"]')).toHaveLength(16)
    expect(
      view.container.querySelectorAll('[name="formula-cockpit-mechanical-surfaces"]'),
    ).toHaveLength(4)
    const materialDisposalsBeforeUnmount = materialDispose.mock.calls.length
    const textureDisposalsBeforeUnmount = textureDispose.mock.calls.length
    view.unmount()

    expect(materialDispose.mock.calls.length - materialDisposalsBeforeUnmount).toBe(3)
    expect(textureDispose.mock.calls.length - textureDisposalsBeforeUnmount).toBe(2)
    expect(textureDispose.mock.contexts).toContain(tyreTexture)
    expect(textureDispose.mock.contexts).toContain(cockpitTexture)
    const tyreMaterial = materialDispose.mock.contexts.find(material => (
      material?.name === 'shared-formula-tyre-surface-material'
    ))
    const wheelCoverMaterial = materialDispose.mock.contexts.find(material => (
      material?.name === 'shared-formula-wheel-cover-surface-material'
    ))
    const cockpitMaterial = materialDispose.mock.contexts.find(material => (
      material?.name === 'shared-formula-cockpit-mechanical-surface-material'
    ))
    expect(tyreMaterial).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(tyreMaterial.map).toBe(tyreTexture)
    expect(tyreMaterial.roughness).toBe(0.88)
    expect(tyreMaterial.metalness).toBe(0.02)
    expect(tyreMaterial.side).toBe(THREE.FrontSide)
    expect(wheelCoverMaterial).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(wheelCoverMaterial.map).toBe(tyreTexture)
    expect(wheelCoverMaterial.roughness).toBe(0.4)
    expect(wheelCoverMaterial.metalness).toBe(0.58)
    expect(wheelCoverMaterial.side).toBe(THREE.FrontSide)
    expect(cockpitMaterial).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(cockpitMaterial.map).toBe(cockpitTexture)
    expect(cockpitMaterial.vertexColors).toBe(true)
    expect(cockpitMaterial.roughness).toBe(0.38)
    expect(cockpitMaterial.metalness).toBe(0.58)
    expect(cockpitMaterial.side).toBe(THREE.FrontSide)
  })

  it('loads and disposes the player-only livery and bodywork graphics resources', () => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose')
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose')
    const textureDispose = vi.spyOn(THREE.Texture.prototype, 'dispose')
    const view = render(<FormulaCar isPlayer />)

    expect(textureLoad).toHaveBeenCalledTimes(4)
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining('player-formula-livery-surface-atlas-1024.webp'),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining('player-formula-bodywork-surface-atlas-1024.webp'),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining('shared-formula-tyre-wheel-surface-atlas-1024.webp'),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining(
        'shared-formula-cockpit-mechanical-surface-atlas-1024.webp',
      ),
    )
    const bodyworkLoadIndex = textureLoad.mock.calls.findIndex(([url]) => (
      url.includes('player-formula-bodywork-surface-atlas-1024.webp')
    ))
    const bodyworkTexture = textureLoad.mock.results[bodyworkLoadIndex]?.value
    expect(bodyworkTexture).toBeInstanceOf(THREE.Texture)
    expect(bodyworkTexture.name).toBe('generated-player-formula-bodywork-surface-atlas')
    expect(bodyworkTexture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(bodyworkTexture.wrapS).toBe(THREE.ClampToEdgeWrapping)
    expect(bodyworkTexture.wrapT).toBe(THREE.ClampToEdgeWrapping)
    expect(bodyworkTexture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(bodyworkTexture.magFilter).toBe(THREE.LinearFilter)
    expect(bodyworkTexture.generateMipmaps).toBe(true)
    expect(bodyworkTexture.anisotropy).toBe(4)
    expect(
      view.container.querySelector('[name="player-formula-livery-graphics"]'),
    ).toBeTruthy()
    expect(
      view.container.querySelector('[name="player-formula-bodywork-graphics"]'),
    ).toBeTruthy()

    const geometryDisposalsBeforeUnmount = geometryDispose.mock.calls.length
    const materialDisposalsBeforeUnmount = materialDispose.mock.calls.length
    const textureDisposalsBeforeUnmount = textureDispose.mock.calls.length
    view.unmount()

    expect(
      geometryDispose.mock.calls.length - geometryDisposalsBeforeUnmount,
    ).toBe(16)
    expect(
      materialDispose.mock.calls.length - materialDisposalsBeforeUnmount,
    ).toBe(5)
    expect(
      textureDispose.mock.calls.length - textureDisposalsBeforeUnmount,
    ).toBe(4)
    const bodyworkMaterial = materialDispose.mock.contexts.find(candidate => (
      candidate?.name === 'player-formula-bodywork-graphics-material'
    ))
    expect(bodyworkMaterial).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(bodyworkMaterial.map).toBe(bodyworkTexture)
    expect(bodyworkMaterial.emissiveMap).toBe(bodyworkTexture)
    expect(bodyworkMaterial.roughness).toBe(0.4)
    expect(bodyworkMaterial.metalness).toBe(0.42)
    expect(bodyworkMaterial.emissiveIntensity).toBe(0.035)
    expect(bodyworkMaterial.side).toBe(THREE.FrontSide)
    expect(bodyworkMaterial.polygonOffset).toBe(true)
  })

  it.each([
    ['blue', FORMULA_LIVERY_ATLASES.aiBlue],
    ['green', FORMULA_LIVERY_ATLASES.aiGreen],
    ['orange', FORMULA_LIVERY_ATLASES.aiOrange],
  ])('loads and disposes the generated %s AI livery and bodywork resources', (color, liveryAtlas) => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose')
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose')
    const textureDispose = vi.spyOn(THREE.Texture.prototype, 'dispose')
    const view = render(<FormulaCar detail="race" liveryAtlas={liveryAtlas} />)

    expect(textureLoad).toHaveBeenCalledTimes(4)
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining(`ai-${color}-formula-livery-surface-atlas-1024.webp`),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining(`ai-${color}-formula-bodywork-surface-atlas-1024.webp`),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining('shared-formula-tyre-wheel-surface-atlas-1024.webp'),
    )
    expect(textureLoad).toHaveBeenCalledWith(
      expect.stringContaining(
        'shared-formula-cockpit-mechanical-surface-atlas-1024.webp',
      ),
    )
    expect(
      view.container.querySelector('[name="ai-formula-livery-graphics"]'),
    ).toBeTruthy()
    expect(
      view.container.querySelector('[name="ai-formula-bodywork-graphics"]'),
    ).toBeTruthy()
    const bodyworkLoadIndex = textureLoad.mock.calls.findIndex(([url]) => (
      url.includes(`ai-${color}-formula-bodywork-surface-atlas-1024.webp`)
    ))
    const bodyworkTexture = textureLoad.mock.results[bodyworkLoadIndex]?.value
    expect(bodyworkTexture).toBeInstanceOf(THREE.Texture)
    expect(bodyworkTexture.name).toBe(`generated-ai-${color}-formula-bodywork-surface-atlas`)
    expect(bodyworkTexture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(bodyworkTexture.wrapS).toBe(THREE.ClampToEdgeWrapping)
    expect(bodyworkTexture.wrapT).toBe(THREE.ClampToEdgeWrapping)
    expect(bodyworkTexture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(bodyworkTexture.magFilter).toBe(THREE.LinearFilter)
    expect(bodyworkTexture.generateMipmaps).toBe(true)
    expect(bodyworkTexture.anisotropy).toBe(4)

    const geometryDisposalsBeforeUnmount = geometryDispose.mock.calls.length
    const materialDisposalsBeforeUnmount = materialDispose.mock.calls.length
    const textureDisposalsBeforeUnmount = textureDispose.mock.calls.length
    view.unmount()

    expect(
      geometryDispose.mock.calls.length - geometryDisposalsBeforeUnmount,
    ).toBe(16)
    expect(
      materialDispose.mock.calls.length - materialDisposalsBeforeUnmount,
    ).toBe(5)
    expect(
      textureDispose.mock.calls.length - textureDisposalsBeforeUnmount,
    ).toBe(4)
    const bodyworkMaterial = materialDispose.mock.contexts.find(candidate => (
      candidate?.name === `ai-${color}-formula-bodywork-graphics-material`
    ))
    expect(bodyworkMaterial).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(bodyworkMaterial.map).toBe(bodyworkTexture)
    expect(bodyworkMaterial.emissiveMap).toBe(bodyworkTexture)
    expect(bodyworkMaterial.roughness).toBe(0.4)
    expect(bodyworkMaterial.metalness).toBe(0.42)
    expect(bodyworkMaterial.emissiveIntensity).toBe(0.035)
    expect(bodyworkMaterial.side).toBe(THREE.FrontSide)
    expect(bodyworkMaterial.polygonOffset).toBe(true)
    expect(geometryDispose.mock.contexts.some(candidate => (
      candidate?.name === `ai-${color}-formula-bodywork-graphics-geometry`
    ))).toBe(true)
  })

  it('cleans every player livery allocation during the StrictMode effect cycle', () => {
    const textureLoad = vi.spyOn(THREE.TextureLoader.prototype, 'load')
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose')
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose')
    const textureDispose = vi.spyOn(THREE.Texture.prototype, 'dispose')
    const countLiveryGeometryDisposals = () => geometryDispose.mock.contexts
      .filter(geometry => (
        geometry?.name === 'player-formula-livery-graphics-geometry'
      )).length
    const countBodyworkGeometryDisposals = () => geometryDispose.mock.contexts
      .filter(geometry => (
        geometry?.name === 'player-formula-bodywork-graphics-geometry'
      )).length
    const countCockpitGeometryDisposals = () => geometryDispose.mock.contexts
      .filter(geometry => (
        geometry?.name === 'formula-cockpit-mechanical-hero-geometry'
      )).length
    const view = render(
      <React.StrictMode>
        <FormulaCar isPlayer />
      </React.StrictMode>,
    )

    expect(textureLoad).toHaveBeenCalledTimes(8)
    expect(countLiveryGeometryDisposals()).toBe(1)
    expect(countBodyworkGeometryDisposals()).toBe(1)
    expect(countCockpitGeometryDisposals()).toBe(1)
    expect(materialDispose).toHaveBeenCalledTimes(5)
    expect(textureDispose).toHaveBeenCalledTimes(4)

    view.unmount()

    expect(countLiveryGeometryDisposals()).toBe(2)
    expect(countBodyworkGeometryDisposals()).toBe(2)
    expect(countCockpitGeometryDisposals()).toBe(2)
    expect(materialDispose).toHaveBeenCalledTimes(10)
    expect(textureDispose).toHaveBeenCalledTimes(8)
  })
})
