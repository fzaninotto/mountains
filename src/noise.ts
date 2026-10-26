import { BIOME_STOPS, biomes, desertBias, MAX_OCTAVES, mountainBias, params, type Biome } from './params';

// Réplique en double précision du bruit de terrain.frag.glsl : les deux doivent rester identiques

export const MATERIAL_SCALE = 350;
export const GROUND_OCTAVES = 16;
const SNOW_SMOOTH_WAVELENGTH = 60;
const SNOW_FLATTENING = 0.85;

export const ARIDITY_SCALE_RATIO = 1.37;
export const ARIDITY_SALT = 7919;

// Dunes : crêtes d'un bruit étiré perpendiculairement au vent (axe x), ondulées par un second bruit.
// Les fréquences sont des multiples entiers de celle des biomes, pour réutiliser son origine en double précision
export const DUNE_LAYERS = [
  { wavelength: 210, stretch: 4, height: 22 },
  { wavelength: 50, stretch: 3, height: 4 },
] as const;
const DUNE_WARP_WAVELENGTH = 1200;
const DUNE_WARP = 250;

// Facteurs entiers (x, z) : ondulation, puis chaque couche de dunes
export function duneScales(): Uint32Array {
  const factors = (wavelength: number, stretch: number) => {
    const kx = Math.max(1, Math.round(params.biomeScale / wavelength));
    return [kx, Math.max(1, Math.round(kx / stretch))];
  };
  return new Uint32Array([
    ...factors(DUNE_WARP_WAVELENGTH, 1),
    ...DUNE_LAYERS.flatMap((layer) => factors(layer.wavelength, layer.stretch)),
  ]);
}

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

// Niveau de relief : 0 = mer, puis plage, plaine, moyenne et haute montagne jusqu'à 1. Champ continu à très
// grande échelle : on passe toujours d'un biome au suivant progressivement, sans frontière
export function reliefLevel(x: number, z: number): number {
  return smoothstep(-0.45, 0.45, biomeNoise(x / params.biomeScale, z / params.biomeScale, 0) + mountainBias());
}

// Poids du désert (0 à 1), sur un second champ indépendant
export function aridity(x: number, z: number): number {
  const size = params.biomeScale * ARIDITY_SCALE_RATIO;
  return smoothstep(0.1, 0.45, biomeNoise(x / size, z / size, ARIDITY_SALT) + desertBias());
}

function biomeNoise(qx: number, qz: number, salt: number): number {
  const [ox, oy] = seedOffset();
  const sx = ox + salt, sz = oy + salt;
  return (noised(qx, qz, sx, sz)[0] + 0.5 * noised(2 * qx + 0.37, 2 * qz + 0.71, 2 * sx, 2 * sz)[0]) / 1.5;
}

export function biomeAt(level: number): Biome {
  const list = biomes();
  const result = { ...list[0] };
  for (let i = 0; i < list.length - 1; i++) {
    const t = smoothstep(BIOME_STOPS[i], BIOME_STOPS[i + 1], level);
    result.base += (list[i + 1].base - result.base) * t;
    result.amplitude += (list[i + 1].amplitude - result.amplitude) * t;
    result.gain += (list[i + 1].gain - result.gain) * t;
  }
  return result;
}

// Plaine, plage : en dessous, la montagne commence
export function lowland(level: number): number {
  return 1 - smoothstep(0.3, 0.45, level);
}

// Les dunes n'existent que dans les zones arides basses : ni en mer, ni en relief
export function duneWeight(level: number, desert: number): number {
  return desert * smoothstep(0.12, 0.2, level) * lowland(level);
}

// minWavelength : plus petite longueur d'onde affichable ; les couches de dunes plus fines s'effacent
function dunes(x: number, z: number, minWavelength: number): number {
  const [ox, oy] = seedOffset();
  const scales = duneScales();
  const X = x / params.biomeScale, Z = z / params.biomeScale;
  const [kwx, kwz] = scales;
  const warpX = (DUNE_WARP / params.biomeScale) * noised(kwx * X + 1.3, kwz * Z + 7.1, kwx * ox, kwz * oy)[0];
  const warpZ = (DUNE_WARP / params.biomeScale) * noised(kwx * X + 4.7, kwz * Z + 2.2, kwx * ox, kwz * oy)[0];
  // Hauteur des crêtes variable, sur le bruit des biomes 64 fois plus fin (~600 m)
  const crest = 0.35 + 0.65 * smoothstep(-0.6, 0.6, noised(64 * X + 5.3, 64 * Z + 1.9, 64 * ox, 64 * oy)[0]);
  let h = 0;
  DUNE_LAYERS.forEach((layer, i) => {
    const kx = scales[2 + 2 * i], kz = scales[3 + 2 * i];
    const n = noised(kx * (X + warpX) + 3.1, kz * (Z + warpZ) + 8.3, kx * ox, kz * oy)[0];
    const wavelength = params.biomeScale / kx;
    // Arête arrondie, d'autant plus que la dune est petite à l'écran, pour éviter le crénelage des crêtes
    const bevel = 0.04 + (0.5 * minWavelength) / wavelength;
    const ridge = 1 - (Math.sqrt(n * n + bevel * bevel) - bevel);
    h += Math.max(ridge, 0) ** 1.6 * layer.height * smoothstep(minWavelength, 2 * minWavelength, wavelength);
  });
  return h * crest;
}

export function terrainHeight(x: number, z: number, octaves = GROUND_OCTAVES): number {
  const [ox, oy] = seedOffset();
  const level = reliefLevel(x, z);
  const sand = duneWeight(level, aridity(x, z));
  const biome = biomeAt(level);
  const { base, gain } = biome;
  const height = biome.amplitude * (1 - 0.5 * sand);
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
      amplitude *= 1 - snowSmoothing(base + height * a, height * Math.hypot(gradX, gradZ));
    }
    a += amplitude * v;
    gradX += amplitude * (j0[0] * nx + j0[1] * nz);
    gradZ += amplitude * (j1[0] * nx + j1[1] * nz);
    b *= gain;
    [qx, qz] = rotate(qx, qz);
    j0 = rotate(...j0);
    j1 = rotate(...j1);
    wavelength /= 2;
  }
  return base + height * a + sand * dunes(x, z, params.scale * 2 ** -octaves);
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

// Même principe pour un bruit à une seule échelle (matériau, biomes) ; salt décorrèle deux champs
export function gridOrigin(x: number, z: number, cellSize: number, salt = 0): NoiseOrigin {
  const [seedX, seedY] = seedOffset();
  const ox = seedX + salt, oy = seedY + salt;
  const frac = new Float32Array(2);
  const cell = new Uint32Array(2);
  setOrigin(frac, cell, 0, x / cellSize, z / cellSize, ox, oy);
  return { frac, cell };
}

function setOrigin(frac: Float32Array, cell: Uint32Array, i: number, qx: number, qz: number, ox: number, oy: number) {
  const fx = Math.floor(qx), fz = Math.floor(qz);
  frac[i * 2] = qx - fx;
  frac[i * 2 + 1] = qz - fz;
  cell[i * 2] = mod32(fx + ox);
  cell[i * 2 + 1] = mod32(fz + oy);
}
