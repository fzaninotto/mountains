import { params } from '../params';
import { DUNE_CREST_WAVELENGTH, DUNE_LAYERS, DUNE_WARP, DUNE_WARP_WAVELENGTH } from './constants';
import { noised, seedOffset, smoothstep } from './noise';

// Dunes, identiques à dunes() dans src/render/climate.glsl.
// Leurs fréquences sont des multiples entiers de celle des biomes : le shader réutilise ainsi l'origine en double
// précision du premier champ de biomes, au lieu d'en recevoir une par bruit.

/** Facteurs entiers (x, z) : ondulation, hauteur des crêtes, puis une paire par couche de dunes. */
export function duneScales(): Uint32Array {
  const factors = (wavelength: number, stretch: number) => {
    const kx = Math.max(1, Math.round(params.biomeScale / wavelength));
    return [kx, Math.max(1, Math.round(kx / stretch))];
  };
  return new Uint32Array([
    ...factors(DUNE_WARP_WAVELENGTH, 1),
    ...factors(DUNE_CREST_WAVELENGTH, 1),
    ...DUNE_LAYERS.flatMap((layer) => factors(layer.wavelength, layer.stretch)),
  ]);
}

/**
 * Hauteur des dunes (m) : crêtes (1 - |n|) d'un bruit étiré perpendiculairement au vent (axe x), ondulées par
 * un second bruit. minWavelength : plus petite longueur d'onde affichable ; les couches plus fines s'effacent.
 */
export function dunes(x: number, z: number, minWavelength: number): number {
  const [ox, oy] = seedOffset();
  const scales = duneScales();
  const X = x / params.biomeScale, Z = z / params.biomeScale;
  const [kwx, kwz, kcx, kcz] = scales;
  const warpX = (DUNE_WARP / params.biomeScale) * noised(kwx * X + 1.3, kwz * Z + 7.1, kwx * ox, kwz * oy)[0];
  const warpZ = (DUNE_WARP / params.biomeScale) * noised(kwx * X + 4.7, kwz * Z + 2.2, kwx * ox, kwz * oy)[0];
  const crest = 0.35 + 0.65 * smoothstep(-0.6, 0.6, noised(kcx * X + 5.3, kcz * Z + 1.9, kcx * ox, kcz * oy)[0]);
  let h = 0;
  DUNE_LAYERS.forEach((layer, i) => {
    const kx = scales[4 + 2 * i], kz = scales[5 + 2 * i];
    const n = noised(kx * (X + warpX) + 3.1, kz * (Z + warpZ) + 8.3, kx * ox, kz * oy)[0];
    const wavelength = params.biomeScale / kx;
    // Arête arrondie, d'autant plus que la dune est petite à l'écran, pour éviter le crénelage des crêtes
    const bevel = 0.04 + (0.5 * minWavelength) / wavelength;
    const ridge = 1 - (Math.sqrt(n * n + bevel * bevel) - bevel);
    h += Math.max(ridge, 0) ** 1.6 * layer.height * smoothstep(minWavelength, 2 * minWavelength, wavelength);
  });
  return h * crest;
}
