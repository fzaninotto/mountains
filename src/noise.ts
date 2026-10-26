import { MAX_OCTAVES, params } from './params';

// Réplique en double précision du bruit de terrain.frag.glsl : les deux doivent rester identiques

export const MATERIAL_SCALE = 350;
export const GROUND_OCTAVES = 16;
const SNOW_SMOOTH_WAVELENGTH = 60;
const SNOW_FLATTENING = 0.85;

const TWO_32 = 4294967296;
const mod32 = (v: number) => v - Math.floor(v / TWO_32) * TWO_32;

function hash(x: number, y: number): number {
  const qx = Math.imul(1103515245, (x >>> 1) ^ y);
  const qy = Math.imul(1103515245, (y >>> 1) ^ x);
  return (Math.imul(1103515245, qx ^ (qy >>> 3)) >>> 0) / 4294967295;
}

function seedOffset(): [number, number] {
  return [Math.imul(params.seed, 0x9e3779b1) >>> 0, Math.imul(params.seed ^ 0x5bd1e995, 0x85ebca6b) >>> 0];
}

function rotate(x: number, y: number): [number, number] {
  return [2 * (0.8 * x + 0.6 * y), 2 * (-0.6 * x + 0.8 * y)];
}

// Value noise avec dérivées analytiques (Inigo Quilez)
function noised(x: number, y: number, ox: number, oy: number): [number, number, number] {
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

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function snowSmoothing(h: number, slope: number): number {
  return SNOW_FLATTENING * smoothstep(params.snow - 100, params.snow + 150, h) * (1 - smoothstep(0.35, 0.7, slope));
}

export function terrainHeight(x: number, z: number, octaves = GROUND_OCTAVES): number {
  const [ox, oy] = seedOffset();
  let qx = x / params.scale, qz = z / params.scale;
  // Colonnes de la jacobienne dq/dx, pour connaître la vraie pente
  let j0: [number, number] = [1 / params.scale, 0];
  let j1: [number, number] = [0, 1 / params.scale];
  let a = 0, b = 1, dx = 0, dz = 0, gradX = 0, gradZ = 0, wavelength = params.scale;
  for (let i = 0; i < octaves; i++) {
    const [v, nx, nz] = noised(qx, qz, ox, oy);
    dx += nx;
    dz += nz;
    let amplitude = b / (1 + dx * dx + dz * dz);
    if (wavelength < SNOW_SMOOTH_WAVELENGTH) {
      amplitude *= 1 - snowSmoothing(params.height * a, params.height * Math.hypot(gradX, gradZ));
    }
    a += amplitude * v;
    gradX += amplitude * (j0[0] * nx + j0[1] * nz);
    gradZ += amplitude * (j1[0] * nx + j1[1] * nz);
    b *= params.gain;
    [qx, qz] = rotate(qx, qz);
    j0 = rotate(...j0);
    j1 = rotate(...j1);
    wavelength /= 2;
  }
  return params.height * a;
}

export interface NoiseOrigin {
  frac: Float32Array;
  cell: Uint32Array;
}

// Le shader travaille en coordonnées relatives à la caméra : pour chaque octave, on lui passe
// la partie entière (cellule) et la partie fractionnaire de la position de la caméra dans l'espace du bruit,
// calculées ici en double précision. Le relief reste précis à des milliers de kilomètres de l'origine.
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

export function materialOrigin(x: number, z: number): NoiseOrigin {
  const [ox, oy] = seedOffset();
  const frac = new Float32Array(2);
  const cell = new Uint32Array(2);
  setOrigin(frac, cell, 0, x / MATERIAL_SCALE, z / MATERIAL_SCALE, ox, oy);
  return { frac, cell };
}

function setOrigin(frac: Float32Array, cell: Uint32Array, i: number, qx: number, qz: number, ox: number, oy: number) {
  const fx = Math.floor(qx), fz = Math.floor(qz);
  frac[i * 2] = qx - fx;
  frac[i * 2 + 1] = qz - fz;
  cell[i * 2] = mod32(fx + ox);
  cell[i * 2 + 1] = mod32(fz + oy);
}
