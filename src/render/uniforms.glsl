// Entrées du shader de terrain. Les constantes partagées (MAX_OCTAVES, BIOME_COUNT…) sont générées depuis
// src/terrain/constants.ts et placées avant ce fichier.

// Caméra : la position horizontale est l'origine du repère (x, z relatifs), seule l'altitude est absolue
uniform vec2 uResolution;
uniform float uCamY;
uniform mat3 uCamRot;
uniform float uFocal;

// Réglages (voir src/params.ts)
uniform vec3 uSunDir;
uniform float uScale;
uniform float uBiomeScale;
uniform float uMountainBias;
uniform float uDesertBias;
uniform float uDetail;
uniform float uStep;
uniform float uWater;
uniform float uVegetation;
uniform float uSnow;
uniform float uFog;
uniform float uExposure;

// Biomes le long du niveau de relief : (altitude de base, amplitude, gain)
uniform vec3 uBiomes[BIOME_COUNT];
// Borne haute du relief : au-dessus, un rayon qui monte ne peut plus rien toucher
uniform float uMaxH;

// Origines des bruits à la position de la caméra (voir src/terrain/origins.ts) : partie fractionnaire et cellule
uniform vec2 uOctFrac[MAX_OCTAVES];
uniform uvec2 uOctCell[MAX_OCTAVES];
uniform vec2 uFieldFrac[FIELD_COUNT * FIELD_OCTAVES];
uniform uvec2 uFieldCell[FIELD_COUNT * FIELD_OCTAVES];
uniform vec3 uRockFrac[ROCK_OCTAVES];
uniform uvec3 uRockCell[ROCK_OCTAVES];
uniform mat3 uRockRot[ROCK_OCTAVES];
// Facteurs d'échelle entiers des dunes (voir src/terrain/dunes.ts)
uniform uvec2 uDuneScale[DUNE_SCALE_COUNT];

out vec4 outColor;

// Rotation entre deux octaves successives
const mat2 M2 = mat2(0.8, -0.6, 0.6, 0.8);
// Distance maximale de rendu (m)
const float TMAX = 80000.0;

// Valeurs calculées une fois par pixel dans main()
float pixelAngle;
vec3 sunCol;
vec3 skyCol;
vec3 horizonCol;
