import { params } from '../params';

// Primitives de bruit, identiques bit à bit à celles de src/render/noise.glsl.
// Les cellules sont des entiers non signés 32 bits : les calculs JS se font modulo 2^32, comme sur le GPU.

const TWO_32 = 4294967296;

/** Réduit un entier (éventuellement très grand ou négatif) modulo 2^32. */
export const mod32 = (v: number) => v - Math.floor(v / TWO_32) * TWO_32;

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Hash entier « Integer Hash III » d'Inigo Quilez, dans [0, 1]. */
function hash(x: number, y: number): number {
  const qx = Math.imul(1103515245, (x >>> 1) ^ y);
  const qy = Math.imul(1103515245, (y >>> 1) ^ x);
  return (Math.imul(1103515245, qx ^ (qy >>> 3)) >>> 0) / 4294967295;
}

/** Décalage des cellules propre à la graine : changer de graine revient à se déplacer très loin dans le bruit. */
export function seedOffset(): [number, number] {
  return [Math.imul(params.seed, 0x9e3779b1) >>> 0, Math.imul(params.seed ^ 0x5bd1e995, 0x85ebca6b) >>> 0];
}

/** Passage à l'octave suivante : rotation (évite l'alignement des grilles) et fréquence doublée. */
export function rotate(x: number, y: number): [number, number] {
  return [2 * (0.8 * x + 0.6 * y), 2 * (-0.6 * x + 0.8 * y)];
}

/**
 * Value noise 2D avec dérivées analytiques (Inigo Quilez) : [valeur dans [-1, 1], d/dx, d/dy].
 * (ox, oy) décale les cellules (graine, champ, facteur d'échelle entier…).
 */
export function noised(x: number, y: number, ox: number, oy: number): [number, number, number] {
  const fx = Math.floor(x), fy = Math.floor(y);
  const ix = mod32(fx + ox), iy = mod32(fy + oy);
  const ix1 = (ix + 1) >>> 0, iy1 = (iy + 1) >>> 0;
  const tx = x - fx, ty = y - fy;
  const ux = tx * tx * tx * (tx * (tx * 6 - 15) + 10);
  const uy = ty * ty * ty * (ty * (ty * 6 - 15) + 10);
  const dux = 30 * tx * tx * (tx * (tx - 2) + 1);
  const duy = 30 * ty * ty * (ty * (ty - 2) + 1);
  const a = hash(ix, iy), b = hash(ix1, iy), c = hash(ix, iy1), d = hash(ix1, iy1);
  const k1 = b - a, k2 = c - a, k4 = a - b - c + d;
  return [
    -1 + 2 * (a + k1 * ux + k2 * uy + k4 * ux * uy),
    2 * dux * (k1 + k4 * uy),
    2 * duy * (k2 + k4 * ux),
  ];
}
