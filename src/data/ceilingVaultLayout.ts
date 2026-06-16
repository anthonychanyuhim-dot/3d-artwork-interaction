import { HALF_WIDTH, HALF_DEPTH, SPRING_HEIGHT, VAULT_RISE } from '../scene/SistineVaultMesh';

/**
 * Shared barrel-vault coordinate adapter for the ceiling atlas. The report's
 * normalized atlas runs u = entrance->altar and v = BandA->BandB; this chapel runs
 * its LENGTH along Z (altar at -Z, entrance at +Z) and WIDTH along X, so u maps to
 * Z and v maps to X. The shallow-barrel rise is preserved across the transverse
 * (X) axis, matching the vault that springs from x = +/- (chapelWidth / 2).
 *
 * Used by BOTH the registry builder (ceilingVaultRegistry) and the scene mesh
 * (CeilingVaultMesh) so panel world positions are computed in exactly one place.
 */

export const CHAPEL_LENGTH = 2 * HALF_DEPTH;
export const CHAPEL_WIDTH = 2 * HALF_WIDTH;
export const CORNICE_HEIGHT = SPRING_HEIGHT;
export const CEILING_VAULT_RISE = VAULT_RISE;

export function uvToWorld(
  u: number,
  v: number,
  chapelLength: number = CHAPEL_LENGTH,
  chapelWidth: number = CHAPEL_WIDTH,
  corniceHeight: number = CORNICE_HEIGHT,
  vaultRise: number = CEILING_VAULT_RISE,
): [number, number, number] {
  const z = (0.5 - u) * chapelLength; // u=0 -> +half (entrance); u=1 -> -half (altar)
  const x = (v - 0.5) * chapelWidth;
  const t = x / (chapelWidth * 0.5); // -1..1 across the nave width
  const y = corniceHeight + vaultRise * Math.sqrt(Math.max(0, 1 - t * t));
  return [x, y, z];
}
