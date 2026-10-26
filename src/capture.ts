import { params, type Params } from './params';
import type { FlyCamera } from './camera';
import { SMOOTHING_PASSES, subpixelJitter, type Renderer } from './render/renderer';

// Mode #capture (développement seulement, voir vite.config.ts) : rend en pleine qualité chaque vue de
// captures/views.json, lissée comme l'image nette (moyenne de SMOOTHING_PASSES rendus décalés d'une fraction de
// pixel), et enregistre les images dans captures/. Sert aux analyses visuelles automatisées.

const WIDTH = 1280;
const HEIGHT = 800;
/** Lignes calculées par appel, pour ne pas monopoliser le GPU trop longtemps d'un coup. */
const ROWS_PER_PASS = 100;

interface CaptureView {
  name: string;
  x: number;
  z: number;
  /** Hauteur au-dessus du sol (m). */
  alt: number;
  yaw: number;
  pitch: number;
  /** Réglages à modifier pour cette vue (soleil, brume…), rétablis ensuite. */
  params?: Partial<Params>;
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Pixels lus en WebGL (lignes de bas en haut) → PNG. */
async function toPng(pixels: Uint8Array): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(WIDTH, HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    image.data.set(pixels.subarray((HEIGHT - 1 - y) * WIDTH * 4, (HEIGHT - y) * WIDTH * 4), y * WIDTH * 4);
  }
  context.putImageData(image, 0, 0);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'));
}

export async function runCapture(renderer: Renderer, camera: FlyCamera, output: HTMLElement) {
  const views: CaptureView[] = await (await fetch('/__capture/views')).json();
  const target = renderer.ensureTarget(null, WIDTH, HEIGHT);
  const pass = renderer.ensureTarget(null, WIDTH, HEIGHT);
  const defaults = { ...params };
  const saved: string[] = [];

  for (const [index, view] of views.entries()) {
    output.textContent = `Capture ${index + 1}/${views.length} : ${view.name}…`;
    Object.assign(params, defaults, view.params ?? {});
    camera.x = view.x;
    camera.z = view.z;
    camera.yaw = view.yaw;
    camera.pitch = view.pitch;
    camera.placeAboveGround(view.alt);
    await camera.settle();
    const cameraView = camera.view();
    for (let k = 0; k < SMOOTHING_PASSES; k++) {
      const destination = k === 0 ? target : pass;
      for (let row = 0; row < HEIGHT; row += ROWS_PER_PASS) {
        const end = Math.min(HEIGHT, row + ROWS_PER_PASS);
        renderer.renderRows(destination, cameraView, row, end, WIDTH, HEIGHT, false, HEIGHT, subpixelJitter(k));
        renderer.finish(destination);
        await nextFrame();
      }
      if (k > 0) renderer.copy(pass, target, WIDTH, HEIGHT, 1 / (k + 1));
    }
    const response = await fetch(`/__capture/image?name=${view.name}`, {
      method: 'POST',
      body: await toPng(renderer.readPixels(target)),
    });
    if (response.ok) saved.push(view.name);
  }

  Object.assign(params, defaults);
  (window as unknown as { __capture: unknown }).__capture = { saved, total: views.length };
  output.textContent = `Capture terminée : ${saved.length}/${views.length} images dans captures/`;
}
