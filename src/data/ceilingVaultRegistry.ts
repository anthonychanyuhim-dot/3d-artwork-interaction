import type { ArtworkData } from './artworks';
import ceilingData from './ceilingVault.panels.json';
import { uvToWorld } from './ceilingVaultLayout';

/**
 * Derives live ArtworkData nodes from the ceiling atlas (deep-research-report) so
 * the ceiling figures become valid focus targets in the core artworksRegistry.
 *
 * The nine GEN-* Genesis scenes are intentionally SKIPPED: they already exist as
 * fully textured, interactive `ceiling_center` nodes with richer Wikipedia text
 * and working cross-wall bridges. Re-adding them would create duplicate, texture-
 * less ghost panels. The remaining 24 figures (Prophets, Sibyls, Ancestor
 * spandrels, corner Pendentives) are genuinely new and are wired in here.
 *
 * Positions come from the shared uvToWorld adapter; orientation faces straight
 * down ([PI/2, 0, 0] -> normal -Y) with cameraUp [0,0,1], identical to the
 * existing Genesis ceiling, so CameraRig flies below each figure and looks up.
 */

// Short factual blurb per subgroup, used for the HUD "Did You Know?" field.
const SUBGROUP_BLURB: Record<string, string> = {
  Prophet: 'One of the twelve seers (prophets and sibyls) enthroned along the vault, foretelling the coming of Christ.',
  Sibyl: 'One of the twelve seers (prophets and sibyls) enthroned along the vault; the sibyls carry pagan prophecy into the Christian scheme.',
  Ancestors: 'Part of the genealogy of Christ, painted in the triangular spandrels between the thrones.',
  Pendentive: 'One of the four corner pendentives showing an Old Testament scene of Israel\'s miraculous salvation.',
};

export const ceilingVaultArtworks: ArtworkData[] = ceilingData.panels
  // Genesis already lives as textured `ceiling_center` nodes - do not duplicate.
  .filter((panel) => !panel.id.startsWith('GEN-'))
  .map((panel): ArtworkData => ({
    id: panel.id,
    title: panel.title,
    artist: 'Michelangelo',
    description: panel.description,
    // No texture asset exists for these figures (report marks tiles UNSPECIFIED);
    // CeilingVaultMesh renders them as marker hotspots, so this is never loaded.
    textureUrl: '',
    position: uvToWorld(panel.viewport.u, panel.viewport.v),
    rotation: [Math.PI / 2, 0, 0],
    dimensions: [3, 3],
    focusOffset: 4,
    cameraUp: [0, 0, 1],
    date: '1508-1512',
    story: panel.narration,
    funFact: SUBGROUP_BLURB[panel.subgroup] ?? panel.narration,
    zone: 'ceiling_vault',
    sequence: panel.order,
    activePeriod: { startYear: 1508, endYear: 2026 },
  }));
