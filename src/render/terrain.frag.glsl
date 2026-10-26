// ---------- Point d'entrée ----------
// Assemblé par renderer.ts à la suite de : constantes générées, uniforms, noise, climate, rock, height,
// raymarch, atmosphere et shading.

void main() {
  pixelAngle = 2.0 / (uResolution.y * uFocal);
  lodPixelAngle = 2.0 / (uLodHeight * uFocal);

  sunCol = sunColor(uSunDir, 1.0);
  sunColAloft = sunColor(uSunDir, RAYLEIGH_SCATTER_AIR);
  skyCol = skyIrradiance();

  vec2 uv = (2.0 * gl_FragCoord.xy - uResolution) / uResolution.y;
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
  vec3 col;
  if (t > 0.0) col = applyFog(shadeTerrain(ro + rd * t, t, shadowSteps), ro, rd, t);
  else if (tWater > 0.0) col = applyFog(shadeWater(ro + rd * tWater, rd, tWater), ro, rd, tWater);
  else col = sky(rd);

  outColor = vec4(pow(aces(col * uExposure), vec3(1.0 / 2.2)), 1.0);
}
