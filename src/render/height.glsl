// ---------- Relief ----------
// terrainHeight() est identique à src/terrain/height.ts ; surfaceDistance() y ajoute le détail 3D des parois.

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

  vec2 q = x / uScale;
  // dq/dx, pour connaître la vraie pente en m/m
  mat2 jacobian = mat2(1.0 / uScale);
  float a = 0.0, b = 1.0, wavelength = uScale;
  vec2 d = vec2(0.0);
  vec2 grad = vec2(0.0);
  wallSlope = -1.0;
  // Altitude des grandes formes seules, figée en même temps que wallSlope
  float coarseHeight;

  for (int i = 0; i < MAX_OCTAVES; i++) {
    float w = clamp(octaves - float(i), 0.0, 1.0);
    if (w <= 0.0) break;
    vec3 n = noised(uOctFrac[i] + q, uOctCell[i]);
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
    d += dv;

    // L'atténuation par les dérivées accumulées imite l'érosion (vallées, versants doux) ;
    // sur les pentes raides, la roche reste à nu : les petites octaves gardent leur détail, et un peu plus
    float erosion = 1.0 / (1.0 + dot(d, d));
    float amplitude = w * b * mix(erosion, ROCK_ROUGHNESS, steep);
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
  return sand > 0.0 ? h + sand * dunes(x, uScale * exp2(-octaves)) : h;
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
