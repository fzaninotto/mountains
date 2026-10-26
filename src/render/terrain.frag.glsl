// ---------- Point d'entrée ----------
// Assemblé par renderer.ts à la suite de : constantes générées, uniforms, noise, climate, rock, height,
// raymarch, atmosphere et shading.

// Éblouissement : voile large et halo serré autour du soleil, pondérés par uSunVisible
const float GLARE_WIDE = 0.03;
const float GLARE_NARROW = 0.5;
// Assombrissement relatif des coins de l'image
const float VIGNETTE = 0.3;
// Exposition adaptée à l'éclairement d'un sol plat, comme un appareil photo : uExposure vaut pour DAYLIGHT_REF
// (soleil à 12°) ; EXPOSURE_ADAPT est la part de l'écart compensée (en plein soleil la roche ne sature plus, au
// couchant le sol reste lisible)
const float DAYLIGHT_REF = 0.5;
const float EXPOSURE_ADAPT = 0.6;
// Altitude (m) au-delà de laquelle ce sol de référence n'est plus pris sous l'œil : vu d'avion, on regarde le sol
const float GROUND_REF = 2000.0;
// Gain d'exposition supplémentaire quand on regarde vers un soleil bas
const float BACKLIGHT_ADAPT = 0.6;
// Amplitude du grain, qui sert aussi de tramage contre les aplats en escalier
const float GRAIN = 1.0 / 255.0;

void main() {
  vec2 fragCoord = gl_FragCoord.xy + uJitter;
  pixelAngle = 2.0 / (uResolution.y * uFocal);
  lodPixelAngle = 2.0 / (uLodHeight * uFocal);

  sunCol = sunColor(uSunDir, 1.0, OZONE_GROUND);
  sunColAloft = sunColor(uSunDir, RAYLEIGH_SCATTER_AIR, OZONE_ALOFT);
  // La lueur rasante n'existe que soleil bas : plus haut, l'horizon est éclairé comme le reste du ciel
  sunColLow = mix(sunColor(uSunDir, exp(-uCamY / RAYLEIGH_HEIGHT), OZONE_GROUND), sunColAloft, smoothstep(0.03, 0.15, uSunDir.y));
  sunColDown = sunColor(uSunDir, mix(exp(-min(uCamY, GROUND_REF) / RAYLEIGH_HEIGHT), RAYLEIGH_SCATTER_AIR, 0.5), OZONE_GROUND);
  vec3 flatGround = sunCol * SUN_IRRADIANCE * max(uSunDir.y, 0.0) + skyIrradiance(min(uCamY, GROUND_REF), vec3(0.0, 1.0, 0.0));
  float daylight = dot(flatGround, vec3(0.2126, 0.7152, 0.0722));
  float exposure = uExposure * clamp(pow(DAYLIGHT_REF / daylight, EXPOSURE_ADAPT), 0.4, 4.0);
  // À contre-jour, on regarde surtout des faces à l'ombre : l'œil s'y adapte en partie
  vec3 forward = uCamRot[2];
  float backlit = smoothstep(0.2, 0.9, dot(normalize(forward.xz + 1e-6), normalize(uSunDir.xz + 1e-6)))
    * (1.0 - smoothstep(0.2, 0.5, uSunDir.y));
  exposure *= 1.0 + BACKLIGHT_ADAPT * backlit;

  vec2 uv = (2.0 * fragCoord - uResolution) / uResolution.y;
  vec3 rd = normalize(uCamRot * vec3(uv, uFocal));
  vec3 ro = vec3(0.0, uCamY, 0.0);

  // Le terrain n'est cherché que jusqu'à la surface de l'eau
  float tWater = rd.y < 0.0 ? (uWater - ro.y) / rd.y : -1.0;
  float t = march(ro, rd, 0.1, tWater > 0.0 ? tWater : TMAX, 0.0, 1.0, 400);
  // Un fond marin peu profond peut être « touché » juste avant la surface, à la précision d'impact près (des dizaines
  // de mètres au loin) : c'est de l'eau
  if (t > 0.0 && tWater > 0.0 && terrain(ro.xz + rd.xz * t, lod(t)) < uWater) t = -1.0;

  // En aperçu, ombres moins précises ; le relief (march, calcNormal) reste celui de l'image nette
  int shadowSteps = uPreview > 0.5 ? 12 : SHADOW_STEPS;
  float shaded = shadowedLength(rd);
  vec3 col;
  if (t > 0.0) col = applyFog(shadeTerrain(ro + rd * t, t, shadowSteps), ro, rd, t, shaded);
  else if (tWater > 0.0) col = applyFog(shadeWater(ro + rd * tWater, rd, tWater), ro, rd, tWater, shaded);
  else col = sky(rd, shaded);

  float mu = max(dot(rd, uSunDir), 0.0);
  col += sunCol * uSunVisible * (GLARE_WIDE * pow(mu, 8.0) + GLARE_NARROW * pow(mu, 400.0));

  col = pow(aces(col * exposure), vec3(1.0 / 2.2));
  vec2 p = fragCoord / uResolution - 0.5;
  col *= 1.0 - VIGNETTE * dot(p, p);
  // Grain fixe par pixel : identique d'une passe de lissage à l'autre, il survit à la moyenne
  col += (2.0 * hash(uvec2(gl_FragCoord.xy)) - 1.0) * GRAIN;
  outColor = vec4(col, 1.0);
}
