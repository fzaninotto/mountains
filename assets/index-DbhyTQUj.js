(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e={seed:1,scale:6e3,height:2200,gain:.5,biomeScale:12e4,mountainCoverage:.5,desertCoverage:.5,detail:1,step:.4,water:-60,vegetation:1400,snow:2e3,sunElevation:12,sunAzimuth:250,fog:.3,exposure:1.1,fov:55,speed:300,targetFps:30,movingScale:.5,pixelRatio:Math.min(typeof window>`u`?1:window.devicePixelRatio,2),exportScale:2};function t(){let t=e.sunElevation*Math.PI/180,n=e.sunAzimuth*Math.PI/180;return[Math.cos(t)*Math.sin(n),Math.sin(t),-Math.cos(t)*Math.cos(n)]}var n=[0,.2,.3,.45,.68,1],r=[{ratio:1,salt:0},{ratio:1.37,salt:7919},{ratio:.55,salt:104729},{ratio:.12,salt:15485863}],i=.35,a=.02,o=[5,7],s=[.25,.6],c=1.15,l=.01,u=[.6,.75],d=.7,f=[800,1600],p=.008,ee=[.4,.85],te=.75,ne=.4,re=.1,ie=[.45,.9],ae=.85,m=[120,48,18,7,2.6,1],h=[{wavelength:1100,height:45,segment:1.2,sand:[-.6,-.2]},{wavelength:180,height:14,segment:1.5,sand:[-.3,.1]},{wavelength:45,height:2,segment:2.5,sand:[-.5,-.1]}],oe=Math.tan(10*Math.PI/180),se=Math.tan(33*Math.PI/180),ce=5e3,le=.4,ue=.5,de=.5,fe=.3,pe=.55,me=.3,he=[.6,.3],ge=.15,_e=[.08,.25],ve=44597e3/6,ye={CLIFF_HEIGHT_OCTAVE:2,CLIFF_COVE_OCTAVE:3,CLIFF_JITTER_OCTAVE_FINE:o[1],CLIFF_JITTER_OCTAVE:o[0],MAX_OCTAVES:20,ALPINE_OCTAVES:3,BIOME_COUNT:n.length,FIELD_COUNT:r.length,FIELD_OCTAVES:3,ROCK_OCTAVES:m.length,DUNE_LAYER_COUNT:h.length,DUNE_SCALE_COUNT:1+2*h.length},be={BIOME_STOPS:n,FIELD_RATIO:r.map(e=>e.ratio),RANGE_WARP:i,CLIFF_HEIGHT:70,CLIFF_WIDTH:6,CLIFF_MIN_SLOPE:a,CLIFF_SETBACK:30,STEEP_SLOPE:s,ROCK_ROUGHNESS:c,RIDGE_WAVELENGTH:120,RIDGE_SIGN_SOFTNESS:l,ALPINE_LEVEL:u,ALPINE_GRADIENT:d,CREST_BASE:f,CREST_SOFTNESS:p,CREST_WEIGHT:ee,CREST_AMPLITUDE:te,CREST_VALLEY:ne,CREST_EROSION:re,WALL_SLOPE:ie,WALL_DETAIL_WAVELENGTH:150,SNOW_SMOOTH_WAVELENGTH:60,SNOW_FLATTENING:ae,ROCK_WAVELENGTHS:m,DUNE_HEIGHTS:h.map(e=>e.height),DUNE_SAND:h.flatMap(e=>e.sand),DUNE_MAX_HEIGHT:h.reduce((e,t)=>e+t.height,0)*1.075,DUNE_WINDWARD_SLOPE:oe,DUNE_LEE_SLOPE:se,DUNE_WARP:900,DUNE_SINUOSITY:le,DUNE_SEGMENT_EDGE:ue,DUNE_SHARP:de,DUNE_FLAT:fe,DUNE_JITTER:me,DUNE_LOWEST:pe,DUNE_HORNS:he,DUNE_MERGE:ge,DUNE_CONTACT_SLOPE:_e,EARTH_RADIUS:ve};function xe(e){return Number.isInteger(e)?`${e}.0`:`${e}`}function Se(){let e=Object.entries(ye).map(([e,t])=>`const int ${e} = ${t};`),t=Object.entries(be).map(([e,t])=>typeof t==`number`?`const float ${e} = ${xe(t)};`:`const float ${e}[${t.length}] = float[${t.length}](${t.map(xe).join(`, `)});`);return[...e,...t].join(`
`)}var g=4294967296,_=e=>e-Math.floor(e/g)*g;function v(){return[Math.imul(e.seed,2654435761)>>>0,Math.imul(e.seed^1540483477,2246822507)>>>0]}function y(e,t){return[2*(.8*e+.6*t),2*(-.6*e+.8*t)]}function b(e,t,n,r,i,a,o){let s=Math.floor(r),c=Math.floor(i);e[n*2]=r-s,e[n*2+1]=i-c,t[n*2]=_(s+a),t[n*2+1]=_(c+o)}function x(t,n){let[r,i]=v(),a=new Float32Array(40),o=new Uint32Array(40),s=t/e.scale,c=n/e.scale;for(let e=0;e<20;e++)b(a,o,e,s,c,r,i),[s,c]=y(s,c);return{frac:a,cell:o}}function S(t,n){let[i,a]=v(),o=new Float32Array(r.length*3*2),s=new Uint32Array(r.length*3*2);return r.forEach(({ratio:r,salt:c},l)=>{let u=e.biomeScale*r,d=t/u,f=n/u;for(let e=0;e<3;e++)b(o,s,l*3+e,d,f,i+c,a+c),[d,f]=y(d,f)}),{frac:o,cell:s}}function Ce(e,t){let n=Math.cos(e),r=Math.sin(e),i=Math.cos(t),a=Math.sin(t);return[n,a*r,-i*r,0,i,a,r,-a*n,i*n]}var C=m.map((e,t)=>Ce(.7+t*1.3,.5+t*.9));function w(e,t){let[n,r]=v(),i=[n,r,n+r],a=new Float32Array(m.length*3),o=new Uint32Array(m.length*3);return m.forEach((n,r)=>{let s=C[r];for(let c=0;c<3;c++){let l=(s[c]*e+s[6+c]*t)/n,u=Math.floor(l);a[r*3+c]=l-u,o[r*3+c]=_(u+i[c])}}),{frac:a,cell:o,rotation:new Float32Array(C.flat())}}function we(){let t=t=>Math.max(1,Math.round(e.biomeScale/t));return new Uint32Array([t(ce),...h.flatMap(e=>[t(e.wavelength),t(e.wavelength*e.segment)])])}var Te=2,Ee=1.45,T=2e4,De=[`seed`,`scale`,`height`,`gain`,`biomeScale`,`mountainCoverage`,`desertCoverage`,`water`,`snow`,`sunElevation`,`sunAzimuth`],Oe=class{renderer;x=0;y=0;z=0;yaw=.6;pitch=-.08;keys=new Set;looked=!1;pendingAltitude=null;probed=null;arrived=null;probing=!1;latency=.05;velocity=[0,0];constructor(t,n){this.renderer=n,window.addEventListener(`keydown`,e=>{e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||this.keys.add(e.code)}),window.addEventListener(`keyup`,e=>this.keys.delete(e.code)),window.addEventListener(`blur`,()=>this.keys.clear()),t.addEventListener(`pointerdown`,e=>t.setPointerCapture(e.pointerId)),t.addEventListener(`pointermove`,n=>{if(!t.hasPointerCapture(n.pointerId))return;let r=e.fov*Math.PI/180/window.innerHeight;this.yaw-=n.movementX*r,this.pitch=Math.max(-1.45,Math.min(Ee,this.pitch+n.movementY*r)),this.looked=!0}),t.addEventListener(`wheel`,t=>{t.preventDefault(),e.speed=Math.max(2,Math.min(T,e.speed*Math.exp(-t.deltaY*.001)))},{passive:!1})}placeAboveGround(e){this.pendingAltitude=e}ready(){return this.pendingAltitude===null&&this.probed!==null}settled(){return this.ready()&&this.probed.key===this.key()}async settle(){for(;!this.settled();)this.sync(),await new Promise(e=>setTimeout(e,2))}altitude(){return this.pendingAltitude===null?this.probed?this.y-Math.max(this.probed.result.ground,e.water):0:this.pendingAltitude}climate(){return this.probed?.result.climate??null}sync(){let e=this.arrived;this.arrived=null;let t=e?this.apply(e):!1;return!this.probing&&this.probed?.key!==this.key()&&this.probe(),t}speed(){let t=this.keys.has(`ShiftLeft`)||this.keys.has(`ShiftRight`)?5:1;return e.speed*t}update(e){let t=(e,t)=>Number(e.some(e=>this.keys.has(e)))-Number(t.some(e=>this.keys.has(e))),n=t([`KeyW`,`ArrowUp`],[`KeyS`,`ArrowDown`]),r=t([`KeyD`,`ArrowRight`],[`KeyA`,`ArrowLeft`]),i=t([`KeyR`,`Space`],[`KeyF`]),a=this.looked;if(this.looked=!1,this.velocity=[0,0],!n&&!r&&!i)return a;let[o,s,c]=this.forward(),[l,,u]=E(o,c),d=this.speed();return this.velocity=[(o*n+l*r)*d,(c*n+u*r)*d],this.x+=this.velocity[0]*e,this.y+=(s*n+i)*d*e,this.z+=this.velocity[1]*e,this.clampToGround(),!0}view(){let t=this.forward(),n=E(t[0],t[2]),r=[n[1]*t[2]-n[2]*t[1],n[2]*t[0]-n[0]*t[2],n[0]*t[1]-n[1]*t[0]];return{camY:this.y,rotation:new Float32Array([...n,...r,...t]),focal:1/Math.tan(e.fov*Math.PI/360),octaves:x(this.x,this.z),fields:S(this.x,this.z),rock:w(this.x,this.z),sunVisible:this.probed?.result.sunVisible??1,sunShadow:this.probed?.result.sunShadow??[0,0]}}key(){return[this.x,this.y,this.z,this.pendingAltitude,...De.map(t=>e[t])].join()}probe(){let e=this.key(),{x:t,z:n,pendingAltitude:r}=this,i=Math.max(.05,2*this.latency),a=performance.now();this.probing=!0,this.renderer.probe([{x:t,z:n,y:r??this.y,relative:r!==null,ahead:[this.velocity[0]*i,this.velocity[1]*i]}]).then(([r])=>{this.probing=!1,this.latency+=.2*((performance.now()-a)/1e3-this.latency),this.arrived={key:e,x:t,z:n,result:r}})}apply(t){let n=this.y;return this.pendingAltitude===null?(this.probed=t,this.clampToGround(),this.y!==n):t.key===this.key()&&(this.y=Math.max(t.result.ground,e.water)+this.pendingAltitude,this.pendingAltitude=null,this.probed={...t,key:this.key()},!0)}clampToGround(){if(this.pendingAltitude!==null||!this.probed)return;let{x:t,z:n,result:r}=this.probed,i=t===this.x&&n===this.z?r.ground:r.groundAhead;this.y=Math.max(this.y,Math.max(i,e.water)+Te)}forward(){let e=Math.cos(this.pitch);return[Math.sin(this.yaw)*e,Math.sin(this.pitch),-Math.cos(this.yaw)*e]}};function E(e,t){let n=Math.hypot(e,t);return[-t/n,0,e/n]}var ke=`#version 300 es

out vec2 vUv;

void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`,Ae=`#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uTexture;
// Portion utilisée de la texture source (l'aperçu n'en occupe qu'un coin)
uniform vec2 uSourceScale;
out vec4 outColor;

void main() {
  // Bornée au centre du dernier texel utilisé, pour ne pas filtrer avec le reste de la texture
  vec2 halfTexel = 0.5 / vec2(textureSize(uTexture, 0));
  outColor = texture(uTexture, min(vUv * uSourceScale, uSourceScale - halfTexel));
}
`,je=`// Entrées du shader de terrain. Les constantes partagées (MAX_OCTAVES, BIOME_COUNT…) sont générées depuis
// src/terrain/constants.ts et placées avant ce fichier.

// Caméra : la position horizontale est l'origine du repère (x, z relatifs), seule l'altitude est absolue
uniform vec2 uResolution;
uniform float uCamY;
uniform mat3 uCamRot;
uniform float uFocal;
// Décalage sous-pixel (px) des passes de lissage
uniform vec2 uJitter;
// Part visible du soleil depuis la caméra (relief, hauteur du soleil), relue des sondes (probe.frag.glsl)
uniform float uSunVisible;
// Relief qui cache le soleil : distance (m) et profondeur (m) du rayon vers le soleil sous son sommet, 0 sans relief
uniform vec2 uSunShadow;

// Réglages (voir src/params.ts)
uniform vec3 uSunDir;
uniform float uScale;
uniform float uBiomeScale;
uniform float uMountainBias;
uniform float uDesertBias;
uniform float uDetail;
uniform float uStep;
uniform float uWater;
uniform float uVegetation;
uniform float uSnow;
uniform float uFog;
uniform float uExposure;
// 1 pendant les déplacements : aperçu allégé (ombres et reflets réduits, relief inchangé)
uniform float uPreview;
// Hauteur d'image (px) qui fixe le niveau de détail du relief, indépendante de la résolution de calcul
uniform float uLodHeight;

// Biomes le long du niveau de relief : (altitude de base, amplitude, gain)
uniform vec3 uBiomes[BIOME_COUNT];
// Borne haute du relief : au-dessus, un rayon qui monte ne peut plus rien toucher
uniform float uMaxH;

// Origines des bruits à la position de la caméra (voir src/terrain/origins.ts) : partie fractionnaire et cellule
uniform vec2 uOctFrac[MAX_OCTAVES];
uniform uvec2 uOctCell[MAX_OCTAVES];
uniform vec2 uFieldFrac[FIELD_COUNT * FIELD_OCTAVES];
uniform uvec2 uFieldCell[FIELD_COUNT * FIELD_OCTAVES];
uniform vec3 uRockFrac[ROCK_OCTAVES];
uniform uvec3 uRockCell[ROCK_OCTAVES];
uniform mat3 uRockRot[ROCK_OCTAVES];
// Facteurs d'échelle entiers des dunes (voir duneScales() dans src/terrain/origins.ts)
uniform uint uDuneScale[DUNE_SCALE_COUNT];

out vec4 outColor;

// Rotation entre deux octaves successives
const mat2 M2 = mat2(0.8, -0.6, 0.6, 0.8);
// Distance maximale de rendu (m)
const float TMAX = 80000.0;

// Valeurs calculées une fois par pixel dans main()
// Angle d'un pixel calculé (précision du raymarching, normales) et d'un pixel de référence (niveau de détail)
float pixelAngle;
float lodPixelAngle;
vec3 sunCol;
`,Me=`// ---------- Bruits ----------
// Les cellules sont des uint décalés par l'origine de la caméra (voir src/terrain/origins.ts) : x est la position
// fractionnaire dans l'espace du bruit, cell la cellule entière qui s'y ajoute.

// Hash entier « Integer Hash III » d'Inigo Quilez
uint hashBits(uvec2 x) {
  uvec2 q = 1103515245u * ((x >> 1u) ^ x.yx);
  return 1103515245u * (q.x ^ (q.y >> 3u));
}

// Le même, dans [0, 1]
float hash(uvec2 x) {
  return float(hashBits(x)) * (1.0 / 4294967295.0);
}

float hash3(uvec3 i) {
  return hash(uvec2(i.x ^ (i.y * 2654435761u), i.z));
}

// Value noise 2D avec dérivées analytiques : (valeur dans [-1, 1], d/dx, d/dy)
vec3 noised(vec2 x, uvec2 cell) {
  vec2 fl = floor(x);
  vec2 f = x - fl;
  uvec2 i = uvec2(ivec2(fl)) + cell;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  float a = hash(i);
  float b = hash(i + uvec2(1u, 0u));
  float c = hash(i + uvec2(0u, 1u));
  float d = hash(i + uvec2(1u, 1u));
  float k1 = b - a, k2 = c - a, k4 = a - b - c + d;
  return vec3(
    -1.0 + 2.0 * (a + k1 * u.x + k2 * u.y + k4 * u.x * u.y),
    2.0 * du * vec2(k1 + k4 * u.y, k2 + k4 * u.x)
  );
}

// Value noise 2D mêlé (part g) d'un bruit de gradient tiré des mêmes hachages, avec dérivées : (valeur dans [-1, 1],
// d/dx, d/dy). Avec g = 0, c'est exactement noised(). Le value noise seul, plat à chaque sommet de sa grille, y pose
// dômes et cuvettes ; le bruit de gradient seul y passe toujours par zéro, et ses crêtes 1 - |n| y feraient des cônes
// réguliers
vec3 hybridNoised(vec2 x, uvec2 cell, float g) {
  vec2 fl = floor(x);
  vec2 f = x - fl;
  uvec2 i = uvec2(ivec2(fl)) + cell;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  uvec4 h = uvec4(hashBits(i), hashBits(i + uvec2(1u, 0u)), hashBits(i + uvec2(0u, 1u)), hashBits(i + uvec2(1u, 1u)));
  vec4 value = vec4(h) * (1.0 / 4294967295.0);
  // Gradients unitaires tirés des bits du même hachage, sans multiplication ni table : la seconde composante (bits
  // forts mêlés aux faibles) est indépendante de la valeur (bits forts) comme de la première (bits faibles)
  vec4 gx = vec4(h & 0xffffu) * (1.0 / 32767.5) - 1.0;
  vec4 gy = vec4((h ^ (h >> 16u)) & 0xffffu) * (1.0 / 32767.5) - 1.0;
  vec4 norm = inversesqrt(gx * gx + gy * gy + 1e-6);
  gx *= norm;
  gy *= norm;
  vec2 ga = vec2(gx.x, gy.x), gb = vec2(gx.y, gy.y), gc = vec2(gx.z, gy.z), gd = vec2(gx.w, gy.w);
  vec4 dots = vec4(dot(ga, f), dot(gb, f - vec2(1.0, 0.0)), dot(gc, f - vec2(0.0, 1.0)), dot(gd, f - vec2(1.0, 1.0)));
  // Valeurs aux sommets : value noise (dans [-1, 1]) et bruit de gradient (×1,4, vers la même étendue), mêlés
  vec4 v = (1.0 - g) * (2.0 * value - 1.0) + (1.4 * g) * dots;
  float k1 = v.y - v.x, k2 = v.z - v.x, k4 = v.x - v.y - v.z + v.w;
  // Gradients aux sommets, interpolés (seulement pour la part de gradient)
  vec2 gi = (1.4 * g) * (ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd));
  return vec3(v.x + k1 * u.x + k2 * u.y + k4 * u.x * u.y, du * vec2(k1 + k4 * u.y, k2 + k4 * u.x) + gi);
}

// Gradient unitaire pseudo-aléatoire, uniforme sur la sphère
vec3 gradient3(uvec3 i) {
  float angle = hash3(i) * 6.2831853;
  float z = hash3(i + uvec3(40503u, 2654435u, 97u)) * 2.0 - 1.0;
  float r = sqrt(1.0 - z * z);
  return vec3(r * cos(angle), r * sin(angle), z);
}

// Bruit de gradient 3D (type Perlin), environ dans [-1, 1] : contrairement au value noise, il ne laisse pas
// deviner de cellules cubiques. Gradients uniformes sur la sphère, plus coûteux : il sert à la couleur de la roche
float gradientNoise3(vec3 x, uvec3 cell) {
  vec3 fl = floor(x);
  vec3 f = x - fl;
  uvec3 i = uvec3(ivec3(fl)) + cell;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(gradient3(i), f);
  float b = dot(gradient3(i + uvec3(1u, 0u, 0u)), f - vec3(1.0, 0.0, 0.0));
  float c = dot(gradient3(i + uvec3(0u, 1u, 0u)), f - vec3(0.0, 1.0, 0.0));
  float d = dot(gradient3(i + uvec3(1u, 1u, 0u)), f - vec3(1.0, 1.0, 0.0));
  float e = dot(gradient3(i + uvec3(0u, 0u, 1u)), f - vec3(0.0, 0.0, 1.0));
  float g = dot(gradient3(i + uvec3(1u, 0u, 1u)), f - vec3(1.0, 0.0, 1.0));
  float h = dot(gradient3(i + uvec3(0u, 1u, 1u)), f - vec3(0.0, 1.0, 1.0));
  float k = dot(gradient3(i + uvec3(1u, 1u, 1u)), f - vec3(1.0, 1.0, 1.0));
  return 1.8 * mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, g, u.x), mix(h, k, u.x), u.y), u.z);
}

// Gradient pris parmi les 12 arêtes du cube (Perlin amélioré), produit scalaire avec f
float edgeGradient(uvec3 i, vec3 f) {
  int k = int(hash3(i) * 11.999);
  float u = k < 8 ? f.x : f.y;
  float v = k < 4 ? f.y : f.z;
  return ((k & 1) == 0 ? u : -u) + ((k & 2) == 0 ? v : -v);
}

// Bruit de gradient 3D bon marché, environ dans [-1, 1] : un hachage par sommet comme le value noise, sans en
// laisser deviner les cellules cubiques
float edgeGradientNoise3(vec3 x, uvec3 cell) {
  vec3 fl = floor(x);
  vec3 f = x - fl;
  uvec3 i = uvec3(ivec3(fl)) + cell;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = edgeGradient(i, f);
  float b = edgeGradient(i + uvec3(1u, 0u, 0u), f - vec3(1.0, 0.0, 0.0));
  float c = edgeGradient(i + uvec3(0u, 1u, 0u), f - vec3(0.0, 1.0, 0.0));
  float d = edgeGradient(i + uvec3(1u, 1u, 0u), f - vec3(1.0, 1.0, 0.0));
  float e = edgeGradient(i + uvec3(0u, 0u, 1u), f - vec3(0.0, 0.0, 1.0));
  float g = edgeGradient(i + uvec3(1u, 0u, 1u), f - vec3(1.0, 0.0, 1.0));
  float h = edgeGradient(i + uvec3(0u, 1u, 1u), f - vec3(0.0, 1.0, 1.0));
  float k = edgeGradient(i + uvec3(1u, 1u, 1u), f - vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, g, u.x), mix(h, k, u.x), u.y), u.z);
}
`,Ne=`// ---------- Biomes, falaises et dunes ----------
// fBm d'un champ de biomes (0 : continent, 1 : aridité, 2 : chaînes de montagnes, 3 : îles), environ dans [-1, 1]
float fieldNoise(vec2 x, int field) {
  vec2 q = x / (uBiomeScale * FIELD_RATIO[field]);
  float a = 0.0, b = 1.0, norm = 0.0;
  for (int i = 0; i < FIELD_OCTAVES; i++) {
    int k = field * FIELD_OCTAVES + i;
    a += b * noised(uFieldFrac[k] + q, uFieldCell[k]).x;
    norm += b;
    b *= 0.5;
    q = 2.0 * (M2 * q);
  }
  return a / norm;
}

// (niveau de relief, poids du désert, poids des falaises).
// Niveau de relief : 0 = mer, puis plage, plaine, collines, moyenne et haute montagne jusqu'à 1.
// Le continent sépare la mer des terres ; les montagnes suivent les crêtes d'un troisième champ, ondulé
// par les deux premiers, ce qui dessine des chaînes. Un quatrième champ, plus fin, fait émerger des îles
// au large et décide où les côtes sont des falaises. Tout est continu : aucune frontière entre biomes
vec3 climate(vec2 x) {
  float continent = fieldNoise(x, 0);
  float dryness = fieldNoise(x, 1);
  float warp = RANGE_WARP * uBiomeScale * FIELD_RATIO[2];
  float range = fieldNoise(x + warp * vec2(continent, dryness), 2);
  float islands = fieldNoise(x, 3);
  float coast = smoothstep(-0.15, 0.05, continent);
  float inland = smoothstep(0.0, 0.25, continent);
  float mountain = smoothstep(0.62, 1.0, 1.0 - abs(range) + uMountainBias) * inland;
  float island = smoothstep(0.15, 0.6, islands) * smoothstep(-0.6, -0.2, continent) * (1.0 - coast);
  float level = 0.3 * coast + 0.7 * mountain + 0.6 * island;
  float cliff = smoothstep(-0.05, 0.3, islands) * (1.0 - smoothstep(0.3, 0.42, level));
  return vec3(level, smoothstep(0.05, 0.35, dryness + uDesertBias), cliff);
}

// Biome (altitude de base, amplitude, gain) interpolé en continu le long du niveau de relief
vec3 biomeAt(float level) {
  vec3 biome = uBiomes[0];
  for (int i = 0; i < BIOME_COUNT - 1; i++) {
    biome = mix(biome, uBiomes[i + 1], smoothstep(BIOME_STOPS[i], BIOME_STOPS[i + 1], level));
  }
  return biome;
}

// 1 en plaine et sur la plage, 0 dès les collines
float lowland(float level) {
  return 1.0 - smoothstep(0.3, 0.45, level);
}

// 1 sur les côtes marines (plages, écume), 0 au bord des lacs et des rivières des terres
float seaCoast(float level) {
  return 1.0 - smoothstep(0.22, 0.3, level);
}

// Les dunes n'existent que dans les zones arides basses : ni en mer, ni en relief
float duneWeight(float level, float desert) {
  return desert * smoothstep(0.12, 0.2, level) * lowland(level);
}

// Position de x dans l'espace de l'octave \`octave\` du relief, sans sa cellule entière uOctCell[octave], et dq/dx
vec2 octaveSpace(vec2 x, int octave, out mat2 jacobian) {
  vec2 q = x / uScale;
  jacobian = mat2(1.0 / uScale);
  for (int i = 0; i < octave; i++) {
    q = 2.0 * (M2 * q);
    jacobian = 2.0 * (M2 * jacobian);
  }
  return uOctFrac[octave] + q;
}

// Value noise de l'octave \`octave\` du relief, décalé de \`offset\` pour ne pas reproduire ses formes,
// et son gradient (par mètre)
vec3 octaveNoise(vec2 x, int octave, vec2 offset) {
  mat2 jacobian;
  vec3 n = noised(octaveSpace(x, octave, jacobian) + offset, uOctCell[octave]);
  return vec3(n.x, transpose(jacobian) * n.yz);
}

// smoothstep(a, b, n.x) et son gradient, pour n = (valeur, gradient)
vec3 smoothstepGrad(float a, float b, vec3 n) {
  float u = clamp((n.x - a) / (b - a), 0.0, 1.0);
  return vec3(u * u * (3.0 - 2.0 * u), 6.0 * u * (1.0 - u) / (b - a) * n.yz);
}

// Gradient maximal (multiplié par uScale) du bruit qui fait reculer le pied de falaise : celui du value noise ne
// dépasse guère 4 dans son propre espace
const float CLIFF_NOTCH_GRADIENT = 4.0 * (0.6 * float(1 << CLIFF_JITTER_OCTAVE) + 0.4 * float(1 << CLIFF_JITTER_OCTAVE_FINE));
// En dessous du pied le plus bas d'au moins ceci (m), la distance à la falaise est estimée sans évaluer ses bruits
const float CLIFF_FRONT_MARGIN = 3.0;

// Falaises : tout ce qui émerge près de la mer est relevé d'un bloc ; la marche se forme là où les grandes formes du
// relief (coarse : altitude et gradient, sans les octaves de moins de WALL_DETAIL_WAVELENGTH) traversent l'altitude
// du pied de falaise. Son dénivelé suit leur pente, pour que la face ait toujours la même largeur horizontale,
// CLIFF_WIDTH : une paroi, même sur un littoral en pente douce. Le petit détail, lui, ne fait que s'y ajouter : s'il
// décidait de la marche, ses quelques centimètres la feraient basculer en aiguilles.
// La hauteur varie le long de la côte et s'annule par endroits (criques basses), et le pied recule plus ou moins loin
// de l'eau, ce qui découpe criques et caps au lieu de suivre fidèlement le trait de côte.
// Renvoie le relèvement et son gradient. Au large de la paroi, front donne pour la distance au relief
// (surfaceDistance) la distance horizontale approchée à son pied, l'altitude de son sommet et sa plus forte pente ;
// ailleurs, front.x est infini
vec3 cliffLift(vec2 x, vec3 coarse, float cliff, out vec3 front) {
  float h = coarse.x;
  front = vec3(1e9, 0.0, 0.0);
  if (cliff <= 0.0) return vec3(0.0);
  float lowestFoot = uWater + 0.5;
  // Les distances horizontales deviennent des dénivelés du terrain d'origine en les multipliant par sa pente
  float slope = max(length(coarse.yz), CLIFF_MIN_SLOPE);
  float rise = CLIFF_WIDTH * slope;
  // Nettement sous le pied le plus bas, pas de relèvement ; pour la distance, la falaise la plus haute possible
  if (h <= lowestFoot - CLIFF_FRONT_MARGIN) {
    float highest = cliff * 1.2 * CLIFF_HEIGHT;
    float closing = length(coarse.yz) + 0.5 * CLIFF_SETBACK * slope * CLIFF_NOTCH_GRADIENT / uScale;
    front = vec3((lowestFoot - h) / closing, lowestFoot + (CLIFF_SETBACK + CLIFF_WIDTH) * slope + highest,
      1.5 * highest / rise * closing);
    return vec3(0.0);
  }
  vec3 tall = smoothstepGrad(-0.5, 0.5, octaveNoise(x, CLIFF_HEIGHT_OCTAVE, vec2(3.7, -1.3)));
  vec3 cove = smoothstepGrad(-0.6, 0.2, octaveNoise(x, CLIFF_COVE_OCTAVE, vec2(-2.3, 5.9)));
  float height = CLIFF_HEIGHT * (0.2 + tall.x) * cove.x;
  vec2 heightGrad = CLIFF_HEIGHT * (tall.yz * cove.x + (0.2 + tall.x) * cove.yz);
  // Au-dessus de la plus haute marche possible, le relèvement est complet
  if (h >= lowestFoot + (CLIFF_SETBACK + CLIFF_WIDTH) * slope) return cliff * vec3(height, heightGrad);
  vec3 notches = 0.6 * octaveNoise(x, CLIFF_JITTER_OCTAVE, vec2(-6.1, 2.9))
    + 0.4 * octaveNoise(x, CLIFF_JITTER_OCTAVE_FINE, vec2(1.7, 8.3));
  float foot = lowestFoot + CLIFF_SETBACK * slope * (0.5 + 0.5 * notches.x);
  // Gradient de h - foot : la marche avance perpendiculairement à lui, d'autant plus vite qu'il est grand
  vec2 closing = coarse.yz - 0.5 * CLIFF_SETBACK * slope * notches.yz;
  float faceSlope = 1.5 * height / rise * length(closing) + length(heightGrad);
  if (h <= foot) front = vec3((foot - h) / max(length(closing), CLIFF_MIN_SLOPE), foot + rise + cliff * height, cliff * faceSlope);
  // Sous le pied (donc sous le plus bas), s = 0 : pas de relèvement, comme côté CPU
  float s = clamp((h - foot) / rise, 0.0, 1.0);
  float ramp = s * s * (3.0 - 2.0 * s);
  return cliff * vec3(height * ramp, height * 6.0 * s * (1.0 - s) / rise * closing + ramp * heightGrad);
}

// Minimum adouci sur une largeur k de deux fonctions (valeur, gradient)
vec3 softMin(vec3 a, vec3 b, float k) {
  float weight = clamp(0.5 + 0.5 * (b.x - a.x) / k, 0.0, 1.0);
  return vec3(mix(b.x, a.x, weight) - k * weight * (1.0 - weight), mix(b.yz, a.yz, weight));
}

// Maximum adouci sur une largeur k de deux dunes (valeur, gradient). Leur part de face d'avalanche (slip) est mêlée
// avec le même poids, dérivée comprise
void softMaxDune(inout vec3 h, inout vec3 slip, vec3 dune, vec3 duneSlip, float k) {
  float weight = clamp(0.5 + 0.5 * (dune.x - h.x) / k, 0.0, 1.0);
  vec2 weightGrad = weight > 0.0 && weight < 1.0 ? 0.5 * (dune.yz - h.yz) / k : vec2(0.0);
  h = vec3(mix(h.x, dune.x, weight) + k * weight * (1.0 - weight), mix(h.yz, dune.yz, weight));
  slip = vec3(mix(slip.x, duneSlip.x, weight), mix(slip.yz, duneSlip.yz, weight) + (duneSlip.x - slip.x) * weightGrad);
}

// Value noise 1D de la rangée row (valeur dans [-1, 1], dérivée), cell étant la cellule entière qui s'ajoute à x
vec2 noise1(float x, uint cell, uint row) {
  float fl = floor(x);
  float f = x - fl;
  uint i = uint(int(fl)) + cell;
  float a = hash(uvec2(i, row));
  float b = hash(uvec2(i + 1u, row));
  float u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return vec2(-1.0 + 2.0 * mix(a, b, u), 60.0 * f * f * (f * (f - 2.0) + 1.0) * (b - a));
}

// Épaisseur moyenne de sable d'une crête continue de hauteur H et d'écart λ : DUNE_SHEET × H² / λ
const float DUNE_SHEET = 0.5 * (1.0 / DUNE_WINDWARD_SLOPE + 1.0 / DUNE_LEE_SLOPE);

// Hauteur des dunes (m) et son gradient. Le vent souffle en moyenne vers +x. Chaque couche est une suite de crêtes
// transverses le long d'une phase « tordue » : un bruit de grande amplitude, commun aux couches, fait tourner les
// crêtes et varier leur écart d'une zone à l'autre ; un second, propre à la couche, les rend sinueuses. Chaque crête
// a son propre bruit de hauteur le long de z, à l'échelle de quelques écarts : elle se découpe en tronçons qui
// s'abaissent et s'interrompent indépendamment de ceux des crêtes voisines (aucune ligne ne se prolonge sur des
// kilomètres). Là où une crête s'abaisse, elle recule sous le vent : chaque tronçon devient un croissant aux cornes
// basses tournées sous le vent, qui rejoignent parfois la crête suivante (jonctions en Y). Le sable rare donne des
// barkhanes isolées aux longues cornes entre des creux plats ; abondant, des crêtes barkhanoïdes presque continues.
// Profil asymétrique : versant au vent en pente douce, face d'avalanche sous le vent. Les crêtes se raccordent par un
// maximum adouci. Les couches fines ne vivent pas sur les faces d'avalanche des plus grandes. Là où contact tombe à 0
// (contre le relief), elles fondent en une nappe de sable de volume voisin. Les fréquences (uDuneScale) sont des
// multiples entiers de celle du premier champ de biomes, dont l'origine en double précision est ainsi réutilisée.
// Les couches plus fines que minWavelength s'effacent, et leurs arêtes s'arrondissent avant.
// L'écart local entre crêtes (1 / |grad phase|) varie à l'échelle des kilomètres : il est tenu pour constant dans le
// gradient. Pente : face d'avalanche DUNE_LEE_SLOPE, accrue par le recul des cornes et la variation des hauteurs le
// long des crêtes (≈ 1,1 au pire), plus les versants au vent des couches plus grandes : elle reste sous 1,5 (sondée :
// 0,9 au plus). Le pas de march(), uStep = 0,4 fois l'écart vertical, ne traverse rien tant qu'elle reste sous
// sqrt(1 / uStep² - 1) ≈ 2,3
// Bruit de grande échelle commun aux couches de dunes (valeur, gradient par mètre) : son gradient fait tourner le vent,
// sa valeur règle l'abondance du sable
vec3 duneWarp(vec2 x) {
  float kWarp = float(uDuneScale[0]);
  vec3 warp = noised(kWarp * (uFieldFrac[0] + x / uBiomeScale) + vec2(1.3, 7.1), uDuneScale[0] * uFieldCell[0]);
  return vec3(warp.x, warp.yz * kWarp / uBiomeScale);
}

// Direction locale du vent, perpendiculaire aux crêtes des dunes
vec2 duneWind(vec2 x) {
  return normalize(vec2(1.0, 0.0) + DUNE_WARP * duneWarp(x).yz);
}

vec3 dunes(vec2 x, float minWavelength, float contact) {
  // Même la plus grande couche est effacée : rien à évaluer
  if (uBiomeScale / float(uDuneScale[1]) <= minWavelength) return vec3(0.0);
  vec2 q = uFieldFrac[0] + x / uBiomeScale;
  vec3 warp = duneWarp(x);
  // Coordonnée le long du vent (m), tordue, et son gradient
  float along = x.x + DUNE_WARP * warp.x;
  vec2 alongGrad = vec2(1.0, 0.0) + DUNE_WARP * warp.yz;
  // Abondance du sable (0 à 1) : le même bruit, dont la valeur ne se voit pas dans la torsion (seul son gradient
  // oriente les crêtes)
  vec3 sand = smoothstepGrad(-0.5, 0.5, warp);
  vec3 h = vec3(0.0);
  // Part de chaque couche épargnée par les faces d'avalanche des couches plus grandes, et son gradient
  float stoss = 1.0;
  vec2 stossGrad = vec2(0.0);
  for (int i = 0; i < DUNE_LAYER_COUNT; i++) {
    uint k = uDuneScale[1 + 2 * i], kSegment = uDuneScale[2 + 2 * i];
    float wavelength = uBiomeScale / float(k);
    float fade = smoothstep(minWavelength, 2.0 * minWavelength, wavelength);
    if (fade <= 0.0) break;
    float top = DUNE_HEIGHTS[i] * fade;
    float g = float(kSegment) / uBiomeScale;
    uvec2 segmentCell = kSegment * uFieldCell[0];
    vec3 bend = noised(float(kSegment) * q + vec2(3.1, 8.3), segmentCell);
    // Phase (en périodes), sa partie entière en double précision par l'origine des biomes
    float scaled = float(k) * uFieldFrac[0].x;
    float phase = fract(scaled) + along / wavelength + DUNE_SINUOSITY * bend.x;
    vec2 phaseGrad = alongGrad / wavelength + DUNE_SINUOSITY * g * bend.yz;
    float norm = length(phaseGrad);
    float base = floor(phase);
    uint first = k * uFieldCell[0].x + uint(int(floor(scaled) + base));
    // Abondance du sable : seuil des tronçons et recul des cornes
    float sandRange = DUNE_SAND[2 * i + 1] - DUNE_SAND[2 * i];
    vec3 bias = vec3(DUNE_SAND[2 * i] + sandRange * sand.x, sandRange * sand.yz);
    float horn = mix(DUNE_HORNS[0], DUNE_HORNS[1], sand.x);
    vec2 hornGrad = (DUNE_HORNS[1] - DUNE_HORNS[0]) * sand.yz;
    float brinkWidth = 0.02 * wavelength + 0.5 * minWavelength;
    vec3 layer = vec3(0.0), slip = vec3(0.0);
    // Reculée d'au plus DUNE_JITTER + DUNE_HORNS[0] < 1 période, la crête n n'agit qu'entre les phases n - 1 et n + 1
    // (sa face d'avalanche s'arrête avant n + 1) : seules les deux qui encadrent le point comptent
    // Une crête ne relève le sol que là où elle dépasse -DUNE_MERGE × top, à moins de reach / pente de sa crête
    float reach = (1.0 + DUNE_MERGE) * top;
    for (int j = 0; j < 2; j++) {
      uint n = first + uint(j);
      // Décalage aléatoire de la crête le long du vent ; hors de sa portée quel que soit le recul de ses cornes, elle
      // est ignorée sans évaluer son bruit
      float pick = hash(uvec2(n, uint(i)));
      float jitter = DUNE_JITTER * pick;
      float lead = (phase - base - float(j) - jitter) / norm;
      if (lead < -reach / DUNE_WINDWARD_SLOPE || lead - horn / norm > reach / DUNE_LEE_SLOPE) continue;
      // Hauteur de la crête, et son bruit le long de z (direction moyenne des crêtes)
      float tall = top * mix(DUNE_LOWEST, 1.0, fract(97.0 * pick));
      vec2 v = noise1(float(kSegment) * q.y, segmentCell.y, n);
      vec3 m = smoothstepGrad(0.0, DUNE_SEGMENT_EDGE, vec3(v.x, 0.0, g * v.y) + bias);
      // Distance (m) à la crête le long du vent, positive en aval : ses cornes reculent là où elle s'abaisse
      float s = lead - horn * (1.0 - m.x) / norm;
      vec2 sGrad = (phaseGrad - hornGrad * (1.0 - m.x) + horn * m.yz) / norm;
      vec3 crest = tall * m;
      // Une crête basse n'a pas encore de face d'avalanche : ses pentes s'adoucissent, elle s'étale en bosse
      vec3 sharp = smoothstepGrad(0.0, DUNE_SHARP, m);
      vec3 grow = vec3(mix(DUNE_FLAT, 1.0, sharp.x), (1.0 - DUNE_FLAT) * sharp.yz);
      vec3 windward = vec3(crest.x + DUNE_WINDWARD_SLOPE * grow.x * s,
        crest.yz + DUNE_WINDWARD_SLOPE * (grow.x * sGrad + s * grow.yz));
      vec3 lee = vec3(crest.x - DUNE_LEE_SLOPE * grow.x * s, crest.yz - DUNE_LEE_SLOPE * (grow.x * sGrad + s * grow.yz));
      vec3 dune = softMin(windward, lee, (DUNE_WINDWARD_SLOPE + DUNE_LEE_SLOPE) * brinkWidth);
      // Part de face d'avalanche : passé la crête, et jusqu'à mi-hauteur au pied
      float pastBrink = 0.5 + s / (0.1 * wavelength);
      float onSlope = dune.x / (0.5 * top);
      float past = clamp(pastBrink, 0.0, 1.0), on = clamp(onSlope, 0.0, 1.0);
      vec3 duneSlip = vec3(past * on, (pastBrink > 0.0 && pastBrink < 1.0 ? sGrad / (0.1 * wavelength) : vec2(0.0)) * on
        + past * (onSlope > 0.0 && onSlope < 1.0 ? dune.yz / (0.5 * top) : vec2(0.0)));
      softMaxDune(layer, slip, dune, duneSlip, DUNE_MERGE * top);
    }
    layer = vec3(layer.x * stoss, layer.yz * stoss + layer.x * stossGrad);
    // Nappe de volume voisin : celui d'une crête continue, au prorata des tronçons
    float cover = clamp(0.5 + bias.x, 0.0, 1.0);
    vec2 coverGrad = cover > 0.0 && cover < 1.0 ? bias.yz : vec2(0.0);
    float mean = DUNE_SHEET * top * top / wavelength;
    vec3 sheet = mean * vec3(cover * stoss, coverGrad * stoss + cover * stossGrad);
    h += mix(sheet, layer, contact);
    stossGrad = stossGrad * (1.0 - slip.x) - stoss * slip.yz;
    stoss *= 1.0 - slip.x;
  }
  return h;
}
`,Pe=`// ---------- Roche en 3D ----------
// Un champ de hauteur ne peut que s'étirer sur les parois verticales : leur détail fin et la couleur de la roche
// viennent d'un bruit 3D, dont chaque octave a sa propre orientation (voir src/terrain/origins.ts).

// Poids de chaque octave dans la teinte de la roche
const float ROCK_STAIN_WEIGHTS[ROCK_OCTAVES] = float[ROCK_OCTAVES](0.32, 0.22, 0.17, 0.13, 0.1, 0.06);
// Le creusement n'utilise que les octaves de 18 m et moins : les plus grandes perceraient les arêtes fines
const int ROCK_CARVE_FIRST = 2;
// Profondeur du creusement relative à la longueur d'onde, et profondeur maximale cumulée
const float ROCK_CARVE = 0.15;
const float ROCK_CARVE_MAX = 0.15 * (18.0 + 7.0 + 2.6 + 1.0);
// Gain du bruit de gradient, plus doux que le value noise, pour un creusement de même profondeur moyenne
const float ROCK_CARVE_GAIN = 1.5;
// Le creusement est pentu : sur les parois, la distance est réduite d'autant pour que les rayons ne la traversent pas
const float ROCK_CARVE_LIPSCHITZ = 2.0;
// Arrondi des arêtes (en unités du bruit) : vives, les arêtes des grandes octaves courent sur des dizaines de mètres
// en fils et en arcs nets ; les petites restent vives, comme une roche fracturée
const float ROCK_CARVE_BEVEL[ROCK_OCTAVES] = float[ROCK_OCTAVES](0.0, 0.0, 0.25, 0.12, 0.0, 0.0);

// Position de p (x, z relatifs à la caméra, y absolu) dans l'espace de l'octave i
vec3 rockSpace(vec3 p, int i) {
  return uRockFrac[i] + uRockRot[i] * p / ROCK_WAVELENGTHS[i];
}

// Les octaves plus fines que quelques pixels sont effacées
float rockFade(int i, float footprint) {
  return smoothstep(2.0 * footprint, 4.0 * footprint, ROCK_WAVELENGTHS[i]);
}

// Profondeur (positive, m) dont la paroi est creusée : la surface ne fait que reculer, jamais avancer
float rockCarve(vec3 p, float footprint) {
  float carve = 0.0;
  for (int i = ROCK_CARVE_FIRST; i < ROCK_OCTAVES; i++) {
    float fade = rockFade(i, footprint);
    if (fade <= 0.0) break;
    // |n| ne s'annule que sur des surfaces : entre deux creux reste une arête. Bruit de gradient : les creux du
    // value noise s'alignaient sur ses cellules cubiques
    float n = clamp(ROCK_CARVE_GAIN * edgeGradientNoise3(rockSpace(p, i), uRockCell[i]), -1.0, 1.0);
    float bevel = ROCK_CARVE_BEVEL[i];
    carve += fade * ROCK_CARVE * ROCK_WAVELENGTHS[i] * (sqrt(n * n + bevel * bevel) - bevel);
  }
  return carve;
}

// Teinte de la roche, environ dans [-1, 1] : fBm de bruit de gradient sur six échelles (120 m à 1 m)
float rockStain(vec3 p, float footprint) {
  float r = 0.0;
  for (int i = 0; i < ROCK_OCTAVES; i++) {
    float fade = rockFade(i, footprint);
    if (fade <= 0.0) break;
    r += fade * ROCK_STAIN_WEIGHTS[i] * gradientNoise3(rockSpace(p, i) + 0.5, uRockCell[i]);
  }
  return r * 1.6;
}
`,Fe=`// ---------- Relief ----------
// terrainHeight() donne l'altitude du sol, que les sondes relisent pour le CPU (probe.frag.glsl) ;
// surfaceDistance() y ajoute le détail 3D des parois.

float steepness(float slope) {
  return smoothstep(STEEP_SLOPE[0], STEEP_SLOPE[1], slope);
}

// La neige comble les petits reliefs sur les zones peu pentues au-dessus de la limite des neiges
float snowSmoothing(float h, float slope) {
  return SNOW_FLATTENING * smoothstep(uSnow - 100.0, uSnow + 150.0, h) * (1.0 - smoothstep(0.35, 0.7, slope));
}

// Altitude du sol (m) en x, avec \`octaves\` octaves (fractionnaire : la dernière est fondue).
// Renvoie aussi la pente (m/m), la pente des grandes formes seules (wallSlope), qui varie lentement, et devant une
// falaise, sa distance horizontale (approchée), l'altitude de son sommet et la pente de sa face (cliffFront).
// fBm à dérivées : la pente accumulée atténue les octaves suivantes, ce qui imite l'érosion.
float terrainHeight(vec2 x, float octaves, out vec2 slope, out float wallSlope, out vec3 cliffFront) {
  vec3 c = climate(x);
  float level = c.x;
  float sand = duneWeight(level, c.y);
  vec3 biome = biomeAt(level);
  float base = biome.x, height = biome.y * (1.0 - 0.5 * sand), gain = biome.z;

  vec2 q = x / uScale;
  // dq/dx, pour connaître la vraie pente en m/m
  mat2 jacobian = mat2(1.0 / uScale);
  float a = 0.0, b = 1.0, wavelength = uScale;
  vec2 d = vec2(0.0);
  vec2 grad = vec2(0.0);
  // Altitude des grandes formes seules, figée en même temps que wallSlope
  float coarseHeight;
  wallSlope = -1.0;

  // Grandes octaves (plus larges que les seuils des parois, des crêtes vives et de la neige, voir l'échelle minimale
  // du panneau). En haute montagne, elles mêlent un bruit de gradient au value noise, dont les sommets de grille
  // font des dômes, et toutes sauf la première (le massif) deviennent des arêtes là où le massif est haut : crêtes
  // continues reliant les sommets par des cols, autour de cirques ; en bas, versants et vallées gardent le fBm ordinaire
  float alpine = smoothstep(ALPINE_LEVEL[0], ALPINE_LEVEL[1], level);
  float crestBase = 0.0, previousCrest = 1.0, crestSlope = 0.0;
  for (int i = 0; i < ALPINE_OCTAVES; i++) {
    float w = clamp(octaves - float(i), 0.0, 1.0);
    if (w <= 0.0) break;
    vec3 n = alpine > 0.0 ? hybridNoised(uOctFrac[i] + q, uOctCell[i], ALPINE_GRADIENT * alpine)
      : noised(uOctFrac[i] + q, uOctCell[i]);
    float steep = steepness(height * length(grad));
    if (i == 1) crestBase = alpine * smoothstep(CREST_BASE[0], CREST_BASE[1], base + height * a);
    float v = n.x;
    vec2 dv = n.yz;
    if (i > 0 && crestBase > 0.0) {
      // Arête 1 - 2|n|, à crête arrondie. Les arêtes plus fines naissent près de celles de l'octave précédente :
      // contreforts et arêtes secondaires, combes et cirques lisses entre elles
      float soft = sqrt(n.x * n.x + CREST_SOFTNESS);
      float s = 1.0 + sqrt(CREST_SOFTNESS) - soft;
      float crest = CREST_AMPLITUDE
        * (i == 1 ? 1.0 : mix(CREST_VALLEY, 1.0, smoothstep(CREST_WEIGHT[0], CREST_WEIGHT[1], previousCrest)));
      vec2 fold = -2.0 * crest * (n.x / soft) * n.yz;
      v = mix(n.x, crest * (2.0 * s - 1.0), crestBase);
      dv = mix(n.yz, fold, crestBase);
      previousCrest = s;
      // Pour l'érosion, seule compte la raideur de l'arête, et non le sens de sa pente : il s'inverse sur la crête, où
      // la pente accumulée sauterait, et les octaves suivantes y feraient une marche, vue comme un mur. Raideur prise
      // hors de l'arrondi, qui l'annulerait sur la crête même et y dresserait le détail en aiguilles
      d += (1.0 - crestBase) * n.yz;
      crestSlope += CREST_EROSION * crestBase * 4.0 * crest * crest * dot(n.yz, n.yz);
    } else {
      d += dv;
    }
    float amplitude = w * b * mix(1.0 / (1.0 + dot(d, d) + crestSlope), ROCK_ROUGHNESS, steep);
    a += amplitude * v;
    grad += amplitude * (transpose(jacobian) * dv);
    b *= gain;
    q = 2.0 * (M2 * q);
    jacobian = 2.0 * (M2 * jacobian);
    wavelength *= 0.5;
  }

  for (int i = ALPINE_OCTAVES; i < MAX_OCTAVES; i++) {
    float w = clamp(octaves - float(i), 0.0, 1.0);
    if (w <= 0.0) break;
    vec3 n = noised(uOctFrac[i] + q, uOctCell[i]);
    // Pour les octaves fines, la pente qui décide « roche ou versant érodé » est figée sur celle des grandes formes :
    // sinon le détail rend la pente plus raide, qui appelle plus de détail, et le terrain bascule en liserés nets
    if (wallSlope < 0.0 && wavelength < WALL_DETAIL_WAVELENGTH) {
      wallSlope = height * length(grad);
      coarseHeight = base + height * a;
    }
    float rockSlope = wavelength < WALL_DETAIL_WAVELENGTH ? wallSlope : height * length(grad);
    float steep = steepness(rockSlope);

    // Sur les pentes raides, les petites octaves deviennent des crêtes vives : arêtes et ravines de roche cassée
    float ridged = wavelength < RIDGE_WAVELENGTH ? steep : 0.0;
    float v = mix(n.x, 1.0 - 2.0 * abs(n.x), ridged);
    // Signe adouci : avec sign(n.x), la pente accumulée (donc l'érosion des octaves suivantes) sauterait le long de
    // chaque arête, et le relief y ferait une marche, vue comme un fil ou un arc net
    vec2 dv = mix(n.yz, -2.0 * (n.x / sqrt(n.x * n.x + RIDGE_SIGN_SOFTNESS)) * n.yz, ridged);
    d += dv;

    // L'atténuation par les dérivées accumulées imite l'érosion (vallées, versants doux) ;
    // sur les pentes raides, la roche reste à nu : les petites octaves gardent leur détail, et un peu plus
    float erosion = 1.0 / (1.0 + dot(d, d) + crestSlope);
    float amplitude = w * b * mix(erosion, ROCK_ROUGHNESS, steep);
    // Sur les parois, le détail fin vient du bruit 3D (surfaceDistance) : un champ de hauteur s'y étirerait
    if (wavelength < WALL_DETAIL_WAVELENGTH) amplitude *= 1.0 - smoothstep(WALL_SLOPE[0], WALL_SLOPE[1], rockSlope);
    if (wavelength < SNOW_SMOOTH_WAVELENGTH) amplitude *= 1.0 - snowSmoothing(base + height * a, height * length(grad));

    a += amplitude * v;
    grad += amplitude * (transpose(jacobian) * dv);
    b *= gain;
    q = 2.0 * (M2 * q);
    jacobian = 2.0 * (M2 * jacobian);
    wavelength *= 0.5;
  }

  slope = height * grad;
  float h = base + height * a;
  if (wallSlope < 0.0) {
    wallSlope = length(slope);
    coarseHeight = h;
  }
  // La face d'une falaise est une paroi : sa vraie pente compte pour la distance, et elle est creusée en 3D.
  // Le gradient des grandes formes prend la direction de la pente complète, à peine différente près des côtes
  vec2 coarseGrad = slope * (wallSlope / max(length(slope), 1e-6));
  vec3 cliff = cliffLift(x, vec3(coarseHeight, coarseGrad), c.z, cliffFront);
  h += cliff.x;
  slope += cliff.yz;
  wallSlope = max(wallSlope, length(cliff.yz));
  if (sand <= 0.0) return h;
  // Les dunes fondent contre le relief (pente des grandes formes, falaises comprises) ; elles peuvent surmonter une
  // falaise, dont le sommet est relevé d'autant pour la distance
  float contact = 1.0 - smoothstep(DUNE_CONTACT_SLOPE[0], DUNE_CONTACT_SLOPE[1], wallSlope);
  vec3 dune = sand * dunes(x, uScale * exp2(-octaves), contact);
  slope += dune.yz;
  cliffFront.y += sand * DUNE_MAX_HEIGHT;
  return h + dune.x;
}

float terrain(vec2 x, float octaves) {
  vec2 slope;
  float wallSlope;
  vec3 cliffFront;
  return terrainHeight(x, octaves, slope, wallSlope, cliffFront);
}

// Niveau de détail : nombre d'octaves dont la longueur d'onde dépasse deux pixels à la distance t
float lod(float t) {
  float footprint = max(t, 0.01) * lodPixelAngle * uDetail;
  return clamp(log2(uScale / (2.0 * footprint)), 1.0, float(MAX_OCTAVES));
}

// Distance (approchée, minorée) entre p et la surface, vue depuis la distance t.
// Hors des parois, c'est l'écart vertical au champ de hauteur. Sur les parois, cet écart est ramené à une vraie
// distance et la paroi est creusée par le bruit 3D de la roche
float surfaceDistance(vec3 p, float t) {
  vec2 slope;
  float wallSlope;
  vec3 cliffFront;
  float dy = p.y - terrainHeight(p.xz, lod(t), slope, wallSlope, cliffFront);
  // Devant une falaise, le champ de hauteur ignore la paroi qui se dresse un peu plus loin : la distance est bornée
  // par l'écart à son pied et au-dessus de son sommet, sans descendre sous l'écart vertical rapporté à sa pente.
  // Ni sous un pixel : seul le vrai relief déclenche l'impact
  float front = max(max(cliffFront.x, p.y - cliffFront.y), dy / (1.0 + cliffFront.z));
  dy = min(dy, max(front, t * lodPixelAngle));
  float wall = smoothstep(WALL_SLOPE[0], WALL_SLOPE[1], wallSlope);
  if (wall <= 0.0) return dy;
  float e = mix(dy, dy / sqrt(1.0 + dot(slope, slope)), wall);
  if (e >= ROCK_CARVE_MAX) return e;
  // Empreinte doublée : les parois sont souvent vues de biais, où un pixel couvre bien plus de roche
  return (e + wall * rockCarve(p, 2.0 * t * lodPixelAngle * uDetail)) / (1.0 + ROCK_CARVE_LIPSCHITZ * wall);
}
`,Ie=`// ---------- Courbure terrestre ----------
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
`,Le=`// ---------- Atmosphère ----------
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

// Même intégrale le long d'un rayon parti de l'altitude y jusqu'à l'infini, courbure comprise : le rayon s'élève de
// a t² au-dessus de la sphère (voir rayPoint). Finie à l'horizon, elle se prolonge sous l'horizon géométrique, où le
// rayon descend jusqu'à son point tangent avant de remonter. Loin de l'horizon, elle rejoint opticalLength()
float skyOpticalLength(float y, vec3 rd, float scaleHeight) {
  float a = CURVE * max(dot(rd.xz, rd.xz), 1e-6);
  float x = 0.5 * rd.y * inversesqrt(a * scaleHeight);
  // exp(x²) erfc(x), approché à 2 % près, et prolongé aux x négatifs par erfc(-x) = 2 - erfc(x)
  float erfcx = 2.0 / (1.7724539 * (abs(x) + sqrt(x * x + 1.2732395)));
  float density = exp(-y / scaleHeight);
  float integral = x >= 0.0 ? density * erfcx : 2.0 * exp(min(x * x - y / scaleHeight, 80.0)) - density * erfcx;
  return sqrt(3.14159265 * scaleHeight / (4.0 * a)) * integral;
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

// Distance qui désigne un rayon sans fin (ciel) : l'air y est intégré jusqu'à l'infini, courbure comprise
const float SKY_DISTANCE = 1e7;

// Lumière diffusée vers l'œil le long du rayon (ro, rd) sur t mètres ; transmittance : part de la lumière du fond
// qui traverse ce segment. sunLit : part de l'air du segment éclairée par le soleil direct (la diffusion multiple
// n'en dépend pas)
vec3 inScatter(vec3 ro, vec3 rd, float t, float sunLit, out vec3 transmittance) {
  vec2 air = t < SKY_DISTANCE
    ? vec2(opticalLength(ro.y, rd.y, t, RAYLEIGH_HEIGHT), opticalLength(ro.y, rd.y, t, AEROSOL_HEIGHT))
    : vec2(skyOpticalLength(ro.y, rd, RAYLEIGH_HEIGHT), skyOpticalLength(ro.y, rd, AEROSOL_HEIGHT));
  vec3 tauR = RAYLEIGH * air.x;
  vec3 tauA = vec3(uFog * air.y);
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
  vec3 far = inScatter(ro + rd * shaded, rd, t < SKY_DISTANCE ? t - shaded : t, 1.0, transmittance);
  transmittance *= nearTransmittance;
  return near + nearTransmittance * far;
}

// Lumière diffusée par l'atmosphère vue depuis la caméra, sans le disque solaire ; shaded : voir scatter()
vec3 skyScatter(vec3 rd, float shaded) {
  vec3 transmittance;
  return scatter(vec3(0.0, uCamY, 0.0), rd, SKY_DISTANCE, shaded, transmittance);
}

// Ciel vu depuis la caméra, disque solaire compris ; shaded : voir scatter()
vec3 sky(vec3 rd, float shaded) {
  return skyScatter(rd, shaded) + sunCol * 40.0 * smoothstep(0.99985, 0.99995, dot(rd, uSunDir));
}

// Brume entre l'œil (ro) et le point p (voir rayPoint), le long de leur corde ; shaded : voir scatter()
vec3 applyFog(vec3 col, vec3 ro, vec3 p, float shaded) {
  vec3 chord = p - ro;
  float len = length(chord);
  vec3 transmittance;
  vec3 scattered = scatter(ro, chord / max(len, 1e-6), len, shaded, transmittance);
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
    sum += inScatter(ro, dirs[i], SKY_DISTANCE, 1.0, transmittance) * max(dot(n, dirs[i]) + 0.5, 0.0);
  }
  aerosolG = AEROSOL_G;
  // Le sol plat reçoit 2,5 fois la luminance moyenne de ces directions (poids total 4,8)
  return sum * 0.52;
}
`,Re=`// ---------- Matériaux et éclairage ----------

// Épaisseur des strates de roche (m)
const float STRATA_THICKNESS = 14.0;

// Relief autour d'un point vu depuis la distance t : normale fine (lumière), normale des formes quelques fois plus
// grandes que le pixel (répartition des matériaux, qui ne doit pas suivre le moindre détail), et cavité, négative
// dans les creux et positive sur les bosses (occlusion, neige, végétation)
struct Surface {
  vec3 normal;
  vec3 coarse;
  float cavity;
  float valley;
};

Surface surfaceAt(vec3 p, float t) {
  Surface s;
  s.normal = calcNormal(p, t);
  float octaves = lod(t);
  float coarseOctaves = max(octaves - 3.0, 1.0);
  float e = max(t * lodPixelAngle * 8.0, 0.5);
  float h = terrain(p.xz, octaves);
  float hc = terrain(p.xz, coarseOctaves);
  s.coarse = normalize(vec3(
    hc - terrain(p.xz + vec2(e, 0.0), coarseOctaves),
    e,
    hc - terrain(p.xz + vec2(0.0, e), coarseOctaves)
  ));
  s.cavity = clamp((h - hc) / e, -1.0, 1.0);
  // Creux et bosses de 375 m et moins, à toute distance : négatif dans les vallons, positif sur les croupes
  s.valley = clamp((terrain(p.xz, min(octaves, 4.0)) - h) / 30.0, -1.0, 1.0);
  return s;
}

// Variation de couleur à grande échelle (375 m à 47 m) : fBm des octaves tournées du relief, décalé pour ne pas
// reproduire ses formes. En 2D : il s'étirerait sur les parois, où rockVariation() prend le relais
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

// fBm des octaves first à last du relief, décalé, de gain \`gain\`. Chaque octave s'efface sous deux pixels (footprint
// en m) sans que les autres soient renforcées : au loin, le contraste du détail disparaît avec lui
float vegetationNoise(vec2 x, vec2 offset, int first, int last, float gain, float footprint) {
  vec2 q = x / uScale;
  float wavelength = uScale;
  float a = 0.0, b = 1.0, norm = 0.0;
  for (int i = 0; i <= last; i++) {
    if (i >= first) {
      float fade = smoothstep(2.0 * footprint, 4.0 * footprint, wavelength);
      if (fade > 0.0) a += fade * b * noised(uOctFrac[i] + q + offset, uOctCell[i]).x;
      norm += b;
      b *= gain;
    }
    q = 2.0 * (M2 * q);
    wavelength *= 0.5;
  }
  return a / norm;
}

// Houppiers : dans chaque cellule de l'octave \`octave\` du relief, un arbre placé au hasard, présent avec une
// probabilité qui suit cover (part du sol couverte) : là où elle baisse, le couvert s'éclaircit en bosquets et en
// arbres isolés de taille normale. Chaque houppier est un dôme lisse de hauteur égale à son rayon ; leur somme forme
// une canopée bosselée sans arête. Renvoie la hauteur relative de la canopée (0 hors des houppiers, 1 au sommet d'un
// arbre seul), sa pente, et une valeur aléatoire propre aux arbres, moyennée là où ils se touchent
vec4 crowns(vec2 x, int octave, float cover) {
  mat2 jacobian;
  vec2 q = octaveSpace(x, octave, jacobian);
  vec2 fl = floor(q);
  vec2 f = q - fl;
  uvec2 cell = uvec2(ivec2(fl)) + uOctCell[octave];
  float presence = min(1.2 * cover, 0.92);
  float height = 0.0, tint = 0.0;
  vec2 slope = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      uvec2 c = cell + uvec2(ivec2(i, j));
      float a = hash(c + uvec2(7919u, 104729u)), b = hash(c + uvec2(65537u, 3571u));
      if (fract(71.3 * a + 29.1 * b) >= presence) continue;
      vec2 d = f - vec2(i, j) - 0.2 - 0.6 * vec2(a, b);
      float r = 0.35 + 0.45 * fract(37.3 * a + 91.7 * b);
      float h = max(1.0 - dot(d, d) / (r * r), 0.0);
      height += h * h;
      slope -= 4.0 * h * d / r;
      tint += h * h * fract(113.1 * a + 57.9 * b);
    }
  }
  slope = transpose(jacobian) * slope * (uScale / exp2(float(octave)));
  return vec4(height, slope, height > 0.0 ? tint / height : 0.5);
}

// ---------- Micro-relief ----------
// Relief plus fin que le champ de hauteur, présent dans l'ombrage seulement : sa pente (m/m) incline la normale,
// sans rien changer à la marche des rayons, aux ombres portées ni aux collisions. Chaque détail s'efface sous deux à
// quatre pixels de son empreinte en profondeur, comme vegetationNoise().

// Value noise de l'octave \`octave\` du relief, ses coordonnées multipliées par \`scale\` (entiers : il reste attaché au
// sol). Avec deux facteurs différents, des traînées allongées selon l'axe de l'octave, que sa rotation oriente.
// Valeur et gradient par mètre
vec3 streakNoise(vec2 x, int octave, vec2 offset, uvec2 scale) {
  mat2 jacobian;
  vec2 k = vec2(scale);
  vec3 n = noised(k * (octaveSpace(x, octave, jacobian) + offset), uOctCell[octave] * scale);
  return vec3(n.x, transpose(jacobian) * (k * n.yz));
}

// Rides de sable : bruits de l'octave 13 du relief (73 cm), et réseau de l'octave 11 dont les rides ont pour vecteurs
// d'onde des combinaisons entières de ses axes, de norme voisine de RIPPLE_NORM (longueur d'onde ≈ 24 cm) : la phase
// reste attachée au sol malgré l'origine décalée, et deux directions voisines ne diffèrent que de 5° environ
const int RIPPLE_OCTAVE = 13;
const int RIPPLE_GRID_OCTAVE = 11;
const float RIPPLE_NORM = 12.0;
// Pas angulaire entre deux directions voisines du réseau
const float RIPPLE_STEP = 3.1415927 / 38.0;
// Hauteur des rides relative à leur longueur d'onde
const float RIPPLE_HEIGHT = 0.035;

float rippleWavelength() {
  return uScale / exp2(float(RIPPLE_GRID_OCTAVE)) / RIPPLE_NORM;
}

// Une famille de rides dont le vecteur d'onde est le plus proche de RIPPLE_NORM dans la direction angle (espace du
// réseau), orientée dans le sens du vent windQ : versant au vent en pente douce, face sous le vent raide. Renvoie
// (hauteur dans [0, 1], gradient par mètre de la hauteur en m)
vec3 rippleSet(vec2 q, mat2 jacobian, float angle, vec2 windQ, vec3 warp) {
  vec2 d = round(RIPPLE_NORM * vec2(cos(angle), sin(angle)));
  d *= sign(dot(d, windQ) + 1e-6);
  float phase = 6.2831853 * (dot(q, d) + warp.x);
  float skewed = phase + 0.5 * sin(phase);
  float h = 0.5 - 0.5 * sin(skewed);
  float dh = -0.5 * cos(skewed) * (1.0 + 0.5 * cos(phase)) * 6.2831853;
  return vec3(h, RIPPLE_HEIGHT * rippleWavelength() * dh * (transpose(jacobian) * d + warp.yz));
}

// Rides éoliennes, crêtes perpendiculaires au vent local des dunes, sinueuses, plus ou moins marquées par plaques.
// D'une direction du réseau à la suivante, les deux familles se relaient sur une bande étroite et irrégulière : la
// plus haute l'emporte (maximum adouci), si bien que leurs crêtes se raccordent en Y, comme les défauts des vraies
// rides ; mêlées par une moyenne, elles se croiseraient en damier.
// Renvoie (hauteur centrée, dans [-0,5, 0,5], pente) pondérées par fade
vec3 sandRipples(vec2 x, float fade) {
  mat2 jacobian;
  vec2 q = octaveSpace(x, RIPPLE_GRID_OCTAVE, jacobian);
  vec2 windQ = jacobian * duneWind(x);
  float steps = atan(windQ.y, windQ.x) / RIPPLE_STEP + 0.6 * octaveNoise(x, RIPPLE_OCTAVE - 4, vec2(-8.1, 3.7)).x
    + 0.25 * octaveNoise(x, RIPPLE_OCTAVE - 2, vec2(6.2, -1.4)).x;
  float k = floor(steps);
  float relay = smoothstep(0.35, 0.65, steps - k);
  vec3 warp = 0.6 * octaveNoise(x, RIPPLE_OCTAVE - 2, vec2(4.1, -7.3)) + 0.25 * octaveNoise(x, RIPPLE_OCTAVE - 1, vec2(-3.3, 1.9))
    + 0.1 * octaveNoise(x, RIPPLE_OCTAVE, vec2(7.7, 2.2));
  vec3 a = rippleSet(q, jacobian, k * RIPPLE_STEP, windQ, warp);
  vec3 b = rippleSet(q, jacobian, (k + 1.0) * RIPPLE_STEP, windQ, warp);
  // Maximum adouci de a - relay et b - (1 - relay)
  float gap = a.x - b.x + 1.0 - 2.0 * relay;
  float pick = 0.5 + 0.5 * gap / sqrt(gap * gap + 0.04);
  vec3 ripple = mix(b, a, pick);
  // Rides nettes par endroits, à peine esquissées ailleurs, et crêtes plus ou moins hautes le long de leur tracé
  float strength = 0.2 + 0.8 * smoothstep(-0.6, 0.6, octaveNoise(x, RIPPLE_OCTAVE - 3, vec2(-2.9, 5.7)).x
    + 0.4 * octaveNoise(x, RIPPLE_OCTAVE - 5, vec2(3.4, 8.8)).x + 0.35 * octaveNoise(x, RIPPLE_OCTAVE - 1, vec2(-6.1, -4.4)).x);
  return vec3(ripple.x - 0.5, ripple.yz) * strength * fade;
}

// Touffes d'herbe de 1,5 m à 40 cm : bosses arrondies sur un sol plus plat. Renvoie (hauteur relative, environ dans
// [0, 1], pente)
vec3 grassTufts(vec2 x, float depthFootprint) {
  vec3 tufts = vec3(0.0);
  for (int octave = 12; octave <= 14; octave++) {
    float wavelength = uScale / exp2(float(octave));
    float fade = smoothstep(2.0 * depthFootprint, 4.0 * depthFootprint, wavelength);
    if (fade <= 0.0) break;
    vec3 n = streakNoise(x, octave, vec2(8.3, -1.9), uvec2(1u));
    float bump = max(n.x, 0.0);
    tufts += fade * vec3(0.4 * bump * bump, 0.12 * wavelength * bump * n.yz);
  }
  return tufts;
}

// Sastrugi : crêtes de neige vives sculptées par le vent, allongées (3 m, et 70 cm plus discrètes), toutes dans la même direction.
// Renvoie la pente
vec2 sastrugi(vec2 x, float depthFootprint) {
  const int octave = 11;
  float wavelength = uScale / exp2(float(octave));
  vec2 slope = vec2(0.0);
  for (uint k = 1u; k <= 4u; k *= 4u) {
    float fade = smoothstep(2.0 * depthFootprint, 4.0 * depthFootprint, wavelength / (4.0 * float(k)));
    if (fade <= 0.0) break;
    vec3 n = streakNoise(x, octave, vec2(-5.3, 2.7) * float(k), uvec2(k, 3u * k));
    slope -= fade * 0.015 * wavelength / float(k * k) * n.x / sqrt(n.x * n.x + 0.02) * n.yz;
  }
  return slope;
}

// Éboulis au pied des pentes : blocs (cellules de 1,5 m) à la densité cover, gravier entre eux. Renvoie la pente et
// la teinte (multiplicateur de l'albédo)
vec2 scree(vec2 x, float cover, float depthFootprint, float sideways, out float tint) {
  tint = 1.0;
  vec2 slope = vec2(0.0);
  const int BLOCK_OCTAVE = 12;
  float cell = uScale / exp2(float(BLOCK_OCTAVE));
  float blockFade = smoothstep(2.0 * depthFootprint, 4.0 * depthFootprint, cell) * sideways;
  if (blockFade > 0.0 && cover > 0.0) {
    vec4 block = crowns(x, BLOCK_OCTAVE, cover);
    float inside = smoothstep(0.0, 0.2, block.x);
    tint = mix(1.0, mix(0.75, (0.8 + 0.5 * block.w) * (0.9 + 0.15 * min(block.x, 1.0)), inside), blockFade);
    slope += blockFade * 0.5 * inside * block.yz;
  }
  float gravel = uScale / exp2(14.0);
  float gravelFade = smoothstep(2.0 * depthFootprint, 4.0 * depthFootprint, gravel);
  if (gravelFade > 0.0) {
    vec3 n = streakNoise(x, 14, vec2(3.3, 9.1), uvec2(1u));
    vec3 m = streakNoise(x, 14, vec2(-6.7, 1.3), uvec2(2u));
    tint *= 1.0 + gravelFade * (0.12 * n.x + 0.08 * m.x);
    slope += gravelFade * 0.04 * gravel * (n.yz + 0.5 * m.yz);
  }
  return slope;
}

// Équivalent 3D de colorVariation pour les pentes raides (octaves de 120 m et 48 m du bruit de la roche)
float rockVariation(vec3 p) {
  return 0.65 * gradientNoise3(rockSpace(p, 0) + 0.25, uRockCell[0]) + 0.35 * gradientNoise3(rockSpace(p, 1) + 0.25, uRockCell[1]);
}

vec3 terrainAlbedo(vec3 p, inout Surface s, float t) {
  float footprint = t * lodPixelAngle;
  // Vu en rasant, un pixel couvre 1/cos plus de sol en profondeur : un détail encore visible en largeur y serait
  // écrasé en stries parallèles à l'horizon, il s'efface donc selon l'empreinte en profondeur
  vec3 view = normalize(vec3(p.x, p.y - uCamY, p.z));
  float cosView = max(-dot(view, s.coarse), 0.02);
  float depthFootprint = footprint / cosView;
  // Vues de biais, les brins et les blocs se recouvrent : leur contraste baisse
  float sideways = smoothstep(0.1, 0.6, cosView);
  float steep = smoothstep(0.25, 0.5, 1.0 - s.coarse.y);
  float flatVariation = colorVariation(p.xz);
  float steepVariation = rockVariation(p);
  float variation = mix(flatVariation, steepVariation, steep);
  vec3 c = climate(p.xz);
  float desert = c.y;

  // Roche : gris froid en climat tempéré (sol nu plus brun hors des pentes raides), brun-rouge en climat aride,
  // tachée à plusieurs échelles
  float tone = clamp(0.5 + 0.35 * variation + 0.35 * rockStain(p, footprint), 0.0, 1.0);
  vec3 col = mix(
    mix(vec3(0.065, 0.068, 0.068), vec3(0.17, 0.17, 0.165), tone) * mix(vec3(0.8, 0.77, 0.72), vec3(1.0), steep),
    mix(vec3(0.2, 0.1, 0.055), vec3(0.36, 0.2, 0.11), tone),
    desert
  );

  // Strates sur les pentes raides : bandes de teintes différentes, légèrement inclinées et ondulées,
  // effacées quand elles deviennent plus fines que quelques pixels
  float strataPhase = (p.y + 25.0 * steepVariation) / STRATA_THICKNESS;
  float layer = fract(sin(floor(strataPhase) * 12.9898) * 43758.5453);
  float edge = smoothstep(0.0, 0.15, fract(strataPhase)) * smoothstep(1.0, 0.85, fract(strataPhase));
  vec3 strataTint = mix(vec3(0.85, 0.87, 0.9), vec3(1.1, 1.03, 0.92), layer) * (0.88 + 0.12 * edge);
  col *= mix(vec3(1.0), strataTint, steep * smoothstep(2.0 * footprint, 6.0 * footprint, STRATA_THICKNESS));

  // Lichens : taches gris-vert sur la roche tempérée, sous la limite de la végétation
  float lichen = smoothstep(-0.1, 0.4, rockVariation(p + 31.7)) * (1.0 - desert)
    * (1.0 - smoothstep(uVegetation, uVegetation + 800.0, p.y));
  col *= mix(vec3(1.0), vec3(0.8, 0.9, 0.72), 0.6 * lichen);

  // Éboulis : gravier sur le sol nu hors des parois, blocs au pied des pentes et dans les creux
  float bare = 1.0 - steep;
  vec2 micro = vec2(0.0);
  if (bare > 0.0) {
    float blocks = bare * clamp(1.5 * smoothstep(0.04, 0.2, 1.0 - s.coarse.y) + 0.5 * s.valley - s.cavity, 0.0, 0.8);
    float tint;
    micro = bare * scree(p.xz, blocks, depthFootprint, sideways, tint);
    col *= mix(1.0, tint, bare);
  }

  // Végétation : là où les formes (et non le détail du pixel) sont peu pentues, davantage dans les creux,
  // sous la limite de végétation, hors désert
  float gentle = mix(s.normal.y, s.coarse.y, 0.75) - 0.06 * s.cavity + 0.04 * variation;
  float vegetation = smoothstep(0.8, 0.93, gentle) * (1.0 - smoothstep(0.2, 1.0, desert))
    * (1.0 - smoothstep(uVegetation - 200.0, uVegetation + 200.0, p.y + variation * 250.0));

  // Herbe : teinte qui varie doucement de quelques mètres à quelques centaines (frais, sec, plus sombre), touffes
  // de 6 m à 70 cm et brins de 40 cm à 2 cm, effacés selon l'empreinte en profondeur
  float patches = (0.5 + 0.5 * sideways) * vegetationNoise(p.xz, vec2(-41.7, 23.9), 8, 12, 0.6, depthFootprint);
  float tufts = sideways * vegetationNoise(p.xz, vec2(5.3, 61.2), 10, 13, 0.8, depthFootprint);
  float blades = sideways * vegetationNoise(p.xz, vec2(-12.7, 44.1), 14, 18, 1.0, depthFootprint);
  float dryness = clamp(0.5 + 0.45 * flatVariation + 0.35 * patches + 0.3 * tufts + 0.3 * blades, 0.0, 1.0);
  vec3 grass = mix(vec3(0.075, 0.115, 0.04), vec3(0.15, 0.15, 0.07), dryness);
  grass *= 1.0 + 0.4 * tufts + 0.8 * blades;
  // Vers le désert, l'herbe sèche en steppe paille plutôt que de se mêler au sol brun
  grass = mix(grass, vec3(0.2, 0.16, 0.075) * (1.0 + 0.3 * tufts), smoothstep(0.0, 0.5, desert));

  // Forêt : massifs dont la couverture varie selon les régions, plutôt dans les vallons et sur les versants
  // que sur les croupes, aux lisières découpées
  float region = vegetationNoise(p.xz, vec2(-73.1, 12.4), 1, 2, 0.6, depthFootprint);
  float edges = vegetationNoise(p.xz, vec2(31.9, -57.3), 4, 10, 0.6, depthFootprint);
  float hillside = smoothstep(0.995, 0.93, s.coarse.y);
  float woods = 0.6 * edges + region + 0.5 * s.valley + 0.2 * hillside - 0.25;
  float forest = 0.7 * smoothstep(0.0, 0.15, woods) * (1.0 - smoothstep(uVegetation - 600.0, uVegetation - 200.0, p.y));
  grass = mix(grass, vec3(0.055, 0.08, 0.037) * (1.0 + 0.3 * edges), forest);
  col = mix(col, grass, vegetation);
  // Touffes en relief hors forêt, leurs sommets plus clairs
  if (vegetation > 0.0) {
    vec3 tufts = sideways * (1.0 - forest) * grassTufts(p.xz, depthFootprint);
    col *= 1.0 + 0.25 * vegetation * tufts.x;
    micro = mix(micro, tufts.yz, vegetation);
  }

  // Sable : plages des côtes marines (pas des lacs), de largeur variable, et tout le plat en désert
  float coastal = seaCoast(c.x);
  float beachTop = uWater + 1.0 + 3.5 * (0.5 + 0.5 * flatVariation);
  float beach = coastal * (1.0 - smoothstep(beachTop - 1.0, beachTop, p.y));
  float sand = max(beach, desert * lowland(c.x)) * smoothstep(0.6, 0.85, mix(s.normal.y, s.coarse.y, 0.5));
  // Sable de plage beige doré, sable du désert ocre orangé, nuancé de 375 m à 6 m
  float sandVariation = flatVariation + 0.6 * vegetationNoise(p.xz, vec2(27.7, -15.1), 7, 10, 0.7, depthFootprint);
  vec3 sandColor = mix(vec3(0.76, 0.63, 0.41), vec3(0.68, 0.38, 0.16), desert) * (0.94 + 0.14 * sandVariation);
  // Rides, plus rares sur les faces d'avalanche ; les crêtes, de grain plus grossier, sont un peu plus claires
  float rippleFade = smoothstep(3.0 * depthFootprint, 6.0 * depthFootprint, rippleWavelength());
  micro *= 1.0 - sand;
  if (sand > 0.0 && rippleFade > 0.0) {
    vec3 ripple = sandRipples(p.xz, rippleFade * mix(0.4, 1.0, smoothstep(0.8, 0.9, s.normal.y)));
    sandColor *= 1.0 + 0.06 * ripple.x;
    micro += sand * ripple.yz;
  }
  col = mix(col, sandColor, sand);

  // Rive mouillée : sable ou terre plus sombres juste au-dessus de l'eau
  float wet = 1.0 - smoothstep(uWater + 0.2, uWater + 1.2 + 0.6 * flatVariation, p.y);
  col *= 1.0 - 0.4 * wet;

  // Neige : la limite monte sur les versants au soleil et en climat aride ; elle tient dans les creux et
  // sur les pentes douces, moins sur les bosses ventées
  vec2 slopeDir = s.coarse.xz;
  float sunward = dot(slopeDir, normalize(uSunDir.xz + vec2(1e-4))) / max(length(slopeDir), 0.05)
    * smoothstep(0.05, 0.3, length(slopeDir));
  float snowLine = uSnow + 120.0 * sunward + 400.0 * desert;
  // Bords nets, découpés par un bruit 3D : sur ces champs lisses (normale des grandes formes, bruit 2D étiré sur les
  // pentes), une transition large mêlait neige et roche en traînées grises floues. La normale fine ne fait qu'ôter de
  // la neige (affleurements) : elle n'en pose pas en réseau sur les parois. Hors des pentes raides, le bruit ne fait
  // que descendre la limite (névés) : au-dessus, il trouait replats et pentes douces de taches sans rapport au relief
  float snow = 0.0;
  if (p.y + 250.0 * abs(steepVariation) + 80.0 > snowLine) {
    float breakup = rockStain(p + vec3(57.3, 0.0, -31.9), footprint);
    float hold = min(s.coarse.y, s.normal.y + 0.12) - 0.05 * s.cavity + min((p.y - snowLine) * 0.0002, 0.1) + 0.1 * breakup;
    float jitter = 250.0 * steepVariation + 60.0 * breakup;
    snow = smoothstep(snowLine - 15.0, snowLine + 15.0, p.y + mix(max(jitter, 0.0), jitter, steep)) * smoothstep(0.6, 0.63, hold);
  }
  // Sastrugi sur la neige peu pentue
  if (snow > 0.0) {
    micro = mix(micro, smoothstep(0.75, 0.9, s.coarse.y) * sastrugi(p.xz, depthFootprint), snow);
  }
  s.normal = normalize(s.normal - vec3(micro.x, 0.0, micro.y));
  return mix(col, vec3(0.85, 0.88, 0.92), snow);
}

vec3 shadeTerrain(vec3 p, float t, int shadowSteps) {
  Surface s = surfaceAt(p, t);
  vec3 albedo = terrainAlbedo(p, s, t);
  vec3 n = s.normal;
  float dif = max(dot(n, uSunDir), 0.0);
  float shadow = dif > 0.0 ? softShadow(p + n * max(0.05, t * pixelAngle * 2.0), uSunDir, t, shadowSteps) : 0.0;
  // Les creux reçoivent moins de ciel et de lumière renvoyée
  float occlusion = clamp(1.0 + 0.6 * s.cavity, 0.55, 1.0);
  vec3 skyLight = skyIrradiance(p.y, n) * occlusion;
  // Lumière renvoyée (albédo moyen d'environ 0,15) par le sol plat alentour, éclairé par le soleil et le ciel, et,
  // pour un versant tourné à l'opposé du soleil, par les versants d'en face qui reçoivent le soleil de face
  vec3 ground = sunCol * SUN_IRRADIANCE * max(uSunDir.y, 0.0) + skyIrradiance(p.y, vec3(0.0, 1.0, 0.0));
  vec3 antiSun = normalize(vec3(-uSunDir.x, 0.0, -uSunDir.z) + vec3(1e-4, 0.0, 0.0));
  vec3 slopes = sunCol * SUN_IRRADIANCE * 0.8;
  vec3 bounce = (ground * clamp(0.5 - 0.5 * n.y, 0.0, 1.0) + slopes * max(dot(n, antiSun), 0.0)) * 0.15 * occlusion;
  return albedo * (sunCol * SUN_IRRADIANCE * dif * shadow + skyLight + bounce);
}

// ---------- Eau ----------

// Hauteur des rides (m) : bruit 3D de la roche sur le plan d'eau, octaves de 18 m à 1 m effacées sous un pixel
float waveHeight(vec3 p, float footprint) {
  float h = 0.0;
  for (int i = 2; i < ROCK_OCTAVES; i++) {
    float fade = rockFade(i, footprint);
    if (fade <= 0.0) break;
    h += fade * 0.012 * ROCK_WAVELENGTHS[i] * gradientNoise3(rockSpace(p, i) + 0.37, uRockCell[i]);
  }
  return h;
}

vec3 waterNormal(vec3 p, float t) {
  float footprint = t * lodPixelAngle;
  float e = max(footprint, 0.05);
  float h = waveHeight(p, footprint);
  return normalize(vec3(h - waveHeight(p + vec3(e, 0.0, 0.0), footprint), e, h - waveHeight(p + vec3(0.0, 0.0, e), footprint)));
}

// Eau : reflet ridé du relief et du ciel selon Fresnel, reflet du soleil, fond visible et teinté par l'absorption
// quand l'eau est peu profonde, écume au bord. rd : direction du rayon à la surface, courbure comprise (rayDir)
vec3 shadeWater(vec3 p, vec3 rd, float t) {
  vec3 n = waterNormal(p, t);
  vec3 r = reflect(rd, n);
  r.y = abs(r.y);
  float cosView = max(dot(-rd, n), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - cosView, 5.0);

  // Reflet allégé : détail plus grossier, budget de pas et ombres réduits, invisibles une fois mêlés au Fresnel.
  // En aperçu, plus grossier encore et sans ombre portée
  bool preview = uPreview > 0.5;
  float lodScale = preview ? 3.0 : 2.0;
  float tr = march(p + vec3(0.0, 0.05, 0.0), r, 0.5, TMAX, t, lodScale, preview ? 120 : 200);
  // Un reflet rasant épuise ses pas au-dessus du fond marin, loin du relief : il reflète le ciel. Au bord, il touche
  // la berge, ou part de sous la berge plus grossière du reflet : il la montre, sans quoi la rive aurait un liseré de ciel
  vec3 hit = rayPoint(p, r, tr);
  float tl = (t + tr) * lodScale;
  if (tr > 0.0 && terrain(hit.xz, lod(tl)) < min(uWater, hit.y - tl * lodPixelAngle)) tr = -1.0;
  vec3 reflection = sky(r, 0.0);
  if (tr > 0.0) {
    reflection = applyFog(shadeTerrain(hit, t + tr, preview ? 0 : 24), p, hit, 0.0);
  }
  float shadow = preview ? 1.0 : softShadow(p, uSunDir, t, 16);

  // Reflet du soleil (GGX), d'autant plus diffus que l'eau est loin et que ses rides ne sont plus résolues
  float roughness = clamp(0.06 + t * lodPixelAngle * 0.03, 0.06, 0.35);
  float a2 = roughness * roughness * roughness * roughness;
  vec3 halfway = normalize(uSunDir - rd);
  float nh = max(dot(n, halfway), 0.0);
  float distribution = a2 / (3.14159 * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0));
  float sunFresnel = 0.02 + 0.98 * pow(1.0 - max(dot(halfway, -rd), 0.0), 5.0);
  vec3 specular = sunCol * SUN_IRRADIANCE * shadow * distribution * sunFresnel / max(4.0 * cosView, 0.1);

  // Ce qu'on voit sous la surface : fond plus ou moins absorbé (le rouge disparaît le premier), puis la couleur
  // propre de l'eau profonde. Sable clair sur les côtes marines ; vase sombre comme la rive mouillée dans les lacs et
  // les rivières, dont le bord peu profond, plus fin qu'un pixel au loin, ferait sinon un liseré clair
  vec3 light = sunCol * SUN_IRRADIANCE * max(uSunDir.y, 0.0) * shadow + skyIrradiance(uWater, vec3(0.0, 1.0, 0.0));
  float depth = max(uWater - terrain(p.xz, lod(t)), 0.0);
  vec3 absorption = exp(-vec3(0.35, 0.09, 0.06) * depth * 1.6);
  float sea = seaCoast(climate(p.xz).x);
  vec3 bed = mix(vec3(0.07, 0.07, 0.045), vec3(0.4, 0.35, 0.25), sea);
  vec3 below = bed * light * absorption + vec3(0.008, 0.03, 0.04) * light * (1.0 - absorption);

  // Écume des côtes marines sur les premiers décimètres de profondeur, en traînées, effacée sous la taille d'un pixel
  float foamNoise = gradientNoise3(rockSpace(p, 4) + 0.71, uRockCell[4]);
  float foam = sea * (1.0 - smoothstep(0.0, 0.7, depth)) * mix(0.35, smoothstep(-0.1, 0.5, foamNoise), rockFade(4, t * lodPixelAngle));

  vec3 col = mix(below, reflection, fresnel) + specular;
  return mix(col, vec3(0.75) * light, foam * 0.8);
}

// Courbe de tons ACES (approximation de Narkowicz)
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
`,ze=`// ---------- Point d'entrée ----------
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

  // Le terrain n'est cherché que jusqu'à la surface de l'eau, sphérique : au-delà de l'horizon marin, le rayon passe
  float tWater = rayToLevel(ro, rd, uWater);
  // Un rayon qui passe à moins d'un pixel au-dessus de l'horizon marin y touche l'eau : sinon il ramperait au ras du
  // fond marin jusqu'à épuiser ses pas
  if (tWater < 0.0) tWater = rayGrazesLevel(ro, rd, uWater);
  // Juste au-dessus de l'horizon, le rayon longe longtemps la mer avant d'atteindre les terres lointaines : il lui
  // faut plus de pas qu'ailleurs
  float t = march(ro, rd, 0.1, tWater > 0.0 ? tWater : TMAX, 0.0, 1.0, 1500);
  // Un fond marin peu profond peut être « touché » juste avant la surface, à la précision d'impact près (des dizaines
  // de mètres au loin) : c'est de l'eau. Un rayon qui épuise ses pas au-dessus de la mer, au-delà de l'horizon, voit
  // le ciel
  if (t > 0.0 && terrain(ro.xz + rd.xz * t, lod(t)) < uWater) t = -1.0;

  // En aperçu, ombres moins précises ; le relief (march, calcNormal) reste celui de l'image nette
  int shadowSteps = uPreview > 0.5 ? 12 : SHADOW_STEPS;
  float shaded = shadowedLength(rd);
  vec3 col;
  if (t > 0.0) {
    vec3 p = rayPoint(ro, rd, t);
    col = applyFog(shadeTerrain(p, t, shadowSteps), ro, p, shaded);
  } else if (tWater > 0.0) {
    vec3 p = rayPoint(ro, rd, tWater);
    col = applyFog(shadeWater(p, rayDir(rd, tWater), tWater), ro, p, shaded);
  } else col = sky(rd, shaded);

  float mu = max(dot(rd, uSunDir), 0.0);
  col += sunCol * uSunVisible * (GLARE_WIDE * pow(mu, 8.0) + GLARE_NARROW * pow(mu, 400.0));

  col = pow(aces(col * exposure), vec3(1.0 / 2.2));
  vec2 p = fragCoord / uResolution - 0.5;
  col *= 1.0 - VIGNETTE * dot(p, p);
  // Grain fixe par pixel : identique d'une passe de lissage à l'autre, il survit à la moyenne
  col += (2.0 * hash(uvec2(gl_FragCoord.xy)) - 1.0) * GRAIN;
  outColor = vec4(col, 1.0);
}
`,Be=`// ---------- Sondes ----------
// Assemblé par renderer.ts à la suite de : constantes générées, uniforms, noise, climate, rock et height.
// Chaque ligne de la cible répond à une sonde placée en (0, uCamY, 0), l'origine des bruits étant celle du point
// sondé ; chaque pixel de la ligne calcule une valeur (voir PROBE_VALUES dans renderer.ts). Les flottants sont écrits
// bit à bit dans les quatre octets d'un pixel RGBA8 : la relecture est exacte, sans extension.

// Octaves du sol sondé (détail d'environ 10 cm)
const float GROUND_OCTAVES = 16.0;
// Recherche du relief entre la caméra et le soleil : nombre de pas et distance du dernier (m)
const int SUN_STEPS = 10;
const float SUN_RANGE = 50000.0;
// Rayon apparent du soleil (rad) : le relief le masque progressivement sur cette marge
const float SUN_RADIUS = 0.01;
// Points sondés le long du trajet prévu de la caméra
const int AHEAD_STEPS = 6;

// Trajet horizontal prévu de la caméra d'ici la prochaine réponse (m)
uniform vec2 uAhead;
// 1 : uCamY est une hauteur au-dessus du sol (ou de l'eau), et non une altitude
uniform float uRelative;

float ground(vec2 x) {
  return terrain(x, GROUND_OCTAVES);
}

// Relief entre la caméra et le soleil, sondé vers le soleil par pas croissants, le premier à la hauteur de la caméra
// au-dessus du sol, le dernier à SUN_RANGE : (part visible du soleil, distance et profondeur sous son sommet du rayon
// vers le soleil quand le relief le cache)
vec3 sunOcclusion(float camY, float below) {
  float visible = 1.0, shadowDistance = 0.0, shadowDepth = 0.0;
  float first = max(5.0, camY - below);
  float growth = max(1.2, pow(SUN_RANGE / first, 1.0 / float(SUN_STEPS - 1)));
  float d = first;
  for (int i = 0; i < SUN_STEPS; i++, d *= growth) {
    // Le rayon vers le soleil s'élève au-dessus de la sphère (voir rayPoint)
    float y = camY + uSunDir.y * d + d * d * dot(uSunDir.xz, uSunDir.xz) * 0.5 / EARTH_RADIUS;
    if (y > uMaxH) break;
    float g = max(ground(uSunDir.xz * d), uWater);
    visible = min(visible, smoothstep(-SUN_RADIUS, SUN_RADIUS, (y - g) / d));
    if (g - y > shadowDepth) {
      shadowDistance = d;
      shadowDepth = g - y;
    }
  }
  // Le soleil couché n'éblouit plus
  return vec3(visible * smoothstep(-0.02, 0.05, uSunDir.y), shadowDistance, shadowDepth);
}

float probe(int index) {
  float h = ground(vec2(0.0));
  if (index == 0) return h;
  if (index <= 3) return climate(vec2(0.0))[index - 1];
  if (index == 4) {
    float highest = h;
    for (int i = 1; i <= AHEAD_STEPS; i++) highest = max(highest, ground(uAhead * float(i) / float(AHEAD_STEPS)));
    return highest;
  }
  float below = max(h, uWater);
  return sunOcclusion(uRelative > 0.5 ? below + uCamY : uCamY, below)[index - 5];
}

void main() {
  uint bits = floatBitsToUint(probe(int(gl_FragCoord.x)));
  outColor = vec4(uvec4(bits, bits >> 8u, bits >> 16u, bits >> 24u) & 0xffu) / 255.0;
}
`,Ve={base:0,amplitude:120,gain:.42},He={base:150,amplitude:380,gain:.4},Ue={base:450,amplitude:950,gain:.47};function D(){return[{base:e.water-150,amplitude:120,gain:.45},{base:e.water+4,amplitude:30,gain:.45},Ve,He,Ue,{base:1500,amplitude:e.height,gain:e.gain}]}function We(){return(e.mountainCoverage-.5)*1.2}function Ge(){return(e.desertCoverage-.5)*1.2}function Ke({base:e,amplitude:t,gain:n}){let r=te*(1+Math.sqrt(p)),i=1,a=n;for(let e=1;e<3;e++)i+=r*a,a*=n;let o=e+t*(i+a/(1-n)),s=f[1]+t*n/(1-n);return Math.max(o,s)}function qe(){let e=D(),t=e.slice(0,-1).map(e=>e.base+e.amplitude/(1-e.gain));return Math.max(...t,Ke(e[e.length-1]))+100}var O=[`#version 300 es`,`precision highp float;`,`precision highp int;`,Se()],k=[je,Me,Ne,Pe,Fe],Je=[...O,...k,Ie,Le,Re,ze].join(`
`),Ye=[...O,...k,Be].join(`
`),Xe=`uResolution.uCamY.uCamRot.uFocal.uJitter.uSunVisible.uSunShadow.uSunDir.uScale.uBiomeScale.uMountainBias.uDesertBias.uDetail.uStep.uWater.uVegetation.uSnow.uFog.uExposure.uPreview.uLodHeight.uBiomes.uMaxH.uOctFrac.uOctCell.uFieldFrac.uFieldCell.uRockFrac.uRockCell.uRockRot.uDuneScale.uAhead.uRelative`.split(`.`),A=8,j=64;function M(e){return e===0?[0,0]:[N(e,2)-.5,N(e,3)-.5]}function N(e,t){let n=0;for(let r=1/t,i=e;i>0;i=Math.floor(i/t),r/=t)n+=i%t*r;return n}var Ze=class{maxSize;gl;terrainProgram;uniforms;blitProgram;sourceScale;probeProgram;probeUniforms;probeTarget;fence=null;submittedAt=0;lastGpuTime=0;constructor(e){let t=e.getContext(`webgl2`,{antialias:!1,depth:!1});if(!t)throw Error(`WebGL2 non disponible`);this.gl=t,this.maxSize=Math.min(t.getParameter(t.MAX_TEXTURE_SIZE),t.getParameter(t.MAX_VIEWPORT_DIMS)[0]),this.terrainProgram=this.createProgram(Je),this.uniforms=this.uniformLocations(this.terrainProgram),this.blitProgram=this.createProgram(Ae),this.sourceScale=t.getUniformLocation(this.blitProgram,`uSourceScale`),this.probeProgram=this.createProgram(Ye),this.probeUniforms=this.uniformLocations(this.probeProgram),this.probeTarget=this.ensureTarget(null,A,j),t.bindVertexArray(t.createVertexArray())}ensureTarget(e,t,n){if(e&&e.width===t&&e.height===n)return e;let r=this.gl;e&&(r.deleteTexture(e.texture),r.deleteFramebuffer(e.framebuffer));let i=r.createTexture();r.bindTexture(r.TEXTURE_2D,i),r.texStorage2D(r.TEXTURE_2D,1,r.RGBA8,t,n),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE);let a=r.createFramebuffer();return r.bindFramebuffer(r.FRAMEBUFFER,a),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,i,0),{texture:i,framebuffer:a,width:t,height:n}}renderRows(e,t,n,r,i=e.width,a=e.height,o=!1,s=a,c=[0,0]){let l=this.gl;l.useProgram(this.terrainProgram),l.bindFramebuffer(l.FRAMEBUFFER,e.framebuffer),l.viewport(0,0,i,a),l.enable(l.SCISSOR_TEST),l.scissor(0,n,i,r-n);let u=this.uniforms;this.setWorldUniforms(u,t),l.uniform2f(u.uResolution,i,a),l.uniform1f(u.uCamY,t.camY),l.uniformMatrix3fv(u.uCamRot,!1,t.rotation),l.uniform1f(u.uFocal,t.focal),l.uniform1f(u.uSunVisible,t.sunVisible),l.uniform2fv(u.uSunShadow,t.sunShadow),l.uniform1f(u.uPreview,+!!o),l.uniform1f(u.uLodHeight,s),l.uniform2f(u.uJitter,c[0],c[1]),l.drawArrays(l.TRIANGLES,0,3),l.disable(l.SCISSOR_TEST)}probe(e){if(e.length>j)throw Error(`Au plus ${j} sondes par lot`);let t=this.gl,n=this.probeUniforms;t.useProgram(this.probeProgram),t.bindFramebuffer(t.FRAMEBUFFER,this.probeTarget.framebuffer),t.viewport(0,0,A,e.length),t.enable(t.SCISSOR_TEST),e.forEach((e,r)=>{t.scissor(0,r,A,1),this.setWorldUniforms(n,{octaves:x(e.x,e.z),fields:S(e.x,e.z),rock:w(e.x,e.z)}),t.uniform1f(n.uCamY,e.y),t.uniform1f(n.uRelative,+!!e.relative),t.uniform2fv(n.uAhead,e.ahead??[0,0]),t.drawArrays(t.TRIANGLES,0,3)}),t.disable(t.SCISSOR_TEST);let r=A*e.length*4,i=t.createBuffer();t.bindBuffer(t.PIXEL_PACK_BUFFER,i),t.bufferData(t.PIXEL_PACK_BUFFER,r,t.STREAM_READ),t.readPixels(0,0,A,e.length,t.RGBA,t.UNSIGNED_BYTE,0),t.bindBuffer(t.PIXEL_PACK_BUFFER,null);let a=t.fenceSync(t.SYNC_GPU_COMMANDS_COMPLETE,0);return t.flush(),new Promise(n=>{let o=()=>{if(t.getSyncParameter(a,t.SYNC_STATUS)!==t.SIGNALED){setTimeout(o,2);return}t.deleteSync(a);let s=new Uint8Array(r);t.bindBuffer(t.PIXEL_PACK_BUFFER,i),t.getBufferSubData(t.PIXEL_PACK_BUFFER,0,s),t.bindBuffer(t.PIXEL_PACK_BUFFER,null),t.deleteBuffer(i);let c=new Float32Array(s.buffer);n(e.map((e,t)=>{let n=c.subarray(t*A,(t+1)*A);return{ground:n[0],climate:[n[1],n[2],n[3]],groundAhead:n[4],sunVisible:n[5],sunShadow:[n[6],n[7]]}}))};setTimeout(o,0)})}copy(e,t,n=e.width,r=e.height,i=1){let a=this.gl;i<1&&(a.enable(a.BLEND),a.blendColor(0,0,0,i),a.blendFunc(a.CONSTANT_ALPHA,a.ONE_MINUS_CONSTANT_ALPHA)),a.useProgram(this.blitProgram),a.uniform2f(this.sourceScale,n/e.width,r/e.height),a.bindFramebuffer(a.FRAMEBUFFER,t?.framebuffer??null),a.viewport(0,0,t?.width??a.drawingBufferWidth,t?.height??a.drawingBufferHeight),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,e.texture),a.drawArrays(a.TRIANGLES,0,3),a.disable(a.BLEND)}markSubmitted(){let e=this.gl;this.fence&&e.deleteSync(this.fence),this.fence=e.fenceSync(e.SYNC_GPU_COMMANDS_COMPLETE,0),this.submittedAt=performance.now(),e.flush()}gpuIdle(){if(!this.fence)return!0;let e=this.gl;return e.getSyncParameter(this.fence,e.SYNC_STATUS)===e.SIGNALED&&(e.deleteSync(this.fence),this.fence=null,this.lastGpuTime=performance.now()-this.submittedAt,!0)}finish(e){let t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,e.framebuffer),t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array(4))}readPixels(e){let t=this.gl,n=new Uint8Array(e.width*e.height*4);return t.bindFramebuffer(t.FRAMEBUFFER,e.framebuffer),t.readPixels(0,0,e.width,e.height,t.RGBA,t.UNSIGNED_BYTE,n),n}uniformLocations(e){return Object.fromEntries(Xe.map(t=>[t,this.gl.getUniformLocation(e,t)]))}setWorldUniforms(n,r){let i=this.gl;i.uniform3fv(n.uSunDir,t()),i.uniform1f(n.uScale,e.scale),i.uniform1f(n.uBiomeScale,e.biomeScale),i.uniform1f(n.uMountainBias,We()),i.uniform1f(n.uDesertBias,Ge()),i.uniform1f(n.uDetail,e.detail),i.uniform1f(n.uStep,e.step),i.uniform1f(n.uWater,e.water),i.uniform1f(n.uVegetation,e.vegetation),i.uniform1f(n.uSnow,e.snow),i.uniform1f(n.uFog,e.fog*1e-4),i.uniform1f(n.uExposure,e.exposure),i.uniform3fv(n.uBiomes,D().flatMap(e=>[e.base,e.amplitude,e.gain])),i.uniform1f(n.uMaxH,qe()),i.uniform2fv(n.uOctFrac,r.octaves.frac),i.uniform2uiv(n.uOctCell,r.octaves.cell),i.uniform2fv(n.uFieldFrac,r.fields.frac),i.uniform2uiv(n.uFieldCell,r.fields.cell),i.uniform3fv(n.uRockFrac,r.rock.frac),i.uniform3uiv(n.uRockCell,r.rock.cell),i.uniformMatrix3fv(n.uRockRot,!1,r.rock.rotation),i.uniform1uiv(n.uDuneScale,we())}createProgram(e){let t=this.gl,n=t.createProgram();if(t.attachShader(n,this.compile(t.VERTEX_SHADER,ke)),t.attachShader(n,this.compile(t.FRAGMENT_SHADER,e)),t.linkProgram(n),!t.getProgramParameter(n,t.LINK_STATUS))throw Error(t.getProgramInfoLog(n)??`link`);return n}compile(e,t){let n=this.gl,r=n.createShader(e);if(!r)throw Error(`createShader`);if(n.shaderSource(r,t),n.compileShader(r),!n.getShaderParameter(r,n.COMPILE_STATUS))throw Error(n.getShaderInfoLog(r)??`compile`);return r}},Qe=150,$e=.05,P=.01,et=5,tt=.6,F=250,nt=class{renderer;canvas;camera;onSharp;preview=null;levels=[null,null];shown=null;exportTarget=null;exportPass=null;refineJob=null;exportJob=null;dirty=!0;sharpDone=!1;changedAt=0;pixelBudget=25e4;movingScale=e.movingScale;lastPreviewAt=-1/0;jobSubmitted=!1;previewSubmitted=!1;previewTimes=[];previewIntervals=[];constructor(e,t,n,r){this.renderer=e,this.canvas=t,this.camera=n,this.onSharp=r}invalidate(){this.dirty=!0,this.sharpDone=!1,this.refineJob=null,this.changedAt=performance.now()}requestExport(){let{canvas:t}=this,n=Math.min(e.exportScale,this.renderer.maxSize/Math.max(t.width,t.height));this.exportTarget=this.renderer.ensureTarget(this.exportTarget,Math.floor(t.width*n),Math.floor(t.height*n));let{width:r,height:i}=this.exportTarget,a=this.camera.view();this.exportJob={target:this.exportTarget,view:a,row:0,width:r,height:i,scale:n,lodHeight:i,pass:0}}status(){let e=this.exportJob;if(e){let t=(e.pass*e.height+e.row)/(6*e.height);return`Export ${Math.round(100*t)} %`}let t=this.refineJob;return t?.pass?`Lissage ${t.pass+1}/6`:t?`Affinage ${Math.round(t.scale*100)} %`:this.sharpDone?`Net`:`Aperçu ${Math.round(this.movingScale*100)} % · ${this.previewFps()} img/s`}frame(e){if(this.camera.ready()&&this.renderer.gpuIdle()){if(this.jobSubmitted&&this.adaptPixelBudget(this.renderer.lastGpuTime),this.previewSubmitted&&this.renderer.lastGpuTime>F&&this.adaptMovingScale(this.renderer.lastGpuTime/1e3),this.jobSubmitted=!1,this.previewSubmitted=!1,this.resize(),this.exportJob){if(this.advance(this.exportJob)){let{width:e,height:t}=this.exportJob;this.exportPass=this.renderer.ensureTarget(this.exportPass,e,t),this.exportJob=this.nextPass(this.exportJob,this.exportTarget,this.exportPass),this.exportJob||this.saveExport(this.exportTarget)}}else if(this.dirty)this.drawPreview(e);else if(!this.sharpDone&&this.shown)this.refine(e);else return;this.renderer.markSubmitted()}}resize(){let t=Math.round(window.innerWidth*e.pixelRatio),n=Math.round(window.innerHeight*e.pixelRatio);(this.canvas.width!==t||this.canvas.height!==n)&&(this.canvas.width=t,this.canvas.height=n,this.invalidate())}drawPreview(t){let{canvas:n,renderer:r}=this;this.preview=r.ensureTarget(this.preview,Math.max(1,Math.round(n.width*e.movingScale)),Math.max(1,Math.round(n.height*e.movingScale))),this.movingScale=Math.min(this.movingScale,e.movingScale);let i=Math.max(1,Math.min(this.preview.width,Math.round(n.width*this.movingScale))),a=Math.max(1,Math.min(this.preview.height,Math.round(n.height*this.movingScale))),o=n.height*e.movingScale;r.renderRows(this.preview,this.camera.view(),0,a,i,a,!0,o),this.show({target:this.preview,width:i,height:a,scale:this.movingScale}),this.dirty=!1,this.previewSubmitted=!0,this.recordPreview(t)}refine(e){if(!this.refineJob){if(e-this.changedAt<=Qe||!this.camera.settled())return;this.startLevel(this.camera.view())}let t=this.refineJob;if(!this.advance(t))return;if(t.scale<1){this.show(t),this.startLevel(t.view);return}t.pass===0&&(this.show(t),this.onSharp());let n=this.shown;this.refineJob=this.nextPass(t,n.target,this.spareLevel()),t.pass>0&&this.show(n),this.refineJob||(this.sharpDone=!0)}nextPass(e,t,n){return e.pass>0&&this.renderer.copy(e.target,t,e.width,e.height,1/(e.pass+1)),e.pass+1>=6?null:{...e,target:n,row:0,pass:e.pass+1}}startLevel(e){let{canvas:t}=this,n=this.shown.scale*2,r=n>=tt?1:n,i=Math.max(1,Math.round(t.width*r)),a=Math.max(1,Math.round(t.height*r)),o=t.height;this.refineJob={target:this.spareLevel(),view:e,row:0,width:i,height:a,scale:r,lodHeight:o,pass:0}}spareLevel(){let{canvas:e,renderer:t}=this,n=this.levels[0]&&this.shown.target===this.levels[0]?1:0;return this.levels[n]=t.ensureTarget(this.levels[n],e.width,e.height),this.levels[n]}show(e){this.renderer.copy(e.target,null,e.width,e.height),this.shown={target:e.target,width:e.width,height:e.height,scale:e.scale}}advance(e){this.jobSubmitted=!0;let t=Math.max(1,Math.floor(this.pixelBudget/e.width)),n=Math.min(e.height,e.row+t),{target:r,view:i,width:a,height:o,lodHeight:s,pass:c}=e;return this.renderer.renderRows(r,i,e.row,n,a,o,!1,s,M(c)),e.row=n,n>=e.height}adaptPixelBudget(e){e>40?this.pixelBudget=Math.max(2e4,this.pixelBudget*.7):e<20&&(this.pixelBudget=Math.min(4e6,this.pixelBudget*1.15))}recordPreview(e){if(e-this.lastPreviewAt<F){this.previewIntervals.push((e-this.lastPreviewAt)/1e3),this.previewIntervals.length>et&&this.previewIntervals.shift();let t=[...this.previewIntervals].sort((e,t)=>e-t);this.adaptMovingScale(t[t.length>>1])}for(this.lastPreviewAt=e,this.previewTimes.push(e);e-this.previewTimes[0]>1e3;)this.previewTimes.shift()}adaptMovingScale(t){let n=1/e.targetFps;if(t<n*1.15&&t>n*.8)return;let r=Math.min(1.1,Math.max(.7,Math.sqrt(n/t))),i=Math.round(this.movingScale*r/P)*P;this.movingScale=Math.min(e.movingScale,Math.max($e,i))}previewFps(){let e=this.previewTimes;return e.length<2?0:Math.round((e.length-1)*1e3/(e[e.length-1]-e[0]))}saveExport(t){let{canvas:n,camera:r}=this,{width:i,height:a}=n;n.width=t.width,n.height=t.height,this.renderer.copy(t,null);let o=document.createElement(`a`);o.download=`montagne-${e.seed}-${Math.round(r.x)}-${Math.round(r.z)}.png`,o.href=n.toDataURL(`image/png`),o.click(),n.width=i,n.height=a,this.invalidate()}},I=class e{constructor(t,n,r,i,a=`div`){this.parent=t,this.object=n,this.property=r,this._disabled=!1,this._hidden=!1,this.initialValue=this.getValue(),this.domElement=document.createElement(a),this.domElement.classList.add(`lil-controller`),this.domElement.classList.add(i),this.$name=document.createElement(`div`),this.$name.classList.add(`lil-name`),e.nextNameID=e.nextNameID||0,this.$name.id=`lil-gui-name-${++e.nextNameID}`,this.$widget=document.createElement(`div`),this.$widget.classList.add(`lil-widget`),this.$disable=this.$widget,this.domElement.appendChild(this.$name),this.domElement.appendChild(this.$widget),this.domElement.addEventListener(`keydown`,e=>e.stopPropagation()),this.domElement.addEventListener(`keyup`,e=>e.stopPropagation()),this.parent.children.push(this),this.parent.controllers.push(this),this.parent.$children.appendChild(this.domElement),this._listenCallback=this._listenCallback.bind(this),this.name(r)}name(e){return this._name=e,this.$name.textContent=e,this}onChange(e){return this._onChange=e,this}_callOnChange(){this.parent._callOnChange(this),this._onChange!==void 0&&this._onChange.call(this,this.getValue()),this._changed=!0}onFinishChange(e){return this._onFinishChange=e,this}_callOnFinishChange(){this._changed&&(this.parent._callOnFinishChange(this),this._onFinishChange!==void 0&&this._onFinishChange.call(this,this.getValue())),this._changed=!1}reset(){return this.setValue(this.initialValue),this._callOnFinishChange(),this}enable(e=!0){return this.disable(!e)}disable(e=!0){return e===this._disabled||(this._disabled=e,this.domElement.classList.toggle(`lil-disabled`,e),this.$disable.toggleAttribute(`disabled`,e)),this}show(e=!0){return this._hidden=!e,this.domElement.style.display=this._hidden?`none`:``,this}hide(){return this.show(!1)}options(e){let t=this.parent.add(this.object,this.property,e);return t.name(this._name),this.destroy(),t}min(e){return this}max(e){return this}step(e){return this}decimals(e){return this}listen(e=!0){return this._listening=e,this._listenCallbackID!==void 0&&(cancelAnimationFrame(this._listenCallbackID),this._listenCallbackID=void 0),this._listening&&this._listenCallback(),this}_listenCallback(){this._listenCallbackID=requestAnimationFrame(this._listenCallback);let e=this.save();e!==this._listenPrevValue&&this.updateDisplay(),this._listenPrevValue=e}getValue(){return this.object[this.property]}setValue(e){return this.getValue()!==e&&(this.object[this.property]=e,this._callOnChange(),this.updateDisplay()),this}updateDisplay(){return this}load(e){return this.setValue(e),this._callOnFinishChange(),this}save(){return this.getValue()}destroy(){this.listen(!1),this.parent.children.splice(this.parent.children.indexOf(this),1),this.parent.controllers.splice(this.parent.controllers.indexOf(this),1),this.parent.$children.removeChild(this.domElement)}},rt=class extends I{constructor(e,t,n){super(e,t,n,`lil-boolean`,`label`),this.$input=document.createElement(`input`),this.$input.setAttribute(`type`,`checkbox`),this.$input.setAttribute(`aria-labelledby`,this.$name.id),this.$widget.appendChild(this.$input),this.$input.addEventListener(`change`,()=>{this.setValue(this.$input.checked),this._callOnFinishChange()}),this.$disable=this.$input,this.updateDisplay()}updateDisplay(){return this.$input.checked=this.getValue(),this}};function L(e){let t,n;return(t=e.match(/(#|0x)?([a-f0-9]{6})/i))?n=t[2]:(t=e.match(/rgb\(\s*(\d*)\s*,\s*(\d*)\s*,\s*(\d*)\s*\)/))?n=parseInt(t[1]).toString(16).padStart(2,0)+parseInt(t[2]).toString(16).padStart(2,0)+parseInt(t[3]).toString(16).padStart(2,0):(t=e.match(/^#?([a-f0-9])([a-f0-9])([a-f0-9])$/i))&&(n=t[1]+t[1]+t[2]+t[2]+t[3]+t[3]),n?`#`+n:!1}var it={isPrimitive:!0,match:e=>typeof e==`string`,fromHexString:L,toHexString:L},R={isPrimitive:!0,match:e=>typeof e==`number`,fromHexString:e=>parseInt(e.substring(1),16),toHexString:e=>`#`+e.toString(16).padStart(6,0)},at=[it,R,{isPrimitive:!1,match:e=>Array.isArray(e)||ArrayBuffer.isView(e),fromHexString(e,t,n=1){let r=R.fromHexString(e);t[0]=(r>>16&255)/255*n,t[1]=(r>>8&255)/255*n,t[2]=(r&255)/255*n},toHexString([e,t,n],r=1){r=255/r;let i=e*r<<16^t*r<<8^(n*r|0);return R.toHexString(i)}},{isPrimitive:!1,match:e=>Object(e)===e,fromHexString(e,t,n=1){let r=R.fromHexString(e);t.r=(r>>16&255)/255*n,t.g=(r>>8&255)/255*n,t.b=(r&255)/255*n},toHexString({r:e,g:t,b:n},r=1){r=255/r;let i=e*r<<16^t*r<<8^(n*r|0);return R.toHexString(i)}}];function ot(e){return at.find(t=>t.match(e))}var st=class extends I{constructor(e,t,n,r){super(e,t,n,`lil-color`),this.$input=document.createElement(`input`),this.$input.setAttribute(`type`,`color`),this.$input.setAttribute(`tabindex`,-1),this.$input.setAttribute(`aria-labelledby`,this.$name.id),this.$text=document.createElement(`input`),this.$text.setAttribute(`type`,`text`),this.$text.setAttribute(`spellcheck`,`false`),this.$text.setAttribute(`aria-labelledby`,this.$name.id),this.$display=document.createElement(`div`),this.$display.classList.add(`lil-display`),this.$display.appendChild(this.$input),this.$widget.appendChild(this.$display),this.$widget.appendChild(this.$text),this._format=ot(this.initialValue),this._rgbScale=r,this._initialValueHexString=this.save(),this._textFocused=!1,this.$input.addEventListener(`input`,()=>{this._setValueFromHexString(this.$input.value)}),this.$input.addEventListener(`blur`,()=>{this._callOnFinishChange()}),this.$text.addEventListener(`input`,()=>{let e=L(this.$text.value);e&&this._setValueFromHexString(e)}),this.$text.addEventListener(`focus`,()=>{this._textFocused=!0,this.$text.select()}),this.$text.addEventListener(`blur`,()=>{this._textFocused=!1,this.updateDisplay(),this._callOnFinishChange()}),this.$disable=this.$text,this.updateDisplay()}reset(){return this._setValueFromHexString(this._initialValueHexString),this}_setValueFromHexString(e){if(this._format.isPrimitive){let t=this._format.fromHexString(e);this.setValue(t)}else this._format.fromHexString(e,this.getValue(),this._rgbScale),this._callOnChange(),this.updateDisplay()}save(){return this._format.toHexString(this.getValue(),this._rgbScale)}load(e){return this._setValueFromHexString(e),this._callOnFinishChange(),this}updateDisplay(){return this.$input.value=this._format.toHexString(this.getValue(),this._rgbScale),this._textFocused||(this.$text.value=this.$input.value.substring(1)),this.$display.style.backgroundColor=this.$input.value,this}},z=class extends I{constructor(e,t,n){super(e,t,n,`lil-function`),this.$button=document.createElement(`button`),this.$button.appendChild(this.$name),this.$widget.appendChild(this.$button),this.$button.addEventListener(`click`,e=>{e.preventDefault(),this.getValue().call(this.object),this._callOnChange()}),this.$button.addEventListener(`touchstart`,()=>{},{passive:!0}),this.$disable=this.$button}},ct=class extends I{constructor(e,t,n,r,i,a){super(e,t,n,`lil-number`),this._initInput(),this.min(r),this.max(i);let o=a!==void 0;this.step(o?a:this._getImplicitStep(),o),this.updateDisplay()}decimals(e){return this._decimals=e,this.updateDisplay(),this}min(e){return this._min=e,this._onUpdateMinMax(),this}max(e){return this._max=e,this._onUpdateMinMax(),this}step(e,t=!0){return this._step=e,this._stepExplicit=t,this}updateDisplay(){let e=this.getValue();if(this._hasSlider){let t=(e-this._min)/(this._max-this._min);t=Math.max(0,Math.min(t,1)),this.$fill.style.width=t*100+`%`}return this._inputFocused||(this.$input.value=this._decimals===void 0?e:e.toFixed(this._decimals)),this}_initInput(){this.$input=document.createElement(`input`),this.$input.setAttribute(`type`,`text`),this.$input.setAttribute(`aria-labelledby`,this.$name.id),window.matchMedia(`(pointer: coarse)`).matches&&(this.$input.setAttribute(`type`,`number`),this.$input.setAttribute(`step`,`any`)),this.$widget.appendChild(this.$input),this.$disable=this.$input;let e=()=>{let e=parseFloat(this.$input.value);isNaN(e)||(this._stepExplicit&&(e=this._snap(e)),this.setValue(this._clamp(e)))},t=e=>{let t=parseFloat(this.$input.value);isNaN(t)||(this._snapClampSetValue(t+e),this.$input.value=this.getValue())},n=e=>{e.key===`Enter`&&this.$input.blur(),e.code===`ArrowUp`&&(e.preventDefault(),t(this._step*this._arrowKeyMultiplier(e))),e.code===`ArrowDown`&&(e.preventDefault(),t(this._step*this._arrowKeyMultiplier(e)*-1))},r=e=>{this._inputFocused&&(e.preventDefault(),t(this._step*this._normalizeMouseWheel(e)))},i=!1,a,o,s,c,l,u=e=>{a=e.clientX,o=s=e.clientY,i=!0,c=this.getValue(),l=0,window.addEventListener(`mousemove`,d),window.addEventListener(`mouseup`,f)},d=e=>{if(i){let t=e.clientX-a,n=e.clientY-o;Math.abs(n)>5?(e.preventDefault(),this.$input.blur(),i=!1,this._setDraggingStyle(!0,`vertical`)):Math.abs(t)>5&&f()}if(!i){let t=e.clientY-s;l-=t*this._step*this._arrowKeyMultiplier(e),c+l>this._max?l=this._max-c:c+l<this._min&&(l=this._min-c),this._snapClampSetValue(c+l)}s=e.clientY},f=()=>{this._setDraggingStyle(!1,`vertical`),this._callOnFinishChange(),window.removeEventListener(`mousemove`,d),window.removeEventListener(`mouseup`,f)};this.$input.addEventListener(`input`,e),this.$input.addEventListener(`keydown`,n),this.$input.addEventListener(`wheel`,r,{passive:!1}),this.$input.addEventListener(`mousedown`,u),this.$input.addEventListener(`focus`,()=>{this._inputFocused=!0}),this.$input.addEventListener(`blur`,()=>{this._inputFocused=!1,this.updateDisplay(),this._callOnFinishChange()})}_initSlider(){this._hasSlider=!0,this.$slider=document.createElement(`div`),this.$slider.classList.add(`lil-slider`),this.$fill=document.createElement(`div`),this.$fill.classList.add(`lil-fill`),this.$slider.appendChild(this.$fill),this.$widget.insertBefore(this.$slider,this.$input),this.domElement.classList.add(`lil-has-slider`);let e=(e,t,n,r,i)=>(e-t)/(n-t)*(i-r)+r,t=t=>{let n=this.$slider.getBoundingClientRect(),r=e(t,n.left,n.right,this._min,this._max);this._snapClampSetValue(r)},n=e=>{this._setDraggingStyle(!0),t(e.clientX),window.addEventListener(`mousemove`,r),window.addEventListener(`mouseup`,i)},r=e=>{t(e.clientX)},i=()=>{this._callOnFinishChange(),this._setDraggingStyle(!1),window.removeEventListener(`mousemove`,r),window.removeEventListener(`mouseup`,i)},a=!1,o,s,c=e=>{e.preventDefault(),this._setDraggingStyle(!0),t(e.touches[0].clientX),a=!1},l=e=>{e.touches.length>1||(this._hasScrollBar?(o=e.touches[0].clientX,s=e.touches[0].clientY,a=!0):c(e),window.addEventListener(`touchmove`,u,{passive:!1}),window.addEventListener(`touchend`,d))},u=e=>{if(a){let t=e.touches[0].clientX-o,n=e.touches[0].clientY-s;Math.abs(t)>Math.abs(n)?c(e):(window.removeEventListener(`touchmove`,u),window.removeEventListener(`touchend`,d))}else e.preventDefault(),t(e.touches[0].clientX)},d=()=>{this._callOnFinishChange(),this._setDraggingStyle(!1),window.removeEventListener(`touchmove`,u),window.removeEventListener(`touchend`,d)},f=this._callOnFinishChange.bind(this),p;this.$slider.addEventListener(`mousedown`,n),this.$slider.addEventListener(`touchstart`,l,{passive:!1}),this.$slider.addEventListener(`wheel`,e=>{if(Math.abs(e.deltaX)<Math.abs(e.deltaY)&&this._hasScrollBar)return;e.preventDefault();let t=this._normalizeMouseWheel(e)*this._step;this._snapClampSetValue(this.getValue()+t),this.$input.value=this.getValue(),clearTimeout(p),p=setTimeout(f,400)},{passive:!1})}_setDraggingStyle(e,t=`horizontal`){this.$slider&&this.$slider.classList.toggle(`lil-active`,e),document.body.classList.toggle(`lil-dragging`,e),document.body.classList.toggle(`lil-${t}`,e)}_getImplicitStep(){return this._hasMin&&this._hasMax?(this._max-this._min)/1e3:.1}_onUpdateMinMax(){!this._hasSlider&&this._hasMin&&this._hasMax&&(this._stepExplicit||this.step(this._getImplicitStep(),!1),this._initSlider(),this.updateDisplay())}_normalizeMouseWheel(e){let{deltaX:t,deltaY:n}=e;return Math.floor(e.deltaY)!==e.deltaY&&e.wheelDelta&&(t=0,n=-e.wheelDelta/120,n*=this._stepExplicit?1:10),t+-n}_arrowKeyMultiplier(e){let t=this._stepExplicit?1:10;return e.shiftKey?t*=10:e.altKey&&(t/=10),t}_snap(e){let t=0;return this._hasMin?t=this._min:this._hasMax&&(t=this._max),e-=t,e=Math.round(e/this._step)*this._step,e+=t,e=parseFloat(e.toPrecision(15)),e}_clamp(e){return e<this._min&&(e=this._min),e>this._max&&(e=this._max),e}_snapClampSetValue(e){this.setValue(this._clamp(this._snap(e)))}get _hasScrollBar(){let e=this.parent.root.$children;return e.scrollHeight>e.clientHeight}get _hasMin(){return this._min!==void 0}get _hasMax(){return this._max!==void 0}},lt=class extends I{constructor(e,t,n,r){super(e,t,n,`lil-option`),this.$select=document.createElement(`select`),this.$select.setAttribute(`aria-labelledby`,this.$name.id),this.$display=document.createElement(`div`),this.$display.classList.add(`lil-display`),this.$select.addEventListener(`change`,()=>{this.setValue(this._values[this.$select.selectedIndex]),this._callOnFinishChange()}),this.$select.addEventListener(`focus`,()=>{this.$display.classList.add(`lil-focus`)}),this.$select.addEventListener(`blur`,()=>{this.$display.classList.remove(`lil-focus`)}),this.$widget.appendChild(this.$select),this.$widget.appendChild(this.$display),this.$disable=this.$select,this.options(r)}options(e){return this._values=Array.isArray(e)?e:Object.values(e),this._names=Array.isArray(e)?e:Object.keys(e),this.$select.replaceChildren(),this._names.forEach(e=>{let t=document.createElement(`option`);t.textContent=e,this.$select.appendChild(t)}),this.updateDisplay(),this}updateDisplay(){let e=this.getValue(),t=this._values.indexOf(e);return this.$select.selectedIndex=t,this.$display.textContent=t===-1?e:this._names[t],this}},ut=class extends I{constructor(e,t,n){super(e,t,n,`lil-string`),this.$input=document.createElement(`input`),this.$input.setAttribute(`type`,`text`),this.$input.setAttribute(`spellcheck`,`false`),this.$input.setAttribute(`aria-labelledby`,this.$name.id),this.$input.addEventListener(`input`,()=>{this.setValue(this.$input.value)}),this.$input.addEventListener(`keydown`,e=>{e.code===`Enter`&&this.$input.blur()}),this.$input.addEventListener(`blur`,()=>{this._callOnFinishChange()}),this.$widget.appendChild(this.$input),this.$disable=this.$input,this.updateDisplay()}updateDisplay(){return this.$input.value=this.getValue(),this}},dt=`.lil-gui {
  font-family: var(--font-family);
  font-size: var(--font-size);
  line-height: 1;
  font-weight: normal;
  font-style: normal;
  text-align: left;
  color: var(--text-color);
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  --background-color: #1f1f1f;
  --text-color: #ebebeb;
  --title-background-color: #111111;
  --title-text-color: #ebebeb;
  --widget-color: #424242;
  --hover-color: #4f4f4f;
  --focus-color: #595959;
  --number-color: #2cc9ff;
  --string-color: #a2db3c;
  --font-size: 11px;
  --input-font-size: 11px;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  --font-family-mono: Menlo, Monaco, Consolas, "Droid Sans Mono", monospace;
  --padding: 4px;
  --spacing: 4px;
  --widget-height: 20px;
  --title-height: calc(var(--widget-height) + var(--spacing) * 1.25);
  --name-width: 45%;
  --slider-knob-width: 2px;
  --slider-input-width: 27%;
  --color-input-width: 27%;
  --slider-input-min-width: 45px;
  --color-input-min-width: 45px;
  --folder-indent: 7px;
  --widget-padding: 0 0 0 3px;
  --widget-border-radius: 2px;
  --checkbox-size: calc(0.75 * var(--widget-height));
  --scrollbar-width: 5px;
}
.lil-gui, .lil-gui * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.lil-gui.lil-root {
  width: var(--width, 245px);
  display: flex;
  flex-direction: column;
  background: var(--background-color);
}
.lil-gui.lil-root > .lil-title {
  background: var(--title-background-color);
  color: var(--title-text-color);
}
.lil-gui.lil-root > .lil-children {
  overflow-x: hidden;
  overflow-y: auto;
}
.lil-gui.lil-root > .lil-children::-webkit-scrollbar {
  width: var(--scrollbar-width);
  height: var(--scrollbar-width);
  background: var(--background-color);
}
.lil-gui.lil-root > .lil-children::-webkit-scrollbar-thumb {
  border-radius: var(--scrollbar-width);
  background: var(--focus-color);
}
@media (pointer: coarse) {
  .lil-gui.lil-allow-touch-styles, .lil-gui.lil-allow-touch-styles .lil-gui {
    --widget-height: 28px;
    --padding: 6px;
    --spacing: 6px;
    --font-size: 13px;
    --input-font-size: 16px;
    --folder-indent: 10px;
    --scrollbar-width: 7px;
    --slider-input-min-width: 50px;
    --color-input-min-width: 65px;
  }
}
.lil-gui.lil-force-touch-styles, .lil-gui.lil-force-touch-styles .lil-gui {
  --widget-height: 28px;
  --padding: 6px;
  --spacing: 6px;
  --font-size: 13px;
  --input-font-size: 16px;
  --folder-indent: 10px;
  --scrollbar-width: 7px;
  --slider-input-min-width: 50px;
  --color-input-min-width: 65px;
}
.lil-gui.lil-auto-place, .lil-gui.autoPlace {
  max-height: 100%;
  position: fixed;
  top: 0;
  right: 15px;
  z-index: 1001;
}

.lil-controller {
  display: flex;
  align-items: center;
  padding: 0 var(--padding);
  margin: var(--spacing) 0;
}
.lil-controller.lil-disabled {
  opacity: 0.5;
}
.lil-controller.lil-disabled, .lil-controller.lil-disabled * {
  pointer-events: none !important;
}
.lil-controller > .lil-name {
  min-width: var(--name-width);
  flex-shrink: 0;
  white-space: pre;
  padding-right: var(--spacing);
  line-height: var(--widget-height);
}
.lil-controller .lil-widget {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--widget-height);
}
.lil-controller.lil-string input {
  color: var(--string-color);
}
.lil-controller.lil-boolean {
  cursor: pointer;
}
.lil-controller.lil-color .lil-display {
  width: 100%;
  height: var(--widget-height);
  border-radius: var(--widget-border-radius);
  position: relative;
}
@media (hover: hover) {
  .lil-controller.lil-color .lil-display:hover:before {
    content: " ";
    display: block;
    position: absolute;
    border-radius: var(--widget-border-radius);
    border: 1px solid #fff9;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
}
.lil-controller.lil-color input[type=color] {
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.lil-controller.lil-color input[type=text] {
  margin-left: var(--spacing);
  font-family: var(--font-family-mono);
  min-width: var(--color-input-min-width);
  width: var(--color-input-width);
  flex-shrink: 0;
}
.lil-controller.lil-option select {
  opacity: 0;
  position: absolute;
  width: 100%;
  max-width: 100%;
}
.lil-controller.lil-option .lil-display {
  position: relative;
  pointer-events: none;
  border-radius: var(--widget-border-radius);
  height: var(--widget-height);
  line-height: var(--widget-height);
  max-width: 100%;
  overflow: hidden;
  word-break: break-all;
  padding-left: 0.55em;
  padding-right: 1.75em;
  background: var(--widget-color);
}
@media (hover: hover) {
  .lil-controller.lil-option .lil-display.lil-focus {
    background: var(--focus-color);
  }
}
.lil-controller.lil-option .lil-display.lil-active {
  background: var(--focus-color);
}
.lil-controller.lil-option .lil-display:after {
  font-family: "lil-gui";
  content: "↕";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  padding-right: 0.375em;
}
.lil-controller.lil-option .lil-widget,
.lil-controller.lil-option select {
  cursor: pointer;
}
@media (hover: hover) {
  .lil-controller.lil-option .lil-widget:hover .lil-display {
    background: var(--hover-color);
  }
}
.lil-controller.lil-number input {
  color: var(--number-color);
}
.lil-controller.lil-number.lil-has-slider input {
  margin-left: var(--spacing);
  width: var(--slider-input-width);
  min-width: var(--slider-input-min-width);
  flex-shrink: 0;
}
.lil-controller.lil-number .lil-slider {
  width: 100%;
  height: var(--widget-height);
  background: var(--widget-color);
  border-radius: var(--widget-border-radius);
  padding-right: var(--slider-knob-width);
  overflow: hidden;
  cursor: ew-resize;
  touch-action: pan-y;
}
@media (hover: hover) {
  .lil-controller.lil-number .lil-slider:hover {
    background: var(--hover-color);
  }
}
.lil-controller.lil-number .lil-slider.lil-active {
  background: var(--focus-color);
}
.lil-controller.lil-number .lil-slider.lil-active .lil-fill {
  opacity: 0.95;
}
.lil-controller.lil-number .lil-fill {
  height: 100%;
  border-right: var(--slider-knob-width) solid var(--number-color);
  box-sizing: content-box;
}

.lil-dragging .lil-gui {
  --hover-color: var(--widget-color);
}
.lil-dragging * {
  cursor: ew-resize !important;
}
.lil-dragging.lil-vertical * {
  cursor: ns-resize !important;
}

.lil-gui .lil-title {
  height: var(--title-height);
  font-weight: 600;
  padding: 0 var(--padding);
  width: 100%;
  text-align: left;
  background: none;
  text-decoration-skip: objects;
}
.lil-gui .lil-title:before {
  font-family: "lil-gui";
  content: "▾";
  padding-right: 2px;
  display: inline-block;
}
.lil-gui .lil-title:active {
  background: var(--title-background-color);
  opacity: 0.75;
}
@media (hover: hover) {
  body:not(.lil-dragging) .lil-gui .lil-title:hover {
    background: var(--title-background-color);
    opacity: 0.85;
  }
  .lil-gui .lil-title:focus {
    text-decoration: underline var(--focus-color);
  }
}
.lil-gui.lil-root > .lil-title:focus {
  text-decoration: none !important;
}
.lil-gui.lil-closed > .lil-title:before {
  content: "▸";
}
.lil-gui.lil-closed > .lil-children {
  transform: translateY(-7px);
  opacity: 0;
}
.lil-gui.lil-closed:not(.lil-transition) > .lil-children {
  display: none;
}
.lil-gui.lil-transition > .lil-children {
  transition-duration: 300ms;
  transition-property: height, opacity, transform;
  transition-timing-function: cubic-bezier(0.2, 0.6, 0.35, 1);
  overflow: hidden;
  pointer-events: none;
}
.lil-gui .lil-children:empty:before {
  content: "Empty";
  padding: 0 var(--padding);
  margin: var(--spacing) 0;
  display: block;
  height: var(--widget-height);
  font-style: italic;
  line-height: var(--widget-height);
  opacity: 0.5;
}
.lil-gui.lil-root > .lil-children > .lil-gui > .lil-title {
  border: 0 solid var(--widget-color);
  border-width: 1px 0;
  transition: border-color 300ms;
}
.lil-gui.lil-root > .lil-children > .lil-gui.lil-closed > .lil-title {
  border-bottom-color: transparent;
}
.lil-gui + .lil-controller {
  border-top: 1px solid var(--widget-color);
  margin-top: 0;
  padding-top: var(--spacing);
}
.lil-gui .lil-gui .lil-gui > .lil-title {
  border: none;
}
.lil-gui .lil-gui .lil-gui > .lil-children {
  border: none;
  margin-left: var(--folder-indent);
  border-left: 2px solid var(--widget-color);
}
.lil-gui .lil-gui .lil-controller {
  border: none;
}

.lil-gui label, .lil-gui input, .lil-gui button {
  -webkit-tap-highlight-color: transparent;
}
.lil-gui input {
  border: 0;
  outline: none;
  font-family: var(--font-family);
  font-size: var(--input-font-size);
  border-radius: var(--widget-border-radius);
  height: var(--widget-height);
  background: var(--widget-color);
  color: var(--text-color);
  width: 100%;
}
@media (hover: hover) {
  .lil-gui input:hover {
    background: var(--hover-color);
  }
  .lil-gui input:active {
    background: var(--focus-color);
  }
}
.lil-gui input:disabled {
  opacity: 1;
}
.lil-gui input[type=text],
.lil-gui input[type=number] {
  padding: var(--widget-padding);
  -moz-appearance: textfield;
}
.lil-gui input[type=text]:focus,
.lil-gui input[type=number]:focus {
  background: var(--focus-color);
}
.lil-gui input[type=checkbox] {
  appearance: none;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  border-radius: var(--widget-border-radius);
  text-align: center;
  cursor: pointer;
}
.lil-gui input[type=checkbox]:checked:before {
  font-family: "lil-gui";
  content: "✓";
  font-size: var(--checkbox-size);
  line-height: var(--checkbox-size);
}
@media (hover: hover) {
  .lil-gui input[type=checkbox]:focus {
    box-shadow: inset 0 0 0 1px var(--focus-color);
  }
}
.lil-gui button {
  outline: none;
  cursor: pointer;
  font-family: var(--font-family);
  font-size: var(--font-size);
  color: var(--text-color);
  width: 100%;
  border: none;
}
.lil-gui .lil-controller button {
  height: var(--widget-height);
  text-transform: none;
  background: var(--widget-color);
  border-radius: var(--widget-border-radius);
}
@media (hover: hover) {
  .lil-gui .lil-controller button:hover {
    background: var(--hover-color);
  }
  .lil-gui .lil-controller button:focus {
    box-shadow: inset 0 0 0 1px var(--focus-color);
  }
}
.lil-gui .lil-controller button:active {
  background: var(--focus-color);
}

@font-face {
  font-family: "lil-gui";
  src: url("data:application/font-woff2;charset=utf-8;base64,d09GMgABAAAAAALkAAsAAAAABtQAAAKVAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHFQGYACDMgqBBIEbATYCJAMUCwwABCAFhAoHgQQbHAbIDiUFEYVARAAAYQTVWNmz9MxhEgodq49wYRUFKE8GWNiUBxI2LBRaVnc51U83Gmhs0Q7JXWMiz5eteLwrKwuxHO8VFxUX9UpZBs6pa5ABRwHA+t3UxUnH20EvVknRerzQgX6xC/GH6ZUvTcAjAv122dF28OTqCXrPuyaDER30YBA1xnkVutDDo4oCi71Ca7rrV9xS8dZHbPHefsuwIyCpmT7j+MnjAH5X3984UZoFFuJ0yiZ4XEJFxjagEBeqs+e1iyK8Xf/nOuwF+vVK0ur765+vf7txotUi0m3N0m/84RGSrBCNrh8Ee5GjODjF4gnWP+dJrH/Lk9k4oT6d+gr6g/wssA2j64JJGP6cmx554vUZnpZfn6ZfX2bMwPPrlANsB86/DiHjhl0OP+c87+gaJo/gY084s3HoYL/ZkWHTRfBXvvoHnnkHvngKun4KBE/ede7tvq3/vQOxDXB1/fdNz6XbPdcr0Vhpojj9dG+owuSKFsslCi1tgEjirjXdwMiov2EioadxmqTHUCIwo8NgQaeIasAi0fTYSPTbSmwbMOFduyh9wvBrESGY0MtgRjtgQR8Q1bRPohn2UoCRZf9wyYANMXFeJTysqAe0I4mrherOekFdKMrYvJjLvOIUM9SuwYB5DVZUwwVjJJOaUnZCmcEkIZZrKqNvRGRMvmFZsmhP4VMKCSXBhSqUBxgMS7h0cZvEd71AWkEhGWaeMFcNnpqyJkyXgYL7PQ1MoSq0wDAkRtJIijkZSmqYTiSImfLiSWXIZwhRh3Rug2X0kk1Dgj+Iu43u5p98ghopcpSo0Uyc8SnjlYX59WUeaMoDqmVD2TOWD9a4pCRAzf2ECgwGcrHjPOWY9bNxq/OL3I/QjwEAAAA=") format("woff2");
}`;function ft(e){let t=document.createElement(`style`);t.innerHTML=e;let n=document.querySelector(`head link[rel=stylesheet], head style`);n?document.head.insertBefore(t,n):document.head.appendChild(t)}var pt=!1,mt=class e{constructor({parent:e,autoPlace:t=e===void 0,container:n,width:r,title:i=`Controls`,closeFolders:a=!1,injectStyles:o=!0,touchStyles:s=!0}={}){this.parent=e,this.root=e?e.root:this,this.children=[],this.controllers=[],this.folders=[],this._closed=!1,this._hidden=!1,this.domElement=document.createElement(`div`),this.domElement.classList.add(`lil-gui`),this.$title=document.createElement(`button`),this.$title.classList.add(`lil-title`),this.$title.setAttribute(`aria-expanded`,!0),this.$title.addEventListener(`click`,()=>this.openAnimated(this._closed)),this.$title.addEventListener(`touchstart`,()=>{},{passive:!0}),this.$children=document.createElement(`div`),this.$children.classList.add(`lil-children`),this.domElement.appendChild(this.$title),this.domElement.appendChild(this.$children),this.title(i),this.parent?(this.parent.children.push(this),this.parent.folders.push(this),this.parent.$children.appendChild(this.domElement)):(this.domElement.classList.add(`lil-root`),s&&this.domElement.classList.add(`lil-allow-touch-styles`),!pt&&o&&(ft(dt),pt=!0),n?n.appendChild(this.domElement):t&&(this.domElement.classList.add(`lil-auto-place`,`autoPlace`),document.body.appendChild(this.domElement)),r&&this.domElement.style.setProperty(`--width`,r+`px`),this._closeFolders=a)}add(e,t,n,r,i){if(Object(n)===n)return new lt(this,e,t,n);let a=e[t];switch(typeof a){case`number`:return new ct(this,e,t,n,r,i);case`boolean`:return new rt(this,e,t);case`string`:return new ut(this,e,t);case`function`:return new z(this,e,t)}console.error(`gui.add failed
	property:`,t,`
	object:`,e,`
	value:`,a)}addColor(e,t,n=1){return new st(this,e,t,n)}addFolder(t){let n=new e({parent:this,title:t});return this.root._closeFolders&&n.close(),n}load(e,t=!0){return e.controllers&&this.controllers.forEach(t=>{t instanceof z||t._name in e.controllers&&t.load(e.controllers[t._name])}),t&&e.folders&&this.folders.forEach(t=>{t._title in e.folders&&t.load(e.folders[t._title])}),this}save(e=!0){let t={controllers:{},folders:{}};return this.controllers.forEach(e=>{if(!(e instanceof z)){if(e._name in t.controllers)throw Error(`Cannot save GUI with duplicate property "${e._name}"`);t.controllers[e._name]=e.save()}}),e&&this.folders.forEach(e=>{if(e._title in t.folders)throw Error(`Cannot save GUI with duplicate folder "${e._title}"`);t.folders[e._title]=e.save()}),t}open(e=!0){return this._setClosed(!e),this.$title.setAttribute(`aria-expanded`,!this._closed),this.domElement.classList.toggle(`lil-closed`,this._closed),this}close(){return this.open(!1)}_setClosed(e){this._closed!==e&&(this._closed=e,this._callOnOpenClose(this))}show(e=!0){return this._hidden=!e,this.domElement.style.display=this._hidden?`none`:``,this}hide(){return this.show(!1)}openAnimated(e=!0){return this._setClosed(!e),this.$title.setAttribute(`aria-expanded`,!this._closed),requestAnimationFrame(()=>{let t=this.$children.clientHeight;this.$children.style.height=t+`px`,this.domElement.classList.add(`lil-transition`);let n=e=>{e.target===this.$children&&(this.$children.style.height=``,this.domElement.classList.remove(`lil-transition`),this.$children.removeEventListener(`transitionend`,n))};this.$children.addEventListener(`transitionend`,n);let r=e?this.$children.scrollHeight:0;this.domElement.classList.toggle(`lil-closed`,!e),requestAnimationFrame(()=>{this.$children.style.height=r+`px`})}),this}title(e){return this._title=e,this.$title.textContent=e,this}reset(e=!0){return(e?this.controllersRecursive():this.controllers).forEach(e=>e.reset()),this}onChange(e){return this._onChange=e,this}_callOnChange(e){this.parent&&this.parent._callOnChange(e),this._onChange!==void 0&&this._onChange.call(this,{object:e.object,property:e.property,value:e.getValue(),controller:e})}onFinishChange(e){return this._onFinishChange=e,this}_callOnFinishChange(e){this.parent&&this.parent._callOnFinishChange(e),this._onFinishChange!==void 0&&this._onFinishChange.call(this,{object:e.object,property:e.property,value:e.getValue(),controller:e})}onOpenClose(e){return this._onOpenClose=e,this}_callOnOpenClose(e){this.parent&&this.parent._callOnOpenClose(e),this._onOpenClose!==void 0&&this._onOpenClose.call(this,e)}destroy(){this.parent&&(this.parent.children.splice(this.parent.children.indexOf(this),1),this.parent.folders.splice(this.parent.folders.indexOf(this),1)),this.domElement.parentElement&&this.domElement.parentElement.removeChild(this.domElement),Array.from(this.children).forEach(e=>e.destroy())}controllersRecursive(){let e=Array.from(this.controllers);return this.folders.forEach(t=>{e=e.concat(t.controllersRecursive())}),e}foldersRecursive(){let e=Array.from(this.folders);return this.folders.forEach(t=>{e=e.concat(t.foldersRecursive())}),e}};function ht(t){let n=new mt({title:`Montagnes`}),{viewChanged:r}=t;n.add(t,`newSeed`).name(`🎲 Nouvelle graine`),n.add(t,`teleport`).name(`🧭 Aller ailleurs`),n.add(e,`seed`,0,999999,1).name(`Graine`).onChange(r);let i=n.addFolder(`Relief`);i.add(e,`scale`,1e3,2e4,100).name(`Échelle (m)`).onChange(r),i.add(e,`height`,300,5e3,10).name(`Amplitude haute montagne (m)`).onChange(r),i.add(e,`gain`,.3,.65,.01).name(`Rugosité haute montagne`).onChange(r),i.add(e,`detail`,.5,4,.1).name(`Plus petit détail (px)`).onChange(r),i.add(e,`step`,.2,.9,.01).name(`Pas du raymarching`).onChange(r);let a=n.addFolder(`Biomes`);a.add(e,`biomeScale`,2e4,4e5,5e3).name(`Taille des biomes (m)`).onChange(r),a.add(e,`mountainCoverage`,0,1,.01).name(`Part de montagne`).onChange(r),a.add(e,`desertCoverage`,0,1,.01).name(`Part de désert`).onChange(r);let o=n.addFolder(`Rendu`);o.add(e,`water`,-3e3,2e3,10).name(`Niveau de l’eau (m)`).onChange(r),o.add(e,`vegetation`,-1e3,3e3,10).name(`Limite de végétation (m)`).onChange(r),o.add(e,`snow`,-500,4e3,10).name(`Limite des neiges (m)`).onChange(r),o.add(e,`sunElevation`,-5,90,.5).name(`Hauteur du soleil`).onChange(r),o.add(e,`sunAzimuth`,0,360,1).name(`Azimut du soleil`).onChange(r),o.add(e,`fog`,0,4,.05).name(`Brume`).onChange(r),o.add(e,`exposure`,.3,3,.05).name(`Exposition`).onChange(r),o.add(e,`fov`,20,100,1).name(`Champ de vision`).onChange(r);let s=n.addFolder(`Navigation et qualité`);s.add(e,`speed`,2,T,1).name(`Vitesse (m/s)`).listen(),s.add(e,`targetFps`,10,60,1).name(`Images/s visées en mouvement`),s.add(e,`movingScale`,.05,1,.05).name(`Résolution max en mouvement`).onChange(r),s.add(e,`pixelRatio`,.5,3,.25).name(`Densité de pixels`).onChange(r);let c=n.addFolder(`Export`);return c.add(e,`exportScale`,[1,2,3,4]).name(`Facteur de taille`),c.add(t,`exportImage`).name(`📷 Exporter en PNG`),n}var gt={x:-277644,z:133728,alt:300,yaw:3.6,pitch:-.08};function _t(t){let n=new URLSearchParams(window.location.hash.slice(1)),r=e=>n.has(e)?Number(n.get(e)):gt[e];n.has(`seed`)&&(e.seed=Number(n.get(`seed`))),t.x=r(`x`),t.z=r(`z`),t.yaw=r(`yaw`),t.pitch=r(`pitch`),t.placeAboveGround(r(`alt`))}function vt(t){let n=(t.yaw%(2*Math.PI)+2*Math.PI)%(2*Math.PI);return`#x=${Math.round(t.x)}&z=${Math.round(t.z)}&alt=${Math.round(t.altitude())}&yaw=${n.toFixed(3)}&pitch=${t.pitch.toFixed(3)}&seed=${e.seed}`}function yt(e,t){let n=t>.5;return e<.12?`Mer`:e<.25?n?`Côte désertique`:`Plage`:e<.375?n?`Désert`:`Plaine`:e<.565?n?`Collines arides`:`Collines`:e<.84?n?`Moyenne montagne aride`:`Moyenne montagne`:n?`Haute montagne aride`:`Haute montagne`}function bt(e,t,n){let r=t.climate();e.textContent=[r?yt(r[0],r[1]):`…`,`Altitude ${Math.round(t.y)} m`,`${Math.round(t.speed())} m/s`,n].join(` · `)+`
`+vt(t)}var B=800,V=500,xt=5,St=`mountains-bench-baseline`,Ct=[{name:`côte`,x:-277644,z:133728,alt:300,yaw:3.6,pitch:-.08},{name:`massif`,x:-183547,z:-38985,alt:1800,yaw:0,pitch:.02},{name:`paroi`,x:-183547,z:-44500,alt:250,yaw:0,pitch:.1},{name:`désert`,x:102860,z:16054,alt:60,yaw:.6,pitch:-.08},{name:`survol`,x:0,z:0,alt:9e3,yaw:.6,pitch:-.3},{name:`face`,x:-289749,z:138132,alt:416,yaw:1.778,pitch:.234}];function wt(e){let t=[...e].sort((e,t)=>e-t);return t[t.length>>1]}function Tt(e,t,n,r){e.renderRows(t,n,0,V,B,V,r),e.finish(t);let i=[];for(let a=0;a<xt;a++){let a=performance.now();e.renderRows(t,n,0,V,B,V,r),e.finish(t),i.push(performance.now()-a)}return Math.round(wt(i)*10)/10}function Et(e,t){let n=0;for(let r=0;r<e.length;r++)n+=Math.abs(e[r]-t[r]);return n/e.length}function Dt(e){let t=``;for(let n=0;n<e.length;n+=32768)t+=String.fromCharCode(...e.subarray(n,n+32768));return btoa(t)}function Ot(e){return Uint8Array.from(atob(e),e=>e.charCodeAt(0))}function kt(e){let t=B/4,n=V/4,r=new Uint8Array(75e3);for(let i=0;i<n;i++)for(let n=0;n<t;n++)for(let a=0;a<3;a++){let o=0;for(let t=0;t<4;t++)for(let r=0;r<4;r++)o+=e[((i*4+t)*B+n*4+r)*4+a];r[(i*t+n)*3+a]=o/16}return r}async function At(e,t,n,r){let i=e.ensureTarget(null,B,V),a=localStorage.getItem(St),o=a&&!r?JSON.parse(a):{},s={},c=[];for(let r of Ct){n.textContent=`Banc de mesure : ${r.name}…`,await new Promise(e=>setTimeout(e,0)),t.x=r.x,t.z=r.z,t.yaw=r.yaw,t.pitch=r.pitch,t.placeAboveGround(r.alt),await t.settle();let a=t.view(),l=Tt(e,i,a,!0),u=Tt(e,i,a,!1),d=kt(e.readPixels(i));s[r.name]=Dt(d);let f=o[r.name];c.push({view:r.name,ms:u,diff:f?Math.round(Et(d,Ot(f))*100)/100:null,previewMs:l})}r&&localStorage.setItem(St,JSON.stringify(s));let l=e=>Math.round(e.reduce((e,t)=>e+t,0)*10)/10,u=l(c.map(e=>e.ms)),d=l(c.map(e=>e.previewMs));window.__bench={results:c,total:u,previewTotal:d,saved:r},n.textContent=[`Banc de mesure (${B}×${V}, médiane de ${xt})${r?` — référence enregistrée`:``}`,...c.map(e=>`${e.view} : ${e.ms} ms${e.diff===null?``:` · écart ${e.diff}`} · aperçu : ${e.previewMs} ms`),`total : ${u} ms · aperçu : ${d} ms`].join(`
`)}var H=1280,U=800,jt=100,Mt=()=>new Promise(e=>requestAnimationFrame(e));async function Nt(e){let t=document.createElement(`canvas`);t.width=H,t.height=U;let n=t.getContext(`2d`),r=n.createImageData(H,U);for(let t=0;t<U;t++)r.data.set(e.subarray((799-t)*H*4,(U-t)*H*4),t*H*4);return n.putImageData(r,0,0),new Promise(e=>t.toBlob(t=>e(t),`image/png`))}async function Pt(t,n,r){let i=await(await fetch(`/__capture/views`)).json(),a=t.ensureTarget(null,H,U),o=t.ensureTarget(null,H,U),s={...e},c=[];for(let[l,u]of i.entries()){r.textContent=`Capture ${l+1}/${i.length} : ${u.name}…`,Object.assign(e,s,u.params??{}),n.x=u.x,n.z=u.z,n.yaw=u.yaw,n.pitch=u.pitch,n.placeAboveGround(u.alt),await n.settle();let d=n.view();for(let e=0;e<6;e++){let n=e===0?a:o;for(let r=0;r<U;r+=jt){let i=Math.min(U,r+jt);t.renderRows(n,d,r,i,H,U,!1,U,M(e)),t.finish(n),await Mt()}e>0&&t.copy(o,a,H,U,1/(e+1))}(await fetch(`/__capture/image?name=${u.name}`,{method:`POST`,body:await Nt(t.readPixels(a))})).ok&&c.push(u.name)}Object.assign(e,s),window.__capture={saved:c,total:i.length},r.textContent=`Capture terminée : ${c.length}/${i.length} images dans captures/`}var W=[[124123,-156149,171.4118194580078,[.42503823656004214,1,0]],[105987,396705,-55.57765579223633,[.15807308688773997,.004000578752522778,0]],[143569,138499,-58.19006363103415,[.4654225890266179,.9266422940025634,0]],[-261842,306538,-208.45059574482468,[0,0,0]],[165819,262028,107.40268620482793,[.41176527617849606,0,.013480925419584677]],[191535,-129807,184.45458984375,[.435109283417936,1,0]],[235117,-246232,121.03092956542969,[.3223436095010207,.5995274828229615,.9089029104429875]],[63897,-212990,-87.32276916503906,[.14210605468633372,1,0]],[-232841,230059,-135.44023069159599,[.09481460575713975,.9679567005778754,.9882980053835971]],[297045,275190,61.57467200483631,[.31551737668254215,0,.9541601817712958]],[-310929,-23690,-.2506598234176636,[.3,1,.2682401882561271]],[185067,-107189,955.6263427734375,[.8003545750694077,.37660873289347496,0]],[-176546,-105396,-184.51769511310025,[.042307698901639344,0,0]],[334980,296612,91.33433369898995,[.31022535079112373,0,.7366877256564729]],[-64585,-57076,-94.56572261002465,[.12435771503740425,0,.8418739616080522]],[255767,-261819,-50.353858328166524,[.2023532968984671,0,0]],[-273351,-145704,141.12144506886884,[.3938270474221163,0,0]],[-98417,3598,54.00282958683332,[.3,0,1]],[378379,-25972,49.71918487548828,[.392563574243021,.9941116584067223,.10744829092526069]],[202806,-219759,23.187286376953125,[.3,.9960537072742158,.7234888228474389]],[-51186,298749,-204.67095887845005,[.007987952663633667,1,0]],[255149,-153705,594.6532592773438,[.8414687328478463,1,0]],[28638,277257,-198.23025456315736,[.051269219516559536,.36574309684973194,0]],[160177,-311147,-57.78576743567629,[.1538708462183528,0,0]]],G=.01,Ft=1e-5,K=1e7,It=5;async function Lt(t,n){e.seed=1;let r=[...W.map(([e,t])=>({x:e,z:t,y:0})),{x:K,z:K,y:0},{x:10000001,z:K,y:0}],i=await t.probe(r),a=W.map(([e,t,n,r],a)=>{let o=i[a];return{x:e,z:t,height:n,probed:o.ground,heightError:Math.abs(o.ground-n),climateError:Math.max(...r.map((e,t)=>Math.abs(o.climate[t]-e)))}}),o=Math.abs(i[W.length].ground-i[W.length+1].ground),s=Math.max(...a.map(e=>e.heightError)),c=Math.max(...a.map(e=>e.climateError)),l=s<=G&&c<=Ft&&o<It;window.__probeTest={passed:l,maxHeightError:s,maxClimateError:c,far:o,rows:a},n.textContent=[`Sondes GPU / références : ${l?`OK`:`ÉCHEC`}`,...a.map(e=>`(${e.x}, ${e.z}) : ${e.probed.toFixed(4)} m · réf. ${e.height.toFixed(4)} · écart ${e.heightError.toExponential(1)} m · climat ${e.climateError.toExponential(1)}`),`écart max : ${s.toExponential(2)} m (tolérance ${G}) · climat ${c.toExponential(2)} (tolérance ${Ft})`,`à ${K/1e3} km, 1 m d'écart horizontal : ${o.toFixed(3)} m (tolérance ${It})`].join(`
`)}var Rt=5e5,zt=400,q=document.querySelector(`#view`),J=document.querySelector(`#hud`),Y=new Ze(q),X=new Oe(q,Y),Z=new nt(Y,q,X,()=>history.replaceState(null,``,vt(X)));_t(X);var Bt=ht({viewChanged:()=>Z.invalidate(),newSeed(){e.seed=Math.floor(Math.random()*1e6),Bt.controllersRecursive().forEach(e=>e.updateDisplay()),X.placeAboveGround(zt),Z.invalidate()},teleport(){X.x=(Math.random()*2-1)*Rt,X.z=(Math.random()*2-1)*Rt,X.placeAboveGround(zt),Z.invalidate()},exportImage:()=>Z.requestExport()}),Q=new URLSearchParams(window.location.hash.slice(1));Q.has(`bench`)?At(Y,X,J,Q.has(`save`)):Q.has(`capture`)?Pt(Y,X,J):Q.has(`probe-test`)?Lt(Y,J):requestAnimationFrame($);var Vt=performance.now();function $(e){let t=Math.min(.5,(e-Vt)/1e3);Vt=e;let n=X.update(t);(X.sync()||n)&&Z.invalidate(),Z.frame(e),bt(J,X,Z.status()),requestAnimationFrame($)}