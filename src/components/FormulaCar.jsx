import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useGameStore } from '../store/gameStore'
import playerFormulaLiveryAtlasUrl from '../assets/textures/player-formula-livery-surface-atlas-1024.webp'
import aiBlueFormulaLiveryAtlasUrl from '../assets/textures/ai-blue-formula-livery-surface-atlas-1024.webp'
import aiGreenFormulaLiveryAtlasUrl from '../assets/textures/ai-green-formula-livery-surface-atlas-1024.webp'
import aiOrangeFormulaLiveryAtlasUrl from '../assets/textures/ai-orange-formula-livery-surface-atlas-1024.webp'

export const FORMULA_LIVERY_ATLASES = Object.freeze({
  player: Object.freeze({ id: 'player', url: playerFormulaLiveryAtlasUrl }),
  aiBlue: Object.freeze({ id: 'ai-blue', url: aiBlueFormulaLiveryAtlasUrl }),
  aiGreen: Object.freeze({ id: 'ai-green', url: aiGreenFormulaLiveryAtlasUrl }),
  aiOrange: Object.freeze({ id: 'ai-orange', url: aiOrangeFormulaLiveryAtlasUrl }),
})

const FORMULA_CAR_DIMENSIONS = Object.freeze({
  length: 4.82,
  width: 2.18,
  height: 1.28,
  frontWheelRadius: 0.35,
  rearWheelRadius: 0.42,
})

const CARBON = '#111515'
const CARBON_EDGE = '#242a29'
const TYRE = '#080909'
const METAL = '#8d9692'
const TREAD_STRIPE = '#f2d33b'
const SUSPENSION_STRUTS = Object.freeze([
  [[-0.36, 0.34, -1.18], [-0.82, 0.35, -1.42]],
  [[-0.34, 0.55, -0.95], [-0.82, 0.48, -1.42]],
  [[0.36, 0.34, -1.18], [0.82, 0.35, -1.42]],
  [[0.34, 0.55, -0.95], [0.82, 0.48, -1.42]],
  [[-0.52, 0.34, 0.92], [-0.8, 0.38, 1.28]],
  [[-0.5, 0.58, 0.72], [-0.8, 0.53, 1.28]],
  [[0.52, 0.34, 0.92], [0.8, 0.38, 1.28]],
  [[0.5, 0.58, 0.72], [0.8, 0.53, 1.28]],
])
const FRONT_WING_PLANES = Object.freeze([
  { position: [0, 0.22, -2.27], rotation: [0, 0, 0], size: [2.18, 0.07, 0.38], material: 'carbon' },
  { position: [0, 0.31, -2.1], rotation: [-0.12, 0, 0], size: [1.9, 0.055, 0.22], material: 'accent' },
  { position: [0, 0.38, -1.96], rotation: [-0.19, 0, 0], size: [1.68, 0.045, 0.17], material: 'carbon' },
  { position: [0, 0.43, -1.86], rotation: [-0.24, 0, 0], size: [1.34, 0.035, 0.12], material: 'primary' },
])
const REAR_WING_PLANES = Object.freeze([
  { position: [0, 1.08, 1.88], rotation: [-0.07, 0, 0], size: [1.56, 0.14, 0.34], material: 'primary' },
  { position: [0, 0.9, 1.74], rotation: [-0.16, 0, 0], size: [1.43, 0.085, 0.22], material: 'accent' },
  { position: [0, 0.79, 1.68], rotation: [-0.22, 0, 0], size: [1.32, 0.055, 0.18], material: 'carbon' },
  { position: [0, 0.66, 1.54], rotation: [-0.27, 0, 0], size: [1.16, 0.045, 0.14], material: 'carbon' },
])
const FLOOR_FENCES = Object.freeze([-0.44, -0.2, 0.2, 0.44])
const DIFFUSER_FINS = Object.freeze([-0.52, -0.26, 0.26, 0.52])
const SIDEPOD_LOUVERS = Object.freeze([-0.36, -0.18, 0, 0.18, 0.36])
const REAR_LIGHT_STRIPS = Object.freeze([
  [-0.7, 0.78, 2.06],
  [0, 0.58, 2.1],
  [0.7, 0.78, 2.06],
])
const TYRE_TAG_ANGLES = Object.freeze([-2.18, -0.62, 0.82, 2.28])
const LIVERY_DETAILS = Object.freeze([
  { key: 'nose-number-panel', position: [0, 0.91, -1.03], rotation: [0.08, 0, 0], size: [0.36, 0.026, 0.44], material: 'accent' },
  { key: 'nose-number-left', position: [-0.075, 0.94, -1.03], rotation: [0.08, 0, 0], size: [0.045, 0.031, 0.29], material: 'carbon' },
  { key: 'nose-number-right', position: [0.075, 0.94, -1.03], rotation: [0.08, 0, 0], size: [0.045, 0.031, 0.29], material: 'carbon' },
  { key: 'sharkfin-panel', position: [0, 1.04, 0.96], rotation: [0.08, 0, 0], size: [0.06, 0.46, 0.72], material: 'accent' },
  { key: 'airbox-number-panel', position: [0, 1.23, 0.28], rotation: [0, 0, 0], size: [0.2, 0.055, 0.3], material: 'primary' },
])
const SIDE_DECALS = Object.freeze([
  { offset: -0.42, width: 0.42, material: 'accent' },
  { offset: 0.02, width: 0.5, material: 'primary' },
  { offset: 0.46, width: 0.32, material: 'warm' },
])
const ACTIVE_AERO_MARKERS = Object.freeze([
  { key: 'front-active-hinge-left', position: [-0.58, 0.52, -1.93], rotation: [0, 0, -0.14], size: [0.08, 0.22, 0.08], material: 'metal' },
  { key: 'front-active-hinge-right', position: [0.58, 0.52, -1.93], rotation: [0, 0, 0.14], size: [0.08, 0.22, 0.08], material: 'metal' },
  { key: 'rear-active-hinge-left', position: [-0.42, 1.0, 1.68], rotation: [-0.07, 0, 0], size: [0.09, 0.22, 0.08], material: 'metal' },
  { key: 'rear-active-hinge-right', position: [0.42, 1.0, 1.68], rotation: [-0.07, 0, 0], size: [0.09, 0.22, 0.08], material: 'metal' },
  { key: 'rear-overtake-mode-strip', position: [0, 1.2, 1.7], rotation: [-0.07, 0, 0], size: [1.08, 0.034, 0.04], material: 'lime', emissive: true },
])
const SIDE_SAFETY_LIGHTS = Object.freeze([
  [-0.83, 0.74, 0.46],
  [0.83, 0.74, 0.46],
])
const WHEEL_LAYOUT = Object.freeze([
  { index: 0, side: -1, x: -0.96, z: -1.42, radius: FORMULA_CAR_DIMENSIONS.frontWheelRadius },
  { index: 1, side: 1, x: 0.96, z: -1.42, radius: FORMULA_CAR_DIMENSIONS.frontWheelRadius },
  { index: 2, side: -1, x: -0.96, z: 1.28, radius: FORMULA_CAR_DIMENSIONS.rearWheelRadius },
  { index: 3, side: 1, x: 0.96, z: 1.28, radius: FORMULA_CAR_DIMENSIONS.rearWheelRadius },
])

const freezeLiveryPanel = panel => Object.freeze({
  ...panel,
  position: Object.freeze(panel.position),
  rotation: Object.freeze(panel.rotation),
  size: Object.freeze(panel.size),
})

export const PLAYER_LIVERY_GRAPHICS_LAYOUT = Object.freeze([
  freezeLiveryPanel({
    key: 'rear-wing-rear-face',
    position: [0, 1.09203, 2.051579],
    rotation: [-0.07, 0, 0],
    size: [1.48, 0.112],
    variant: 0,
  }),
  freezeLiveryPanel({
    key: 'rear-wing-top',
    position: [0, 1.151824, 1.874964],
    rotation: [-Math.PI / 2 - 0.07, 0, 0],
    size: [1.48, 0.3],
    variant: 1,
  }),
  freezeLiveryPanel({
    key: 'monocoque-top-spine',
    position: [0, 0.917066, -0.238903],
    rotation: [-Math.PI / 2 + 0.06, 0, 0],
    size: [0.252, 1.08],
    variant: 2,
  }),
  freezeLiveryPanel({
    key: 'sidepod-top-left',
    position: [-0.61, 0.6695, 0.16],
    rotation: [-Math.PI / 2, 0, 0],
    size: [0.452, 0.78],
    variant: 3,
  }),
  freezeLiveryPanel({
    key: 'sidepod-top-right',
    position: [0.61, 0.6695, 0.16],
    rotation: [-Math.PI / 2, 0, 0],
    size: [0.452, 0.78],
    variant: 3,
    mirrorU: true,
  }),
])

export function createPlayerLiveryGraphicsGeometry(owner = 'player') {
  const atlasInset = 1 / 1024
  const parts = PLAYER_LIVERY_GRAPHICS_LAYOUT.map(panel => {
    const geometry = new THREE.PlaneGeometry(...panel.size)
    const column = panel.variant % 2
    const row = Math.floor(panel.variant / 2)
    const minU = column * 0.5 + atlasInset
    const maxU = (column + 1) * 0.5 - atlasInset
    const minV = row === 0 ? 0.5 + atlasInset : atlasInset
    const maxV = row === 0 ? 1 - atlasInset : 0.5 - atlasInset
    const uvs = geometry.getAttribute('uv')
    for (let vertex = 0; vertex < uvs.count; vertex += 1) {
      const sourceU = panel.mirrorU ? 1 - uvs.getX(vertex) : uvs.getX(vertex)
      uvs.setXY(
        vertex,
        THREE.MathUtils.lerp(minU, maxU, sourceU),
        THREE.MathUtils.lerp(minV, maxV, uvs.getY(vertex)),
      )
    }
    uvs.needsUpdate = true

    const transform = new THREE.Matrix4().compose(
      new THREE.Vector3(...panel.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...panel.rotation)),
      new THREE.Vector3(1, 1, 1),
    )
    geometry.applyMatrix4(transform)
    return geometry
  })

  const merged = mergeGeometries(parts)
  for (const geometry of parts) geometry.dispose()
  if (!merged) throw new Error('Player livery graphics geometry could not be merged')
  merged.name = `${owner}-formula-livery-graphics-geometry`
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

function TaperedShell({
  frontWidth,
  rearWidth,
  frontHeight,
  rearHeight,
  length,
  children,
  ...meshProps
}) {
  const geometry = useMemo(() => {
    const ringSize = 8
    const positions = []
    const indices = []
    for (const [z, width, height] of [
      [-length / 2, frontWidth, frontHeight],
      [length / 2, rearWidth, rearHeight],
    ]) {
      for (let index = 0; index < ringSize; index += 1) {
        const angle = (index / ringSize) * Math.PI * 2
        positions.push(
          Math.cos(angle) * width / 2,
          Math.sin(angle) * height / 2,
          z,
        )
      }
    }
    for (let index = 0; index < ringSize; index += 1) {
      const next = (index + 1) % ringSize
      indices.push(index, next, ringSize + index, next, ringSize + next, ringSize + index)
    }
    for (let index = 1; index < ringSize - 1; index += 1) {
      indices.push(0, index + 1, index)
      indices.push(ringSize, ringSize + index, ringSize + index + 1)
    }
    const buffer = new THREE.BufferGeometry()
    buffer.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    buffer.setIndex(indices)
    buffer.computeVertexNormals()
    return buffer
  }, [frontHeight, frontWidth, length, rearHeight, rearWidth])
  useEffect(() => () => geometry.dispose(), [geometry])

  return <mesh geometry={geometry} {...meshProps}>{children}</mesh>
}

function resolvePaint(material, palette, accent) {
  if (material === 'accent') return accent
  if (material === 'primary') return palette.primary
  if (material === 'highlight') return palette.highlight
  if (material === 'shadow') return palette.shadow
  if (material === 'metal') return METAL
  if (material === 'warm') return TREAD_STRIPE
  if (material === 'lime') return '#bfff35'
  if (material === 'white') return '#f4f6ef'
  if (material === 'red') return '#ff2727'
  return CARBON_EDGE
}

function SuspensionStrut({ from, to, name = 'formula-suspension-strut' }) {
  const transform = useMemo(() => {
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    const direction = end.clone().sub(start)
    const length = direction.length()
    const midpoint = start.add(end).multiplyScalar(0.5)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    )
    return { length, midpoint, quaternion }
  }, [from, to])

  return (
    <mesh name={name} position={transform.midpoint} quaternion={transform.quaternion} castShadow>
      <cylinderGeometry args={[0.027, 0.027, transform.length, 6]} />
      <meshStandardMaterial color={CARBON_EDGE} roughness={0.42} metalness={0.72} />
    </mesh>
  )
}

function AeroPlane({ name, plane, palette, accent, castShadow = false }) {
  const color = resolvePaint(plane.material, palette, accent)

  return (
    <mesh name={name} position={plane.position} rotation={plane.rotation} castShadow={castShadow}>
      <boxGeometry args={plane.size} />
      <meshStandardMaterial color={color} roughness={0.38} metalness={0.6} />
    </mesh>
  )
}

function DetailBox({ detail, palette, accent }) {
  const color = resolvePaint(detail.material, palette, accent)
  return (
    <mesh name={detail.key} position={detail.position} rotation={detail.rotation ?? [0, 0, 0]} castShadow={detail.castShadow}>
      <boxGeometry args={detail.size} />
      <meshStandardMaterial
        color={color}
        roughness={detail.material === 'carbon' ? 0.48 : 0.34}
        metalness={detail.material === 'accent' || detail.material === 'primary' ? 0.42 : 0.62}
        emissive={detail.emissive ? color : '#000000'}
        emissiveIntensity={detail.emissive ? 1.8 : 0}
      />
    </mesh>
  )
}

function Wheel({
  index,
  side,
  x,
  z,
  radius,
  wheelRefs,
  showTyreTags = true,
  compact = false,
}) {
  const width = radius > 0.4 ? 0.34 : 0.29
  if (compact) {
    return (
      <group
        name={`formula-wheel-${index}`}
        ref={(node) => { wheelRefs.current[index] = node }}
        position={[x, radius, z]}
      >
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[radius, radius * 0.985, width, 14, 1]} />
          <meshStandardMaterial color={TYRE} roughness={0.92} metalness={0.02} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[radius * 0.34, radius * 0.34, width + 0.018, 10]} />
          <meshStandardMaterial color={METAL} roughness={0.28} metalness={0.88} />
        </mesh>
      </group>
    )
  }

  return (
    <group
      name={`formula-wheel-${index}`}
      ref={(node) => { wheelRefs.current[index] = node }}
      position={[x, radius, z]}
    >
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 0.985, width, 24, 1]} />
        <meshStandardMaterial color={TYRE} roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.43, radius * 0.43, width + 0.012, 16]} />
        <meshStandardMaterial color={CARBON_EDGE} roughness={0.3} metalness={0.82} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
        <cylinderGeometry args={[radius * 0.31, radius * 0.31, width + 0.02, 20]} />
        <meshStandardMaterial color="#6c7370" roughness={0.34} metalness={0.9} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[side * (width / 2 + 0.016), 0, 0]}>
        <cylinderGeometry args={[radius * 0.52, radius * 0.52, 0.028, 24]} />
        <meshStandardMaterial color={CARBON_EDGE} roughness={0.28} metalness={0.78} />
      </mesh>
      <mesh position={[side * (width / 2 + 0.022), radius * 0.08, 0]}>
        <boxGeometry args={[0.035, radius * 0.28, radius * 0.13]} />
        <meshStandardMaterial color="#e23c32" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh rotation={[0, side * Math.PI / 2, 0]} position={[side * (width / 2 + 0.008), 0, 0]}>
        <torusGeometry args={[radius * 0.72, 0.018, 5, 28]} />
        <meshStandardMaterial color={TREAD_STRIPE} roughness={0.48} />
      </mesh>
      {showTyreTags && TYRE_TAG_ANGLES.map((angle, tagIndex) => (
        <mesh
          key={`tyre-tag-${tagIndex}`}
          name="formula-tyre-tag"
          position={[
            side * (width / 2 + 0.034),
            Math.cos(angle) * radius * 0.58,
            Math.sin(angle) * radius * 0.58,
          ]}
          rotation={[0, side * Math.PI / 2, angle]}
        >
          <boxGeometry args={[0.014, 0.07, 0.026]} />
          <meshStandardMaterial color={TREAD_STRIPE} roughness={0.44} />
        </mesh>
      ))}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.14, radius * 0.14, width + 0.026, 12]} />
        <meshStandardMaterial color={METAL} roughness={0.24} metalness={0.92} />
      </mesh>
    </group>
  )
}

export default function FormulaCar({
  color = '#ef3157',
  accent = '#f4f6ef',
  isPlayer = false,
  liveryAtlas = null,
  rigidBodyRef,
  detail = 'hero',
}) {
  const rootRef = useRef()
  const wheelRefs = useRef([])
  // The player remains the close-camera hero. AI cars get a race LOD, with an
  // additional low-quality silhouette tier that removes hidden mechanical
  // pieces and multi-element aero while retaining the recognizable outline.
  const showHeroDetail = isPlayer || detail === 'hero'
  const isLowDetail = !isPlayer && detail === 'low'
  const showRaceDetail = !isLowDetail
  const palette = useMemo(() => {
    const primary = new THREE.Color(color)
    return {
      primary: `#${primary.getHexString()}`,
      highlight: `#${primary.clone().lerp(new THREE.Color('#ffffff'), 0.24).getHexString()}`,
      shadow: `#${primary.clone().lerp(new THREE.Color('#050505'), 0.5).getHexString()}`,
    }
  }, [color])
  const resolvedLiveryAtlas = isPlayer ? FORMULA_LIVERY_ATLASES.player : liveryAtlas
  const [liveryAssets, setLiveryAssets] = useState(null)

  useEffect(() => {
    if (!resolvedLiveryAtlas) {
      setLiveryAssets(null)
      return undefined
    }
    const geometry = createPlayerLiveryGraphicsGeometry(resolvedLiveryAtlas.id)
    const texture = new THREE.TextureLoader().load(resolvedLiveryAtlas.url)
    texture.name = `generated-${resolvedLiveryAtlas.id}-formula-livery-surface-atlas`
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 4
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.42,
      metalness: 0.44,
      emissive: '#ffffff',
      emissiveMap: texture,
      emissiveIntensity: 0.045,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
    material.name = `${resolvedLiveryAtlas.id}-formula-livery-graphics-material`
    const assets = { geometry, material, texture }
    setLiveryAssets(assets)
    return () => {
      assets.geometry.dispose()
      assets.material.dispose()
      assets.texture.dispose()
    }
  }, [resolvedLiveryAtlas])

  useFrame((state, delta) => {
    const gameState = useGameStore.getState().gameState
    if (gameState !== 'playing') return
    let speedKmh = isPlayer ? Math.abs(useGameStore.getState().speed) : 0
    if (typeof rigidBodyRef?.current?.linvel === 'function') {
      const velocity = rigidBodyRef.current.linvel()
      speedKmh = Math.hypot(velocity.x, velocity.z) * 3.6
    }
    const angularStep = Math.min(speedKmh / 3.6, 95) * Math.min(delta, 0.05)
    wheelRefs.current.forEach((wheel, index) => {
      if (!wheel?.rotation || typeof wheel.rotation.x !== 'number') return
      const radius = index < 2
        ? FORMULA_CAR_DIMENSIONS.frontWheelRadius
        : FORMULA_CAR_DIMENSIONS.rearWheelRadius
      wheel.rotation.x -= angularStep / radius
    })
    if (rootRef.current?.position && typeof rootRef.current.position.y === 'number') {
      const vibration = Math.min(speedKmh / 260, 1) * 0.007
      rootRef.current.position.y = Math.sin(state.clock.elapsedTime * 48) * vibration
    }
  })

  return (
    <group ref={rootRef} name={isPlayer ? 'player-formula-car' : 'ai-formula-car'}>
      {/* Floor, plank and diffuser establish the very low ground-effect stance. */}
      <mesh position={[0, 0.18, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[1.62, 0.11, 3.72]} />
        <meshStandardMaterial color={CARBON} roughness={0.54} metalness={0.62} />
      </mesh>
      <mesh position={[0, 0.105, 0]}>
        <boxGeometry args={[0.34, 0.045, 3.52]} />
        <meshStandardMaterial color="#b8a884" roughness={0.8} metalness={0.08} />
      </mesh>
      {[-0.58, 0.58].map(x => (
        <mesh key={`floor-edge-${x}`} position={[x, 0.235, 0.18]}>
          <boxGeometry args={[0.16, 0.09, 3.05]} />
          <meshStandardMaterial color={accent} roughness={0.48} metalness={0.35} />
        </mesh>
      ))}
      {showRaceDetail && FLOOR_FENCES.map(x => (
        <mesh key={`floor-fence-${x}`} position={[x, 0.31, -0.72]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.035, 0.28, 1.04]} />
          <meshStandardMaterial color={CARBON_EDGE} roughness={0.44} metalness={0.66} />
        </mesh>
      ))}

      {/* Tapered monocoque, nose and sidepods replace the former box chassis. */}
      <TaperedShell
        name="formula-monocoque"
        position={[0, 0.53, -0.13]}
        frontWidth={0.38}
        rearWidth={0.98}
        frontHeight={0.3}
        rearHeight={0.7}
        length={3.18}
        castShadow
      >
        <meshPhysicalMaterial color={palette.primary} roughness={0.26} metalness={0.34} clearcoat={0.72} clearcoatRoughness={0.2} />
      </TaperedShell>
      {showRaceDetail && LIVERY_DETAILS.map(detail => (
        <DetailBox key={detail.key} detail={detail} palette={palette} accent={accent} />
      ))}
      {showRaceDetail && <mesh position={[0, 0.9, -0.28]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.28, 0.035, 1.28]} />
        <meshStandardMaterial color={accent} roughness={0.3} metalness={0.38} />
      </mesh>}
      <TaperedShell
        position={[0, 0.39, -1.74]}
        frontWidth={0.2}
        rearWidth={0.38}
        frontHeight={0.16}
        rearHeight={0.28}
        length={1.42}
        castShadow
      >
        <meshPhysicalMaterial color={palette.highlight} roughness={0.24} metalness={0.32} clearcoat={0.76} />
      </TaperedShell>
      {[-0.61, 0.61].map(x => (
        <group key={`sidepod-${x}`}>
          <TaperedShell
            position={[x, 0.5, 0.25]}
            frontWidth={0.38}
            rearWidth={0.68}
            frontHeight={0.32}
            rearHeight={0.58}
            length={1.62}
            castShadow
          >
            <meshPhysicalMaterial color={palette.shadow} roughness={0.3} metalness={0.38} clearcoat={0.62} />
          </TaperedShell>
          {showRaceDetail && <mesh position={[x, 0.59, -0.36]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.17, 0.18, 8]} />
            <meshStandardMaterial color={CARBON} roughness={0.78} metalness={0.18} />
          </mesh>}
          {showRaceDetail && <mesh position={[x, 0.64, 0.06]}>
            <boxGeometry args={[0.48, 0.055, 1.02]} />
            <meshStandardMaterial color={accent} roughness={0.38} metalness={0.34} />
          </mesh>}
          {showHeroDetail && SIDE_DECALS.map((detail, index) => (
            <mesh
              key={`sidepod-decal-${x}-${index}`}
              name="formula-sidepod-decal"
              position={[x + Math.sign(x) * 0.018, 0.72, detail.offset]}
              rotation={[0, 0, x > 0 ? -0.18 : 0.18]}
            >
              <boxGeometry args={[0.042, 0.08, detail.width]} />
              <meshStandardMaterial color={resolvePaint(detail.material, palette, accent)} roughness={0.36} metalness={0.36} />
            </mesh>
          ))}
          {showHeroDetail && SIDEPOD_LOUVERS.map((offset, index) => (
            <mesh name="formula-sidepod-louver" key={`sidepod-louver-${x}-${index}`} position={[x, 0.82, -0.22 + offset]} rotation={[0, 0, x > 0 ? -0.18 : 0.18]}>
              <boxGeometry args={[0.05, 0.035, 0.24]} />
              <meshStandardMaterial color={CARBON} roughness={0.52} metalness={0.48} />
            </mesh>
          ))}
        </group>
      ))}
      <TaperedShell
        position={[0, 0.74, 0.72]}
        frontWidth={0.48}
        rearWidth={0.16}
        frontHeight={0.62}
        rearHeight={0.3}
        length={1.7}
        castShadow
      >
        <meshPhysicalMaterial color={palette.primary} roughness={0.28} metalness={0.34} clearcoat={0.7} />
      </TaperedShell>
      {liveryAssets && (
        <mesh
          name={isPlayer ? 'player-formula-livery-graphics' : 'ai-formula-livery-graphics'}
          geometry={liveryAssets.geometry}
          material={liveryAssets.material}
        />
      )}

      {/* Roll hoop, camera pod and mirrors complete the cockpit silhouette. */}
      <mesh position={[0, 1.04, 0.58]} scale={[0.2, 0.3, 0.18]} castShadow>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color={CARBON} roughness={0.38} metalness={0.62} />
      </mesh>
      <mesh position={[0, 1.27, 0.52]}>
        <boxGeometry args={[0.16, 0.1, 0.24]} />
        <meshStandardMaterial color="#e9efeb" roughness={0.26} metalness={0.52} />
      </mesh>
      {showRaceDetail && [-0.64, 0.64].map(x => (
        <group key={`mirror-${x}`}>
          <SuspensionStrut
            name="formula-mirror-support"
            from={[Math.sign(x) * 0.36, 0.86, -0.18]}
            to={[x, 0.96, -0.32]}
          />
          <mesh position={[x, 0.97, -0.34]} scale={[0.18, 0.08, 0.11]}>
            <sphereGeometry args={[1, 10, 6]} />
            <meshPhysicalMaterial color={palette.primary} roughness={0.24} clearcoat={0.7} />
          </mesh>
        </group>
      ))}

      {/* Cockpit, driver and halo are the defining modern F1 silhouette. */}
      <mesh position={[0, 0.78, 0.04]} scale={[0.43, 0.23, 0.63]}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshStandardMaterial color="#080b0b" roughness={0.22} metalness={0.58} />
      </mesh>
      <mesh position={[0, 1.0, 0.08]} scale={[0.22, 0.24, 0.23]} castShadow>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color={accent} roughness={0.28} metalness={0.42} />
      </mesh>
      <mesh name="formula-halo" position={[0, 1.0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.39, 0.045, 7, 22, Math.PI]} />
        <meshStandardMaterial color={CARBON_EDGE} roughness={0.28} metalness={0.72} />
      </mesh>
      <mesh position={[0, 0.91, -0.27]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.075, 0.075, 0.77]} />
        <meshStandardMaterial color={CARBON_EDGE} roughness={0.28} metalness={0.72} />
      </mesh>

      {/* Multi-element wings and endplates create recognizable aero surfaces. */}
      {(isLowDetail ? FRONT_WING_PLANES.slice(0, 1) : FRONT_WING_PLANES)
        .map(({ position, rotation, size, material }, index) => (
        <AeroPlane
          key={`front-wing-plane-${index}`}
          name={`formula-front-wing-${index}`}
          plane={{ position, rotation, size, material }}
          palette={palette}
          accent={accent}
          castShadow={index === 0}
        />
      ))}
      {showHeroDetail && ACTIVE_AERO_MARKERS.filter(detail => detail.key.startsWith('front')).map(detail => (
        <DetailBox key={detail.key} detail={detail} palette={palette} accent={accent} />
      ))}
      {[-1.05, 1.05].map(x => (
        <mesh key={`front-endplate-${x}`} position={[x, 0.32, -2.22]}>
          <boxGeometry args={[0.07, 0.31, 0.55]} />
          <meshStandardMaterial color={palette.primary} roughness={0.34} metalness={0.54} />
        </mesh>
      ))}
      {showRaceDetail && [-0.86, 0.86].map(x => (
        <mesh key={`front-slot-gap-${x}`} position={[x, 0.44, -2.03]} rotation={[0, 0, x > 0 ? 0.18 : -0.18]}>
          <boxGeometry args={[0.06, 0.24, 0.5]} />
          <meshStandardMaterial color={CARBON} roughness={0.48} metalness={0.58} />
        </mesh>
      ))}
      {(isLowDetail ? REAR_WING_PLANES.slice(0, 1) : REAR_WING_PLANES)
        .map(({ position, rotation, size, material }, index) => (
        <AeroPlane
          key={`rear-wing-plane-${index}`}
          name={`formula-rear-wing-${index}`}
          plane={{ position, rotation, size, material }}
          palette={palette}
          accent={accent}
          castShadow={index === 0}
        />
      ))}
      {showHeroDetail && ACTIVE_AERO_MARKERS.filter(detail => !detail.key.startsWith('front')).map(detail => (
        <DetailBox key={detail.key} detail={detail} palette={palette} accent={accent} />
      ))}
      {[-0.76, 0.76].map(x => (
        <mesh key={`rear-endplate-${x}`} position={[x, 0.8, 1.81]}>
          <boxGeometry args={[0.075, 0.68, 0.5]} />
          <meshStandardMaterial color={CARBON} roughness={0.44} metalness={0.64} />
        </mesh>
      ))}
      {showRaceDetail && [-0.52, 0.52].map(x => (
        <mesh key={`beam-wing-${x}`} position={[x, 0.58, 1.47]} rotation={[-0.18, 0, 0]}>
          <boxGeometry args={[0.42, 0.045, 0.18]} />
          <meshStandardMaterial color={accent} roughness={0.38} metalness={0.48} />
        </mesh>
      ))}
      <mesh position={[0, 0.51, 1.83]}>
        <boxGeometry args={[0.13, 0.7, 0.13]} />
        <meshStandardMaterial color={CARBON_EDGE} roughness={0.4} metalness={0.7} />
      </mesh>
      {REAR_LIGHT_STRIPS.filter((_, index) => showRaceDetail || index === 1).map(([x, y, z], index) => (
        <mesh key={`rear-light-${index}`} position={[x, y, z]}>
          <boxGeometry args={index === 1 ? [0.2, 0.09, 0.05] : [0.055, 0.26, 0.05]} />
          <meshStandardMaterial color="#ff2727" emissive="#d40808" emissiveIntensity={2.7} />
        </mesh>
      ))}
      {showRaceDetail && SIDE_SAFETY_LIGHTS.map(([x, y, z]) => (
        <mesh key={`side-safety-light-${x}`} position={[x, y, z]}>
          <boxGeometry args={[0.05, 0.16, 0.06]} />
          <meshStandardMaterial color="#41d6ff" emissive="#1789ff" emissiveIntensity={1.6} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.73, 1.63]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.105, 0.12, 0.3, 12]} />
        <meshStandardMaterial color="#303735" roughness={0.22} metalness={0.92} />
      </mesh>
      {showHeroDetail && DIFFUSER_FINS.map(x => (
        <mesh name="formula-diffuser-fin" key={`diffuser-${x}`} position={[x, 0.23, 1.77]} rotation={[-0.28, 0, 0]}>
          <boxGeometry args={[0.05, 0.23, 0.5]} />
          <meshStandardMaterial color={CARBON} roughness={0.5} metalness={0.58} />
        </mesh>
      ))}

      {showHeroDetail && SUSPENSION_STRUTS.map(([from, to], index) => (
        <SuspensionStrut key={`suspension-${index}`} from={from} to={to} />
      ))}
      {WHEEL_LAYOUT.map(wheel => (
        <Wheel
          key={`wheel-${wheel.index}`}
          {...wheel}
          wheelRefs={wheelRefs}
          showTyreTags={showHeroDetail}
          compact={isLowDetail}
        />
      ))}
    </group>
  )
}
