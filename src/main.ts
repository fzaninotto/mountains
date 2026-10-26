import './style.css';
import { params } from './params';
import { FlyCamera } from './camera';
import { Renderer } from './render/renderer';
import { FrameScheduler } from './scheduler';
import { createGui } from './gui';
import { updateHud } from './hud';
import { applyStartView, viewHash } from './viewUrl';
import { runBenchmark } from './bench';

/** Rayon (m) dans lequel « Aller ailleurs » choisit une position. */
const TELEPORT_RANGE = 500_000;
/** Hauteur (m) au-dessus du sol après une téléportation ou un changement de graine. */
const ARRIVAL_ALTITUDE = 400;

const canvas = document.querySelector<HTMLCanvasElement>('#view')!;
const hud = document.querySelector<HTMLElement>('#hud')!;
const renderer = new Renderer(canvas);
const camera = new FlyCamera(canvas);
// L'URL suit la vue chaque fois qu'une image nette est terminée
const scheduler = new FrameScheduler(renderer, canvas, camera, () => history.replaceState(null, '', viewHash(camera)));

applyStartView(camera);

const gui = createGui({
  viewChanged: () => scheduler.invalidate(),
  terrainChanged() {
    camera.clampToGround();
    scheduler.invalidate();
  },
  newSeed() {
    params.seed = Math.floor(Math.random() * 1e6);
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    camera.placeAboveGround(ARRIVAL_ALTITUDE);
    scheduler.invalidate();
  },
  teleport() {
    camera.x = (Math.random() * 2 - 1) * TELEPORT_RANGE;
    camera.z = (Math.random() * 2 - 1) * TELEPORT_RANGE;
    camera.placeAboveGround(ARRIVAL_ALTITUDE);
    scheduler.invalidate();
  },
  exportImage: () => scheduler.requestExport(),
});

// #bench lance le banc de mesure à la place de la boucle d'animation (#bench&save enregistre la référence)
const benchmark = new URLSearchParams(window.location.hash.slice(1));
if (benchmark.has('bench')) {
  runBenchmark(renderer, camera, hud, benchmark.has('save'));
} else {
  requestAnimationFrame(frame);
}

let last = performance.now();
function frame(now: number) {
  // Pas de temps réel : le déplacement ne dépend pas de la cadence (plafonné pour les retours d'arrière-plan)
  const dt = Math.min(0.5, (now - last) / 1000);
  last = now;
  if (camera.update(dt)) scheduler.invalidate();
  scheduler.frame(now);
  updateHud(hud, camera, scheduler.status());
  requestAnimationFrame(frame);
}
