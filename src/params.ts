// Réglages modifiables depuis le panneau (gui.ts). Les constantes internes du relief sont dans terrain/constants.ts.

export interface Params {
  // Monde
  seed: number;
  // Relief : longueur d'onde de la plus grande octave (m), amplitude (m) et rugosité de la haute montagne
  scale: number;
  height: number;
  gain: number;
  // Biomes : taille (m) et parts de montagne et de désert (0 à 1)
  biomeScale: number;
  mountainCoverage: number;
  desertCoverage: number;
  // Raymarching : plus petit détail calculé (px) et fraction de la distance avancée à chaque pas
  detail: number;
  step: number;
  // Altitudes (m) de l'eau, de la limite de végétation et de la limite des neiges
  water: number;
  vegetation: number;
  snow: number;
  // Éclairage et caméra : soleil (degrés), densité de brume, exposition, champ de vision vertical (degrés)
  sunElevation: number;
  sunAzimuth: number;
  fog: number;
  exposure: number;
  fov: number;
  // Navigation et qualité : vitesse (m/s), cadence visée et résolution max en mouvement, densité de pixels
  speed: number;
  targetFps: number;
  movingScale: number;
  pixelRatio: number;
  // Export : facteur de taille de l'image par rapport à l'écran
  exportScale: number;
}

export const params: Params = {
  seed: 1,
  scale: 6000,
  height: 2200,
  gain: 0.5,
  biomeScale: 120000,
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
  exposure: 1.3,
  fov: 55,
  speed: 300,
  targetFps: 30,
  movingScale: 0.5,
  pixelRatio: Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio, 2),
  exportScale: 2,
};

/** Direction vers le soleil (vecteur unitaire, y vers le haut, azimut 0 vers -z). */
export function sunDirection(): [number, number, number] {
  const elevation = (params.sunElevation * Math.PI) / 180;
  const azimuth = (params.sunAzimuth * Math.PI) / 180;
  return [Math.cos(elevation) * Math.sin(azimuth), Math.sin(elevation), -Math.cos(elevation) * Math.cos(azimuth)];
}
