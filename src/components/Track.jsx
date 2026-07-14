import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { RigidBody, TrimeshCollider } from '@react-three/rapier'
import { TriMeshFlags } from '@dimforge/rapier3d-compat'
import { getTrackPreset } from '../utils/trackData'
import {
  BARRIER_SEGMENTS,
  createBarrierGeometry,
  createCatchFenceGeometry,
  createCircuitSceneryGeometry,
  createCircuitGlowGeometry,
  createRoadColliderGeometry,
  createRoadGeometry,
  getFloodlightPositions,
  getHarbourTunnelLightingLayout,
  HARBOUR_WATER,
  ROAD_SEGMENTS,
} from './trackGeometry'
import { useGameStore } from '../store/gameStore'

const HARBOUR_TUNNEL_LIGHT_PRESETS = Object.freeze({
  medium: Object.freeze({ intensity: 46, distance: 29, stride: 2 }),
  high: Object.freeze({ intensity: 64, distance: 34, stride: 1 }),
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

export default function Track({ track = getTrackPreset(), graphicsQuality }) {
  const activeTrack = track ?? getTrackPreset()
  const activeGraphicsQuality = graphicsQuality
    ?? useGameStore.getState().settings.graphics
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
    const barrierGeometry = createBarrierGeometry(
      trackCurve,
      Math.max(BARRIER_SEGMENTS, Math.ceil(activeTrack.length / 4.25)),
      roadWidth,
    )
    const sceneryGeometry = createCircuitSceneryGeometry(trackCurve, activeTrack.venue, roadWidth)
    const glowGeometry = createCircuitGlowGeometry(trackCurve, activeTrack.venue, roadWidth)
    const catchFenceGeometry = createCatchFenceGeometry(
      trackCurve,
      Math.ceil(activeTrack.length / 10),
      roadWidth,
    )
    const asphaltTexture = createSurfaceTexture(128, 0.5)
    asphaltTexture.repeat.set(7, 110)
    const terrainTexture = createSurfaceTexture(96, 0.8)
    terrainTexture.repeat.set(70, 70)

    return {
      roadGeometry,
      roadColliderGeometry,
      barrierGeometry,
      sceneryGeometry,
      glowGeometry,
      catchFenceGeometry,
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
      sceneryMaterial: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.62,
        metalness: 0.18,
      }),
      fenceMaterial: new THREE.LineBasicMaterial({
        color: '#b8c0bd',
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
      glowMaterial: new THREE.MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
        transparent: true,
        opacity: 0.9,
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
      assets.sceneryGeometry,
      assets.glowGeometry,
      assets.catchFenceGeometry,
      assets.asphaltTexture,
      assets.terrainTexture,
      assets.roadMaterial,
      assets.barrierMaterial,
      assets.sceneryMaterial,
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
      </RigidBody>

      {/* All kerbs, paint, buildings, stands and light structures share one draw call. */}
      <mesh
        geometry={assets.sceneryGeometry}
        material={assets.sceneryMaterial}
        castShadow
        receiveShadow
      />
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

      {assets.floodlights.map((position, index) => (
        <pointLight
          key={index}
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
