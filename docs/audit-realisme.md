# Réalisme des paysages générés : préconisations d'amélioration

*Synthèse de l'analyse de 22 vues rendues avec la graine 1 (projet `/Users/francois/Documents/git/mountains`). Captures produites avec le mode #capture (images non versionnées, dans captures/).*

## Résumé

La note moyenne de réalisme est de **3,6/10** (79/220). Elle va de 2 (`lake-plain`, `hills-low`) à 5 (`snow-ridges-aerial`, `dunes-close`, `desert-green-transition`).

Les images sont crédibles de loin : l'étagement des plans, la perspective aérienne, la palette sobre et la lumière chaude sur les sommets fonctionnent. Elles se trahissent sur cinq points qui reviennent dans presque toutes les vues :

1. **Le ciel et la brume ne suivent pas une physique cohérente.** Le ciel ne varie pas selon l'azimut. La brume est trop dense en bas et quasi absente en altitude, et sa teinte est rosée ou lavande.
2. **L'éclairage est plat.** La lumière ambiante est forte et sans occlusion, et on ne voit presque pas d'ombres portées, même quand le soleil est rasant.
3. **Les matériaux sont uniformes.** On voit des aplats de vert, de sable et de roche, sans aucun détail en dessous de 47 m. La roche et l'herbe forment des « taches » qui dépendent de la normale au pixel.
4. **L'eau et les rivages sont trop géométriques.** Le plan d'eau est un miroir lisse, sans profondeur visible ni écume, et le sable forme un liseré de largeur constante.
5. **Le relief ne montre pas d'érosion organisée.** Les bosses sont isotropes, on voit des cônes isolés, il n'y a ni drainage ni couloirs.

Les trois premiers points se corrigent presque entièrement dans `shading.glsl`, sans toucher au champ de hauteur ni à sa copie CPU. Ce sont les gains les plus rentables. Le cinquième point demande un vrai chantier : une érosion analytique dans `terrainHeight`, à reproduire dans `height.ts`.

## Tableau récapitulatif

| Rang | Préconisation | Images concernées | Gravité (typique / max) | Effort | Impact perf |
|---|---|---|---|---|---|
| **Gains rapides** | | | | | |
| 1 | Ciel à gradient azimutal et brume à deux composantes (Rayleigh + aérosols) | 22 | 2 / 3 | Faible | Négligeable |
| 2 | Éclairage : occlusion par cavité, ambiance désaturée, ombres plus nettes | 22 | 2 / 3 | Faible à moyen | +2 à 5 % |
| 3 | Rivages : supprimer le liseré de plage constant, sable mouillé, écume, eau peu profonde | 13 | 3 / 3 | Faible | +1 évaluation du relief par pixel d'eau |
| 4 | Neige selon l'exposition, la concavité et l'aridité, en coulées dans la pente | 14 | 2 / 3 | Faible | Négligeable |
| 5 | Roche : couleur en 3D (fin des traînées), strates, masque roche/herbe à grande échelle | 15 | 2 / 3 | Faible à moyen | Faible |
| 6 | Surface de l'eau : rides, reflet du soleil, reflet cohérent avec le relief | 12 | 2 / 3 | Faible à moyen | Faible |
| 7 | Antialiasing par accumulation avec décalage sous-pixel à l'arrêt | 10 | 2 / 3 | Faible à moyen | Image nette ×4 à 8, progressive |
| 8 | Post-traitement photographique : éblouissement solaire, grain, exposition | 5 | 2 / 3 | Faible | Négligeable |
| **Effort moyen** | | | | | |
| 9 | Végétation en mosaïque (forêt, prairie, lande, herbe sèche) et canopée granuleuse | 16 | 3 / 3 | Moyen | Faible |
| 10 | Détail fin dans l'ombrage seulement (micro-normales et albédo jusqu'au pixel) | 17 | 3 / 3 | Moyen | Modéré |
| 11 | Dunes asymétriques avec face d'avalanche, moins tourbillonnantes, à bonne échelle | 3 | 3 / 3 | Moyen | Faible |
| 12 | Falaises côtières verticales quelle que soit la pente du sol | 3 | 3 / 3 | Moyen | Nul |
| 13 | Courbure terrestre (horizon marin, îles tronquées) | 4 | 2 / 3 | Moyen | Nul |
| **Chantiers lourds** | | | | | |
| 14 | Érosion analytique : ravines orientées par la pente, réseau de drainage | 17 | 3 / 3 | Élevé | +30 à 80 % du raymarching |
| 15 | Formes de montagne : crêtes vives à grande échelle, piémonts, plus de cônes isolés | 15 | 2 / 3 | Moyen à élevé | Modéré |
| 16 | Couche de nuages 2D avec ombres portées au sol (option, contraire au parti pris actuel) | ~20 | 1 à 2 / 2 | Moyen à élevé | Faible (2D) |
| 17 | Lacs d'altitude et rivières (niveau d'eau local) | 7 | 3 / 3 | Très élevé | Élevé |

« Images concernées » compte les vues où l'analyse a relevé au moins un indice imputable à cette cause.

---

## Gains rapides

### 1. Ciel et brume physiquement cohérents

**Vues concernées (22) :** toutes. Les plus touchées :
- `beach-ground` : double horizon, gravité 3.
- `arid-mountains` : sommet à 15 km sans voile, gravité 3 (http://localhost:5173/#x=207510&z=-172250&alt=100&yaw=1.047&pitch=0.100&seed=1).
- `sunset-mountains` : aucune lueur côté soleil, gravité 3.
- `high-valley`, `hills-aerial`, `plain-ground` : la brume est plus forte sur les plans proches que sur les sommets lointains.
- `backlit-ridges` : contre-jour invisible.

**Constats regroupés :**
- Le ciel est un dégradé vertical, identique à gauche et à droite.
- Le halo solaire est minuscule.
- Une teinte lavande ou rosée couvre toute la scène.
- Le premier plan est voilé alors que les sommets enneigés lointains restent nets.
- Les montagnes ne bleuissent pas avec la distance.
- À l'horizon marin, on voit un liseré blanc sous une bande brune.

**Origine dans le code :**
- `sky()` (`src/render/shading.glsl`) ne dépend que de `rd.y`. Son halo est faible : `0.12 * pow(s, 6)`.
- `applyFog()` n'a qu'une composante, avec une hauteur d'échelle de 1500 m et `uFog = 0.4e-4` :
  - au niveau de la mer, l'épaisseur optique atteint 1 à environ 25 km ;
  - à 3000 m, il faut environ 185 km.
  
  Les plaines sont donc laiteuses et les sommets presque sans voile.
- La couleur de la brume (`mix(horizonCol, sunCol*0.9, s*0.6)` avec `pow(s, 8)`) est grise et ne bleuit jamais.
- Avec le soleil par défaut à 12°, `horizonCol` (`terrain.frag.glsl`) vaut environ (0,74 ; 0,64 ; 0,62). C'est cette teinte rosée qu'on retrouve sur la roche (« rose saumon »), le sable (« beige rosé ») et les ombres (« lavande »).
- Le ciel à l'horizon et la brume à distance infinie ne donnent pas la même couleur. Cela crée la jointure visible au-dessus de l'eau dans `beach-ground`.

**Proposition :**
- Un modèle analytique simple à deux composantes, sans précalcul :
  - **Rayleigh** : extinction par longueur d'onde d'environ (5,8 ; 13,5 ; 33,1)·10⁻⁶ /m, hauteur d'échelle 8 km, phase `3/16π (1+cos²θ)`. C'est elle qui bleuit les lointains et les sommets.
  - **Aérosols (Mie)** : extinction grise, hauteur d'échelle de 1,2 à 1,5 km, phase de Henyey-Greenstein avec g ≈ 0,75. Elle donne un halo large et chaud vers le soleil et une brume dense dans les vallées.
  
  Les deux intégrales exponentielles restent analytiques, comme aujourd'hui.
- La lumière diffusée vers l'œil est teintée par `sunCol` (donc rougie quand le soleil est bas) et par l'angle au soleil. On obtient ainsi un ciel plus clair et plus chaud côté soleil, et plus bleu à l'opposé.
- `sky(rd)` devient la même intégrale prise jusqu'à une distance « infinie » : il ne reste plus de jointure entre l'horizon et la brume.
- À soleil bas, ajouter une bande orangée à l'horizon côté soleil. En option : la ceinture de Vénus et l'ombre de la Terre à l'opposé.

**Fichiers :** `src/render/shading.glsl` (`sky`, `applyFog`), `src/render/terrain.frag.glsl` (couleurs du ciel), `src/render/renderer.ts` et `src/params.ts` (deux densités au lieu de `fog`). La copie CPU n'est pas concernée.

**Effort :** faible. **Performances :** négligeable, quelques `exp` par pixel.

**Remarque :** les vues « éclairage par défaut » sont toutes à 12°, donc déjà en lumière dorée. Un soleil par défaut à 30–35° donnerait une image de référence plus neutre.

### 2. Éclairage : occlusion, ambiance et ombres

**Vues concernées (22) :** toutes. Les plus touchées :
- `backlit-ridges` : faces vers la caméra éclairées comme en plein jour, aucune ombre portée, deux gravités 3 (http://localhost:5173/#x=-175706&z=-36840&alt=600&yaw=4.363&pitch=0.030&seed=1, soleil à 8°).
- `sunset-mountains` : soleil à 3° mais pas d'ombres longues, gravité 3.
- `high-sun-mountains` : faces à l'ombre presque aussi claires qu'au soleil, gravité 3.
- `cliffs-sea` : ombres en taches bleu saturé, gravité 3.
- `beach-ground` : sable plat sous un soleil rasant.
- `hills-low`, `high-valley`, `dunes-close`, `dunes-aerial`, `arid-mountains`.

**Origine dans le code :** `shadeTerrain()` (`shading.glsl`).
- `ambient = skyCol * (0.5 + 0.5*n.y)` n'a **aucune occlusion**. Les creux, les ravines et les faces à contre-jour reçoivent tout le ciel.
- `skyCol` (0,2 ; 0,38 ; 0,7) est très saturé, d'où des ombres bleu acier ou lavande.
- `softShadow` utilise `k = 12` (pénombre très large) et `SHADOW_LOD = 4`. Les petits reliefs ne projettent donc rien, ce qui est voulu pour éviter l'acné, mais efface le micro-modelé.
- La lumière de rebond prend `horizonCol` au lieu de la couleur du sol éclairé.
- La lumière du soleil teinte la neige mais presque pas l'herbe, dont l'albédo est très sombre : sous un soleil à 3°, la prairie reste vert olive.

**Proposition :**
- **Occlusion par cavité, presque gratuite :** `cav = terrain(p.xz, lod(t)) - terrain(p.xz, lod(t) - 3)`. C'est l'écart entre la hauteur détaillée et la hauteur sans les trois dernières octaves. Il est négatif dans les creux et positif sur les bosses. On l'utilise pour atténuer l'ambiance (et, plus tard, la neige et la végétation). Variante plus fidèle : 4 à 6 échantillons d'horizon à 2, 8 et 32 m vers le ciel, mais c'est plus cher.
- **Ambiance :** réduire et désaturer l'irradiance du ciel (le ciel moyen est plus blanc que le zénith), et multiplier le tout par l'occlusion. Le rebond utilise l'albédo moyen du sol × `sunCol` × la hauteur du soleil.
- **Ombres :** rendre `k` plus grand près du point (24 à 32), en gardant la pénombre au loin. Vérifier que les rayons d'ombre rasants ne sortent pas trop tôt (`t > 30000`, `p.y > uMaxH`).
- **Contre-jour :** avec une vraie occlusion, une ambiance plus faible et l'éblouissement de la préconisation 8, les reliefs face à la caméra passent naturellement en silhouette.
- Ajouter une légère translucidité de l'herbe en contre-jour : un liseré chaud quand `dot(rd, sun) > 0` et que la normale est rasante.

**Fichiers :** `src/render/shading.glsl`, `src/render/raymarch.glsl`. La copie CPU n'est pas concernée.

**Effort :** faible à moyen. **Performances :** +1 à 2 évaluations de `terrain()` par pixel, contre plus de 100 pour le raymarching et 56 pour l'ombre : de +2 à 5 %.

### 3. Rivages : liseré de plage, sable mouillé, écume, eau peu profonde

**Vues concernées (13) :** `beach-ground`, `cliffs-sea`, `islands-aerial`, `archipelago-high` (halo brun constant, gravité 3 : http://localhost:5173/#x=-60000&z=-372000&alt=12000&yaw=0.000&pitch=-0.700&seed=1), `lake-plain`, `hills-aerial` (lacs cerclés d'une auréole brune), `mid-valley` (liseré clair, gravité 3), `high-panorama`, `high-valley`, `snow-ridges-aerial`, `high-sun-mountains`, `sunset-mountains`, `overview-15km`.

**Constats regroupés :**
- Le liseré clair ou le halo brun garde la même largeur tout autour des côtes et des lacs.
- La ligne d'eau est tranchée net.
- On ne voit ni sable mouillé, ni écume, ni fond visible, ni turquoise en eau peu profonde.
- Les lacs de montagne sont bordés de sable.

**Origine dans le code :**
- Dans `terrainAlbedo()`, `shore` met du sable entre `uWater+1` et `uWater+3.5` m, partout et quel que soit le contexte. Les lacs de montagne ont donc une plage.
- Dans `biomes.ts`, le biome plage est un plateau à `water + 4` m (amplitude 30). Il tombe au milieu de la transition du masque de sable : toute la zone de plage devient une bande à moitié sable, de largeur constante dans l'espace du niveau de relief. C'est le halo brun vu d'avion.
- `shadeWater()` n'évalue jamais la profondeur : le fond est la constante `deep`.

**Proposition :**
- Au point d'eau, `depth = uWater - terrain(p.xz, lod(t))` (une seule évaluation). Puis :
  - absorption de Beer-Lambert : couleur du fond (sable ou roche) × `exp(-σ·depth)`, avec σ plus fort dans le rouge, ce qui donne le turquoise sur le sable ;
  - écume quand `depth < 0,5–1,5 m`, modulée par un bruit étiré parallèlement à la côte et fondue selon la taille du pixel.
- Côté terre, une bande de sable mouillé plus sombre et légèrement spéculaire entre `uWater` et `uWater + 1,5` m. Sa largeur varie avec un bruit à deux échelles pour festonner le rivage.
- Les sables, galets et vases d'un rivage dépendent de la pente. Sur les lacs intérieurs (niveau de relief au-dessus de la plaine), remplacer le sable par de l'herbe, de la vase ou des galets.
- Abaisser ou faire onduler la base du biome plage (par exemple `water + 1,5` m plus un bruit), pour que la plage ne soit plus un plateau calé sur le seuil du masque.

**Fichiers :** `src/render/shading.glsl`, `src/terrain/biomes.ts`. Les biomes sont transmis au shader par uniformes, donc la cohérence CPU/GPU est automatique. Il faudra mettre à jour les altitudes de référence de `height.test.ts`.

**Effort :** faible. **Performances :** +1 évaluation du relief par pixel d'eau.

### 4. Neige : exposition, concavité, aridité et coulées

**Vues concernées (14) :** `plain-ground`, `mid-valley`, `mid-summit-hiker`, `high-panorama`, `high-wall` (face à l'ombre sans neige, liseré constant sur l'arête : http://localhost:5173/#x=-196665&z=-31250&alt=50&yaw=2.094&pitch=0.450&seed=1), `high-valley`, `snow-ridges-aerial`, `dunes-close`, `dunes-aerial`, `desert-green-transition`, `high-sun-mountains`, `sunset-mountains`, `overview-15km`, `backlit-ridges`.

**Constats regroupés :**
- La neige forme des calottes en « glaçage » avec une limite presque horizontale.
- Elle tient sur les faces raides.
- Elle n'occupe ni les couloirs ni les combes.
- Elle ne dépend pas de l'exposition.
- On voit des sommets enneigés en plein désert chaud.

**Origine dans le code :** dans `terrainAlbedo()`, la neige ne dépend que de l'altitude (+ bruit de 375 à 47 m) et de `n.y`.

**Proposition :**
- `snowLine = uSnow + aspectTerm + desert * 1200` :
  - `aspectTerm` vaut environ −250 m sur les faces opposées au soleil et +250 m sur les faces au soleil, via `dot(n.xz, sunDir.xz)` ;
  - le terme désert relève la limite des neiges en zone aride.
- Ajouter la concavité de la préconisation 2 : la neige reste dans les creux et quitte les bosses et les arêtes ventées.
- Pour les coulées, un bruit étiré dans la direction de la plus grande pente (gradient des grandes octaves, déjà calculé dans `terrainHeight`) module le seuil. On obtient des langues dans les couloirs et des barres rocheuses entre elles.
- Si la limite des neiges change, `snowSmoothing()` doit suivre **des deux côtés** (`height.glsl` et `height.ts`), ou rester sur `uSnow`.

**Fichiers :** `src/render/shading.glsl`, et éventuellement `height.glsl` et `height.ts`.

**Effort :** faible. **Performances :** négligeable.

### 5. Roche : couleur en 3D, strates et masque roche/herbe à grande échelle

**Vues concernées (15) :** `cliffs-sea`, `hills-low` (« pâte à modeler » rose, gravité 3), `mid-valley`, `mid-summit-hiker` (rochers en taches floues, gravité 3), `high-panorama`, `high-wall` (taches orangées, filaments), `high-valley` (« plâtre », gravité 3), `snow-ridges-aerial` (confettis gris), `dunes-aerial`, `arid-mountains` (monochrome, éperon aux traînées verticales), `high-sun-mountains` (falaise étirée, gravité 3), `backlit-ridges` (« taches de camouflage », gravité 3 : http://localhost:5173/#x=-175706&z=-36840&alt=600&yaw=4.363&pitch=0.030&seed=1), `plain-ground`, `overview-15km`, `sunset-mountains`.

**Origine dans le code :**
- `colorVariation()` est un bruit 2D en `p.xz`. Sur les pentes fortes, il s'étire verticalement : ce sont les « traînées verticales » et la « texture étirée ». `rockStain()`, lui, est bien en 3D.
- Le masque de végétation `smoothstep(0.78, 0.92, n.y)` utilise la **normale au pixel**. Les affleurements deviennent des taches de même taille, à bord net, qui changent avec la distance et ne suivent pas la structure du relief.
- La roche n'a que deux teintes, sans strates ni coulures. En désert, la roche et le sable ont presque la même couleur.

**Proposition :**
- Rendre `colorVariation` triplanaire, ou passer au bruit 3D quand `n.y` est faible.
- Calculer le masque roche/herbe à partir de la pente des grandes formes (`wallSlope`, ou une normale à `lod(t) - 3`), puis le moduler par la convexité (cavité positive = roche) et par un bruit.
- Ajouter des éboulis gris clair au pied des parois : zones peu pentues juste sous une forte pente, détectables avec la normale à basse résolution.
- **Strates :** des bandes `fract((p.y + tilt·p.xz + warp) / épaisseur)` avec une palette de lithologies (gris, crème, rouille). Les appliquer surtout aux falaises côtières et aux montagnes arides.
- **Coulures :** des stries sombres étirées dans le sens de la pente (vernis désertique, écoulements).
- En désert, assombrir et rougir la roche, et éclaircir le sable.

**Fichiers :** `src/render/shading.glsl`, `src/render/rock.glsl`. Albédo seulement : la copie CPU n'est pas concernée.

**Effort :** faible à moyen. **Performances :** faible (quelques bruits 3D, une seule fois par pixel).

### 6. Surface de l'eau : rides, soleil et cohérence du reflet

**Vues concernées (12) :** `beach-ground`, `cliffs-sea` (reflet incohérent et liseré clair crénelé sous le reflet, gravité 3 : http://localhost:5173/#x=-149500&z=-362969&alt=15&yaw=1.550&pitch=0.050&seed=1), `islands-aerial`, `archipelago-high`, `lake-plain` (reflet en frottis, liseré blanc), `hills-aerial`, `mid-valley`, `high-valley`, `high-sun-mountains`, `sunset-mountains`, `snow-ridges-aerial`, `overview-15km`.

**Origine dans le code :** dans `shadeWater()`, la normale est toujours (0, 1, 0) et il n'y a ni spéculaire solaire ni rugosité. Le reflet est calculé avec `lodScale` = 2 (3 en aperçu), et son ombrage aussi. La normale y est donc plus lisse, ce qui fait apparaître du vert (masque `n.y`) sur des parois qui n'en ont pas : ce sont les taches vertes dans le reflet de `cliffs-sea`. Le liseré clair au bas du reflet vient probablement des rayons réfléchis qui frôlent le pied de la falaise, ratent le relief grossi et retombent sur `sky(r)`.

**Proposition :**
- **Normale perturbée analytique :** une somme de 3 ou 4 bruits ou ondes directionnelles, de quelques mètres à quelques centimètres, fondue selon l'empreinte du pixel. Au loin, ce détail non résolu devient une rugosité.
- **Spéculaire GGX** du soleil, avec une rugosité qui augmente avec la distance. On obtient le scintillement et la traînée dorée à soleil bas. Le reflet est réfléchi avec la normale perturbée, ce qui le casse en bandes horizontales.
- **Ombrage du reflet** avec le niveau de détail du rayon principal pour le **matériau** (normale à `lodScale = 1`), même si le raymarching reste grossier.
- **Rayon réfléchi qui rate de peu le relief** (petite distance minimale au relief sans impact) : prendre la couleur de la brume ou du relief plutôt que `sky()`.
- Assombrir légèrement le reflet et le teinter par l'eau.

**Fichiers :** `src/render/shading.glsl`. **Effort :** faible à moyen. **Performances :** faible, quelques bruits par pixel d'eau. Le reflet existe déjà.

### 7. Antialiasing par accumulation à l'arrêt

**Vues concernées (10) :** `beach-ground` (liseré et île en escalier), `lake-plain` (points bleus réguliers sur la berge), `mid-summit-hiker`, `high-panorama`, `sunset-mountains`, `hills-aerial`, `dunes-close` (tache crénelée, moucheté du plan moyen : http://localhost:5173/#x=192000&z=-155700&alt=8&yaw=4.000&pitch=-0.100&seed=1), `backlit-ridges` (paillettes jaunes), `arid-mountains` (points brillants), `high-wall` (filaments).

**Origine dans le code :** un seul rayon par pixel (`antialias: false`, cible `RGBA8`). Les frontières de matériau (sable, végétation, neige), le test « fond sous l'eau » et les normales à haute fréquence produisent du crénelage et des pixels isolés.

**Proposition :**
- À l'arrêt, le scheduler calcule déjà l'image nette par bandes. Il peut ensuite accumuler N passes (4 à 8) avec un décalage sous-pixel (suite de Halton) dans une cible `RGBA16F`, puis faire la moyenne au blit. Le niveau de détail reste fixé par `uLodHeight`, donc le relief ne change pas d'une passe à l'autre.
- L'export peut en faire davantage.

**Fichiers :** `src/scheduler.ts`, `src/render/renderer.ts`, `src/render/blit.frag.glsl`, et un uniform de décalage dans `terrain.frag.glsl`.

**Effort :** faible à moyen. **Performances :** aperçu inchangé, image nette N fois plus longue mais progressive.

### 8. Post-traitement photographique

**Vues concernées (5) :** `backlit-ridges` (soleil sans éclat, gravité 3), `dunes-close` (pas de diffusion vers l'avant), `sunset-mountains`, `plain-ground` (pas de grain ni de micro-contraste), `mid-valley` (contre-jour non lisible).

**Proposition :**
- **Éblouissement analytique :** connaissant `uSunDir`, ajouter sur toute l'image, y compris sur le relief, un voile `glare(angle au soleil)` (somme de deux lobes). Pas besoin de cible HDR. Le relief qui « mange » le disque solaire s'obtient en élargissant le disque surexposé.
- Grain de capteur léger et vignettage dans `blit.frag.glsl`.
- Exposition qui dépend de la hauteur du soleil : sous-exposer en contre-jour.

**Fichiers :** `terrain.frag.glsl`, `blit.frag.glsl`. **Effort :** faible. **Performances :** négligeable.

---

## Effort moyen

### 9. Végétation en mosaïque et canopée granuleuse

**Vues concernées (16) :** `cliffs-sea`, `islands-aerial`, `archipelago-high`, `lake-plain`, `plain-ground`, `hills-low`, `hills-aerial` (« feutre ou velours », gravité 3 : http://localhost:5173/#x=250000&z=310000&alt=1500&yaw=1.000&pitch=-0.250&seed=1), `mid-valley` (aucune forêt), `high-panorama`, `high-valley`, `snow-ridges-aerial`, `desert-green-transition`, `high-sun-mountains` (« vert pomme »), `backlit-ridges`, `sunset-mountains`, `overview-15km`.

**Origine dans le code :** la végétation est un simple mélange de deux verts selon `colorVariation` (375 à 47 m). Son masque ne dépend que de la pente au pixel et de l'altitude. On ne voit ni étagement, ni humidité, ni exposition, ni texture d'arbres.

**Proposition :**
- Choisir le type de végétation à partir des données déjà disponibles :
  - altitude (forêt sous environ 1800 m, pelouse alpine au-dessus) ;
  - pente des grandes formes ;
  - exposition au soleil ;
  - concavité (combes humides plus vertes, croupes sèches jaunies) ;
  - aridité (steppe clairsemée en transition : sol nu clair entre des points sombres).
- Donner à la forêt une texture granuleuse à l'échelle des arbres (10 à 30 m) : taches sombres, trouées, légère perturbation de la normale, le tout fondu selon la taille du pixel. Cela donne enfin l'échelle dans les vues aériennes.
- Utiliser des albédos plus sourds et variés : olive, bleu-vert, brun-jaune.
- Laisser la teinte de la lumière (soleil bas) s'appliquer réellement. Cela demande des albédos moins sombres, et la préconisation 2.

**Fichiers :** `src/render/shading.glsl`. **Effort :** moyen. **Performances :** faible.

### 10. Détail fin dans l'ombrage seulement

**Vues concernées (17) :** `beach-ground`, `lake-plain` (gravité 3 : http://localhost:5173/#x=-204000&z=-244400&alt=8&yaw=0.000&pitch=-0.040&seed=1), `plain-ground`, `hills-low`, `mid-valley`, `mid-summit-hiker` (neige en « plastique mat »), `high-panorama`, `high-wall`, `high-valley`, `snow-ridges-aerial`, `dunes-close` (pas de rides), `arid-mountains`, `desert-green-transition`, `backlit-ridges`, `sunset-mountains`, `hills-aerial`, `high-sun-mountains`.

**Constats regroupés :**
- Le premier plan est moins détaillé que le lointain.
- La texture ne se resserre pas avec la distance.
- Aucun repère d'échelle (« maquette en feutrine »).

C'est le défaut le plus cité après le ciel.

**Origine dans le code :** l'albédo hors roche ne contient rien sous 47 m (`colorVariation` s'arrête à l'octave 7). Sur les terrains doux, l'atténuation d'érosion et le lissage de la neige effacent aussi le petit relief géométrique.

**Proposition :** ajouter le détail **dans l'ombrage uniquement**, sous forme de micro-normales et d'albédo fondus selon la taille du pixel (comme `rockFade`), sans toucher au champ de hauteur. La copie CPU et les collisions ne sont donc pas concernées.
- **Sable :** rides éoliennes anisotropes (5 à 20 cm), perpendiculaires au vent, avec des bandes sèches et humides.
- **Herbe :** touffes et plaques de 0,2 à 2 m, sol nu, cailloux.
- **Neige :** sastrugi, croûtes de vent, scintillement faible.
- **Roche :** les octaves fines de `rockStain` existent déjà ; il manque les blocs et éboulis.

La lumière rasante révèle alors ce micro-relief : c'est précisément ce que réclament `beach-ground` et `dunes-close`.

**Fichiers :** `src/render/shading.glsl`, éventuellement `noise.glsl`. **Effort :** moyen. **Performances :** modéré, quelques bruits par pixel, concentrés au premier plan grâce au fondu.

### 11. Dunes asymétriques à bonne échelle

**Vues concernées (3) :** `dunes-close` (versants arrondis, sans arête ni face d'avalanche, gravité 3), `dunes-aerial` (volutes, « coups de gouge », échelle de rides à 1500 m, trois gravités 3 : http://localhost:5173/#x=180000&z=-150000&alt=1500&yaw=0.300&pitch=-0.300&seed=1), `arid-mountains` (rides géantes sur le piémont).

**Origine dans le code :** `dunes()` produit des crêtes symétriques (`1 - |n|`, biseau, `pow 1.6`) sans face d'avalanche. Une ondulation de 250 m sur une longueur d'onde de 1200 m fait tourbillonner les cordons. Les couches font 22 et 4 m de haut pour 210 et 50 m de longueur d'onde : vues de 1500 m, elles ressemblent à des rides agrandies. La cuvette en virgule vient du bruit de valeur étiré.

**Proposition :**
- Remplacer la crête symétrique par un **profil asymétrique** le long de l'axe du vent : phase `φ = x/λ + warp`, versant au vent d'environ 10°, face sous le vent à environ 33°.
- Réduire l'ondulation relative (par exemple 80 m pour 2000 m de longueur d'onde) pour obtenir des cordons longilignes.
- Ajouter une couche de **méga-dunes** (1 à 2 km, 60 à 150 m).
- Faire fondre les dunes au contact du relief, avec des rampes de sable.
- Les rides centimétriques relèvent de la préconisation 10.

**Fichiers :** `src/render/climate.glsl`, `src/terrain/dunes.ts`, `src/terrain/constants.ts`, mise à jour de `height.test.ts`. **Effort :** moyen. **Performances :** faible.

### 12. Falaises côtières vraiment verticales

**Vues concernées (3) :** `cliffs-sea` (paroi arrondie « dune », cannelures régulières, crête en spline, plusieurs gravités 3 : http://localhost:5173/#x=-149500&z=-362969&alt=15&yaw=1.550&pitch=0.050&seed=1), `islands-aerial` (liseré de falaise de hauteur constante), `archipelago-high` (îles « découpées à l'emporte-pièce »).

**Origine dans le code :** `cliffLift()` relève le terrain de 21 à 84 m quand l'altitude franchit un pied situé dans `[uWater+0,5 ; +6,5]`, sur `CLIFF_STEP = 3,5 m` de dénivelé du terrain d'origine. La largeur horizontale de la paroi vaut donc `3,5 m / pente du sol`. Sur un littoral en pente douce (pente 0,02 à 0,05), la « falaise » s'étale sur 70 à 175 m : c'est une pente de 25 à 45°, pas une paroi. De plus, le pied et la hauteur varient peu, d'où la marche de hauteur constante tout autour des îles.

**Proposition :**
- Rendre la marche indépendante de la pente : `s = (h - foot) / (CLIFF_STEP_H · max(|pente|, ε))`, pour une largeur horizontale fixe de 3 à 8 m. La pente est déjà disponible dans `terrainHeight` (GPU) et dans `gradX`/`gradZ` (CPU).
- Varier davantage la hauteur le long de la côte, et alterner falaises et criques basses.
- Au pied : platier sombre, éboulis et encoche.
- Les strates de la préconisation 5 s'appliquent à la face.

**Fichiers :** `src/render/climate.glsl`, `src/terrain/climate.ts`, `src/terrain/constants.ts` (et la dérivée `dLift`), mise à jour de `height.test.ts`. **Effort :** moyen. **Performances :** nul.

### 13. Courbure terrestre

**Vues concernées (4) :** `beach-ground` (double horizon), `cliffs-sea`, `islands-aerial`, `overview-15km` (échelle ambiguë à 15 km).

**Origine :** le monde est un plan infini. Depuis 12 à 15 m, le vrai horizon marin est à environ 13–14 km, et les îles lointaines sont tronquées à la base. Ici, l'eau s'étend jusqu'à `TMAX` puis jusqu'à l'infini, ce qui contribue au liseré d'horizon.

**Proposition :**
- Abaisser chaque point du rayon de `d²/2R` (R ≈ 6371 km, éventuellement multiplié par 7/6 pour la réfraction) dans `march`, dans l'intersection avec l'eau (qui devient une résolution du second degré) et dans le saut au-dessus d'`uMaxH`.
- Les collisions CPU, évaluées sous la caméra, ne sont pas concernées.

**Fichiers :** `raymarch.glsl`, `terrain.frag.glsl`, `shading.glsl`. **Effort :** moyen, à cause des bornes de sécurité du raymarching. **Performances :** nul.

---

## Chantiers lourds

### 14. Érosion analytique et réseau de drainage

**Vues concernées (17) :** `hills-low` (« bulles », bruit cellulaire, gravité 3 : http://localhost:5173/#x=-162428&z=-123202&alt=30&yaw=0.698&pitch=0.050&seed=1), `hills-aerial` (pas de talwegs, gravité 3), `islands-aerial`, `mid-valley`, `high-panorama`, `high-wall` (face « tissu », gravité 3), `high-valley` (paroi en bol, pas d'éboulis, gravité 3), `snow-ridges-aerial` (cuvette en cratère), `arid-mountains` (relief « fondu », gravité 3), `desert-green-transition`, `high-sun-mountains`, `sunset-mountains`, `overview-15km` (gravité 3), `cliffs-sea` (cannelures), `mid-summit-hiker`, `backlit-ridges`, `plain-ground`.

**Origine dans le code :** le fBm à dérivées (`erosion = 1/(1+|d|²)`) lisse les versants mais reste isotrope. Il ne crée ni direction d'écoulement ni hiérarchie de vallées. Ses cuvettes sont fermées.

**Proposition :** une **érosion analytique ponctuelle**, compatible avec un champ de hauteur calculé point par point et reproductible sur le CPU. C'est la famille du « filtre d'érosion » à base de bruit de rigoles orientées (type Rune Skovbo Johansen, dérivé des travaux d'Inigo Quilez et de Clay John).
- Pour les octaves de 1 km à environ 10 m, ajouter un bruit de ravines **orienté selon le gradient accumulé des octaves plus grandes**, déjà calculé dans `grad`. Les stries suivent ainsi la ligne de plus grande pente, se ramifient d'une octave à l'autre et dessinent couloirs, arêtes et cônes.
- Le poids est fort sur les pentes moyennes et faible sur les plats.
- Le même mécanisme oriente les couloirs de neige (préconisation 4) et les coulures (préconisation 5).

**Fichiers :** `src/render/height.glsl` et `src/terrain/height.ts` (identiques bit à bit), `constants.ts`, nouvelles références dans `height.test.ts`. Revoir la constante de Lipschitz (`uStep`) : les ravines augmentent la pente.

**Effort :** élevé. **Performances :** +30 à 80 % sur le raymarching, les ombres et les normales (plus de bruit par octave). À compenser en limitant l'érosion aux octaves concernées.

### 15. Formes de montagne : crêtes, pics et piémonts

**Vues concernées (15) :** `plain-ground` (cônes et dômes, pas de piémont), `mid-valley` (cône isolé), `mid-summit-hiker` (« pain de sucre », pics posés sur une plaine verte), `high-panorama`, `high-wall` (crête rectiligne sur 1000 px, gravité 3), `high-valley` (pyramide noire « primitive 3D », dents de bruit), `snow-ridges-aerial` (dômes), `arid-mountains` (aiguilles qui sortent du sable), `desert-green-transition`, `high-sun-mountains` (« tas de pâte », gravité 3 : http://localhost:5173/#x=-322500&z=-104660&alt=1500&yaw=2.618&pitch=-0.020&seed=1), `backlit-ridges` (crête en plateau), `sunset-mountains` (cônes sur un plateau, mesa molle), `overview-15km` (crêtes en murs étroits posés sur une plaine), `hills-aerial`, `dunes-close`.

**Origine dans le code :** les crêtes vives (`ridged`) ne concernent que les octaves de moins de 120 m sur pente raide. Les grandes formes sont du bruit de valeur lissé : maxima isolés en cônes et en dômes. Le champ « chaînes » de `climate()` passe vite de la plaine à la montagne, d'où des murs sans contreforts.

**Proposition :**
- En haute montagne, utiliser un multifractal à crêtes sur les octaves de 3 km à 200 m, avec une légère déformation de domaine. On obtient des arêtes continues reliant les sommets, des cols et des cirques.
- Élargir la transition plaine → montagne dans `climate` : collines puis contreforts, piémonts et cônes de déjection.
- En désert, garder des glacis clairs au pied des reliefs.

**Fichiers :** `height.glsl`, `height.ts`, `climate.glsl`, `climate.ts`, tests. **Effort :** moyen à élevé. **Performances :** modéré.

### 16. Nuages et leurs ombres (option)

**Vues concernées (environ 20) :** presque toutes signalent un ciel vide, et l'absence d'ombres de nuages pour donner l'échelle (`archipelago-high`, `plain-ground`, `hills-aerial`, `overview-15km`…). La gravité est faible à chaque fois (1 à 2), mais le constat revient partout.

**Proposition :**
- Une couche 2D de cumulus vers 1,5–2,5 km (bruit fBm seuillé, éclairage approché), plus éventuellement un voile de cirrus.
- L'ombre au sol est presque gratuite : intersecter le rayon vers le soleil avec le plan des nuages et lire la densité.

Le projet exclut aujourd'hui les nuages par choix : cette préconisation est à arbitrer.

**Effort :** moyen à élevé. **Performances :** faible en 2D, élevé en volumétrique.

### 17. Lacs d'altitude et rivières

**Vues concernées (7) :** `hills-aerial` (lacs sans affluent ni exutoire, gravité 3), `snow-ridges-aerial`, `overview-15km` (lacs « découpés », aucun cours d'eau, gravité 3 : http://localhost:5173/#x=-277644&z=133728&alt=15000&yaw=3.600&pitch=-0.550&seed=1), `high-sun-mountains`, `mid-valley`, `islands-aerial`, `sunset-mountains`.

**Origine :** il n'existe qu'un seul niveau d'eau (`uWater = -60 m`). Tous les « lacs » sont des cuvettes qui descendent sous le niveau de la mer, et aucune rivière n'existe.

**Proposition :** un niveau d'eau local défini point par point, par exemple pour chaque cellule de Voronoï à grande échelle, avec des vallées fluviales creusées le long des arêtes de Voronoï. C'est cohérent avec la préconisation 14 mais lourd : l'eau n'est plus un plan unique, il faut une intersection eau/relief à niveau variable et une copie CPU.

**Effort :** très élevé. **Performances :** élevé.

---

## À diagnostiquer

Des **gradins et arcs parallèles** qui suivent les courbes de niveau apparaissent dans `archipelago-high` (île centrale) et `arid-mountains` (centre du massif). Trois hypothèses, à départager avec une vue de débogage des normales et de `lod(t)` :
- les plateaux que crée le fBm à dérivées sur certaines pentes ;
- des anneaux de transition du niveau de détail, centrés sur la caméra ;
- des dunes qui remontent sur le piémont (`duneWeight`).

## À préserver

- **La perspective aérienne dans son principe** et l'étagement en plans successifs. C'est le point fort cité dans presque toutes les vues : `plain-ground`, `high-panorama`, `mid-valley`, `dunes-close`, `desert-green-transition`. La préconisation 1 doit la renforcer, pas la remplacer.
- **La lumière chaude et rasante sur les sommets** et le contraste neige au soleil / neige bleutée à l'ombre : l'arête du fond de `high-wall`, les sommets de `sunset-mountains`, le fond de `mid-summit-hiker`.
- **La géométrie des reflets** dans les lacs calmes (`mid-valley`, `high-valley`) et l'assombrissement de Fresnel vers le premier plan.
- **Les palettes sobres et désaturées** (aucune couleur criarde) et l'ambiance de brume de poussière dans le désert.
- **La limite des neiges liée à l'altitude** et la végétation en bas, la roche en haut.
- **Certaines silhouettes :** l'arête à gendarmes de `high-wall`, les petites pyramides de `snow-ridges-aerial`, la composition des archipels.
- **Les propriétés techniques :** aucun tuilage, aucune couture, aucune répétition visible ; niveau de détail continu ; précision à grande distance. Toute préconisation qui touche au relief (11, 12, 14, 15, et 4 si `snowSmoothing` change) doit rester identique entre `height.glsl` et `height.ts`, et passer `npm run typecheck` et `npm test`.

## Note moyenne

**3,6/10** sur 22 vues :
- note 2 : `lake-plain`, `hills-low` ;
- note 3 : `beach-ground`, `cliffs-sea`, `archipelago-high`, `mid-valley`, `high-valley`, `arid-mountains`, `high-sun-mountains`, `backlit-ridges` ;
- note 4 : `islands-aerial`, `plain-ground`, `hills-aerial`, `mid-summit-hiker`, `high-panorama`, `high-wall`, `dunes-aerial`, `sunset-mountains`, `overview-15km` ;
- note 5 : `snow-ridges-aerial`, `dunes-close`, `desert-green-transition`.

Les préconisations 1 à 8 ne touchent qu'à l'ombrage et au post-traitement : elles devraient lever l'essentiel des indices de gravité 2 et une partie des gravités 3. Il faut ensuite les préconisations 9, 10 et 14 pour que les premiers plans et les versants cessent de se lire comme une maquette.

## Annexe : vues analysées

| Vue | Note | URL |
|---|---|---|
| beach-ground | 3 | http://localhost:5173/#x=-108400&z=-316200&alt=12&yaw=0.520&pitch=-0.080&seed=1 |
| cliffs-sea | 3 | http://localhost:5173/#x=-149500&z=-362969&alt=15&yaw=1.550&pitch=0.050&seed=1 |
| islands-aerial | 4 | http://localhost:5173/#x=174000&z=70392&alt=3000&yaw=0.524&pitch=-0.238&seed=1 |
| archipelago-high | 3 | http://localhost:5173/#x=-60000&z=-372000&alt=12000&yaw=0.000&pitch=-0.700&seed=1 |
| lake-plain | 2 | http://localhost:5173/#x=-204000&z=-244400&alt=8&yaw=0.000&pitch=-0.040&seed=1 |
| plain-ground | 4 | http://localhost:5173/#x=220000&z=-80000&alt=30&yaw=0.500&pitch=-0.060&seed=1 |
| hills-low | 2 | http://localhost:5173/#x=-162428&z=-123202&alt=30&yaw=0.698&pitch=0.050&seed=1 |
| hills-aerial | 4 | http://localhost:5173/#x=250000&z=310000&alt=1500&yaw=1.000&pitch=-0.250&seed=1 |
| mid-valley | 3 | http://localhost:5173/#x=276000&z=341500&alt=20&yaw=4.057&pitch=0.150&seed=1 |
| mid-summit-hiker | 4 | http://localhost:5173/#x=269500&z=346500&alt=2&yaw=2.500&pitch=-0.080&seed=1 |
| high-panorama | 4 | http://localhost:5173/#x=-180819&z=-67588&alt=300&yaw=3.491&pitch=0.020&seed=1 |
| high-wall | 4 | http://localhost:5173/#x=-196665&z=-31250&alt=50&yaw=2.094&pitch=0.450&seed=1 |
| high-valley | 3 | http://localhost:5173/#x=-187500&z=120000&alt=5&yaw=1.571&pitch=0.250&seed=1 |
| snow-ridges-aerial | 5 | http://localhost:5173/#x=-181510&z=-22500&alt=4000&yaw=5.236&pitch=-0.200&seed=1 |
| dunes-close | 5 | http://localhost:5173/#x=192000&z=-155700&alt=8&yaw=4.000&pitch=-0.100&seed=1 |
| dunes-aerial | 4 | http://localhost:5173/#x=180000&z=-150000&alt=1500&yaw=0.300&pitch=-0.300&seed=1 |
| arid-mountains | 3 | http://localhost:5173/#x=207510&z=-172250&alt=100&yaw=1.047&pitch=0.100&seed=1 |
| desert-green-transition | 5 | http://localhost:5173/#x=222000&z=-246000&alt=150&yaw=2.740&pitch=-0.060&seed=1 |
| high-sun-mountains (soleil à 45°) | 3 | http://localhost:5173/#x=-322500&z=-104660&alt=1500&yaw=2.618&pitch=-0.020&seed=1 |
| backlit-ridges (soleil à 8°, azimut 250°) | 3 | http://localhost:5173/#x=-175706&z=-36840&alt=600&yaw=4.363&pitch=0.030&seed=1 |
| sunset-mountains (soleil à 3°, azimut 250°) | 4 | http://localhost:5173/#x=-312370&z=-81905&alt=500&yaw=5.934&pitch=0.050&seed=1 |
| overview-15km | 4 | http://localhost:5173/#x=-277644&z=133728&alt=15000&yaw=3.600&pitch=-0.550&seed=1 |

Les captures sont dans `/Users/francois/Documents/git/mountains/captures/<nom>.png`.