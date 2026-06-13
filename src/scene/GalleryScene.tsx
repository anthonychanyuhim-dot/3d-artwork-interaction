import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { artworksRegistry } from '../data/artworks';
import { useGallery } from '../state/GalleryContext';
import { Artwork } from './Artwork';
import { CameraRig } from './CameraRig';

export function GalleryScene() {
  const { state, dispatch } = useGallery();

  return (
    <Canvas
      // devicePixelRatio clamped to 2 (CLAUDE.md §4) to protect mobile GPUs.
      dpr={[1, 2]}
      camera={{ position: [0, 4, 6.5], fov: 45 }}
      onPointerMissed={() => {
        // Click empty space while focused → return. Disabled while zoomed in
        // (isInspecting) so panning around details can't pop back to the gallery;
        // Esc still returns from a zoomed state.
        if (state.mode === 'focused' && !state.isInspecting) {
          dispatch({ type: 'TRIGGER_BACK' });
        }
      }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />

      <Suspense fallback={null}>
        {artworksRegistry.map((artwork) => (
          <Artwork key={artwork.id} artwork={artwork} />
        ))}
      </Suspense>

      {/* Default target on the main wall's centre so the first frame is level and centred. */}
      <OrbitControls makeDefault target={[0, 4, 0]} />
      <CameraRig />
    </Canvas>
  );
}
