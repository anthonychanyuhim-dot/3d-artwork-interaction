import { Suspense, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import ceilingData from '../data/ceilingVault.panels.json';
import { uvToWorld } from '../data/ceilingVaultLayout';
import { useGallery } from '../state/GalleryContext';

/**
 * Append-only ceiling-vault module (see deep-research-report). It owns ONLY the
 * ceiling figure hotspots and touches no side-wall mesh, edge snapping, or HUD
 * code - it is a sibling of `SistineSideWallMesh` mounted under the scene root.
 *
 * The nine GEN-* Genesis scenes are skipped here (already textured as
 * `ceiling_center`). The 16 hero figures that carry an `image` URL in
 * ceilingVault.panels.json (12 Prophets/Sibyls + 4 Pendentives) are painted with
 * their verified Wikimedia frescoes via drei `useTexture`; the rest (lunettes and
 * Ancestor severies) fall back to tinted marker hotspots. All are clickable and
 * drive the existing HUD through the standard FOCUS_ARTWORK action.
 *
 * CRITICAL geometry: each panel is tilted to lie ALONG the barrel slope (its face
 * pointing down-and-inward along the vault's inward normal) and lifted a small
 * epsilon off the shell - otherwise a flat down-facing plane reads edge-on (and
 * z-fights the grey plaster) when you look up at the side slopes.
 */

interface CeilingPanelJson {
  id: string;
  subgroup: string;
  viewport: { u: number; v: number; w: number; h: number };
  image?: string;
}

const PANELS = ceilingData.panels as unknown as CeilingPanelJson[];
const FIGURES = PANELS.filter((p) => !p.id.startsWith('GEN-'));
const HEROES = FIGURES.filter((p) => !!p.image);
const MARKERS = FIGURES.filter((p) => !p.image);

// Float each panel this far INTO the chapel, clear of the curved grey vault shell,
// so it is never occluded by (or co-planar with) the plaster from inside the room.
const LIFT = 0.8;
// The panels aim at the nave interior - a low point on the central axis - so their
// front faces always point down into the room (never out toward the sky).
const INTERIOR_Y = 3;
const HERO_HEIGHT = 5; // world units up the slope; width follows the image aspect

// Gilded marker tints per subgroup (fallback when no fresco plate exists).
const SUBGROUP_COLOR: Record<string, string> = {
  Prophet: '#caa46a',
  Sibyl: '#b58cc4',
  Ancestors: '#8fae8f',
  Pendentive: '#c98f8f',
  Lunette: '#d8cdb0',
};

interface CeilingVaultMeshProps {
  chapelLength: number;
  chapelWidth: number;
  corniceHeight: number;
  vaultRise: number;
}

/**
 * Orientation + lifted position for a panel on the vault. We point the panel's
 * FRONT (+Z) at the chapel interior - a low point on the central axis directly
 * "under" the panel - so it always faces down into the room (never out toward the
 * sky), and we float it `LIFT` units along that same inward direction so it sits
 * clear of the curved grey shell (which would otherwise occlude it from inside).
 * Using the explicit interior target (not the ellipse normal) makes the inward
 * direction unambiguous regardless of which slope the panel is on.
 */
function slopeFrame(
  pos: [number, number, number],
): { position: [number, number, number]; quaternion: [number, number, number, number] } {
  const [x, y, z] = pos;
  // Vector from the panel toward the nave interior (central axis, low in the room).
  const inward = new THREE.Vector3(-x, INTERIOR_Y - y, 0);
  if (inward.lengthSq() < 1e-6) inward.set(0, -1, 0);
  inward.normalize();

  // Upright basis: right runs along the nave, up runs up the slope, +Z = inward.
  let right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), inward);
  if (right.lengthSq() < 1e-6) right.set(0, 0, -1); // degenerate when inward is vertical
  right.normalize();
  const up = new THREE.Vector3().crossVectors(inward, right).normalize();

  const quat = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, up, inward),
  );
  const lifted = new THREE.Vector3(x, y, z).addScaledVector(inward, LIFT);
  return {
    position: [lifted.x, lifted.y, lifted.z],
    quaternion: [quat.x, quat.y, quat.z, quat.w],
  };
}

interface ClickProp {
  onClick: (id: string) => (event: ThreeEvent<MouseEvent>) => void;
}
interface VaultDims {
  chapelLength: number;
  chapelWidth: number;
  corniceHeight: number;
  vaultRise: number;
}

/** The 16 hero frescoes - textures preloaded together via drei useTexture. */
function CeilingHeroes({
  chapelLength,
  chapelWidth,
  corniceHeight,
  vaultRise,
  onClick,
}: VaultDims & ClickProp) {
  // drei useTexture preloads all 16 remote images at once. three's loader uses
  // crossOrigin 'anonymous' by default, so Wikimedia (ACAO: *) is CORS-safe.
  const urls = useMemo(() => HEROES.map((p) => p.image as string), []);
  const textures = useTexture(urls) as THREE.Texture[];

  useMemo(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
    });
  }, [textures]);

  return (
    <>
      {HEROES.map((panel, i) => {
        const texture = textures[i];
        const world = uvToWorld(panel.viewport.u, panel.viewport.v, chapelLength, chapelWidth, corniceHeight, vaultRise);
        const { position, quaternion } = slopeFrame(world);
        const img = texture.image as { width: number; height: number } | undefined;
        const aspect = img && img.height > 0 ? img.width / img.height : 0.7;
        const planeW = HERO_HEIGHT * aspect; // local X runs along the nave
        const planeH = HERO_HEIGHT; // local Y runs up the slope
        return (
          // Named `artwork-<id>` so CameraRig finds it and frames it (forward = the
          // inward normal, so the camera flies off the slope and looks back at it).
          <group key={panel.id} name={`artwork-${panel.id}`} position={position} quaternion={quaternion}>
            <mesh onClick={onClick(panel.id)}>
              <planeGeometry args={[planeW, planeH]} />
              <meshStandardMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** Lunettes + Ancestor severies: tinted, clickable marker hotspots (no plate). */
function CeilingMarkers({
  chapelLength,
  chapelWidth,
  corniceHeight,
  vaultRise,
  onClick,
}: VaultDims & ClickProp) {
  return (
    <>
      {MARKERS.map((panel) => {
        const world = uvToWorld(panel.viewport.u, panel.viewport.v, chapelLength, chapelWidth, corniceHeight, vaultRise);
        const { position, quaternion } = slopeFrame(world);
        const extentX = panel.viewport.h * chapelWidth;
        const extentZ = panel.viewport.w * chapelLength;
        const color = SUBGROUP_COLOR[panel.subgroup] ?? '#cccccc';
        return (
          <group key={panel.id} name={`artwork-${panel.id}`} position={position} quaternion={quaternion}>
            <mesh onClick={onClick(panel.id)}>
              <planeGeometry args={[extentX, extentZ]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.25}
                transparent
                opacity={0.18}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

export function CeilingVaultMesh({ chapelLength, chapelWidth, corniceHeight, vaultRise }: CeilingVaultMeshProps) {
  const { state, dispatch } = useGallery();

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

  const dims = { chapelLength, chapelWidth, corniceHeight, vaultRise };

  return (
    <group name="ceiling-vault">
      {/* Heroes suspend while their textures preload; markers render immediately. */}
      <Suspense fallback={null}>
        <CeilingHeroes {...dims} onClick={handleClick} />
      </Suspense>
      <CeilingMarkers {...dims} onClick={handleClick} />
    </group>
  );
}
