#!/usr/bin/env python3
"""Assemble l'artifact (fragment HTML) et la PWA installable hors ligne."""
import os, glob, json, zipfile, hashlib
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src'); DIST = os.path.join(ROOT, 'dist'); PWA = os.path.join(ROOT, 'docs')
os.makedirs(PWA, exist_ok=True)

def read(p):
    with open(p, encoding='utf-8') as f: return f.read()

head = read(os.path.join(SRC, 'head.html'))
markup = read(os.path.join(SRC, 'markup.html'))
js = read(os.path.join(SRC, 'core.js'))
for v in sorted(glob.glob(os.path.join(SRC, 'vendor', '*.js'))):
    js += '\n/* ===== bibliothèque tierce : ' + os.path.basename(v) + ' ===== */\n' + read(v)
for g in sorted(glob.glob(os.path.join(SRC, 'games', '*.js'))):
    js += '\n' + read(g)
js += '\n' + read(os.path.join(SRC, 'boot.js'))
with open(os.path.join(DIST, 'app.js'), 'w', encoding='utf-8') as f: f.write(js)

body = markup + '\n<script>\n' + js + '\n</script>\n'

# 1) Artifact : fragment (le squelette doctype/head est ajouté à la publication)
artifact = head + '\n' + body
with open(os.path.join(DIST, 'arcade-famille-artifact.html'), 'w', encoding='utf-8') as f: f.write(artifact)

# 2) PWA : page complète + manifest + service worker + icônes
CSP = ("default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; "
       "manifest-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'")
sw_reg = """<script>
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const had = !!navigator.serviceWorker.controller; let done = false;
  const apply = () => { if (done) return; done = true; location.reload(); };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had) return; // première installation : rien à recharger
    if (window.Game && Game.active) { window.__pendingReload = apply; try { toast('Nouvelle version prête'); } catch (e) { } } else apply();
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(r => { r.update().catch(() => {}); setInterval(() => r.update().catch(() => {}), 3600000); }).catch(() => {}));
}
</script>"""
reset = "<style>html{color-scheme:dark}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>"
page = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta name="referrer" content="no-referrer">
<meta name="description" content="Petite arcade hors ligne pour enfants de 5 à 13 ans : 19 jeux, profils par âge, espace parents protégé.">
<meta name="theme-color" content="#17123a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Arcade">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
{reset}
{head}
</head>
<body>
{body}
{sw_reg}
</body>
</html>
"""
with open(os.path.join(PWA, 'index.html'), 'w', encoding='utf-8') as f: f.write(page)

# Fichier autonome (sans manifest/sw) pour ouverture locale
standalone = page.replace('<link rel="manifest" href="manifest.json">\n', '').replace('<link rel="icon" href="icon-192.png">\n<link rel="apple-touch-icon" href="icon-192.png">\n', '').replace(sw_reg, '')
with open(os.path.join(DIST, 'arcade-famille.html'), 'w', encoding='utf-8') as f: f.write(standalone)

# Icônes : manette stylisée
def icon(size):
    im = Image.new('RGBA', (size, size), (23, 18, 58, 255)); d = ImageDraw.Draw(im); s = size / 512
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(110 * s), fill=(23, 18, 58, 255))
    cols = [(255, 210, 63), (56, 224, 214), (255, 79, 154), (157, 255, 92)]
    for i, c in enumerate(cols):
        cx, cy = 128 + (i % 2) * 256, 128 + (i // 2) * 256
        d.ellipse([(cx - 92) * s, (cy - 92) * s, (cx + 92) * s, (cy + 92) * s], fill=c)
    d.rounded_rectangle([106 * s, 196 * s, 406 * s, 316 * s], radius=int(60 * s), fill=(54, 43, 138))
    d.rounded_rectangle([150 * s, 236 * s, 210 * s, 276 * s], radius=int(8 * s), fill=(255, 245, 225))
    d.rounded_rectangle([170 * s, 216 * s, 190 * s, 296 * s], radius=int(8 * s), fill=(255, 245, 225))
    d.ellipse([300 * s, 226 * s, 340 * s, 266 * s], fill=(255, 79, 154))
    d.ellipse([340 * s, 246 * s, 380 * s, 286 * s], fill=(56, 224, 214))
    return im
for n in (192, 512):
    icon(n).save(os.path.join(PWA, f'icon-{n}.png'))

manifest = {
    "name": "Arcade Famille", "short_name": "Arcade", "lang": "fr", "start_url": "./index.html", "scope": "./",
    "display": "fullscreen", "orientation": "any", "background_color": "#17123a", "theme_color": "#17123a",
    "description": "19 jeux hors ligne pour enfants de 5 à 13 ans.",
    "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
              {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]
}
with open(os.path.join(PWA, 'manifest.json'), 'w', encoding='utf-8') as f: json.dump(manifest, f, ensure_ascii=False, indent=2)

ver = hashlib.sha1(page.encode()).hexdigest()[:8]
sw = f"""// Service worker : tout est mis en cache à l'installation, l'appli marche ensuite sans réseau.
const CACHE = 'arcade-{ver}';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {{ cache: 'reload' }})))).then(() => self.skipWaiting())); }});
self.addEventListener('activate', e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener('fetch', e => {{
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, {{ ignoreSearch: true }}).then(r => r || fetch(e.request).catch(() => caches.match('./index.html'))));
}});
"""
with open(os.path.join(PWA, 'sw.js'), 'w', encoding='utf-8') as f: f.write(sw)

readme = """ARCADE FAMILLE — installation
=============================

Dossier "pwa" : à mettre en ligne tel quel (GitHub Pages, Netlify, n'importe quel hébergement HTTPS, gratuit).
Une fois ouvert UNE fois dans le navigateur du téléphone/tablette, le jeu reste disponible hors ligne :
  - Android (Chrome) : menu ⋮ → "Installer l'application" ou "Ajouter à l'écran d'accueil".
  - iPhone / iPad (Safari) : bouton Partager → "Sur l'écran d'accueil".

Fichier "arcade-famille.html" : version autonome, un seul fichier, aucune connexion nécessaire.
  - Android : copier le fichier sur l'appareil, l'ouvrir avec Chrome (via l'appli Fichiers). Les records sont conservés.
  - Ordinateur : double-clic.

Sécurité : aucune connexion réseau (politique CSP stricte), aucune publicité, aucun compte, aucune donnée envoyée.
Les prénoms, âges et records restent dans le navigateur de l'appareil. L'espace parents est protégé par un code à 4 chiffres (haché, jamais stocké en clair).
"""
with open(os.path.join(DIST, 'LISEZ-MOI.txt'), 'w', encoding='utf-8') as f: f.write(readme)

with zipfile.ZipFile(os.path.join(DIST, 'arcade-famille.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    for fn in os.listdir(PWA): z.write(os.path.join(PWA, fn), 'pwa/' + fn)
    z.write(os.path.join(DIST, 'arcade-famille.html'), 'arcade-famille.html')
    z.write(os.path.join(DIST, 'LISEZ-MOI.txt'), 'LISEZ-MOI.txt')
print('OK', len(artifact) // 1024, 'Ko artifact ;', len(page) // 1024, 'Ko pwa')
