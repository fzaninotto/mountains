import type { FlyCamera, View } from './camera';
import type { Renderer, Target } from './render/renderer';

// Banc de mesure des performances, lancé en ouvrant l'application avec #bench.
// Il rend des vues fixes à une résolution fixe, mesure le temps GPU de chacune et compare l'image à une référence
// enregistrée (#bench&save) pour détecter toute dégradation visuelle. Les résultats sont affichés dans la page et
// exposés dans window.__bench.

const WIDTH = 800;
const HEIGHT = 500;
const RUNS = 5;
const BASELINE_KEY = 'mountains-bench-baseline';

/** Vues représentatives : côte avec reflets, massif, paroi proche, désert, survol, face rocheuse. */
const VIEWS = [
  { name: 'côte', x: -277644, z: 133728, alt: 300, yaw: 3.6, pitch: -0.08 },
  { name: 'massif', x: -183547, z: -38985, alt: 1800, yaw: 0, pitch: 0.02 },
  { name: 'paroi', x: -183547, z: -44500, alt: 250, yaw: 0, pitch: 0.1 },
  { name: 'désert', x: 102860, z: 16054, alt: 60, yaw: 0.6, pitch: -0.08 },
  { name: 'survol', x: 0, z: 0, alt: 9000, yaw: 0.6, pitch: -0.3 },
  { name: 'face', x: -289749, z: 138132, alt: 416, yaw: 1.778, pitch: 0.234 },
];

export interface BenchResult {
  view: string;
  /** Temps médian de rendu d'une image (ms). */
  ms: number;
  /** Écart moyen par canal avec l'image de référence (0 à 255), null sans référence. */
  diff: number | null;
  /** Temps médian en mode aperçu (ms), sans comparaison d'image. */
  previewMs: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

/** Temps médian de rendu d'une image (ms), après une première image non mesurée (compilation, mise en cache). */
function measure(renderer: Renderer, target: Target, view: View, preview: boolean): number {
  renderer.renderRows(target, view, 0, HEIGHT, WIDTH, HEIGHT, preview);
  renderer.finish(target);
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    renderer.renderRows(target, view, 0, HEIGHT, WIDTH, HEIGHT, preview);
    renderer.finish(target);
    times.push(performance.now() - start);
  }
  return Math.round(median(times) * 10) / 10;
}

function meanAbsDiff(a: Uint8Array, b: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

/** Réduit l'image d'un facteur 4 (moyenne par blocs), pour une référence légère et tolérante au bruit d'un pixel. */
function downsample(pixels: Uint8Array): Uint8Array {
  const w = WIDTH / 4, h = HEIGHT / 4;
  const out = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 4; dx++) sum += pixels[((y * 4 + dy) * WIDTH + x * 4 + dx) * 4 + c];
        }
        out[(y * w + x) * 3 + c] = sum / 16;
      }
    }
  }
  return out;
}

export async function runBenchmark(renderer: Renderer, camera: FlyCamera, output: HTMLElement, save: boolean) {
  const target = renderer.ensureTarget(null, WIDTH, HEIGHT);
  const stored = localStorage.getItem(BASELINE_KEY);
  const baseline: Record<string, string> = stored && !save ? JSON.parse(stored) : {};
  const newBaseline: Record<string, string> = {};
  const results: BenchResult[] = [];

  for (const view of VIEWS) {
    output.textContent = `Banc de mesure : ${view.name}…`;
    await new Promise((resolve) => setTimeout(resolve, 0));
    camera.x = view.x;
    camera.z = view.z;
    camera.yaw = view.yaw;
    camera.pitch = view.pitch;
    camera.placeAboveGround(view.alt);
    const cameraView = camera.view();

    // L'aperçu est mesuré d'abord : l'image comparée à la référence est celle de la passe principale
    const previewMs = measure(renderer, target, cameraView, true);
    const ms = measure(renderer, target, cameraView, false);

    const image = downsample(renderer.readPixels(target));
    newBaseline[view.name] = toBase64(image);
    const reference = baseline[view.name];
    results.push({
      view: view.name,
      ms,
      diff: reference ? Math.round(meanAbsDiff(image, fromBase64(reference)) * 100) / 100 : null,
      previewMs,
    });
  }

  if (save) localStorage.setItem(BASELINE_KEY, JSON.stringify(newBaseline));
  const sum = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) * 10) / 10;
  const total = sum(results.map((r) => r.ms));
  const previewTotal = sum(results.map((r) => r.previewMs));
  (window as unknown as { __bench: unknown }).__bench = { results, total, previewTotal, saved: save };
  output.textContent = [
    `Banc de mesure (${WIDTH}×${HEIGHT}, médiane de ${RUNS})${save ? ' — référence enregistrée' : ''}`,
    ...results.map(
      (r) => `${r.view} : ${r.ms} ms${r.diff === null ? '' : ` · écart ${r.diff}`} · aperçu : ${r.previewMs} ms`,
    ),
    `total : ${total} ms · aperçu : ${previewTotal} ms`,
  ].join('\n');
}
