// ---------- Relief ----------
// terrainHeight() donne l'altitude du sol, que les sondes relisent pour le CPU (probe.frag.glsl) ;
// surfaceDistance() y ajoute le détail 3D des parois.

float steepness(float slope) {
  return smoothstep(STEEP_SLOPE[0], STEEP_SLOPE[1], slope);
}

// La neige comble les petits reliefs sur les zones peu pentues au-dessus de la limite des neiges
float snowSmoothing(float h, float slope) {
  return SNOW_FLATTENING * smoothstep(uSnow - 100.0, uSnow + 150.0, h) * (1.0 - smoothstep(0.35, 0.7, slope));
}

// Part des octaves de longueur d'onde `wavelength` calculée par alpineRidges() en haute montagne
float alpineShare(float wavelength) {
  return smoothstep(0.6 * RIDGE_BAND[0], RIDGE_BAND[0], wavelength);
}

// Haute montagne : grandes octaves (alpineShare) en multifractal à crêtes, sur un domaine légèrement déformé, en bruit
// de gradient (le value noise, plat aux sommets de sa grille et raide entre eux, ferait des crêtes en murs étroits
// autour de fonds plats, et des massifs en tables). Les plus larges que RIDGE_BAND[1] forment le massif ; dans la bande
// des crêtes, le bruit replié 1 - |n| dessine des arêtes continues qui relient les sommets par des cols, autour de
// cirques et de vallées en auge, et le bruit simple (fBm à dérivées) les bas versants. Un seul bruit par octave.
// Renvoie (hauteur, gradient par mètre) en unités du fBm, et la pente accumulée (unités du bruit) pour l'érosion des
// octaves suivantes
vec3 alpineRidges(vec2 x, float octaves, float base, float height, float gain, out vec2 massifSlope) {
  vec2 q = x / uScale;
  mat2 jacobian = mat2(1.0 / uScale);
  vec3 h = vec3(0.0);
  float b = 1.0, wavelength = uScale;
  // Les octaves à crêtes s'effacent loin des arêtes de la précédente
  float crestWeight = 1.0;
  massifSlope = vec2(0.0);
  // Part des crêtes selon l'altitude du massif, fixée à la première octave à crêtes
  float ridgeBase = -1.0;
  for (int i = 0; i < MAX_OCTAVES; i++) {
    float w = clamp(octaves - float(i), 0.0, 1.0);
    if (w <= 0.0 || wavelength < 0.6 * RIDGE_BAND[0]) break;
    vec3 g = gradientNoised(uOctFrac[i] + q, uOctCell[i]);
    vec2 slope = transpose(jacobian) * g.yz;
    float massif = smoothstep(RIDGE_BAND[1], 1.6 * RIDGE_BAND[1], wavelength);
    // Légère déformation du domaine des octaves suivantes le long de la pente du massif, sans bruit de plus : les
    // arêtes ondulent au lieu de suivre la grille. Sa dérivée (la courbure du massif) est négligée dans le gradient
    if (i == 0) q += RIDGE_WARP / uScale * g.yz;
    h += w * b * RIDGE_MASSIF * massif * vec3(g.x, slope);
    massifSlope += massif * g.yz;
    float band = alpineShare(wavelength) - massif;
    if (band > 0.0) {
      // Sous une certaine altitude du massif, versants et fonds de vallée restent un fBm ordinaire
      if (ridgeBase < 0.0) ridgeBase = smoothstep(RIDGE_BASE[0], RIDGE_BASE[1], base + height * h.x);
      float plain = w * b * band * (1.0 - ridgeBase) / (1.0 + dot(massifSlope, massifSlope));
      h += plain * vec3(g.x, slope);
      float soft = sqrt(g.x * g.x + RIDGE_CREST_SOFTNESS);
      float r = 1.0 + sqrt(RIDGE_CREST_SOFTNESS) - soft;
      // Les plus petites crêtes sont moins hautes : sinon leurs pentes, égales à chaque octave, s'ajouteraient sur les
      // arêtes en lames trop raides. Elles ne comptent pas dans l'érosion : leur pente change de signe sur l'arête, où
      // le détail des octaves suivantes, moins atténué sur l'étroite bande du sommet, monterait en lame
      float crest = RIDGE_AMPLITUDE * wavelength / RIDGE_BAND[1];
      float amplitude = w * b * band * ridgeBase * crestWeight / (1.0 + dot(massifSlope, massifSlope));
      h += amplitude * crest * vec3(1.0 - RIDGE_DEPTH * (1.0 - r), -RIDGE_DEPTH * (g.x / soft) * slope);
      crestWeight = smoothstep(RIDGE_WEIGHT[0], RIDGE_WEIGHT[1], r);
      massifSlope += band * (1.0 - ridgeBase) * g.yz;
    }
    b *= gain;
    q = 2.0 * (M2 * q);
    jacobian = 2.0 * (M2 * jacobian);
    wavelength *= 0.5;
  }
  return h;
}

// Altitude du sol (m) en x, avec `octaves` octaves (fractionnaire : la dernière est fondue).
// Renvoie aussi la pente (m/m), la pente des grandes formes seules (wallSlope), qui varie lentement, et devant une
// falaise, sa distance horizontale (approchée), l'altitude de son sommet et la pente de sa face (cliffFront).
// fBm à dérivées : la pente accumulée atténue les octaves suivantes, ce qui imite l'érosion.
float terrainHeight(vec2 x, float octaves, out vec2 slope, out float wallSlope, out vec3 cliffFront) {
  vec3 c = climate(x);
  float level = c.x;
  float sand = duneWeight(level, c.y);
  vec3 biome = biomeAt(level);
  float base = biome.x, height = biome.y * (1.0 - 0.5 * sand), gain = biome.z;

  vec2 q = x / uScale;
  // dq/dx, pour connaître la vraie pente en m/m
  mat2 jacobian = mat2(1.0 / uScale);
  float a = 0.0, b = 1.0, wavelength = uScale;
  vec2 d = vec2(0.0);
  vec2 grad = vec2(0.0);
  // Haute montagne : les grandes octaves du fBm s'effacent devant le multifractal à crêtes
  float alpine = smoothstep(ALPINE_LEVEL[0], ALPINE_LEVEL[1], level);
  if (alpine > 0.0) {
    vec2 massifSlope;
    vec3 ridges = alpine * alpineRidges(x, octaves, base, height, gain, massifSlope);
    a = ridges.x;
    grad = ridges.yz;
    d = alpine * massifSlope;
  }
  // Piémont : les creux des grandes formes sont comblés en glacis, plus franchement en climat aride
  float fill = piedmont(level) * mix(PIEDMONT_FILL[0], PIEDMONT_FILL[1], c.y);
  wallSlope = -1.0;
  // Altitude des grandes formes seules, figée en même temps que wallSlope
  float coarseHeight;

  for (int i = 0; i < MAX_OCTAVES; i++) {
    float w = clamp(octaves - float(i), 0.0, 1.0);
    if (w <= 0.0) break;
    float keep = alpine > 0.0 ? 1.0 - alpine * alpineShare(wavelength) : 1.0;
    vec3 n = keep > 0.0 ? noised(uOctFrac[i] + q, uOctCell[i]) : vec3(0.0);
    if (fill > 0.0 && wavelength < PIEDMONT_WAVELENGTH && 2.0 * wavelength >= PIEDMONT_WAVELENGTH) {
      // Maximum adouci avec le fond du glacis ; le détail qui suit s'atténue d'autant sur le comblement
      vec3 filled = softMin(vec3(-a, -grad), vec3(-PIEDMONT_FLOOR, 0.0, 0.0), 0.3);
      float buried = fill * clamp((PIEDMONT_FLOOR - a) / 0.3 + 0.5, 0.0, 1.0);
      a = mix(a, -filled.x, fill);
      grad = mix(grad, -filled.yz, fill);
      d *= 1.0 - buried;
      b *= 1.0 - 0.7 * buried;
    }
    // Pour les octaves fines, la pente qui décide « roche ou versant érodé » est figée sur celle des grandes formes :
    // sinon le détail rend la pente plus raide, qui appelle plus de détail, et le terrain bascule en liserés nets
    if (wallSlope < 0.0 && wavelength < WALL_DETAIL_WAVELENGTH) {
      wallSlope = height * length(grad);
      coarseHeight = base + height * a;
    }
    float rockSlope = wavelength < WALL_DETAIL_WAVELENGTH ? wallSlope : height * length(grad);
    float steep = steepness(rockSlope);

    // Sur les pentes raides, les petites octaves deviennent des crêtes vives : arêtes et ravines de roche cassée
    float ridged = wavelength < RIDGE_WAVELENGTH ? steep : 0.0;
    float v = mix(n.x, 1.0 - 2.0 * abs(n.x), ridged);
    // Signe adouci : avec sign(n.x), la pente accumulée (donc l'érosion des octaves suivantes) sauterait le long de
    // chaque arête, et le relief y ferait une marche, vue comme un fil ou un arc net
    vec2 dv = mix(n.yz, -2.0 * (n.x / sqrt(n.x * n.x + RIDGE_SIGN_SOFTNESS)) * n.yz, ridged) * keep;
    d += dv;

    // L'atténuation par les dérivées accumulées imite l'érosion (vallées, versants doux) ;
    // sur les pentes raides, la roche reste à nu : les petites octaves gardent leur détail, et un peu plus
    float erosion = 1.0 / (1.0 + dot(d, d));
    float amplitude = w * b * mix(erosion, ROCK_ROUGHNESS, steep);
    // Sur les parois, le détail fin vient du bruit 3D (surfaceDistance) : un champ de hauteur s'y étirerait
    if (wavelength < WALL_DETAIL_WAVELENGTH) amplitude *= 1.0 - smoothstep(WALL_SLOPE[0], WALL_SLOPE[1], rockSlope);
    if (wavelength < SNOW_SMOOTH_WAVELENGTH) amplitude *= 1.0 - snowSmoothing(base + height * a, height * length(grad));

    a += amplitude * keep * v;
    grad += amplitude * (transpose(jacobian) * dv);
    b *= gain;
    q = 2.0 * (M2 * q);
    jacobian = 2.0 * (M2 * jacobian);
    wavelength *= 0.5;
  }

  slope = height * grad;
  float h = base + height * a;
  if (wallSlope < 0.0) {
    wallSlope = length(slope);
    coarseHeight = h;
  }
  // La face d'une falaise est une paroi : sa vraie pente compte pour la distance, et elle est creusée en 3D.
  // Le gradient des grandes formes prend la direction de la pente complète, à peine différente près des côtes
  vec2 coarseGrad = slope * (wallSlope / max(length(slope), 1e-6));
  vec3 cliff = cliffLift(x, vec3(coarseHeight, coarseGrad), c.z, cliffFront);
  h += cliff.x;
  slope += cliff.yz;
  wallSlope = max(wallSlope, length(cliff.yz));
  if (sand <= 0.0) return h;
  // Les dunes fondent contre le relief (pente des grandes formes, falaises comprises) ; elles peuvent surmonter une
  // falaise, dont le sommet est relevé d'autant pour la distance
  float contact = 1.0 - smoothstep(DUNE_CONTACT_SLOPE[0], DUNE_CONTACT_SLOPE[1], wallSlope);
  vec3 dune = sand * dunes(x, uScale * exp2(-octaves), contact);
  slope += dune.yz;
  cliffFront.y += sand * DUNE_MAX_HEIGHT;
  return h + dune.x;
}

float terrain(vec2 x, float octaves) {
  vec2 slope;
  float wallSlope;
  vec3 cliffFront;
  return terrainHeight(x, octaves, slope, wallSlope, cliffFront);
}

// Niveau de détail : nombre d'octaves dont la longueur d'onde dépasse deux pixels à la distance t
float lod(float t) {
  float footprint = max(t, 0.01) * lodPixelAngle * uDetail;
  return clamp(log2(uScale / (2.0 * footprint)), 1.0, float(MAX_OCTAVES));
}

// Distance (approchée, minorée) entre p et la surface, vue depuis la distance t.
// Hors des parois, c'est l'écart vertical au champ de hauteur. Sur les parois, cet écart est ramené à une vraie
// distance et la paroi est creusée par le bruit 3D de la roche
float surfaceDistance(vec3 p, float t) {
  vec2 slope;
  float wallSlope;
  vec3 cliffFront;
  float dy = p.y - terrainHeight(p.xz, lod(t), slope, wallSlope, cliffFront);
  // Devant une falaise, le champ de hauteur ignore la paroi qui se dresse un peu plus loin : la distance est bornée
  // par l'écart à son pied et au-dessus de son sommet, sans descendre sous l'écart vertical rapporté à sa pente.
  // Ni sous un pixel : seul le vrai relief déclenche l'impact
  float front = max(max(cliffFront.x, p.y - cliffFront.y), dy / (1.0 + cliffFront.z));
  dy = min(dy, max(front, t * lodPixelAngle));
  float wall = smoothstep(WALL_SLOPE[0], WALL_SLOPE[1], wallSlope);
  if (wall <= 0.0) return dy;
  float e = mix(dy, dy / sqrt(1.0 + dot(slope, slope)), wall);
  if (e >= ROCK_CARVE_MAX) return e;
  // Empreinte doublée : les parois sont souvent vues de biais, où un pixel couvre bien plus de roche
  return (e + wall * rockCarve(p, 2.0 * t * lodPixelAngle * uDetail)) / (1.0 + ROCK_CARVE_LIPSCHITZ * wall);
}
