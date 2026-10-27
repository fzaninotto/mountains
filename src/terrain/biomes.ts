import { params } from '../params';
import { GRADIENT_NOISE_SCALE, RIDGE_MASSIF } from './constants';

/** Un biome règle le relief : altitude de base (m), amplitude du fBm (m) et rugosité (gain entre octaves). */
export interface Biome {
  base: number;
  amplitude: number;
  gain: number;
}

const PLAIN: Biome = { base: 0, amplitude: 120, gain: 0.42 };
const HILLS: Biome = { base: 150, amplitude: 380, gain: 0.4 };
const MIDDLE_MOUNTAINS: Biome = { base: 450, amplitude: 950, gain: 0.47 };
/** Altitude de base de la haute montagne (m) : un haut massif, au-dessus de la limite des neiges, que creusent les crêtes. */
const HIGH_MOUNTAIN_BASE = 2000;

/**
 * Biomes dans l'ordre de BIOME_STOPS, interpolés par biomeAt() dans le shader. La mer et la plage suivent le niveau de
 * l'eau, la haute montagne les réglages.
 */
export function biomes(): Biome[] {
  return [
    { base: params.water - 150, amplitude: 120, gain: 0.45 },
    { base: params.water + 4, amplitude: 30, gain: 0.45 },
    PLAIN,
    HILLS,
    MIDDLE_MOUNTAINS,
    { base: HIGH_MOUNTAIN_BASE, amplitude: params.height, gain: params.gain },
  ];
}

/** Décalage du champ des chaînes de montagnes selon la part de montagne voulue. */
export function mountainBias(): number {
  return (params.mountainCoverage - 0.5) * 1.2;
}

/** Décalage du champ d'aridité selon la part de désert voulue. */
export function desertBias(): number {
  return (params.desertCoverage - 0.5) * 1.2;
}

/**
 * Borne haute du relief : base plus somme des amplitudes de toutes les octaves du biome le plus haut, plus dunes et
 * falaises. En haute montagne, la première octave est un bruit de gradient relevé de RIDGE_MASSIF.
 */
export function maxTerrainHeight(): number {
  const first = Math.max(1, RIDGE_MASSIF * GRADIENT_NOISE_SCALE * Math.SQRT1_2);
  return Math.max(...biomes().map((b) => b.base + b.amplitude * (first + b.gain / (1 - b.gain)))) + 100;
}
