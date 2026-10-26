// ---------- Point d'entrée ----------
// Assemblé par renderer.ts à la suite de : constantes générées, uniforms, noise, climate, rock, height,
// raymarch, atmosphere et shading.

// Éblouissement : voile large et halo serré autour du soleil, pondérés par uSunVisible
const float GLARE_WIDE = 0.03;
const float GLARE_NARROW = 0.5;
// Assombrissement relatif des coins de l'image
const float VIGNETTE = 0.3;
// Amplitude du grain, qui sert aussi de tramage contre les aplats en escalier
const float GRAIN = 1.0 / 255.0;

void main() {
  vec2 fragCoord = gl_FragCoord.xy + uJitter;
  pixelAngle = 2.0 / (uResolution.y * uFocal);
  lodPixelAngle = 2.0 / (uLodHeight * uFocal);

  sunCol = sunColor(uSunDir, 1.0, OZONE_GROUND);
  sunColAloft = sunColor(uSunDir, RAYLEIGH_SCATTER_AIR, OZONE_ALOFT);
  sunColLow = sunColor(uSunDir, exp(-uCamY / RAYLEIGH_HEIGHT), OZONE_GROUND);
  skyCol = skyIrradiance();

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

  col = pow(aces(col * uExposure), vec3(1.0 / 2.2));
  vec2 p = fragCoord / uResolution - 0.5;
  col *= 1.0 - VIGNETTE * dot(p, p);
  // Grain fixe par pixel : identique d'une passe de lissage à l'autre, il survit à la moyenne
  col += (2.0 * hash(uvec2(gl_FragCoord.xy)) - 1.0) * GRAIN;
  outColor = vec4(col, 1.0);
}
