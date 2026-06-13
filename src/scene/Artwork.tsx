import { useLoader } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { ArtworkData } from '../data/artworks';
import { useGallery } from '../state/GalleryContext';

interface ArtworkProps {
  artwork: ArtworkData;
}

export function Artwork({ artwork }: ArtworkProps) {
  const { dispatch } = useGallery();

  const texture = useLoader(THREE.TextureLoader, artwork.textureUrl);
  // Paintings are colour data, not linear — flag as sRGB so they read true.
  texture.colorSpace = THREE.SRGBColorSpace;

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // Pointer hygiene (CLAUDE.md §4): stop raycast leakage to objects behind.
    event.stopPropagation();
    dispatch({ type: 'FOCUS_ARTWORK', payload: artwork.id });
  };

  return (
    <group name={`artwork-${artwork.id}`} position={artwork.position} rotation={artwork.rotation}>
      <mesh onClick={handleClick}>
        <planeGeometry args={[artwork.dimensions[0], artwork.dimensions[1]]} />
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
