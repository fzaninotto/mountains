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
const float AEROSOL_G = 0.85;
// Part de la lumière arrêtée par les aérosols qui est diffusée (le reste est absorbé)
const float AEROSOL_ALBEDO = 0.3;
// Éclairement du sol par le soleil direct, et intensité de la lumière diffusée par l'atmosphère : la même
// lumière, π convertissant l'éclairement en luminance d'une surface blanche (sans ce lien, la brume prend le pas
// sur le relief dès qu'on baisse l'éclairement)
const float SUN_IRRADIANCE = 2.6;
const float SCATTER_INTENSITY = SUN_IRRADIANCE * 3.14159;
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

// La lumière qui éclaire l'air en altitude quand le soleil est bas traverse la couche d'ozone presque à l'horizontale,
// sur une bien plus grande longueur que celle qui arrive au sol : l'ozone y absorbe le jaune-vert et garde le ciel
// du couchant bleu ou rose. Masse d'ozone relative et terme qui la borne quand le soleil est à l'horizon
const vec2 OZONE_GROUND = vec2(1.0, 0.008);
const vec2 OZONE_ALOFT = vec2(1.3, 0.00005);

// Soleil vu depuis l'altitude où l'air diffuse le ciel au-dessus de l'horizon, et depuis celle de la caméra, où il
// diffuse les rayons rasants (lueur du couchant sur l'horizon) ; calculés une fois par pixel dans main()
vec3 sunColAloft;
vec3 sunColLow;
// Soleil qui éclaire l'air sous l'horizon, entre l'œil et le sol : à mi-chemin de celui des basses couches, plus
// rouge et plus faible qu'en altitude (sans quoi, soleil bas, cet air prend le pas sur le relief qu'il recouvre)
vec3 sunColDown;

// Anisotropie des aérosols utilisée par inScatter() : réduite pour l'éclairement venu du ciel (SKY_AEROSOL_G)
float aerosolG = AEROSOL_G;

// Couleur du soleil après la traversée d'une part airScale de l'atmosphère (masse d'air de Kasten et Young)
vec3 sunColor(vec3 sunDir, float airScale, vec2 ozone) {
  float zenith = degrees(acos(clamp(sunDir.y, -1.0, 1.0)));
  float airMass = 1.0 / (max(sunDir.y, 0.0) + 0.50572 * pow(max(96.07995 - zenith, 0.01), -1.6364));
  // L'ozone, vers 25 km, est traversé sous un angle moins rasant que les basses couches
  float ozoneMass = ozone.x * inversesqrt(sunDir.y * sunDir.y + ozone.y);
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
  float g2 = aerosolG * aerosolG;
  float phaseA = 0.0795775 * (1.0 - g2) / pow(1.0 + g2 - 2.0 * aerosolG * mu, 1.5);
  vec3 sunR = rd.y < 0.0
    ? mix(sunColDown, sunColLow, smoothstep(-0.1, 0.0, rd.y))
    : mix(sunColLow, sunColAloft, smoothstep(0.0, 0.1, rd.y));
  vec3 lightR = sunR * (phaseR * SCATTER_INTENSITY * sunLit + MULTIPLE_SCATTERING);
  vec3 lightA = sunCol * (phaseA * SCATTER_INTENSITY * AEROSOL_ALBEDO * sunLit + MULTIPLE_SCATTERING);
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

// Lumière diffusée par l'atmosphère vue depuis la caméra, sans le disque solaire ; shaded : voir scatter()
vec3 skyScatter(vec3 rd, float shaded) {
  vec3 transmittance;
  return scatter(vec3(0.0, uCamY, 0.0), rd, 1e7, shaded, transmittance);
}

// Ciel vu depuis la caméra, disque solaire compris ; shaded : voir scatter()
vec3 sky(vec3 rd, float shaded) {
  return skyScatter(rd, shaded) + sunCol * 40.0 * smoothstep(0.99985, 0.99995, dot(rd, uSunDir));
}

// Brume entre l'œil (ro) et un point à la distance t ; shaded : voir scatter()
vec3 applyFog(vec3 col, vec3 ro, vec3 rd, float t, float shaded) {
  vec3 transmittance;
  vec3 scattered = scatter(ro, rd, t, shaded, transmittance);
  return col * transmittance + scattered;
}

// Anisotropie des aérosols pour l'éclairement venu du ciel : le halo, très étroit, serait mal estimé par quelques
// directions, mais le ciel reste plus clair du côté du soleil
const float SKY_AEROSOL_G = 0.7;

// Éclairement venu du ciel reçu à l'altitude y par une surface de normale n : quelques directions de l'hémisphère
// (zénith, puis à 19° de hauteur vers le soleil, à l'opposé et de part et d'autre), pondérées selon leur angle avec
// la normale. Une face tournée vers le soleil caché voit ainsi le ciel lumineux de ce côté. L'air est pris à
// l'altitude du sol éclairé et non à celle de l'œil : vu d'avion, le sol reçoit toujours le ciel de sa propre
// altitude. Le disque solaire en est exclu : le soleil direct est compté à part
vec3 skyIrradiance(float y, vec3 n) {
  aerosolG = SKY_AEROSOL_G;
  vec3 ro = vec3(0.0, max(y, 0.0), 0.0);
  vec3 side = normalize(vec3(uSunDir.x, 0.0, uSunDir.z) + vec3(1e-4, 0.0, 0.0));
  vec3 across = vec3(-side.z, 0.0, side.x);
  vec3 dirs[5] = vec3[5](
    vec3(0.0, 1.0, 0.0),
    normalize(side + vec3(0.0, 0.35, 0.0)),
    normalize(-side + vec3(0.0, 0.35, 0.0)),
    normalize(across + vec3(0.0, 0.35, 0.0)),
    normalize(-across + vec3(0.0, 0.35, 0.0))
  );
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    vec3 transmittance;
    sum += inScatter(ro, dirs[i], 1e7, 1.0, transmittance) * max(dot(n, dirs[i]) + 0.5, 0.0);
  }
  aerosolG = AEROSOL_G;
  // Le sol plat reçoit 2,5 fois la luminance moyenne de ces directions (poids total 4,8)
  return sum * 0.52;
}
