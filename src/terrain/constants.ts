// Constantes du relief partagées entre la copie CPU (src/terrain) et le shader (src/render).
// Le renderer les injecte en tête du shader via glslConstants() : c'est l'unique source de vérité.

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

/** Hauteur moyenne dont les côtes à falaises sont relevées (m), variable de 0,3 à 1,2 fois selon un bruit. */
export const CLIFF_HEIGHT = 70;
/** Dénivelé (m) sur lequel se forme la marche de la falaise : plus il est petit, plus la paroi est raide. */
export const CLIFF_STEP = 3.5;
/** Décalage (m, de 0 à cette valeur) de l'altitude du pied de falaise : découpe criques et caps. */
export const CLIFF_JITTER = 6;
/** Octaves du relief dont le bruit (décalé) module la hauteur des falaises, puis la position de leur pied. */
export const CLIFF_HEIGHT_OCTAVE = 2;
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

/** Couches de dunes : écart entre crêtes (m), étirement le long des crêtes, hauteur (m). */
export const DUNE_LAYERS = [
  { wavelength: 210, stretch: 4, height: 22 },
  { wavelength: 50, stretch: 3, height: 4 },
] as const;
/** Ondulation des crêtes : longueur d'onde et amplitude (m). */
export const DUNE_WARP_WAVELENGTH = 1200;
export const DUNE_WARP = 250;
/** Variation de la hauteur des crêtes : longueur d'onde (m). */
export const DUNE_CREST_WAVELENGTH = 600;

// ---------- Export vers le shader ----------

const GLSL_INTS: Record<string, number> = {
  CLIFF_HEIGHT_OCTAVE,
  CLIFF_JITTER_OCTAVE_FINE: CLIFF_JITTER_OCTAVES[1],
  CLIFF_JITTER_OCTAVE: CLIFF_JITTER_OCTAVES[0],
  MAX_OCTAVES,
  BIOME_COUNT: BIOME_STOPS.length,
  FIELD_COUNT: FIELDS.length,
  FIELD_OCTAVES,
  ROCK_OCTAVES: ROCK_WAVELENGTHS.length,
  DUNE_LAYER_COUNT: DUNE_LAYERS.length,
  // Facteurs d'échelle des dunes : ondulation, hauteur des crêtes, puis une paire par couche (voir duneScales)
  DUNE_SCALE_COUNT: 2 + DUNE_LAYERS.length,
};

const GLSL_FLOATS: Record<string, number | readonly number[]> = {
  BIOME_STOPS,
  FIELD_RATIO: FIELDS.map((field) => field.ratio),
  RANGE_WARP,
  CLIFF_HEIGHT,
  CLIFF_STEP,
  CLIFF_JITTER,
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
  DUNE_WARP,
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
