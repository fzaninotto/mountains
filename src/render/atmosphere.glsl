// ---------- Atmosphère ----------
// Deux composantes, intégrées analytiquement le long des rayons :
// - la diffusion de Rayleigh (molécules d'air), plus forte dans le bleu : elle bleuit le ciel et les lointains,
//   et rougit le soleil quand il est bas ;
// - les aérosols (brume, poussières), gris et concentrés dans les basses couches : voile des vallées et halo
//   lumineux autour du soleil.
// Le ciel est la même intégrale prise jusqu'à l'infini : il se raccorde sans jointure à la brume des lointains.

// Extinction de Rayleigh au niveau de la mer (1/m) et hauteurs d'échelle (m)
const vec3 RAYLEIGH = vec3(5.8e-6, 13.5e-6, 33.1e-6);
const float RAYLEIGH_HEIGHT = 8000.0;
const float AEROSOL_HEIGHT = 1200.0;
// Absorption par la couche d'ozone (épaisseur optique verticale, bande de Chappuis) : sans elle, le ciel vire au vert
// quand le soleil est bas
const vec3 OZONE = vec3(0.0098, 0.0282, 0.0013);
// Anisotropie des aérosols : la lumière est surtout diffusée vers l'avant, d'où le halo autour du soleil
const float AEROSOL_G = 0.76;
// Éclairement du sol par le soleil direct, et intensité de la lumière diffusée par l'atmosphère
const float SUN_IRRADIANCE = 3.2;
const float SCATTER_INTENSITY = 10.0;
// Part isotrope approchant la diffusion multiple (sans elle, le ciel à l'opposé du soleil serait trop sombre)
const float MULTIPLE_SCATTERING = 0.15;

// Intégrale de la densité exp(-y/H) le long d'un rayon parti de l'altitude y, de pente verticale dy, sur t mètres
float opticalLength(float y, float dy, float t, float scaleHeight) {
  float k = dy / scaleHeight;
  float density = exp(-y / scaleHeight);
  return density * (abs(k) > 1e-7 ? (1.0 - exp(min(-t * k, 80.0))) / k : t);
}

// Part de l'épaisseur d'air au-dessus du point moyen de diffusion de Rayleigh (une hauteur d'échelle : exp(-1)) :
// le ciel est éclairé par un soleil moins rougi que celui qui arrive au sol
const float RAYLEIGH_SCATTER_AIR = 0.37;

// Soleil vu depuis l'altitude où l'air diffuse le ciel, calculé une fois par pixel dans main()
vec3 sunColAloft;

// Couleur du soleil après la traversée d'une part airScale de l'atmosphère (masse d'air de Kasten et Young)
vec3 sunColor(vec3 sunDir, float airScale) {
  float zenith = degrees(acos(clamp(sunDir.y, -1.0, 1.0)));
  float airMass = 1.0 / (max(sunDir.y, 0.0) + 0.50572 * pow(max(96.07995 - zenith, 0.01), -1.6364));
  // L'ozone, vers 25 km, est traversé sous un angle moins rasant que les basses couches
  float ozoneMass = inversesqrt(sunDir.y * sunDir.y + 0.008);
  vec3 tau = (RAYLEIGH * RAYLEIGH_HEIGHT + uFog * AEROSOL_HEIGHT) * airMass * airScale + OZONE * ozoneMass;
  return exp(-tau) * smoothstep(-0.05, 0.02, sunDir.y);
}

// Lumière diffusée vers l'œil le long du rayon (ro, rd) sur t mètres ; transmittance : part de la lumière du fond
// qui traverse ce segment. sunLit : part de l'air du segment éclairée par le soleil direct (la diffusion multiple
// n'en dépend pas)
vec3 inScatter(vec3 ro, vec3 rd, float t, float sunLit, out vec3 transmittance) {
  vec3 tauR = RAYLEIGH * opticalLength(ro.y, rd.y, t, RAYLEIGH_HEIGHT);
  vec3 tauA = vec3(uFog * opticalLength(ro.y, rd.y, t, AEROSOL_HEIGHT));
  transmittance = exp(-(tauR + tauA));
  float mu = dot(rd, uSunDir);
  float phaseR = 0.0596831 * (1.0 + mu * mu);
  float g2 = AEROSOL_G * AEROSOL_G;
  float phaseA = 0.0795775 * (1.0 - g2) / pow(1.0 + g2 - 2.0 * AEROSOL_G * mu, 1.5);
  vec3 lightR = sunColAloft * (phaseR * SCATTER_INTENSITY * sunLit + MULTIPLE_SCATTERING);
  vec3 lightA = sunCol * (phaseA * SCATTER_INTENSITY * sunLit + MULTIPLE_SCATTERING);
  vec3 tau = tauR + tauA;
  return (tauR * lightR + tauA * lightA) / max(tau, vec3(1e-9)) * (1.0 - transmittance);
}

// Longueur (m) du rayon de la caméra qui reste dans l'ombre portée du relief cachant le soleil. Cette ombre est
// bornée par le plan parallèle au soleil qui passe par le sommet du relief (voir uSunShadow) : un rayon qui monte
// plus que le soleil en sort, un rayon qui monte moins y reste jusqu'au relief. Elle s'estompe sur les côtés
float shadowedLength(vec3 rd) {
  if (uSunShadow.y <= 0.0) return 0.0;
  float lateral = smoothstep(0.5, 0.9, dot(normalize(rd.xz + 1e-6), normalize(uSunDir.xz + 1e-6)));
  float rise = rd.y - uSunDir.y;
  return lateral * (rise > 0.0 ? min(uSunShadow.x, uSunShadow.y / rise) : uSunShadow.x);
}

// inScatter() dont les shaded premiers mètres sont dans l'ombre du relief, éclairés à uSunVisible seulement
vec3 scatter(vec3 ro, vec3 rd, float t, float shaded, out vec3 transmittance) {
  if (shaded <= 0.0) return inScatter(ro, rd, t, 1.0, transmittance);
  shaded = min(shaded, t);
  vec3 nearTransmittance;
  vec3 near = inScatter(ro, rd, shaded, uSunVisible, nearTransmittance);
  vec3 far = inScatter(ro + rd * shaded, rd, t - shaded, 1.0, transmittance);
  transmittance *= nearTransmittance;
  return near + nearTransmittance * far;
}

// Ciel vu depuis la caméra ; shaded : voir scatter()
vec3 sky(vec3 rd, float shaded) {
  vec3 transmittance;
  vec3 col = scatter(vec3(0.0, uCamY, 0.0), rd, 1e7, shaded, transmittance);
  // Disque solaire
  col += sunCol * 40.0 * smoothstep(0.99985, 0.99995, dot(rd, uSunDir));
  return col;
}

// Brume entre l'œil (ro) et un point à la distance t ; shaded : voir scatter()
vec3 applyFog(vec3 col, vec3 ro, vec3 rd, float t, float shaded) {
  vec3 transmittance;
  vec3 scattered = scatter(ro, rd, t, shaded, transmittance);
  return col * transmittance + scattered;
}

// Éclairement moyen venu du ciel, pour la lumière ambiante : moyenne de quelques directions de l'hémisphère
vec3 skyIrradiance() {
  vec3 side = normalize(vec3(uSunDir.x, 0.0, uSunDir.z) + vec3(1e-4, 0.0, 0.0));
  vec3 across = vec3(-side.z, 0.0, side.x);
  vec3 sum = sky(vec3(0.0, 1.0, 0.0), 0.0);
  sum += sky(normalize(side + vec3(0.0, 0.35, 0.0)), 0.0);
  sum += sky(normalize(-side + vec3(0.0, 0.35, 0.0)), 0.0);
  sum += sky(normalize(across + vec3(0.0, 0.35, 0.0)), 0.0);
  sum += sky(normalize(-across + vec3(0.0, 0.35, 0.0)), 0.0);
  return sum / 5.0 * 2.0;
}
