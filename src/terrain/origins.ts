import { params } from '../params';
import {
  DUNE_LAYERS, DUNE_WARP_WAVELENGTH, FIELD_OCTAVES, FIELDS, MAX_OCTAVES, ROCK_WAVELENGTHS,
} from './constants';

// Précision à grande distance. Le shader travaille en float32, en coordonnées relatives à la caméra. Pour chaque
// octave de chaque bruit, on lui passe ici, calculées en double précision, la cellule (partie entière, uint32) et
// la partie fractionnaire de la position de la caméra dans l'espace de ce bruit ; il n'y ajoute que la position
// relative, petite. Le relief reste ainsi précis à des milliers de kilomètres de l'origine.

export interface NoiseOrigin {
  frac: Float32Array;
  cell: Uint32Array;
}

export interface RockOrigin extends NoiseOrigin {
  /** Matrices de rotation 3×3 (en colonnes) de chaque octave. */
  rotation: Float32Array;
}

/** Origines de tous les bruits du relief en un point. */
export interface Origins {
  octaves: NoiseOrigin;
  fields: NoiseOrigin;
  rock: RockOrigin;
}

const TWO_32 = 4294967296;

/** Réduit un entier (éventuellement très grand ou négatif) modulo 2^32, comme les cellules uint du shader. */
export const mod32 = (v: number) => v - Math.floor(v / TWO_32) * TWO_32;

/** Décalage des cellules propre à la graine : changer de graine revient à se déplacer très loin dans le bruit. */
export function seedOffset(): [number, number] {
  return [Math.imul(params.seed, 0x9e3779b1) >>> 0, Math.imul(params.seed ^ 0x5bd1e995, 0x85ebca6b) >>> 0];
}

/** Passage à l'octave suivante, comme 2.0 * (M2 * q) dans le shader : rotation et fréquence doublée. */
export function rotate(x: number, y: number): [number, number] {
  return [2 * (0.8 * x + 0.6 * y), 2 * (-0.6 * x + 0.8 * y)];
}

function setOrigin(frac: Float32Array, cell: Uint32Array, i: number, qx: number, qz: number, ox: number, oy: number) {
  const fx = Math.floor(qx), fz = Math.floor(qz);
  frac[i * 2] = qx - fx;
  frac[i * 2 + 1] = qz - fz;
  cell[i * 2] = mod32(fx + ox);
  cell[i * 2 + 1] = mod32(fz + oy);
}

/** Origines des octaves du relief, pour une caméra en (x, z). */
export function octaveOrigins(x: number, z: number): NoiseOrigin {
  const [ox, oy] = seedOffset();
  const frac = new Float32Array(MAX_OCTAVES * 2);
  const cell = new Uint32Array(MAX_OCTAVES * 2);
  let qx = x / params.scale, qz = z / params.scale;
  for (let i = 0; i < MAX_OCTAVES; i++) {
    setOrigin(frac, cell, i, qx, qz, ox, oy);
    [qx, qz] = rotate(qx, qz);
  }
  return { frac, cell };
}

/** Origines des octaves des champs de biomes (FIELD_OCTAVES par champ, à la suite). */
export function fieldOrigins(x: number, z: number): NoiseOrigin {
  const [ox, oy] = seedOffset();
  const frac = new Float32Array(FIELDS.length * FIELD_OCTAVES * 2);
  const cell = new Uint32Array(FIELDS.length * FIELD_OCTAVES * 2);
  FIELDS.forEach(({ ratio, salt }, f) => {
    const scale = params.biomeScale * ratio;
    let qx = x / scale, qz = z / scale;
    for (let i = 0; i < FIELD_OCTAVES; i++) {
      setOrigin(frac, cell, f * FIELD_OCTAVES + i, qx, qz, ox + salt, oy + salt);
      [qx, qz] = rotate(qx, qz);
    }
  });
  return { frac, cell };
}

/** Matrice 3×3 (en colonnes) : rotation autour de y puis autour de x. */
function rotationMatrix(yaw: number, tilt: number): number[] {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(tilt), sx = Math.sin(tilt);
  return [cy, sx * sy, -cx * sy, 0, cx, sx, sy, -sx * cy, cx * cy];
}

// Chaque octave du bruit 3D de la roche a sa propre orientation : aucune grille n'est perceptible
const ROCK_ROTATIONS = ROCK_WAVELENGTHS.map((_, i) => rotationMatrix(0.7 + i * 1.3, 0.5 + i * 0.9));

/** Origines des octaves du bruit 3D de la roche, pour une caméra en (x, 0, z). */
export function rockOrigins(x: number, z: number): RockOrigin {
  const [ox, oy] = seedOffset();
  const seeds = [ox, oy, ox + oy];
  const frac = new Float32Array(ROCK_WAVELENGTHS.length * 3);
  const cell = new Uint32Array(ROCK_WAVELENGTHS.length * 3);
  ROCK_WAVELENGTHS.forEach((wavelength, i) => {
    const r = ROCK_ROTATIONS[i];
    for (let row = 0; row < 3; row++) {
      const q = (r[row] * x + r[6 + row] * z) / wavelength;
      const fl = Math.floor(q);
      frac[i * 3 + row] = q - fl;
      cell[i * 3 + row] = mod32(fl + seeds[row]);
    }
  });
  return { frac, cell, rotation: new Float32Array(ROCK_ROTATIONS.flat()) };
}

/**
 * Facteurs d'échelle entiers des dunes : torsion des crêtes (et abondance du sable), puis une paire par couche
 * (crêtes ; bruits de sinuosité et de hauteur des tronçons). Les fréquences des dunes sont des multiples entiers de
 * celle des biomes : le shader réutilise ainsi l'origine en double précision du premier champ de biomes, au lieu d'en
 * recevoir une par bruit.
 */
export function duneScales(): Uint32Array {
  const factor = (wavelength: number) => Math.max(1, Math.round(params.biomeScale / wavelength));
  return new Uint32Array([
    factor(DUNE_WARP_WAVELENGTH),
    ...DUNE_LAYERS.flatMap((layer) => [factor(layer.wavelength), factor(layer.wavelength * layer.segment)]),
  ]);
}
