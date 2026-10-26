import { params } from './params';
import type { FlyCamera, View } from './camera';
import type { Renderer, Target } from './render/renderer';

// Ordonnancement des images. Le raymarching est trop coûteux pour calculer une image nette à chaque frame :
// - en mouvement, on affiche un aperçu basse résolution, dont l'échelle s'adapte pour tenir params.targetFps ;
// - à l'arrêt, l'image nette est calculée par bandes, sur plusieurs frames, pour que l'interface reste fluide ;
// - l'export calcule de même une image plus grande, puis la télécharge.

/** Délai après le dernier mouvement avant de commencer l'image nette (ms). */
const REFINE_DELAY = 150;
const MIN_MOVING_SCALE = 0.05;
const MOVING_SCALE_STEP = 0.01;
/** Nombre d'intervalles dont la médiane pilote la résolution de l'aperçu. */
const INTERVAL_WINDOW = 5;

/** Image calculée par bandes, de bas en haut. */
interface Job {
  target: Target;
  view: View;
  row: number;
}

export class FrameScheduler {
  private preview: Target | null = null;
  private previewWidth = 1;
  private previewHeight = 1;
  private sharp: Target | null = null;
  private exportTarget: Target | null = null;
  private refineJob: Job | null = null;
  private exportJob: Job | null = null;
  private dirty = true;
  private sharpDone = false;
  private changedAt = 0;
  /** Pixels calculés par frame pour l'image nette et l'export, ajustés pour garder l'interface fluide. */
  private pixelBudget = 250_000;
  /** Résolution de l'aperçu, ajustée en continu pour tenir params.targetFps. */
  private movingScale = params.movingScale;
  private frameIndex = 0;
  private lastPreviewFrame = -1;
  private lastPreviewAt = 0;
  /** Instants des aperçus affichés pendant la dernière seconde : la cadence réellement perçue. */
  private readonly previewTimes: number[] = [];
  /** Derniers intervalles entre aperçus consécutifs (s). */
  private readonly previewIntervals: number[] = [];

  constructor(
    private readonly renderer: Renderer,
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: FlyCamera,
    /** Appelé quand l'image nette est terminée. */
    private readonly onSharp: () => void,
  ) {}

  /** La vue ou un réglage a changé : il faut un nouvel aperçu, puis une nouvelle image nette. */
  invalidate() {
    this.dirty = true;
    this.sharpDone = false;
    this.refineJob = null;
    this.changedAt = performance.now();
  }

  /** Lance l'export d'une image params.exportScale fois plus grande que l'écran (dans la limite du GPU). */
  requestExport() {
    const { canvas } = this;
    const factor = Math.min(params.exportScale, this.renderer.maxSize / Math.max(canvas.width, canvas.height));
    this.exportTarget = this.renderer.ensureTarget(
      this.exportTarget,
      Math.floor(canvas.width * factor),
      Math.floor(canvas.height * factor),
    );
    this.exportJob = { target: this.exportTarget, view: this.camera.view(), row: 0 };
  }

  /** État affiché dans le HUD. */
  status(): string {
    const progress = (job: Job) => Math.round((100 * job.row) / job.target.height);
    if (this.exportJob) return `Export ${progress(this.exportJob)} %`;
    if (this.refineJob) return `Affinage ${progress(this.refineJob)} %`;
    return this.sharpDone ? 'Net' : `Aperçu ${Math.round(this.movingScale * 100)} % · ${this.previewFps()} img/s`;
  }

  /** Dessine ce qui doit l'être pour cette frame ; dt : durée écoulée depuis la précédente (s). */
  frame(now: number, dt: number) {
    this.frameIndex++;
    if (this.refineJob || this.exportJob) this.adaptPixelBudget(dt);
    this.resize();

    if (this.exportJob) {
      if (this.advance(this.exportJob)) {
        const target = this.exportJob.target;
        this.exportJob = null;
        this.saveExport(target);
      }
    } else if (this.dirty) {
      this.drawPreview(now);
    } else if (!this.sharpDone && this.preview) {
      this.refine(now);
    }
  }

  private resize() {
    const width = Math.round(window.innerWidth * params.pixelRatio);
    const height = Math.round(window.innerHeight * params.pixelRatio);
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.invalidate();
  }

  private drawPreview(now: number) {
    const { canvas, renderer } = this;
    // Cible allouée une fois à la résolution maximale : l'aperçu n'en utilise qu'un coin, sans réallocation
    // à chaque ajustement de l'échelle
    this.preview = renderer.ensureTarget(
      this.preview,
      Math.max(1, Math.round(canvas.width * params.movingScale)),
      Math.max(1, Math.round(canvas.height * params.movingScale)),
    );
    this.movingScale = Math.min(this.movingScale, params.movingScale);
    this.previewWidth = Math.max(1, Math.min(this.preview.width, Math.round(canvas.width * this.movingScale)));
    this.previewHeight = Math.max(1, Math.min(this.preview.height, Math.round(canvas.height * this.movingScale)));
    renderer.renderRows(
      this.preview,
      this.camera.view(),
      0,
      this.previewHeight,
      this.previewWidth,
      this.previewHeight,
      true,
    );
    renderer.copy(this.preview, null, this.previewWidth, this.previewHeight);
    this.dirty = false;
    this.recordPreview(now);
  }

  private refine(now: number) {
    const { renderer } = this;
    if (!this.refineJob && now - this.changedAt > REFINE_DELAY) {
      // L'image nette part de l'aperçu agrandi : les bandes pas encore calculées restent lisibles
      this.sharp = renderer.ensureTarget(this.sharp, this.canvas.width, this.canvas.height);
      renderer.copy(this.preview!, this.sharp, this.previewWidth, this.previewHeight);
      this.refineJob = { target: this.sharp, view: this.camera.view(), row: 0 };
    }
    if (!this.refineJob) return;
    this.sharpDone = this.advance(this.refineJob);
    renderer.copy(this.refineJob.target, null);
    if (this.sharpDone) {
      this.refineJob = null;
      this.onSharp();
    }
  }

  /** Calcule la bande suivante ; renvoie true quand l'image est complète. */
  private advance(job: Job): boolean {
    const rows = Math.max(1, Math.floor(this.pixelBudget / job.target.width));
    const end = Math.min(job.target.height, job.row + rows);
    this.renderer.renderRows(job.target, job.view, job.row, end);
    job.row = end;
    return end >= job.target.height;
  }

  private adaptPixelBudget(dt: number) {
    if (dt > 0.045) this.pixelBudget = Math.max(20_000, this.pixelBudget * 0.7);
    else if (dt < 0.025) this.pixelBudget = Math.min(4_000_000, this.pixelBudget * 1.15);
  }

  private recordPreview(now: number) {
    // La durée n'est mesurée qu'entre deux aperçus consécutifs : le GPU travaille en différé, et seul un
    // enchaînement d'aperçus fait sentir sa charge sur la cadence des images
    if (this.lastPreviewFrame === this.frameIndex - 1) {
      // Médiane des derniers intervalles : une image ponctuellement lente ne doit pas effondrer la résolution
      this.previewIntervals.push((now - this.lastPreviewAt) / 1000);
      if (this.previewIntervals.length > INTERVAL_WINDOW) this.previewIntervals.shift();
      const sorted = [...this.previewIntervals].sort((a, b) => a - b);
      this.adaptMovingScale(sorted[sorted.length >> 1]);
    }
    this.lastPreviewFrame = this.frameIndex;
    this.lastPreviewAt = now;
    this.previewTimes.push(now);
    while (now - this.previewTimes[0] > 1000) this.previewTimes.shift();
  }

  // Le coût d'un aperçu est proportionnel à son nombre de pixels, donc au carré de l'échelle : on corrige
  // l'échelle par la racine du rapport entre durée visée et durée mesurée, avec une zone morte contre les oscillations
  private adaptMovingScale(interval: number) {
    const target = 1 / params.targetFps;
    if (interval < target * 1.15 && interval > target * 0.8) return;
    const factor = Math.min(1.1, Math.max(0.7, Math.sqrt(target / interval)));
    const next = Math.round((this.movingScale * factor) / MOVING_SCALE_STEP) * MOVING_SCALE_STEP;
    this.movingScale = Math.min(params.movingScale, Math.max(MIN_MOVING_SCALE, next));
  }

  private previewFps(): number {
    const times = this.previewTimes;
    if (times.length < 2) return 0;
    return Math.round(((times.length - 1) * 1000) / (times[times.length - 1] - times[0]));
  }

  private saveExport(target: Target) {
    const { canvas, camera } = this;
    // Le canvas est agrandi le temps de copier l'image et de l'encoder en PNG
    const { width, height } = canvas;
    canvas.width = target.width;
    canvas.height = target.height;
    this.renderer.copy(target, null);
    const link = document.createElement('a');
    link.download = `montagne-${params.seed}-${Math.round(camera.x)}-${Math.round(camera.z)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    canvas.width = width;
    canvas.height = height;
    this.invalidate();
  }
}
