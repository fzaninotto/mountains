import { params } from './params';
import type { FlyCamera, View } from './camera';
import { SMOOTHING_PASSES, subpixelJitter, type Renderer, type Target } from './render/renderer';

// Ordonnancement des images. Le raymarching est trop coûteux pour calculer une image nette à chaque frame :
// - en mouvement, on affiche un aperçu basse résolution, dont l'échelle s'adapte pour tenir params.targetFps ;
// - à l'arrêt, l'image s'affine par niveaux de résolution, chacun deux fois plus fin que le précédent. Un niveau
//   est calculé en coulisse, par bandes réparties sur plusieurs frames pour que l'interface reste fluide, et ne
//   s'affiche qu'une fois complet : les pixels s'affinent sur toute l'image, sans balayage ;
// - la pleine résolution atteinte, SMOOTHING_PASSES - 1 rendus décalés d'une fraction de pixel sont calculés de
//   même et moyennés avec l'image affichée : c'est l'antialiasing ;
// - l'export calcule de même une image plus grande, lissée elle aussi, puis la télécharge.

/** Délai après le dernier mouvement avant de commencer l'image nette (ms). */
const REFINE_DELAY = 150;
const MIN_MOVING_SCALE = 0.05;
const MOVING_SCALE_STEP = 0.01;
/** Nombre d'intervalles dont la médiane pilote la résolution de l'aperçu. */
const INTERVAL_WINDOW = 5;
/** Échelle à partir de laquelle l'affinage passe directement à la pleine résolution. */
const FULL_LEVEL = 0.6;
/** Au-delà de cet écart entre deux aperçus (ms), le mouvement s'était interrompu. */
const MOTION_GAP = 250;

/** Image calculée par bandes dans le coin width × height de target, à l'échelle scale de l'écran. */
interface Job {
  target: Target;
  view: View;
  row: number;
  width: number;
  height: number;
  scale: number;
  /** Hauteur d'image (px) qui fixe le niveau de détail, voir Renderer.renderRows. */
  lodHeight: number;
  /** Rang du rendu parmi les passes de lissage, 0 pour le premier, sans décalage. */
  pass: number;
}

/** Image affichée à l'écran : coin width × height de target, à l'échelle scale. */
interface Shown {
  target: Target;
  width: number;
  height: number;
  scale: number;
}

export class FrameScheduler {
  private preview: Target | null = null;
  /** Double tampon de l'affinage : un niveau se calcule dans l'un pendant que l'autre reste affiché. */
  private readonly levels: [Target | null, Target | null] = [null, null];
  private shown: Shown | null = null;
  private exportTarget: Target | null = null;
  /** Passe de lissage de l'export en cours de calcul, avant d'être moyennée dans exportTarget. */
  private exportPass: Target | null = null;
  private refineJob: Job | null = null;
  private exportJob: Job | null = null;
  private dirty = true;
  private sharpDone = false;
  private changedAt = 0;
  /** Pixels calculés par frame pour l'image nette et l'export, ajustés pour garder l'interface fluide. */
  private pixelBudget = 250_000;
  /** Résolution de l'aperçu, ajustée en continu pour tenir params.targetFps. */
  private movingScale = params.movingScale;
  private lastPreviewAt = -Infinity;
  /** Le dernier travail soumis était une bande d'image nette ou d'export. */
  private jobSubmitted = false;
  /** Le dernier travail soumis était un aperçu. */
  private previewSubmitted = false;
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
    const { width, height } = this.exportTarget;
    const view = this.camera.view();
    this.exportJob = {
      target: this.exportTarget, view, row: 0, width, height, scale: factor, lodHeight: height, pass: 0,
    };
  }

  /** État affiché dans le HUD. */
  status(): string {
    const exportJob = this.exportJob;
    if (exportJob) {
      const done = (exportJob.pass * exportJob.height + exportJob.row) / (SMOOTHING_PASSES * exportJob.height);
      return `Export ${Math.round(100 * done)} %`;
    }
    const job = this.refineJob;
    if (job?.pass) return `Lissage ${job.pass + 1}/${SMOOTHING_PASSES}`;
    if (job) return `Affinage ${Math.round(job.scale * 100)} %`;
    return this.sharpDone ? 'Net' : `Aperçu ${Math.round(this.movingScale * 100)} % · ${this.previewFps()} img/s`;
  }

  /** Dessine ce qui doit l'être pour cette frame, si le GPU est disponible. */
  frame(now: number) {
    // Rien n'est soumis tant que le GPU n'a pas fini le rendu précédent : sinon le navigateur empile des images
    // d'avance puis bloque d'un coup, et le mouvement devient saccadé. La caméra, elle, avance à chaque frame,
    // et chaque rendu montre sa position au moment où il est lancé. Rien non plus tant que la caméra
    // attend la sonde qui la place au-dessus du sol
    if (!this.camera.ready() || !this.renderer.gpuIdle()) return;
    if (this.jobSubmitted) this.adaptPixelBudget(this.renderer.lastGpuTime);
    // Un aperçu plus long que MOTION_GAP ne compte pas comme intervalle de mouvement : sa durée seule doit alors
    // baisser la résolution, sinon elle resterait bloquée
    if (this.previewSubmitted && this.renderer.lastGpuTime > MOTION_GAP) {
      this.adaptMovingScale(this.renderer.lastGpuTime / 1000);
    }
    this.jobSubmitted = false;
    this.previewSubmitted = false;
    this.resize();

    if (this.exportJob) {
      if (this.advance(this.exportJob)) {
        const { width, height } = this.exportJob;
        this.exportPass = this.renderer.ensureTarget(this.exportPass, width, height);
        this.exportJob = this.nextPass(this.exportJob, this.exportTarget!, this.exportPass);
        if (!this.exportJob) this.saveExport(this.exportTarget!);
      }
    } else if (this.dirty) {
      this.drawPreview(now);
    } else if (!this.sharpDone && this.shown) {
      this.refine(now);
    } else {
      return;
    }
    this.renderer.markSubmitted();
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
    const width = Math.max(1, Math.min(this.preview.width, Math.round(canvas.width * this.movingScale)));
    const height = Math.max(1, Math.min(this.preview.height, Math.round(canvas.height * this.movingScale)));
    // Niveau de détail et précision fixés sur la résolution maximale de l'aperçu, et non sur sa résolution du moment :
    // sinon le relief (rivages, reflets…) changerait de forme à chaque ajustement. Plus grossiers que ceux de l'image
    // nette, ils gardent l'aperçu léger, au prix d'un léger changement de forme à l'arrêt
    const lodHeight = canvas.height * params.movingScale;
    renderer.renderRows(this.preview, this.camera.view(), 0, height, width, height, true, lodHeight);
    this.show({ target: this.preview, width, height, scale: this.movingScale });
    this.dirty = false;
    this.previewSubmitted = true;
    this.recordPreview(now);
  }

  private refine(now: number) {
    if (!this.refineJob) {
      // L'image nette attend aussi la sonde de la position finale (soleil caché ou non)
      if (now - this.changedAt <= REFINE_DELAY || !this.camera.settled()) return;
      this.startLevel(this.camera.view());
    }
    const job = this.refineJob!;
    if (!this.advance(job)) return;
    if (job.scale < 1) {
      this.show(job);
      this.startLevel(job.view);
      return;
    }
    if (job.pass === 0) {
      this.show(job);
      this.onSharp();
    }
    const shown = this.shown!;
    this.refineJob = this.nextPass(job, shown.target, this.spareLevel());
    if (job.pass > 0) this.show(shown);
    if (!this.refineJob) this.sharpDone = true;
  }

  /** Mélange une passe de lissage terminée à l'image accumulée ; renvoie la passe suivante, null après la dernière. */
  private nextPass(job: Job, image: Target, spare: Target): Job | null {
    if (job.pass > 0) this.renderer.copy(job.target, image, job.width, job.height, 1 / (job.pass + 1));
    if (job.pass + 1 >= SMOOTHING_PASSES) return null;
    return { ...job, target: spare, row: 0, pass: job.pass + 1 };
  }

  /** Prépare le niveau suivant, deux fois plus fin que l'image affichée, dans le tampon qui n'est pas à l'écran. */
  private startLevel(view: View) {
    const { canvas } = this;
    // Au-delà de FULL_LEVEL, un niveau intermédiaire coûterait presque autant que l'image nette : on y va directement
    const doubled = this.shown!.scale * 2;
    const scale = doubled >= FULL_LEVEL ? 1 : doubled;
    const width = Math.max(1, Math.round(canvas.width * scale));
    const height = Math.max(1, Math.round(canvas.height * scale));
    // Les niveaux d'affinage gardent le niveau de détail de l'image finale : seule la finesse de l'échantillonnage change
    const lodHeight = canvas.height;
    this.refineJob = { target: this.spareLevel(), view, row: 0, width, height, scale, lodHeight, pass: 0 };
  }

  /** Celui des deux tampons d'affinage qui n'est pas à l'écran. */
  private spareLevel(): Target {
    const { canvas, renderer } = this;
    const slot = this.levels[0] && this.shown!.target === this.levels[0] ? 1 : 0;
    this.levels[slot] = renderer.ensureTarget(this.levels[slot], canvas.width, canvas.height);
    return this.levels[slot];
  }

  /** Affiche une image, agrandie à la taille de l'écran. */
  private show(image: Shown) {
    this.renderer.copy(image.target, null, image.width, image.height);
    this.shown = { target: image.target, width: image.width, height: image.height, scale: image.scale };
  }

  /** Calcule la bande suivante ; renvoie true quand l'image est complète. */
  private advance(job: Job): boolean {
    this.jobSubmitted = true;
    const rows = Math.max(1, Math.floor(this.pixelBudget / job.width));
    const end = Math.min(job.height, job.row + rows);
    const { target, view, width, height, lodHeight, pass } = job;
    this.renderer.renderRows(target, view, job.row, end, width, height, false, lodHeight, subpixelJitter(pass));
    job.row = end;
    return end >= job.height;
  }

  // Une bande doit tenir en une trentaine de ms de GPU, pour que l'interface reste réactive
  private adaptPixelBudget(gpuTime: number) {
    if (gpuTime > 40) this.pixelBudget = Math.max(20_000, this.pixelBudget * 0.7);
    else if (gpuTime < 20) this.pixelBudget = Math.min(4_000_000, this.pixelBudget * 1.15);
  }

  private recordPreview(now: number) {
    // L'intervalle n'est mesuré que pendant un mouvement continu : c'est alors la cadence réelle des aperçus,
    // puisqu'un aperçu n'est lancé qu'une fois le précédent terminé par le GPU
    if (now - this.lastPreviewAt < MOTION_GAP) {
      // Médiane des derniers intervalles : une image ponctuellement lente ne doit pas effondrer la résolution
      this.previewIntervals.push((now - this.lastPreviewAt) / 1000);
      if (this.previewIntervals.length > INTERVAL_WINDOW) this.previewIntervals.shift();
      const sorted = [...this.previewIntervals].sort((a, b) => a - b);
      this.adaptMovingScale(sorted[sorted.length >> 1]);
    }
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
