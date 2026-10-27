// ---------- Bruits ----------
// Les cellules sont des uint décalés par l'origine de la caméra (voir src/terrain/origins.ts) : x est la position
// fractionnaire dans l'espace du bruit, cell la cellule entière qui s'y ajoute.

// Hash entier « Integer Hash III » d'Inigo Quilez
uint hashBits(uvec2 x) {
  uvec2 q = 1103515245u * ((x >> 1u) ^ x.yx);
  return 1103515245u * (q.x ^ (q.y >> 3u));
}

// Le même, dans [0, 1]
float hash(uvec2 x) {
  return float(hashBits(x)) * (1.0 / 4294967295.0);
}

float hash3(uvec3 i) {
  return hash(uvec2(i.x ^ (i.y * 2654435761u), i.z));
}

// Value noise 2D avec dérivées analytiques : (valeur dans [-1, 1], d/dx, d/dy)
vec3 noised(vec2 x, uvec2 cell) {
  vec2 fl = floor(x);
  vec2 f = x - fl;
  uvec2 i = uvec2(ivec2(fl)) + cell;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  float a = hash(i);
  float b = hash(i + uvec2(1u, 0u));
  float c = hash(i + uvec2(0u, 1u));
  float d = hash(i + uvec2(1u, 1u));
  float k1 = b - a, k2 = c - a, k4 = a - b - c + d;
  return vec3(
    -1.0 + 2.0 * (a + k1 * u.x + k2 * u.y + k4 * u.x * u.y),
    2.0 * du * vec2(k1 + k4 * u.y, k2 + k4 * u.x)
  );
}

// Value noise 2D mêlé (part g) d'un bruit de gradient tiré des mêmes hachages, avec dérivées : (valeur dans [-1, 1],
// d/dx, d/dy). Avec g = 0, c'est exactement noised(). Le value noise seul, plat à chaque sommet de sa grille, y pose
// dômes et cuvettes ; le bruit de gradient seul y passe toujours par zéro, et ses crêtes 1 - |n| y feraient des cônes
// réguliers
vec3 hybridNoised(vec2 x, uvec2 cell, float g) {
  vec2 fl = floor(x);
  vec2 f = x - fl;
  uvec2 i = uvec2(ivec2(fl)) + cell;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  uvec4 h = uvec4(hashBits(i), hashBits(i + uvec2(1u, 0u)), hashBits(i + uvec2(0u, 1u)), hashBits(i + uvec2(1u, 1u)));
  vec4 value = vec4(h) * (1.0 / 4294967295.0);
  // Gradients unitaires tirés des bits du même hachage, sans multiplication ni table : la seconde composante (bits
  // forts mêlés aux faibles) est indépendante de la valeur (bits forts) comme de la première (bits faibles)
  vec4 gx = vec4(h & 0xffffu) * (1.0 / 32767.5) - 1.0;
  vec4 gy = vec4((h ^ (h >> 16u)) & 0xffffu) * (1.0 / 32767.5) - 1.0;
  vec4 norm = inversesqrt(gx * gx + gy * gy + 1e-6);
  gx *= norm;
  gy *= norm;
  vec2 ga = vec2(gx.x, gy.x), gb = vec2(gx.y, gy.y), gc = vec2(gx.z, gy.z), gd = vec2(gx.w, gy.w);
  vec4 dots = vec4(dot(ga, f), dot(gb, f - vec2(1.0, 0.0)), dot(gc, f - vec2(0.0, 1.0)), dot(gd, f - vec2(1.0, 1.0)));
  // Valeurs aux sommets : value noise (dans [-1, 1]) et bruit de gradient (×1,4, vers la même étendue), mêlés
  vec4 v = (1.0 - g) * (2.0 * value - 1.0) + (1.4 * g) * dots;
  float k1 = v.y - v.x, k2 = v.z - v.x, k4 = v.x - v.y - v.z + v.w;
  // Gradients aux sommets, interpolés (seulement pour la part de gradient)
  vec2 gi = (1.4 * g) * (ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd));
  return vec3(v.x + k1 * u.x + k2 * u.y + k4 * u.x * u.y, du * vec2(k1 + k4 * u.y, k2 + k4 * u.x) + gi);
}

// Gradient unitaire pseudo-aléatoire, uniforme sur la sphère
vec3 gradient3(uvec3 i) {
  float angle = hash3(i) * 6.2831853;
  float z = hash3(i + uvec3(40503u, 2654435u, 97u)) * 2.0 - 1.0;
  float r = sqrt(1.0 - z * z);
  return vec3(r * cos(angle), r * sin(angle), z);
}

// Bruit de gradient 3D (type Perlin), environ dans [-1, 1] : contrairement au value noise, il ne laisse pas
// deviner de cellules cubiques. Gradients uniformes sur la sphère, plus coûteux : il sert à la couleur de la roche
float gradientNoise3(vec3 x, uvec3 cell) {
  vec3 fl = floor(x);
  vec3 f = x - fl;
  uvec3 i = uvec3(ivec3(fl)) + cell;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(gradient3(i), f);
  float b = dot(gradient3(i + uvec3(1u, 0u, 0u)), f - vec3(1.0, 0.0, 0.0));
  float c = dot(gradient3(i + uvec3(0u, 1u, 0u)), f - vec3(0.0, 1.0, 0.0));
  float d = dot(gradient3(i + uvec3(1u, 1u, 0u)), f - vec3(1.0, 1.0, 0.0));
  float e = dot(gradient3(i + uvec3(0u, 0u, 1u)), f - vec3(0.0, 0.0, 1.0));
  float g = dot(gradient3(i + uvec3(1u, 0u, 1u)), f - vec3(1.0, 0.0, 1.0));
  float h = dot(gradient3(i + uvec3(0u, 1u, 1u)), f - vec3(0.0, 1.0, 1.0));
  float k = dot(gradient3(i + uvec3(1u, 1u, 1u)), f - vec3(1.0, 1.0, 1.0));
  return 1.8 * mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, g, u.x), mix(h, k, u.x), u.y), u.z);
}

// Gradient pris parmi les 12 arêtes du cube (Perlin amélioré), produit scalaire avec f
float edgeGradient(uvec3 i, vec3 f) {
  int k = int(hash3(i) * 11.999);
  float u = k < 8 ? f.x : f.y;
  float v = k < 4 ? f.y : f.z;
  return ((k & 1) == 0 ? u : -u) + ((k & 2) == 0 ? v : -v);
}

// Bruit de gradient 3D bon marché, environ dans [-1, 1] : un hachage par sommet comme le value noise, sans en
// laisser deviner les cellules cubiques
float edgeGradientNoise3(vec3 x, uvec3 cell) {
  vec3 fl = floor(x);
  vec3 f = x - fl;
  uvec3 i = uvec3(ivec3(fl)) + cell;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = edgeGradient(i, f);
  float b = edgeGradient(i + uvec3(1u, 0u, 0u), f - vec3(1.0, 0.0, 0.0));
  float c = edgeGradient(i + uvec3(0u, 1u, 0u), f - vec3(0.0, 1.0, 0.0));
  float d = edgeGradient(i + uvec3(1u, 1u, 0u), f - vec3(1.0, 1.0, 0.0));
  float e = edgeGradient(i + uvec3(0u, 0u, 1u), f - vec3(0.0, 0.0, 1.0));
  float g = edgeGradient(i + uvec3(1u, 0u, 1u), f - vec3(1.0, 0.0, 1.0));
  float h = edgeGradient(i + uvec3(0u, 1u, 1u), f - vec3(0.0, 1.0, 1.0));
  float k = edgeGradient(i + uvec3(1u, 1u, 1u), f - vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, g, u.x), mix(h, k, u.x), u.y), u.z);
}
