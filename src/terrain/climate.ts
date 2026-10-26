import { params } from '../params';
import { CLIFF_HEIGHT, FIELD_OCTAVES, FIELDS, RANGE_WARP } from './constants';
import { desertBias, mountainBias } from './biomes';
import { noised, rotate, seedOffset, smoothstep } from './noise';

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
 * Falaises : tout ce qui émerge près de la mer est relevé d'un bloc ; la marche se forme là où le relief
 * traverse le niveau de l'eau, sur quelques mètres de dénivelé seulement, donc très raide.
 */
export function cliffLift(h: number, cliff: number): number {
  return cliff * CLIFF_HEIGHT * smoothstep(params.water + 0.5, params.water + 4, h);
}
