import { params } from '../params';
import {
  CLIFF_COVE_OCTAVE, CLIFF_HEIGHT, CLIFF_HEIGHT_OCTAVE, CLIFF_JITTER_OCTAVES, CLIFF_MIN_SLOPE, CLIFF_SETBACK, CLIFF_WIDTH,
  FIELD_OCTAVES, FIELDS, RANGE_WARP,
} from './constants';
import { desertBias, mountainBias } from './biomes';
import { noised, octaveNoise, rotate, seedOffset, smoothstep } from './noise';

// Répartition des biomes, identique à climate() dans src/render/climate.glsl.

/** fBm d'un champ de biomes (voir FIELDS), environ dans [-1, 1]. */
function fieldNoise(x: number, z: number, field: number): number {
  const [ox, oy] = seedOffset();
  const { ratio, salt } = FIELDS[field];
  const scale = params.biomeScale * ratio;
  let qx = x / scale, qz = z / scale, a = 0, b = 1, norm = 0;
  for (let i = 0; i < FIELD_OCTAVES; i++) {
    a += b * noised(qx, qz, ox + salt, oy + salt)[0];
    norm += b;
    b *= 0.5;
    [qx, qz] = rotate(qx, qz);
  }
  return a / norm;
}

/**
 * Renvoie [niveau de relief, poids du désert, poids des falaises].
 * Niveau de relief : 0 = mer, puis plage, plaine, collines, moyenne et haute montagne jusqu'à 1.
 * Le continent sépare la mer des terres ; les montagnes suivent les crêtes d'un troisième champ, ondulé
 * par les deux premiers, ce qui dessine des chaînes. Un quatrième champ, plus fin, fait émerger des îles
 * au large et décide où les côtes sont des falaises. Tout est continu : aucune frontière entre biomes.
 */
export function climate(x: number, z: number): [number, number, number] {
  const continent = fieldNoise(x, z, 0);
  const dryness = fieldNoise(x, z, 1);
  const warp = RANGE_WARP * params.biomeScale * FIELDS[2].ratio;
  const range = fieldNoise(x + warp * continent, z + warp * dryness, 2);
  const islands = fieldNoise(x, z, 3);
  const coast = smoothstep(-0.15, 0.05, continent);
  const inland = smoothstep(0, 0.25, continent);
  const mountain = smoothstep(0.62, 1, 1 - Math.abs(range) + mountainBias()) * inland;
  const island = smoothstep(0.15, 0.6, islands) * smoothstep(-0.6, -0.2, continent) * (1 - coast);
  const level = 0.3 * coast + 0.7 * mountain + 0.6 * island;
  const cliff = smoothstep(-0.05, 0.3, islands) * (1 - smoothstep(0.3, 0.42, level));
  return [level, smoothstep(0.05, 0.35, dryness + desertBias()), cliff];
}

/** 1 en plaine et sur la plage, 0 dès les collines. */
export function lowland(level: number): number {
  return 1 - smoothstep(0.3, 0.45, level);
}

/** Les dunes n'existent que dans les zones arides basses : ni en mer, ni en relief. */
export function duneWeight(level: number, desert: number): number {
  return desert * smoothstep(0.12, 0.2, level) * lowland(level);
}

/**
 * Falaises : tout ce qui émerge près de la mer est relevé d'un bloc ; la marche se forme là où les grandes formes du
 * relief (altitude coarseHeight et pente coarseSlope, sans les octaves de moins de WALL_DETAIL_WAVELENGTH) traversent
 * l'altitude du pied de falaise. Son dénivelé suit leur pente, pour que la face ait toujours la même largeur
 * horizontale, CLIFF_WIDTH : une paroi, même sur un littoral en pente douce. Le petit détail, lui, ne fait que s'y
 * ajouter : s'il décidait de la marche, ses quelques centimètres la feraient basculer en aiguilles.
 * La hauteur varie le long de la côte et s'annule par endroits (criques basses), et le pied recule plus ou moins loin
 * de l'eau, ce qui découpe criques et caps au lieu de suivre fidèlement le trait de côte.
 * Identique à cliffLift() dans src/render/climate.glsl, qui calcule en plus le gradient du relèvement.
 */
export function cliffLift(x: number, z: number, coarseHeight: number, coarseSlope: number, cliff: number): number {
  const h = coarseHeight;
  // Sorties exactes, qui évitent les bruits : sous le pied le plus bas, pas de relèvement ; au-dessus de la plus
  // haute marche possible, le relèvement est complet
  const lowestFoot = params.water + 0.5;
  if (cliff <= 0 || h <= lowestFoot) return 0;
  const height = CLIFF_HEIGHT * (0.2 + smoothstep(-0.5, 0.5, octaveNoise(x, z, CLIFF_HEIGHT_OCTAVE, [3.7, -1.3])))
    * smoothstep(-0.6, 0.2, octaveNoise(x, z, CLIFF_COVE_OCTAVE, [-2.3, 5.9]));
  // Les distances horizontales deviennent des dénivelés du terrain d'origine en les multipliant par sa pente
  const slope = Math.max(coarseSlope, CLIFF_MIN_SLOPE);
  const rise = CLIFF_WIDTH * slope;
  if (h >= lowestFoot + (CLIFF_SETBACK + CLIFF_WIDTH) * slope) return cliff * height;
  const notches = 0.6 * octaveNoise(x, z, CLIFF_JITTER_OCTAVES[0], [-6.1, 2.9])
    + 0.4 * octaveNoise(x, z, CLIFF_JITTER_OCTAVES[1], [1.7, 8.3]);
  const foot = lowestFoot + CLIFF_SETBACK * slope * (0.5 + 0.5 * notches);
  return cliff * height * smoothstep(foot, foot + rise, h);
}
