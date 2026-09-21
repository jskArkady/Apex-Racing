import { racerTelemetry } from '../utils/racerTelemetry'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getStartGridPose } from '../utils/startGrid'

const SHADOW_HALF_EXTENT = 72
const SHADOW_CAMERA_NEAR = 1
const SHADOW_CAMERA_FAR = 360

export const SHADOW_SETTINGS = Object.freeze({
  mapSize: 1536,
  halfExtent: SHADOW_HALF_EXTENT,
  texelSize: (SHADOW_HALF_EXTENT * 2) / 1536,
  near: SHADOW_CAMERA_NEAR,
  far: SHADOW_CAMERA_FAR,
  bias: -0.0001,
  normalBias: 0.035,
})

const finiteOr = (value, fallback) => Number.isFinite(value) ? value : fallback

export function calculateShadowRigPose(
  focus,
  sunOffset,
  fallbackFocus,
  target = {},
) {
  const fallbackX = finiteOr(fallbackFocus?.x, 0)
  const fallbackY = finiteOr(fallbackFocus?.y, 0)
  const fallbackZ = finiteOr(fallbackFocus?.z, 0)
  const focusX = finiteOr(focus?.x, fallbackX)
  const focusY = finiteOr(focus?.y, fallbackY)
  const focusZ = finiteOr(focus?.z, fallbackZ)
  const sunX = finiteOr(sunOffset?.[0], 0)
  const sunY = finiteOr(sunOffset?.[1], 0)
  const sunZ = finiteOr(sunOffset?.[2], 0)
  const texelSize = SHADOW_SETTINGS.texelSize

  target.targetX = Math.round(focusX / texelSize) * texelSize
  target.targetY = focusY
  target.targetZ = Math.round(focusZ / texelSize) * texelSize
  target.lightX = target.targetX + sunX
  target.lightY = target.targetY + sunY
  target.lightZ = target.targetZ + sunZ
  return target
}

export default function RaceLighting({
  environment,
  track,
  gameMode = 'single',
}) {
  const lightRef = useRef()
  const targetObject = useMemo(() => new THREE.Object3D(), [])
  const attachedSceneRef = useRef(null)
  const poseRef = useRef({
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    lightX: 0,
    lightY: 0,
    lightZ: 0,
  })
  const fallbackFocus = useMemo(() => {
    const pose = getStartGridPose('player', gameMode, track.curve, track.length)
    return {
      x: pose.position[0],
      y: track.curve.getPointAt(pose.progress).y,
      z: pose.position[2],
    }
  }, [gameMode, track])
  const initialPose = useMemo(() => calculateShadowRigPose(
    fallbackFocus,
    environment.sunPosition,
    fallbackFocus,
    {},
  ), [environment.sunPosition, fallbackFocus])

  useEffect(() => () => {
    if (attachedSceneRef.current) {
      attachedSceneRef.current.remove(targetObject)
      attachedSceneRef.current = null
    }
  }, [targetObject])

  useFrame((state) => {
    const scene = state.scene
    if (scene && attachedSceneRef.current !== scene) {
      attachedSceneRef.current?.remove(targetObject)
      scene.add(targetObject)
      attachedSceneRef.current = scene
    }

    const playerFocus = typeof window === 'undefined'
      ? null
      : racerTelemetry.positions?.player
    const pose = calculateShadowRigPose(
      playerFocus,
      environment.sunPosition,
      fallbackFocus,
      poseRef.current,
    )

    targetObject.position.set(pose.targetX, pose.targetY, pose.targetZ)
    targetObject.updateMatrixWorld()
    lightRef.current?.position?.set(pose.lightX, pose.lightY, pose.lightZ)
  })

  return (
    <>
      <ambientLight intensity={environment.ambientIntensity} color={environment.ambientColor} />
      <hemisphereLight
        args={[
          environment.hemisphereSkyColor,
          environment.hemisphereGroundColor,
          environment.hemisphereIntensity,
        ]}
      />
      <directionalLight
        ref={lightRef}
        target={targetObject}
        castShadow
        color={environment.sunColor}
        position={[initialPose.lightX, initialPose.lightY, initialPose.lightZ]}
        intensity={environment.sunIntensity}
        shadow-mapSize={[SHADOW_SETTINGS.mapSize, SHADOW_SETTINGS.mapSize]}
        shadow-camera-near={SHADOW_SETTINGS.near}
        shadow-camera-far={SHADOW_SETTINGS.far}
        shadow-camera-left={-SHADOW_SETTINGS.halfExtent}
        shadow-camera-right={SHADOW_SETTINGS.halfExtent}
        shadow-camera-top={SHADOW_SETTINGS.halfExtent}
        shadow-camera-bottom={-SHADOW_SETTINGS.halfExtent}
        shadow-bias={SHADOW_SETTINGS.bias}
        shadow-normalBias={SHADOW_SETTINGS.normalBias}
      />
    </>
  )
}
