# Montagnes

Générateur de paysages infinis rendus en temps réel par raymarching sur le GPU. Il n'y a ni maillage ni phase de
génération : le relief est une fonction calculée pixel par pixel, avec un niveau de détail qui suit la taille d'un
pixel à l'écran.

```bash
npm install
npm run dev        # serveur de développement
npm test           # tests de non-régression du relief
npm run typecheck
npm run build
```

Commandes : glisser pour regarder, ZQSD / WASD pour avancer, R / Espace et F pour monter et descendre, Maj pour
accélérer, molette pour la vitesse. La vue courante s'écrit dans l'URL (`#x=…&z=…&alt=…&yaw=…&pitch=…&seed=…`) et
dans le HUD : une capture d'écran suffit pour retrouver un point de vue.

## Organisation

```
src/
├── main.ts          Assemblage : canvas, caméra, panneau, boucle d'animation
├── params.ts        Réglages modifiables depuis le panneau
├── gui.ts           Panneau de réglages (lil-gui)
├── camera.ts        Caméra de vol libre et vue transmise au shader
├── scheduler.ts     Ordonnancement des images : aperçu adaptatif, image nette par bandes, export
├── hud.ts           Texte du HUD
├── viewUrl.ts       Vue ↔ URL, point de départ par défaut
├── terrain/         Relief côté CPU (double précision)
│   ├── constants.ts Constantes partagées avec le shader (source unique, injectées dans le GLSL)
│   ├── noise.ts     Hash et value noise, identiques bit à bit au GPU
│   ├── biomes.ts    Table des biomes et interpolation
│   ├── climate.ts   Répartition des biomes, falaises
│   ├── dunes.ts     Dunes
│   ├── height.ts    Altitude du sol (collisions de la caméra)
│   ├── origins.ts   Origines des bruits à la position de la caméra (précision à grande distance)
│   └── height.test.ts
└── render/          Rendu WebGL2
    ├── renderer.ts  Programmes, cibles, envoi des uniformes ; assemble le shader de terrain
    ├── uniforms.glsl, noise.glsl, climate.glsl, rock.glsl, height.glsl, raymarch.glsl, atmosphere.glsl,
    │   shading.glsl
    ├── terrain.frag.glsl  main() du shader de terrain
    └── fullscreen.vert.glsl, blit.frag.glsl
```

## Principes

**Le relief existe deux fois.** Le shader (`render/height.glsl`) le calcule pour l'image ; `terrain/height.ts` le
recalcule en double précision pour les collisions de la caméra et le HUD. Les deux doivent rester identiques :
toute modification de l'algorithme se fait des deux côtés. Les constantes, elles, n'existent qu'une fois, dans
`terrain/constants.ts`, que le renderer injecte en tête du shader. `npm test` vérifie que des altitudes de
référence ne changent pas.

**Précision à grande distance.** Le GPU travaille en float32 et en coordonnées relatives à la caméra. Pour chaque
octave de chaque bruit, `terrain/origins.ts` calcule en double précision la cellule (entier) et la partie
fractionnaire de la position de la caméra ; le shader n'y ajoute que la position relative, petite. Le monde reste
précis à des milliers de kilomètres de l'origine.

**Niveau de détail au pixel près.** `lod()` ne garde que les octaves plus grandes que deux pixels à la distance du
point ; les détails plus fins (dunes, bruit 3D de la roche…) s'effacent de la même façon.

**Biomes continus.** Quatre champs de bruit à très grande échelle (continent, aridité, chaînes de montagnes, îles)
donnent en chaque point un niveau de relief, un poids de désert et un poids de falaise. Le niveau de relief
interpole continûment les biomes de `terrain/biomes.ts` : mer, plage, plaine, collines, moyenne et haute montagne.

**Roche.** Le fBm « à dérivées » imite l'érosion en lissant les versants ; sur les pentes raides, ce lissage est
remplacé par des crêtes vives. Sur les parois, un champ de hauteur ne pourrait que s'étirer : leur détail vient
d'un bruit 3D qui creuse la surface (`surfaceDistance()`), et la couleur de la roche d'un bruit de gradient 3D.

**Ordonnancement.** En mouvement, un aperçu basse résolution est recalculé à chaque image, avec une échelle ajustée
pour tenir la cadence visée. À l'arrêt, l'image nette est calculée par bandes sur plusieurs images, puis lissée
par la moyenne de six rendus décalés d'une fraction de pixel (antialiasing).
