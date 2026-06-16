import { Suspense, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { artworksRegistry } from '../data/artworks';
import type { ArtworkData } from '../data/artworks';
import { useGallery } from '../state/GalleryContext';
import { Artwork, CEILING_WIDTH } from './Artwork';
import { CameraRig, HOME_POSITION, HOME_TARGET } from './CameraRig';
import { SistineVaultMesh, HALF_WIDTH, HALF_DEPTH, SPRING_HEIGHT, VAULT_RISE } from './SistineVaultMesh';
import { SistineSideWallMesh } from './SistineSideWallMesh';
import { CeilingVaultMesh } from '../components/CeilingVaultMesh';

// Current position of the chronological timeline. Only artworks whose activePeriod
// spans this year are rendered (e.g. a pre-1508 ceiling would swap out once
// Michelangelo's frescoes go active). All surviving works are present in 2026.
const VISIBLE_YEAR = 2026;

// Flat ceiling strip height — panels at CEILING_WIDTH (x = ±4) clear the vault.
const CEILING_Y = 10.6;

/**
 * Ceiling Genesis row — one continuous, gap-free tapestry. Textures are pre-loaded
 * to read each true aspect; heights derive from CEILING_WIDTH / aspect; Z centres
 * are stacked head-to-tail (each panel's edge meeting the previous) down X = 0.
 */
function CeilingRow({ artworks }: { artworks: ArtworkData[] }) {
  const textures = useLoader(
    THREE.TextureLoader,
    artworks.map((a) => a.textureUrl),
  );

  const positions = useMemo(() => {
    const heights = textures.map((t) => {
      const img = t.image as { width: number; height: number };
      return CEILING_WIDTH / (img.width / img.height);
    });
    const total = heights.reduce((sum, h) => sum + h, 0);
    let edge = -total / 2;
    return heights.map((h) => {
      const center = edge + h / 2;
      edge += h;
      return center;
    });
  }, [textures]);

  return (
    <>
      {artworks.map((artwork, i) => (
        <Artwork
          key={artwork.id}
          artwork={artwork}
          fixedWidth={CEILING_WIDTH}
          position={[0, CEILING_Y, positions[i]]}
        />
      ))}
    </>
  );
}

export function GalleryScene() {
  const { state, dispatch } = useGallery();

  // Group the currently-active registry by architectural zone, ordered by sequence.
  const { ceiling, south, north, altar } = useMemo(() => {
    const active = artworksRegistry.filter(
      (a) =>
        VISIBLE_YEAR >= a.activePeriod.startYear && VISIBLE_YEAR <= a.activePeriod.endYear,
    );
    const inZone = (zone: ArtworkData['zone']) =>
      active.filter((a) => a.zone === zone).sort((a, b) => a.sequence - b.sequence);
    return {
      ceiling: inZone('ceiling_center'),
      south: inZone('side_wall_south'),
      north: inZone('side_wall_north'),
      altar: inZone('altar_wall'),
    };
  }, []);

  return (
    <Canvas
      // devicePixelRatio clamped to 2 (CLAUDE.md §4) to protect mobile/Retina GPUs;
      // high-performance hint asks for the discrete GPU on multi-GPU machines.
      dpr={[1, 2]}
      gl={{ powerPreference: 'high-performance' }}
      camera={{ position: HOME_POSITION, fov: 45 }}
      onPointerMissed={() => {
        // Click empty space while focused → return. Disabled while zoomed in
        // (isInspecting) so panning around details can't pop back to the gallery;
        // Esc still returns from a zoomed state.
        if (state.mode === 'focused' && !state.isInspecting) {
          dispatch({ type: 'TRIGGER_BACK' });
        }
      }}
    >
      {/* Interior lighting — the long nave needs ambient fill plus a row of soft
          point lights down its length so the vault and walls read evenly. */}
      <ambientLight intensity={0.85} />
      <directionalLight position={[10, 15, 5]} intensity={0.5} />
      {[-18, -6, 6, 18].map((z) => (
        <pointLight key={z} position={[0, 9, z]} intensity={0.4} distance={32} decay={1.1} />
      ))}

      {/* Procedural barrel-vaulted gallery shell (Sistine-evoking architecture). */}
      <SistineVaultMesh />

      {/* Append-only ceiling-vault atlas module: 33-panel waypoint scaffold mapped
          onto the vault. Owns only ceiling hotspots - no side-wall / HUD changes. */}
      <CeilingVaultMesh
        chapelLength={2 * HALF_DEPTH}
        chapelWidth={2 * HALF_WIDTH}
        corniceHeight={SPRING_HEIGHT}
        vaultRise={VAULT_RISE}
      />

      <Suspense fallback={null}>
        {ceiling.length > 0 && <CeilingRow artworks={ceiling} />}
        {south.length > 0 && <SistineSideWallMesh wall="south" artworks={south} />}
        {north.length > 0 && <SistineSideWallMesh wall="north" artworks={north} />}
        {altar.map((artwork) => (
          <Artwork key={artwork.id} artwork={artwork} />
        ))}
      </Suspense>

      {/* Default target = the shared home target (central axis, room centre). */}
      <OrbitControls makeDefault target={HOME_TARGET} />
      <CameraRig />
    </Canvas>
  );
}
