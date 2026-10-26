// ---------- Point d'entrée ----------
// Assemblé par renderer.ts à la suite de : constantes générées, uniforms, noise, climate, rock, height,
// raymarch et shading.

void main() {
  pixelAngle = 2.0 / (uResolution.y * uFocal);

  // Couleurs du soleil et du ciel selon la hauteur du soleil
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

  // Le terrain n'est cherché que jusqu'à la surface de l'eau
  float tWater = rd.y < 0.0 ? (uWater - ro.y) / rd.y : -1.0;
  float t = march(ro, rd, 0.1, tWater > 0.0 ? tWater : TMAX, 0.0, 1.0, 400);

  vec3 col;
  if (t > 0.0) col = applyFog(shadeTerrain(ro + rd * t, t, SHADOW_STEPS), ro, rd, t);
  else if (tWater > 0.0) col = applyFog(shadeWater(ro + rd * tWater, rd, tWater), ro, rd, tWater);
  else col = sky(rd);

  outColor = vec4(pow(aces(col * uExposure), vec3(1.0 / 2.2)), 1.0);
}
