import { params } from './params';
import type { FlyCamera } from './camera';

// La vue courante s'écrit dans l'URL (#x=…&z=…&alt=…&yaw=…&pitch=…&seed=…) : on peut la partager, la recharger,
// et elle apparaît dans le HUD, donc sur les captures d'écran.

/** Bras de mer entre falaises et île montagneuse, avec la graine par défaut. */
const DEFAULT_START = { x: -277644, z: 133728, alt: 300, yaw: 3.6, pitch: -0.08 };

/** Place la caméra (et la graine) d'après l'URL, ou au point de départ par défaut. */
export function applyStartView(camera: FlyCamera) {
  const start = new URLSearchParams(window.location.hash.slice(1));
  const value = (key: keyof typeof DEFAULT_START) => (start.has(key) ? Number(start.get(key)) : DEFAULT_START[key]);
  if (start.has('seed')) params.seed = Number(start.get('seed'));
  camera.x = value('x');
  camera.z = value('z');
  camera.yaw = value('yaw');
  camera.pitch = value('pitch');
  camera.placeAboveGround(value('alt'));
}

/** Vue courante au format de l'URL ; alt est la hauteur au-dessus du sol. */
export function viewHash(camera: FlyCamera): string {
  const yaw = ((camera.yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return `#x=${Math.round(camera.x)}&z=${Math.round(camera.z)}&alt=${Math.round(camera.y - camera.ground())}`
    + `&yaw=${yaw.toFixed(3)}&pitch=${camera.pitch.toFixed(3)}&seed=${params.seed}`;
}
