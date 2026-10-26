# Montagnes

Générateur de paysages infinis rendus en temps réel par raymarching sur le GPU. Il n'y a ni maillage ni phase de
génération : le relief est une fonction calculée pixel par pixel, avec un niveau de détail qui suit la taille d'un
pixel à l'écran.

```bash
npm install
npm run dev        # serveur de développement
npm test           # tests unitaires (origines des bruits, URL, constantes)
npm run typecheck
npm run build
```

Commandes : glisser pour regarder, ZQSD / WASD pour avancer, R / Espace et F pour monter et descendre, Maj pour
accélérer, molette pour la vitesse. La vue courante s'écrit dans l'URL (`#x=…&z=…&alt=…&yaw=…&pitch=…&seed=…`) et
dans le HUD : une capture d'écran suffit pour retrouver un point de vue.

Modes de développement : `#bench` mesure les performances et compare l'image à une référence, `#capture` rend les
vues de `captures/views.json`, `#probe-test` compare les sondes GPU à des altitudes de référence.

## Organisation

```
src/
├── main.ts          Assemblage : canvas, caméra, panneau, boucle d'animation
├── params.ts        Réglages modifiables depuis le panneau
├── gui.ts           Panneau de réglages (lil-gui)
├── camera.ts        Caméra de vol libre, sondes du sol et du soleil, vue transmise au shader
├── scheduler.ts     Ordonnancement des images : aperçu adaptatif, image nette par bandes, export
├── hud.ts           Texte du HUD
├── viewUrl.ts       Vue ↔ URL, point de départ par défaut
├── bench.ts, capture.ts, probeTest.ts   Modes #bench, #capture et #probe-test
├── terrain/         Données du relief côté CPU (le relief lui-même n'existe qu'en GLSL)
│   ├── constants.ts Constantes du relief (source unique, injectées dans le GLSL)
│   ├── biomes.ts    Table des biomes et réglages dérivés, transmis au shader
│   └── origins.ts   Origines des bruits en double précision (précision à grande distance)
└── render/          Rendu WebGL2
    ├── renderer.ts  Programmes, cibles, envoi des uniformes, sondes ; assemble les shaders
    ├── uniforms.glsl, noise.glsl, climate.glsl, rock.glsl, height.glsl   Relief
    ├── raymarch.glsl, atmosphere.glsl, shading.glsl
    ├── terrain.frag.glsl  main() du shader de terrain
    ├── probe.frag.glsl    main() des sondes
    └── fullscreen.vert.glsl, blit.frag.glsl
```

## Principes

**Le relief n'existe qu'en GLSL.** Le CPU en a pourtant besoin : altitude du sol pour placer la caméra et
l'empêcher de traverser le relief, biome et hauteur au-dessus du sol pour le HUD et l'URL, soleil caché ou non par
le relief pour l'éblouissement (`uSunVisible`, `uSunShadow`). Il les demande au GPU par des **sondes** : un petit
programme, assemblé des mêmes modules que le terrain avec un autre `main()` (`render/probe.frag.glsl`), calcule
ces valeurs pour un point et les écrit bit à bit dans une petite cible RGBA8, sans extension ni perte. Elles sont
relues sans bloquer (`readPixels` vers un tampon, `fenceSync`, puis `getBufferSubData` une fois la fence passée),
une à deux images plus tard.

La caméra garde la dernière réponse, associée à la position et aux réglages sondés. Elle ne se place qu'une fois
la réponse reçue (chargement, URL, téléportation, #bench, #capture) : rien n'est dessiné avant. En vol, la
collision se sert de la réponse précédente ; la sonde relève aussi le sol le plus haut sur le trajet prévu
jusqu'à la réponse suivante, ce qui sert de marge. L'image nette attend la sonde de la position finale. Les
constantes n'existent qu'une fois, dans `terrain/constants.ts`, que le renderer injecte en tête des shaders.
`#probe-test` vérifie que des altitudes de référence ne changent pas.

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
