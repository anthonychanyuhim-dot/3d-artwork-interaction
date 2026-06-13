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
      const nextIndex = (index + step + members.length) % members.length;
      return { kind: 'focus', id: members[nextIndex].id };
    }
    const wallZone: ArtworkZone =
      direction === 'left' ? 'side_wall_south' : 'side_wall_north';
    const id = nearestByZ(wallZone, z);
    return id ? { kind: 'focus', id } : null;
  }

  // SIDE WALLS / ALTAR — left/right slide along the wall cycle.
  if (direction === 'left' || direction === 'right') {
    if (members.length <= 1) return null;
    const step = direction === 'right' ? 1 : -1;
    const nextIndex = (index + step + members.length) % members.length;
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
