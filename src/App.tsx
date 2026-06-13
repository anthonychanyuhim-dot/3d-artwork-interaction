import { GalleryProvider } from './state/GalleryContext';
import { GalleryScene } from './scene/GalleryScene';
import { Overlay } from './ui/Overlay';

function App() {
  return (
    <GalleryProvider>
      <div style={{ position: 'fixed', inset: 0 }}>
        <GalleryScene />
      </div>
      {/* DOM overlay lives OUTSIDE the Canvas (CLAUDE.md §4). */}
      <Overlay />
    </GalleryProvider>
  );
}

export default App;
