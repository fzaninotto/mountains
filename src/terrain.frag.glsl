#version 300 es
precision highp float;
precision highp int;

#define MAX_OCT 20

uniform vec2 uResolution;
uniform float uCamY;
uniform mat3 uCamRot;
uniform float uFocal;
uniform vec3 uSunDir;
uniform float uScale;
uniform float uHeight;
uniform float uGain;
uniform float uMaxH;
uniform float uDetail;
uniform float uStep;
uniform float uWater;
uniform float uVegetation;
uniform float uSnow;
uniform float uFog;
uniform float uExposure;
uniform vec2 uOctFrac[MAX_OCT];
uniform uvec2 uOctCell[MAX_OCT];
uniform vec2 uMatFrac;
uniform uvec2 uMatCell;

out vec4 outColor;

const mat2 M2 = mat2(0.8, -0.6, 0.6, 0.8);
const float MATERIAL_SCALE = 350.0;
const float TMAX = 80000.0;
// Identiques à noise.ts
const float SNOW_SMOOTH_WAVELENGTH = 60.0;
const float SNOW_FLATTENING = 0.85;

float pixelAngle;
vec3 sunCol;
vec3 skyCol;
vec3 horizonCol;

// ---------- Bruit (identique à noise.ts) ----------

float hash(uvec2 x) {
  uvec2 q = 1103515245u * ((x >> 1u) ^ x.yx);
  uint n = 1103515245u * (q.x ^ (q.y >> 3u));
  return float(n) * (1.0 / 4294967295.0);
}

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

// La neige comble les petits reliefs sur les zones peu pentues au-dessus de la limite des neiges
float snowSmoothing(float h, float slope) {
  return SNOW_FLATTENING * smoothstep(uSnow - 100.0, uSnow + 150.0, h) * (1.0 - smoothstep(0.35, 0.7, slope));
}

// fBm à dérivées : les pentes accumulées atténuent les octaves suivantes, ce qui imite l'érosion
float terrain(vec2 x, float octaves) {
  vec2 q = x / uScale;
  mat2 jacobian = mat2(1.0 / uScale);
  float a = 0.0, b = 1.0, wavelength = uScale;
  vec2 d = vec2(0.0);
  vec2 grad = vec2(0.0);
  for (int i = 0; i < MAX_OCT; i++) {
    float w = clamp(octaves - float(i), 0.0, 1.0);
    if (w <= 0.0) break;
    vec3 n = noised(uOctFrac[i] + q, uOctCell[i]);
    d += n.yz;
    float amplitude = w * b / (1.0 + dot(d, d));
    if (wavelength < SNOW_SMOOTH_WAVELENGTH) amplitude *= 1.0 - snowSmoothing(uHeight * a, uHeight * length(grad));
    a += amplitude * n.x;
    grad += amplitude * (transpose(jacobian) * n.yz);
    b *= uGain;
    q = 2.0 * (M2 * q);
    jacobian = 2.0 * (M2 * jacobian);
    wavelength *= 0.5;
  }
  return uHeight * a;
}

// Nombre d'octaves dont la longueur d'onde dépasse deux pixels à la distance t
float lod(float t) {
  float footprint = max(t, 0.01) * pixelAngle * uDetail;
  return clamp(log2(uScale / (2.0 * footprint)), 1.0, float(MAX_OCT));
}

// ---------- Raymarching ----------

float march(vec3 ro, vec3 rd, float tmin, float tmax, float tOffset) {
  float t = tmin;
  if (ro.y > uMaxH) {
    if (rd.y >= 0.0) return -1.0;
    t = max(t, (ro.y - uMaxH) / -rd.y);
  }
  float tPrev = t;
  for (int i = 0; i < 400; i++) {
    if (t > tmax) return -1.0;
    vec3 p = ro + rd * t;
    if (p.y > uMaxH && rd.y >= 0.0) return -1.0;
    float octaves = lod(t + tOffset);
    float eps = (t + tOffset) * pixelAngle * 0.5;
    float dy = p.y - terrain(p.xz, octaves);
    if (dy < eps) {
      float lo = tPrev, hi = t;
      for (int j = 0; j < 6; j++) {
        float mid = 0.5 * (lo + hi);
        vec3 q = ro + rd * mid;
        if (q.y - terrain(q.xz, octaves) < eps) hi = mid; else lo = mid;
      }
      return hi;
    }
    tPrev = t;
    t += max(dy * uStep, eps);
  }
  return t < tmax ? t : -1.0;
}

float softShadow(vec3 ro, vec3 rd, float tOffset) {
  float res = 1.0;
  float t = max(0.5, tOffset * pixelAngle * 2.0);
  for (int i = 0; i < 80; i++) {
    vec3 p = ro + rd * t;
    if (p.y > uMaxH || t > 30000.0) break;
    float h = p.y - terrain(p.xz, lod(tOffset + t));
    res = min(res, 12.0 * h / t);
    if (res < 0.001) break;
    t += clamp(h * 0.5, 0.3 + t * 0.02, 400.0 + t * 0.1);
  }
  return smoothstep(0.0, 1.0, clamp(res, 0.0, 1.0));
}

vec3 calcNormal(vec3 p, float t) {
  float octaves = lod(t);
  float e = max(t * pixelAngle, 0.001);
  float h = terrain(p.xz, octaves);
  return normalize(vec3(
    h - terrain(p.xz + vec2(e, 0.0), octaves),
    e,
    h - terrain(p.xz + vec2(0.0, e), octaves)
  ));
}

// ---------- Éclairage ----------

vec3 sky(vec3 rd) {
  vec3 col = mix(horizonCol, skyCol, pow(max(rd.y, 0.0), 0.45));
  float s = max(dot(rd, uSunDir), 0.0);
  col += sunCol * (0.12 * pow(s, 6.0) + 0.35 * pow(s, 64.0));
  col += sunCol * 8.0 * smoothstep(0.9997, 0.9999, s);
  return col;
}

vec3 applyFog(vec3 col, vec3 ro, vec3 rd, float t) {
  const float falloff = 1.0 / 1500.0;
  float k = rd.y * falloff;
  float optical = uFog * exp(-ro.y * falloff) * (abs(k) > 1e-7 ? (1.0 - exp(min(-t * k, 80.0))) / k : t);
  float amount = 1.0 - exp(-max(optical, 0.0));
  float s = pow(max(dot(rd, uSunDir), 0.0), 8.0);
  vec3 fogCol = mix(horizonCol, sunCol * 0.9, s * 0.6);
  return mix(col, fogCol, amount);
}

vec3 terrainAlbedo(vec3 p, vec3 n) {
  float variation = noised(uMatFrac + p.xz / MATERIAL_SCALE, uMatCell).x;
  vec3 col = mix(vec3(0.13, 0.11, 0.09), vec3(0.27, 0.24, 0.21), 0.5 + 0.5 * variation);

  float vegetation = smoothstep(0.78, 0.92, n.y)
    * (1.0 - smoothstep(uVegetation - 200.0, uVegetation + 200.0, p.y + variation * 250.0));
  col = mix(col, mix(vec3(0.07, 0.10, 0.03), vec3(0.18, 0.20, 0.07), 0.5 + 0.5 * variation), vegetation);

  float snow = smoothstep(uSnow - 150.0, uSnow + 150.0, p.y + variation * 300.0)
    * smoothstep(0.55, 0.72, n.y + (p.y - uSnow) * 0.0001);
  return mix(col, vec3(0.85, 0.88, 0.92), snow);
}

vec3 shadeTerrain(vec3 p, vec3 rd, float t) {
  vec3 n = calcNormal(p, t);
  vec3 albedo = terrainAlbedo(p, n);
  float dif = max(dot(n, uSunDir), 0.0);
  float shadow = dif > 0.0 ? softShadow(p + n * max(0.05, t * pixelAngle * 2.0), uSunDir, t) : 0.0;
  float ambient = 0.5 + 0.5 * n.y;
  float bounce = max(dot(n, normalize(vec3(-uSunDir.x, 0.0, -uSunDir.z))), 0.0) * (1.0 - n.y);
  vec3 light = sunCol * dif * shadow * 3.2 + skyCol * ambient + horizonCol * bounce * 0.25;
  return albedo * light;
}

vec3 shadeWater(vec3 p, vec3 rd, float t) {
  vec3 r = reflect(rd, vec3(0.0, 1.0, 0.0));
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(-rd.y, 0.0), 5.0);
  float tr = march(p + vec3(0.0, 0.05, 0.0), r, 0.5, TMAX, t);
  vec3 reflection = tr > 0.0 ? applyFog(shadeTerrain(p + r * tr, r, t + tr), p, r, tr) : sky(r);
  float shadow = softShadow(p, uSunDir, t);
  vec3 deep = vec3(0.01, 0.03, 0.04) * (skyCol + sunCol * shadow * max(uSunDir.y, 0.0) * 2.0);
  return mix(deep, reflection, fresnel);
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  pixelAngle = 2.0 / (uResolution.y * uFocal);

  float sh = uSunDir.y;
  sunCol = mix(vec3(1.0, 0.42, 0.15), vec3(1.0, 0.9, 0.78), smoothstep(0.0, 0.5, sh)) * smoothstep(-0.08, 0.04, sh);
  skyCol = mix(vec3(0.02, 0.03, 0.06), vec3(0.2, 0.38, 0.7), smoothstep(-0.15, 0.25, sh));
  horizonCol = mix(
    vec3(0.08, 0.07, 0.09),
    mix(vec3(0.85, 0.55, 0.4), vec3(0.62, 0.72, 0.85), smoothstep(0.0, 0.35, sh)),
    smoothstep(-0.15, 0.05, sh)
  );

  vec2 uv = (2.0 * gl_FragCoord.xy - uResolution) / uResolution.y;
  vec3 rd = normalize(uCamRot * vec3(uv, uFocal));
  vec3 ro = vec3(0.0, uCamY, 0.0);

  float tWater = rd.y < 0.0 ? (uWater - ro.y) / rd.y : -1.0;
  float t = march(ro, rd, 0.1, tWater > 0.0 ? tWater : TMAX, 0.0);

  vec3 col;
  if (t > 0.0) col = applyFog(shadeTerrain(ro + rd * t, rd, t), ro, rd, t);
  else if (tWater > 0.0) col = applyFog(shadeWater(ro + rd * tWater, rd, tWater), ro, rd, tWater);
  else col = sky(rd);

  outColor = vec4(pow(aces(col * uExposure), vec3(1.0 / 2.2)), 1.0);
}
