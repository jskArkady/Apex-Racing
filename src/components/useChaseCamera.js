import { useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'

const CHASE_CAMERA_LOOK_AHEAD = 10
const CHASE_CAMERA_BASE_FOV = 58
const CHASE_CAMERA_MAX_DESKTOP_FOV = 68
const CHASE_CAMERA_MAX_PORTRAIT_FOV = 63
const CHASE_CAMERA_FULL_EFFECT_SPEED = 220
const MAX_PORTRAIT_CAMERA_SCALE = 2.25
const tempVisualPosition = new THREE.Vector3()
const tempVisualQuaternion = new THREE.Quaternion()
const tempVisualForward = new THREE.Vector3()
const tempCameraPosition = new THREE.Vector3()
const tempCameraOffset = new THREE.Vector3()
const tempCameraTarget = new THREE.Vector3()
const tempChaseCameraFraming = { distance: 0, height: 0 }
const tempChaseCameraLens = { fov: CHASE_CAMERA_BASE_FOV, lookAhead: CHASE_CAMERA_LOOK_AHEAD }

export function calculateChaseCameraFraming(speedKmH, aspect, target = {}) {
  const safeSpeed = Number.isFinite(speedKmH) ? Math.max(0, speedKmH) : 0
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const portraitScale = Math.min(
    MAX_PORTRAIT_CAMERA_SCALE,
    Math.max(1, 1 / safeAspect)
  )
  const baseDistance = 6 + (safeSpeed / 100) * 1.5
  const distance = baseDistance * portraitScale
  const baseHeight = 2.5 + (safeSpeed / 100) * 0.5

  target.distance = distance
  // Preserve the desktop sightline while widening portrait framing.
  target.height = baseHeight
    * ((distance + CHASE_CAMERA_LOOK_AHEAD) / (baseDistance + CHASE_CAMERA_LOOK_AHEAD))
  return target
}

export function calculateChaseCameraLens(
  speedKmH,
  aspect,
  reducedMotion = false,
  target = {},
) {
  const safeSpeed = Number.isFinite(speedKmH) ? Math.max(0, speedKmH) : 0
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const linearProgress = Math.min(1, safeSpeed / CHASE_CAMERA_FULL_EFFECT_SPEED)
  const progress = reducedMotion
    ? 0
    : linearProgress * linearProgress * (3 - 2 * linearProgress)
  const maximumFov = safeAspect < 0.8
    ? CHASE_CAMERA_MAX_PORTRAIT_FOV
    : CHASE_CAMERA_MAX_DESKTOP_FOV
  target.fov = CHASE_CAMERA_BASE_FOV
    + (maximumFov - CHASE_CAMERA_BASE_FOV) * progress
  target.lookAhead = CHASE_CAMERA_LOOK_AHEAD + 5 * progress
  return target
}

export function useChaseCamera() {
  const cameraLookTargetRef = useRef(new THREE.Vector3())
  const cameraInitializedRef = useRef(false)
  const reducedMotionRef = useRef(false)
  const reset = useCallback(() => { cameraInitializedRef.current = false }, [])
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => {
      reducedMotionRef.current = preference.matches
    }
    updatePreference()
    preference.addEventListener?.('change', updatePreference)
    return () => preference.removeEventListener?.('change', updatePreference)
  }, [])

  function follow(camera, position, forward, visual, speedKmH, delta, captureRequest, captureLookTarget) {
    // Camera follow
    let cameraSourcePosition = position
    let cameraSourceForward = forward
    if (
      visual
      && typeof visual.getWorldPosition === 'function'
      && typeof visual.getWorldQuaternion === 'function'
    ) {
      visual.getWorldPosition(tempVisualPosition)
      visual.getWorldQuaternion(tempVisualQuaternion)
      tempVisualForward.set(0, 0, -1).applyQuaternion(tempVisualQuaternion).setY(0)
      if (tempVisualForward.lengthSq() > 1e-6) {
        tempVisualForward.normalize()
        cameraSourcePosition = tempVisualPosition
        cameraSourceForward = tempVisualForward
      }
    }
    const cameraPosition = tempCameraPosition.copy(cameraSourcePosition)
    // Keep the desktop chase framing, but move back on portrait screens where
    // the narrower horizontal FOV would otherwise make the car fill the view.
    const cameraFraming = calculateChaseCameraFraming(
      speedKmH,
      camera.aspect,
      tempChaseCameraFraming
    )
    const cameraLens = calculateChaseCameraLens(
      speedKmH,
      camera.aspect,
      reducedMotionRef.current,
      tempChaseCameraLens,
    )
    const cameraOffset = tempCameraOffset
      .copy(cameraSourceForward)
      .multiplyScalar(-cameraFraming.distance)
    cameraOffset.y += Number.isFinite(captureRequest?.cameraHeight)
      ? captureRequest.cameraHeight
      : cameraFraming.height
    cameraPosition.add(cameraOffset)

    const cameraDelta = Math.min(delta, 0.1)
    const positionDamping = 1 - Math.exp(-7.5 * cameraDelta)
    const targetDamping = 1 - Math.exp(-12 * cameraDelta)
    if (Number.isFinite(camera.fov)) {
      const nextFov = THREE.MathUtils.lerp(
        camera.fov,
        cameraLens.fov,
        1 - Math.exp(-4.5 * cameraDelta),
      )
      if (Math.abs(nextFov - camera.fov) > 0.001) {
        camera.fov = nextFov
        camera.updateProjectionMatrix?.()
      }
    }
    if (captureLookTarget) {
      tempCameraTarget.copy(captureLookTarget)
    } else {
      tempCameraTarget
        .copy(cameraSourceForward)
        .multiplyScalar(cameraLens.lookAhead)
        .add(cameraSourcePosition)
    }
    if (!cameraInitializedRef.current) {
      camera.position.lerp(cameraPosition, 1)
      cameraLookTargetRef.current.copy(tempCameraTarget)
      cameraInitializedRef.current = true
    } else {
      camera.position.lerp(cameraPosition, positionDamping)
      cameraLookTargetRef.current.lerp(tempCameraTarget, targetDamping)
    }
    camera.lookAt(cameraLookTargetRef.current)
    return cameraSourcePosition
  }

  function snap(camera, position, direction, distance) {
    const target = tempCameraTarget.set(position.x, position.y, position.z)
    tempCameraPosition.copy(target).addScaledVector(direction, -distance)
    tempCameraPosition.y += 3.5
    camera.position.lerp(tempCameraPosition, 1)
    target.addScaledVector(direction, 10)
    target.y += 1
    camera.lookAt(target)
    cameraLookTargetRef.current.copy(target)
    cameraInitializedRef.current = true
  }
  return { reset, follow, snap }
}
