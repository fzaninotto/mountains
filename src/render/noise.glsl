// ---------- Bruits ----------
// Les cellules sont des uint décalés par l'origine de la caméra (voir src/terrain/origins.ts) : x est la position
// fractionnaire dans l'espace du bruit, cell la cellule entière qui s'y ajoute.

// Hash entier « Integer Hash III » d'Inigo Quilez, dans [0, 1]
float hash(uvec2 x) {
  uvec2 q = 1103515245u * ((x >> 1u) ^ x.yx);
  uint n = 1103515245u * (q.x ^ (q.y >> 3u));
  return float(n) * (1.0 / 4294967295.0);
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

// Gradient unitaire pseudo-aléatoire du plan
vec2 gradient2(uvec2 i) {
  float angle = hash(i) * 6.2831853;
  return vec2(cos(angle), sin(angle));
}

// Bruit de gradient 2D (type Perlin) avec dérivées analytiques : (valeur, d/dx, d/dy), de valeur absolue inférieure à
// GRADIENT_NOISE_SCALE / √2. Il est nul aux sommets de la grille et sa pente se répartit sur toute la cellule ; le
// value noise, plat aux sommets et raide entre eux, ferait des crêtes en murs étroits autour de fonds plats
vec3 gradientNoised(vec2 x, uvec2 cell) {
  vec2 fl = floor(x);
  vec2 f = x - fl;
  uvec2 i = uvec2(ivec2(fl)) + cell;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = gradient2(i);
  vec2 gb = gradient2(i + uvec2(1u, 0u));
  vec2 gc = gradient2(i + uvec2(0u, 1u));
  vec2 gd = gradient2(i + uvec2(1u, 1u));
  float va = dot(ga, f);
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float k = va - vb - vc + vd;
  return GRADIENT_NOISE_SCALE * vec3(
    va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k,
    ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * k + vec2(vb, vc) - va)
  );
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
