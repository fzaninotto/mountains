// ---------- Matériaux et éclairage ----------

// Épaisseur des strates de roche (m)
const float STRATA_THICKNESS = 14.0;

// Relief autour d'un point vu depuis la distance t : normale fine (lumière), normale des formes quelques fois plus
// grandes que le pixel (répartition des matériaux, qui ne doit pas suivre le moindre détail), et cavité, négative
// dans les creux et positive sur les bosses (occlusion, neige, végétation)
struct Surface {
  vec3 normal;
  vec3 coarse;
  float cavity;
  float valley;
};

Surface surfaceAt(vec3 p, float t) {
  Surface s;
  s.normal = calcNormal(p, t);
  float octaves = lod(t);
  float coarseOctaves = max(octaves - 3.0, 1.0);
  float e = max(t * lodPixelAngle * 8.0, 0.5);
  float h = terrain(p.xz, octaves);
  float hc = terrain(p.xz, coarseOctaves);
  s.coarse = normalize(vec3(
    hc - terrain(p.xz + vec2(e, 0.0), coarseOctaves),
    e,
    hc - terrain(p.xz + vec2(0.0, e), coarseOctaves)
  ));
  s.cavity = clamp((h - hc) / e, -1.0, 1.0);
  // Creux et bosses de 375 m et moins, à toute distance : négatif dans les vallons, positif sur les croupes
  s.valley = clamp((terrain(p.xz, min(octaves, 4.0)) - h) / 30.0, -1.0, 1.0);
  return s;
}

// Variation de couleur à grande échelle (375 m à 47 m) : fBm des octaves tournées du relief, décalé pour ne pas
// reproduire ses formes. En 2D : il s'étirerait sur les parois, où rockVariation() prend le relais
float colorVariation(vec2 x) {
  vec2 q = x / uScale;
  float a = 0.0, b = 1.0, norm = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= 4) {
      a += b * noised(uOctFrac[i] + q + vec2(17.3, -9.1), uOctCell[i]).x;
      norm += b;
      b *= 0.55;
    }
    q = 2.0 * (M2 * q);
  }
  return a / norm;
}

// fBm des octaves first à last du relief, décalé, de gain `gain`. Chaque octave s'efface sous deux pixels (footprint
// en m) sans que les autres soient renforcées : au loin, le contraste du détail disparaît avec lui
float vegetationNoise(vec2 x, vec2 offset, int first, int last, float gain, float footprint) {
  vec2 q = x / uScale;
  float wavelength = uScale;
  float a = 0.0, b = 1.0, norm = 0.0;
  for (int i = 0; i <= last; i++) {
    if (i >= first) {
      float fade = smoothstep(2.0 * footprint, 4.0 * footprint, wavelength);
      if (fade > 0.0) a += fade * b * noised(uOctFrac[i] + q + offset, uOctCell[i]).x;
      norm += b;
      b *= gain;
    }
    q = 2.0 * (M2 * q);
    wavelength *= 0.5;
  }
  return a / norm;
}

// Houppiers : dans chaque cellule de l'octave `octave` du relief, un arbre placé au hasard, présent avec une
// probabilité qui suit cover (part du sol couverte) : là où elle baisse, le couvert s'éclaircit en bosquets et en
// arbres isolés de taille normale. Chaque houppier est un dôme lisse de hauteur égale à son rayon ; leur somme forme
// une canopée bosselée sans arête. Renvoie la hauteur relative de la canopée (0 hors des houppiers, 1 au sommet d'un
// arbre seul), sa pente, et une valeur aléatoire propre aux arbres, moyennée là où ils se touchent
vec4 crowns(vec2 x, int octave, float cover) {
  mat2 jacobian;
  vec2 q = octaveSpace(x, octave, jacobian);
  vec2 fl = floor(q);
  vec2 f = q - fl;
  uvec2 cell = uvec2(ivec2(fl)) + uOctCell[octave];
  float presence = min(1.2 * cover, 0.92);
  float height = 0.0, tint = 0.0;
  vec2 slope = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      uvec2 c = cell + uvec2(ivec2(i, j));
      float a = hash(c + uvec2(7919u, 104729u)), b = hash(c + uvec2(65537u, 3571u));
      if (fract(71.3 * a + 29.1 * b) >= presence) continue;
      vec2 d = f - vec2(i, j) - 0.2 - 0.6 * vec2(a, b);
      float r = 0.35 + 0.45 * fract(37.3 * a + 91.7 * b);
      float h = max(1.0 - dot(d, d) / (r * r), 0.0);
      height += h * h;
      slope -= 4.0 * h * d / r;
      tint += h * h * fract(113.1 * a + 57.9 * b);
    }
  }
  slope = transpose(jacobian) * slope * (uScale / exp2(float(octave)));
  return vec4(height, slope, height > 0.0 ? tint / height : 0.5);
}

// ---------- Micro-relief ----------
// Relief plus fin que le champ de hauteur, présent dans l'ombrage seulement : sa pente (m/m) incline la normale,
// sans rien changer à la marche des rayons, aux ombres portées ni aux collisions. Chaque détail s'efface sous deux à
// quatre pixels de son empreinte en profondeur, comme vegetationNoise().

// Value noise de l'octave `octave` du relief, ses coordonnées multipliées par `scale` (entiers : il reste attaché au
// sol). Avec deux facteurs différents, des traînées allongées selon l'axe de l'octave, que sa rotation oriente.
// Valeur et gradient par mètre
vec3 streakNoise(vec2 x, int octave, vec2 offset, uvec2 scale) {
  mat2 jacobian;
  vec2 k = vec2(scale);
  vec3 n = noised(k * (octaveSpace(x, octave, jacobian) + offset), uOctCell[octave] * scale);
  return vec3(n.x, transpose(jacobian) * (k * n.yz));
}

// Rides de sable : octave dont le réseau porte les rides, sa longueur d'onde divisée par environ 3 (≈ 24 cm)
const int RIPPLE_OCTAVE = 13;
// Directions des rides dans l'espace de l'octave : combinaisons entières de ses axes, pour que la phase reste attachée
// au sol malgré l'origine décalée, de normes voisines de 3, et leurs angles sur un demi-tour
const vec2 RIPPLE_DIRS[8] = vec2[8](vec2(3.0, 0.0), vec2(3.0, 1.0), vec2(2.0, 2.0), vec2(1.0, 3.0), vec2(0.0, 3.0),
  vec2(-1.0, 3.0), vec2(-2.0, 2.0), vec2(-3.0, 1.0));
const float RIPPLE_ANGLES[9] = float[9](0.0, 0.32175, 0.785398, 1.249046, 1.570796, 1.892547, 2.356194, 2.819842,
  3.141593);
// Hauteur des rides relative à leur longueur d'onde
const float RIPPLE_HEIGHT = 0.07;

// Une famille de rides de direction d (espace de l'octave), orientée dans le sens du vent windQ : versant au vent en
// pente douce, face sous le vent raide. Renvoie (hauteur dans [0, 1], gradient par mètre de la hauteur en m)
vec3 rippleSet(vec2 q, mat2 jacobian, vec2 d, vec2 windQ, vec3 warp, float wavelength) {
  d *= sign(dot(d, windQ) + 1e-6);
  float phase = 6.2831853 * (dot(q, d) + warp.x);
  float skewed = phase + 0.5 * sin(phase);
  float h = 0.5 - 0.5 * sin(skewed);
  float dh = -0.5 * cos(skewed) * (1.0 + 0.5 * cos(phase)) * 6.2831853;
  return vec3(h, RIPPLE_HEIGHT * wavelength * dh * (transpose(jacobian) * d + warp.yz));
}

// Rides éoliennes, crêtes perpendiculaires au vent local des dunes, sinueuses, interrompues par plaques. De la
// direction du réseau la plus proche à la suivante, la bascule suit une ligne irrégulière où les crêtes se raccordent
// en Y, comme les défauts des vraies rides : mêlées, les deux familles se croiseraient en damier.
// Renvoie (hauteur dans [0, 1], pente) pondérées par fade
vec3 sandRipples(vec2 x, float fade) {
  mat2 jacobian;
  vec2 q = octaveSpace(x, RIPPLE_OCTAVE, jacobian);
  vec2 windQ = jacobian * duneWind(x);
  float angle = atan(windQ.y, windQ.x);
  if (angle < 0.0) angle += 3.1415927;
  int k = 0;
  for (int i = 1; i < 8; i++) if (angle >= RIPPLE_ANGLES[i]) k = i;
  float between = (angle - RIPPLE_ANGLES[k]) / (RIPPLE_ANGLES[k + 1] - RIPPLE_ANGLES[k]);
  vec2 d = between + 0.3 * octaveNoise(x, RIPPLE_OCTAVE - 4, vec2(-8.1, 3.7)).x < 0.5 ? RIPPLE_DIRS[k]
    : k == 7 ? -RIPPLE_DIRS[0] : RIPPLE_DIRS[k + 1];
  float wavelength = uScale / exp2(float(RIPPLE_OCTAVE)) / 3.0;
  vec3 warp = 0.6 * octaveNoise(x, RIPPLE_OCTAVE - 2, vec2(4.1, -7.3)) + 0.25 * octaveNoise(x, RIPPLE_OCTAVE - 1, vec2(-3.3, 1.9));
  vec3 ripple = rippleSet(q, jacobian, d, windQ, warp, wavelength);
  float patches = smoothstep(-0.7, 0.3, octaveNoise(x, RIPPLE_OCTAVE - 3, vec2(-2.9, 5.7)).x);
  return vec3(ripple.x, ripple.yz * patches) * fade;
}

// Touffes d'herbe de 1,5 m à 40 cm : bosses arrondies sur un sol plus plat. Renvoie (hauteur relative, environ dans
// [0, 1], pente)
vec3 grassTufts(vec2 x, float depthFootprint) {
  vec3 tufts = vec3(0.0);
  for (int octave = 12; octave <= 14; octave++) {
    float wavelength = uScale / exp2(float(octave));
    float fade = smoothstep(2.0 * depthFootprint, 4.0 * depthFootprint, wavelength);
    if (fade <= 0.0) break;
    vec3 n = streakNoise(x, octave, vec2(8.3, -1.9), uvec2(1u));
    float bump = max(n.x, 0.0);
    tufts += fade * vec3(0.4 * bump * bump, 0.12 * wavelength * bump * n.yz);
  }
  return tufts;
}

// Sastrugi : crêtes de neige vives sculptées par le vent, allongées (3 m, et 70 cm plus discrètes), toutes dans la même direction.
// Renvoie la pente
vec2 sastrugi(vec2 x, float depthFootprint) {
  const int octave = 11;
  float wavelength = uScale / exp2(float(octave));
  vec2 slope = vec2(0.0);
  for (uint k = 1u; k <= 4u; k *= 4u) {
    float fade = smoothstep(2.0 * depthFootprint, 4.0 * depthFootprint, wavelength / (4.0 * float(k)));
    if (fade <= 0.0) break;
    vec3 n = streakNoise(x, octave, vec2(-5.3, 2.7) * float(k), uvec2(k, 3u * k));
    slope -= fade * 0.015 * wavelength / float(k * k) * n.x / sqrt(n.x * n.x + 0.02) * n.yz;
  }
  return slope;
}

// Éboulis au pied des pentes : blocs (cellules de 1,5 m) à la densité cover, gravier entre eux. Renvoie la pente et
// la teinte (multiplicateur de l'albédo)
vec2 scree(vec2 x, float cover, float depthFootprint, float sideways, out float tint) {
  tint = 1.0;
  vec2 slope = vec2(0.0);
  const int BLOCK_OCTAVE = 12;
  float cell = uScale / exp2(float(BLOCK_OCTAVE));
  float blockFade = smoothstep(2.0 * depthFootprint, 4.0 * depthFootprint, cell) * sideways;
  if (blockFade > 0.0 && cover > 0.0) {
    vec4 block = crowns(x, BLOCK_OCTAVE, cover);
    float inside = smoothstep(0.0, 0.2, block.x);
    tint = mix(1.0, mix(0.75, (0.8 + 0.5 * block.w) * (0.9 + 0.15 * min(block.x, 1.0)), inside), blockFade);
    slope += blockFade * 0.5 * inside * block.yz;
  }
  float gravel = uScale / exp2(14.0);
  float gravelFade = smoothstep(2.0 * depthFootprint, 4.0 * depthFootprint, gravel);
  if (gravelFade > 0.0) {
    vec3 n = streakNoise(x, 14, vec2(3.3, 9.1), uvec2(1u));
    vec3 m = streakNoise(x, 14, vec2(-6.7, 1.3), uvec2(2u));
    tint *= 1.0 + gravelFade * (0.12 * n.x + 0.08 * m.x);
    slope += gravelFade * 0.04 * gravel * (n.yz + 0.5 * m.yz);
  }
  return slope;
}

// Équivalent 3D de colorVariation pour les pentes raides (octaves de 120 m et 48 m du bruit de la roche)
float rockVariation(vec3 p) {
  return 0.65 * gradientNoise3(rockSpace(p, 0) + 0.25, uRockCell[0]) + 0.35 * gradientNoise3(rockSpace(p, 1) + 0.25, uRockCell[1]);
}

vec3 terrainAlbedo(vec3 p, inout Surface s, float t) {
  float footprint = t * lodPixelAngle;
  // Vu en rasant, un pixel couvre 1/cos plus de sol en profondeur : un détail encore visible en largeur y serait
  // écrasé en stries parallèles à l'horizon, il s'efface donc selon l'empreinte en profondeur
  vec3 view = normalize(vec3(p.x, p.y - uCamY, p.z));
  float cosView = max(-dot(view, s.coarse), 0.02);
  float depthFootprint = footprint / cosView;
  // Vues de biais, les brins et les blocs se recouvrent : leur contraste baisse
  float sideways = smoothstep(0.1, 0.6, cosView);
  float steep = smoothstep(0.25, 0.5, 1.0 - s.coarse.y);
  float flatVariation = colorVariation(p.xz);
  float steepVariation = rockVariation(p);
  float variation = mix(flatVariation, steepVariation, steep);
  vec3 c = climate(p.xz);
  float desert = c.y;

  // Roche : gris froid en climat tempéré (sol nu plus brun hors des pentes raides), brun-rouge en climat aride,
  // tachée à plusieurs échelles
  float tone = clamp(0.5 + 0.35 * variation + 0.35 * rockStain(p, footprint), 0.0, 1.0);
  vec3 col = mix(
    mix(vec3(0.065, 0.068, 0.068), vec3(0.17, 0.17, 0.165), tone) * mix(vec3(0.8, 0.77, 0.72), vec3(1.0), steep),
    mix(vec3(0.2, 0.1, 0.055), vec3(0.36, 0.2, 0.11), tone),
    desert
  );

  // Strates sur les pentes raides : bandes de teintes différentes, légèrement inclinées et ondulées,
  // effacées quand elles deviennent plus fines que quelques pixels
  float strataPhase = (p.y + 25.0 * steepVariation) / STRATA_THICKNESS;
  float layer = fract(sin(floor(strataPhase) * 12.9898) * 43758.5453);
  float edge = smoothstep(0.0, 0.15, fract(strataPhase)) * smoothstep(1.0, 0.85, fract(strataPhase));
  vec3 strataTint = mix(vec3(0.85, 0.87, 0.9), vec3(1.1, 1.03, 0.92), layer) * (0.88 + 0.12 * edge);
  col *= mix(vec3(1.0), strataTint, steep * smoothstep(2.0 * footprint, 6.0 * footprint, STRATA_THICKNESS));

  // Lichens : taches gris-vert sur la roche tempérée, sous la limite de la végétation
  float lichen = smoothstep(-0.1, 0.4, rockVariation(p + 31.7)) * (1.0 - desert)
    * (1.0 - smoothstep(uVegetation, uVegetation + 800.0, p.y));
  col *= mix(vec3(1.0), vec3(0.8, 0.9, 0.72), 0.6 * lichen);

  // Éboulis : gravier sur le sol nu hors des parois, blocs au pied des pentes et dans les creux
  float bare = 1.0 - steep;
  vec2 micro = vec2(0.0);
  if (bare > 0.0) {
    float blocks = bare * clamp(1.5 * smoothstep(0.04, 0.2, 1.0 - s.coarse.y) + 0.5 * s.valley - s.cavity, 0.0, 0.8);
    float tint;
    micro = bare * scree(p.xz, blocks, depthFootprint, sideways, tint);
    col *= mix(1.0, tint, bare);
  }

  // Végétation : là où les formes (et non le détail du pixel) sont peu pentues, davantage dans les creux,
  // sous la limite de végétation, hors désert
  float gentle = mix(s.normal.y, s.coarse.y, 0.75) - 0.06 * s.cavity + 0.04 * variation;
  float vegetation = smoothstep(0.8, 0.93, gentle) * (1.0 - smoothstep(0.2, 1.0, desert))
    * (1.0 - smoothstep(uVegetation - 200.0, uVegetation + 200.0, p.y + variation * 250.0));

  // Herbe : teinte qui varie doucement de quelques mètres à quelques centaines (frais, sec, plus sombre), touffes
  // de 6 m à 70 cm et brins de 40 cm à 2 cm, effacés selon l'empreinte en profondeur
  float patches = (0.5 + 0.5 * sideways) * vegetationNoise(p.xz, vec2(-41.7, 23.9), 8, 12, 0.6, depthFootprint);
  float tufts = sideways * vegetationNoise(p.xz, vec2(5.3, 61.2), 10, 13, 0.8, depthFootprint);
  float blades = sideways * vegetationNoise(p.xz, vec2(-12.7, 44.1), 14, 18, 1.0, depthFootprint);
  float dryness = clamp(0.5 + 0.45 * flatVariation + 0.35 * patches + 0.3 * tufts + 0.3 * blades, 0.0, 1.0);
  vec3 grass = mix(vec3(0.075, 0.115, 0.04), vec3(0.15, 0.15, 0.07), dryness);
  grass *= 1.0 + 0.4 * tufts + 0.8 * blades;
  // Vers le désert, l'herbe sèche en steppe paille plutôt que de se mêler au sol brun
  grass = mix(grass, vec3(0.2, 0.16, 0.075) * (1.0 + 0.3 * tufts), smoothstep(0.0, 0.5, desert));

  // Forêt : massifs dont la couverture varie selon les régions, plutôt dans les vallons et sur les versants
  // que sur les croupes, aux lisières découpées
  float region = vegetationNoise(p.xz, vec2(-73.1, 12.4), 1, 2, 0.6, depthFootprint);
  float edges = vegetationNoise(p.xz, vec2(31.9, -57.3), 4, 10, 0.6, depthFootprint);
  float hillside = smoothstep(0.995, 0.93, s.coarse.y);
  float woods = 0.6 * edges + region + 0.5 * s.valley + 0.2 * hillside - 0.25;
  float forest = 0.7 * smoothstep(0.0, 0.15, woods) * (1.0 - smoothstep(uVegetation - 600.0, uVegetation - 200.0, p.y));
  grass = mix(grass, vec3(0.055, 0.08, 0.037) * (1.0 + 0.3 * edges), forest);
  col = mix(col, grass, vegetation);
  // Touffes en relief hors forêt, leurs sommets plus clairs
  if (vegetation > 0.0) {
    vec3 tufts = sideways * (1.0 - forest) * grassTufts(p.xz, depthFootprint);
    col *= 1.0 + 0.25 * vegetation * tufts.x;
    micro = mix(micro, tufts.yz, vegetation);
  }

  // Sable : plages des côtes marines (pas des lacs), de largeur variable, et tout le plat en désert
  float coastal = 1.0 - smoothstep(0.22, 0.3, c.x);
  float beachTop = uWater + 1.0 + 3.5 * (0.5 + 0.5 * flatVariation);
  float beach = coastal * (1.0 - smoothstep(beachTop - 1.0, beachTop, p.y));
  float sand = max(beach, desert * lowland(c.x)) * smoothstep(0.6, 0.85, mix(s.normal.y, s.coarse.y, 0.5));
  // Sable de plage beige doré, sable du désert ocre orangé, nuancé de 375 m à 6 m
  float sandVariation = flatVariation + 0.6 * vegetationNoise(p.xz, vec2(27.7, -15.1), 7, 10, 0.7, depthFootprint);
  vec3 sandColor = mix(vec3(0.76, 0.63, 0.41), vec3(0.68, 0.38, 0.16), desert) * (0.94 + 0.14 * sandVariation);
  // Rides, plus rares sur les faces d'avalanche ; les crêtes, de grain plus grossier, sont un peu plus claires
  float rippleWavelength = uScale / exp2(float(RIPPLE_OCTAVE)) / 3.0;
  float rippleFade = smoothstep(3.0 * depthFootprint, 6.0 * depthFootprint, rippleWavelength);
  micro *= 1.0 - sand;
  if (sand > 0.0 && rippleFade > 0.0) {
    vec3 ripple = sandRipples(p.xz, rippleFade * mix(0.4, 1.0, smoothstep(0.8, 0.9, s.normal.y)));
    sandColor *= 1.0 + 0.08 * (ripple.x - 0.5 * rippleFade);
    micro += sand * ripple.yz;
  }
  col = mix(col, sandColor, sand);

  // Rive mouillée : sable ou terre plus sombres juste au-dessus de l'eau
  float wet = 1.0 - smoothstep(uWater + 0.2, uWater + 1.2 + 0.6 * flatVariation, p.y);
  col *= 1.0 - 0.4 * wet;

  // Neige : la limite monte sur les versants au soleil et en climat aride ; elle tient dans les creux et
  // sur les pentes douces, moins sur les bosses ventées
  vec2 slopeDir = s.coarse.xz;
  float sunward = dot(slopeDir, normalize(uSunDir.xz + vec2(1e-4))) / max(length(slopeDir), 0.05)
    * smoothstep(0.05, 0.3, length(slopeDir));
  float snowLine = uSnow + 120.0 * sunward + 400.0 * desert;
  float hold = mix(s.normal.y, s.coarse.y, 0.85) - 0.05 * s.cavity + min((p.y - snowLine) * 0.0002, 0.1);
  float snow = smoothstep(snowLine - 150.0, snowLine + 150.0, p.y + variation * 300.0) * smoothstep(0.5, 0.7, hold);
  // Sastrugi sur la neige peu pentue
  if (snow > 0.0) {
    micro = mix(micro, smoothstep(0.75, 0.9, s.coarse.y) * sastrugi(p.xz, depthFootprint), snow);
  }
  s.normal = normalize(s.normal - vec3(micro.x, 0.0, micro.y));
  return mix(col, vec3(0.85, 0.88, 0.92), snow);
}

vec3 shadeTerrain(vec3 p, float t, int shadowSteps) {
  Surface s = surfaceAt(p, t);
  vec3 albedo = terrainAlbedo(p, s, t);
  vec3 n = s.normal;
  float dif = max(dot(n, uSunDir), 0.0);
  float shadow = dif > 0.0 ? softShadow(p + n * max(0.05, t * pixelAngle * 2.0), uSunDir, t, shadowSteps) : 0.0;
  // Les creux reçoivent moins de ciel et de lumière renvoyée
  float occlusion = clamp(1.0 + 0.6 * s.cavity, 0.55, 1.0);
  vec3 skyLight = skyIrradiance(p.y, n) * occlusion;
  // Lumière renvoyée (albédo moyen d'environ 0,15) par le sol plat alentour, éclairé par le soleil et le ciel, et,
  // pour un versant tourné à l'opposé du soleil, par les versants d'en face qui reçoivent le soleil de face
  vec3 ground = sunCol * SUN_IRRADIANCE * max(uSunDir.y, 0.0) + skyIrradiance(p.y, vec3(0.0, 1.0, 0.0));
  vec3 antiSun = normalize(vec3(-uSunDir.x, 0.0, -uSunDir.z) + vec3(1e-4, 0.0, 0.0));
  vec3 slopes = sunCol * SUN_IRRADIANCE * 0.8;
  vec3 bounce = (ground * clamp(0.5 - 0.5 * n.y, 0.0, 1.0) + slopes * max(dot(n, antiSun), 0.0)) * 0.15 * occlusion;
  return albedo * (sunCol * SUN_IRRADIANCE * dif * shadow + skyLight + bounce);
}

// ---------- Eau ----------

// Hauteur des rides (m) : bruit 3D de la roche sur le plan d'eau, octaves de 18 m à 1 m effacées sous un pixel
float waveHeight(vec3 p, float footprint) {
  float h = 0.0;
  for (int i = 2; i < ROCK_OCTAVES; i++) {
    float fade = rockFade(i, footprint);
    if (fade <= 0.0) break;
    h += fade * 0.012 * ROCK_WAVELENGTHS[i] * gradientNoise3(rockSpace(p, i) + 0.37, uRockCell[i]);
  }
  return h;
}

vec3 waterNormal(vec3 p, float t) {
  float footprint = t * lodPixelAngle;
  float e = max(footprint, 0.05);
  float h = waveHeight(p, footprint);
  return normalize(vec3(h - waveHeight(p + vec3(e, 0.0, 0.0), footprint), e, h - waveHeight(p + vec3(0.0, 0.0, e), footprint)));
}

// Eau : reflet ridé du relief et du ciel selon Fresnel, reflet du soleil, fond visible et teinté par l'absorption
// quand l'eau est peu profonde, écume au bord. rd : direction du rayon à la surface, courbure comprise (rayDir)
vec3 shadeWater(vec3 p, vec3 rd, float t) {
  vec3 n = waterNormal(p, t);
  vec3 r = reflect(rd, n);
  r.y = abs(r.y);
  float cosView = max(dot(-rd, n), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - cosView, 5.0);

  // Reflet allégé : détail plus grossier, budget de pas et ombres réduits, invisibles une fois mêlés au Fresnel.
  // En aperçu, plus grossier encore et sans ombre portée
  bool preview = uPreview > 0.5;
  float tr = march(p + vec3(0.0, 0.05, 0.0), r, 0.5, TMAX, t, preview ? 3.0 : 2.0, preview ? 120 : 200);
  // Un reflet rasant épuise ses pas au-dessus du fond marin : il reflète le ciel
  if (tr > 0.0 && terrain(p.xz + r.xz * tr, lod(t + tr)) < uWater) tr = -1.0;
  vec3 reflection = sky(r, 0.0);
  if (tr > 0.0) {
    vec3 hit = rayPoint(p, r, tr);
    reflection = applyFog(shadeTerrain(hit, t + tr, preview ? 0 : 24), p, hit, 0.0);
  }
  float shadow = preview ? 1.0 : softShadow(p, uSunDir, t, 16);

  // Reflet du soleil (GGX), d'autant plus diffus que l'eau est loin et que ses rides ne sont plus résolues
  float roughness = clamp(0.06 + t * lodPixelAngle * 0.03, 0.06, 0.35);
  float a2 = roughness * roughness * roughness * roughness;
  vec3 halfway = normalize(uSunDir - rd);
  float nh = max(dot(n, halfway), 0.0);
  float distribution = a2 / (3.14159 * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0));
  float sunFresnel = 0.02 + 0.98 * pow(1.0 - max(dot(halfway, -rd), 0.0), 5.0);
  vec3 specular = sunCol * SUN_IRRADIANCE * shadow * distribution * sunFresnel / max(4.0 * cosView, 0.1);

  // Ce qu'on voit sous la surface : fond de sable plus ou moins absorbé (le rouge disparaît le premier), puis
  // la couleur propre de l'eau profonde
  vec3 light = sunCol * SUN_IRRADIANCE * max(uSunDir.y, 0.0) * shadow + skyIrradiance(uWater, vec3(0.0, 1.0, 0.0));
  float depth = max(uWater - terrain(p.xz, lod(t)), 0.0);
  vec3 absorption = exp(-vec3(0.35, 0.09, 0.06) * depth * 1.6);
  vec3 below = vec3(0.4, 0.35, 0.25) * light * absorption + vec3(0.008, 0.03, 0.04) * light * (1.0 - absorption);

  // Écume sur les premiers décimètres de profondeur, en traînées, effacée sous la taille d'un pixel
  float foamNoise = gradientNoise3(rockSpace(p, 4) + 0.71, uRockCell[4]);
  float foam = (1.0 - smoothstep(0.0, 0.7, depth)) * mix(0.35, smoothstep(-0.1, 0.5, foamNoise), rockFade(4, t * lodPixelAngle));

  vec3 col = mix(below, reflection, fresnel) + specular;
  return mix(col, vec3(0.75) * light, foam * 0.8);
}

// Courbe de tons ACES (approximation de Narkowicz)
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
