// ---------- Biomes, falaises et dunes ----------
// Identique à src/terrain/climate.ts et src/terrain/dunes.ts.

// fBm d'un champ de biomes (0 : continent, 1 : aridité, 2 : chaînes de montagnes, 3 : îles), environ dans [-1, 1]
float fieldNoise(vec2 x, int field) {
  vec2 q = x / (uBiomeScale * FIELD_RATIO[field]);
  float a = 0.0, b = 1.0, norm = 0.0;
  for (int i = 0; i < FIELD_OCTAVES; i++) {
    int k = field * FIELD_OCTAVES + i;
    a += b * noised(uFieldFrac[k] + q, uFieldCell[k]).x;
    norm += b;
    b *= 0.5;
    q = 2.0 * (M2 * q);
  }
  return a / norm;
}

// (niveau de relief, poids du désert, poids des falaises).
// Niveau de relief : 0 = mer, puis plage, plaine, collines, moyenne et haute montagne jusqu'à 1.
// Le continent sépare la mer des terres ; les montagnes suivent les crêtes d'un troisième champ, ondulé
// par les deux premiers, ce qui dessine des chaînes. Un quatrième champ, plus fin, fait émerger des îles
// au large et décide où les côtes sont des falaises. Tout est continu : aucune frontière entre biomes
vec3 climate(vec2 x) {
  float continent = fieldNoise(x, 0);
  float dryness = fieldNoise(x, 1);
  float warp = RANGE_WARP * uBiomeScale * FIELD_RATIO[2];
  float range = fieldNoise(x + warp * vec2(continent, dryness), 2);
  float islands = fieldNoise(x, 3);
  float coast = smoothstep(-0.15, 0.05, continent);
  float inland = smoothstep(0.0, 0.25, continent);
  float mountain = smoothstep(0.62, 1.0, 1.0 - abs(range) + uMountainBias) * inland;
  float island = smoothstep(0.15, 0.6, islands) * smoothstep(-0.6, -0.2, continent) * (1.0 - coast);
  float level = 0.3 * coast + 0.7 * mountain + 0.6 * island;
  float cliff = smoothstep(-0.05, 0.3, islands) * (1.0 - smoothstep(0.3, 0.42, level));
  return vec3(level, smoothstep(0.05, 0.35, dryness + uDesertBias), cliff);
}

// Biome (altitude de base, amplitude, gain) interpolé en continu le long du niveau de relief
vec3 biomeAt(float level) {
  vec3 biome = uBiomes[0];
  for (int i = 0; i < BIOME_COUNT - 1; i++) {
    biome = mix(biome, uBiomes[i + 1], smoothstep(BIOME_STOPS[i], BIOME_STOPS[i + 1], level));
  }
  return biome;
}

// 1 en plaine et sur la plage, 0 dès les collines
float lowland(float level) {
  return 1.0 - smoothstep(0.3, 0.45, level);
}

// Les dunes n'existent que dans les zones arides basses : ni en mer, ni en relief
float duneWeight(float level, float desert) {
  return desert * smoothstep(0.12, 0.2, level) * lowland(level);
}

// Falaises : tout ce qui émerge près de la mer est relevé d'un bloc ; la marche se forme là où le relief
// traverse le niveau de l'eau, sur quelques mètres de dénivelé seulement, donc très raide
float cliffLift(float h, float cliff) {
  return cliff * CLIFF_HEIGHT * smoothstep(uWater + 0.5, uWater + 4.0, h);
}

// Hauteur des dunes (m) : crêtes (1 - |n|) d'un bruit étiré perpendiculairement au vent (axe x), ondulées par un
// second bruit. Les fréquences (uDuneScale) sont des multiples entiers de celle du premier champ de biomes, dont
// l'origine en double précision est ainsi réutilisée. Les couches plus fines que minWavelength s'effacent
float dunes(vec2 x, float minWavelength) {
  vec2 q = uFieldFrac[0] + x / uBiomeScale;
  vec2 kw = vec2(uDuneScale[0]);
  uvec2 cw = uDuneScale[0] * uFieldCell[0];
  vec2 warp = DUNE_WARP / uBiomeScale * vec2(noised(kw * q + vec2(1.3, 7.1), cw).x, noised(kw * q + vec2(4.7, 2.2), cw).x);
  float crest = 0.35 + 0.65 * smoothstep(-0.6, 0.6, noised(vec2(uDuneScale[1]) * q + vec2(5.3, 1.9), uDuneScale[1] * uFieldCell[0]).x);
  float h = 0.0;
  for (int i = 0; i < DUNE_LAYER_COUNT; i++) {
    vec2 k = vec2(uDuneScale[i + 2]);
    float n = noised(k * (q + warp) + vec2(3.1, 8.3), uDuneScale[i + 2] * uFieldCell[0]).x;
    float wavelength = uBiomeScale / k.x;
    // Arête arrondie, d'autant plus que la dune est petite à l'écran, pour éviter le crénelage des crêtes
    float bevel = 0.04 + 0.5 * minWavelength / wavelength;
    float ridge = 1.0 - (sqrt(n * n + bevel * bevel) - bevel);
    h += pow(max(ridge, 0.0), 1.6) * DUNE_HEIGHTS[i] * smoothstep(minWavelength, 2.0 * minWavelength, wavelength);
  }
  return h * crest;
}
