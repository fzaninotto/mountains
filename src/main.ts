import './style.css';
import { params } from './params';
import { FlyCamera, type View } from './camera';
import { Renderer, type Target } from './renderer';
import { createGui } from './gui';
import { aridity, reliefLevel } from './noise';

interface Job {
  target: Target;
  view: View;
  row: number;
}

const REFINE_DELAY = 150;
const TELEPORT_RANGE = 500_000;

const canvas = document.querySelector<HTMLCanvasElement>('#view')!;
const hud = document.querySelector<HTMLElement>('#hud')!;
const renderer = new Renderer(canvas);
const camera = new FlyCamera(canvas);

// Position de départ optionnelle dans l'URL : #x=12000&z=-3400&alt=400
const start = new URLSearchParams(window.location.hash.slice(1));
camera.x = Number(start.get('x')) || 0;
camera.z = Number(start.get('z')) || 0;
camera.placeAboveGround(Number(start.get('alt')) || 400);

let preview: Target | null = null;
let sharp: Target | null = null;
let exportTarget: Target | null = null;
let refineJob: Job | null = null;
let exportJob: Job | null = null;
let dirty = true;
let sharpDone = false;
let changedAt = 0;
let pixelBudget = 250_000;

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
  return sharpDone ? 'Net' : 'Aperçu';
}

function biomeName(level: number, desert: number): string {
  if (level < 0.12) return 'Mer';
  if (level < 0.26) return desert > 0.5 ? 'Côte désertique' : 'Plage';
  if (level < 0.45) return desert > 0.5 ? 'Désert' : 'Plaine';
  if (level < 0.8) return desert > 0.5 ? 'Collines arides' : 'Moyenne montagne';
  return desert > 0.5 ? 'Montagne aride' : 'Haute montagne';
}

function updateHud() {
  const clearance = camera.y - camera.ground();
  hud.textContent = [
    biomeName(reliefLevel(camera.x, camera.z), aridity(camera.x, camera.z)),
    `Altitude ${Math.round(camera.y)} m`,
    `sol +${Math.round(clearance)} m`,
    `${Math.round(camera.speed())} m/s`,
    `x ${(camera.x / 1000).toFixed(1)} km · z ${(camera.z / 1000).toFixed(1)} km`,
    status(),
  ].join(' · ');
}

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

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
    preview = renderer.ensureTarget(
      preview,
      Math.max(1, Math.round(canvas.width * params.movingScale)),
      Math.max(1, Math.round(canvas.height * params.movingScale)),
    );
    renderer.renderRows(preview, camera.view(), 0, preview.height);
    renderer.copy(preview, null);
    dirty = false;
  } else if (!sharpDone && preview) {
    if (!refineJob && now - changedAt > REFINE_DELAY) {
      sharp = renderer.ensureTarget(sharp, canvas.width, canvas.height);
      renderer.copy(preview, sharp);
      refineJob = { target: sharp, view: camera.view(), row: 0 };
    }
    if (refineJob) {
      sharpDone = advance(refineJob);
      renderer.copy(refineJob.target, null);
      if (sharpDone) refineJob = null;
    }
  }

  updateHud();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
