export const MAX_OCTAVES = 20;

export interface Params {
  seed: number;
  scale: number;
  height: number;
  gain: number;
  biomeScale: number;
  mountainCoverage: number;
  desertCoverage: number;
  detail: number;
  step: number;
  water: number;
  vegetation: number;
  snow: number;
  sunElevation: number;
  sunAzimuth: number;
  fog: number;
  exposure: number;
  fov: number;
  speed: number;
  movingScale: number;
  pixelRatio: number;
  exportScale: number;
}

export const params: Params = {
  seed: 1,
  scale: 6000,
  height: 2200,
  gain: 0.5,
  biomeScale: 40000,
  mountainCoverage: 0.5,
  desertCoverage: 0.5,
  detail: 1,
  step: 0.4,
  water: -60,
  vegetation: 1400,
  snow: 2000,
  sunElevation: 12,
  sunAzimuth: 250,
  fog: 0.4,
  exposure: 0.75,
  fov: 55,
  speed: 1,
  movingScale: 0.2,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
  exportScale: 2,
};

// Un biome règle le relief : altitude de base, amplitude du fBm et rugosité (gain entre octaves)
export interface Biome {
  base: number;
  amplitude: number;
  gain: number;
}

const PLAIN: Biome = { base: 0, amplitude: 120, gain: 0.42 };
const HILLS: Biome = { base: 400, amplitude: 900, gain: 0.47 };

// Biomes ordonnés le long du niveau de relief : mer, plage, plaine, moyenne montagne, haute montagne
export const BIOME_STOPS = [0, 0.2, 0.32, 0.65, 1];

export function biomes(): Biome[] {
  return [
    { base: params.water - 150, amplitude: 80, gain: 0.4 },
    { base: params.water + 4, amplitude: 10, gain: 0.4 },
    PLAIN,
    HILLS,
    { base: 1200, amplitude: params.height, gain: params.gain },
  ];
}

// Décalent les champs de biomes pour couvrir plus ou moins de surface en montagne ou en désert
export function mountainBias(): number {
  return (params.mountainCoverage - 0.5) * 1.2;
}

export function desertBias(): number {
  return (params.desertCoverage - 0.5) * 1.2;
}

export function sunDirection(): [number, number, number] {
  const elevation = (params.sunElevation * Math.PI) / 180;
  const azimuth = (params.sunAzimuth * Math.PI) / 180;
  return [Math.cos(elevation) * Math.sin(azimuth), Math.sin(elevation), -Math.cos(elevation) * Math.cos(azimuth)];
}

// Borne haute du relief : base plus somme des amplitudes de toutes les octaves pour le biome le plus haut, plus les dunes
export function maxTerrainHeight(): number {
  return Math.max(...biomes().map((b) => b.base + b.amplitude / (1 - b.gain))) + 25;
}
