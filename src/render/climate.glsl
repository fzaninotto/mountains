// ---------- Biomes, falaises et dunes ----------
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

// Value noise de l'octave `octave` du relief, décalé de `offset` pour ne pas reproduire ses formes,
// et son gradient (par mètre)
vec3 octaveNoise(vec2 x, int octave, vec2 offset) {
  vec2 q = x / uScale;
  mat2 jacobian = mat2(1.0 / uScale);
  for (int i = 0; i < octave; i++) {
    q = 2.0 * (M2 * q);
    jacobian = 2.0 * (M2 * jacobian);
  }
  vec3 n = noised(uOctFrac[octave] + q + offset, uOctCell[octave]);
  return vec3(n.x, transpose(jacobian) * n.yz);
}

// smoothstep(a, b, n.x) et son gradient, pour n = (valeur, gradient)
vec3 smoothstepGrad(float a, float b, vec3 n) {
  float u = clamp((n.x - a) / (b - a), 0.0, 1.0);
  return vec3(u * u * (3.0 - 2.0 * u), 6.0 * u * (1.0 - u) / (b - a) * n.yz);
}

// Gradient maximal (multiplié par uScale) du bruit qui fait reculer le pied de falaise : celui du value noise ne
// dépasse guère 4 dans son propre espace
const float CLIFF_NOTCH_GRADIENT = 4.0 * (0.6 * float(1 << CLIFF_JITTER_OCTAVE) + 0.4 * float(1 << CLIFF_JITTER_OCTAVE_FINE));
// En dessous du pied le plus bas d'au moins ceci (m), la distance à la falaise est estimée sans évaluer ses bruits
const float CLIFF_FRONT_MARGIN = 3.0;

// Falaises : tout ce qui émerge près de la mer est relevé d'un bloc ; la marche se forme là où les grandes formes du
// relief (coarse : altitude et gradient, sans les octaves de moins de WALL_DETAIL_WAVELENGTH) traversent l'altitude
// du pied de falaise. Son dénivelé suit leur pente, pour que la face ait toujours la même largeur horizontale,
// CLIFF_WIDTH : une paroi, même sur un littoral en pente douce. Le petit détail, lui, ne fait que s'y ajouter : s'il
// décidait de la marche, ses quelques centimètres la feraient basculer en aiguilles.
// La hauteur varie le long de la côte et s'annule par endroits (criques basses), et le pied recule plus ou moins loin
// de l'eau, ce qui découpe criques et caps au lieu de suivre fidèlement le trait de côte.
// Renvoie le relèvement et son gradient. Au large de la paroi, front donne pour la distance au relief
// (surfaceDistance) la distance horizontale approchée à son pied, l'altitude de son sommet et sa plus forte pente ;
// ailleurs, front.x est infini
vec3 cliffLift(vec2 x, vec3 coarse, float cliff, out vec3 front) {
  float h = coarse.x;
  front = vec3(1e9, 0.0, 0.0);
  if (cliff <= 0.0) return vec3(0.0);
  float lowestFoot = uWater + 0.5;
  // Les distances horizontales deviennent des dénivelés du terrain d'origine en les multipliant par sa pente
  float slope = max(length(coarse.yz), CLIFF_MIN_SLOPE);
  float rise = CLIFF_WIDTH * slope;
  // Nettement sous le pied le plus bas, pas de relèvement ; pour la distance, la falaise la plus haute possible
  if (h <= lowestFoot - CLIFF_FRONT_MARGIN) {
    float highest = cliff * 1.2 * CLIFF_HEIGHT;
    float closing = length(coarse.yz) + 0.5 * CLIFF_SETBACK * slope * CLIFF_NOTCH_GRADIENT / uScale;
    front = vec3((lowestFoot - h) / closing, lowestFoot + (CLIFF_SETBACK + CLIFF_WIDTH) * slope + highest,
      1.5 * highest / rise * closing);
    return vec3(0.0);
  }
  vec3 tall = smoothstepGrad(-0.5, 0.5, octaveNoise(x, CLIFF_HEIGHT_OCTAVE, vec2(3.7, -1.3)));
  vec3 cove = smoothstepGrad(-0.6, 0.2, octaveNoise(x, CLIFF_COVE_OCTAVE, vec2(-2.3, 5.9)));
  float height = CLIFF_HEIGHT * (0.2 + tall.x) * cove.x;
  vec2 heightGrad = CLIFF_HEIGHT * (tall.yz * cove.x + (0.2 + tall.x) * cove.yz);
  // Au-dessus de la plus haute marche possible, le relèvement est complet
  if (h >= lowestFoot + (CLIFF_SETBACK + CLIFF_WIDTH) * slope) return cliff * vec3(height, heightGrad);
  vec3 notches = 0.6 * octaveNoise(x, CLIFF_JITTER_OCTAVE, vec2(-6.1, 2.9))
    + 0.4 * octaveNoise(x, CLIFF_JITTER_OCTAVE_FINE, vec2(1.7, 8.3));
  float foot = lowestFoot + CLIFF_SETBACK * slope * (0.5 + 0.5 * notches.x);
  // Gradient de h - foot : la marche avance perpendiculairement à lui, d'autant plus vite qu'il est grand
  vec2 closing = coarse.yz - 0.5 * CLIFF_SETBACK * slope * notches.yz;
  float faceSlope = 1.5 * height / rise * length(closing) + length(heightGrad);
  if (h <= foot) front = vec3((foot - h) / max(length(closing), CLIFF_MIN_SLOPE), foot + rise + cliff * height, cliff * faceSlope);
  // Sous le pied (donc sous le plus bas), s = 0 : pas de relèvement, comme côté CPU
  float s = clamp((h - foot) / rise, 0.0, 1.0);
  float ramp = s * s * (3.0 - 2.0 * s);
  return cliff * vec3(height * ramp, height * 6.0 * s * (1.0 - s) / rise * closing + ramp * heightGrad);
}

// Minimum adouci sur une largeur k de deux fonctions (valeur, gradient)
vec3 softMin(vec3 a, vec3 b, float k) {
  float weight = clamp(0.5 + 0.5 * (b.x - a.x) / k, 0.0, 1.0);
  return vec3(mix(b.x, a.x, weight) - k * weight * (1.0 - weight), mix(b.yz, a.yz, weight));
}

// Maximum adouci sur une largeur k de deux dunes (valeur, gradient). Leur part de face d'avalanche (slip) est mêlée
// avec le même poids, dérivée comprise
void softMaxDune(inout vec3 h, inout vec3 slip, vec3 dune, vec3 duneSlip, float k) {
  float weight = clamp(0.5 + 0.5 * (dune.x - h.x) / k, 0.0, 1.0);
  vec2 weightGrad = weight > 0.0 && weight < 1.0 ? 0.5 * (dune.yz - h.yz) / k : vec2(0.0);
  h = vec3(mix(h.x, dune.x, weight) + k * weight * (1.0 - weight), mix(h.yz, dune.yz, weight));
  slip = vec3(mix(slip.x, duneSlip.x, weight), mix(slip.yz, duneSlip.yz, weight) + (duneSlip.x - slip.x) * weightGrad);
}

// Value noise 1D de la rangée row (valeur dans [-1, 1], dérivée), cell étant la cellule entière qui s'ajoute à x
vec2 noise1(float x, uint cell, uint row) {
  float fl = floor(x);
  float f = x - fl;
  uint i = uint(int(fl)) + cell;
  float a = hash(uvec2(i, row));
  float b = hash(uvec2(i + 1u, row));
  float u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return vec2(-1.0 + 2.0 * mix(a, b, u), 60.0 * f * f * (f * (f - 2.0) + 1.0) * (b - a));
}

// Épaisseur moyenne de sable d'une crête continue de hauteur H et d'écart λ : DUNE_SHEET × H² / λ
const float DUNE_SHEET = 0.5 * (1.0 / DUNE_WINDWARD_SLOPE + 1.0 / DUNE_LEE_SLOPE);

// Hauteur des dunes (m) et son gradient. Le vent souffle en moyenne vers +x. Chaque couche est une suite de crêtes
// transverses le long d'une phase « tordue » : un bruit de grande amplitude, commun aux couches, fait tourner les
// crêtes et varier leur écart d'une zone à l'autre ; un second, propre à la couche, les rend sinueuses. Chaque crête
// a son propre bruit de hauteur le long de z, à l'échelle de quelques écarts : elle se découpe en tronçons qui
// s'abaissent et s'interrompent indépendamment de ceux des crêtes voisines (aucune ligne ne se prolonge sur des
// kilomètres). Là où une crête s'abaisse, elle recule sous le vent : chaque tronçon devient un croissant aux cornes
// basses tournées sous le vent, qui rejoignent parfois la crête suivante (jonctions en Y). Le sable rare donne des
// barkhanes isolées aux longues cornes entre des creux plats ; abondant, des crêtes barkhanoïdes presque continues.
// Profil asymétrique : versant au vent en pente douce, face d'avalanche sous le vent. Les crêtes se raccordent par un
// maximum adouci. Les couches fines ne vivent pas sur les faces d'avalanche des plus grandes. Là où contact tombe à 0
// (contre le relief), elles fondent en une nappe de sable de volume voisin. Les fréquences (uDuneScale) sont des
// multiples entiers de celle du premier champ de biomes, dont l'origine en double précision est ainsi réutilisée.
// Les couches plus fines que minWavelength s'effacent, et leurs arêtes s'arrondissent avant.
// L'écart local entre crêtes (1 / |grad phase|) varie à l'échelle des kilomètres : il est tenu pour constant dans le
// gradient. Pente : face d'avalanche DUNE_LEE_SLOPE, accrue par le recul des cornes et la variation des hauteurs le
// long des crêtes (≈ 1,1 au pire), plus les versants au vent des couches plus grandes : elle reste sous 1,5 (sondée :
// 0,9 au plus). Le pas de march(), uStep = 0,4 fois l'écart vertical, ne traverse rien tant qu'elle reste sous
// sqrt(1 / uStep² - 1) ≈ 2,3
vec3 dunes(vec2 x, float minWavelength, float contact) {
  // Même la plus grande couche est effacée : rien à évaluer
  if (uBiomeScale / float(uDuneScale[1]) <= minWavelength) return vec3(0.0);
  vec2 q = uFieldFrac[0] + x / uBiomeScale;
  float kWarp = float(uDuneScale[0]);
  vec3 warp = noised(kWarp * q + vec2(1.3, 7.1), uDuneScale[0] * uFieldCell[0]);
  warp.yz *= kWarp / uBiomeScale;
  // Coordonnée le long du vent (m), tordue, et son gradient
  float along = x.x + DUNE_WARP * warp.x;
  vec2 alongGrad = vec2(1.0, 0.0) + DUNE_WARP * warp.yz;
  // Abondance du sable (0 à 1) : le même bruit, dont la valeur ne se voit pas dans la torsion (seul son gradient
  // oriente les crêtes)
  vec3 sand = smoothstepGrad(-0.5, 0.5, warp);
  vec3 h = vec3(0.0);
  // Part de chaque couche épargnée par les faces d'avalanche des couches plus grandes, et son gradient
  float stoss = 1.0;
  vec2 stossGrad = vec2(0.0);
  for (int i = 0; i < DUNE_LAYER_COUNT; i++) {
    uint k = uDuneScale[1 + 2 * i], kSegment = uDuneScale[2 + 2 * i];
    float wavelength = uBiomeScale / float(k);
    float fade = smoothstep(minWavelength, 2.0 * minWavelength, wavelength);
    if (fade <= 0.0) break;
    float top = DUNE_HEIGHTS[i] * fade;
    float g = float(kSegment) / uBiomeScale;
    uvec2 segmentCell = kSegment * uFieldCell[0];
    vec3 bend = noised(float(kSegment) * q + vec2(3.1, 8.3), segmentCell);
    // Phase (en périodes), sa partie entière en double précision par l'origine des biomes
    float scaled = float(k) * uFieldFrac[0].x;
    float phase = fract(scaled) + along / wavelength + DUNE_SINUOSITY * bend.x;
    vec2 phaseGrad = alongGrad / wavelength + DUNE_SINUOSITY * g * bend.yz;
    float norm = length(phaseGrad);
    float base = floor(phase);
    uint first = k * uFieldCell[0].x + uint(int(floor(scaled) + base));
    // Abondance du sable : seuil des tronçons et recul des cornes
    float sandRange = DUNE_SAND[2 * i + 1] - DUNE_SAND[2 * i];
    vec3 bias = vec3(DUNE_SAND[2 * i] + sandRange * sand.x, sandRange * sand.yz);
    float horn = mix(DUNE_HORNS[0], DUNE_HORNS[1], sand.x);
    vec2 hornGrad = (DUNE_HORNS[1] - DUNE_HORNS[0]) * sand.yz;
    float brinkWidth = 0.02 * wavelength + 0.5 * minWavelength;
    vec3 layer = vec3(0.0), slip = vec3(0.0);
    // Reculée d'au plus DUNE_JITTER + DUNE_HORNS[0] < 1 période, la crête n n'agit qu'entre les phases n - 1 et n + 1
    // (sa face d'avalanche s'arrête avant n + 1) : seules les deux qui encadrent le point comptent
    // Une crête ne relève le sol que là où elle dépasse -DUNE_MERGE × top, à moins de reach / pente de sa crête
    float reach = (1.0 + DUNE_MERGE) * top;
    for (int j = 0; j < 2; j++) {
      uint n = first + uint(j);
      // Décalage aléatoire de la crête le long du vent ; hors de sa portée quel que soit le recul de ses cornes, elle
      // est ignorée sans évaluer son bruit
      float pick = hash(uvec2(n, uint(i)));
      float jitter = DUNE_JITTER * pick;
      float lead = (phase - base - float(j) - jitter) / norm;
      if (lead < -reach / DUNE_WINDWARD_SLOPE || lead - horn / norm > reach / DUNE_LEE_SLOPE) continue;
      // Hauteur de la crête, et son bruit le long de z (direction moyenne des crêtes)
      float tall = top * mix(DUNE_LOWEST, 1.0, fract(97.0 * pick));
      vec2 v = noise1(float(kSegment) * q.y, segmentCell.y, n);
      vec3 m = smoothstepGrad(0.0, DUNE_SEGMENT_EDGE, vec3(v.x, 0.0, g * v.y) + bias);
      // Distance (m) à la crête le long du vent, positive en aval : ses cornes reculent là où elle s'abaisse
      float s = lead - horn * (1.0 - m.x) / norm;
      vec2 sGrad = (phaseGrad - hornGrad * (1.0 - m.x) + horn * m.yz) / norm;
      vec3 crest = tall * m;
      // Une crête basse n'a pas encore de face d'avalanche : ses pentes s'adoucissent, elle s'étale en bosse
      vec3 sharp = smoothstepGrad(0.0, DUNE_SHARP, m);
      vec3 grow = vec3(mix(DUNE_FLAT, 1.0, sharp.x), (1.0 - DUNE_FLAT) * sharp.yz);
      vec3 windward = vec3(crest.x + DUNE_WINDWARD_SLOPE * grow.x * s,
        crest.yz + DUNE_WINDWARD_SLOPE * (grow.x * sGrad + s * grow.yz));
      vec3 lee = vec3(crest.x - DUNE_LEE_SLOPE * grow.x * s, crest.yz - DUNE_LEE_SLOPE * (grow.x * sGrad + s * grow.yz));
      vec3 dune = softMin(windward, lee, (DUNE_WINDWARD_SLOPE + DUNE_LEE_SLOPE) * brinkWidth);
      // Part de face d'avalanche : passé la crête, et jusqu'à mi-hauteur au pied
      float pastBrink = 0.5 + s / (0.1 * wavelength);
      float onSlope = dune.x / (0.5 * top);
      float past = clamp(pastBrink, 0.0, 1.0), on = clamp(onSlope, 0.0, 1.0);
      vec3 duneSlip = vec3(past * on, (pastBrink > 0.0 && pastBrink < 1.0 ? sGrad / (0.1 * wavelength) : vec2(0.0)) * on
        + past * (onSlope > 0.0 && onSlope < 1.0 ? dune.yz / (0.5 * top) : vec2(0.0)));
      softMaxDune(layer, slip, dune, duneSlip, DUNE_MERGE * top);
    }
    layer = vec3(layer.x * stoss, layer.yz * stoss + layer.x * stossGrad);
    // Nappe de volume voisin : celui d'une crête continue, au prorata des tronçons
    float cover = clamp(0.5 + bias.x, 0.0, 1.0);
    vec2 coverGrad = cover > 0.0 && cover < 1.0 ? bias.yz : vec2(0.0);
    float mean = DUNE_SHEET * top * top / wavelength;
    vec3 sheet = mean * vec3(cover * stoss, coverGrad * stoss + cover * stossGrad);
    h += mix(sheet, layer, contact);
    stossGrad = stossGrad * (1.0 - slip.x) - stoss * slip.yz;
    stoss *= 1.0 - slip.x;
  }
  return h;
}
