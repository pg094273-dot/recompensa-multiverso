'use strict';

/* ============================================================
   MULTIVERSO DE MISIONES — núcleo: estado, sonido, efectos UI
   ============================================================ */

/* ---------------- Utilidades ---------------- */

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const uid = prefix => (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 8);

function dayKey(d) {
  const x = d || new Date();
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

const today = () => dayKey(new Date());

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

function last7() {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    out.push({ key: dayKey(d), date: d });
  }
  return out;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleChallenges(n) {
  const count = n || 8;
  const pools = { db: shuffle(CHALLENGES.db), ch: shuffle(CHALLENGES.ch), hp: shuffle(CHALLENGES.hp) };
  const picked = [
    ...pools.db.slice(0, 3).map(c => ({ ...c, realm: 'db', id: uid('ret') })),
    ...pools.ch.slice(0, 3).map(c => ({ ...c, realm: 'ch', id: uid('ret') })),
    ...pools.hp.slice(0, 2).map(c => ({ ...c, realm: 'hp', id: uid('ret') }))
  ];
  return shuffle(picked).slice(0, count);
}

function levelInfo(xp) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) idx = i;
  }
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  const pct = next
    ? Math.max(0, Math.min(100, Math.round(((xp - current.xp) / (next.xp - current.xp)) * 100)))
    : 100;
  return { level: idx + 1, name: current.name, current: xp, next: next ? next.xp : null, pct };
}

/* ---------------- Estado ---------------- */

let state;
let editMode = false;
let justDone = null;
let activeChallenge = null;
let spinning = false;
let wheelPicks = [];
const completing = new Set();

function makeKid(id, name, avatar) {
  return {
    id, name, avatar,
    xp: 0,
    coins: 0,
    streak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    perfectDate: null,
    badges: [],
    stats: { total: 0, challenges: 0, perfectDays: 0, coinsEarned: 0, rewardsRedeemed: 0 }
  };
}

function defaultState() {
  return {
    version: 2,
    activeKid: 'enrique',
    tab: 'missions',
    settings: { sound: true, haptics: true, pin: '' },
    kids: {
      enrique: makeKid('enrique', 'Enrique', 'saiyan'),
      eduardo: makeKid('eduardo', 'Eduardo', 'striker')
    },
    tasks: DEFAULT_TASKS.map(t => ({ ...t, days: t.days.slice() })),
    rewards: DEFAULT_REWARDS.map(r => ({ ...r })),
    log: []
  };
}

function normalizeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const s = Object.assign({}, base, raw);
  s.settings = Object.assign({}, base.settings, raw.settings || {});
  s.kids = {};
  Object.keys(base.kids).forEach(id => {
    const k = (raw.kids && raw.kids[id]) || {};
    const seed = base.kids[id];
    s.kids[id] = Object.assign({}, seed, k, {
      id,
      stats: Object.assign({}, seed.stats, k.stats || {}),
      badges: Array.isArray(k.badges) ? k.badges : []
    });
  });
  if (Array.isArray(raw.tasks)) {
    s.tasks = raw.tasks
      .filter(t => t && t.id && s.kids[t.kid])
      .map(t => ({
        ...t,
        title: String(t.title || 'Misión'),
        icon: t.icon || '⚡',
        realm: REALMS[t.realm] ? t.realm : 'db',
        points: Math.max(1, Number(t.points) || 5),
        days: Array.isArray(t.days) && t.days.length ? t.days.map(Number) : [0, 1, 2, 3, 4, 5, 6],
        doneDate: t.doneDate || null
      }));
  } else {
    s.tasks = base.tasks;
  }
  if (Array.isArray(raw.rewards)) {
    s.rewards = raw.rewards
      .filter(r => r && r.id)
      .map(r => ({
        id: r.id,
        title: String(r.title || 'Premio'),
        icon: r.icon || '🎁',
        cost: Math.max(1, Number(r.cost) || 50)
      }));
  } else {
    s.rewards = base.rewards;
  }
  s.log = Array.isArray(raw.log) ? raw.log.slice(0, 400) : [];
  if (!s.kids[s.activeKid]) s.activeKid = 'enrique';
  if (!TABS.some(t => t.id === s.tab)) s.tab = 'missions';
  return s;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch (err) {
    console.warn('No se pudo cargar el estado', err);
    return defaultState();
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('No se pudo guardar', err);
  }
}

state = loadState();

function currentKid() {
  return state.kids[state.activeKid] || state.kids.enrique;
}

function tasksToday(kidId) {
  const day = new Date().getDay();
  return state.tasks.filter(t => t.kid === kidId && t.days.includes(day));
}

/* ---------------- Puntos, rachas y logros ---------------- */

function pushLog(kidId, kind, title, points) {
  state.log.unshift({ id: uid('log'), ts: Date.now(), day: today(), kidId, kind, title, points });
  if (state.log.length > 400) state.log.length = 400;
}

function registerStreak(kidId) {
  const kid = state.kids[kidId];
  const d = today();
  if (kid.lastActiveDate === d) return;
  kid.streak = kid.lastActiveDate === yesterdayKey() ? (kid.streak || 0) + 1 : 1;
  kid.bestStreak = Math.max(kid.bestStreak || 0, kid.streak);
  kid.lastActiveDate = d;
}

function syncBadges(kidId) {
  const kid = state.kids[kidId];
  if (!kid) return [];
  const unlocked = BADGES.filter(b => {
    try { return b.check(kid); } catch (err) { return false; }
  }).map(b => b.id);
  const fresh = unlocked.filter(id => !kid.badges.includes(id));
  kid.badges = Array.from(new Set(kid.badges.concat(unlocked)));
  return BADGES.filter(b => fresh.includes(b.id));
}

function syncAllBadges() {
  Object.keys(state.kids).forEach(id => syncBadges(id));
}

function award(kidId, points, kind, title) {
  const kid = state.kids[kidId];
  const before = levelInfo(kid.xp).level;
  kid.xp += points;
  kid.coins += points;
  kid.stats.coinsEarned += points;
  pushLog(kidId, kind, title, points);
  const after = levelInfo(kid.xp).level;
  const newBadges = syncBadges(kidId);
  return { levelUp: after > before, level: after, newBadges };
}

function handleAwardOutcome(kidId, res) {
  if (!res) return;
  if (res.levelUp) {
    setTimeout(() => showLevelUp(kidId, res.level), 650);
  }
  (res.newBadges || []).forEach((b, i) => {
    setTimeout(() => {
      toast('¡Logro desbloqueado: ' + b.name + '!', b.icon);
      sound.badge();
    }, 900 + i * 850);
  });
}

function checkPerfectDay(kidId) {
  const kid = state.kids[kidId];
  const list = tasksToday(kidId);
  if (!list.length) return;
  const allDone = list.every(t => t.doneDate === today());
  if (!allDone || kid.perfectDate === today()) return;
  kid.perfectDate = today();
  kid.stats.perfectDays += 1;
  const res = award(kidId, 25, 'bonus', 'Día perfecto');
  save();
  renderAll();
  confettiRain(90);
  sound.perfect();
  toast('¡DÍA PERFECTO! +25 puntos extra', '🏆');
  handleAwardOutcome(kidId, res);
}

/* ---------------- Sonido (sin archivos, WebAudio) ---------------- */

const sound = {
  ctx: null,

  ensure() {
    if (!state.settings.sound) return null;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch (err) {
      return null;
    }
  },

  tone(freq, when, dur, type, vol, slide) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol || 0.1, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  },

  complete(realm) {
    const base = realm === 'db' ? 523 : realm === 'ch' ? 440 : 494;
    [0, 4, 7, 12].forEach((semi, i) => {
      this.tone(base * Math.pow(2, semi / 12), i * 0.055, 0.24, 'triangle', 0.075);
    });
    this.tone(base / 2, 0, 0.18, 'sine', 0.06);
  },

  perfect() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, i * 0.09, 0.32, 'triangle', 0.085));
  },

  levelUp() {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, i * 0.085, 0.38, 'triangle', 0.09));
  },

  win() {
    [659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.08, 0.3, 'sine', 0.08));
  },

  badge() {
    [880, 1175, 1568].forEach((f, i) => this.tone(f, i * 0.06, 0.26, 'sine', 0.06));
  },

  tick() {
    this.tone(1200, 0, 0.025, 'square', 0.018);
  },

  error() {
    this.tone(220, 0, 0.26, 'sawtooth', 0.05, 120);
  }
};

function haptic(ms) {
  if (!state.settings.haptics) return;
  try {
    if (navigator.vibrate) navigator.vibrate(ms || 30);
  } catch (err) { /* iOS no soporta vibración web */ }
}

/* ---------------- Efectos en canvas ---------------- */

const fx = (() => {
  const canvas = document.getElementById('fx');
  const ctx = canvas.getContext('2d');
  let parts = [];
  let raf = 0;
  let dpr = 1;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function start() {
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function burst(x, y, colors, count, power) {
    const n = count || 26;
    const p = power || 8;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * p + 1.2;
      parts.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1.2,
        g: 0.16,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.32,
        life: 1,
        decay: 0.014 + Math.random() * 0.014,
        shape: Math.random() < 0.55 ? 'rect' : 'circle'
      });
    }
    start();
  }

  function rain(count) {
    const colors = ['#ffd166', '#ff9f1c', '#a78bfa', '#7cf5c4', '#ffffff', '#ff5e3a', '#3b82f6'];
    const n = count || 80;
    for (let i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * window.innerHeight * 0.55,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 2 + Math.random() * 3.5,
        g: 0.028,
        size: 5 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.28,
        life: 1,
        decay: 0.0045 + Math.random() * 0.004,
        shape: 'rect'
      });
    }
    start();
  }

  function loop() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.995;
      p.rot += p.vr;
      p.life -= p.decay;
      if (p.life <= 0 || p.y > window.innerHeight + 60 || p.x < -80 || p.x > window.innerWidth + 80) {
        parts.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.62);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (parts.length) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  resize();
  return { resize, burst, rain };
})();

function burstAt(x, y, realm) {
  const r = REALMS[realm] || REALMS.db;
  fx.burst(x, y, r.fx, 28, 8.5);
}

function confettiRain(n) {
  fx.rain(n || 80);
}

function floatPoints(x, y, text, color) {
  const el = document.createElement('div');
  el.className = 'float-pts';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  if (color) el.style.color = color;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

/* ---------------- Toasts ---------------- */

function toast(message, emoji) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = '<span>' + (emoji || '✨') + '</span><span>' + esc(message) + '</span>';
  wrap.appendChild(el);
  while (wrap.children.length > 3) wrap.firstChild.remove();
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 280);
  }, 2800);
}

/* ---------------- Modales base ---------------- */

function openModal(html, opts) {
  const options = opts || {};
  const root = document.getElementById('modalRoot');
  root.innerHTML =
    '<div class="modal-overlay"><div class="modal ' + (options.wide ? 'wide' : '') + '" role="dialog" aria-modal="true">' +
    html +
    '<button class="modal-close" data-action="closeModal" aria-label="Cerrar">✕</button>' +
    '</div></div>';
  document.body.classList.add('modal-open');
  setTimeout(() => {
    const field = root.querySelector('.modal input:not([type="hidden"]), .modal textarea');
    if (field) field.focus({ preventScroll: true });
  }, 200);
}

function closeModal() {
  const root = document.getElementById('modalRoot');
  if (root) root.innerHTML = '';
  document.body.classList.remove('modal-open');
  activeChallenge = null;
}

function confirmAction(title, message, confirmText, onConfirm, danger) {
  openModal(
    '<h2>' + esc(title) + '</h2>' +
    '<p class="modal-sub">' + esc(message) + '</p>' +
    '<div class="modal-actions">' +
    '<button type="button" class="btn btn-ghost" data-action="closeModal">Cancelar</button>' +
    '<button type="button" class="btn ' + (danger === false ? '' : 'btn-danger') + '" id="confirmYes">' + esc(confirmText || 'Aceptar') + '</button>' +
    '</div>'
  );
  const btn = document.getElementById('confirmYes');
  if (btn) {
    btn.addEventListener('click', () => {
      closeModal();
      onConfirm();
    });
  }
}

function requirePin(onOk) {
  if (!state.settings.pin) {
    onOk();
    return;
  }
  openModal(
    '<h2>Zona de padres</h2>' +
    '<p class="modal-sub">Introduce el PIN de 4 números para continuar.</p>' +
    '<div class="field"><input class="input" id="pinInput" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off"></div>' +
    '<div class="modal-actions">' +
    '<button type="button" class="btn btn-ghost" data-action="closeModal">Cancelar</button>' +
    '<button type="button" class="btn" id="pinOk">Entrar</button>' +
    '</div>'
  );
  const input = document.getElementById('pinInput');
  const go = () => {
    if (input && input.value.trim() === state.settings.pin) {
      closeModal();
      onOk();
    } else {
      sound.error();
      haptic(60);
      toast('PIN incorrecto', '🔒');
      if (input) input.value = '';
    }
  };
  const ok = document.getElementById('pinOk');
  if (ok) ok.addEventListener('click', go);
  if (input) {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    setTimeout(() => input.focus({ preventScroll: true }), 220);
  }
}

function showLevelUp(kidId, level) {
  const kid = state.kids[kidId];
  const lvl = LEVELS[level - 1] || LEVELS[LEVELS.length - 1];
  openModal(
    '<div class="levelup-card">' +
    '<div class="levelup-avatar"><div class="avatar-ring"></div><div class="avatar">' + avatarSVG(kid.avatar) + '</div>' +
    '<span class="level-badge">Nv ' + level + '</span></div>' +
    '<div class="levelup-kicker">¡Subida de nivel!</div>' +
    '<div class="levelup-title">NIVEL ' + level + '</div>' +
    '<div class="levelup-name">' + esc(lvl.name) + '</div>' +
    '<p class="levelup-sub">' + esc(kid.name) + ' sigue brillando en el multiverso ✨</p>' +
    '<div class="modal-actions"><button type="button" class="btn btn-block" data-action="closeModal">¡Seguir!</button></div>' +
    '</div>'
  );
  sound.levelUp();
  confettiRain(90);
}

function showTicket(reward, kid) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  openModal(
    '<div class="ticket">' +
    '<div class="ticket-kicker">Vale de premio</div>' +
    '<span class="ticket-emoji">' + (reward.icon || '🎁') + '</span>' +
    '<h3>' + esc(reward.title) + '</h3>' +
    '<p>Canjeado por ' + esc(kid.name) + ' · ' + reward.cost + ' puntos</p>' +
    '<div class="ticket-code">MULTIVERSO · ' + code + '</div>' +
    '</div>' +
    '<div class="modal-actions"><button type="button" class="btn btn-block" data-action="closeModal">Muéstraselo a papá o mamá</button></div>'
  );
  confettiRain(70);
  sound.win();
}
