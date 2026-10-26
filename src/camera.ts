import { params } from './params';
import { fieldOrigins, octaveOrigins, rockOrigins, type Origins } from './terrain/origins';
import type { ProbeResult, Renderer } from './render/renderer';

/** Tout ce dont le shader a besoin pour dessiner la vue courante. */
export interface View extends Origins {
  camY: number;
  /** Repère de la caméra (droite, haut, avant), en colonnes. */
  rotation: Float32Array;
  /** Distance focale pour un écran de hauteur 2 (1 / tan(fov / 2)). */
  focal: number;
  /** Part visible du soleil depuis la caméra (0 à 1), qui règle l'éblouissement. */
  sunVisible: number;
  /**
   * Relief qui cache le soleil : distance (m) et profondeur (m) sous son sommet du rayon de la caméra vers le
   * soleil, [0, 0] si rien ne le cache. L'air en deçà est dans l'ombre et ne diffuse plus le soleil vers l'œil.
   */
  sunShadow: [number, number];
}

/** Réponse d'une sonde, avec la position sondée et l'état (voir FlyCamera.key) au moment de la demande. */
interface Probed {
  key: string;
  x: number;
  z: number;
  result: ProbeResult;
}

/** Hauteur minimale au-dessus du sol (m). */
const CLEARANCE = 2;
const MAX_PITCH = 1.45;
export const MIN_SPEED = 2;
export const MAX_SPEED = 20000;
/** Réglages dont dépend la réponse d'une sonde (relief, eau, neige, soleil). */
const PROBED_PARAMS = [
  'seed', 'scale', 'height', 'gain', 'biomeScale', 'mountainCoverage', 'desertCoverage', 'water', 'snow',
  'sunElevation', 'sunAzimuth',
] as const;

/**
 * Caméra de vol libre : glisser pour regarder, ZQSD / WASD et flèches pour avancer, R / Espace et F pour monter
 * et descendre, Maj pour accélérer, molette pour régler la vitesse.
 */
export class FlyCamera {
  x = 0;
  y = 0;
  z = 0;
  yaw = 0.6;
  pitch = -0.08;
  private readonly keys = new Set<string>();
  private looked = false;
  /** Hauteur voulue au-dessus du sol (placeAboveGround), en attendant que la sonde donne l'altitude du sol. */
  private pendingAltitude: number | null = null;
  /** Dernière réponse des sondes appliquée, et la suivante, arrivée entre deux images. */
  private probed: Probed | null = null;
  private arrived: Probed | null = null;
  private probing = false;
  /** Délai de réponse des sondes (s), moyenné. */
  private latency = 0.05;
  /** Déplacement horizontal (m/s) lors de la dernière image. */
  private velocity: [number, number] = [0, 0];

  constructor(element: HTMLElement, private readonly renderer: Renderer) {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    element.addEventListener('pointerdown', (e) => element.setPointerCapture(e.pointerId));
    element.addEventListener('pointermove', (e) => {
      if (!element.hasPointerCapture(e.pointerId)) return;
      const sensitivity = ((params.fov * Math.PI) / 180) / window.innerHeight;
      this.yaw -= e.movementX * sensitivity;
      this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + e.movementY * sensitivity));
      this.looked = true;
    });
    element.addEventListener('wheel', (e) => {
      e.preventDefault();
      params.speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, params.speed * Math.exp(-e.deltaY * 0.001)));
    }, { passive: false });
  }

  /** Place la caméra à cette hauteur au-dessus du sol (ou de l'eau) dès que la sonde aura répondu, voir ready(). */
  placeAboveGround(altitude: number) {
    this.pendingAltitude = altitude;
  }

  /** La caméra est placée : on peut dessiner. */
  ready(): boolean {
    return this.pendingAltitude === null && this.probed !== null;
  }

  /** La dernière sonde répond pour la position et les réglages actuels : la vue est exacte (soleil compris). */
  settled(): boolean {
    return this.ready() && this.probed!.key === this.key();
  }

  /** Attend que la vue soit exacte, sans boucle d'animation (banc de mesure, captures). */
  async settle() {
    while (!this.settled()) {
      this.sync();
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
  }

  /** Hauteur (m) au-dessus du sol ou de l'eau, d'après la dernière sonde. */
  altitude(): number {
    if (this.pendingAltitude !== null) return this.pendingAltitude;
    return this.probed ? this.y - Math.max(this.probed.result.ground, params.water) : 0;
  }

  /** Niveau de relief, poids du désert et poids des falaises sous la caméra, null avant la première sonde. */
  climate(): [number, number, number] | null {
    return this.probed?.result.climate ?? null;
  }

  /**
   * Applique la sonde arrivée depuis l'image précédente et en lance une nouvelle si l'état a changé depuis la
   * dernière. À appeler à chaque image ; renvoie true si la caméra a bougé (placement ou sol).
   */
  sync(): boolean {
    const arrived = this.arrived;
    this.arrived = null;
    const moved = arrived ? this.apply(arrived) : false;
    if (!this.probing && this.probed?.key !== this.key()) this.probe();
    return moved;
  }

  /** Vitesse courante (m/s), Maj comprise. */
  speed(): number {
    const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 5 : 1;
    return params.speed * boost;
  }

  /** Applique les touches enfoncées pendant dt secondes ; renvoie true si la vue a changé. */
  update(dt: number): boolean {
    const axis = (plus: string[], minus: string[]) =>
      Number(plus.some((k) => this.keys.has(k))) - Number(minus.some((k) => this.keys.has(k)));
    const forward = axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']);
    const strafe = axis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']);
    const lift = axis(['KeyR', 'Space'], ['KeyF']);

    const looked = this.looked;
    this.looked = false;
    this.velocity = [0, 0];
    if (!forward && !strafe && !lift) return looked;

    const [fx, fy, fz] = this.forward();
    const [rx, , rz] = right(fx, fz);
    const speed = this.speed();
    this.velocity = [(fx * forward + rx * strafe) * speed, (fz * forward + rz * strafe) * speed];
    this.x += this.velocity[0] * dt;
    this.y += (fy * forward + lift) * speed * dt;
    this.z += this.velocity[1] * dt;
    this.clampToGround();
    return true;
  }

  view(): View {
    const f = this.forward();
    const r = right(f[0], f[2]);
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    return {
      camY: this.y,
      rotation: new Float32Array([...r, ...u, ...f]),
      focal: 1 / Math.tan((params.fov * Math.PI) / 360),
      octaves: octaveOrigins(this.x, this.z),
      fields: fieldOrigins(this.x, this.z),
      rock: rockOrigins(this.x, this.z),
      sunVisible: this.probed?.result.sunVisible ?? 1,
      sunShadow: this.probed?.result.sunShadow ?? [0, 0],
    };
  }

  /** État dont dépend la réponse d'une sonde : position, placement en attente et réglages. */
  private key(): string {
    return [this.x, this.y, this.z, this.pendingAltitude, ...PROBED_PARAMS.map((name) => params[name])].join();
  }

  /**
   * Sonde le GPU à la position actuelle. Le trajet prévu d'ici la réponse suivante (deux délais de réponse) est
   * sondé aussi : la collision reste sûre pendant que la réponse voyage.
   */
  private probe() {
    const key = this.key();
    const { x, z, pendingAltitude } = this;
    const lead = Math.max(0.05, 2 * this.latency);
    const sent = performance.now();
    this.probing = true;
    this.renderer.probe([{
      x,
      z,
      y: pendingAltitude ?? this.y,
      relative: pendingAltitude !== null,
      ahead: [this.velocity[0] * lead, this.velocity[1] * lead],
    }]).then(([result]) => {
      this.probing = false;
      this.latency += 0.2 * ((performance.now() - sent) / 1000 - this.latency);
      this.arrived = { key, x, z, result };
    });
  }

  private apply(probed: Probed): boolean {
    const y = this.y;
    if (this.pendingAltitude !== null) {
      // La caméra a été déplacée ou un réglage a changé entre-temps : la sonde suivante la placera
      if (probed.key !== this.key()) return false;
      this.y = Math.max(probed.result.ground, params.water) + this.pendingAltitude;
      this.pendingAltitude = null;
      // La sonde a calculé le soleil à cette hauteur-là : elle vaut pour la nouvelle position
      this.probed = { ...probed, key: this.key() };
      return true;
    }
    this.probed = probed;
    this.clampToGround();
    return this.y !== y;
  }

  /**
   * Garde la caméra au-dessus du sol connu. Au point sondé, c'est l'altitude du sol ; ailleurs, la caméra a avancé
   * depuis la demande : c'est le sol le plus haut de son trajet prévu.
   */
  private clampToGround() {
    if (this.pendingAltitude !== null || !this.probed) return;
    const { x, z, result } = this.probed;
    const ground = x === this.x && z === this.z ? result.ground : result.groundAhead;
    this.y = Math.max(this.y, Math.max(ground, params.water) + CLEARANCE);
  }

  private forward(): [number, number, number] {
    const cp = Math.cos(this.pitch);
    return [Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp];
  }
}

function right(fx: number, fz: number): [number, number, number] {
  const length = Math.hypot(fx, fz);
  return [-fz / length, 0, fx / length];
}
