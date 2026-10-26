import type { FlyCamera } from './camera';
import { climate } from './terrain/climate';
import { viewHash } from './viewUrl';

/** Nom du biome d'après le niveau de relief (voir BIOME_STOPS) et le poids du désert. */
function biomeName(level: number, desert: number): string {
  const arid = desert > 0.5;
  if (level < 0.12) return 'Mer';
  if (level < 0.25) return arid ? 'Côte désertique' : 'Plage';
  if (level < 0.375) return arid ? 'Désert' : 'Plaine';
  if (level < 0.565) return arid ? 'Collines arides' : 'Collines';
  if (level < 0.84) return arid ? 'Moyenne montagne aride' : 'Moyenne montagne';
  return arid ? 'Haute montagne aride' : 'Haute montagne';
}

/** Première ligne : biome, altitude, vitesse et état du rendu ; seconde ligne : la vue au format de l'URL. */
export function updateHud(element: HTMLElement, camera: FlyCamera, status: string) {
  const [level, desert] = climate(camera.x, camera.z);
  element.textContent = [
    biomeName(level, desert),
    `Altitude ${Math.round(camera.y)} m`,
    `${Math.round(camera.speed())} m/s`,
    status,
  ].join(' · ') + '\n' + viewHash(camera);
}
