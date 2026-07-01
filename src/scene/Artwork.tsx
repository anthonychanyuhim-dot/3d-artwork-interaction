import { useEffect, useMemo, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { ArtworkData } from '../data/artworks';
import { useGallery } from '../state/GalleryContext';

interface ArtworkProps {
  artwork: ArtworkData;
  /**
   * Optional world position override. Zone layouts in GalleryScene compute
   * positions dynamically and pass them in here; the altar wall leaves it
   * undefined and falls back to `artwork.position`.
   */
  position?: [number, number, number];
  /**
   * Optional fixed physical width. When set, the plane is rendered at exactly this
   * width and its height follows the texture's true aspect - used by the ceiling /
   * side-wall rows so every panel in a zone shares identical boundaries. When
   * undefined, the plane is fitted inside the registry `dimensions` bounding box.
   */
  fixedWidth?: number;
}

// Shared horizontal span for the ceiling Genesis row across the vault.
export const CEILING_WIDTH = 8;

export function Artwork({ artwork, position, fixedWidth }: ArtworkProps) {
  const { state, dispatch } = useGallery();
  const meshRef = useRef<THREE.Mesh>(null);

  const texture = useLoader(THREE.TextureLoader, artwork.textureUrl);
  // Paintings are colour data, not linear - flag as sRGB so they read true.
  texture.colorSpace = THREE.SRGBColorSpace;

  // Undistorted sizing keyed off the texture's EXACT natural aspect ratio.
  //  - fixedWidth set (ceiling / side-wall rows): pinned to that width so every
  //    panel in the zone shares identical boundaries; height derives from aspect.
  //  - otherwise (altar): fitted inside the registry `dimensions` bounding box.
  // Either way the source image's pixel resolution never dictates the 3D scale.
  const [planeWidth, planeHeight] = useMemo(() => {
    const [boxW, boxH] = artwork.dimensions;
    const img = texture.image as { width: number; height: number } | undefined;
    const imageAspect = img && img.width > 0 && img.height > 0 ? img.width / img.height : 0;
    // Defensive: a not-yet-ready or degenerate texture -> fall back to the safe,
    // non-zero registry dimensions so the plane (and its Box3) is never collapsed.
    if (!Number.isFinite(imageAspect) || imageAspect <= 0) {
      return [boxW, boxH];
    }

    if (fixedWidth) {
      return [fixedWidth, fixedWidth / imageAspect];
    }

    const boxAspect = boxW / boxH;
    // Wider-than-box -> clamp width; taller-than-box -> clamp height.
    return imageAspect > boxAspect
      ? [boxW, boxW / imageAspect]
      : [boxH * imageAspect, boxH];
  }, [texture, fixedWidth, artwork.dimensions]);

  // useLoader caches textures and does NOT auto-dispose them, so we release the
  // GPU texture explicitly whenever it changes or the component unmounts.
  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  // R3F auto-disposes geometry/material on unmount, but we dispose them
  // explicitly too so nothing is left dangling if auto-dispose is ever bypassed.
  useEffect(() => {
    const mesh = meshRef.current;
    return () => {
      mesh?.geometry.dispose();
      const material = mesh?.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    };
  }, []);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // Pointer hygiene (CLAUDE.md section 4): stop raycast leakage to objects behind.
    event.stopPropagation();
    // Never act mid-flight - avoids conflicting/shivering GSAP timelines.
    if (state.transitionLock) return;
    // Toggle escape hatch: clicking the already-focused artwork flies back to the
    // gallery home pose (CameraRig's return tween also resets camera.up -> [0,1,0]
    // and the DOM panel fades out, exactly like the "Back to Gallery" button).
    if (state.mode === 'focused' && state.activeArtworkId === artwork.id) {
      dispatch({ type: 'TRIGGER_BACK' });
      return;
    }
    dispatch({ type: 'FOCUS_ARTWORK', payload: artwork.id });
  };

  return (
    <group name={`artwork-${artwork.id}`} position={position ?? artwork.position} rotation={artwork.rotation}>
      <mesh ref={meshRef} onClick={handleClick}>
        <planeGeometry args={[planeWidth, planeHeight]} />
        {/* Emissive map lets each fresco self-illuminate, so it stays bright and
            reads as a glowing focal point against the dark chapel, independent of
            the moody ambient lighting. */}
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive="#ffffff"
          emissiveIntensity={0.55}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
