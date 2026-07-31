import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { RigidBody, TrimeshCollider } from '@react-three/rapier'
import { TriMeshFlags } from '@dimforge/rapier3d-compat'
import apexBarrierAtlasUrl from '../assets/textures/apex-night-barrier-atlas-1024.webp'
import apexCrowdPanelUrl from '../assets/textures/apex-night-crowd-panel-1024.webp'
import apexGantryDisplayUrl from '../assets/textures/apex-night-gantry-display-1024.webp'
import apexInfieldAlbedoUrl from '../assets/textures/apex-desert-infield-albedo-512.webp'
import apexPitGarageFacadeUrl from '../assets/textures/apex-night-pit-garage-facade-1024.webp'
import harbourCrowdPanelUrl from '../assets/textures/harbour-day-crowd-panel-1024.webp'
import harbourGantryDisplayUrl from '../assets/textures/harbour-day-gantry-display-1024.webp'
import harbourInfieldAlbedoUrl from '../assets/textures/harbour-concrete-infield-albedo-512.webp'
import harbourApartmentFacadeAtlasUrl from '../assets/textures/harbour-apartment-facade-atlas-1024.webp'
import harbourBarrierAtlasUrl from '../assets/textures/harbour-day-barrier-atlas-1024.webp'
import harbourPitGarageFacadeUrl from '../assets/textures/harbour-day-pit-garage-facade-1024.webp'
import harbourRetainingWallAtlasUrl from '../assets/textures/harbour-day-retaining-wall-atlas-1024.webp'
import harbourTunnelCeilingPortalAtlasUrl from '../assets/textures/harbour-tunnel-ceiling-portal-atlas-1024.webp'
import harbourTunnelWallAtlasUrl from '../assets/textures/harbour-tunnel-wall-atlas-1024.webp'
import templeCrowdPanelUrl from '../assets/textures/temple-day-crowd-panel-1024.webp'
import templeBarrierAtlasUrl from '../assets/textures/temple-day-barrier-atlas-1024.webp'
import templeGantryDisplayUrl from '../assets/textures/temple-day-gantry-display-1024.webp'
import templeInfieldAlbedoUrl from '../assets/textures/temple-turf-infield-albedo-512.webp'
import templePitGarageFacadeUrl from '../assets/textures/temple-day-pit-garage-facade-1024.webp'
import templeTreeSpriteAtlasUrl from '../assets/textures/temple-tree-sprite-atlas-1024.webp'
import asphaltAlbedoUrl from '../assets/textures/track-asphalt-albedo-512.webp'
import { getTrackPreset } from '../utils/trackData'
import {
  BARRIER_SEGMENTS,
  createBarrierGraphicsGeometry,
  createBarrierGeometry,
  createCatchFenceGeometry,
  createCircuitSceneryGeometry,
  createCircuitGlowGeometry,
  createCrowdPanelGeometry,
  createGantryDisplayGeometry,
  createHarbourBuildingFacadeGeometry,
  createHarbourRetainingWallFacadeGeometry,
  createHarbourTunnelCeilingPortalGeometry,
  createHarbourTunnelWallGeometry,
  createPitGarageFacadeGeometry,
  createRoadColliderGeometry,
  createRoadGeometry,
  createTempleTreeBillboardGeometry,
  getFloodlightPositions,
  getHarbourTunnelLightingLayout,
  HARBOUR_WATER,
  ROAD_SEGMENTS,
} from './trackGeometry'

const HARBOUR_TUNNEL_LIGHT_PRESETS = Object.freeze({
  medium: Object.freeze({ intensity: 38, distance: 30, stride: 2 }),
  high: Object.freeze({ intensity: 52, distance: 34, stride: 1 }),
})
const FLOODLIGHT_STRIDES = Object.freeze({ low: Infinity, medium: 2, high: 1 })
const INFIELD_ALBEDO_BY_VENUE = Object.freeze({
  apex: apexInfieldAlbedoUrl,
  harbour: harbourInfieldAlbedoUrl,
  temple: templeInfieldAlbedoUrl,
})
const BARRIER_ATLAS_BY_VENUE = Object.freeze({
  apex: apexBarrierAtlasUrl,
  harbour: harbourBarrierAtlasUrl,
  temple: templeBarrierAtlasUrl,
})
const CROWD_PANEL_BY_VENUE = Object.freeze({
  apex: apexCrowdPanelUrl,
  harbour: harbourCrowdPanelUrl,
  temple: templeCrowdPanelUrl,
})
const PIT_GARAGE_FACADE_BY_VENUE = Object.freeze({
  apex: apexPitGarageFacadeUrl,
  harbour: harbourPitGarageFacadeUrl,
  temple: templePitGarageFacadeUrl,
})
const GANTRY_DISPLAY_BY_VENUE = Object.freeze({
  apex: apexGantryDisplayUrl,
  harbour: harbourGantryDisplayUrl,
  temple: templeGantryDisplayUrl,
})

function createSurfaceTexture(size, contrast = 0.35) {
  const data = new Uint8Array(size * size * 4)
  let seed = 0x9e3779b9
  for (let index = 0; index < size * size; index += 1) {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    const grain = (seed >>> 24) / 255
    const x = index % size
    const y = Math.floor(index / size)
    const seam = (Math.sin(x * 0.43) + Math.sin(y * 0.17)) * 0.04
    const value = Math.round(154 + (grain - 0.5) * 120 * contrast + seam * 255)
    const offset = index * 4
    data[offset] = value
    data[offset + 1] = value
    data[offset + 2] = value
    data[offset + 3] = 255
  }
  // MeshStandardMaterial samples roughness from the green channel and bump
  // from luminance, so all colour channels intentionally carry the grain.
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

export function createTrackTrimeshArgs(geometry) {
  const positions = geometry?.getAttribute?.('position')?.array
  const sourceIndices = geometry?.getIndex?.()?.array
  if (!(positions instanceof Float32Array) || !sourceIndices) {
    throw new TypeError('Track collider geometry must provide indexed Float32 positions')
  }
  return [
    positions,
    Uint32Array.from(sourceIndices),
    TriMeshFlags.FIX_INTERNAL_EDGES,
  ]
}

export default function Track({ track = getTrackPreset(), graphicsQuality = 'high' }) {
  const activeTrack = track ?? getTrackPreset()
  const activeGraphicsQuality = graphicsQuality
  const trackCurve = activeTrack.curve
  const trackBounds = activeTrack.bounds
  const roadWidth = activeTrack.roadWidth ?? 16
  const assets = useMemo(() => {
    const roadSamples = Math.max(ROAD_SEGMENTS, Math.ceil(activeTrack.length / 3.5))
    const roadGeometry = createRoadGeometry(
      trackCurve,
      roadSamples,
      roadWidth,
    )
    const roadColliderGeometry = createRoadColliderGeometry(
      trackCurve,
      roadSamples,
      roadWidth,
    )
    const barrierSamples = Math.max(
      BARRIER_SEGMENTS,
      Math.ceil(activeTrack.length / 4.25),
    )
    const barrierGeometry = createBarrierGeometry(
      trackCurve,
      barrierSamples,
      roadWidth,
    )
    const barrierGraphicsGeometry = createBarrierGraphicsGeometry(
      trackCurve,
      barrierSamples,
      roadWidth,
    )
    const sceneryGeometry = createCircuitSceneryGeometry(trackCurve, activeTrack.venue, roadWidth)
    const crowdPanelGeometry = createCrowdPanelGeometry(trackCurve, activeTrack.venue)
    const pitGarageFacadeGeometry = createPitGarageFacadeGeometry(trackCurve, activeTrack.venue)
    const gantryDisplayGeometry = createGantryDisplayGeometry(trackCurve, activeTrack.venue)
    const tunnelWallGeometry = activeTrack.venue === 'harbour'
      ? createHarbourTunnelWallGeometry(trackCurve, roadWidth)
      : null
    const tunnelCeilingPortalGeometry = activeTrack.venue === 'harbour'
      ? createHarbourTunnelCeilingPortalGeometry(trackCurve, roadWidth)
      : null
    const buildingFacadeGeometry = activeTrack.venue === 'harbour'
      ? createHarbourBuildingFacadeGeometry(trackCurve)
      : null
    const retainingWallFacadeGeometry = activeTrack.venue === 'harbour'
      ? createHarbourRetainingWallFacadeGeometry(trackCurve, roadWidth)
      : null
    const treeBillboardGeometry = activeTrack.venue === 'temple'
      ? createTempleTreeBillboardGeometry(trackCurve)
      : null
    const glowGeometry = createCircuitGlowGeometry(trackCurve, activeTrack.venue, roadWidth)
    const catchFenceGeometry = createCatchFenceGeometry(
      trackCurve,
      Math.ceil(activeTrack.length / 10),
      roadWidth,
    )
    const asphaltAlbedoTexture = new THREE.TextureLoader().load(asphaltAlbedoUrl)
    asphaltAlbedoTexture.name = 'generated-track-asphalt-albedo'
    asphaltAlbedoTexture.colorSpace = THREE.SRGBColorSpace
    asphaltAlbedoTexture.wrapS = THREE.RepeatWrapping
    asphaltAlbedoTexture.wrapT = THREE.RepeatWrapping
    asphaltAlbedoTexture.minFilter = THREE.LinearMipmapLinearFilter
    asphaltAlbedoTexture.magFilter = THREE.LinearFilter
    asphaltAlbedoTexture.generateMipmaps = true
    asphaltAlbedoTexture.anisotropy = 4
    asphaltAlbedoTexture.repeat.set(7, 110)
    const infieldAlbedoUrl = INFIELD_ALBEDO_BY_VENUE[activeTrack.venue]
    const infieldAlbedoTexture = infieldAlbedoUrl
      ? new THREE.TextureLoader().load(infieldAlbedoUrl)
      : null
    if (infieldAlbedoTexture) {
      infieldAlbedoTexture.name = `generated-${activeTrack.venue}-infield-albedo`
      infieldAlbedoTexture.colorSpace = THREE.SRGBColorSpace
      infieldAlbedoTexture.wrapS = THREE.RepeatWrapping
      infieldAlbedoTexture.wrapT = THREE.RepeatWrapping
      infieldAlbedoTexture.minFilter = THREE.LinearMipmapLinearFilter
      infieldAlbedoTexture.magFilter = THREE.LinearFilter
      infieldAlbedoTexture.generateMipmaps = true
      infieldAlbedoTexture.anisotropy = 2
      infieldAlbedoTexture.repeat.set(70, 70)
    }
    const barrierAtlasUrl = BARRIER_ATLAS_BY_VENUE[activeTrack.venue]
    const barrierAtlasTexture = barrierAtlasUrl
      ? new THREE.TextureLoader().load(barrierAtlasUrl)
      : null
    if (barrierAtlasTexture) {
      barrierAtlasTexture.name = `generated-${activeTrack.venue}-barrier-atlas`
      barrierAtlasTexture.colorSpace = THREE.SRGBColorSpace
      barrierAtlasTexture.wrapS = THREE.ClampToEdgeWrapping
      barrierAtlasTexture.wrapT = THREE.ClampToEdgeWrapping
      barrierAtlasTexture.minFilter = THREE.LinearMipmapLinearFilter
      barrierAtlasTexture.magFilter = THREE.LinearFilter
      barrierAtlasTexture.generateMipmaps = true
      barrierAtlasTexture.anisotropy = 4
    }
    const crowdPanelUrl = CROWD_PANEL_BY_VENUE[activeTrack.venue]
    const crowdPanelTexture = crowdPanelUrl
      ? new THREE.TextureLoader().load(crowdPanelUrl)
      : null
    if (crowdPanelTexture) {
      crowdPanelTexture.name = `generated-${activeTrack.venue}-crowd-panel`
      crowdPanelTexture.colorSpace = THREE.SRGBColorSpace
      crowdPanelTexture.wrapS = THREE.ClampToEdgeWrapping
      crowdPanelTexture.wrapT = THREE.ClampToEdgeWrapping
      crowdPanelTexture.minFilter = THREE.LinearMipmapLinearFilter
      crowdPanelTexture.magFilter = THREE.LinearFilter
      crowdPanelTexture.generateMipmaps = true
      crowdPanelTexture.anisotropy = 2
    }
    const pitGarageFacadeUrl = PIT_GARAGE_FACADE_BY_VENUE[activeTrack.venue]
    const pitGarageFacadeTexture = pitGarageFacadeUrl
      ? new THREE.TextureLoader().load(pitGarageFacadeUrl)
      : null
    if (pitGarageFacadeTexture) {
      pitGarageFacadeTexture.name = `generated-${activeTrack.venue}-pit-garage-facade`
      pitGarageFacadeTexture.colorSpace = THREE.SRGBColorSpace
      pitGarageFacadeTexture.wrapS = THREE.ClampToEdgeWrapping
      pitGarageFacadeTexture.wrapT = THREE.ClampToEdgeWrapping
      pitGarageFacadeTexture.minFilter = THREE.LinearMipmapLinearFilter
      pitGarageFacadeTexture.magFilter = THREE.LinearFilter
      pitGarageFacadeTexture.generateMipmaps = true
      pitGarageFacadeTexture.anisotropy = 2
    }
    const gantryDisplayUrl = GANTRY_DISPLAY_BY_VENUE[activeTrack.venue]
    const gantryDisplayTexture = gantryDisplayUrl
      ? new THREE.TextureLoader().load(gantryDisplayUrl)
      : null
    if (gantryDisplayTexture) {
      gantryDisplayTexture.name = `generated-${activeTrack.venue}-gantry-display`
      gantryDisplayTexture.colorSpace = THREE.SRGBColorSpace
      gantryDisplayTexture.wrapS = THREE.ClampToEdgeWrapping
      gantryDisplayTexture.wrapT = THREE.ClampToEdgeWrapping
      gantryDisplayTexture.minFilter = THREE.LinearMipmapLinearFilter
      gantryDisplayTexture.magFilter = THREE.LinearFilter
      gantryDisplayTexture.generateMipmaps = true
      gantryDisplayTexture.anisotropy = 2
    }
    const tunnelWallTexture = activeTrack.venue === 'harbour'
      ? new THREE.TextureLoader().load(harbourTunnelWallAtlasUrl)
      : null
    if (tunnelWallTexture) {
      tunnelWallTexture.name = 'generated-harbour-tunnel-wall-atlas'
      tunnelWallTexture.colorSpace = THREE.SRGBColorSpace
      tunnelWallTexture.wrapS = THREE.ClampToEdgeWrapping
      tunnelWallTexture.wrapT = THREE.ClampToEdgeWrapping
      tunnelWallTexture.minFilter = THREE.LinearMipmapLinearFilter
      tunnelWallTexture.magFilter = THREE.LinearFilter
      tunnelWallTexture.generateMipmaps = true
      tunnelWallTexture.anisotropy = 4
    }
    const tunnelCeilingPortalTexture = activeTrack.venue === 'harbour'
      ? new THREE.TextureLoader().load(harbourTunnelCeilingPortalAtlasUrl)
      : null
    if (tunnelCeilingPortalTexture) {
      tunnelCeilingPortalTexture.name = 'generated-harbour-tunnel-ceiling-portal-atlas'
      tunnelCeilingPortalTexture.colorSpace = THREE.SRGBColorSpace
      tunnelCeilingPortalTexture.wrapS = THREE.ClampToEdgeWrapping
      tunnelCeilingPortalTexture.wrapT = THREE.ClampToEdgeWrapping
      tunnelCeilingPortalTexture.minFilter = THREE.LinearMipmapLinearFilter
      tunnelCeilingPortalTexture.magFilter = THREE.LinearFilter
      tunnelCeilingPortalTexture.generateMipmaps = true
      tunnelCeilingPortalTexture.anisotropy = 4
    }
    const buildingFacadeTexture = activeTrack.venue === 'harbour'
      ? new THREE.TextureLoader().load(harbourApartmentFacadeAtlasUrl)
      : null
    if (buildingFacadeTexture) {
      buildingFacadeTexture.name = 'generated-harbour-apartment-facade-atlas'
      buildingFacadeTexture.colorSpace = THREE.SRGBColorSpace
      buildingFacadeTexture.wrapS = THREE.ClampToEdgeWrapping
      buildingFacadeTexture.wrapT = THREE.ClampToEdgeWrapping
      buildingFacadeTexture.minFilter = THREE.LinearMipmapLinearFilter
      buildingFacadeTexture.magFilter = THREE.LinearFilter
      buildingFacadeTexture.generateMipmaps = true
      buildingFacadeTexture.anisotropy = 4
    }
    const retainingWallFacadeTexture = activeTrack.venue === 'harbour'
      ? new THREE.TextureLoader().load(harbourRetainingWallAtlasUrl)
      : null
    if (retainingWallFacadeTexture) {
      retainingWallFacadeTexture.name = 'generated-harbour-retaining-wall-atlas'
      retainingWallFacadeTexture.colorSpace = THREE.SRGBColorSpace
      retainingWallFacadeTexture.wrapS = THREE.ClampToEdgeWrapping
      retainingWallFacadeTexture.wrapT = THREE.ClampToEdgeWrapping
      retainingWallFacadeTexture.minFilter = THREE.LinearMipmapLinearFilter
      retainingWallFacadeTexture.magFilter = THREE.LinearFilter
      retainingWallFacadeTexture.generateMipmaps = true
      retainingWallFacadeTexture.anisotropy = 4
    }
    const treeBillboardTexture = activeTrack.venue === 'temple'
      ? new THREE.TextureLoader().load(templeTreeSpriteAtlasUrl)
      : null
    if (treeBillboardTexture) {
      treeBillboardTexture.name = 'generated-temple-tree-sprite-atlas'
      treeBillboardTexture.colorSpace = THREE.SRGBColorSpace
      treeBillboardTexture.wrapS = THREE.ClampToEdgeWrapping
      treeBillboardTexture.wrapT = THREE.ClampToEdgeWrapping
      treeBillboardTexture.minFilter = THREE.LinearMipmapLinearFilter
      treeBillboardTexture.magFilter = THREE.LinearFilter
      treeBillboardTexture.generateMipmaps = true
      treeBillboardTexture.anisotropy = 2
    }
    const asphaltTexture = createSurfaceTexture(128, 0.5)
    asphaltTexture.repeat.set(7, 110)
    const terrainTexture = createSurfaceTexture(96, 0.8)
    terrainTexture.repeat.set(70, 70)

    return {
      roadGeometry,
      roadColliderGeometry,
      barrierGeometry,
      barrierGraphicsGeometry,
      sceneryGeometry,
      crowdPanelGeometry,
      pitGarageFacadeGeometry,
      gantryDisplayGeometry,
      tunnelWallGeometry,
      tunnelCeilingPortalGeometry,
      buildingFacadeGeometry,
      retainingWallFacadeGeometry,
      treeBillboardGeometry,
      glowGeometry,
      catchFenceGeometry,
      asphaltAlbedoTexture,
      infieldAlbedoTexture,
      barrierAtlasTexture,
      crowdPanelTexture,
      pitGarageFacadeTexture,
      gantryDisplayTexture,
      tunnelWallTexture,
      tunnelCeilingPortalTexture,
      buildingFacadeTexture,
      retainingWallFacadeTexture,
      treeBillboardTexture,
      asphaltTexture,
      terrainTexture,
      roadColliderArgs: createTrackTrimeshArgs(roadColliderGeometry),
      barrierColliderArgs: createTrackTrimeshArgs(barrierGeometry),
      floodlights: getFloodlightPositions(trackCurve, activeTrack.venue, roadWidth),
      tunnelLights: activeTrack.venue === 'harbour'
        ? getHarbourTunnelLightingLayout(trackCurve, roadWidth).lights
        : [],
      roadMaterial: new THREE.MeshStandardMaterial({
        color: activeTrack.theme.roadColor,
        map: asphaltAlbedoTexture,
        roughness: activeTrack.venue === 'harbour' ? 0.78 : 0.9,
        roughnessMap: asphaltTexture,
        bumpMap: asphaltTexture,
        bumpScale: activeTrack.venue === 'harbour' ? 0.022 : 0.035,
        metalness: 0.04,
      }),
      barrierMaterial: new THREE.MeshStandardMaterial({
        color: activeTrack.theme.barrierColor ?? '#bec4be',
        roughness: activeTrack.venue === 'harbour' ? 0.28 : 0.44,
        metalness: activeTrack.venue === 'harbour' ? 0.78 : 0.62,
      }),
      barrierGraphicsMaterial: barrierAtlasTexture
        ? new THREE.MeshStandardMaterial({
          map: barrierAtlasTexture,
          roughness: activeTrack.venue === 'apex' ? 0.9 : 0.48,
          metalness: activeTrack.venue === 'apex' ? 0.04 : 0.64,
        })
        : null,
      sceneryMaterial: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.62,
        metalness: 0.18,
      }),
      crowdPanelMaterial: crowdPanelTexture
        ? new THREE.MeshStandardMaterial({
          map: crowdPanelTexture,
          roughness: 0.96,
          metalness: 0,
          emissive: '#ffffff',
          emissiveMap: crowdPanelTexture,
          emissiveIntensity: activeTrack.venue === 'apex' ? 0.34 : 0.06,
          side: THREE.DoubleSide,
        })
        : null,
      pitGarageFacadeMaterial: pitGarageFacadeTexture
        ? new THREE.MeshStandardMaterial({
          map: pitGarageFacadeTexture,
          roughness: 0.84,
          metalness: 0.08,
          emissive: '#ffffff',
          emissiveMap: pitGarageFacadeTexture,
          emissiveIntensity: activeTrack.venue === 'apex' ? 0.48 : 0.08,
          side: THREE.DoubleSide,
        })
        : null,
      gantryDisplayMaterial: gantryDisplayTexture
        ? new THREE.MeshBasicMaterial({
          map: gantryDisplayTexture,
          side: THREE.DoubleSide,
          toneMapped: false,
        })
        : null,
      tunnelWallMaterial: tunnelWallTexture
        ? new THREE.MeshStandardMaterial({
          map: tunnelWallTexture,
          roughness: 0.82,
          metalness: 0.08,
          emissive: '#a9c3c8',
          emissiveMap: tunnelWallTexture,
          emissiveIntensity: 0.045,
          side: THREE.DoubleSide,
        })
        : null,
      tunnelCeilingPortalMaterial: tunnelCeilingPortalTexture
        ? new THREE.MeshStandardMaterial({
          map: tunnelCeilingPortalTexture,
          roughness: 0.88,
          metalness: 0.14,
          emissive: '#4f5555',
          emissiveMap: tunnelCeilingPortalTexture,
          emissiveIntensity: 0.035,
          side: THREE.DoubleSide,
        })
        : null,
      buildingFacadeMaterial: buildingFacadeTexture
        ? new THREE.MeshStandardMaterial({
          map: buildingFacadeTexture,
          roughness: 0.86,
          metalness: 0.04,
          emissive: '#27343b',
          emissiveMap: buildingFacadeTexture,
          emissiveIntensity: 0.025,
          side: THREE.DoubleSide,
        })
        : null,
      retainingWallFacadeMaterial: retainingWallFacadeTexture
        ? new THREE.MeshStandardMaterial({
          map: retainingWallFacadeTexture,
          roughness: 0.88,
          metalness: 0.04,
        })
        : null,
      treeBillboardMaterial: treeBillboardTexture
        ? new THREE.MeshStandardMaterial({
          map: treeBillboardTexture,
          roughness: 0.94,
          metalness: 0,
          alphaTest: 0.34,
          side: THREE.DoubleSide,
        })
        : null,
      fenceMaterial: new THREE.LineBasicMaterial({
        color: '#b8c0bd',
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
      glowMaterial: new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.76,
      }),
      waterMaterial: activeTrack.venue === 'harbour'
        ? new THREE.MeshPhysicalMaterial({
          color: '#0b718b',
          emissive: '#06384a',
          emissiveIntensity: 0.28,
          roughness: 0.18,
          metalness: 0.24,
          clearcoat: 1,
          clearcoatRoughness: 0.12,
          transparent: true,
          opacity: 0.92,
        })
        : null,
    }
  }, [activeTrack, roadWidth, trackCurve])
  useEffect(() => () => {
    // These resources are constructed outside JSX, so their ownership is
    // explicit. Dispose them when a track asset set is replaced or unmounted;
    // otherwise repeated track switches retain GPU buffers and textures.
    for (const resource of [
      assets.roadGeometry,
      assets.roadColliderGeometry,
      assets.barrierGeometry,
      assets.barrierGraphicsGeometry,
      assets.sceneryGeometry,
      assets.crowdPanelGeometry,
      assets.pitGarageFacadeGeometry,
      assets.gantryDisplayGeometry,
      assets.tunnelWallGeometry,
      assets.tunnelCeilingPortalGeometry,
      assets.buildingFacadeGeometry,
      assets.retainingWallFacadeGeometry,
      assets.treeBillboardGeometry,
      assets.glowGeometry,
      assets.catchFenceGeometry,
      assets.asphaltAlbedoTexture,
      assets.infieldAlbedoTexture,
      assets.barrierAtlasTexture,
      assets.crowdPanelTexture,
      assets.pitGarageFacadeTexture,
      assets.gantryDisplayTexture,
      assets.tunnelWallTexture,
      assets.tunnelCeilingPortalTexture,
      assets.buildingFacadeTexture,
      assets.retainingWallFacadeTexture,
      assets.treeBillboardTexture,
      assets.asphaltTexture,
      assets.terrainTexture,
      assets.roadMaterial,
      assets.barrierMaterial,
      assets.barrierGraphicsMaterial,
      assets.sceneryMaterial,
      assets.crowdPanelMaterial,
      assets.pitGarageFacadeMaterial,
      assets.gantryDisplayMaterial,
      assets.tunnelWallMaterial,
      assets.tunnelCeilingPortalMaterial,
      assets.buildingFacadeMaterial,
      assets.retainingWallFacadeMaterial,
      assets.treeBillboardMaterial,
      assets.fenceMaterial,
      assets.glowMaterial,
      assets.waterMaterial,
    ]) {
      resource?.dispose()
    }
  }, [assets])
  const infieldWidth = Math.max(900, trackBounds.width + 360)
  const infieldDepth = Math.max(900, trackBounds.depth + 360)
  const tunnelLightPreset = HARBOUR_TUNNEL_LIGHT_PRESETS[activeGraphicsQuality]
  const visibleTunnelLights = tunnelLightPreset
    ? assets.tunnelLights.filter((_, index) => index % tunnelLightPreset.stride === 0)
    : []
  const floodlightStride = FLOODLIGHT_STRIDES[activeGraphicsQuality] ?? 1
  const visibleFloodlights = Number.isFinite(floodlightStride)
    ? assets.floodlights.filter((_, index) => index % floodlightStride === 0)
    : []

  return (
    <group>
      {/* A low infield remains visually separate from the single-height circuit. */}
      <RigidBody
        type="fixed"
        position={[trackBounds.centerX, -1.65, trackBounds.centerZ]}
        friction={0.9}
      >
        <mesh receiveShadow>
          <boxGeometry args={[infieldWidth, 2, infieldDepth]} />
          <meshStandardMaterial
            color={activeTrack.theme.groundColor}
            map={assets.infieldAlbedoTexture}
            roughness={1}
            roughnessMap={assets.terrainTexture}
            bumpMap={assets.terrainTexture}
            bumpScale={0.12}
          />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" colliders={false} name="track-road">
        <TrimeshCollider
          args={assets.roadColliderArgs}
          friction={1.25}
          restitution={0.02}
        />
        <mesh
          geometry={assets.roadGeometry}
          material={assets.roadMaterial}
          receiveShadow
        />
      </RigidBody>

      <RigidBody type="fixed" colliders={false} name="track-barriers">
        <TrimeshCollider
          args={assets.barrierColliderArgs}
          friction={0.15}
          restitution={0.12}
        />
        <mesh
          geometry={assets.barrierGeometry}
          material={assets.barrierMaterial}
          receiveShadow
        />
        {assets.barrierGraphicsMaterial && (
          <mesh
            name="track-barrier-graphics"
            geometry={assets.barrierGraphicsGeometry}
            material={assets.barrierGraphicsMaterial}
          />
        )}
      </RigidBody>

      {/* All kerbs, paint, buildings, stands and light structures share one draw call. */}
      <mesh
        geometry={assets.sceneryGeometry}
        material={assets.sceneryMaterial}
        castShadow={activeGraphicsQuality === 'high'}
        receiveShadow
      />
      {assets.crowdPanelMaterial && (
        <mesh
          name="track-crowd-panels"
          geometry={assets.crowdPanelGeometry}
          material={assets.crowdPanelMaterial}
          receiveShadow
        />
      )}
      {assets.pitGarageFacadeMaterial && (
        <mesh
          name="track-pit-garage-facades"
          geometry={assets.pitGarageFacadeGeometry}
          material={assets.pitGarageFacadeMaterial}
          receiveShadow
        />
      )}
      {assets.gantryDisplayMaterial && (
        <mesh
          name="track-gantry-displays"
          geometry={assets.gantryDisplayGeometry}
          material={assets.gantryDisplayMaterial}
        />
      )}
      {assets.tunnelWallMaterial && (
        <mesh
          name="track-harbour-tunnel-walls"
          geometry={assets.tunnelWallGeometry}
          material={assets.tunnelWallMaterial}
          receiveShadow
        />
      )}
      {assets.tunnelCeilingPortalMaterial && (
        <mesh
          name="track-harbour-tunnel-ceiling-portal"
          geometry={assets.tunnelCeilingPortalGeometry}
          material={assets.tunnelCeilingPortalMaterial}
          receiveShadow
        />
      )}
      {assets.buildingFacadeMaterial && (
        <mesh
          name="track-harbour-building-facades"
          geometry={assets.buildingFacadeGeometry}
          material={assets.buildingFacadeMaterial}
          receiveShadow
        />
      )}
      {assets.retainingWallFacadeMaterial && (
        <mesh
          name="track-harbour-retaining-wall-facades"
          geometry={assets.retainingWallFacadeGeometry}
          material={assets.retainingWallFacadeMaterial}
        />
      )}
      {assets.treeBillboardMaterial && (
        <mesh
          name="track-temple-tree-billboards"
          geometry={assets.treeBillboardGeometry}
          material={assets.treeBillboardMaterial}
          receiveShadow
        />
      )}
      <mesh geometry={assets.glowGeometry} material={assets.glowMaterial} />

      {assets.waterMaterial && (
        <mesh position={HARBOUR_WATER.position} material={assets.waterMaterial} receiveShadow>
          <boxGeometry args={HARBOUR_WATER.size} />
        </mesh>
      )}

      <lineSegments
        geometry={assets.catchFenceGeometry}
        material={assets.fenceMaterial}
        renderOrder={2}
      />

      {visibleFloodlights.map((position, index) => (
        <pointLight
          key={index}
          name={`circuit-floodlight-${index}`}
          position={position}
          color="#ffe1ad"
          intensity={92}
          distance={82}
          decay={2}
        />
      ))}

      {tunnelLightPreset
        && visibleTunnelLights.map(({ position }, index) => (
          <pointLight
            key={`harbour-tunnel-${index}`}
            name={`harbour-tunnel-light-${index}`}
            position={position}
            color="#ffd9a0"
            intensity={tunnelLightPreset.intensity}
            distance={tunnelLightPreset.distance}
            decay={2}
            castShadow={false}
          />
        ))}
    </group>
  )
}
