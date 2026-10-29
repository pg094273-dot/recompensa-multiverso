'use strict';

/* ============================================================
   MULTIVERSO DE MISIONES — render de la interfaz
   ============================================================ */

function avatarSVG(key) {
  return AVATARS[key] || AVATARS.saiyan;
}

const dateFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

function todayLabel() {
  const s = dateFmt.format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderAll() {
  const kid = currentKid();
  const meta = KID_META[kid.id] || KID_META.enrique;
  const root = document.documentElement;
  root.style.setProperty('--accent', meta.accent[0]);
  root.style.setProperty('--accent-2', meta.accent[1]);
  root.style.setProperty('--accent-soft', meta.accent[0] + '2e');

  const sub = document.getElementById('brandSub');
  if (sub) sub.textContent = Object.values(state.kids).map(k => k.name).join(' & ');

  renderKidSwitch();
  renderHero();
  renderBottomNav();
  renderView();

  if (justDone) {
    setTimeout(() => { justDone = null; }, 900);
  }
}

function renderKidSwitch() {
  const el = document.getElementById('kidSwitch');
  if (!el) return;
  el.innerHTML = Object.values(state.kids).map(k =>
    '<button class="kid-chip ' + (k.id === state.activeKid ? 'active' : '') + '" data-action="switchKid" data-kid="' + k.id + '" aria-pressed="' + (k.id === state.activeKid) + '">' +
    '<span class="chip-avatar">' + avatarSVG(k.avatar) + '</span>' +
    '<span>' + esc(k.name) + '</span>' +
    '</button>'
  ).join('');
}

function renderHero() {
  const el = document.getElementById('hero');
  if (!el) return;
  const kid = currentKid();
  const info = levelInfo(kid.xp);
  const list = tasksToday(kid.id);
  const done = list.filter(t => t.doneDate === today()).length;

  el.innerHTML =
    '<div class="avatar-wrap">' +
    '<div class="avatar-ring"></div>' +
    '<div class="avatar">' + avatarSVG(kid.avatar) + '</div>' +
    '<span class="level-badge">Nv ' + info.level + '</span>' +
    '</div>' +
    '<div class="hero-info">' +
    '<div class="hero-name-row">' +
    '<span class="hero-name">' + esc(kid.name) + '</span>' +
    '<span class="level-name">' + esc(info.name) + '</span>' +
    '</div>' +
    '<div class="xp">' +
    '<div class="xp-bar"><i style="width:' + info.pct + '%"></i></div>' +
    '<span class="xp-text">' + (info.next ? kid.xp + ' / ' + info.next + ' XP' : kid.xp + ' XP · máximo') + '</span>' +
    '</div>' +
    '<div class="mini-stats">' +
    '<div class="mini-stat"><span class="ms-ico">🪙</span><div class="ms-col"><b>' + kid.coins + '</b><small>puntos</small></div></div>' +
    '<div class="mini-stat"><span class="ms-ico">🔥</span><div class="ms-col"><b>' + kid.streak + '</b><small>racha</small></div></div>' +
    '<div class="mini-stat"><span class="ms-ico">✅</span><div class="ms-col"><b>' + done + '/' + list.length + '</b><small>hoy</small></div></div>' +
    '</div>' +
    '</div>';
}

function renderBottomNav() {
  const el = document.getElementById('bottomNav');
  if (!el) return;
  el.innerHTML = TABS.map(t =>
    '<button class="nav-btn ' + (state.tab === t.id ? 'active' : '') + '" data-action="tab" data-tab="' + t.id + '" aria-current="' + (state.tab === t.id ? 'page' : 'false') + '">' +
    '<span class="nav-ico">' + t.icon + '</span><span>' + t.label + '</span>' +
    '</button>'
  ).join('');
}

function renderView() {
  const el = document.getElementById('view');
  if (!el) return;
  let html = '';
  if (state.tab === 'wheel') html = viewWheel();
  else if (state.tab === 'rewards') html = viewRewards();
  else if (state.tab === 'progress') html = viewProgress();
  else html = viewMissions();
  el.innerHTML = html;
}

/* ---------------- Misiones ---------------- */

function taskCard(t, editing) {
  const r = REALMS[t.realm] || REALMS.db;
  const done = t.doneDate === today();
  const scheduled = t.days.includes(new Date().getDay());
  const cls = [
    'task',
    done ? 'done' : '',
    editing ? 'editing' : '',
    justDone === t.id ? 'just-done' : ''
  ].filter(Boolean).join(' ');

  const days = WEEK_ORDER.map(d =>
    '<span class="day-dot ' + (t.days.includes(d) ? 'on' : '') + '">' + WEEK_LABELS[d] + '</span>'
  ).join('');

  return '<article class="' + cls + '" style="--realm:' + r.color + ';--realm-soft:' + r.color + '22" ' +
    (editing ? '' : 'data-action="completeTask" data-id="' + t.id + '" role="button" tabindex="0" aria-label="Completar: ' + esc(t.title) + '"') + '>' +
    '<div class="task-icon">' + (t.icon || r.emoji) + '</div>' +
    '<div class="task-info">' +
    '<h3 class="task-title">' + esc(t.title) + '</h3>' +
    '<div class="task-meta">' +
    '<span class="pts">⭐ ' + t.points + '</span>' +
    '<span class="realm-tag">' + r.emoji + ' ' + r.name + '</span>' +
    (editing && !scheduled ? '<span class="day-tag">Hoy no toca</span>' : '') +
    '</div>' +
    (editing ? '<div class="day-dots">' + days + '</div>' : '') +
    '</div>' +
    (editing
      ? '<div class="task-tools">' +
        '<button type="button" class="mini-btn" data-action="editTask" data-id="' + t.id + '" aria-label="Editar misión">✏️</button>' +
        '<button type="button" class="mini-btn danger" data-action="deleteTask" data-id="' + t.id + '" aria-label="Borrar misión">🗑️</button>' +
        '</div>'
      : '<div class="check" aria-hidden="true">✓</div>') +
    '</article>';
}

function viewMissions() {
  const kid = currentKid();
  const listToday = tasksToday(kid.id);
  const doneCount = listToday.filter(t => t.doneDate === today()).length;
  const pct = listToday.length ? Math.round((doneCount / listToday.length) * 100) : 0;

  let list;
  if (editMode) {
    list = state.tasks
      .filter(t => t.kid === kid.id)
      .sort((a, b) => Number(b.days.includes(new Date().getDay())) - Number(a.days.includes(new Date().getDay())));
  } else {
    list = listToday.slice().sort((a, b) => Number(a.doneDate === today()) - Number(b.doneDate === today()));
  }

  let grid;
  if (!list.length) {
    grid = '<div class="empty">' +
      '<span class="empty-emoji">' + (editMode ? '🗂️' : '🌤️') + '</span>' +
      '<h3>' + (editMode ? 'Todavía no hay misiones' : 'Hoy no hay misiones programadas') + '</h3>' +
      '<p>' + (editMode ? 'Crea la primera misión con el botón de abajo.' : 'Disfruta del día libre... o añade una misión nueva.') + '</p>' +
      '</div>';
  } else {
    grid = '<div class="task-grid">' + list.map(t => taskCard(t, editMode)).join('') + '</div>';
  }

  return '<div class="section-head">' +
    '<div>' +
    '<h2>' + (editMode ? 'Editar misiones' : 'Misiones de hoy') + '</h2>' +
    '<p>' + (editMode
      ? list.length + ' misiones configuradas'
      : doneCount + ' de ' + listToday.length + ' completadas · ' + todayLabel()) + '</p>' +
    '</div>' +
    '<div class="head-actions">' +
    '<button type="button" class="pill-btn ' + (editMode ? 'on' : '') + '" data-action="toggleEdit">' +
    (editMode ? '✓ Listo' : '✏️ Editar') + '</button>' +
    '</div>' +
    '</div>' +
    (editMode ? '' : '<div class="progress-line"><i style="width:' + pct + '%"></i></div>') +
    grid +
    '<button type="button" class="add-task" data-action="addTask">➕ ' + (editMode ? 'Añadir misión' : 'Nueva misión') + '</button>' +
    (editMode ? '<div class="edit-hint">Toca ✏️ para cambiar una misión o 🗑️ para borrarla. Los puntos y los días se pueden ajustar en cada misión. Cuando termines, pulsa <b>✓ Listo</b>.</div>' : '');
}

/* ---------------- Ruleta ---------------- */

function wheelMarkup(list) {
  const stops = list.map((c, i) => {
    const r = REALMS[c.realm];
    const col = i % 2 === 0 ? r.colors[0] : r.colors[1];
    return col + ' ' + (i * 45) + 'deg ' + ((i + 1) * 45) + 'deg';
  }).join(', ');

  const labels = list.map((c, i) =>
    '<div class="wheel-label" style="transform: rotate(' + (i * 45) + 'deg) translateY(-112px)"><span>' + c.icon + '</span></div>'
  ).join('');

  return '<div class="wheel-rotor">' +
    '<div class="wheel" style="background: conic-gradient(from -22.5deg, ' + stops + ')"></div>' +
    '<div class="wheel-labels">' + labels + '</div>' +
    '</div>' +
    '<div class="wheel-rim"></div>' +
    '<div class="wheel-hub">🎡</div>' +
    '<div class="wheel-pointer"></div>';
}

function viewWheel() {
  const kid = currentKid();
  if (!wheelPicks || wheelPicks.length !== 8) wheelPicks = sampleChallenges(8);
  const wheel = wheelMarkup(wheelPicks);

  return '<div class="section-head">' +
    '<div><h2>Ruleta de retos</h2><p>Gira, acepta el reto y suma puntos extra</p></div>' +
    '</div>' +
    '<div class="wheel-page">' +
    '<div class="wheel-stage" id="wheelStage">' + wheel + '</div>' +
    '<button type="button" class="spin-btn" id="spinBtn" data-action="spin" ' + (spinning ? 'disabled' : '') + '>' +
    (spinning ? '🎲 Girando...' : '🎡 ¡GIRAR LA RULETA!') + '</button>' +
    '<div class="challenge-stats">' +
    '<span class="stat-pill">🎯 Retos superados: <b>' + kid.stats.challenges + '</b></span>' +
    '<span class="stat-pill">🔥 Racha: <b>' + kid.streak + '</b> días</span>' +
    '</div>' +
    '<div class="wheel-note"><b>Para ' + esc(kid.name) + '.</b> Gira la ruleta y completa el reto que salga. Si lo consigues, pulsa <b>¡Conseguido!</b> y gana los puntos. Puedes girar todas las veces que quieras.</div>' +
    '</div>';
}

/* ---------------- Premios ---------------- */

function rewardCard(r, kid) {
  const afford = kid.coins >= r.cost;
  return '<article class="reward">' +
    (editMode
      ? '<div class="reward-edit">' +
        '<button type="button" class="mini-btn" data-action="editReward" data-id="' + r.id + '" aria-label="Editar premio">✏️</button>' +
        '<button type="button" class="mini-btn danger" data-action="deleteReward" data-id="' + r.id + '" aria-label="Borrar premio">🗑️</button>' +
        '</div>'
      : '') +
    '<span class="reward-emoji">' + (r.icon || '🎁') + '</span>' +
    '<h3>' + esc(r.title) + '</h3>' +
    '<div class="cost">🪙 ' + r.cost + ' <small>puntos</small></div>' +
    '<div class="btn-row">' +
    '<button type="button" class="btn btn-sm btn-block ' + (afford ? '' : 'btn-ghost') + '" data-action="redeem" data-id="' + r.id + '">' +
    (afford ? 'Canjear' : 'Faltan ' + (r.cost - kid.coins) + ' pts') +
    '</button>' +
    '</div>' +
    '</article>';
}

function viewRewards() {
  const kid = currentKid();
  const list = state.rewards;
  return '<div class="section-head">' +
    '<div><h2>Premios</h2><p>Te quedan <b>' + kid.coins + '</b> puntos para canjear</p></div>' +
    '<div class="head-actions">' +
    '<button type="button" class="pill-btn ' + (editMode ? 'on' : '') + '" data-action="toggleEdit">' +
    (editMode ? '✓ Listo' : '✏️ Editar') + '</button>' +
    '</div>' +
    '</div>' +
    (editMode
      ? '<div class="edit-hint" style="margin-bottom:12px">Configura los premios que se pueden canjear con puntos. Los puntos gastados no bajan el nivel.</div>'
      : '') +
    (list.length
      ? '<div class="reward-grid">' + list.map(r => rewardCard(r, kid)).join('') + '</div>'
      : '<div class="empty"><span class="empty-emoji">🎁</span><h3>Sin premios todavía</h3><p>Añade el primero con el botón de abajo.</p></div>') +
    '<button type="button" class="add-task" data-action="addReward">➕ ' + (editMode ? 'Añadir premio' : 'Nuevo premio') + '</button>';
}

/* ---------------- Progreso ---------------- */

function fmtLogDate(ts) {
  const d = new Date(ts);
  const k = dayKey(d);
  if (k === today()) return 'Hoy';
  if (k === yesterdayKey()) return 'Ayer';
  return d.getDate() + '/' + (d.getMonth() + 1);
}

const KIND_ICON = { complete: '✅', challenge: '🎡', bonus: '🏆', reward: '🎁' };

function viewProgress() {
  const kid = currentKid();
  const days = last7();
  const values = days.map(d => state.log
    .filter(l => l.kidId === kid.id && l.day === d.key && l.points > 0)
    .reduce((sum, l) => sum + l.points, 0));
  const max = Math.max(1, ...values);

  const bars = days.map((d, i) => {
    const v = values[i];
    const h = v ? 8 + Math.round((v / max) * 68) : 4;
    return '<div class="chart-col">' +
      '<span class="chart-value">' + (v || '') + '</span>' +
      '<div class="chart-bar ' + (v ? '' : 'empty ') + (d.key === today() ? 'today' : '') + '" style="height:' + h + 'px"></div>' +
      '<span class="chart-day">' + d.date.toLocaleDateString('es-ES', { weekday: 'narrow' }) + '</span>' +
      '</div>';
  }).join('');

  const unlockedCount = kid.badges.length;
  const badges = BADGES.map(b => {
    const on = kid.badges.includes(b.id);
    return '<div class="badge ' + (on ? 'unlocked' : 'locked') + '">' +
      '<div class="badge-ico">' + (on ? b.icon : '🔒') + '</div>' +
      '<b>' + b.name + '</b>' +
      '<small>' + b.desc + '</small>' +
      '</div>';
  }).join('');

  const logs = state.log.filter(l => l.kidId === kid.id).slice(0, 10);
  const logRows = logs.length
    ? logs.map(l =>
      '<div class="log-row">' +
      '<span class="log-ico">' + (KIND_ICON[l.kind] || '⭐') + '</span>' +
      '<span class="log-title">' + esc(l.title) + '</span>' +
      '<span class="log-date">' + fmtLogDate(l.ts) + '</span>' +
      '<span class="log-pts ' + (l.points < 0 ? 'neg' : '') + '">' + (l.points > 0 ? '+' : '') + l.points + '</span>' +
      '</div>'
    ).join('')
    : '<div class="empty" style="padding:22px"><span class="empty-emoji">📓</span><p>Aún no hay actividad. ¡Completa una misión!</p></div>';

  return '<div class="section-head">' +
    '<div><h2>Logros de ' + esc(kid.name) + '</h2><p>Tu progreso en el multiverso</p></div>' +
    '</div>' +
    '<div class="stats-grid">' +
    '<div class="stat-card"><span class="sc-ico">✅</span><b>' + kid.stats.total + '</b><small>misiones</small></div>' +
    '<div class="stat-card"><span class="sc-ico">🎡</span><b>' + kid.stats.challenges + '</b><small>retos</small></div>' +
    '<div class="stat-card"><span class="sc-ico">🏆</span><b>' + kid.stats.perfectDays + '</b><small>días top</small></div>' +
    '<div class="stat-card"><span class="sc-ico">🔥</span><b>' + kid.bestStreak + '</b><small>mejor racha</small></div>' +
    '</div>' +
    '<div class="panel">' +
    '<div class="panel-title"><h3>Últimos 7 días</h3><span>puntos ganados</span></div>' +
    '<div class="chart">' + bars + '</div>' +
    '</div>' +
    '<div class="panel">' +
    '<div class="panel-title"><h3>Insignias</h3><span>' + unlockedCount + ' de ' + BADGES.length + '</span></div>' +
    '<div class="badge-grid">' + badges + '</div>' +
    '</div>' +
    '<div class="panel">' +
    '<div class="panel-title"><h3>Actividad reciente</h3><span>últimos movimientos</span></div>' +
    '<div class="log-list">' + logRows + '</div>' +
    '</div>';
}
