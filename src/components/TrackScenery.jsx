import { HARBOUR_WATER } from './trackGeometry'

// Visual surfaces have no physics ownership.
export default function TrackScenery({ assets }) {
  return <group>
      {/* Buildings, stands and light structures share one scenery draw call. */}
      <mesh
        geometry={assets.sceneryGeometry}
        material={assets.sceneryMaterial}
        castShadow
        receiveShadow
      />
      <mesh
        name="track-surface-wear"
        geometry={assets.trackSurfaceWearGeometry}
        material={assets.trackSurfaceWearMaterial}
        castShadow
        receiveShadow
      />
      <mesh
        name="track-kerb-surfaces"
        geometry={assets.kerbSurfaceGeometry}
        material={assets.kerbSurfaceMaterial}
        castShadow
        receiveShadow
      />
      {assets.templeGrassVergeMaterial && (
        <mesh
          name="track-temple-grass-verges"
          geometry={assets.templeGrassVergeGeometry}
          material={assets.templeGrassVergeMaterial}
          receiveShadow
        />
      )}
      {assets.harbourHairpinIslandSurfaceMaterial && (
        <mesh
          name="track-harbour-hairpin-island-surface"
          geometry={assets.harbourHairpinIslandSurfaceGeometry}
          material={assets.harbourHairpinIslandSurfaceMaterial}
          castShadow
          receiveShadow
        />
      )}
      {assets.templeGravelRunoffMaterial && (
        <mesh
          name="track-temple-gravel-runoff"
          geometry={assets.templeGravelRunoffGeometry}
          material={assets.templeGravelRunoffMaterial}
          receiveShadow
        />
      )}
      {assets.apexGravelRunoffMaterial && (
        <mesh
          name="track-apex-gravel-runoff"
          geometry={assets.apexGravelRunoffGeometry}
          material={assets.apexGravelRunoffMaterial}
          receiveShadow
        />
      )}
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
      <mesh
        name="track-gantry-structure-surfaces"
        geometry={assets.gantryStructureSurfaceGeometry}
        material={assets.gantryStructureSurfaceMaterial}
        receiveShadow
      />
      {assets.apexVenueFacadeMaterial && (
        <mesh
          name="track-apex-venue-facades"
          geometry={assets.apexVenueFacadeGeometry}
          material={assets.apexVenueFacadeMaterial}
          receiveShadow
        />
      )}
      {assets.apexTowerRingSurfaceMaterial && (
        <mesh
          name="track-apex-tower-ring-surfaces"
          geometry={assets.apexTowerRingSurfaceGeometry}
          material={assets.apexTowerRingSurfaceMaterial}
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
      {assets.apexRaceControlRoofSurfaceMaterial && (
        <mesh
          name="track-apex-race-control-roof-surfaces"
          geometry={assets.apexRaceControlRoofSurfaceGeometry}
          material={assets.apexRaceControlRoofSurfaceMaterial}
          receiveShadow
        />
      )}
      {assets.apexMarshalWindowSurfaceMaterial && (
        <mesh
          name="track-apex-marshal-window-surfaces"
          geometry={assets.apexMarshalWindowSurfaceGeometry}
          material={assets.apexMarshalWindowSurfaceMaterial}
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
      {assets.apartmentUpperSurfaceMaterial && (
        <mesh
          name="track-harbour-apartment-upper-surfaces"
          geometry={assets.apartmentUpperSurfaceGeometry}
          material={assets.apartmentUpperSurfaceMaterial}
          castShadow
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
      {assets.yachtUpperSurfaceMaterial && (
        <mesh
          name="track-harbour-yacht-upper-surfaces"
          geometry={assets.yachtUpperSurfaceGeometry}
          material={assets.yachtUpperSurfaceMaterial}
          receiveShadow
        />
      )}
      {assets.yachtRigSurfaceMaterial && (
        <mesh
          name="track-harbour-yacht-rig-surfaces"
          geometry={assets.yachtRigSurfaceGeometry}
          material={assets.yachtRigSurfaceMaterial}
          castShadow
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
      {assets.palmTrunkSurfaceMaterial && (
        <mesh
          name="track-palm-trunk-surfaces"
          geometry={assets.palmTrunkSurfaceGeometry}
          material={assets.palmTrunkSurfaceMaterial}
          castShadow
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
      <mesh
        name="track-glow-surfaces"
        geometry={assets.glowGeometry}
        material={assets.glowMaterial}
      />

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

      <mesh
        name="track-catch-fence-surfaces"
        geometry={assets.catchFenceGeometry}
        material={assets.fenceMaterial}
        renderOrder={2}
      />

      {assets.floodlights.map((position, index) => (
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

      {assets.tunnelLights.map(({ position }, index) => (
        <pointLight
          key={`harbour-tunnel-${index}`}
          name={`harbour-tunnel-light-${index}`}
          position={position}
          color="#ffd9a0"
          intensity={52}
          distance={34}
          decay={2}
          castShadow={false}
        />
      ))}
  </group>
}
