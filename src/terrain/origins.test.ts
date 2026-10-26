import { afterEach, describe, expect, it } from 'vitest';
import { params } from '../params';
import { DUNE_LAYERS, FIELD_OCTAVES, FIELDS, MAX_OCTAVES, ROCK_WAVELENGTHS } from './constants';
import { duneScales, fieldOrigins, mod32, octaveOrigins, rockOrigins, rotate, seedOffset } from './origins';

const TWO_32 = 4294967296;

/** Écart (cellules) entre deux origines d'une même octave, comme le shader le voit : cellule uint plus fraction. */
function offset(a: { frac: Float32Array; cell: Uint32Array }, b: typeof a, k: number): number {
  const cells = mod32(b.cell[k] - a.cell[k]);
  return (cells > TWO_32 / 2 ? cells - TWO_32 : cells) + b.frac[k] - a.frac[k];
}

afterEach(() => {
  params.seed = 1;
});

describe('origines des bruits', () => {
  it('ramènent la position à une cellule et une fraction dans [0, 1[', () => {
    const { frac, cell } = octaveOrigins(-277644.25, 133728.5);
    expect(frac).toHaveLength(MAX_OCTAVES * 2);
    frac.forEach((f) => expect(f >= 0 && f < 1).toBe(true));
    const [ox, oy] = seedOffset();
    expect(cell[0]).toBe(mod32(Math.floor(-277644.25 / params.scale) + ox));
    expect(cell[1]).toBe(mod32(Math.floor(133728.5 / params.scale) + oy));
  });

  it('suivent la rotation des octaves', () => {
    const x = 12345, z = -6789;
    const { frac, cell } = octaveOrigins(x, z);
    const [qx, qz] = rotate(x / params.scale, z / params.scale);
    const [ox, oy] = seedOffset();
    expect(cell[2]).toBe(mod32(Math.floor(qx) + ox));
    expect(cell[3]).toBe(mod32(Math.floor(qz) + oy));
    expect(frac[2]).toBeCloseTo(qx - Math.floor(qx), 6);
  });

  it('restent précises à 10 000 km de l’origine', () => {
    // Un mètre de déplacement doit se retrouver dans les origines, à la précision float32 de la fraction près
    const far = 1e7;
    const a = octaveOrigins(far, far), b = octaveOrigins(far + 1, far);
    expect(offset(a, b, 0)).toBeCloseTo(1 / params.scale, 6);
    const fa = fieldOrigins(far, far), fb = fieldOrigins(far + 1, far);
    expect(offset(fa, fb, 0)).toBeCloseTo(1 / params.biomeScale, 6);
  });

  it('dépendent de la graine', () => {
    const before = octaveOrigins(0, 0).cell[0];
    params.seed = 2;
    expect(octaveOrigins(0, 0).cell[0]).not.toBe(before);
  });

  it('couvrent chaque octave de chaque champ de biomes', () => {
    const { frac, cell } = fieldOrigins(1000, 2000);
    expect(frac).toHaveLength(FIELDS.length * FIELD_OCTAVES * 2);
    expect(cell).toHaveLength(FIELDS.length * FIELD_OCTAVES * 2);
  });

  it('orientent la roche par des rotations orthonormées', () => {
    const { rotation, frac } = rockOrigins(500, -500);
    expect(frac).toHaveLength(ROCK_WAVELENGTHS.length * 3);
    for (let i = 0; i < ROCK_WAVELENGTHS.length; i++) {
      const m = rotation.subarray(i * 9, i * 9 + 9);
      for (let a = 0; a < 3; a++) {
        for (let b = 0; b < 3; b++) {
          const dot = m[a * 3] * m[b * 3] + m[a * 3 + 1] * m[b * 3 + 1] + m[a * 3 + 2] * m[b * 3 + 2];
          expect(dot).toBeCloseTo(a === b ? 1 : 0, 6);
        }
      }
    }
  });
});

describe('échelles des dunes', () => {
  it('sont des facteurs entiers non nuls, deux par bruit', () => {
    const scales = duneScales();
    expect(scales).toHaveLength(2 * (2 + DUNE_LAYERS.length));
    scales.forEach((k) => expect(k).toBeGreaterThanOrEqual(1));
    expect(params.biomeScale / scales[4]).toBeCloseTo(DUNE_LAYERS[0].wavelength, -1);
  });
});
