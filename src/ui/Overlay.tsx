import { artworksRegistry } from '../data/artworks';
import { useGallery } from '../state/GalleryContext';
import './Overlay.css';

/**
 * DOM overlay for the active artwork's metadata + navigation controls. It stays
 * mounted through the focus/return transitions (so it can cross-fade) but is
 * only fully visible when settled in `focused`. The root layer is click-through;
 * only the panel and its buttons capture pointer events.
 */
export function Overlay() {
  const { state, dispatch } = useGallery();

  // Mounted whenever an artwork is active (focusing / focused / returning).
  // In explore there is no active artwork, so nothing renders.
  const artwork = artworksRegistry.find((a) => a.id === state.activeArtworkId);
  if (!artwork) return null;

  // Fully visible ONLY when settled at the base focus pose: focused, unlocked,
  // and not zoomed in. Fades out during transitions and the moment the user
  // wheels in to inspect details (CameraRig latches `isInspecting`).
  const visible = state.mode === 'focused' && !state.transitionLock && !state.isInspecting;

  return (
    <div className="overlay-root">
      <div
        className={`overlay-panel${visible ? ' is-visible' : ''}`}
        role="dialog"
        aria-hidden={!visible}
        aria-label={`${artwork.title} details`}
      >
        <h2 className="overlay-title">{artwork.title}</h2>
        <p className="overlay-artist">{artwork.artist}</p>
        <p className="overlay-description">{artwork.description}</p>

        <div className="overlay-actions">
          <button
            type="button"
            className="overlay-btn"
            onClick={() => dispatch({ type: 'NAV_PREV' })}
          >
            ‹ Previous
          </button>
          <button
            type="button"
            className="overlay-btn"
            onClick={() => dispatch({ type: 'NAV_NEXT' })}
          >
            Next ›
          </button>
          <button
            type="button"
            className="overlay-btn overlay-btn--primary"
            onClick={() => dispatch({ type: 'TRIGGER_BACK' })}
          >
            Back to Gallery
          </button>
        </div>
      </div>
    </div>
  );
}
