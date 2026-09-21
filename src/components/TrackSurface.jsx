import { RigidBody, TrimeshCollider } from '@react-three/rapier'

export default function TrackSurface({ track: activeTrack, assets }) {
  const trackBounds = activeTrack.bounds
  const infieldWidth = Math.max(900, trackBounds.width + 360)
  const infieldDepth = Math.max(900, trackBounds.depth + 360)

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
        <mesh
          name="track-barrier-structural-surfaces"
          geometry={assets.barrierStructuralSurfaceGeometry}
          material={assets.barrierStructuralSurfaceMaterial}
          receiveShadow
        />
      </RigidBody>

    </group>
  )
}
