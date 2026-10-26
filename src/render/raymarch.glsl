// ---------- Raymarching ----------

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
    if (dy < eps) {
      // Affine l'impact par dichotomie entre le pas précédent et celui-ci
      float lo = tPrev, hi = t;
      for (int j = 0; j < 6; j++) {
        float mid = 0.5 * (lo + hi);
        if (surfaceDistance(ro + rd * mid, t + tOffset) < eps) hi = mid; else lo = mid;
      }
      return hi;
    }
    tPrev = t;
    t += max(dy * uStep, eps);
  }
  // Budget de pas épuisé (rayon rasant) : on considère le terrain touché, la brume masque l'imprécision
  return t < tmax ? t : -1.0;
}

// Ombre douce vers la direction rd (1 : éclairé, 0 : à l'ombre), d'après la distance minimale au relief
float softShadow(vec3 ro, vec3 rd, float tOffset) {
  float res = 1.0;
  float t = max(0.5, tOffset * pixelAngle * 2.0);
  for (int i = 0; i < 80; i++) {
    vec3 p = ro + rd * t;
    if (p.y > uMaxH || t > 30000.0) break;
    float h = surfaceDistance(p, tOffset + t);
    res = min(res, 12.0 * h / t);
    if (res < 0.001) break;
    t += clamp(h * 0.5, 0.3 + t * 0.02, 400.0 + t * 0.1);
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
