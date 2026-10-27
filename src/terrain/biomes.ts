import { params } from '../params';
import { ALPINE_OCTAVES, CREST_AMPLITUDE, CREST_BASE, CREST_SOFTNESS } from './constants';

/** Un biome règle le relief : altitude de base (m), amplitude du fBm (m) et rugosité (gain entre octaves). */
export interface Biome {
  base: number;
  amplitude: number;
  gain: number;
}

const PLAIN: Biome = { base: 0, amplitude: 120, gain: 0.42 };
const HILLS: Biome = { base: 150, amplitude: 380, gain: 0.4 };
const MIDDLE_MOUNTAINS: Biome = { base: 450, amplitude: 950, gain: 0.47 };

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
    { base: 1500, amplitude: params.height, gain: params.gain },
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
 * Altitude maximale de la haute montagne : ses grandes octaves, sauf la première, sont des arêtes d'amplitude réduite
 * (CREST_AMPLITUDE), sauf là où le massif reste sous CREST_BASE[1].
 */
function highMountainMax({ base, amplitude, gain }: Biome): number {
  const crest = CREST_AMPLITUDE * (1 + Math.sqrt(CREST_SOFTNESS));
  let sum = 1;
  let b = gain;
  for (let i = 1; i < ALPINE_OCTAVES; i++) {
    sum += crest * b;
    b *= gain;
  }
  const ridged = base + amplitude * (sum + b / (1 - gain));
  const lowMassif = CREST_BASE[1] + (amplitude * gain) / (1 - gain);
  return Math.max(ridged, lowMassif);
}

/** Borne haute du relief : base plus somme des amplitudes de toutes les octaves du biome le plus haut, plus dunes et falaises. */
export function maxTerrainHeight(): number {
  const all = biomes();
  const lower = all.slice(0, -1).map((b) => b.base + b.amplitude / (1 - b.gain));
  return Math.max(...lower, highMountainMax(all[all.length - 1])) + 100;
}
