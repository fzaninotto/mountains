import { describe, expect, it } from 'vitest';
import { terrainHeight } from './height';
import { climate } from './climate';
import { glslConstants } from './constants';

// Relevés de référence (graine 1, réglages par défaut) : [x, z, altitude, [niveau de relief, désert, falaises]].
// Ils garantissent qu'un remaniement ne change pas le monde généré ; à mettre à jour seulement quand on modifie
// volontairement le relief (et le shader en conséquence).
const REFERENCE: [number, number, number, [number, number, number]][] = [
  [124123, -156149, 173.2222620939955, [0.42503823656004214, 1, 0]],
  [105987, 396705, -55.53801638563162, [0.15807308688773997, 0.004000578752522778, 0]],
  [143569, 138499, -58.19006363103415, [0.4654225890266179, 0.9266422940025634, 0]],
  [-261842, 306538, -208.45059574482468, [0, 0, 0]],
  [165819, 262028, 108.21657202546108, [0.41176527617849606, 0, 0.013480925419584677]],
  [191535, -129807, 184.77607675496137, [0.435109283417936, 1, 0]],
  [235117, -246232, 112.71836847112759, [0.3223436095010207, 0.5995274828229615, 0.9089029104429875]],
  [63897, -212990, -85.87444735766111, [0.14210605468633372, 1, 0]],
  [-232841, 230059, -135.44023069159599, [0.09481460575713975, 0.9679567005778754, 0.9882980053835971]],
  [297045, 275190, 127.56753485547702, [0.31551737668254215, 0, 0.9541601817712958]],
  [-310929, -23690, 20.66160810337641, [0.3, 1, 0.2682401882561271]],
  [185067, -107189, 1014.8855978253938, [0.8003545750694077, 0.37660873289347496, 0]],
  [-176546, -105396, -184.51769511310025, [0.042307698901639344, 0, 0]],
  [334980, 296612, 102.48082042203126, [0.31022535079112373, 0, 0.7366877256564729]],
  [-64585, -57076, -94.56572261002465, [0.12435771503740425, 0, 0.8418739616080522]],
  [255767, -261819, -50.353858328166524, [0.2023532968984671, 0, 0]],
  [-273351, -145704, 141.12144506886884, [0.3938270474221163, 0, 0]],
  [-98417, 3598, 72.67820954198356, [0.3, 0, 1]],
  [378379, -25972, 59.44845084248354, [0.392563574243021, 0.9941116584067223, 0.10744829092526069]],
  [202806, -219759, 69.66180448432648, [0.3, 0.9960537072742158, 0.7234888228474389]],
  [-51186, 298749, -204.67095887845005, [0.007987952663633667, 1, 0]],
  [255149, -153705, 870.1857477219359, [0.8414687328478463, 1, 0]],
  [28638, 277257, -198.23025456315736, [0.051269219516559536, 0.36574309684973194, 0]],
  [160177, -311147, -57.78576743567629, [0.1538708462183528, 0, 0]],
];

describe('relief', () => {
  it.each(REFERENCE)('reste identique en (%i, %i)', (x, z, height, expectedClimate) => {
    expect(terrainHeight(x, z)).toBeCloseTo(height, 9);
    climate(x, z).forEach((value, i) => expect(value).toBeCloseTo(expectedClimate[i], 12));
  });

  it('reste précis loin de l’origine', () => {
    // À 10 000 km, deux points distants de 1 m doivent avoir des altitudes proches
    const far = 1e7;
    expect(Math.abs(terrainHeight(far, far) - terrainHeight(far + 1, far))).toBeLessThan(5);
  });
});

describe('constantes partagées avec le shader', () => {
  it('produisent des déclarations GLSL valides', () => {
    const glsl = glslConstants();
    expect(glsl).toContain('const int MAX_OCTAVES = 20;');
    expect(glsl).toMatch(/const float BIOME_STOPS\[6\] = float\[6\]\(0\.0, 0\.2, 0\.3, 0\.45, 0\.68, 1\.0\);/);
    expect(glsl).not.toMatch(/NaN|undefined/);
  });
});
