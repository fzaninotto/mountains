import { params } from './params';
import type { Renderer } from './render/renderer';

// Mode #probe-test : interroge les sondes GPU en des points de référence et compare. Le relief n'existe plus qu'en
// GLSL : ces relevés garantissent qu'un remaniement ne change pas le monde généré. À mettre à jour seulement quand
// on modifie volontairement le relief. Résultats affichés dans la page et exposés dans window.__probeTest.

// Relevés de référence (graine 1, réglages par défaut) : [x, z, altitude, [niveau de relief, désert, falaises]]
const REFERENCE: [number, number, number, [number, number, number]][] = [
  [124123, -156149, 171.4118194580078, [0.42503823656004214, 1, 0]],
  [105987, 396705, -55.57765579223633, [0.15807308688773997, 0.004000578752522778, 0]],
  [143569, 138499, -58.19006363103415, [0.4654225890266179, 0.9266422940025634, 0]],
  [-261842, 306538, -208.45059574482468, [0, 0, 0]],
  [165819, 262028, 107.40268620482793, [0.41176527617849606, 0, 0.013480925419584677]],
  [191535, -129807, 184.45458984375, [0.435109283417936, 1, 0]],
  [235117, -246232, 121.03092956542969, [0.3223436095010207, 0.5995274828229615, 0.9089029104429875]],
  [63897, -212990, -87.32276916503906, [0.14210605468633372, 1, 0]],
  [-232841, 230059, -135.44023069159599, [0.09481460575713975, 0.9679567005778754, 0.9882980053835971]],
  [297045, 275190, 61.57467200483631, [0.31551737668254215, 0, 0.9541601817712958]],
  [-310929, -23690, -0.2506598234176636, [0.3, 1, 0.2682401882561271]],
  [185067, -107189, 1014.8855978253938, [0.8003545750694077, 0.37660873289347496, 0]],
  [-176546, -105396, -184.51769511310025, [0.042307698901639344, 0, 0]],
  [334980, 296612, 91.33433369898995, [0.31022535079112373, 0, 0.7366877256564729]],
  [-64585, -57076, -94.56572261002465, [0.12435771503740425, 0, 0.8418739616080522]],
  [255767, -261819, -50.353858328166524, [0.2023532968984671, 0, 0]],
  [-273351, -145704, 141.12144506886884, [0.3938270474221163, 0, 0]],
  [-98417, 3598, 54.00282958683332, [0.3, 0, 1]],
  [378379, -25972, 49.71918487548828, [0.392563574243021, 0.9941116584067223, 0.10744829092526069]],
  [202806, -219759, 23.187286376953125, [0.3, 0.9960537072742158, 0.7234888228474389]],
  [-51186, 298749, -204.67095887845005, [0.007987952663633667, 1, 0]],
  [255149, -153705, 870.1857477219359, [0.8414687328478463, 1, 0]],
  [28638, 277257, -198.23025456315736, [0.051269219516559536, 0.36574309684973194, 0]],
  [160177, -311147, -57.78576743567629, [0.1538708462183528, 0, 0]],
];

/** Écarts tolérés : altitude (m) et climat. */
const HEIGHT_TOLERANCE = 0.01;
const CLIMATE_TOLERANCE = 1e-5;
/** À 10 000 km de l'origine, deux points distants de 1 m doivent avoir des altitudes proches (m). */
const FAR = 1e7;
const FAR_TOLERANCE = 5;

export async function runProbeTest(renderer: Renderer, output: HTMLElement) {
  params.seed = 1;
  const requests = [
    ...REFERENCE.map(([x, z]) => ({ x, z, y: 0 })),
    { x: FAR, z: FAR, y: 0 },
    { x: FAR + 1, z: FAR, y: 0 },
  ];
  const results = await renderer.probe(requests);

  const rows = REFERENCE.map(([x, z, height, climate], i) => {
    const probed = results[i];
    return {
      x,
      z,
      height,
      probed: probed.ground,
      heightError: Math.abs(probed.ground - height),
      climateError: Math.max(...climate.map((value, k) => Math.abs(probed.climate[k] - value))),
    };
  });
  const far = Math.abs(results[REFERENCE.length].ground - results[REFERENCE.length + 1].ground);
  const maxHeightError = Math.max(...rows.map((r) => r.heightError));
  const maxClimateError = Math.max(...rows.map((r) => r.climateError));
  const passed = maxHeightError <= HEIGHT_TOLERANCE && maxClimateError <= CLIMATE_TOLERANCE && far < FAR_TOLERANCE;

  (window as unknown as { __probeTest: unknown }).__probeTest = { passed, maxHeightError, maxClimateError, far, rows };
  output.textContent = [
    `Sondes GPU / références : ${passed ? 'OK' : 'ÉCHEC'}`,
    ...rows.map((r) => `(${r.x}, ${r.z}) : ${r.probed.toFixed(4)} m · réf. ${r.height.toFixed(4)} · `
      + `écart ${r.heightError.toExponential(1)} m · climat ${r.climateError.toExponential(1)}`),
    `écart max : ${maxHeightError.toExponential(2)} m (tolérance ${HEIGHT_TOLERANCE}) · `
      + `climat ${maxClimateError.toExponential(2)} (tolérance ${CLIMATE_TOLERANCE})`,
    `à ${FAR / 1000} km, 1 m d'écart horizontal : ${far.toFixed(3)} m (tolérance ${FAR_TOLERANCE})`,
  ].join('\n');
}
