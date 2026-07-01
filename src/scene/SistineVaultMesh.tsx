import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Procedural "Gallery Shell" — an elegant barrel-vaulted hall evoking the Sistine
 * Chapel, generated entirely in code (no external GLB, no licensing, a few KB of
 * geometry). It is proportioned to enclose the current artwork registry:
 *   • back wall  at z = -HALF_DEPTH  (behind The Creation of Adam @ z = -8)
 *   • left wall  at x = -HALF_WIDTH  (behind The Last Judgment   @ x = -8)
 *
 * The ceiling is a true tunnel/barrel vault running along Z, springing from the
 * tops of the two side walls (x = ±HALF_WIDTH) and curving to an apex overhead.
 * Cross-section follows a shallow cosine lobe — the flattened "segmental" profile
 * of a real chapel vault rather than a full semicircle.
 */

// Interior footprint half-extents (room spans 2× these on each axis). Exported so
// the artwork layouts (ceiling row + side-wall rows) stay locked to the shell as
// it scales — lengthening the nave automatically stretches the walls + vault.
export const HALF_WIDTH = 9; // side walls at x = ±9 → the vault springs from these
export const HALF_DEPTH = 25; // end walls at z = ±25 → long nave fitting all 9 ceiling scenes
// Springline: height at which the side walls stop and the vault begins.
export const SPRING_HEIGHT = 8;
// Rise of the vault above the springline (apex sits at SPRING_HEIGHT + VAULT_RISE).
export const VAULT_RISE = 4;

// Dark-theme finishes: deep warm stone for the walls + vault so the frescoes read
// as glowing focal points, and a near-black polished floor with a faint sheen.
const PLASTER = '#39342c';
const FLOOR_STONE = '#141319';

/** Vault cross-section height at a given x: a shallow cosine lobe over the width. */
function vaultHeight(x: number): number {
  return SPRING_HEIGHT + VAULT_RISE * Math.cos((x / HALF_WIDTH) * (Math.PI / 2));
}

export function SistineVaultMesh() {
  // Build the curved vault surface once: a grid sampled across the width (X) and
  // swept along the length (Z), triangulated into an indexed BufferGeometry.
  const vaultGeometry = useMemo(() => {
    const SEGMENTS_X = 64; // smoothness across the curved span
    const SEGMENTS_Z = 48; // smoothness along the tunnel
    const positions: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= SEGMENTS_X; i++) {
      const x = -HALF_WIDTH + (i / SEGMENTS_X) * (2 * HALF_WIDTH);
      const y = vaultHeight(x);
      for (let j = 0; j <= SEGMENTS_Z; j++) {
        const z = -HALF_DEPTH + (j / SEGMENTS_Z) * (2 * HALF_DEPTH);
        positions.push(x, y, z);
      }
    }

    const rowLen = SEGMENTS_Z + 1;
    for (let i = 0; i < SEGMENTS_X; i++) {
      for (let j = 0; j < SEGMENTS_Z; j++) {
        const a = i * rowLen + j;
        const b = a + rowLen;
        const c = a + 1;
        const d = b + 1;
        indices.push(a, b, c, c, b, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  // Dispose the generated geometry on unmount (consistent with Artwork.tsx).
  useEffect(() => {
    return () => {
      vaultGeometry.dispose();
    };
  }, [vaultGeometry]);

  const apexHeight = SPRING_HEIGHT + VAULT_RISE;

  return (
    <group name="gallery-shell">
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[2 * HALF_WIDTH, 2 * HALF_DEPTH]} />
        <meshStandardMaterial color={FLOOR_STONE} roughness={0.5} metalness={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Side walls (x = ±HALF_WIDTH) — stop at the springline; the vault takes over. */}
      <mesh position={[-HALF_WIDTH, SPRING_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2 * HALF_DEPTH, SPRING_HEIGHT]} />
        <meshStandardMaterial color={PLASTER} roughness={0.95} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[HALF_WIDTH, SPRING_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2 * HALF_DEPTH, SPRING_HEIGHT]} />
        <meshStandardMaterial color={PLASTER} roughness={0.95} metalness={0} side={THREE.DoubleSide} />
      </mesh>

      {/* End / gable walls (z = ±HALF_DEPTH) — full height up to the vault apex so
          the curved ends tuck against a flat surface with no open gap. */}
      <mesh position={[0, apexHeight / 2, -HALF_DEPTH]} rotation={[0, 0, 0]}>
        <planeGeometry args={[2 * HALF_WIDTH, apexHeight]} />
        <meshStandardMaterial color={PLASTER} roughness={0.95} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, apexHeight / 2, HALF_DEPTH]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2 * HALF_WIDTH, apexHeight]} />
        <meshStandardMaterial color={PLASTER} roughness={0.95} metalness={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Barrel vault ceiling */}
      <mesh geometry={vaultGeometry}>
        <meshStandardMaterial color={PLASTER} roughness={0.95} metalness={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
