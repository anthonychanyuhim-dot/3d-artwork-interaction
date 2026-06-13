import { useProgress } from '@react-three/drei';
import './LoadingScreen.css';

/**
 * Full-screen DOM loading affordance (research report §498). Lives OUTSIDE the
 * Canvas and reads drei's `useProgress` (wired to three's DefaultLoadingManager,
 * which `useLoader` feeds), so slow-network / mobile users see branded copy and a
 * progress bar instead of a black canvas while textures hydrate. It fades itself
 * out and goes pointer-inert the moment loading completes.
 */
export function LoadingScreen() {
  const { active, progress } = useProgress();

  return (
    <div
      className={`loading-root${active ? '' : ' is-hidden'}`}
      role="status"
      aria-live="polite"
      aria-hidden={!active}
    >
      <div className="loading-card">
        <div className="loading-spinner" aria-hidden="true" />
        <p className="loading-text">Loading Sistine Chapel 3D Experience…</p>
        <div className="loading-bar" aria-hidden="true">
          <div className="loading-bar-fill" style={{ width: `${Math.round(progress)}%` }} />
        </div>
        <p className="loading-pct">{Math.round(progress)}%</p>
      </div>
    </div>
  );
}
