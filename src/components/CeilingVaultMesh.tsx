import { Suspense, useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import ceilingData from '../data/ceilingVault.panels.json';
import { uvToWorld } from '../data/ceilingVaultLayout';
import { useGallery } from '../state/GalleryContext';

/**
 * Append-only ceiling-vault module (see deep-research-report). It owns ONLY the
 * ceiling figure hotspots and touches no side-wall mesh, edge snapping, or HUD.
 *
 * Texture loading uses the SAME proven path as the working frescoes (Artwork.tsx):
 * R3F `useLoader(THREE.TextureLoader, url)` with `colorSpace = SRGB`. Each hero
 * panel sits in its OWN <Suspense> so they load independently (no batch deadlock)
 * and show a solid parchment placeholder until their image resolves - never a raw
 * grey/black shader. An imperative loader was previously used here and failed to
 * display the textures (blank/black), so this matches the components that work.
 *
 * Each panel is laid TANGENT (flush) to the barrel slope and floated inward so it
 * never clips the roof/walls; `artwork-<id>` naming lets CameraRig frame it.
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

// --- Position adjustment variables (anti-clipping) -------------------------
const LIFT = 0.4; // float inward along the vault's inward normal (clear of shell)
const CENTER_PULL = 0.92; // scale X/Z toward the nave centre so edges clear walls
const DROP_Y = 0.05; // tiny extra drop so it reads as floating inside the ceiling
const HERO_HEIGHT = 4; // world units up the slope; width follows the image aspect
const LUN_HEIGHT = 2.6; // lunettes are wide + sit close together above the windows
const FALLBACK_ASPECT = 0.72; // placeholder shape until the real aspect is known

const PARCHMENT = '#d2b48c'; // solid lit placeholder while a fresco loads
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
 * Tangent-to-slope orientation + clip-safe position (its +Z front uses the vault's
 * inward normal, so the flat plane is a chord the shell bows away from). Pulled
 * toward the nave centre and dropped slightly, then floated inward.
 */
function slopeFrame(
  pos: [number, number, number],
  chapelWidth: number,
  corniceHeight: number,
  vaultRise: number,
): { position: [number, number, number]; quaternion: [number, number, number, number] } {
  const [x, y, z] = pos;
  const halfW = chapelWidth / 2;
  const normal = new THREE.Vector3(-x / (halfW * halfW), -(y - corniceHeight) / (vaultRise * vaultRise), 0);
  if (normal.lengthSq() < 1e-6) normal.set(0, -1, 0);
  normal.normalize();
  let right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal);
  if (right.lengthSq() < 1e-6) right.set(0, 0, -1);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(normal, right).normalize();
  const quat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, normal));
  const anchored = new THREE.Vector3(x * CENTER_PULL, y - DROP_Y, z * CENTER_PULL);
  anchored.addScaledVector(normal, LIFT);
  return {
    position: [anchored.x, anchored.y, anchored.z],
    quaternion: [quat.x, quat.y, quat.z, quat.w],
  };
}

type Click = (event: ThreeEvent<MouseEvent>) => void;

/** The fresco itself - loaded via the proven R3F useLoader path (suspends). */
function HeroArt({ url, baseHeight, onClick }: { url: string; baseHeight: number; onClick: Click }) {
  const texture = useLoader(THREE.TextureLoader, url);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);
  const img = texture.image as { width: number; height: number } | undefined;
  const aspect = img && img.height > 0 ? img.width / img.height : FALLBACK_ASPECT;
  return (
    <mesh onClick={onClick}>
      <planeGeometry args={[baseHeight * aspect, baseHeight]} />
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

/** Solid parchment placeholder shown while the fresco texture is still loading. */
function FallbackPanel({ baseHeight, onClick }: { baseHeight: number; onClick: Click }) {
  return (
    <mesh onClick={onClick}>
      <planeGeometry args={[baseHeight * FALLBACK_ASPECT, baseHeight]} />
      <meshStandardMaterial color={PARCHMENT} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}

interface HeroPanelProps {
  id: string;
  url: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  baseHeight: number;
  onClick: Click;
}

function HeroPanel({ id, url, position, quaternion, baseHeight, onClick }: HeroPanelProps) {
  return (
    // Named group always present (for CameraRig); its child swaps parchment -> fresco.
    <group name={`artwork-${id}`} position={position} quaternion={quaternion}>
      <Suspense fallback={<FallbackPanel baseHeight={baseHeight} onClick={onClick} />}>
        <HeroArt url={url} baseHeight={baseHeight} onClick={onClick} />
      </Suspense>
    </group>
  );
}

export function CeilingVaultMesh({ chapelLength, chapelWidth, corniceHeight, vaultRise }: CeilingVaultMeshProps) {
  const { state, dispatch } = useGallery();

  const handleClick = (id: string) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (state.transitionLock) return;
    if (state.mode === 'focused' && state.activeArtworkId === id) {
      dispatch({ type: 'TRIGGER_BACK' });
      return;
    }
    dispatch({ type: 'FOCUS_ARTWORK', payload: id });
  };

  const frames = useMemo(() => {
    const map: Record<string, ReturnType<typeof slopeFrame>> = {};
    for (const p of FIGURES) {
      const world = uvToWorld(p.viewport.u, p.viewport.v, chapelLength, chapelWidth, corniceHeight, vaultRise);
      map[p.id] = slopeFrame(world, chapelWidth, corniceHeight, vaultRise);
    }
    return map;
  }, [chapelLength, chapelWidth, corniceHeight, vaultRise]);

  return (
    <group name="ceiling-vault">
      {HEROES.map((panel) => (
        <HeroPanel
          key={panel.id}
          id={panel.id}
          url={panel.image as string}
          position={frames[panel.id].position}
          quaternion={frames[panel.id].quaternion}
          baseHeight={panel.subgroup === 'Lunette' ? LUN_HEIGHT : HERO_HEIGHT}
          onClick={handleClick(panel.id)}
        />
      ))}

      {/* Ancestor severies (no standalone Commons plate): tinted marker hotspots. */}
      {MARKERS.map((panel) => {
        const { position, quaternion } = frames[panel.id];
        const extentX = panel.viewport.h * chapelWidth;
        const extentZ = panel.viewport.w * chapelLength;
        const color = SUBGROUP_COLOR[panel.subgroup] ?? '#cccccc';
        return (
          <group key={panel.id} name={`artwork-${panel.id}`} position={position} quaternion={quaternion}>
            <mesh onClick={handleClick(panel.id)}>
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
    </group>
  );
}
