import { params } from './params';
import type { Renderer } from './render/renderer';

// Mode #probe-test : interroge les sondes GPU en des points de référence et compare. Le relief n'existe plus qu'en
// GLSL : ces relevés garantissent qu'un remaniement ne change pas le monde généré. À mettre à jour seulement quand
// on modifie volontairement le relief. Résultats affichés dans la page et exposés dans window.__probeTest.

// Relevés de référence (graine 1, réglages par défaut) : [x, z, altitude, [niveau de relief, désert, falaises]]
const REFERENCE: [number, number, number, [number, number, number]][] = [
  [124123, -156149, 332.953369140625, [0.5463767051696777, 1, 0]],
  [105987, 396705, -55.58016586303711, [0.15807293355464935, 0.004000554792582989, 0]],
  [143569, 138499, 127.84990692138672, [0.49231985211372375, 0.926642119884491, 0]],
  [-261842, 306538, -208.45059204101562, [0, 0, 0]],
  [165819, 262028, 194.0119171142578, [0.5144175291061401, 0, 0]],
  [191535, -129807, 417.64910888671875, [0.583578884601593, 1, 0]],
  [235117, -246232, 122.30546569824219, [0.32449498772621155, 0.599527895450592, 0.8920096755027771]],
  [63897, -212990, -87.32317352294922, [0.14210593700408936, 1, 0]],
  [-232841, 230059, -135.43995666503906, [0.09481482207775116, 0.9679568409919739, 0.9882981777191162]],
  [297045, 275190, 85.4403076171875, [0.3325349986553192, 0, 0.8193339109420776]],
  [-310929, -23690, -0.20339633524417877, [0.3015502095222473, 1, 0.26810693740844727]],
  [185067, -107189, 968.755126953125, [0.8168946504592896, 0.37660881876945496, 0]],
  [-176546, -105396, -184.5177001953125, [0.042307689785957336, 0, 0]],
  [334980, 296612, 95.70307922363281, [0.3171777129173279, 0, 0.7103169560432434]],
  [-64585, -57076, -94.56576538085938, [0.1243576630949974, 0, 0.8418737649917603]],
  [255767, -261819, -50.3538703918457, [0.20235319435596466, 0, 0]],
  [-273351, -145704, 149.9195098876953, [0.3984951376914978, 0, 0]],
  [-98417, 3598, 133.26690673828125, [0.4061867892742157, 0, 0.03670043870806694]],
  [378379, -25972, 115.93426513671875, [0.42621904611587524, 0.9941115975379944, 0]],
  [202806, -219759, 23.187286376953125, [0.30000001192092896, 0.9960537552833557, 0.7234888672828674]],
  [-51186, 298749, -204.67095947265625, [0.007987931370735168, 1, 0]],
  [255149, -153705, 1924.748291015625, [0.940651535987854, 1, 0]],
  [28638, 277257, -198.2301788330078, [0.051269304007291794, 0.36574333906173706, 0]],
  [160177, -311147, -57.78574752807617, [0.15387089550495148, 0, 0]],
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
