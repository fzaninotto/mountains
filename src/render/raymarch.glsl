// ---------- Raymarching ----------

// Sur-relaxation des pas de march() : on avance de OMEGA fois la distance sûre, avec repli si on a trop avancé
const float OMEGA = 1.6;

// Distance le long du rayon jusqu'au terrain, ou -1 s'il n'est pas touché avant tmax.
// tOffset : distance déjà parcourue depuis la caméra (rayons réfléchis), qui fixe le niveau de détail
float march(vec3 ro, vec3 rd, float tmin, float tmax, float tOffset) {
  float t = tmin;
  // Au-dessus du relief, on saute directement à son altitude maximale
  if (ro.y > uMaxH) {
    if (rd.y >= 0.0) return -1.0;
    t = max(t, (ro.y - uMaxH) / -rd.y);
  }
  float tPrev = t;
  // Rayon sûr et précision au pas précédent, facteur de sur-relaxation, et si le dernier pas l'a utilisé
  float rPrev = 0.0;
  float epsPrev = 0.0;
  float omega = OMEGA;
  bool relaxed = false;
  for (int i = 0; i < 400; i++) {
    // Le dernier pas peut enjamber tmax (la surface de l'eau) : on teste encore le terrain exactement à tmax
    if (t > tmax) {
      if (tPrev >= tmax) return -1.0;
      t = tmax;
    }
    vec3 p = ro + rd * t;
    if (p.y > uMaxH && rd.y >= 0.0) return -1.0;
    // Précision visée : un demi-pixel à cette distance
    float eps = (t + tOffset) * pixelAngle * 0.5;
    float dy = surfaceDistance(p, t + tOffset);
    float r = dy * uStep;
    // Les intervalles sûrs autour de tPrev et de t ne se recouvrent plus (ou dy < 0) : le pas sur-relaxé
    // a pu traverser le relief, on refait un pas normal depuis tPrev
    if (relaxed && r + rPrev < t - tPrev) {
      t = tPrev + max(rPrev, epsPrev);
      omega = 1.0;
      relaxed = false;
      continue;
    }
    if (dy < eps) {
      // Affine l'impact par dichotomie entre le pas précédent et celui-ci
      float lo = tPrev, hi = t;
      for (int j = 0; j < 6; j++) {
        float mid = 0.5 * (lo + hi);
        if (surfaceDistance(ro + rd * mid, t + tOffset) < eps) hi = mid; else lo = mid;
      }
      return hi;
    }
    float stepLen = max(r * omega, eps);
    relaxed = r * omega > eps && omega > 1.0;
    tPrev = t;
    rPrev = r;
    epsPrev = eps;
    t += stepLen;
  }
  // Budget de pas épuisé (rayon rasant) : on considère le terrain touché, la brume masque l'imprécision
  return t < tmax ? t : -1.0;
}

// Ombre douce vers la direction rd (1 : éclairé, 0 : à l'ombre), d'après la distance minimale au relief.
// Le niveau de détail croît SHADOW_LOD fois plus vite le long du rayon d'ombre : au départ le détail
// est celui du pixel (pas d'acné), plus loin les octaves fines et le creusement s'effacent d'eux-mêmes
const int SHADOW_STEPS = 56;
const float SHADOW_LOD = 4.0;
float softShadow(vec3 ro, vec3 rd, float tOffset, int maxSteps) {
  float res = 1.0;
  float t = max(0.5, tOffset * pixelAngle * 2.0);
  for (int i = 0; i < SHADOW_STEPS; i++) {
    if (i >= maxSteps) break;
    vec3 p = ro + rd * t;
    if (p.y > uMaxH || t > 30000.0) break;
    float h = surfaceDistance(p, tOffset + SHADOW_LOD * t);
    res = min(res, 12.0 * h / t);
    if (res < 0.001) break;
    t += clamp(h * 0.8, 0.3 + t * 0.03, 400.0 + t * 0.1);
  }
  return smoothstep(0.0, 1.0, clamp(res, 0.0, 1.0));
}

// Normale par différences finies sur un tétraèdre, à l'échelle d'un pixel
vec3 calcNormal(vec3 p, float t) {
  const vec2 k = vec2(1.0, -1.0);
  float e = max(t * pixelAngle, 0.001);
  return normalize(
    k.xyy * surfaceDistance(p + k.xyy * e, t) + k.yyx * surfaceDistance(p + k.yyx * e, t) +
    k.yxy * surfaceDistance(p + k.yxy * e, t) + k.xxx * surfaceDistance(p + k.xxx * e, t)
  );
}
