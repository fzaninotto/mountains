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

  // Haute montagne : multifractal à crêtes sur un domaine légèrement déformé
  float alpine = smoothstep(ALPINE_LEVEL[0], ALPINE_LEVEL[1], level);
  vec2 warped = x;
  // dx'/dx, puis dq/dx, pour connaître la vraie pente en m/m
  mat2 jacobian = mat2(1.0);
  if (alpine > 0.0) {
    vec3 wx = octaveNoise(x, RIDGE_WARP_OCTAVE, vec2(5.2, 1.3));
    vec3 wz = octaveNoise(x, RIDGE_WARP_OCTAVE, vec2(-3.1, 7.7));
    float k = alpine * RIDGE_WARP;
    warped += k * vec2(wx.x, wz.x);
    jacobian += k * transpose(mat2(wx.yz, wz.yz));
  }
  vec2 q = warped / uScale;
  jacobian /= uScale;
  // Piémont : les creux des grandes formes sont comblés en glacis, plus franchement en climat aride
  float fill = piedmont(level) * mix(PIEDMONT_FILL[0], PIEDMONT_FILL[1], c.y);
  float a = 0.0, b = 1.0, wavelength = uScale;
  vec2 d = vec2(0.0);
  vec2 grad = vec2(0.0);
  // Part des crêtes selon l'altitude des grandes formes (fixée à la première octave à crêtes), et poids des octaves à
  // crêtes, faible loin des arêtes de la précédente
  float ridgeBase = -1.0, crestWeight = 1.0;
  wallSlope = -1.0;
  // Altitude des grandes formes seules, figée en même temps que wallSlope
  float coarseHeight;

  for (int i = 0; i < MAX_OCTAVES; i++) {
    float w = clamp(octaves - float(i), 0.0, 1.0);
    if (w <= 0.0) break;
    // Haute montagne : bruit de gradient, replié en crêtes dans la bande des arêtes (plus bas) et tel quel au-dessus.
    // Le value noise, plat aux sommets de sa grille et raide entre eux, ferait des crêtes en murs étroits autour de
    // fonds plats, et des grandes formes en tables
    float massif = 0.0, band = 0.0;
    vec3 g = vec3(0.0);
    if (alpine > 0.0) {
      massif = alpine * smoothstep(RIDGE_BAND[1], 1.6 * RIDGE_BAND[1], wavelength);
      band = alpine * smoothstep(0.6 * RIDGE_BAND[0], RIDGE_BAND[0], wavelength) - massif;
      // Sous les crêtes, versants et fonds de vallée gardent le fBm ordinaire
      if (band > 0.0 && ridgeBase < 0.0) ridgeBase = smoothstep(RIDGE_BASE[0], RIDGE_BASE[1], base + height * a);
      band *= max(ridgeBase, 0.0);
      if (band + massif > 0.0) g = gradientNoised(uOctFrac[i] + q, uOctCell[i]);
    }
    vec3 n = band + massif < 1.0 ? noised(uOctFrac[i] + q, uOctCell[i]) : vec3(0.0);
    n = mix(n, g, massif);
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
    vec2 dv = mix(n.yz, -2.0 * (n.x / sqrt(n.x * n.x + RIDGE_SIGN_SOFTNESS)) * n.yz, ridged);
    // Haute montagne, grandes octaves : crêtes 1 - |n|, arrondies au sommet. Leurs lignes de niveau zéro, continues,
    // dessinent des arêtes qui relient les sommets par des cols ; les creux arrondis de |n|, cirques et vallées en auge
    float crestAmplitude = 1.0;
    if (band > 0.0) {
      float soft = sqrt(g.x * g.x + RIDGE_CREST_SOFTNESS);
      float r = 1.0 + sqrt(RIDGE_CREST_SOFTNESS) - soft;
      // Les plus petites crêtes sont moins hautes : sinon leurs pentes, égales à chaque octave, s'ajouteraient sur les
      // arêtes en lames trop raides
      float crest = RIDGE_AMPLITUDE * wavelength / RIDGE_BAND[1];
      v = mix(v, crest * (1.0 - RIDGE_DEPTH * (1.0 - r)), band);
      dv = mix(dv, -RIDGE_DEPTH * crest * (g.x / soft) * g.yz, band);
      crestAmplitude = mix(1.0, crestWeight, band);
      crestWeight = smoothstep(RIDGE_WEIGHT[0], RIDGE_WEIGHT[1], r);
    }
    // Les crêtes ne comptent pas dans l'érosion : leur pente change de signe sur l'arête, où la pente accumulée
    // tomberait à zéro ; le détail des octaves suivantes, moins atténué sur l'étroite bande du sommet, y monterait en lame
    d += dv * (1.0 - band);

    // L'atténuation par les dérivées accumulées imite l'érosion (vallées, versants doux) ;
    // sur les pentes raides, la roche reste à nu : les petites octaves gardent leur détail, et un peu plus
    float erosion = 1.0 / (1.0 + dot(d, d));
    // Les octaves à crêtes restent érodées sur la roche : relevées à chaque pente raide qu'elles créent, elles
    // monteraient en aiguilles
    float amplitude = w * b * mix(erosion, ROCK_ROUGHNESS, steep * (1.0 - band)) * crestAmplitude;
    // Les crêtes repliées varient moins que le fBm qu'elles remplacent : les grandes formes sont relevées, sans quoi les
    // sommets perdraient de l'altitude
    amplitude *= 1.0 - (1.0 - RIDGE_MASSIF) * massif;
    // Sur les parois, le détail fin vient du bruit 3D (surfaceDistance) : un champ de hauteur s'y étirerait
    if (wavelength < WALL_DETAIL_WAVELENGTH) amplitude *= 1.0 - smoothstep(WALL_SLOPE[0], WALL_SLOPE[1], rockSlope);
    if (wavelength < SNOW_SMOOTH_WAVELENGTH) amplitude *= 1.0 - snowSmoothing(base + height * a, height * length(grad));

    a += amplitude * v;
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
