// ---------- Roche en 3D ----------
// Un champ de hauteur ne peut que s'étirer sur les parois verticales : leur détail fin et la couleur de la roche
// viennent d'un bruit 3D, dont chaque octave a sa propre orientation (voir src/terrain/origins.ts).

// Poids de chaque octave dans la teinte de la roche
const float ROCK_STAIN_WEIGHTS[ROCK_OCTAVES] = float[ROCK_OCTAVES](0.32, 0.22, 0.17, 0.13, 0.1, 0.06);
// Le creusement n'utilise que les octaves de 18 m et moins : les plus grandes perceraient les arêtes fines
const int ROCK_CARVE_FIRST = 2;
// Profondeur du creusement relative à la longueur d'onde, et profondeur maximale cumulée
const float ROCK_CARVE = 0.15;
const float ROCK_CARVE_MAX = 0.15 * (18.0 + 7.0 + 2.6 + 1.0);
// Le creusement est pentu : sur les parois, la distance est réduite d'autant pour que les rayons ne la traversent pas
const float ROCK_CARVE_LIPSCHITZ = 2.0;

// Position de p (x, z relatifs à la caméra, y absolu) dans l'espace de l'octave i
vec3 rockSpace(vec3 p, int i) {
  return uRockFrac[i] + uRockRot[i] * p / ROCK_WAVELENGTHS[i];
}

// Les octaves plus fines que quelques pixels sont effacées
float rockFade(int i, float footprint) {
  return smoothstep(2.0 * footprint, 4.0 * footprint, ROCK_WAVELENGTHS[i]);
}

// Profondeur (positive, m) dont la paroi est creusée : la surface ne fait que reculer, jamais avancer
float rockCarve(vec3 p, float footprint) {
  float carve = 0.0;
  for (int i = ROCK_CARVE_FIRST; i < ROCK_OCTAVES; i++) {
    float fade = rockFade(i, footprint);
    if (fade <= 0.0) break;
    // |n| ne s'annule que sur des surfaces : entre deux creux reste une arête vive, comme une roche fracturée
    carve += fade * ROCK_CARVE * ROCK_WAVELENGTHS[i] * abs(valueNoise3(rockSpace(p, i), uRockCell[i]));
  }
  return carve;
}

// Teinte de la roche, environ dans [-1, 1] : fBm de bruit de gradient sur six échelles (120 m à 1 m)
float rockStain(vec3 p, float footprint) {
  float r = 0.0;
  for (int i = 0; i < ROCK_OCTAVES; i++) {
    float fade = rockFade(i, footprint);
    if (fade <= 0.0) break;
    r += fade * ROCK_STAIN_WEIGHTS[i] * gradientNoise3(rockSpace(p, i) + 0.5, uRockCell[i]);
  }
  return r * 1.6;
}
