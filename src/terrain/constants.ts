// Constantes du relief. Le renderer les injecte en tête des shaders via glslConstants() ; le CPU s'en sert pour les
// origines des bruits (origins.ts) et les réglages transmis au shader.

/** Nombre maximal d'octaves du relief (de la taille des continents au centimètre). */
export const MAX_OCTAVES = 20;

// ---------- Biomes ----------

/**
 * Position des biomes le long du « niveau de relief » (0 à 1) :
 * mer, plage, plaine, collines, moyenne montagne, haute montagne.
 */
export const BIOME_STOPS = [0, 0.2, 0.3, 0.45, 0.68, 1];

/**
 * Champs de biomes à très grande échelle : continent, aridité, chaînes de montagnes, îles.
 * Chacun est un fBm de FIELD_OCTAVES octaves tournées ; ratio : échelle relative à la taille des biomes ;
 * salt : décale le germe pour que les champs soient indépendants.
 */
export const FIELDS = [
  { ratio: 1, salt: 0 },
  { ratio: 1.37, salt: 7919 },
  { ratio: 0.55, salt: 104729 },
  { ratio: 0.12, salt: 15485863 },
] as const;
export const FIELD_OCTAVES = 3;

/** Ondulation des chaînes de montagnes par les champs continent et aridité, relative à leur échelle. */
export const RANGE_WARP = 0.35;
/**
 * Profil d'une chaîne en travers, selon la proximité de sa ligne de crête (1 - |champ des chaînes|) : la plaine monte
 * en collines et contreforts entre RANGE_FOOTHILLS[0] et [1] (jusqu'au niveau RANGE_FOOTHILL_LEVEL de la montagne),
 * puis en montagne entre RANGE_SUMMITS[0] et [1].
 */
export const RANGE_FOOTHILLS = [0.42, 0.7];
export const RANGE_FOOTHILL_LEVEL = 0.21;
export const RANGE_SUMMITS = [0.62, 0.95];

/**
 * Piémont : entre ces niveaux de relief (montée, puis descente), au pied des reliefs, les creux des grandes formes
 * (octaves de plus de PIEDMONT_WAVELENGTH m) sont comblés jusqu'à PIEDMONT_FLOOR (unités du fBm) : un glacis en pente
 * douce vers la plaine, d'où émergent les contreforts. Comblement relatif, en climat tempéré puis aride.
 */
export const PIEDMONT_LEVEL = [0.3, 0.4, 0.55, 0.72];
export const PIEDMONT_WAVELENGTH = 500;
export const PIEDMONT_FLOOR = -0.1;
export const PIEDMONT_FILL = [0.6, 1];

/** Hauteur moyenne dont les côtes à falaises sont relevées (m), variable de 0,2 à 1,2 fois selon un bruit. */
export const CLIFF_HEIGHT = 70;
/**
 * Largeur horizontale (m) de la face de la falaise, quelle que soit la pente du littoral : la marche se forme sur
 * un dénivelé du terrain d'origine de CLIFF_WIDTH × sa pente, ce qui donne une paroi quasi verticale.
 */
export const CLIFF_WIDTH = 6;
/** Pente minimale prise en compte : sur un littoral presque plat, la face s'élargit plutôt que de devenir infinie. */
export const CLIFF_MIN_SLOPE = 0.02;
/**
 * Recul horizontal (m, de 0 à cette valeur) du pied de falaise par rapport à la ligne où il est le plus bas : découpe
 * criques et caps. Horizontal, et non vertical, pour que la face reste d'un seul tenant : sur un littoral en pente
 * douce, un décalage de quelques mètres en altitude la déplacerait de centaines de mètres, en aiguilles isolées.
 */
export const CLIFF_SETBACK = 30;
/**
 * Octaves du relief dont le bruit (décalé) module la hauteur des falaises, les interrompt par des criques basses,
 * puis fait reculer leur pied.
 */
export const CLIFF_HEIGHT_OCTAVE = 2;
export const CLIFF_COVE_OCTAVE = 3;
export const CLIFF_JITTER_OCTAVES = [5, 7];

// ---------- Roche et érosion ----------

/** Pentes entre lesquelles le versant érodé laisse place à la roche à nu. */
export const STEEP_SLOPE = [0.25, 0.6];
/** Amplitude des petites octaves sur la roche à nu, relative à leur amplitude normale. */
export const ROCK_ROUGHNESS = 1.15;
/** Sur la roche, les octaves plus fines que ceci (m) deviennent des crêtes vives. */
export const RIDGE_WAVELENGTH = 120;
/**
 * Adoucissement du signe des crêtes : x / sqrt(x² + RIDGE_SIGN_SOFTNESS) plutôt que sign(x) (unités du bruit, au carré).
 * Avec un signe vif, la pente accumulée (donc l'érosion des octaves suivantes) sauterait le long de chaque arête.
 */
export const RIDGE_SIGN_SOFTNESS = 0.01;
/**
 * Haute montagne : entre ces niveaux de relief, les octaves de RIDGE_BAND[0] à RIDGE_BAND[1] m deviennent un
 * multifractal à crêtes (arêtes continues, cols, cirques), sur un domaine déplacé de RIDGE_WARP m par unité de pente
 * (dans l'espace du bruit) de la première octave, soit quelques centaines de mètres.
 */
export const ALPINE_LEVEL = [0.58, 0.68];
export const RIDGE_BAND = [700, 3000];
export const RIDGE_WARP = 150;
/**
 * Arrondi des arêtes des grandes octaves (unités du bruit, au carré), et amplitude des crêtes de RIDGE_BAND[1] m,
 * proportionnelle à la longueur d'onde pour les plus petites.
 */
export const RIDGE_CREST_SOFTNESS = 0.003;
export const RIDGE_AMPLITUDE = 0.8;
/**
 * Profondeur des vallées entre les crêtes, rapportée à |n| : le bruit de gradient reste le plus souvent près de zéro,
 * des crêtes 1 - 2|n| laisseraient des vallées peu creusées sous des sommets peu élevés.
 */
export const RIDGE_DEPTH = 2.5;
/**
 * Les octaves à crêtes s'effacent loin des arêtes de la précédente, entre ces valeurs de son 1 - |n| : cirques et
 * fonds de vallée restent lisses.
 */
export const RIDGE_WEIGHT = [0.15, 0.7];
/**
 * Les crêtes naissent entre ces altitudes (m) des grandes formes (octaves plus larges que RIDGE_BAND[1]) : en dessous,
 * versants et fonds de vallée gardent le fBm ordinaire ; au-dessus, arêtes et cirques.
 */
export const RIDGE_BASE = [600, 1500];
/**
 * Amplitude relative des grandes formes plus larges que RIDGE_BAND[1] en haute montagne, en bruit de gradient : un
 * socle large et peu ondulé, que l'altitude de base du biome place au-dessus de la limite des neiges.
 */
export const RIDGE_MASSIF = 0.8;
/**
 * Facteur du bruit de gradient 2D (gradients unitaires), qui le rapproche de l'étendue du value noise. Sa valeur
 * absolue reste sous GRADIENT_NOISE_SCALE / √2, atteint quand les quatre gradients visent le centre d'une cellule.
 */
export const GRADIENT_NOISE_SCALE = 1.4;
/** Pentes entre lesquelles le terrain devient une paroi, détaillée en 3D plutôt que par le champ de hauteur. */
export const WALL_SLOPE = [0.45, 0.9];
/** Sur les parois, les octaves plus fines que ceci (m) sont retirées du champ de hauteur. */
export const WALL_DETAIL_WAVELENGTH = 150;

/** Sous la neige, les octaves plus fines que ceci (m) sont atténuées de SNOW_FLATTENING. */
export const SNOW_SMOOTH_WAVELENGTH = 60;
export const SNOW_FLATTENING = 0.85;

/** Longueurs d'onde (m) des octaves du bruit 3D de la roche (couleur et creusement des parois). */
export const ROCK_WAVELENGTHS = [120, 48, 18, 7, 2.6, 1];

// ---------- Dunes ----------

/**
 * Couches de dunes, de la plus grande à la plus petite (le shader s'arrête à la première trop fine) : écart moyen
 * entre crêtes (m), hauteur maximale (m), longueur d'onde des bruits qui rendent les crêtes sinueuses et les découpent
 * en tronçons (en écarts entre crêtes), et seuil de ces tronçons selon l'abondance du sable, de rare à abondant (de
 * -0,5, crêtes absentes, à 0,5, crêtes presque continues). Grandes dunes isolées, dunes, petites dunes.
 */
export const DUNE_LAYERS = [
  { wavelength: 1100, height: 45, segment: 1.2, sand: [-0.6, -0.2] },
  { wavelength: 180, height: 14, segment: 1.5, sand: [-0.3, 0.1] },
  { wavelength: 45, height: 2, segment: 2.5, sand: [-0.5, -0.1] },
] as const;
/** Pentes du versant au vent (10°) et de la face d'avalanche sous le vent (33°, angle de repos du sable). */
export const DUNE_WINDWARD_SLOPE = Math.tan((10 * Math.PI) / 180);
export const DUNE_LEE_SLOPE = Math.tan((33 * Math.PI) / 180);
/**
 * Torsion des crêtes, commune aux couches : longueur d'onde et amplitude (m) d'un déplacement le long du vent. Elle
 * fait tourner les crêtes (jusqu'à une trentaine de degrés) et varier leur écart d'une zone à l'autre. La valeur du
 * même bruit donne l'abondance du sable.
 */
export const DUNE_WARP_WAVELENGTH = 5000;
export const DUNE_WARP = 900;
/** Sinuosité des crêtes : amplitude (en périodes) du bruit qui les déplace le long du vent. */
export const DUNE_SINUOSITY = 0.4;
/** Largeur du seuil des tronçons (unités du bruit) : plus large, les crêtes s'abaissent plus progressivement. */
export const DUNE_SEGMENT_EDGE = 0.5;
/**
 * Une crête plus basse que DUNE_SHARP fois la hauteur de sa couche voit ses pentes réduites, jusqu'à DUNE_FLAT fois
 * à hauteur nulle : les petites crêtes n'ont pas de face d'avalanche, et leurs extrémités ne laissent pas de fil net.
 */
export const DUNE_SHARP = 0.5;
export const DUNE_FLAT = 0.3;
/** Hauteur minimale d'une crête, rapportée à la hauteur maximale de sa couche (tirée au hasard pour chaque crête). */
export const DUNE_LOWEST = 0.55;
/** Décalage aléatoire de chaque crête le long du vent (périodes) : l'écart entre crêtes devient irrégulier. */
export const DUNE_JITTER = 0.3;
/**
 * Recul sous le vent (périodes) des parties basses d'une crête, de sable rare à abondant : un tronçon isolé devient
 * une barkhane aux longues cornes, une crête presque continue garde de légers croissants.
 */
export const DUNE_HORNS = [0.6, 0.3];
/** Largeur du raccord adouci entre deux crêtes voisines, rapportée à la hauteur maximale de leur couche. */
export const DUNE_MERGE = 0.15;
/** Pentes du relief entre lesquelles les dunes fondent en une nappe de sable, qui le borde en rampe. */
export const DUNE_CONTACT_SLOPE = [0.08, 0.25];

// ---------- Terre ----------

/**
 * Rayon de courbure du monde (m) : rayon terrestre, multiplié par 7/6 pour la réfraction atmosphérique standard. Un
 * point à la distance d paraît abaissé de d²/(2 EARTH_RADIUS) : depuis 12 m, l'horizon marin est à 13 km.
 */
export const EARTH_RADIUS = (6371000 * 7) / 6;

// ---------- Export vers le shader ----------

const GLSL_INTS: Record<string, number> = {
  CLIFF_HEIGHT_OCTAVE,
  CLIFF_COVE_OCTAVE,
  CLIFF_JITTER_OCTAVE_FINE: CLIFF_JITTER_OCTAVES[1],
  CLIFF_JITTER_OCTAVE: CLIFF_JITTER_OCTAVES[0],
  MAX_OCTAVES,
  BIOME_COUNT: BIOME_STOPS.length,
  FIELD_COUNT: FIELDS.length,
  FIELD_OCTAVES,
  ROCK_OCTAVES: ROCK_WAVELENGTHS.length,
  DUNE_LAYER_COUNT: DUNE_LAYERS.length,
  // Facteurs d'échelle des dunes : torsion, puis deux par couche (voir duneScales)
  DUNE_SCALE_COUNT: 1 + 2 * DUNE_LAYERS.length,
};

const GLSL_FLOATS: Record<string, number | readonly number[]> = {
  BIOME_STOPS,
  FIELD_RATIO: FIELDS.map((field) => field.ratio),
  RANGE_WARP,
  RANGE_FOOTHILLS,
  RANGE_FOOTHILL_LEVEL,
  RANGE_SUMMITS,
  PIEDMONT_LEVEL,
  PIEDMONT_WAVELENGTH,
  PIEDMONT_FLOOR,
  PIEDMONT_FILL,
  ALPINE_LEVEL,
  RIDGE_BAND,
  RIDGE_WARP,
  RIDGE_CREST_SOFTNESS,
  RIDGE_AMPLITUDE,
  RIDGE_DEPTH,
  RIDGE_WEIGHT,
  RIDGE_BASE,
  RIDGE_MASSIF,
  GRADIENT_NOISE_SCALE,
  CLIFF_HEIGHT,
  CLIFF_WIDTH,
  CLIFF_MIN_SLOPE,
  CLIFF_SETBACK,
  STEEP_SLOPE,
  ROCK_ROUGHNESS,
  RIDGE_WAVELENGTH,
  RIDGE_SIGN_SOFTNESS,
  WALL_SLOPE,
  WALL_DETAIL_WAVELENGTH,
  SNOW_SMOOTH_WAVELENGTH,
  SNOW_FLATTENING,
  ROCK_WAVELENGTHS,
  DUNE_HEIGHTS: DUNE_LAYERS.map((layer) => layer.height),
  DUNE_SAND: DUNE_LAYERS.flatMap((layer) => layer.sand),
  // Chacun des deux raccords adoucis d'une couche (au sol, puis entre ses deux crêtes) peut la relever de DUNE_MERGE / 4
  DUNE_MAX_HEIGHT: DUNE_LAYERS.reduce((sum, layer) => sum + layer.height, 0) * (1 + DUNE_MERGE / 2),
  DUNE_WINDWARD_SLOPE,
  DUNE_LEE_SLOPE,
  DUNE_WARP,
  DUNE_SINUOSITY,
  DUNE_SEGMENT_EDGE,
  DUNE_SHARP,
  DUNE_FLAT,
  DUNE_JITTER,
  DUNE_LOWEST,
  DUNE_HORNS,
  DUNE_MERGE,
  DUNE_CONTACT_SLOPE,
  EARTH_RADIUS,
};

function glslFloat(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

/** Déclarations GLSL de toutes les constantes partagées. */
export function glslConstants(): string {
  const ints = Object.entries(GLSL_INTS).map(([name, value]) => `const int ${name} = ${value};`);
  const floats = Object.entries(GLSL_FLOATS).map(([name, value]) =>
    typeof value === 'number'
      ? `const float ${name} = ${glslFloat(value)};`
      : `const float ${name}[${value.length}] = float[${value.length}](${value.map(glslFloat).join(', ')});`,
  );
  return [...ints, ...floats].join('\n');
}
