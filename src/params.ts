export const MAX_OCTAVES = 20;

export interface Params {
  seed: number;
  scale: number;
  height: number;
  gain: number;
  detail: number;
  step: number;
  water: number;
  vegetation: number;
  snow: number;
  rockDensity: number;
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
  detail: 1,
  step: 0.4,
  water: -700,
  vegetation: 400,
  snow: 1100,
  rockDensity: 0.7,
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

export function sunDirection(): [number, number, number] {
  const elevation = (params.sunElevation * Math.PI) / 180;
  const azimuth = (params.sunAzimuth * Math.PI) / 180;
  return [Math.cos(elevation) * Math.sin(azimuth), Math.sin(elevation), -Math.cos(elevation) * Math.cos(azimuth)];
}

// Borne haute du relief : somme des amplitudes de toutes les octaves
export function maxTerrainHeight(): number {
  return params.height / (1 - params.gain);
}
