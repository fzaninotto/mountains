// ---------- Courbure terrestre ----------
// Le monde reste plat en coordonnées : à la distance horizontale d de l'origine d'un rayon, le sol s'abaisse de
// d²/(2 EARTH_RADIUS) sous le plan tangent, ce qui revient à relever d'autant le rayon au-dessus du relief. Un rayon
// secondaire (ombre, reflet) part d'un point dont l'altitude est déjà la vraie : la courbure se compte depuis lui
const float CURVE = 0.5 / EARTH_RADIUS;

// Point du rayon à la distance t, dans le repère du relief (y : altitude au-dessus de la sphère)
vec3 rayPoint(vec3 ro, vec3 rd, float t) {
  return ro + rd * t + vec3(0.0, CURVE * t * t * dot(rd.xz, rd.xz), 0.0);
}

// Direction du rayon à la distance t dans ce repère : il s'éloigne de la sphère de plus en plus vite
vec3 rayDir(vec3 rd, float t) {
  return normalize(rd + vec3(0.0, 2.0 * CURVE * t * dot(rd.xz, rd.xz), 0.0));
}

// Première distance où le rayon parti au-dessus de l'altitude y redescend jusqu'à elle (sphère : second degré),
// -1 s'il passe au-dessus ou part dessous
float rayToLevel(vec3 ro, vec3 rd, float y) {
  float h = ro.y - y;
  float disc = rd.y * rd.y - 4.0 * CURVE * dot(rd.xz, rd.xz) * h;
  if (h <= 0.0 || rd.y >= 0.0 || disc < 0.0) return -1.0;
  // Plus petite racine sous une forme qui reste précise quand la courbure est négligeable
  return 2.0 * h / (sqrt(disc) - rd.y);
}

// Distance du point tangent si le rayon frôle l'altitude y, sans l'atteindre, à moins d'un pixel au-dessus : il touche
// alors l'horizon. -1 sinon
float rayGrazesLevel(vec3 ro, vec3 rd, float y) {
  if (rd.y >= 0.0 || ro.y <= y) return -1.0;
  float a = CURVE * dot(rd.xz, rd.xz);
  float tangent = -rd.y / (2.0 * a);
  return ro.y - y - rd.y * rd.y / (4.0 * a) < tangent * lodPixelAngle ? tangent : -1.0;
}

// ---------- Raymarching ----------

// Sur-relaxation des pas de march() : on avance de OMEGA fois la distance sûre, avec repli si on a trop avancé
const float OMEGA = 1.6;

// Distance le long du rayon jusqu'au terrain, ou -1 s'il n'est pas touché avant tmax. Le rayon suit la courbure :
// elle ne fait que l'éloigner du relief, les pas calculés sans elle restent sûrs.
// tOffset : distance déjà parcourue depuis la caméra (rayons réfléchis), qui fixe le niveau de détail.
// lodScale grossit ce niveau de détail et maxSteps borne le nombre de pas (reflets moins coûteux)
float march(vec3 ro, vec3 rd, float tmin, float tmax, float tOffset, float lodScale, int maxSteps) {
  float t = tmin;
  // Pente verticale du rayon au-dessus de la sphère : rd.y + curve * t
  float curve = 2.0 * CURVE * dot(rd.xz, rd.xz);
  // Au-dessus du relief, on saute directement à son altitude maximale
  if (ro.y > uMaxH) {
    float top = rayToLevel(ro, rd, uMaxH);
    if (top < 0.0) return -1.0;
    t = max(t, top);
  }
  float tPrev = t;
  // Rayon sûr et précision au pas précédent, facteur de sur-relaxation, et si le dernier pas l'a utilisé
  float rPrev = 0.0;
  float epsPrev = 0.0;
  float omega = OMEGA;
  bool relaxed = false;
  for (int i = 0; i < 1500; i++) {
    if (i >= maxSteps) break;
    // Le dernier pas peut enjamber tmax (la surface de l'eau) : on teste encore le terrain exactement à tmax
    if (t > tmax) {
      if (tPrev >= tmax) return -1.0;
      t = tmax;
    }
    vec3 p = rayPoint(ro, rd, t);
    // Au-dessus du relief et remontant par rapport à la sphère : il ne redescendra plus
    if (p.y > uMaxH && rd.y + curve * t >= 0.0) return -1.0;
    // Précision visée : un demi-pixel de référence à cette distance. Elle ne doit pas suivre la résolution de calcul,
    // sinon les silhouettes et les rivages changeraient à chaque ajustement de la résolution de l'aperçu
    float tl = (t + tOffset) * lodScale;
    float eps = tl * lodPixelAngle * 0.5;
    float dy = surfaceDistance(p, tl);
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
        if (surfaceDistance(rayPoint(ro, rd, mid), tl) < eps) hi = mid; else lo = mid;
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
// maxSteps = 0 : pas d'ombre portée.
// Le niveau de détail croît SHADOW_LOD fois plus vite le long du rayon d'ombre : au départ le détail
// est celui du pixel (pas d'acné), plus loin les octaves fines et le creusement s'effacent d'eux-mêmes
const int SHADOW_STEPS = 56;
const float SHADOW_LOD = 4.0;
float softShadow(vec3 ro, vec3 rd, float tOffset, int maxSteps) {
  if (maxSteps == 0) return 1.0;
  float res = 1.0;
  float t = max(0.5, tOffset * pixelAngle * 2.0);
  for (int i = 0; i < SHADOW_STEPS; i++) {
    if (i >= maxSteps) break;
    vec3 p = rayPoint(ro, rd, t);
    if (p.y > uMaxH || t > 30000.0) break;
    float h = surfaceDistance(p, tOffset + SHADOW_LOD * t);
    res = min(res, 22.0 * h / t);
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
