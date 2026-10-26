import { params } from './params';
import { fieldOrigins, gridOrigin, MATERIAL_SCALE, octaveOrigins, terrainHeight, type NoiseOrigin } from './noise';

export interface View {
  camY: number;
  rotation: Float32Array;
  focal: number;
  octaves: NoiseOrigin;
  material: NoiseOrigin;
  fields: NoiseOrigin;
}

const CLEARANCE = 2;
const MAX_PITCH = 1.45;

export class FlyCamera {
  x = 0;
  y = 0;
  z = 0;
  yaw = 0.6;
  pitch = -0.08;
  private readonly keys = new Set<string>();
  private looked = false;

  constructor(element: HTMLElement) {
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
      params.speed = Math.max(0.02, Math.min(20, params.speed * Math.exp(-e.deltaY * 0.001)));
    }, { passive: false });
  }

  ground(): number {
    return Math.max(terrainHeight(this.x, this.z), params.water);
  }

  placeAboveGround(altitude: number) {
    this.y = this.ground() + altitude;
  }

  clampToGround() {
    this.y = Math.max(this.y, this.ground() + CLEARANCE);
  }

  speed(): number {
    const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 5 : 1;
    return params.speed * Math.max(20, this.y - this.ground()) * boost;
  }

  // Renvoie true si la vue a changé
  update(dt: number): boolean {
    const axis = (plus: string[], minus: string[]) =>
      Number(plus.some((k) => this.keys.has(k))) - Number(minus.some((k) => this.keys.has(k)));
    const forward = axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']);
    const strafe = axis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']);
    const lift = axis(['KeyR', 'Space'], ['KeyF']);

    const looked = this.looked;
    this.looked = false;
    if (!forward && !strafe && !lift) return looked;

    const [fx, fy, fz] = this.forward();
    const [rx, , rz] = right(fx, fz);
    const step = this.speed() * dt;
    this.x += (fx * forward + rx * strafe) * step;
    this.y += (fy * forward + lift) * step;
    this.z += (fz * forward + rz * strafe) * step;
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
      material: gridOrigin(this.x, this.z, MATERIAL_SCALE),
      fields: fieldOrigins(this.x, this.z),
    };
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
