import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import ceilingData from '../data/ceilingVault.panels.json';
import { uvToWorld } from '../data/ceilingVaultLayout';
import { useGallery } from '../state/GalleryContext';

/**
 * Append-only ceiling-vault module (see deep-research-report). It owns ONLY the
 * ceiling figure hotspots and touches no side-wall mesh, edge snapping, or HUD.
 *
 * Texture loading is deliberately NON-suspending: every panel mounts immediately
 * and loads its fresco imperatively (THREE.TextureLoader, crossOrigin anonymous).
 * Until the image arrives - or if it is blocked / 404s - the panel shows a solid
 * lit PARCHMENT placeholder, never a raw grey shader, and one slow URL can never
 * stall the others (no shared Suspense boundary, no batch useTexture).
 *
 * Each panel is laid TANGENT (flush) to the barrel slope and floated inward so it
 * sits cleanly inside the chapel (no roof/wall clipping). `artwork-<id>` naming
 * lets CameraRig frame it like any painting; clicks drive the standard HUD.
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
const FALLBACK_ASPECT = 0.72; // portrait-ish placeholder until the real aspect is known

// Solid lit placeholder shown until (or unless) the fresco texture arrives.
const PARCHMENT = '#d2b48c';
// Gilded marker tints per subgroup (the lunettes / severies, which have no plate).
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
 * Orientation + clip-safe position for a panel on the vault. The panel is laid
 * TANGENT (flush) to the barrel slope: its +Z front uses the vault's inward
 * (room-facing) normal, so the flat plane is a chord the shell bows away from and
 * can never pierce the roof. We then pull toward the nave centre (X/Z) and drop
 * slightly (Y) so edges near the walls / end-walls stay inside, and float inward.
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
  if (normal.lengthSq() < 1e-6) normal.set(0, -1, 0); // apex -> straight down
  normal.normalize();

  let right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal);
  if (right.lengthSq() < 1e-6) right.set(0, 0, -1); // degenerate at the apex
  right.normalize();
  const up = new THREE.Vector3().crossVectors(normal, right).normalize();

  const quat = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, up, normal),
  );
  const anchored = new THREE.Vector3(x * CENTER_PULL, y - DROP_Y, z * CENTER_PULL);
  anchored.addScaledVector(normal, LIFT);
  return {
    position: [anchored.x, anchored.y, anchored.z],
    quaternion: [quat.x, quat.y, quat.z, quat.w],
  };
}

interface HeroPanelProps {
  id: string;
  url: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  onClick: (event: ThreeEvent<MouseEvent>) => void;
}

/** One hero fresco: mounts immediately, swaps parchment -> fresco on 200 OK. */
function HeroPanel({ id, url, position, quaternion, onClick }: HeroPanelProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let active = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (tex) => {
        if (!active) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      () => {
        /* network / CORS / 404 - keep the parchment placeholder, never grey */
      },
    );
    return () => {
      active = false;
    };
  }, [url]);

  useEffect(() => () => texture?.dispose(), [texture]);

  const img = texture?.image as { width: number; height: number } | undefined;
  const aspect = img && img.height > 0 ? img.width / img.height : FALLBACK_ASPECT;
  const planeW = HERO_HEIGHT * aspect; // local X runs along the nave
  const planeH = HERO_HEIGHT; // local Y runs up the slope

  return (
    <group name={`artwork-${id}`} position={position} quaternion={quaternion}>
      <mesh onClick={onClick}>
        <planeGeometry args={[planeW, planeH]} />
        {texture ? (
          <meshStandardMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
        ) : (
          <meshStandardMaterial color={PARCHMENT} roughness={0.9} side={THREE.DoubleSide} />
        )}
      </mesh>
    </group>
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

  // Precompute each panel's clip-safe frame once per dimension change.
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
      {/* 16 hero frescoes - non-suspending, parchment fallback until loaded. */}
      {HEROES.map((panel) => (
        <HeroPanel
          key={panel.id}
          id={panel.id}
          url={panel.image as string}
          position={frames[panel.id].position}
          quaternion={frames[panel.id].quaternion}
          onClick={handleClick(panel.id)}
        />
      ))}

      {/* Lunettes + Ancestor severies: tinted, clickable marker hotspots. */}
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
