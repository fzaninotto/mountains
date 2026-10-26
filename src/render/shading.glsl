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
  // Creux et bosses de 375 m et moins, à toute distance : positif dans les vallons, négatif sur les croupes
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

// Octave du relief dont chaque cellule (12 m) porte un arbre, et celle des buissons de la steppe (3 m)
const int CROWN_OCTAVE = 9;
const int SHRUB_OCTAVE = 11;
// Part de la pente des houppiers reportée sur la normale
const float CROWN_TILT = 0.15;
// Direction du sud (azimut 180°) : versants au soleil (adrets) et à l'ombre (ubacs)
const vec2 SOUTH = vec2(0.0, 1.0);

// Houppiers : dans chaque cellule de l'octave `octave` du relief, un arbre placé au hasard, présent avec une
// probabilité qui suit cover (part du sol couverte) : là où elle baisse, le couvert s'éclaircit en bosquets et en
// arbres isolés de taille normale. Chaque houppier est un dôme lisse de hauteur égale à son rayon ; leur somme forme
// une canopée bosselée sans arête. Renvoie la hauteur relative de la canopée (0 hors des houppiers, 1 au sommet d'un
// arbre seul), sa pente, et une valeur aléatoire propre aux arbres, moyennée là où ils se touchent
vec4 crowns(vec2 x, int octave, float cover) {
  vec2 q = x / uScale;
  mat2 jacobian = mat2(1.0 / uScale);
  for (int i = 0; i < octave; i++) {
    q = 2.0 * (M2 * q);
    jacobian = 2.0 * (M2 * jacobian);
  }
  q += uOctFrac[octave];
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

// Équivalent 3D de colorVariation pour les pentes raides (octaves de 120 m et 48 m du bruit de la roche)
float rockVariation(vec3 p) {
  return 0.65 * gradientNoise3(rockSpace(p, 0) + 0.25, uRockCell[0]) + 0.35 * gradientNoise3(rockSpace(p, 1) + 0.25, uRockCell[1]);
}

vec3 terrainAlbedo(vec3 p, inout Surface s, float t) {
  float footprint = t * lodPixelAngle;
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

  // Végétation : là où les formes (et non le détail du pixel) sont peu pentues, davantage dans les creux,
  // sous la limite de végétation, hors désert
  float gentle = mix(s.normal.y, s.coarse.y, 0.75) - 0.06 * s.cavity + 0.04 * variation;
  float vegetation = smoothstep(0.8, 0.93, gentle) * (1.0 - smoothstep(0.2, 1.0, desert))
    * (1.0 - smoothstep(uVegetation - 200.0, uVegetation + 200.0, p.y + variation * 250.0));

  // Herbe : teinte qui varie doucement de quelques mètres à quelques centaines (frais, sec, plus sombre), touffes
  // de 6 m à 70 cm et brins de 40 cm à 2 cm. Vu en rasant, un pixel couvre 1/cos plus de sol en profondeur : un
  // détail encore visible en largeur y serait écrasé en stries parallèles à l'horizon, il s'efface donc selon
  // l'empreinte en profondeur
  vec3 view = normalize(vec3(p.x, p.y - uCamY, p.z));
  float cosView = max(-dot(view, s.coarse), 0.02);
  float depthFootprint = footprint / cosView;
  // Vues de biais, les brins se recouvrent : taches, touffes et brins perdent leur contraste
  float sideways = smoothstep(0.1, 0.6, cosView);
  float patches = (0.5 + 0.5 * sideways) * vegetationNoise(p.xz, vec2(-41.7, 23.9), 8, 12, 0.6, depthFootprint);
  float tufts = sideways * vegetationNoise(p.xz, vec2(5.3, 61.2), 10, 13, 0.8, depthFootprint);
  float blades = sideways * vegetationNoise(p.xz, vec2(-12.7, 44.1), 14, 18, 1.0, depthFootprint);
  // Exposition : 1 sur un versant tourné plein sud, -1 plein nord, 0 sur le plat
  vec2 slopeDir = s.coarse.xz;
  float sunny = dot(slopeDir, SOUTH) / max(length(slopeDir), 0.05) * smoothstep(0.03, 0.2, length(slopeDir));
  // Prairies plus fraîches dans les vallons humides, plus sèches sur les croupes et les adrets
  float dryness = clamp(0.5 + 0.45 * flatVariation + 0.35 * patches + 0.3 * tufts + 0.3 * blades
    - 0.3 * s.valley + 0.15 * sunny, 0.0, 1.0);
  vec3 grass = mix(vec3(0.075, 0.115, 0.04), vec3(0.15, 0.15, 0.07), dryness);
  grass *= 1.0 + 0.4 * tufts + 0.8 * blades;
  // Vers le désert, l'herbe sèche en steppe paille plutôt que de se mêler au sol brun
  float steppe = smoothstep(0.0, 0.5, desert);
  grass = mix(grass, vec3(0.2, 0.16, 0.075) * (1.0 + 0.3 * tufts), steppe);

  // Forêt : massifs dont la couverture varie selon les régions, plutôt dans les vallons humides, sur les versants
  // et les ubacs que sur les croupes et les adrets, aux lisières découpées qui s'égrènent en bosquets et en arbres
  // isolés. La limite des arbres ondule elle aussi ; ils ne poussent pas entre les affleurements rocheux
  float region = vegetationNoise(p.xz, vec2(-73.1, 12.4), 1, 2, 0.6, depthFootprint);
  float edges = vegetationNoise(p.xz, vec2(31.9, -57.3), 4, 8, 0.6, depthFootprint);
  float hillside = smoothstep(0.995, 0.93, s.coarse.y);
  float woods = 0.6 * edges + region + 0.5 * s.valley + 0.2 * hillside - 0.15 * sunny - 0.25;
  float treeLine = 1.0 - smoothstep(uVegetation - 600.0, uVegetation - 200.0, p.y + 200.0 * edges);
  float forest = smoothstep(0.0, 0.15, woods) * treeLine * (1.0 - steppe) * smoothstep(0.6, 1.0, vegetation);
  // Essences : résineux bleu-vert sombres en altitude, sur les ubacs et par régions, feuillus plus clairs et plus
  // jaunes ailleurs ; à la limite des deux, les peuplements se mêlent arbre par arbre
  float stands = vegetationNoise(p.xz, vec2(-19.3, 7.7), 3, 6, 0.6, depthFootprint);
  float needles = clamp(0.3 + 1.2 * stands - 0.3 * sunny + (p.y - uVegetation + 900.0) / 700.0, 0.0, 1.0);
  const vec3 broadleaf = vec3(0.075, 0.105, 0.04);
  const vec3 conifer = vec3(0.04, 0.068, 0.05);
  // Canopée inégale de 90 à 12 m (taches sombres, trouées), visible plus loin que les houppiers
  float canopy = 1.0 + 0.3 * vegetationNoise(p.xz, vec2(53.1, -21.7), 6, 9, 0.7, depthFootprint);
  // Sous les arbres, le sol est dans l'ombre
  vec3 under = mix(grass, vec3(0.04, 0.055, 0.024), forest);
  // Au loin, le mélange moyen : vus d'en haut, les houppiers couvrent environ les quatre cinquièmes de la part
  // boisée, leur côté au soleil plus éclairé que le sol ; vus de biais, ils masquent le sol entre eux
  float crownCover = mix(0.8 * min(1.2 * forest, 1.0), min(1.5 * forest, 1.0), 1.0 - smoothstep(0.1, 0.5, cosView));
  vec3 green = mix(under, 1.15 * mix(broadleaf, conifer, needles) * canopy, crownCover);
  // De près, chaque houppier : un dôme bosselé éclairé de côté (normale inclinée), plus clair au sommet, de teinte
  // propre à l'arbre et à son essence, effacé sous deux à quatre pixels. Vus en rasant, ces dômes plats
  // deviendraient des ellipses peintes au sol, et tout près, de larges facettes : ils s'effacent aussi
  float crownCell = uScale / exp2(float(CROWN_OCTAVE));
  float crownFade = smoothstep(2.0 * depthFootprint, 4.0 * depthFootprint, crownCell)
    * smoothstep(0.1, 0.35, cosView) * smoothstep(150.0 * footprint, 50.0 * footprint, crownCell);
  if (forest > 0.0 && crownFade > 0.0) {
    vec4 tree = crowns(p.xz, CROWN_OCTAVE, forest);
    tree.x += 0.2 * vegetationNoise(p.xz, vec2(-3.9, 27.1), 10, 11, 0.6, depthFootprint);
    float inside = smoothstep(0.0, 0.15, tree.x);
    vec3 leaf = mix(broadleaf, conifer, step(tree.w, needles)) * canopy * (0.75 + 0.5 * tree.w)
      * (0.85 + 0.3 * min(tree.x, 1.0));
    green = mix(green, mix(under, leaf, inside), crownFade);
    s.normal = normalize(s.normal - vegetation * crownFade * inside * CROWN_TILT * vec3(tree.y, 0.0, tree.z));
  }
  // Steppe de transition : buissons sombres épars sur l'herbe sèche claire
  float scrub = 0.3 * steppe * (1.0 - smoothstep(0.5, 0.9, desert));
  float shrubFade = smoothstep(2.0 * depthFootprint, 4.0 * depthFootprint, uScale / exp2(float(SHRUB_OCTAVE)))
    * smoothstep(0.1, 0.35, cosView);
  vec3 shrub = vec3(0.1, 0.095, 0.05);
  float shrubs = 0.7 * scrub;
  if (scrub > 0.0 && shrubFade > 0.0) {
    vec4 bush = crowns(p.xz, SHRUB_OCTAVE, scrub);
    shrubs = mix(shrubs, smoothstep(0.0, 0.3, bush.x), shrubFade);
  }
  green = mix(green, shrub, shrubs);
  col = mix(col, green, vegetation);

  // Sable : plages des côtes marines (pas des lacs), de largeur variable, et tout le plat en désert
  float coastal = 1.0 - smoothstep(0.22, 0.3, c.x);
  float beachTop = uWater + 1.0 + 3.5 * (0.5 + 0.5 * flatVariation);
  float beach = coastal * (1.0 - smoothstep(beachTop - 1.0, beachTop, p.y));
  float sand = max(beach, desert * lowland(c.x)) * smoothstep(0.6, 0.85, mix(s.normal.y, s.coarse.y, 0.5));
  // Sable de plage beige doré, sable du désert ocre orangé
  vec3 sandColor = mix(vec3(0.76, 0.63, 0.41), vec3(0.76, 0.47, 0.23), desert) * (0.94 + 0.12 * flatVariation);
  col = mix(col, sandColor, sand);

  // Rive mouillée : sable ou terre plus sombres juste au-dessus de l'eau
  float wet = 1.0 - smoothstep(uWater + 0.2, uWater + 1.2 + 0.6 * flatVariation, p.y);
  col *= 1.0 - 0.4 * wet;

  // Neige : la limite monte sur les versants au soleil et en climat aride ; elle tient dans les creux et
  // sur les pentes douces, moins sur les bosses ventées
  float sunward = dot(slopeDir, normalize(uSunDir.xz + vec2(1e-4))) / max(length(slopeDir), 0.05)
    * smoothstep(0.05, 0.3, length(slopeDir));
  float snowLine = uSnow + 120.0 * sunward + 400.0 * desert;
  float hold = mix(s.normal.y, s.coarse.y, 0.85) - 0.05 * s.cavity + min((p.y - snowLine) * 0.0002, 0.1);
  float snow = smoothstep(snowLine - 150.0, snowLine + 150.0, p.y + variation * 300.0) * smoothstep(0.5, 0.7, hold);
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
