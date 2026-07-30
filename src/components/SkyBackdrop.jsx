import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import apexSkyPanoramaUrl from '../assets/textures/apex-night-sky-panorama-1024.webp'
import harbourSkyPanoramaUrl from '../assets/textures/harbour-day-sky-panorama-1024.webp'
import templeSkyPanoramaUrl from '../assets/textures/temple-day-sky-panorama-1024.webp'

const SKY_PANORAMA_BY_VENUE = Object.freeze({
  apex: apexSkyPanoramaUrl,
  harbour: harbourSkyPanoramaUrl,
  temple: templeSkyPanoramaUrl,
})

export default function SkyBackdrop({ track }) {
  const venue = track?.venue ?? 'apex'
  const panoramaUrl = SKY_PANORAMA_BY_VENUE[venue] ?? SKY_PANORAMA_BY_VENUE.apex
  const texture = useMemo(() => {
    const panorama = new THREE.TextureLoader().load(panoramaUrl)
    panorama.name = `generated-${venue}-sky-panorama`
    panorama.colorSpace = THREE.SRGBColorSpace
    panorama.wrapS = THREE.RepeatWrapping
    panorama.wrapT = THREE.ClampToEdgeWrapping
    panorama.minFilter = THREE.LinearMipmapLinearFilter
    panorama.magFilter = THREE.LinearFilter
    panorama.generateMipmaps = true
    panorama.anisotropy = 2
    return panorama
  }, [panoramaUrl, venue])

  useEffect(() => () => {
    texture.dispose()
  }, [texture])

  return (
    <mesh
      name="track-sky-backdrop"
      position={[track?.bounds?.centerX ?? 0, -15, track?.bounds?.centerZ ?? 0]}
      renderOrder={-1000}
      frustumCulled={false}
    >
      <sphereGeometry args={[1300, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2 + 0.12]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  )
}
