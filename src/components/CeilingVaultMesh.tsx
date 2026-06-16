import type { ThreeEvent } from '@react-three/fiber';
import ceilingData from '../data/ceilingVault.panels.json';
import { uvToWorld } from '../data/ceilingVaultLayout';
import { useGallery } from '../state/GalleryContext';

/**
 * Append-only ceiling-vault module (see deep-research-report). It owns ONLY the
 * ceiling figure hotspots and touches no side-wall mesh, edge snapping, or HUD
 * code - it is a sibling of `SistineSideWallMesh` mounted under the scene root.
 *
 * The nine GEN-* Genesis scenes are skipped here: they are already rendered as
 * textured, clickable `ceiling_center` panels. The remaining 24 figures have no
 * texture assets (the official tour exposes no tile pyramid), so each is drawn as
 * a tasteful translucent marker on the vault that is fully clickable and drives
 * the existing HUD via the standard FOCUS_ARTWORK action. Positions come from the
 * shared barrel-vault adapter (uvToWorld), so they match the registry exactly.
 */

interface CeilingVaultMeshProps {
  chapelLength: number;
  chapelWidth: number;
  corniceHeight: number;
  vaultRise: number;
}

// Gilded marker tints per ceiling subgroup.
const SUBGROUP_COLOR: Record<string, string> = {
  Prophet: '#caa46a',
  Sibyl: '#b58cc4',
  Ancestors: '#8fae8f',
  Pendentive: '#c98f8f',
};

export function CeilingVaultMesh({
  chapelLength,
  chapelWidth,
  corniceHeight,
  vaultRise,
}: CeilingVaultMeshProps) {
  const { state, dispatch } = useGallery();

  // Only the registry-backed figures (everything except the Genesis strip) get an
  // interactive marker; clicking a Genesis hotspot would have no registry node.
  const figures = ceilingData.panels.filter((panel) => !panel.id.startsWith('GEN-'));

  const handleClick = (id: string) => (event: ThreeEvent<MouseEvent>) => {
    // Pointer hygiene (CLAUDE.md section 4) + never act mid-flight.
    event.stopPropagation();
    if (state.transitionLock) return;
    // Toggle: clicking the already-focused figure flies back to the gallery.
    if (state.mode === 'focused' && state.activeArtworkId === id) {
      dispatch({ type: 'TRIGGER_BACK' });
      return;
    }
    dispatch({ type: 'FOCUS_ARTWORK', payload: id });
  };

  return (
    <group name="ceiling-vault">
      {figures.map((panel) => {
        const position = uvToWorld(
          panel.viewport.u,
          panel.viewport.v,
          chapelLength,
          chapelWidth,
          corniceHeight,
          vaultRise,
        );
        // Atlas footprint -> world extents (u runs along Z length, v along X width).
        const extentX = panel.viewport.h * chapelWidth;
        const extentZ = panel.viewport.w * chapelLength;
        const color = SUBGROUP_COLOR[panel.subgroup] ?? '#cccccc';
        return (
          // Named `artwork-<id>` so CameraRig finds it and reads its world pose,
          // exactly like a real painting. Faces straight down ([PI/2,0,0] -> -Y).
          <group
            key={panel.id}
            name={`artwork-${panel.id}`}
            position={position}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <mesh onClick={handleClick(panel.id)}>
              <planeGeometry args={[extentX, extentZ]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.25}
                transparent
                opacity={0.16}
                depthWrite={false}
                side={2 /* THREE.DoubleSide */}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
