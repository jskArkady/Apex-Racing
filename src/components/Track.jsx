import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { RigidBody, TrimeshCollider } from '@react-three/rapier'
import { TriMeshFlags } from '@dimforge/rapier3d-compat'
import apexBarrierAtlasUrl from '../assets/textures/apex-night-barrier-atlas-1024.webp'
import apexCrowdPanelUrl from '../assets/textures/apex-night-crowd-panel-1024.webp'
import apexGantryDisplayUrl from '../assets/textures/apex-night-gantry-display-1024.webp'
import apexInfieldAlbedoUrl from '../assets/textures/apex-desert-infield-albedo-512.webp'
import apexPitLaneStaffSpriteAtlasUrl from '../assets/textures/apex-pit-lane-staff-sprite-atlas-1024.webp'
import apexPitGarageFacadeUrl from '../assets/textures/apex-night-pit-garage-facade-1024.webp'
import apexRaceControlFacadeAtlasUrl from '../assets/textures/apex-night-race-control-facade-atlas-1024.webp'
import apexTentCanopySurfaceAtlasUrl from '../assets/textures/apex-tent-canopy-surface-atlas-1024.webp'
import apexVenueFacadeAtlasUrl from '../assets/textures/apex-night-tower-hospitality-atlas-1024.webp'
import grandstandStructureAtlasUrl from '../assets/textures/grandstand-structure-surface-atlas-1024.webp'
import harbourCrowdPanelUrl from '../assets/textures/harbour-day-crowd-panel-1024.webp'
import harbourGantryDisplayUrl from '../assets/textures/harbour-day-gantry-display-1024.webp'
import harbourInfieldAlbedoUrl from '../assets/textures/harbour-concrete-infield-albedo-512.webp'
import harbourApartmentFacadeAtlasUrl from '../assets/textures/harbour-apartment-facade-atlas-1024.webp'
import harbourBarrierAtlasUrl from '../assets/textures/harbour-day-barrier-atlas-1024.webp'
import harbourMarinaAtlasUrl from '../assets/textures/harbour-marina-quay-promenade-atlas-1024.webp'
import harbourOpenWaterRippleHeightUrl from '../assets/textures/harbour-open-water-ripple-height-1024.webp'
import harbourPitGarageFacadeUrl from '../assets/textures/harbour-day-pit-garage-facade-1024.webp'
import harbourRetainingWallAtlasUrl from '../assets/textures/harbour-day-retaining-wall-atlas-1024.webp'
import harbourSwimmingPoolAtlasUrl from '../assets/textures/harbour-swimming-pool-surface-atlas-1024.webp'
import harbourTunnelCeilingPortalAtlasUrl from '../assets/textures/harbour-tunnel-ceiling-portal-atlas-1024.webp'
import harbourTunnelWallAtlasUrl from '../assets/textures/harbour-tunnel-wall-atlas-1024.webp'
import harbourYachtFacadeAtlasUrl from '../assets/textures/harbour-yacht-facade-atlas-1024.webp'
import templeCrowdPanelUrl from '../assets/textures/temple-day-crowd-panel-1024.webp'
import templeBarrierAtlasUrl from '../assets/textures/temple-day-barrier-atlas-1024.webp'
import templeBankingTimingAtlasUrl from '../assets/textures/temple-day-banking-timing-atlas-1024.webp'
import templeGantryDisplayUrl from '../assets/textures/temple-day-gantry-display-1024.webp'
import templeInfieldAlbedoUrl from '../assets/textures/temple-turf-infield-albedo-512.webp'
import templePitGarageFacadeUrl from '../assets/textures/temple-day-pit-garage-facade-1024.webp'
import templeTreeSpriteAtlasUrl from '../assets/textures/temple-tree-sprite-atlas-1024.webp'
import pitComplexStructureAtlasUrl from '../assets/textures/pit-complex-structure-surface-atlas-1024.webp'
import sharedBrakingDistanceBoardAtlasUrl from '../assets/textures/shared-braking-distance-board-atlas-1024.webp'
import sharedPalmTreeSpriteAtlasUrl from '../assets/textures/shared-palm-tree-sprite-atlas-1024.webp'
import sharedTrackLightingSignalAtlasUrl from '../assets/textures/shared-track-lighting-signal-atlas-1024.webp'
import sharedTracksideOperationsAtlasUrl from '../assets/textures/shared-trackside-operations-atlas-1024.webp'
import asphaltAlbedoUrl from '../assets/textures/track-asphalt-albedo-512.webp'
import { getTrackPreset } from '../utils/trackData'
import {
  BARRIER_SEGMENTS,
  createApexPitStaffBillboardGeometry,
  createApexRaceControlFacadeGeometry,
  createApexTentCanopyGeometry,
  createApexVenueFacadeGeometry,
  createBarrierGraphicsGeometry,
  createBarrierGeometry,
  createBrakingBoardGraphicsGeometry,
  createCatchFenceGeometry,
  createCircuitSceneryGeometry,
  createCircuitGlowGeometry,
  createCrowdPanelGeometry,
  createGantryDisplayGeometry,
  createGrandstandStructureGeometry,
  createHarbourBuildingFacadeGeometry,
  createHarbourMarinaSurfaceGeometry,
  createHarbourRetainingWallFacadeGeometry,
  createHarbourSwimmingPoolSurfaceGeometry,
  createHarbourTunnelCeilingPortalGeometry,
  createHarbourTunnelWallGeometry,
  createHarbourYachtFacadeGeometry,
  createPitComplexStructureGeometry,
  createPitGarageFacadeGeometry,
  createPalmTreeBillboardGeometry,
  createRoadColliderGeometry,
  createRoadGeometry,
  createTempleTreeBillboardGeometry,
  createTempleVenueFacadeGeometry,
  createTrackLightingGraphicsGeometry,
  createTracksideOperationsGraphicsGeometry,
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
    const brakingBoardGraphicsGeometry = createBrakingBoardGraphicsGeometry(
      trackCurve,
      activeTrack.venue,
      roadWidth,
    )
    const tracksideOperationsGraphicsGeometry = createTracksideOperationsGraphicsGeometry(
      trackCurve,
      activeTrack.venue,
      roadWidth,
    )
    const trackLightingGraphicsGeometry = createTrackLightingGraphicsGeometry(
      trackCurve,
      activeTrack.venue,
      roadWidth,
    )
    const sceneryGeometry = createCircuitSceneryGeometry(trackCurve, activeTrack.venue, roadWidth)
    const crowdPanelGeometry = createCrowdPanelGeometry(trackCurve, activeTrack.venue)
    const grandstandStructureGeometry = createGrandstandStructureGeometry(
      trackCurve,
      activeTrack.venue,
    )
    const pitComplexStructureGeometry = createPitComplexStructureGeometry(
      trackCurve,
      activeTrack.venue,
    )
    const pitGarageFacadeGeometry = createPitGarageFacadeGeometry(trackCurve, activeTrack.venue)
    const gantryDisplayGeometry = createGantryDisplayGeometry(trackCurve, activeTrack.venue)
    const apexVenueFacadeGeometry = activeTrack.venue === 'apex'
      ? createApexVenueFacadeGeometry(trackCurve)
      : null
    const apexRaceControlFacadeGeometry = activeTrack.venue === 'apex'
      ? createApexRaceControlFacadeGeometry(trackCurve, roadWidth)
      : null
    const apexPitStaffBillboardGeometry = activeTrack.venue === 'apex'
      ? createApexPitStaffBillboardGeometry(trackCurve)
      : null
    const apexTentCanopyGeometry = activeTrack.venue === 'apex'
      ? createApexTentCanopyGeometry(trackCurve)
      : null
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
    const marinaSurfaceGeometry = activeTrack.venue === 'harbour'
      ? createHarbourMarinaSurfaceGeometry()
      : null
    const swimmingPoolSurfaceGeometry = activeTrack.venue === 'harbour'
      ? createHarbourSwimmingPoolSurfaceGeometry()
      : null
    const yachtFacadeGeometry = activeTrack.venue === 'harbour'
      ? createHarbourYachtFacadeGeometry()
      : null
    const treeBillboardGeometry = activeTrack.venue === 'temple'
      ? createTempleTreeBillboardGeometry(trackCurve)
      : null
    const palmTreeBillboardGeometry = ['apex', 'harbour'].includes(activeTrack.venue)
      ? createPalmTreeBillboardGeometry(trackCurve, activeTrack.venue)
      : null
    const templeVenueFacadeGeometry = activeTrack.venue === 'temple'
      ? createTempleVenueFacadeGeometry(trackCurve, roadWidth)
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
    const brakingBoardGraphicsTexture = new THREE.TextureLoader().load(
      sharedBrakingDistanceBoardAtlasUrl,
    )
    brakingBoardGraphicsTexture.name = 'generated-shared-braking-distance-board-atlas'
    brakingBoardGraphicsTexture.colorSpace = THREE.SRGBColorSpace
    brakingBoardGraphicsTexture.wrapS = THREE.ClampToEdgeWrapping
    brakingBoardGraphicsTexture.wrapT = THREE.ClampToEdgeWrapping
    brakingBoardGraphicsTexture.minFilter = THREE.LinearMipmapLinearFilter
    brakingBoardGraphicsTexture.magFilter = THREE.LinearFilter
    brakingBoardGraphicsTexture.generateMipmaps = true
    brakingBoardGraphicsTexture.anisotropy = 4
    const tracksideOperationsGraphicsTexture = new THREE.TextureLoader().load(
      sharedTracksideOperationsAtlasUrl,
    )
    tracksideOperationsGraphicsTexture.name = 'generated-shared-trackside-operations-atlas'
    tracksideOperationsGraphicsTexture.colorSpace = THREE.SRGBColorSpace
    tracksideOperationsGraphicsTexture.wrapS = THREE.ClampToEdgeWrapping
    tracksideOperationsGraphicsTexture.wrapT = THREE.ClampToEdgeWrapping
    tracksideOperationsGraphicsTexture.minFilter = THREE.LinearMipmapLinearFilter
    tracksideOperationsGraphicsTexture.magFilter = THREE.LinearFilter
    tracksideOperationsGraphicsTexture.generateMipmaps = true
    tracksideOperationsGraphicsTexture.anisotropy = 4
    const trackLightingGraphicsTexture = new THREE.TextureLoader().load(
      sharedTrackLightingSignalAtlasUrl,
    )
    trackLightingGraphicsTexture.name = 'generated-shared-track-lighting-signal-atlas'
    trackLightingGraphicsTexture.colorSpace = THREE.SRGBColorSpace
    trackLightingGraphicsTexture.wrapS = THREE.ClampToEdgeWrapping
    trackLightingGraphicsTexture.wrapT = THREE.ClampToEdgeWrapping
    trackLightingGraphicsTexture.minFilter = THREE.LinearMipmapLinearFilter
    trackLightingGraphicsTexture.magFilter = THREE.LinearFilter
    trackLightingGraphicsTexture.generateMipmaps = true
    trackLightingGraphicsTexture.anisotropy = 4
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
    const grandstandStructureTexture = new THREE.TextureLoader().load(
      grandstandStructureAtlasUrl,
    )
    grandstandStructureTexture.name = 'generated-grandstand-structure-surface-atlas'
    grandstandStructureTexture.colorSpace = THREE.SRGBColorSpace
    grandstandStructureTexture.wrapS = THREE.ClampToEdgeWrapping
    grandstandStructureTexture.wrapT = THREE.ClampToEdgeWrapping
    grandstandStructureTexture.minFilter = THREE.LinearMipmapLinearFilter
    grandstandStructureTexture.magFilter = THREE.LinearFilter
    grandstandStructureTexture.generateMipmaps = true
    grandstandStructureTexture.anisotropy = 4
    const pitComplexStructureTexture = new THREE.TextureLoader().load(
      pitComplexStructureAtlasUrl,
    )
    pitComplexStructureTexture.name = 'generated-pit-complex-structure-surface-atlas'
    pitComplexStructureTexture.colorSpace = THREE.SRGBColorSpace
    pitComplexStructureTexture.wrapS = THREE.ClampToEdgeWrapping
    pitComplexStructureTexture.wrapT = THREE.ClampToEdgeWrapping
    pitComplexStructureTexture.minFilter = THREE.LinearMipmapLinearFilter
    pitComplexStructureTexture.magFilter = THREE.LinearFilter
    pitComplexStructureTexture.generateMipmaps = true
    pitComplexStructureTexture.anisotropy = 4
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
    const apexVenueFacadeTexture = activeTrack.venue === 'apex'
      ? new THREE.TextureLoader().load(apexVenueFacadeAtlasUrl)
      : null
    if (apexVenueFacadeTexture) {
      apexVenueFacadeTexture.name = 'generated-apex-venue-facade-atlas'
      apexVenueFacadeTexture.colorSpace = THREE.SRGBColorSpace
      apexVenueFacadeTexture.wrapS = THREE.ClampToEdgeWrapping
      apexVenueFacadeTexture.wrapT = THREE.ClampToEdgeWrapping
      apexVenueFacadeTexture.minFilter = THREE.LinearMipmapLinearFilter
      apexVenueFacadeTexture.magFilter = THREE.LinearFilter
      apexVenueFacadeTexture.generateMipmaps = true
      apexVenueFacadeTexture.anisotropy = 4
    }
    const apexRaceControlFacadeTexture = activeTrack.venue === 'apex'
      ? new THREE.TextureLoader().load(apexRaceControlFacadeAtlasUrl)
      : null
    if (apexRaceControlFacadeTexture) {
      apexRaceControlFacadeTexture.name = 'generated-apex-race-control-facade-atlas'
      apexRaceControlFacadeTexture.colorSpace = THREE.SRGBColorSpace
      apexRaceControlFacadeTexture.wrapS = THREE.ClampToEdgeWrapping
      apexRaceControlFacadeTexture.wrapT = THREE.ClampToEdgeWrapping
      apexRaceControlFacadeTexture.minFilter = THREE.LinearMipmapLinearFilter
      apexRaceControlFacadeTexture.magFilter = THREE.LinearFilter
      apexRaceControlFacadeTexture.generateMipmaps = true
      apexRaceControlFacadeTexture.anisotropy = 4
    }
    const apexPitStaffBillboardTexture = activeTrack.venue === 'apex'
      ? new THREE.TextureLoader().load(apexPitLaneStaffSpriteAtlasUrl)
      : null
    if (apexPitStaffBillboardTexture) {
      apexPitStaffBillboardTexture.name = 'generated-apex-pit-lane-staff-sprite-atlas'
      apexPitStaffBillboardTexture.colorSpace = THREE.SRGBColorSpace
      apexPitStaffBillboardTexture.wrapS = THREE.ClampToEdgeWrapping
      apexPitStaffBillboardTexture.wrapT = THREE.ClampToEdgeWrapping
      apexPitStaffBillboardTexture.minFilter = THREE.LinearMipmapLinearFilter
      apexPitStaffBillboardTexture.magFilter = THREE.LinearFilter
      apexPitStaffBillboardTexture.generateMipmaps = true
      apexPitStaffBillboardTexture.anisotropy = 2
    }
    const apexTentCanopyTexture = activeTrack.venue === 'apex'
      ? new THREE.TextureLoader().load(apexTentCanopySurfaceAtlasUrl)
      : null
    if (apexTentCanopyTexture) {
      apexTentCanopyTexture.name = 'generated-apex-tent-canopy-surface-atlas'
      apexTentCanopyTexture.colorSpace = THREE.SRGBColorSpace
      apexTentCanopyTexture.wrapS = THREE.ClampToEdgeWrapping
      apexTentCanopyTexture.wrapT = THREE.ClampToEdgeWrapping
      apexTentCanopyTexture.minFilter = THREE.LinearMipmapLinearFilter
      apexTentCanopyTexture.magFilter = THREE.LinearFilter
      apexTentCanopyTexture.generateMipmaps = true
      apexTentCanopyTexture.anisotropy = 4
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
    const marinaSurfaceTexture = activeTrack.venue === 'harbour'
      ? new THREE.TextureLoader().load(harbourMarinaAtlasUrl)
      : null
    if (marinaSurfaceTexture) {
      marinaSurfaceTexture.name = 'generated-harbour-marina-surface-atlas'
      marinaSurfaceTexture.colorSpace = THREE.SRGBColorSpace
      marinaSurfaceTexture.wrapS = THREE.ClampToEdgeWrapping
      marinaSurfaceTexture.wrapT = THREE.ClampToEdgeWrapping
      marinaSurfaceTexture.minFilter = THREE.LinearMipmapLinearFilter
      marinaSurfaceTexture.magFilter = THREE.LinearFilter
      marinaSurfaceTexture.generateMipmaps = true
      marinaSurfaceTexture.anisotropy = 4
    }
    const swimmingPoolSurfaceTexture = activeTrack.venue === 'harbour'
      ? new THREE.TextureLoader().load(harbourSwimmingPoolAtlasUrl)
      : null
    if (swimmingPoolSurfaceTexture) {
      swimmingPoolSurfaceTexture.name = 'generated-harbour-swimming-pool-surface-atlas'
      swimmingPoolSurfaceTexture.colorSpace = THREE.SRGBColorSpace
      swimmingPoolSurfaceTexture.wrapS = THREE.ClampToEdgeWrapping
      swimmingPoolSurfaceTexture.wrapT = THREE.ClampToEdgeWrapping
      swimmingPoolSurfaceTexture.minFilter = THREE.LinearMipmapLinearFilter
      swimmingPoolSurfaceTexture.magFilter = THREE.LinearFilter
      swimmingPoolSurfaceTexture.generateMipmaps = true
      swimmingPoolSurfaceTexture.anisotropy = 4
    }
    const openWaterRippleTexture = activeTrack.venue === 'harbour'
      ? new THREE.TextureLoader().load(harbourOpenWaterRippleHeightUrl)
      : null
    if (openWaterRippleTexture) {
      openWaterRippleTexture.name = 'generated-harbour-open-water-ripple-height'
      openWaterRippleTexture.colorSpace = THREE.NoColorSpace
      openWaterRippleTexture.wrapS = THREE.RepeatWrapping
      openWaterRippleTexture.wrapT = THREE.RepeatWrapping
      openWaterRippleTexture.minFilter = THREE.LinearMipmapLinearFilter
      openWaterRippleTexture.magFilter = THREE.LinearFilter
      openWaterRippleTexture.generateMipmaps = true
      openWaterRippleTexture.anisotropy = 4
      openWaterRippleTexture.repeat.set(4, 1)
      openWaterRippleTexture.offset.set(0.17, 0.29)
    }
    const yachtFacadeTexture = activeTrack.venue === 'harbour'
      ? new THREE.TextureLoader().load(harbourYachtFacadeAtlasUrl)
      : null
    if (yachtFacadeTexture) {
      yachtFacadeTexture.name = 'generated-harbour-yacht-facade-atlas'
      yachtFacadeTexture.colorSpace = THREE.SRGBColorSpace
      yachtFacadeTexture.wrapS = THREE.ClampToEdgeWrapping
      yachtFacadeTexture.wrapT = THREE.ClampToEdgeWrapping
      yachtFacadeTexture.minFilter = THREE.LinearMipmapLinearFilter
      yachtFacadeTexture.magFilter = THREE.LinearFilter
      yachtFacadeTexture.generateMipmaps = true
      yachtFacadeTexture.anisotropy = 4
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
    const palmTreeBillboardTexture = ['apex', 'harbour'].includes(activeTrack.venue)
      ? new THREE.TextureLoader().load(sharedPalmTreeSpriteAtlasUrl)
      : null
    if (palmTreeBillboardTexture) {
      palmTreeBillboardTexture.name = 'generated-shared-palm-tree-sprite-atlas'
      palmTreeBillboardTexture.colorSpace = THREE.SRGBColorSpace
      palmTreeBillboardTexture.wrapS = THREE.ClampToEdgeWrapping
      palmTreeBillboardTexture.wrapT = THREE.ClampToEdgeWrapping
      palmTreeBillboardTexture.minFilter = THREE.LinearMipmapLinearFilter
      palmTreeBillboardTexture.magFilter = THREE.LinearFilter
      palmTreeBillboardTexture.generateMipmaps = true
      palmTreeBillboardTexture.anisotropy = 2
    }
    const templeVenueFacadeTexture = activeTrack.venue === 'temple'
      ? new THREE.TextureLoader().load(templeBankingTimingAtlasUrl)
      : null
    if (templeVenueFacadeTexture) {
      templeVenueFacadeTexture.name = 'generated-temple-banking-timing-atlas'
      templeVenueFacadeTexture.colorSpace = THREE.SRGBColorSpace
      templeVenueFacadeTexture.wrapS = THREE.ClampToEdgeWrapping
      templeVenueFacadeTexture.wrapT = THREE.ClampToEdgeWrapping
      templeVenueFacadeTexture.minFilter = THREE.LinearMipmapLinearFilter
      templeVenueFacadeTexture.magFilter = THREE.LinearFilter
      templeVenueFacadeTexture.generateMipmaps = true
      templeVenueFacadeTexture.anisotropy = 4
    }
    const asphaltTexture = createSurfaceTexture(128, 0.5)
    asphaltTexture.repeat.set(7, 110)
    const terrainTexture = createSurfaceTexture(96, 0.8)
    terrainTexture.repeat.set(70, 70)
    const waterMaterial = activeTrack.venue === 'harbour'
      ? new THREE.MeshPhysicalMaterial({
        color: '#168da8',
        map: openWaterRippleTexture,
        bumpMap: openWaterRippleTexture,
        bumpScale: 0.045,
        roughnessMap: openWaterRippleTexture,
        emissive: '#06384a',
        emissiveIntensity: 0.24,
        roughness: 0.34,
        metalness: 0.02,
        clearcoat: 1,
        clearcoatRoughness: 0.2,
        clearcoatRoughnessMap: openWaterRippleTexture,
        transparent: true,
        opacity: 0.94,
      })
      : null
    if (waterMaterial) waterMaterial.name = 'harbour-open-water-material'

    return {
      roadGeometry,
      roadColliderGeometry,
      barrierGeometry,
      barrierGraphicsGeometry,
      brakingBoardGraphicsGeometry,
      tracksideOperationsGraphicsGeometry,
      trackLightingGraphicsGeometry,
      sceneryGeometry,
      crowdPanelGeometry,
      grandstandStructureGeometry,
      pitComplexStructureGeometry,
      pitGarageFacadeGeometry,
      gantryDisplayGeometry,
      apexVenueFacadeGeometry,
      apexRaceControlFacadeGeometry,
      apexPitStaffBillboardGeometry,
      apexTentCanopyGeometry,
      tunnelWallGeometry,
      tunnelCeilingPortalGeometry,
      buildingFacadeGeometry,
      retainingWallFacadeGeometry,
      marinaSurfaceGeometry,
      swimmingPoolSurfaceGeometry,
      yachtFacadeGeometry,
      treeBillboardGeometry,
      palmTreeBillboardGeometry,
      templeVenueFacadeGeometry,
      glowGeometry,
      catchFenceGeometry,
      asphaltAlbedoTexture,
      infieldAlbedoTexture,
      barrierAtlasTexture,
      brakingBoardGraphicsTexture,
      tracksideOperationsGraphicsTexture,
      trackLightingGraphicsTexture,
      crowdPanelTexture,
      grandstandStructureTexture,
      pitComplexStructureTexture,
      pitGarageFacadeTexture,
      gantryDisplayTexture,
      apexVenueFacadeTexture,
      apexRaceControlFacadeTexture,
      apexPitStaffBillboardTexture,
      apexTentCanopyTexture,
      tunnelWallTexture,
      tunnelCeilingPortalTexture,
      buildingFacadeTexture,
      retainingWallFacadeTexture,
      marinaSurfaceTexture,
      swimmingPoolSurfaceTexture,
      openWaterRippleTexture,
      yachtFacadeTexture,
      treeBillboardTexture,
      palmTreeBillboardTexture,
      templeVenueFacadeTexture,
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
      brakingBoardGraphicsMaterial: new THREE.MeshStandardMaterial({
        map: brakingBoardGraphicsTexture,
        roughness: 0.86,
        metalness: 0.02,
        emissive: '#ffffff',
        emissiveMap: brakingBoardGraphicsTexture,
        emissiveIntensity: activeTrack.venue === 'apex' ? 0.18 : 0.025,
      }),
      tracksideOperationsGraphicsMaterial: new THREE.MeshStandardMaterial({
        map: tracksideOperationsGraphicsTexture,
        roughness: 0.74,
        metalness: 0.12,
        emissive: '#ffffff',
        emissiveMap: tracksideOperationsGraphicsTexture,
        emissiveIntensity: activeTrack.venue === 'apex' ? 0.24 : 0.045,
      }),
      trackLightingGraphicsMaterial: new THREE.MeshStandardMaterial({
        map: trackLightingGraphicsTexture,
        roughness: 0.64,
        metalness: 0.12,
        emissive: '#ffffff',
        emissiveMap: trackLightingGraphicsTexture,
        emissiveIntensity: activeTrack.venue === 'apex'
          ? 0.72
          : activeTrack.venue === 'harbour' ? 0.35 : 0.1,
      }),
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
      grandstandStructureMaterial: new THREE.MeshStandardMaterial({
        map: grandstandStructureTexture,
        roughness: 0.84,
        metalness: 0.08,
        side: THREE.DoubleSide,
      }),
      pitComplexStructureMaterial: new THREE.MeshStandardMaterial({
        map: pitComplexStructureTexture,
        roughness: 0.86,
        metalness: 0.08,
        side: THREE.DoubleSide,
      }),
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
      apexVenueFacadeMaterial: apexVenueFacadeTexture
        ? new THREE.MeshStandardMaterial({
          map: apexVenueFacadeTexture,
          roughness: 0.72,
          metalness: 0.08,
          emissive: '#ffffff',
          emissiveMap: apexVenueFacadeTexture,
          emissiveIntensity: 0.18,
          side: THREE.DoubleSide,
        })
        : null,
      apexRaceControlFacadeMaterial: apexRaceControlFacadeTexture
        ? new THREE.MeshStandardMaterial({
          map: apexRaceControlFacadeTexture,
          roughness: 0.72,
          metalness: 0.1,
          emissive: '#ffffff',
          emissiveMap: apexRaceControlFacadeTexture,
          emissiveIntensity: 0.22,
        })
        : null,
      apexPitStaffBillboardMaterial: apexPitStaffBillboardTexture
        ? new THREE.MeshStandardMaterial({
          map: apexPitStaffBillboardTexture,
          roughness: 0.94,
          metalness: 0,
          emissive: '#ffffff',
          emissiveMap: apexPitStaffBillboardTexture,
          emissiveIntensity: 0.12,
          alphaTest: 0.42,
          side: THREE.DoubleSide,
        })
        : null,
      apexTentCanopyMaterial: apexTentCanopyTexture
        ? new THREE.MeshStandardMaterial({
          map: apexTentCanopyTexture,
          roughness: 0.96,
          metalness: 0,
          emissive: '#ffffff',
          emissiveMap: apexTentCanopyTexture,
          emissiveIntensity: 0.08,
          side: THREE.DoubleSide,
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
      marinaSurfaceMaterial: marinaSurfaceTexture
        ? new THREE.MeshStandardMaterial({
          map: marinaSurfaceTexture,
          roughness: 0.9,
          metalness: 0.02,
          side: THREE.DoubleSide,
        })
        : null,
      swimmingPoolSurfaceMaterial: swimmingPoolSurfaceTexture
        ? new THREE.MeshStandardMaterial({
          map: swimmingPoolSurfaceTexture,
          roughness: 0.42,
          metalness: 0.03,
          side: THREE.DoubleSide,
        })
        : null,
      yachtFacadeMaterial: yachtFacadeTexture
        ? new THREE.MeshStandardMaterial({
          map: yachtFacadeTexture,
          roughness: 0.64,
          metalness: 0.05,
          side: THREE.DoubleSide,
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
      palmTreeBillboardMaterial: palmTreeBillboardTexture
        ? new THREE.MeshStandardMaterial({
          map: palmTreeBillboardTexture,
          roughness: 0.94,
          metalness: 0,
          alphaTest: 0.42,
          side: THREE.DoubleSide,
        })
        : null,
      templeVenueFacadeMaterial: templeVenueFacadeTexture
        ? new THREE.MeshStandardMaterial({
          map: templeVenueFacadeTexture,
          roughness: 0.88,
          metalness: 0.04,
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
      waterMaterial,
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
      assets.brakingBoardGraphicsGeometry,
      assets.tracksideOperationsGraphicsGeometry,
      assets.trackLightingGraphicsGeometry,
      assets.sceneryGeometry,
      assets.crowdPanelGeometry,
      assets.grandstandStructureGeometry,
      assets.pitComplexStructureGeometry,
      assets.pitGarageFacadeGeometry,
      assets.gantryDisplayGeometry,
      assets.apexVenueFacadeGeometry,
      assets.apexRaceControlFacadeGeometry,
      assets.apexPitStaffBillboardGeometry,
      assets.apexTentCanopyGeometry,
      assets.tunnelWallGeometry,
      assets.tunnelCeilingPortalGeometry,
      assets.buildingFacadeGeometry,
      assets.retainingWallFacadeGeometry,
      assets.marinaSurfaceGeometry,
      assets.swimmingPoolSurfaceGeometry,
      assets.yachtFacadeGeometry,
      assets.treeBillboardGeometry,
      assets.palmTreeBillboardGeometry,
      assets.templeVenueFacadeGeometry,
      assets.glowGeometry,
      assets.catchFenceGeometry,
      assets.asphaltAlbedoTexture,
      assets.infieldAlbedoTexture,
      assets.barrierAtlasTexture,
      assets.brakingBoardGraphicsTexture,
      assets.tracksideOperationsGraphicsTexture,
      assets.trackLightingGraphicsTexture,
      assets.crowdPanelTexture,
      assets.grandstandStructureTexture,
      assets.pitComplexStructureTexture,
      assets.pitGarageFacadeTexture,
      assets.gantryDisplayTexture,
      assets.apexVenueFacadeTexture,
      assets.apexRaceControlFacadeTexture,
      assets.apexPitStaffBillboardTexture,
      assets.apexTentCanopyTexture,
      assets.tunnelWallTexture,
      assets.tunnelCeilingPortalTexture,
      assets.buildingFacadeTexture,
      assets.retainingWallFacadeTexture,
      assets.marinaSurfaceTexture,
      assets.swimmingPoolSurfaceTexture,
      assets.openWaterRippleTexture,
      assets.yachtFacadeTexture,
      assets.treeBillboardTexture,
      assets.palmTreeBillboardTexture,
      assets.templeVenueFacadeTexture,
      assets.asphaltTexture,
      assets.terrainTexture,
      assets.roadMaterial,
      assets.barrierMaterial,
      assets.barrierGraphicsMaterial,
      assets.brakingBoardGraphicsMaterial,
      assets.tracksideOperationsGraphicsMaterial,
      assets.trackLightingGraphicsMaterial,
      assets.sceneryMaterial,
      assets.crowdPanelMaterial,
      assets.grandstandStructureMaterial,
      assets.pitComplexStructureMaterial,
      assets.pitGarageFacadeMaterial,
      assets.gantryDisplayMaterial,
      assets.apexVenueFacadeMaterial,
      assets.apexRaceControlFacadeMaterial,
      assets.apexPitStaffBillboardMaterial,
      assets.apexTentCanopyMaterial,
      assets.tunnelWallMaterial,
      assets.tunnelCeilingPortalMaterial,
      assets.buildingFacadeMaterial,
      assets.retainingWallFacadeMaterial,
      assets.marinaSurfaceMaterial,
      assets.swimmingPoolSurfaceMaterial,
      assets.yachtFacadeMaterial,
      assets.treeBillboardMaterial,
      assets.palmTreeBillboardMaterial,
      assets.templeVenueFacadeMaterial,
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
      <mesh
        name="track-braking-distance-boards"
        geometry={assets.brakingBoardGraphicsGeometry}
        material={assets.brakingBoardGraphicsMaterial}
        receiveShadow
      />
      <mesh
        name="trackside-operations-graphics"
        geometry={assets.tracksideOperationsGraphicsGeometry}
        material={assets.tracksideOperationsGraphicsMaterial}
        receiveShadow
      />
      <mesh
        name="track-lighting-signal-graphics"
        geometry={assets.trackLightingGraphicsGeometry}
        material={assets.trackLightingGraphicsMaterial}
      />
      <mesh
        name="track-grandstand-structure-surfaces"
        geometry={assets.grandstandStructureGeometry}
        material={assets.grandstandStructureMaterial}
        receiveShadow
      />
      <mesh
        name="track-pit-complex-structure-surfaces"
        geometry={assets.pitComplexStructureGeometry}
        material={assets.pitComplexStructureMaterial}
        receiveShadow
      />
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
      {assets.apexVenueFacadeMaterial && (
        <mesh
          name="track-apex-venue-facades"
          geometry={assets.apexVenueFacadeGeometry}
          material={assets.apexVenueFacadeMaterial}
          receiveShadow
        />
      )}
      {assets.apexRaceControlFacadeMaterial && (
        <mesh
          name="track-apex-race-control-facades"
          geometry={assets.apexRaceControlFacadeGeometry}
          material={assets.apexRaceControlFacadeMaterial}
          receiveShadow
        />
      )}
      {assets.apexPitStaffBillboardMaterial && (
        <mesh
          name="track-apex-pit-lane-staff-billboards"
          geometry={assets.apexPitStaffBillboardGeometry}
          material={assets.apexPitStaffBillboardMaterial}
        />
      )}
      {assets.apexTentCanopyMaterial && (
        <mesh
          name="track-apex-tent-canopies"
          geometry={assets.apexTentCanopyGeometry}
          material={assets.apexTentCanopyMaterial}
          castShadow
          receiveShadow
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
      {assets.marinaSurfaceMaterial && (
        <mesh
          name="track-harbour-marina-surfaces"
          geometry={assets.marinaSurfaceGeometry}
          material={assets.marinaSurfaceMaterial}
          receiveShadow
        />
      )}
      {assets.swimmingPoolSurfaceMaterial && (
        <mesh
          name="track-harbour-swimming-pool-surfaces"
          geometry={assets.swimmingPoolSurfaceGeometry}
          material={assets.swimmingPoolSurfaceMaterial}
          receiveShadow
        />
      )}
      {assets.yachtFacadeMaterial && (
        <mesh
          name="track-harbour-yacht-facades"
          geometry={assets.yachtFacadeGeometry}
          material={assets.yachtFacadeMaterial}
          receiveShadow
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
      {assets.palmTreeBillboardMaterial && (
        <mesh
          name="track-palm-tree-billboards"
          geometry={assets.palmTreeBillboardGeometry}
          material={assets.palmTreeBillboardMaterial}
          receiveShadow
        />
      )}
      {assets.templeVenueFacadeMaterial && (
        <mesh
          name="track-temple-venue-facades"
          geometry={assets.templeVenueFacadeGeometry}
          material={assets.templeVenueFacadeMaterial}
          receiveShadow
        />
      )}
      <mesh geometry={assets.glowGeometry} material={assets.glowMaterial} />

      {assets.waterMaterial && (
        <mesh
          name="track-harbour-open-water"
          position={HARBOUR_WATER.position}
          material={assets.waterMaterial}
          receiveShadow
        >
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
