// ---------- Éclairage et matériaux ----------

vec3 sky(vec3 rd) {
  vec3 col = mix(horizonCol, skyCol, pow(max(rd.y, 0.0), 0.45));
  float s = max(dot(rd, uSunDir), 0.0);
  col += sunCol * (0.12 * pow(s, 6.0) + 0.35 * pow(s, 64.0));
  col += sunCol * 8.0 * smoothstep(0.9997, 0.9999, s);
  return col;
}

// Brume dont la densité décroît avec l'altitude, intégrée analytiquement le long du rayon
vec3 applyFog(vec3 col, vec3 ro, vec3 rd, float t) {
  const float falloff = 1.0 / 1500.0;
  float k = rd.y * falloff;
  float optical = uFog * exp(-ro.y * falloff) * (abs(k) > 1e-7 ? (1.0 - exp(min(-t * k, 80.0))) / k : t);
  float amount = 1.0 - exp(-max(optical, 0.0));
  float s = pow(max(dot(rd, uSunDir), 0.0), 8.0);
  vec3 fogCol = mix(horizonCol, sunCol * 0.9, s * 0.6);
  return mix(col, fogCol, amount);
}

// Variation de couleur à grande échelle (375 m à 47 m) : fBm des octaves tournées du relief, décalé pour ne pas
// reproduire ses formes
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

vec3 terrainAlbedo(vec3 p, vec3 n, float t) {
  float variation = colorVariation(p.xz);
  vec3 c = climate(p.xz);
  float desert = c.y;

  // Roche : grise en climat tempéré, ocre en climat aride, tachée à plusieurs échelles
  float tone = clamp(0.5 + 0.35 * variation + 0.35 * rockStain(p, t * pixelAngle), 0.0, 1.0);
  vec3 col = mix(
    mix(vec3(0.11, 0.105, 0.1), vec3(0.27, 0.26, 0.245), tone),
    mix(vec3(0.24, 0.13, 0.07), vec3(0.4, 0.24, 0.13), tone),
    desert
  );

  // Végétation : sur le plat, sous la limite de végétation, hors désert
  float vegetation = smoothstep(0.78, 0.92, n.y) * (1.0 - desert)
    * (1.0 - smoothstep(uVegetation - 200.0, uVegetation + 200.0, p.y + variation * 250.0));
  col = mix(col, mix(vec3(0.07, 0.10, 0.03), vec3(0.18, 0.20, 0.07), 0.5 + 0.5 * variation), vegetation);

  // Sable : sur les rivages en pente douce, et sur tout le plat en désert
  float shore = 1.0 - smoothstep(uWater + 1.0, uWater + 3.5 + variation * 1.5, p.y);
  float sand = max(shore, desert * lowland(c.x)) * smoothstep(0.6, 0.85, n.y);
  col = mix(col, mix(vec3(0.42, 0.36, 0.25), vec3(0.5, 0.32, 0.16), desert), sand);

  // Neige : au-dessus de la limite des neiges, sur les pentes où elle tient (d'autant plus raides qu'on monte)
  float snow = smoothstep(uSnow - 150.0, uSnow + 150.0, p.y + variation * 300.0)
    * smoothstep(0.55, 0.72, n.y + (p.y - uSnow) * 0.0001);
  return mix(col, vec3(0.85, 0.88, 0.92), snow);
}

vec3 shadeTerrain(vec3 p, float t) {
  vec3 n = calcNormal(p, t);
  vec3 albedo = terrainAlbedo(p, n, t);
  float dif = max(dot(n, uSunDir), 0.0);
  float shadow = dif > 0.0 ? softShadow(p + n * max(0.05, t * pixelAngle * 2.0), uSunDir, t) : 0.0;
  float ambient = 0.5 + 0.5 * n.y;
  // Lumière renvoyée par le sol éclairé en face
  float bounce = max(dot(n, normalize(vec3(-uSunDir.x, 0.0, -uSunDir.z))), 0.0) * (1.0 - n.y);
  vec3 light = sunCol * dif * shadow * 3.2 + skyCol * ambient + horizonCol * bounce * 0.25;
  return albedo * light;
}

// Eau plane : reflet du terrain et du ciel selon Fresnel, fond sombre éclairé par le soleil hors de l'ombre
vec3 shadeWater(vec3 p, vec3 rd, float t) {
  vec3 r = reflect(rd, vec3(0.0, 1.0, 0.0));
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(-rd.y, 0.0), 5.0);
  float tr = march(p + vec3(0.0, 0.05, 0.0), r, 0.5, TMAX, t);
  vec3 reflection = tr > 0.0 ? applyFog(shadeTerrain(p + r * tr, t + tr), p, r, tr) : sky(r);
  float shadow = softShadow(p, uSunDir, t);
  vec3 deep = vec3(0.01, 0.03, 0.04) * (skyCol + sunCol * shadow * max(uSunDir.y, 0.0) * 2.0);
  return mix(deep, reflection, fresnel);
}

// Courbe de tons ACES (approximation de Narkowicz)
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
