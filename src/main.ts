import './style.css';
import { params } from './params';
import { FlyCamera, type View } from './camera';
import { Renderer, type Target } from './renderer';
import { createGui } from './gui';
import { climate } from './noise';

interface Job {
  target: Target;
  view: View;
  row: number;
}

// Bras de mer entre falaises et île montagneuse, avec la graine par défaut
const DEFAULT_START = { x: -277644, z: 133728, alt: 300, yaw: 3.6, pitch: -0.08 };
const REFINE_DELAY = 150;
const MIN_MOVING_SCALE = 0.05;
const MOVING_SCALE_STEP = 0.01;
const TELEPORT_RANGE = 500_000;

const canvas = document.querySelector<HTMLCanvasElement>('#view')!;
const hud = document.querySelector<HTMLElement>('#hud')!;
const renderer = new Renderer(canvas);
const camera = new FlyCamera(canvas);

// Point de départ, remplaçable dans l'URL : #x=12000&z=-3400&alt=400&yaw=1.2&pitch=-0.1&seed=1
const start = new URLSearchParams(window.location.hash.slice(1));
if (start.has('seed')) params.seed = Number(start.get('seed'));
const startValue = (key: keyof typeof DEFAULT_START) => (start.has(key) ? Number(start.get(key)) : DEFAULT_START[key]);
camera.x = startValue('x');
camera.z = startValue('z');
camera.yaw = startValue('yaw');
camera.pitch = startValue('pitch');
camera.placeAboveGround(startValue('alt'));

let preview: Target | null = null;
let previewWidth = 1;
let previewHeight = 1;
let sharp: Target | null = null;
let exportTarget: Target | null = null;
let refineJob: Job | null = null;
let exportJob: Job | null = null;
let dirty = true;
let sharpDone = false;
let changedAt = 0;
let pixelBudget = 250_000;
// Résolution de l'aperçu en mouvement, ajustée en continu pour tenir params.targetFps
let movingScale = params.movingScale;
let frameIndex = 0;
let lastPreviewFrame = -1;
let lastPreviewAt = 0;
// Instants des aperçus affichés pendant la dernière seconde : la cadence réellement perçue
const previewTimes: number[] = [];

function invalidate() {
  dirty = true;
  sharpDone = false;
  refineJob = null;
  changedAt = performance.now();
}

const gui = createGui({
  viewChanged: invalidate,
  terrainChanged() {
    camera.clampToGround();
    invalidate();
  },
  newSeed() {
    params.seed = Math.floor(Math.random() * 1e6);
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    camera.placeAboveGround(400);
    invalidate();
  },
  teleport() {
    camera.x = (Math.random() * 2 - 1) * TELEPORT_RANGE;
    camera.z = (Math.random() * 2 - 1) * TELEPORT_RANGE;
    camera.placeAboveGround(400);
    invalidate();
  },
  exportImage() {
    const factor = Math.min(params.exportScale, renderer.maxSize / Math.max(canvas.width, canvas.height));
    exportTarget = renderer.ensureTarget(exportTarget, Math.floor(canvas.width * factor), Math.floor(canvas.height * factor));
    exportJob = { target: exportTarget, view: camera.view(), row: 0 };
  },
});

function resize() {
  const width = Math.round(window.innerWidth * params.pixelRatio);
  const height = Math.round(window.innerHeight * params.pixelRatio);
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
  invalidate();
}

// Calcule une bande de lignes ; renvoie true quand l'image est complète
function advance(job: Job): boolean {
  const rows = Math.max(1, Math.floor(pixelBudget / job.target.width));
  const end = Math.min(job.target.height, job.row + rows);
  renderer.renderRows(job.target, job.view, job.row, end);
  job.row = end;
  return end >= job.target.height;
}

function saveExport(target: Target) {
  const { width, height } = canvas;
  canvas.width = target.width;
  canvas.height = target.height;
  renderer.copy(target, null);
  const link = document.createElement('a');
  link.download = `montagne-${params.seed}-${Math.round(camera.x)}-${Math.round(camera.z)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  canvas.width = width;
  canvas.height = height;
  invalidate();
}

function status(): string {
  if (exportJob) return `Export ${Math.round((100 * exportJob.row) / exportJob.target.height)} %`;
  if (refineJob) return `Affinage ${Math.round((100 * refineJob.row) / refineJob.target.height)} %`;
  return sharpDone ? 'Net' : `Aperçu ${Math.round(movingScale * 100)} % · ${previewFps()} img/s`;
}

function biomeName(level: number, desert: number): string {
  const arid = desert > 0.5;
  if (level < 0.12) return 'Mer';
  if (level < 0.25) return arid ? 'Côte désertique' : 'Plage';
  if (level < 0.375) return arid ? 'Désert' : 'Plaine';
  if (level < 0.565) return arid ? 'Collines arides' : 'Collines';
  if (level < 0.84) return arid ? 'Moyenne montagne aride' : 'Moyenne montagne';
  return arid ? 'Haute montagne aride' : 'Haute montagne';
}

function here(): [number, number] {
  const [level, desert] = climate(camera.x, camera.z);
  return [level, desert];
}

// Vue courante au format de l'URL : visible dans le HUD (donc sur les captures d'écran) pour pouvoir la refaire
function viewHash(): string {
  const yaw = ((camera.yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return `#x=${Math.round(camera.x)}&z=${Math.round(camera.z)}&alt=${Math.round(camera.y - camera.ground())}`
    + `&yaw=${yaw.toFixed(3)}&pitch=${camera.pitch.toFixed(3)}&seed=${params.seed}`;
}

function updateHud() {
  hud.textContent = [
    biomeName(...here()),
    `Altitude ${Math.round(camera.y)} m`,
    `${Math.round(camera.speed())} m/s`,
    status(),
  ].join(' · ') + '\n' + viewHash();
}

function previewFps(): number {
  if (previewTimes.length < 2) return 0;
  return Math.round(((previewTimes.length - 1) * 1000) / (previewTimes[previewTimes.length - 1] - previewTimes[0]));
}

// Le coût d'un aperçu est proportionnel à son nombre de pixels, donc au carré de l'échelle :
// on corrige l'échelle par la racine du rapport entre durée visée et durée mesurée.
// La durée n'est mesurée qu'entre deux aperçus consécutifs : le GPU travaille en différé, et seul un
// enchaînement d'aperçus fait sentir sa charge sur la cadence des images
function adaptMovingScale(interval: number) {
  const target = 1 / params.targetFps;
  if (interval < target * 1.15 && interval > target * 0.8) return;
  const factor = Math.min(1.1, Math.max(0.7, Math.sqrt(target / interval)));
  const next = Math.round((movingScale * factor) / MOVING_SCALE_STEP) * MOVING_SCALE_STEP;
  movingScale = Math.min(params.movingScale, Math.max(MIN_MOVING_SCALE, next));
}

function recordPreview(now: number) {
  if (lastPreviewFrame === frameIndex - 1) adaptMovingScale((now - lastPreviewAt) / 1000);
  lastPreviewFrame = frameIndex;
  lastPreviewAt = now;
  previewTimes.push(now);
  while (now - previewTimes[0] > 1000) previewTimes.shift();
}

let last = performance.now();
function frame(now: number) {
  // Pas de temps réel : le déplacement ne dépend pas de la cadence (plafond pour les retours d'arrière-plan)
  const dt = Math.min(0.5, (now - last) / 1000);
  last = now;
  frameIndex++;

  // Ajuste la quantité de pixels calculés par frame pour garder l'interface fluide
  if (refineJob || exportJob) {
    if (dt > 0.045) pixelBudget = Math.max(20_000, pixelBudget * 0.7);
    else if (dt < 0.025) pixelBudget = Math.min(4_000_000, pixelBudget * 1.15);
  }

  resize();
  if (camera.update(dt)) invalidate();

  if (exportJob) {
    if (advance(exportJob)) {
      const target = exportJob.target;
      exportJob = null;
      saveExport(target);
    }
  } else if (dirty) {
    // Allouée une fois à la résolution maximale ; l'aperçu n'en utilise qu'un coin, sans réallocation à chaque ajustement
    preview = renderer.ensureTarget(
      preview,
      Math.max(1, Math.round(canvas.width * params.movingScale)),
      Math.max(1, Math.round(canvas.height * params.movingScale)),
    );
    movingScale = Math.min(movingScale, params.movingScale);
    previewWidth = Math.max(1, Math.min(preview.width, Math.round(canvas.width * movingScale)));
    previewHeight = Math.max(1, Math.min(preview.height, Math.round(canvas.height * movingScale)));
    renderer.renderRows(preview, camera.view(), 0, previewHeight, previewWidth, previewHeight);
    renderer.copy(preview, null, previewWidth, previewHeight);
    dirty = false;
    recordPreview(now);
  } else if (!sharpDone && preview) {
    if (!refineJob && now - changedAt > REFINE_DELAY) {
      sharp = renderer.ensureTarget(sharp, canvas.width, canvas.height);
      renderer.copy(preview, sharp, previewWidth, previewHeight);
      refineJob = { target: sharp, view: camera.view(), row: 0 };
    }
    if (refineJob) {
      sharpDone = advance(refineJob);
      renderer.copy(refineJob.target, null);
      if (sharpDone) {
        refineJob = null;
        history.replaceState(null, '', viewHash());
      }
    }
  }

  updateHud();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
