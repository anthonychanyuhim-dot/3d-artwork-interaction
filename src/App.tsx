import { GalleryProvider } from './state/GalleryContext';
import { GalleryScene } from './scene/GalleryScene';
import { Overlay } from './ui/Overlay';
import { LoadingScreen } from './ui/LoadingScreen';
import './index.css';

function App() {
  return (
    <GalleryProvider>
      {/* Isolated fullscreen canvas layer (z-index 1) — see .canvas-root. */}
      <div className="canvas-root">
        <GalleryScene />
      </div>
      {/* DOM HUD layers float ABOVE the canvas (z-index 10+), zero layout impact. */}
      <Overlay />
      <LoadingScreen />
    </GalleryProvider>
  );
}

export default App;
