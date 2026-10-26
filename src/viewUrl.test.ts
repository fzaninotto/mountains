import { afterEach, describe, expect, it, vi } from 'vitest';
import { params } from './params';
import { applyStartView, viewHash } from './viewUrl';

afterEach(() => {
  vi.unstubAllGlobals();
  params.seed = 1;
});

describe('vue dans l’URL', () => {
  it('écrit la position, la hauteur au-dessus du sol et l’orientation', () => {
    const camera = { x: 1234.6, z: -99.4, yaw: -0.5, pitch: 0.1234, altitude: () => 299.7 };
    expect(viewHash(camera)).toBe(`#x=1235&z=-99&alt=300&yaw=${(2 * Math.PI - 0.5).toFixed(3)}&pitch=0.123&seed=1`);
  });

  it('relit une vue et place la caméra au-dessus du sol', () => {
    vi.stubGlobal('window', { location: { hash: '#x=10&z=-20&alt=45&yaw=1.5&pitch=-0.2&seed=7' } });
    const placed: number[] = [];
    const camera = { x: 0, z: 0, yaw: 0, pitch: 0, placeAboveGround: (alt: number) => placed.push(alt) };
    applyStartView(camera);
    expect(camera).toMatchObject({ x: 10, z: -20, yaw: 1.5, pitch: -0.2 });
    expect(placed).toEqual([45]);
    expect(params.seed).toBe(7);
  });

  it('part du point par défaut sans vue dans l’URL', () => {
    vi.stubGlobal('window', { location: { hash: '' } });
    const placed: number[] = [];
    const camera = { x: 0, z: 0, yaw: 0, pitch: 0, placeAboveGround: (alt: number) => placed.push(alt) };
    applyStartView(camera);
    expect(camera.x).toBe(-277644);
    expect(placed).toEqual([300]);
  });
});
