import { createContext, useContext, useEffect, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { galleryReducer, initialGalleryState } from './galleryReducer';
import type { GalleryState, GalleryAction } from './galleryReducer';

interface GalleryContextValue {
  state: GalleryState;
  dispatch: Dispatch<GalleryAction>;
}

/** Null sentinel lets `useGallery` detect usage outside the provider. */
export const GalleryContext = createContext<GalleryContextValue | null>(null);

export function GalleryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(galleryReducer, initialGalleryState);

  // Dev-only: mirror the state machine onto window for runtime inspection.
  useEffect(() => {
    if (import.meta.env.DEV) {
      const w = window as unknown as Record<string, unknown>;
      w.__galleryState = state;
      w.__galleryDispatch = dispatch;
    }
  }, [state]);

  return (
    <GalleryContext.Provider value={{ state, dispatch }}>
      {children}
    </GalleryContext.Provider>
  );
}

/** Strongly-typed consumer hook with an outside-provider guard clause. */
export function useGallery(): GalleryContextValue {
  const context = useContext(GalleryContext);
  if (context === null) {
    throw new Error('useGallery() must be used within a <GalleryProvider>.');
  }
  return context;
}
