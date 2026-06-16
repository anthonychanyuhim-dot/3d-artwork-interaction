import { artworksRegistry } from '../data/artworks';
import type { ArtworkData, ArtworkZone } from '../data/artworks';

/**
 * The four mutually-exclusive phases the gallery can occupy at any moment.
 * See CLAUDE.md §3 (Core State Machine Rules).
 */
export type GalleryMode = 'explore' | 'focusing' | 'focused' | 'returning';

export interface GalleryState {
  mode: GalleryMode;
  activeArtworkId: string | null;
  transitionLock: boolean;
  // True while the user has zoomed in to inspect details (latched by CameraRig).
  isInspecting: boolean;
}

/** A spatial direction on the 2D navigation grid. */
export type NavDirection = 'up' | 'down' | 'left' | 'right';

/**
 * `NAV_DIRECTION` drives the 2D spatial grid: it resolves the artwork that lies
 * in the given direction from the current one (a neighbouring panel along the
 * same zone, the ceiling fresco above a wall, the wall beneath a ceiling panel,
 * etc.) and flies there — or returns to the gallery when nothing lies that way.
 */
export type GalleryAction =
  | { type: 'FOCUS_ARTWORK'; payload: string }
  | { type: 'SET_FOCUSED' }
  | { type: 'TRIGGER_BACK' }
  | { type: 'SET_EXPLORE' }
  | { type: 'NAV_DIRECTION'; payload: NavDirection }
  | { type: 'SET_INSPECTING'; payload: boolean };

export const initialGalleryState: GalleryState = {
  mode: 'explore',
  activeArtworkId: null,
  transitionLock: false,
  isInspecting: false,
};

// The central ceiling masterpiece the Up arrow flies to from the gallery floor.
const CEILING_ENTRY_ID = 'creation-of-adam';
// End-wall bridge targets. Sequence increases with +Z on every row, so stepping
// off the altar end (-Z) lands on the Last Judgment, and off the entrance end
// (+Z) lands on the Baptism of Christ (the designated entrance-wall stand-in).
const ALTAR_WALL_ID = 'the-last-judgment';
const ENTRANCE_BRIDGE_ID = 'baptism-of-christ';

/** Members of a zone, ordered along the nave (altar → entrance) by sequence. */
function zoneMembers(zone: ArtworkZone): ArtworkData[] {
  return artworksRegistry
    .filter((a) => a.zone === zone)
    .sort((a, b) => a.sequence - b.sequence);
}

/**
 * Id of the member of `zone` whose longitudinal Z coordinate is closest to `z`.
 * This is the dynamic proximity tracker: a ceiling panel maps to the wall section
 * physically beneath it (and vice-versa) by real chapel position, not by index.
 */
function nearestByZ(zone: ArtworkZone, z: number): string | null {
  const members = zoneMembers(zone);
  if (!members.length) return null;
  let best = members[0];
  let bestDelta = Infinity;
  for (const member of members) {
    const delta = Math.abs(member.position[2] - z);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = member;
    }
  }
  return best.id;
}

type DirectionResult = { kind: 'focus'; id: string } | { kind: 'back' } | null;

/**
 * The heart of the 2D matrix: where does `direction` lead from `activeId`?
 *  • On the CEILING: Up / Down walk forward / backward along the 9 Genesis scenes
 *    on the central axis; Left → South wall, Right → North wall, landing on the
 *    panel CLOSEST by Z (proportional proximity tracking).
 *  • On a SIDE WALL: Left / Right slide along that wall's cycle; Up rises to the
 *    ceiling Genesis scene nearest by Z; Down returns to the gallery.
 *  • On the ALTAR: Up jumps to the ceiling scene nearest by Z; Down returns.
 *  • From the gallery floor: Up enters at the ceiling centre.
 */
function resolveDirection(activeId: string | null, direction: NavDirection): DirectionResult {
  const current = activeId ? artworksRegistry.find((a) => a.id === activeId) ?? null : null;

  // From the gallery floor (no active artwork): Up enters at the ceiling centre.
  if (!current) {
    return direction === 'up' ? { kind: 'focus', id: CEILING_ENTRY_ID } : null;
  }

  const members = zoneMembers(current.zone);
  const index = members.findIndex((m) => m.id === current.id);
  const z = current.position[2]; // longitudinal position in the chapel

  // CEILING: Up/Down move along the linear Genesis axis (up = forward / next).
  // Left/Right make a transverse jump down to a side wall, tracking Z-proximity.
  if (current.zone === 'ceiling_center') {
    if (direction === 'up' || direction === 'down') {
      if (members.length <= 1) return null;
      const step = direction === 'up' ? 1 : -1;
      const nextIndex = index + step;
      // Down off the altar-end of the Genesis row (e.g. Separation of Light from
      // Darkness) bridges straight down to the altar wall's Last Judgment.
      if (nextIndex < 0) return { kind: 'focus', id: ALTAR_WALL_ID };
      // Up off the entrance-end is a dead-end (no entrance fresco above).
      if (nextIndex >= members.length) return null;
      return { kind: 'focus', id: members[nextIndex].id };
    }
    const wallZone: ArtworkZone =
      direction === 'left' ? 'side_wall_south' : 'side_wall_north';
    const id = nearestByZ(wallZone, z);
    return id ? { kind: 'focus', id } : null;
  }

  // CEILING VAULT FIGURES (Prophets / Sibyls / Ancestors / Pendentives): left and
  // right walk the figure tour in `order`; up rises to the Genesis scene nearest
  // by Z (the textured central strip); down returns to the gallery.
  if (current.zone === 'ceiling_vault') {
    if (direction === 'left' || direction === 'right') {
      if (members.length <= 1) return null;
      const step = direction === 'right' ? 1 : -1;
      const nextIndex = index + step;
      if (nextIndex < 0 || nextIndex >= members.length) return null;
      return { kind: 'focus', id: members[nextIndex].id };
    }
    if (direction === 'up') {
      const id = nearestByZ('ceiling_center', z);
      return id ? { kind: 'focus', id } : null;
    }
    return { kind: 'back' }; // down -> exit to the gallery
  }

  // ALTAR WALL: left/right bridge across to the front-most fresco (nearest the
  // altar, sequence 0) of each side wall. Facing the altar wall the screen axes
  // are left = -X = South wall, right = +X = North wall.
  if (current.zone === 'altar_wall' && (direction === 'left' || direction === 'right')) {
    const wallZone: ArtworkZone = direction === 'left' ? 'side_wall_south' : 'side_wall_north';
    const id = zoneMembers(wallZone)[0]?.id ?? null;
    return id ? { kind: 'focus', id } : null;
  }

  // SIDE WALLS / ALTAR - left/right step to the IMMEDIATE physical neighbour.
  if (direction === 'left' || direction === 'right') {
    if (members.length <= 1) return null;
    // Screen-left/right depends on which way the camera faces the wall. Both
    // walls store sequence increasing with +Z, but the viewer faces -X on the
    // SOUTH wall and +X on the NORTH wall, so their screen axes are mirror
    // images of each other:
    //   - North wall: screen-right = +Z = next sequence (index + 1).
    //   - South wall: screen-right = -Z = previous sequence (index - 1).
    // Map the on-screen direction to the correct per-wall index step so LEFT
    // always lands on the panel physically to the viewer's left, and vice-versa.
    const rightStep = current.zone === 'side_wall_south' ? -1 : 1;
    const step = direction === 'right' ? rightStep : -rightStep;
    const nextIndex = index + step;
    // End-wall bridges instead of dead-ends: stepping off the altar end (-Z, the
    // low sequence index) jumps to the Last Judgment; stepping off the entrance
    // end (+Z, past the last index) jumps to the Baptism of Christ.
    if (nextIndex < 0) return { kind: 'focus', id: ALTAR_WALL_ID };
    if (nextIndex >= members.length) return { kind: 'focus', id: ENTRANCE_BRIDGE_ID };
    return { kind: 'focus', id: members[nextIndex].id };
  }

  if (direction === 'up') {
    // Rise to the ceiling Genesis scene directly above (nearest by Z).
    const id = nearestByZ('ceiling_center', z);
    return id ? { kind: 'focus', id } : null;
  }

  // direction === 'down' on a wall / altar → nothing below, so drop to the gallery.
  return { kind: 'back' };
}

export function galleryReducer(state: GalleryState, action: GalleryAction): GalleryState {
  switch (action.type) {
    /** Begin focusing a specific artwork (ignored mid-transition). */
    case 'FOCUS_ARTWORK': {
      if (state.transitionLock) return state;
      return {
        ...state,
        mode: 'focusing',
        activeArtworkId: action.payload,
        transitionLock: true,
        isInspecting: false,
      };
    }

    /** Move across the 2D spatial grid in the given direction. */
    case 'NAV_DIRECTION': {
      if (state.transitionLock) return state;
      const result = resolveDirection(state.activeArtworkId, action.payload);
      if (!result) return state;
      if (result.kind === 'back') {
        return { ...state, mode: 'returning', transitionLock: true, isInspecting: false };
      }
      // No-op if the resolved target is already the active artwork.
      if (result.id === state.activeArtworkId) return state;
      return {
        ...state,
        mode: 'focusing',
        activeArtworkId: result.id,
        transitionLock: true,
        isInspecting: false,
      };
    }

    /** Camera has arrived at the focus anchor — release the lock, show overlay. */
    case 'SET_FOCUSED': {
      return { ...state, mode: 'focused', transitionLock: false, isInspecting: false };
    }

    /** User pressed Back — begin the return tween. Locked while transitioning. */
    case 'TRIGGER_BACK': {
      if (state.transitionLock) return state;
      return { ...state, mode: 'returning', transitionLock: true, isInspecting: false };
    }

    /** Return tween finished (or hard reset) — back to free-roam explore. */
    case 'SET_EXPLORE': {
      return {
        ...state,
        mode: 'explore',
        activeArtworkId: null,
        transitionLock: false,
        isInspecting: false,
      };
    }

    /** Mirror of CameraRig's zoom latch — drives the overlay fade + nav gate. */
    case 'SET_INSPECTING': {
      if (state.isInspecting === action.payload) return state;
      return { ...state, isInspecting: action.payload };
    }

    default:
      return state;
  }
}
