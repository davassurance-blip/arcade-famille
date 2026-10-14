/* ---------- Démarrage ---------- */
GAMES.sort((a, b) => a.minAge - b.minAge); // les jeux des petits d'abord
load(); renderProfiles();
current = S.profiles.find(p => p.id === S.lastProfile) || null;
if (current) { renderHome(); show('home'); } else show('profiles');
// Pas de zoom sur double-tap, pas de menu contextuel sur appui long (tablette)
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
// Sauvegarde immédiate quand l'appli passe en arrière-plan
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
