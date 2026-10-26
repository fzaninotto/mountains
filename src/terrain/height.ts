import { params } from '../params';
import {
  RIDGE_SIGN_SOFTNESS, RIDGE_WAVELENGTH, ROCK_ROUGHNESS, SNOW_FLATTENING, SNOW_SMOOTH_WAVELENGTH, STEEP_SLOPE,
  WALL_DETAIL_WAVELENGTH, WALL_SLOPE,
} from './constants';
import { biomeAt } from './biomes';
import { cliffLift, climate, duneWeight } from './climate';
import { dunes } from './dunes';
import { noised, rotate, seedOffset, smoothstep } from './noise';

// Copie en double précision de terrainHeight() de src/render/height.glsl, sans le détail 3D des parois.
// Elle sert aux collisions de la caméra et à l'affichage du biome : les deux doivent rester identiques.

/** Octaves suffisantes pour les collisions (détail d'environ 10 cm). */
export const GROUND_OCTAVES = 16;

/** La neige comble les petits reliefs sur les zones peu pentues au-dessus de la limite des neiges. */
function snowSmoothing(h: number, slope: number): number {
  return SNOW_FLATTENING * smoothstep(params.snow - 100, params.snow + 150, h) * (1 - smoothstep(0.35, 0.7, slope));
}

/** Altitude du sol (m) en (x, z), avec `octaves` octaves de détail. */
export function terrainHeight(x: number, z: number, octaves = GROUND_OCTAVES): number {
  const [ox, oy] = seedOffset();
  const [level, desert, cliff] = climate(x, z);
  const sand = duneWeight(level, desert);
  const biome = biomeAt(level);
  const { base, gain } = biome;
  const height = biome.amplitude * (1 - 0.5 * sand);

  let qx = x / params.scale, qz = z / params.scale;
  // Colonnes de la jacobienne dq/dx, pour connaître la vraie pente en m/m
  let j0: [number, number] = [1 / params.scale, 0];
  let j1: [number, number] = [0, 1 / params.scale];
  let a = 0, b = 1, dx = 0, dz = 0, gradX = 0, gradZ = 0, wavelength = params.scale;
  // Pente et altitude des grandes formes (octaves de plus de WALL_DETAIL_WAVELENGTH), figées dès la première octave fine
  let wallSlope = -1, coarseHeight = 0;

  for (let i = 0; i < octaves; i++) {
    const [value, nx, nz] = noised(qx, qz, ox, oy);
    // Pour les octaves fines, la pente qui décide « roche ou versant érodé » est figée sur celle des grandes formes :
    // sinon le détail rend la pente plus raide, qui appelle plus de détail, et le terrain bascule en liserés nets
    if (wallSlope < 0 && wavelength < WALL_DETAIL_WAVELENGTH) {
      wallSlope = height * Math.hypot(gradX, gradZ);
      coarseHeight = base + height * a;
    }
    const rockSlope = wavelength < WALL_DETAIL_WAVELENGTH ? wallSlope : height * Math.hypot(gradX, gradZ);
    const steep = smoothstep(STEEP_SLOPE[0], STEEP_SLOPE[1], rockSlope);

    // Sur les pentes raides, les petites octaves deviennent des crêtes vives : arêtes et ravines de roche cassée
    const ridged = wavelength < RIDGE_WAVELENGTH ? steep : 0;
    const v = value + (1 - 2 * Math.abs(value) - value) * ridged;
    // Signe adouci : avec Math.sign, la pente accumulée (donc l'érosion des octaves suivantes) sauterait le long de
    // chaque arête, et le relief y ferait une marche
    const ridgeSign = value / Math.sqrt(value * value + RIDGE_SIGN_SOFTNESS);
    const ridgeFactor = 1 + (-2 * ridgeSign - 1) * ridged;
    const dvx = nx * ridgeFactor, dvz = nz * ridgeFactor;
    dx += dvx;
    dz += dvz;

    // L'atténuation par les dérivées accumulées imite l'érosion (vallées, versants doux) ;
    // sur les pentes raides, la roche reste à nu : les petites octaves gardent leur détail, et un peu plus
    const erosion = 1 / (1 + dx * dx + dz * dz);
    let amplitude = b * (erosion + (ROCK_ROUGHNESS - erosion) * steep);
    // Sur les parois, le détail fin vient du bruit 3D du shader : un champ de hauteur s'y étirerait
    if (wavelength < WALL_DETAIL_WAVELENGTH) {
      amplitude *= 1 - smoothstep(WALL_SLOPE[0], WALL_SLOPE[1], rockSlope);
    }
    if (wavelength < SNOW_SMOOTH_WAVELENGTH) {
      amplitude *= 1 - snowSmoothing(base + height * a, height * Math.hypot(gradX, gradZ));
    }

    a += amplitude * v;
    gradX += amplitude * (j0[0] * dvx + j0[1] * dvz);
    gradZ += amplitude * (j1[0] * dvx + j1[1] * dvz);
    b *= gain;
    [qx, qz] = rotate(qx, qz);
    j0 = rotate(...j0);
    j1 = rotate(...j1);
    wavelength /= 2;
  }

  const minWavelength = params.scale * 2 ** -octaves;
  const h = base + height * a;
  if (wallSlope < 0) {
    wallSlope = height * Math.hypot(gradX, gradZ);
    coarseHeight = h;
  }
  return h + cliffLift(x, z, coarseHeight, wallSlope, cliff) + sand * dunes(x, z, minWavelength);
}
