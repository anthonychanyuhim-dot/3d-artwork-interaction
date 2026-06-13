export interface ArtworkData {
  id: string;
  title: string;
  artist: string;
  description: string;
  textureUrl: string;
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: [number, number];
  focusOffset: number;
}

export const artworksRegistry: ArtworkData[] = [
  {
    id: "creation-of-adam",
    title: "The Creation of Adam",
    artist: "Michelangelo",
    description: "A monumental fresco painting forming part of the Sistine Chapel's ceiling, illustrating the Biblical creation narrative where God breathes life into Adam.",
    textureUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg/960px-Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg",
    position: [0, 5, -8],
    rotation: [0, 0, 0],
    dimensions: [6, 3],
    focusOffset: 4
  },
  {
    id: "the-last-judgment",
    title: "The Last Judgment",
    artist: "Michelangelo",
    description: "A depiction of the Second Coming of Christ and the final and eternal judgment by God of all humanity, covering the entire altar wall of the Sistine Chapel.",
    textureUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Last_Judgement_%28Michelangelo%29.jpg/960px-Last_Judgement_%28Michelangelo%29.jpg",
    position: [-8, 4, 0],
    rotation: [0, Math.PI / 2, 0],
    dimensions: [4, 5],
    focusOffset: 5
  }
];
