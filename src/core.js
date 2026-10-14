'use strict';
/* ========= Arcade Famille — socle ========= */
const VERSION = '1.3';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const esc = s => String(s);
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'style') e.style.cssText = attrs[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
    else if (k === 'html') e.innerHTML = attrs[k]; // statique uniquement, jamais de texte utilisateur
    else e.setAttribute(k, attrs[k]);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}

/* ---------- Stockage local (jamais de réseau) ---------- */
const KEY = 'arcadeFamille.v1';
const COLORS = ['#ffd23f', '#38e0d6', '#ff4f9a', '#9dff5c', '#ff9f1c', '#9b7bff', '#ff6a55', '#5ad1ff'];
const defaultState = () => ({
  pinHash: null, salt: null, sound: true, vibe: true, failed: 0, lockUntil: 0,
  profiles: [
    { id: 1, name: 'Mini', age: 5, color: COLORS[0], avatar: 0 },
    { id: 2, name: 'Pilote', age: 10, color: COLORS[1], avatar: 1 },
    { id: 3, name: 'Boss', age: 13, color: COLORS[2], avatar: 2 }
  ],
  scores: {}, stars: {}, lastProfile: null, resume: null
});
let S = defaultState();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.profiles)) S = Object.assign(defaultState(), d);
    }
  } catch (e) { /* stockage indisponible : on joue en mémoire */ }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }

/* Hachage du code parent (jamais stocké en clair) */
async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(salt + ':' + pin);
  if (window.crypto && crypto.subtle) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { }
  }
  let h = 2166136261; // FNV-1a de secours
  for (const b of data) { h ^= b; h = Math.imul(h, 16777619) >>> 0; }
  return 'fnv' + h.toString(16);
}
function makeSalt() {
  const a = new Uint8Array(8);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for (let i = 0; i < 8; i++) a[i] = rndi(0, 255);
  return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- Avatars (SVG tintés) ---------- */
const AVATARS = [
  '<svg viewBox="0 0 100 100"><path d="M50 14l10 22 24 3-17 16 4 24-21-12-21 12 4-24-17-16 24-3z" fill="#1b1540" opacity=".9"/><circle cx="42" cy="50" r="4" fill="#fff"/><circle cx="58" cy="50" r="4" fill="#fff"/><path d="M42 61q8 7 16 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 100 100"><path d="M22 30l12 10h32l12-10v28a28 28 0 0 1-56 0z" fill="#1b1540" opacity=".9"/><circle cx="40" cy="55" r="5" fill="#fff"/><circle cx="60" cy="55" r="5" fill="#fff"/><circle cx="41" cy="56" r="2" fill="#1b1540"/><circle cx="61" cy="56" r="2" fill="#1b1540"/><path d="M46 66l4 3 4-3" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 100 100"><rect x="24" y="30" width="52" height="46" rx="10" fill="#1b1540" opacity=".9"/><rect x="47" y="16" width="6" height="14" fill="#1b1540"/><circle cx="50" cy="14" r="5" fill="#fff"/><rect x="33" y="44" width="12" height="10" rx="3" fill="#fff"/><rect x="55" y="44" width="12" height="10" rx="3" fill="#fff"/><rect x="38" y="62" width="24" height="5" rx="2" fill="#fff"/></svg>',
  '<svg viewBox="0 0 100 100"><path d="M26 80V48a24 24 0 0 1 48 0v32l-8-6-8 6-8-6-8 6-8-6z" fill="#1b1540" opacity=".9"/><circle cx="41" cy="50" r="5" fill="#fff"/><circle cx="59" cy="50" r="5" fill="#fff"/></svg>',
  '<svg viewBox="0 0 100 100"><circle cx="50" cy="52" r="26" fill="#1b1540" opacity=".9"/><path d="M30 36l8-16 10 12 2-14 10 14 10-12 6 16z" fill="#1b1540" opacity=".9"/><circle cx="41" cy="52" r="4" fill="#fff"/><circle cx="59" cy="52" r="4" fill="#fff"/><path d="M40 64q10 8 20 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 100 100"><path d="M50 18c18 0 30 14 30 32v30H20V50c0-18 12-32 30-32z" fill="#1b1540" opacity=".9"/><rect x="30" y="44" width="40" height="14" rx="7" fill="#fff"/><circle cx="40" cy="51" r="4" fill="#1b1540"/><circle cx="60" cy="51" r="4" fill="#1b1540"/><path d="M42 68h16" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>'
];
function avatarEl(p, cls = 'av') {
  const s = el('span', { class: cls, style: '--pc:' + p.color });
  s.innerHTML = AVATARS[p.avatar % AVATARS.length];
  return s;
}
const tierOf = age => age < 8 ? 0 : age < 13 ? 1 : 2;
const TIER_NAME = ['Petits', 'Moyens', 'Grands'];

/* ---------- Sons (synthèse, aucun fichier) ---------- */
const Sfx = (() => {
  let ac = null;
  const ensure = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (ac && ac.state === 'suspended') ac.resume(); return ac; };
  function tone(f, t, type = 'square', vol = .12, slide = 0) {
    if (!S.sound) return; const c = ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), c.currentTime + t);
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + t);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + t);
  }
  const lib = {
    tap: () => tone(600, .06, 'square', .06),
    coin: () => { tone(880, .08, 'square', .1); setTimeout(() => tone(1320, .12, 'square', .1), 60); },
    jump: () => tone(300, .15, 'square', .08, 300),
    hit: () => tone(140, .2, 'sawtooth', .14, -80),
    lose: () => { tone(300, .25, 'sawtooth', .12, -150); setTimeout(() => tone(200, .4, 'sawtooth', .12, -120), 200); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .18, 'triangle', .12), i * 110)),
    ok: () => { tone(660, .08, 'triangle', .1); setTimeout(() => tone(990, .14, 'triangle', .1), 70); },
    ko: () => tone(180, .25, 'square', .1, -60),
    pop: () => tone(900, .05, 'sine', .1, 400),
    tick: () => tone(1200, .03, 'sine', .05),
    punch: () => tone(220, .1, 'sawtooth', .12, -100),
    unlock: () => ensure()
  };
  return lib;
})();
function vibe(ms) { if (S.vibe && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { } } }

/* ---------- Écrans ---------- */
const screens = ['profiles', 'home', 'game', 'parent'];
function show(name) {
  screens.forEach(s => { $('#scr-' + s).hidden = s !== name; });
  $('#bg').hidden = name === 'game';
}
let current = null; // profil actif
function toast(msg) {
  const t = el('div', { class: 'toast' }, msg); document.body.append(t); setTimeout(() => t.remove(), 1800);
}

/* Profils */
function renderProfiles() {
  const box = $('#profiles'); box.textContent = '';
  for (const p of S.profiles) {
    const c = el('button', { class: 'pcard', style: '--pc:' + p.color, onclick: () => { Sfx.unlock(); Sfx.ok(); current = p; S.lastProfile = p.id; save(); renderHome(); show('home'); } },
      avatarEl(p), el('span', { class: 'nm' }, p.name), el('span', { class: 'ag' }, p.age + ' ans · ' + TIER_NAME[tierOf(p.age)]));
    box.append(c);
  }
}

/* Accueil : jeux filtrés par âge */
function bestOf(pid, gid) { return (S.scores[pid] && S.scores[pid][gid]) || 0; }
function starsOf(pid) { return (S.stars[pid] || 0); }
function gameTile(g, locked) {
  const t = el('button', { class: 'tile' + (locked ? ' lock' : ''), style: '--tc:' + g.color, html: g.icon });
  t.append(el('b', null, g.title), el('i', null, g.tagline));
  const best = bestOf(current.id, g.id);
  if (locked) t.append(el('span', { class: 'best' }, 'Dès ' + g.minAge + ' ans'));
  else if (best) t.append(el('span', { class: 'best' }, 'Record ' + best));
  if (!locked) t.addEventListener('click', () => { Sfx.unlock(); Sfx.tap(); launch(g); });
  else t.addEventListener('click', () => { Sfx.unlock(); toast('Dès ' + g.minAge + ' ans — demande à un parent'); });
  return t;
}
function renderHome() {
  if (!current) return;
  const chipAv = $('#chip-av'); chipAv.replaceWith(avatarEl(current)); $('#chip .av').id = 'chip-av';
  $('#chip-name').textContent = current.name;
  $('#star-count').textContent = starsOf(current.id);
  $('#home-title').textContent = 'Tes jeux, ' + current.name;
  const tier = tierOf(current.age);
  $('#home-sub').textContent = ['Facile et rigolo', 'Réflexes et aventure', 'Mode gamer'][tier];
  const mine = GAMES.filter(g => current.age >= g.minAge), other = GAMES.filter(g => current.age < g.minAge);
  const gb = $('#games'); gb.textContent = '';
  const r = S.resume, rdef = r && r.pid === current.id && GAMES.find(g => g.id === r.gid);
  if (rdef && current.age >= rdef.minAge) {
    const b = el('button', { class: 'resume', style: '--tc:' + rdef.color, onclick: () => { Sfx.unlock(); Sfx.ok(); launch(rdef, r.data); } },
      el('b', null, 'Reprendre ' + rdef.title), el('i', null, r.label || 'Partie en cours'));
    gb.append(b);
  } mine.forEach(g => gb.append(gameTile(g, false)));
  const lb = $('#games-locked'); lb.textContent = ''; other.forEach(g => lb.append(gameTile(g, true)));
  $('#locked-wrap').hidden = other.length === 0;
}

/* ---------- Entrées (clavier, tactile, manette à l'écran) ---------- */
const Input = {
  held: { left: 0, right: 0, up: 0, down: 0, a: 0, b: 0 },
  pressed: {}, // touches "juste appuyées" ce frame
  pointer: { x: 0, y: 0, down: false, justDown: false, justUp: false },
  tap: null, swipe: null,
  _start: null,
  reset() { for (const k in this.held) this.held[k] = 0; this.pressed = {}; this.tap = null; this.swipe = null; this.pointer.down = false; },
  endFrame() { this.pressed = {}; this.tap = null; this.swipe = null; this.pointer.justDown = false; this.pointer.justUp = false; }
};
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', KeyZ: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'a', Enter: 'a', KeyK: 'a', KeyX: 'b', KeyL: 'b', ShiftLeft: 'b', ShiftRight: 'b' };
function press(k) { if (!Input.held[k]) Input.pressed[k] = 1; Input.held[k] = 1; }
function release(k) { Input.held[k] = 0; }
window.addEventListener('keydown', e => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const k = KEYMAP[e.code]; if (k && Game.active) { press(k); e.preventDefault(); }
  if (e.code === 'Escape' && Game.active) Game.pause();
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) release(k); });

function setupStageInput(stage) {
  const pos = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('.overlay') || e.target.closest('#g-dom')) return;
    const p = pos(e); Input.pointer.x = p.x; Input.pointer.y = p.y; Input.pointer.down = true; Input.pointer.justDown = true;
    Input._start = { x: p.x, y: p.y, t: performance.now(), swiped: false };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { }
  });
  stage.addEventListener('pointermove', e => {
    const p = pos(e); Input.pointer.x = p.x; Input.pointer.y = p.y;
    const s = Input._start; if (s && !s.swiped && Input.pointer.down) {
      const dx = p.x - s.x, dy = p.y - s.y;
      if (Math.hypot(dx, dy) > 24) { s.swiped = true; Input.swipe = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
    }
  });
  const up = e => {
    if (!Input.pointer.down) return;
    const p = pos(e); Input.pointer.down = false; Input.pointer.justUp = true;
    const s = Input._start; if (s && !s.swiped && performance.now() - s.t < 400) Input.tap = { x: p.x, y: p.y };
    Input._start = null;
  };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('contextmenu', e => e.preventDefault());
}
const ICONS = {
  left: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M15 4l-8 8 8 8z"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 4l8 8-8 8z"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 15l8-8 8 8z"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 9l8 8 8-8z"/></svg>'
};
function buildPad(spec) {
  const pad = $('#g-pad'); pad.textContent = '';
  if (!spec) { pad.hidden = true; return; }
  pad.hidden = false; pad.classList.toggle('big', !!spec.big);
  const mk = (k, label) => {
    const b = el('button', { class: k, 'aria-label': label, html: ICONS[k] || '' });
    if (!ICONS[k]) b.textContent = label;
    const on = e => { e.preventDefault(); b.classList.add('on'); press(k); try { b.setPointerCapture(e.pointerId); } catch (err) { } };
    const off = e => { e.preventDefault(); b.classList.remove('on'); release(k); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    b.addEventListener('contextmenu', e => e.preventDefault());
    return b;
  };
  if (spec.hint && !spec.left && !spec.buttons) { pad.append(el('div', { class: 'hint' }, spec.hint)); return; }
  const L = el('div', { class: 'grp' }); if (spec.left) { L.append(mk('left', 'Gauche'), mk('right', 'Droite')); }
  const R = el('div', { class: 'grp' }); (spec.buttons || []).forEach(b => R.append(mk(b.k, b.label)));
  pad.append(L); if (spec.hint) pad.append(el('div', { class: 'hint' }, spec.hint)); pad.append(R);
}

/* ---------- Plein écran & orientation ---------- */
const FS = {
  ok: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
  on() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  enter() { const d = document.documentElement; try { const p = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : d.webkitRequestFullscreen ? d.webkitRequestFullscreen() : null; if (p && p.catch) p.catch(() => { }); } catch (e) { } },
  exit() { try { const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen ? document.webkitExitFullscreen() : null; if (p && p.catch) p.catch(() => { }); } catch (e) { } },
  toggle() { this.on() ? this.exit() : this.enter(); },
  lock(o) { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock(o).catch(() => { }); } catch (e) { } },
  unlock() { try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { } }
};
['btn-fs', 'btn-fs-game'].forEach(id => { const b = $('#' + id); if (!FS.ok) b.hidden = true; else b.addEventListener('click', () => { Sfx.tap(); FS.toggle(); }); });

/* ---------- Lanceur de jeu ---------- */
const Game = {
  active: false, def: null, inst: null, raf: 0, last: 0, paused: false, score: 0, env: null,
  pause() { if (!this.active || this.paused || !$('#g-over').hidden) return; this.paused = true; $('#g-pause').hidden = false; },
  resume() { this.paused = false; $('#g-pause').hidden = true; this.last = performance.now(); Input.reset(); },
};
const canvas = $('#g-canvas'), ctx = canvas.getContext('2d'), stage = $('#g-stage'), domRoot = $('#g-dom');
let dpr = 1;
function resizeCanvas() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = stage.clientWidth, h = stage.clientHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (Game.inst && Game.inst.resize) Game.inst.resize();
}
window.addEventListener('resize', () => { if (Game.active) resizeCanvas(); });
window.addEventListener('orientationchange', () => { setTimeout(() => { if (Game.active) resizeCanvas(); }, 250); setTimeout(() => { if (Game.active) resizeCanvas(); }, 800); });
if (window.ResizeObserver) new ResizeObserver(() => { if (Game.active) resizeCanvas(); }).observe(stage);
document.addEventListener('visibilitychange', () => { if (document.hidden && Game.active) Game.pause(); });

function makeEnv(def) {
  return {
    canvas, ctx, input: Input, sfx: Sfx, vibe, profile: current, tier: tierOf(current.age),
    get W() { return stage.clientWidth; }, get H() { return stage.clientHeight; },
    dom: domRoot,
    setScore(n) { Game.score = n; $('#g-score').textContent = n; },
    hud(t) { $('#g-hud').textContent = t; },
    gameOver(score, opts) { endGame(score, opts || {}); },
    save(data, label) { S.resume = { gid: def.id, pid: current.id, data, label }; save(); },
    color: def.color
  };
}
function launch(def, saved) {
  Game.def = def; Game.saved = saved || null; Game.active = true; Game.paused = false; Game.score = 0;
  $('#g-title').textContent = def.title; $('#g-score').textContent = '0'; $('#g-hud').textContent = '';
  $('#g-over').hidden = true; $('#g-pause').hidden = true;
  domRoot.textContent = ''; domRoot.classList.toggle('on', !!def.dom);
  buildPad(def.pad);
  show('game');
  if (FS.ok && !FS.on()) FS.enter();
  if (def.landscape) setTimeout(() => FS.lock('landscape'), 150);
  Input.reset();
  resizeCanvas();
  // intro
  $('#i-title').textContent = def.title; $('#i-text').textContent = def.howto[tierOf(current.age)] || def.howto[0];
  $('#g-intro').hidden = false;
  Game.inst = null;
}
function startRun() {
  $('#g-intro').hidden = true; $('#g-over').hidden = true; Game.paused = false;
  domRoot.textContent = '';
  Input.reset();
  Game.env = makeEnv(Game.def);
  Game.inst = Game.def.create(Game.env, Game.saved); Game.saved = null;
  if (Game.inst.resize) Game.inst.resize();
  Game.score = 0; $('#g-score').textContent = '0';
  Game.last = performance.now();
  cancelAnimationFrame(Game.raf);
  Game.raf = requestAnimationFrame(loop);
}
function loop(t) {
  if (!Game.active) return;
  Game.raf = requestAnimationFrame(loop);
  const dt = Math.min(1 / 30, (t - Game.last) / 1000); Game.last = t;
  if (Game.paused || !Game.inst || Game.over) { Input.endFrame(); return; }
  try {
    if (Game.inst.update) Game.inst.update(dt);
    if (Game.inst.draw) Game.inst.draw(ctx);
  } catch (e) { console.error(e); }
  Input.endFrame();
}
function endGame(score, opts) {
  if (Game.over) return;
  Game.over = true;
  if (Game.inst && Game.inst.stop) Game.inst.stop();
  const pid = current.id, gid = Game.def.id;
  S.scores[pid] = S.scores[pid] || {};
  const prev = S.scores[pid][gid] || 0, rec = score > prev;
  if (rec) S.scores[pid][gid] = score;
  S.resume = null;
  const earned = Game.def.stars ? Game.def.stars(score) : Math.min(3, Math.floor(score / 100));
  S.stars[pid] = (S.stars[pid] || 0) + earned;
  save();
  $('#o-rec').hidden = !(rec && score > 0);
  $('#o-title').textContent = opts.title || (opts.win ? 'Bravo !' : 'Partie terminée');
  $('#o-score').textContent = score;
  $('#o-text').textContent = (opts.text ? opts.text + ' · ' : '') + (earned ? '+' + earned + ' étoile' + (earned > 1 ? 's' : '') + ' · ' : '') + 'Record : ' + Math.max(prev, score);
  $('#g-over').hidden = false;
  if (opts.win) Sfx.win(); else Sfx.lose();
}
function quitGame() {
  const abandon = !!Game.inst && !Game.over; // partie quittée volontairement en cours de route
  cancelAnimationFrame(Game.raf);
  if (Game.inst && Game.inst.stop) try { Game.inst.stop(); } catch (e) { }
  Game.inst = null; Game.active = false; Game.over = false; Game.paused = false;
  domRoot.textContent = ''; Input.reset();
  FS.unlock();
  if (abandon) { S.resume = null; save(); }
  if (window.__pendingReload) { window.__pendingReload(); return; }
  renderHome(); show('home');
}
$('#i-go').addEventListener('click', () => { Sfx.unlock(); Sfx.ok(); Game.over = false; startRun(); });
$('#o-again').addEventListener('click', () => { Sfx.ok(); Game.over = false; startRun(); });
$('#o-menu').addEventListener('click', quitGame);
$('#btn-quit').addEventListener('click', () => { if (!$('#g-intro').hidden || Game.over) quitGame(); else Game.pause(); });
$('#p-resume').addEventListener('click', () => Game.resume());
$('#p-quit').addEventListener('click', quitGame);
setupStageInput(stage);

/* ---------- Code parent & espace parents ---------- */
const Pin = {
  buf: '', mode: null, resolve: null,
  open(mode, title, text) {
    return new Promise(res => {
      this.mode = mode; this.resolve = res; this.buf = ''; this.first = null;
      $('#pin-title').textContent = title; $('#pin-text').textContent = text; $('#pin-err').textContent = '';
      this.render(); $('#modal-pin').hidden = false;
    });
  },
  close(v) { $('#modal-pin').hidden = true; const r = this.resolve; this.resolve = null; if (r) r(v); },
  render() { $$('#pin-dots i').forEach((d, i) => d.classList.toggle('on', i < this.buf.length)); },
  shake() { const d = $('#pin-dots'); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); vibe(80); },
  async key(k) {
    if (k === 'del') { this.buf = this.buf.slice(0, -1); this.render(); return; }
    if (this.buf.length >= 4) return;
    this.buf += k; this.render(); Sfx.tick();
    if (this.buf.length < 4) return;
    const pin = this.buf;
    if (this.mode === 'set') {
      if (this.first == null) { this.first = pin; this.buf = ''; $('#pin-text').textContent = 'Confirme le code'; this.render(); return; }
      if (this.first !== pin) { this.first = null; this.buf = ''; this.render(); $('#pin-text').textContent = 'Choisis un code à 4 chiffres'; $('#pin-err').textContent = 'Les codes ne correspondent pas'; this.shake(); return; }
      S.salt = makeSalt(); S.pinHash = await hashPin(pin, S.salt); S.failed = 0; save(); this.close(true); return;
    }
    // vérification
    if (Date.now() < S.lockUntil) { this.buf = ''; this.render(); $('#pin-err').textContent = 'Trop d\'essais. Réessaie dans ' + Math.ceil((S.lockUntil - Date.now()) / 1000) + ' s'; this.shake(); return; }
    const h = await hashPin(pin, S.salt);
    if (h === S.pinHash) { S.failed = 0; save(); this.close(true); }
    else {
      S.failed = (S.failed || 0) + 1; this.buf = ''; this.render(); this.shake();
      if (S.failed >= 5) { S.lockUntil = Date.now() + 60000; S.failed = 0; $('#pin-err').textContent = 'Bloqué 60 secondes'; }
      else $('#pin-err').textContent = 'Code incorrect (' + (5 - S.failed) + ' essais restants)';
      save();
    }
  }
};
(function buildPinpad() {
  const p = $('#pinpad');
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', ''].forEach(k => {
    if (k === '') { p.append(el('span')); return; }
    const b = el('button', { onclick: () => Pin.key(k), 'aria-label': k === 'del' ? 'Effacer' : k }, k === 'del' ? '⌫' : k);
    p.append(b);
  });
  $('#pin-cancel').addEventListener('click', () => Pin.close(false));
})();
async function openParent() {
  Sfx.unlock();
  let ok;
  if (!S.pinHash) ok = await Pin.open('set', 'Crée ton code parent', 'Choisis un code à 4 chiffres');
  else ok = await Pin.open('check', 'Code parent', 'Entre le code à 4 chiffres');
  if (!ok) return;
  renderParent(); show('parent');
}
$('#btn-parent-1').addEventListener('click', openParent);
$('#btn-parent-2').addEventListener('click', openParent);
$('#btn-parent-back').addEventListener('click', () => { save(); renderProfiles(); if (current) { current = S.profiles.find(p => p.id === current.id) || null; } if (current) { renderHome(); show('home'); } else show('profiles'); });
$('#chip').addEventListener('click', () => { Sfx.tap(); S.lastProfile = null; save(); renderProfiles(); show('profiles'); });

function confirmBox(title, text) {
  return new Promise(res => {
    $('#cf-title').textContent = title; $('#cf-text').textContent = text; $('#modal-confirm').hidden = false;
    const done = v => { $('#modal-confirm').hidden = true; ok.onclick = no.onclick = null; res(v); };
    const ok = $('#cf-ok'), no = $('#cf-no'); ok.onclick = () => done(true); no.onclick = () => done(false);
  });
}
function renderParent() {
  const list = $('#p-list'); list.textContent = '';
  S.profiles.forEach(p => {
    const av = avatarEl(p);
    av.addEventListener('click', () => { p.avatar = (p.avatar + 1) % AVATARS.length; save(); renderParent(); });
    av.style.cursor = 'pointer'; av.title = 'Changer d\'avatar';
    const name = el('input', { type: 'text', maxlength: '12', value: p.name, 'aria-label': 'Prénom', autocomplete: 'off' });
    name.addEventListener('input', () => { p.name = name.value.trim().slice(0, 12) || 'Joueur'; save(); });
    const age = el('input', { type: 'number', min: '3', max: '17', inputmode: 'numeric', value: p.age, 'aria-label': 'Âge' });
    age.addEventListener('change', () => { p.age = clamp(parseInt(age.value, 10) || 5, 3, 17); age.value = p.age; save(); });
    const del = el('button', { class: 'del', title: 'Supprimer', 'aria-label': 'Supprimer ' + p.name, html: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 7h12l-1 14H7zm3-4h6l1 2h4v2H4V5h4z"/></svg>' });
    del.addEventListener('click', async () => {
      if (S.profiles.length <= 1) { toast('Il faut au moins un joueur'); return; }
      if (await confirmBox('Supprimer ' + p.name + ' ?', 'Ses records seront effacés.')) { S.profiles = S.profiles.filter(x => x !== p); delete S.scores[p.id]; delete S.stars[p.id]; if (current && current.id === p.id) current = null; save(); renderParent(); }
    });
    const row = el('div', { class: 'prow' }, av, name, age, del);
    const sw = el('div', { class: 'swatches', style: 'grid-column:1/-1' });
    COLORS.forEach(c => sw.append(el('button', { class: c === p.color ? 'on' : '', style: 'background:' + c, 'aria-label': 'Couleur', onclick: () => { p.color = c; save(); renderParent(); } })));
    row.append(sw);
    list.append(row);
  });
  $('#t-sound').classList.toggle('on', !!S.sound); $('#t-sound').setAttribute('aria-checked', String(!!S.sound));
  $('#t-vibe').classList.toggle('on', !!S.vibe); $('#t-vibe').setAttribute('aria-checked', String(!!S.vibe));
  $('#p-version').textContent = VERSION;
}
$('#p-add').addEventListener('click', () => {
  if (S.profiles.length >= 6) { toast('6 joueurs maximum'); return; }
  const id = Math.max(0, ...S.profiles.map(p => p.id)) + 1;
  S.profiles.push({ id, name: 'Joueur ' + id, age: 8, color: COLORS[id % COLORS.length], avatar: id % AVATARS.length });
  save(); renderParent();
});
$('#t-sound').addEventListener('click', () => { S.sound = !S.sound; save(); renderParent(); if (S.sound) Sfx.ok(); });
$('#t-vibe').addEventListener('click', () => { S.vibe = !S.vibe; save(); renderParent(); vibe(40); });
$('#p-pin').addEventListener('click', async () => { if (await Pin.open('set', 'Nouveau code', 'Choisis un code à 4 chiffres')) toast('Code mis à jour'); });
$('#p-reset-scores').addEventListener('click', async () => { if (await confirmBox('Effacer les records ?', 'Les étoiles et records de tous les joueurs seront remis à zéro.')) { S.scores = {}; S.stars = {}; save(); toast('Records effacés'); } });
$('#p-reset-all').addEventListener('click', async () => { if (await confirmBox('Tout réinitialiser ?', 'Joueurs, records et code parent seront supprimés.')) { S = defaultState(); save(); current = null; renderParent(); toast('Application réinitialisée'); } });

/* ---------- Outils de dessin partagés ---------- */
const Draw = {
  rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); },
  text(c, t, x, y, size, color, align = 'center', weight = 900) { c.font = weight + ' ' + size + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(t, x, y); },
  heart(c, x, y, s, on) { c.fillStyle = on ? '#ff4f9a' : 'rgba(255,255,255,.2)'; c.beginPath(); c.moveTo(x, y + s * .3); c.bezierCurveTo(x, y, x - s * .5, y, x - s * .5, y + s * .3); c.bezierCurveTo(x - s * .5, y + s * .6, x, y + s * .8, x, y + s); c.bezierCurveTo(x, y + s * .8, x + s * .5, y + s * .6, x + s * .5, y + s * .3); c.bezierCurveTo(x + s * .5, y, x, y, x, y + s * .3); c.fill(); },
  lives(c, n, max, x, y) { for (let i = 0; i < max; i++) this.heart(c, x + i * 26, y, 18, i < n); }
};
/* Particules simples */
function Particles() {
  const ps = [];
  return {
    burst(x, y, color, n = 10, sp = 160) { for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(sp * .3, sp); ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: rnd(.3, .7), c: color, r: rnd(2, 5) }); } },
    update(dt) { for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; if (p.t <= 0) ps.splice(i, 1); } },
    draw(c) { for (const p of ps) { c.globalAlpha = clamp(p.t * 2, 0, 1); c.fillStyle = p.c; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); } c.globalAlpha = 1; }
  };
}
const GAMES = [];
