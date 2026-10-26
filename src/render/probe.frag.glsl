// ---------- Sondes ----------
// Assemblé par renderer.ts à la suite de : constantes générées, uniforms, noise, climate, rock et height.
// Chaque ligne de la cible répond à une sonde placée en (0, uCamY, 0), l'origine des bruits étant celle du point
// sondé ; chaque pixel de la ligne calcule une valeur (voir PROBE_VALUES dans renderer.ts). Les flottants sont écrits
// bit à bit dans les quatre octets d'un pixel RGBA8 : la relecture est exacte, sans extension.

// Octaves du sol sondé (détail d'environ 10 cm)
const float GROUND_OCTAVES = 16.0;
// Recherche du relief entre la caméra et le soleil : nombre de pas et distance du dernier (m)
const int SUN_STEPS = 10;
const float SUN_RANGE = 50000.0;
// Rayon apparent du soleil (rad) : le relief le masque progressivement sur cette marge
const float SUN_RADIUS = 0.01;
// Points sondés le long du trajet prévu de la caméra
const int AHEAD_STEPS = 6;

// Trajet horizontal prévu de la caméra d'ici la prochaine réponse (m)
uniform vec2 uAhead;
// 1 : uCamY est une hauteur au-dessus du sol (ou de l'eau), et non une altitude
uniform float uRelative;

float ground(vec2 x) {
  return terrain(x, GROUND_OCTAVES);
}

// Relief entre la caméra et le soleil, sondé vers le soleil par pas croissants, le premier à la hauteur de la caméra
// au-dessus du sol, le dernier à SUN_RANGE : (part visible du soleil, distance et profondeur sous son sommet du rayon
// vers le soleil quand le relief le cache)
vec3 sunOcclusion(float camY, float below) {
  float visible = 1.0, shadowDistance = 0.0, shadowDepth = 0.0;
  float first = max(5.0, camY - below);
  float growth = max(1.2, pow(SUN_RANGE / first, 1.0 / float(SUN_STEPS - 1)));
  float d = first;
  for (int i = 0; i < SUN_STEPS; i++, d *= growth) {
    float y = camY + uSunDir.y * d;
    if (y > uMaxH) break;
    float g = max(ground(uSunDir.xz * d), uWater);
    visible = min(visible, smoothstep(-SUN_RADIUS, SUN_RADIUS, (y - g) / d));
    if (g - y > shadowDepth) {
      shadowDistance = d;
      shadowDepth = g - y;
    }
  }
  // Le soleil couché n'éblouit plus
  return vec3(visible * smoothstep(-0.02, 0.05, uSunDir.y), shadowDistance, shadowDepth);
}

float probe(int index) {
  float h = ground(vec2(0.0));
  if (index == 0) return h;
  if (index <= 3) return climate(vec2(0.0))[index - 1];
  if (index == 4) {
    float highest = h;
    for (int i = 1; i <= AHEAD_STEPS; i++) highest = max(highest, ground(uAhead * float(i) / float(AHEAD_STEPS)));
    return highest;
  }
  float below = max(h, uWater);
  return sunOcclusion(uRelative > 0.5 ? below + uCamY : uCamY, below)[index - 5];
}

void main() {
  uint bits = floatBitsToUint(probe(int(gl_FragCoord.x)));
  outColor = vec4(uvec4(bits, bits >> 8u, bits >> 16u, bits >> 24u) & 0xffu) / 255.0;
}
