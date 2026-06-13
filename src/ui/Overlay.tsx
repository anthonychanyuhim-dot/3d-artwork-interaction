import { useEffect, useState } from 'react';
import { artworksRegistry } from '../data/artworks';
import { useGallery } from '../state/GalleryContext';
import './Overlay.css';

/**
 * DOM overlay for the active artwork's metadata + navigation controls. It stays
 * mounted through the focus/return transitions (so it can cross-fade) but is
 * only fully visible when settled in `focused`. The root layer is click-through;
 * only the panel and its buttons capture pointer events.
 *
 * A local "View Details" modal can be opened on top. Because it is a full-screen
 * DOM layer with `pointer-events: auto`, every drag/scroll/click lands on the
 * modal instead of the canvas - so OrbitControls cannot rotate/pan/zoom the
 * chapel behind it. A capture-phase key guard likewise keeps Esc/arrows from
 * leaking through to the camera while the modal is open.
 */
export function Overlay() {
  const { state, dispatch } = useGallery();
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Mounted whenever an artwork is active (focusing / focused / returning).
  // In explore there is no active artwork, so nothing renders.
  const artwork = artworksRegistry.find((a) => a.id === state.activeArtworkId);

  // Close the modal whenever we leave the focused phase (e.g. Back / nav), so it
  // can never linger over the gallery or a different artwork.
  useEffect(() => {
    if (state.mode !== 'focused') setDetailsOpen(false);
  }, [state.mode]);

  // While the modal is open, swallow the keys CameraRig listens for (capture
  // phase, before they reach its window-level handler): Esc closes the modal
  // instead of triggering Back; arrows can't navigate the scene behind it.
  useEffect(() => {
    if (!detailsOpen) return;
    const onKeyDownCapture = (event: KeyboardEvent) => {
      if (['Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          setDetailsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDownCapture, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDownCapture, { capture: true });
  }, [detailsOpen]);

  // -- Border navigation arrows ----------------------------------------------
  // Pinned to the centre of each viewport edge for a purely click/tap camera UX.
  // All are inert while a GSAP flight is running (transitionLock) so they can't
  // be spammed mid-transition.
  const locked = state.transitionLock;
  // Up is always meaningful now: from the floor it enters the ceiling, from a wall
  // it rises to the ceiling above, from the altar it jumps to the first ceiling
  // panel, and ON the ceiling it slides to the next Genesis scene - so it always
  // renders. The "down" control is a handle on the panel's top edge (below).
  // Left/Right slide within the current zone - shown only when it has neighbours.
  const zoneCount = artwork
    ? artworksRegistry.filter((a) => a.zone === artwork.zone).length
    : 0;
  // Left/Right are shown when the zone has neighbours to slide between, and also
  // forced on for the single-panel altar wall, where they bridge across to the
  // front-most fresco of the South (left) and North (right) side walls.
  const showLeftRight = zoneCount > 1 || artwork?.zone === 'altar_wall';

  const navigate = (direction: 'up' | 'down' | 'left' | 'right') => () => {
    if (locked) return;
    dispatch({ type: 'NAV_DIRECTION', payload: direction });
  };

  // Panel is fully visible ONLY when settled at the base focus pose: focused,
  // unlocked, and not zoomed in. Fades out during transitions / inspection.
  const visible =
    !!artwork && state.mode === 'focused' && !state.transitionLock && !state.isInspecting;

  return (
    <div className="overlay-root">
      {/* Border navigation arrows - 2D spatial grid shifts */}
      <button
        type="button"
        className="nav-arrow nav-arrow--up"
        disabled={locked}
        aria-label="Move up"
        onClick={navigate('up')}
      >
        &uarr;
      </button>
      {showLeftRight && (
        <button
          type="button"
          className="nav-arrow nav-arrow--left"
          disabled={locked}
          aria-label="Move left"
          onClick={navigate('left')}
        >
          &larr;
        </button>
      )}
      {showLeftRight && (
        <button
          type="button"
          className="nav-arrow nav-arrow--right"
          disabled={locked}
          aria-label="Move right"
          onClick={navigate('right')}
        >
          &rarr;
        </button>
      )}

      {artwork && (
      <div
        className={`overlay-panel${visible ? ' is-visible' : ''}`}
        role="dialog"
        aria-hidden={!visible}
        aria-label={`${artwork.title} details`}
      >
        {/* Structural handle on the panel's top edge - the "down" spatial shift:
            from the ceiling it dives to the wall beneath; from a wall it returns. */}
        <button
          type="button"
          className="panel-handle"
          disabled={locked}
          aria-label="Move down"
          onClick={navigate('down')}
        >
          &darr;
        </button>
        <h2 className="overlay-title">{artwork.title}</h2>
        <p className="overlay-artist">{artwork.artist}</p>
        <p className="overlay-description">{artwork.description}</p>

        <div className="overlay-actions">
          <button
            type="button"
            className="overlay-btn"
            onClick={() => setDetailsOpen(true)}
          >
            View Details
          </button>
          <button type="button" className="overlay-btn" onClick={navigate('left')}>
            &lsaquo; Previous
          </button>
          <button type="button" className="overlay-btn" onClick={navigate('right')}>
            Next &rsaquo;
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
      )}

      {artwork && detailsOpen && (
        // Full-screen backdrop: pointer-events here block the canvas behind it,
        // so the 3D scene can't be dragged/zoomed while reading. Click to close.
        <div
          className="detail-backdrop"
          onClick={() => setDetailsOpen(false)}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className="detail-card"
            role="dialog"
            aria-modal="true"
            aria-label={`${artwork.title} - full details`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="detail-close"
              aria-label="Close details"
              onClick={() => setDetailsOpen(false)}
            >
              &times;
            </button>

            <h2 className="detail-title">{artwork.title}</h2>
            <p className="detail-meta">
              <span className="detail-artist">{artwork.artist}</span>
              <span className="detail-dot">&middot;</span>
              <span className="detail-date">{artwork.date}</span>
            </p>

            <section className="detail-section">
              <h3 className="detail-label">The Story</h3>
              <p className="detail-text">{artwork.story}</p>
            </section>

            <section className="detail-section detail-section--fact">
              <h3 className="detail-label">Did You Know?</h3>
              <p className="detail-text">{artwork.funFact}</p>
            </section>

            {artwork.wikiUrl && (
              <a
                className="detail-wiki"
                href={artwork.wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read on Wikipedia &#8599;
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
