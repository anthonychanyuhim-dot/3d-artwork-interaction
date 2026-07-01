import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import type { ArtworkData } from '../data/artworks';
import { Artwork } from './Artwork';
import { HALF_WIDTH, HALF_DEPTH, SPRING_HEIGHT } from './SistineVaultMesh';

/**
 * A continuous, unbroken side-wall tapestry (Sistine anatomy), replacing the old
 * detached floating panels. Three stacked horizontal layers run the full nave:
 *   - Bottom  - a continuous faux-silk drapery banner.
 *   - Middle  - the 15th-century fresco cycle, locked HEAD-TO-TAIL at a uniform
 *               width (heights derived from each texture's true aspect) so the
 *               whole row reads as one seamless, gap-free sequence.
 *   - Top     - a cornice band pierced by a row of high windows.
 * The frescoes remain real clickable <Artwork> meshes (focus/zoom intact).
 */

// Uniform fresco width - the entire cycle locks together at this span.
export const WALL_ART_WIDTH = 6;
const DRAPERY_HEIGHT = 2; // bottom faux-silk band
const FRESCO_BOTTOM = DRAPERY_HEIGHT + 0.15; // frescoes rest just above the drapery
const UPPER_BAND_BOTTOM = 6.8; // cornice + windows occupy here -> the springline
const SURFACE_INSET = 0.06; // sit just in front of the structural wall plane

const DRAPERY_COLOR = '#7a6a3f'; // deep antique-gold silk (dark theme)
const CORNICE_COLOR = '#4a453b'; // dark stone cornice (no glare against the shadows)
const WINDOW_COLOR = '#1a1c24'; // dark high-window recesses

interface SistineSideWallMeshProps {
  wall: 'south' | 'north';
  artworks: ArtworkData[];
}

export function SistineSideWallMesh({ wall, artworks }: SistineSideWallMeshProps) {
  const isSouth = wall === 'south';
  // Surface sits just inside the structural wall plane, facing the nave.
  const x = isSouth ? -(HALF_WIDTH - SURFACE_INSET) : HALF_WIDTH - SURFACE_INSET;
  const rotationY = isSouth ? Math.PI / 2 : -Math.PI / 2;
  const wallLength = 2 * HALF_DEPTH;
  const upperHeight = SPRING_HEIGHT - UPPER_BAND_BOTTOM;
  const upperMidY = (UPPER_BAND_BOTTOM + SPRING_HEIGHT) / 2;

  // Pre-load textures to read true aspects -> head-to-tail heights / placement.
  const textures = useLoader(
    THREE.TextureLoader,
    artworks.map((a) => a.textureUrl),
  );
  const total = artworks.length * WALL_ART_WIDTH;
  const layout = artworks.map((_, i) => {
    const img = textures[i].image as { width: number; height: number };
    const aspect = img && img.width > 0 && img.height > 0 ? img.width / img.height : 1.5;
    return {
      height: WALL_ART_WIDTH / aspect,
      z: -total / 2 + WALL_ART_WIDTH * (i + 0.5), // centred head-to-tail, zero gaps
    };
  });

  // One high window above each fresco bay.
  const windowZ = layout.map((l) => l.z);

  return (
    <group name={`side-wall-${wall}`}>
      {/* Bottom: continuous faux-silk drapery banner */}
      <mesh position={[x, DRAPERY_HEIGHT / 2, 0]} rotation={[0, rotationY, 0]}>
        <planeGeometry args={[wallLength, DRAPERY_HEIGHT]} />
        <meshStandardMaterial color={DRAPERY_COLOR} roughness={0.9} metalness={0.04} side={THREE.DoubleSide} />
      </mesh>

      {/* Top: continuous cornice band + a row of high windows */}
      <mesh position={[x, upperMidY, 0]} rotation={[0, rotationY, 0]}>
        <planeGeometry args={[wallLength, upperHeight]} />
        <meshStandardMaterial color={CORNICE_COLOR} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {windowZ.map((z, i) => (
        <mesh
          key={`window-${i}`}
          position={[isSouth ? x + 0.02 : x - 0.02, upperMidY, z]}
          rotation={[0, rotationY, 0]}
        >
          <planeGeometry args={[1.8, upperHeight * 0.66]} />
          <meshStandardMaterial color={WINDOW_COLOR} roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Middle: the seamless head-to-tail fresco cycle (real clickable artworks). */}
      {artworks.map((artwork, i) => (
        <Artwork
          key={artwork.id}
          artwork={artwork}
          fixedWidth={WALL_ART_WIDTH}
          position={[x, FRESCO_BOTTOM + layout[i].height / 2, layout[i].z]}
        />
      ))}
    </group>
  );
}
