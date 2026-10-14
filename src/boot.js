/* ---------- Démarrage ---------- */
load(); renderProfiles(); show('profiles');
// Pas de zoom sur double-tap, pas de menu contextuel sur appui long (tablette)
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
