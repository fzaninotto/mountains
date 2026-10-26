import GUI from 'lil-gui';
import { params } from './params';

interface Actions {
  viewChanged(): void;
  terrainChanged(): void;
  newSeed(): void;
  teleport(): void;
  exportImage(): void;
}

export function createGui(actions: Actions): GUI {
  const gui = new GUI({ title: 'Montagnes' });
  const { viewChanged, terrainChanged } = actions;

  gui.add(actions, 'newSeed').name('🎲 Nouvelle graine');
  gui.add(actions, 'teleport').name('🧭 Aller ailleurs');
  gui.add(params, 'seed', 0, 999999, 1).name('Graine').onChange(terrainChanged);

  const relief = gui.addFolder('Relief');
  relief.add(params, 'scale', 1000, 20000, 100).name('Échelle (m)').onChange(terrainChanged);
  relief.add(params, 'height', 300, 5000, 10).name('Amplitude haute montagne (m)').onChange(terrainChanged);
  relief.add(params, 'gain', 0.3, 0.65, 0.01).name('Rugosité haute montagne').onChange(terrainChanged);
  relief.add(params, 'detail', 0.5, 4, 0.1).name('Plus petit détail (px)').onChange(viewChanged);
  relief.add(params, 'step', 0.2, 0.9, 0.01).name('Pas du raymarching').onChange(viewChanged);

  const biome = gui.addFolder('Biomes');
  biome.add(params, 'biomeScale', 20000, 400000, 5000).name('Taille des biomes (m)').onChange(terrainChanged);
  biome.add(params, 'mountainCoverage', 0, 1, 0.01).name('Part de montagne').onChange(terrainChanged);
  biome.add(params, 'desertCoverage', 0, 1, 0.01).name('Part de désert').onChange(terrainChanged);

  const look = gui.addFolder('Rendu');
  look.add(params, 'water', -3000, 2000, 10).name('Niveau de l’eau (m)').onChange(terrainChanged);
  look.add(params, 'vegetation', -1000, 3000, 10).name('Limite de végétation (m)').onChange(viewChanged);
  look.add(params, 'snow', -500, 4000, 10).name('Limite des neiges (m)').onChange(terrainChanged);
  look.add(params, 'sunElevation', -5, 90, 0.5).name('Hauteur du soleil').onChange(viewChanged);
  look.add(params, 'sunAzimuth', 0, 360, 1).name('Azimut du soleil').onChange(viewChanged);
  look.add(params, 'fog', 0, 4, 0.05).name('Brume').onChange(viewChanged);
  look.add(params, 'exposure', 0.3, 3, 0.05).name('Exposition').onChange(viewChanged);
  look.add(params, 'fov', 20, 100, 1).name('Champ de vision').onChange(viewChanged);

  const quality = gui.addFolder('Navigation et qualité');
  quality.add(params, 'speed', 0.02, 20, 0.01).name('Vitesse').listen();
  quality.add(params, 'movingScale', 0.05, 1, 0.05).name('Résolution en mouvement').onChange(viewChanged);
  quality.add(params, 'pixelRatio', 0.5, 3, 0.25).name('Densité de pixels').onChange(viewChanged);

  const exp = gui.addFolder('Export');
  exp.add(params, 'exportScale', [1, 2, 3, 4]).name('Facteur de taille');
  exp.add(actions, 'exportImage').name('📷 Exporter en PNG');

  return gui;
}
