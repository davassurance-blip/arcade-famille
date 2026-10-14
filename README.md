# Arcade Famille

Petite arcade **hors ligne** pour enfants de 5 à 13 ans : 13 jeux, profils par âge, espace parents protégé par code.
Un seul fichier HTML, zéro dépendance, zéro connexion réseau.

## Jouer / installer
- Version en ligne (GitHub Pages) : https://davassurance-blip.github.io/arcade-famille/
  Ouvrir une fois sur le téléphone ou la tablette, puis **« Ajouter à l'écran d'accueil »** : l'appli fonctionne ensuite sans réseau.
- Version fichier unique : `docs/index.html` (Android : ouvrir avec Chrome depuis l'appli Fichiers).

## Les jeux
| Jeu | Dès | Type |
|---|---|---|
| Attrape-Fruits | 4 ans | réflexes |
| Grenouille Sauteuse | 4 ans | runner un bouton |
| Mémo Formes | 4 ans | mémoire |
| Calcul Éclair | 4 ans | calcul mental, 3 niveaux |
| Taupes Rigolotes | 4 ans | whack-a-mole |
| Fusée Étoiles | 4 ans | un bouton, passe entre les nuages |
| Plateforme Pixel | 8 ans | plateforme façon Mario, 3 niveaux générés |
| Serpent Néon | 8 ans | snake |
| Échecs | 8 ans | contre le Robot (minimax) ou à deux, règles par chess.js |
| Casse-Briques | 8 ans | breakout, niveaux infinis |
| Galaxie | 8 ans | tir spatial, vagues d'envahisseurs |
| Blocs | 8 ans | puzzle de briques qui tombent |
| Duel Arena | 13 ans | combat 1 contre 1 contre une IA |

## Sécurité
- Aucune requête réseau (CSP `default-src 'none'`), aucun script ni police externe, aucune pub, aucun compte.
- Données (prénoms, âges, records) uniquement dans le navigateur de l'appareil.
- Code parent à 4 chiffres, haché (SHA-256 + sel), blocage 60 s après 5 erreurs.

## Développement
```
python3 build.py      # assemble src/ → docs/ (PWA) et dist/
npm i playwright && node test.js   # test de fumée (lance chaque jeu, captures d'écran)
```
Sources : `src/core.js` (hub, profils, espace parents, moteur), `src/games/*.js` (un fichier par jeu), `src/head.html` (styles), `src/markup.html`.

## Licence
MIT — libre d'utilisation, de modification et de partage.
Les règles des échecs viennent de [chess.js](https://github.com/jhlywa/chess.js) (Jeff Hlywa, licence BSD-2, copie dans `src/vendor/`).
