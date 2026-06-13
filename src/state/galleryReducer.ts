import { artworksRegistry } from '../data/artworks';

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
  // Hides the DOM overlay and gates navigation. Reset on every phase change.
  isInspecting: boolean;
}

/**
 * Discriminated union of every action the reducer understands.
 * `NAV_NEXT` / `NAV_PREV` are the carousel-style navigation actions.
 * `FOCUS_ARTWORK`'s payload is simply the target artwork id — the return
 * trajectory is anchored to a fixed canonical pose, so no pre-focus snapshot
 * needs to be carried. `SET_INSPECTING` mirrors CameraRig's zoom latch.
 */
export type GalleryAction =
  | { type: 'FOCUS_ARTWORK'; payload: string }
  | { type: 'SET_FOCUSED' }
  | { type: 'TRIGGER_BACK' }
  | { type: 'SET_EXPLORE' }
  | { type: 'NAV_NEXT' }
  | { type: 'NAV_PREV' }
  | { type: 'SET_INSPECTING'; payload: boolean };

export const initialGalleryState: GalleryState = {
  mode: 'explore',
  activeArtworkId: null,
  transitionLock: false,
  isInspecting: false,
};

/** Resolve the neighbouring artwork id, wrapping around the registry. */
function resolveSiblingId(currentId: string | null, direction: 1 | -1): string {
  const count = artworksRegistry.length;
  const currentIndex = artworksRegistry.findIndex((a) => a.id === currentId);
  // If nothing is active yet, treat -1 so NEXT lands on index 0.
  const base = currentIndex === -1 ? -direction : currentIndex;
  const nextIndex = (base + direction + count) % count;
  return artworksRegistry[nextIndex].id;
}

export function galleryReducer(state: GalleryState, action: GalleryAction): GalleryState {
  switch (action.type) {
    /**
     * Begin focusing a specific artwork. Ignored entirely while a transition
     * is already running (transitionLock guard).
     */
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

    /**
     * Jump to the next / previous artwork while already focused.
     * Both lock the rig and re-enter the `focusing` phase.
     */
    case 'NAV_NEXT':
    case 'NAV_PREV': {
      if (state.transitionLock) return state;
      const direction = action.type === 'NAV_NEXT' ? 1 : -1;
      return {
        ...state,
        mode: 'focusing',
        activeArtworkId: resolveSiblingId(state.activeArtworkId, direction),
        transitionLock: true,
        isInspecting: false,
      };
    }

    /** Camera has arrived at the focus anchor — release the lock, show overlay. */
    case 'SET_FOCUSED': {
      return {
        ...state,
        mode: 'focused',
        transitionLock: false,
        isInspecting: false,
      };
    }

    /** User pressed Back — begin the return tween. Locked while transitioning. */
    case 'TRIGGER_BACK': {
      if (state.transitionLock) return state;
      return {
        ...state,
        mode: 'returning',
        transitionLock: true,
        isInspecting: false,
      };
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
