'use strict';

/* ============================================================
   MULTIVERSO DE MISIONES — app principal: eventos, interacciones
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Botón de añadir misión rápida
  document.addEventListener('click', ev => {
    const target = ev.target;
    const action = target.dataset.action;
    const kid = currentKid();
    const kidId = kid.id;

    // --- Añadir misión rápida ---
    if (action === 'addTask') {
      ev.preventDefault();
      if (editMode) {
        // Añadir misión temporal mientras editamos
        const newId = 'new-' + Date.now();
        const realms = ['db', 'ch', 'hp'];
        const newTask = {
          id: newId,
          kid: kidId,
          title: 'Nueva misión ' + (Date.now() % 100),
          icon: TASK_EMOJIS[Math.floor(Math.random() * TASK_EMOJIS.length)],
          realm: realms[Math.floor(Math.random() * realms.length)],
          points: 5,
          days: [0, 1, 2, 3, 4, 5, 6],
          doneDate: null
        };
        state.tasks.push(newTask);
        save();
        renderAll();
        toast('Misión añadida. Edita los detalles si lo deseas.', newTask.icon);
      } else {
        // Modo normal: cambiar al modo edición con nueva misión
        toggleEdit();
      }
      return;
    }

    // --- Cambiar de niño ---
    if (action === 'switchKid') {
      ev.preventDefault();
      const newKid = target.dataset.kid;
      if (newKid === state.activeKid) return;
      state.activeKid = newKid;
      save();
      renderAll();
      sound.complete(kidId === 'enrique' ? 'ch' : 'db');
      return;
    }

    // --- Tarea completada ---
    if (action === 'completeTask') {
      ev.preventDefault();
      ev.stopPropagation && ev.stopPropagation();
      if (spinning) return; // bloquear mientras ruleta gira
      // Buscar el artículo de la misión (el click puede ser en el check, icon, título, etc.)
      const taskArticle = target.closest('.task');
      if (!taskArticle) return;
      const tId = taskArticle.dataset.id;
      const t = state.tasks.find(t => t.id === tId && t.kid === kidId);
      if (!t) return;

      // Efecto visual
      const card = taskArticle;
      if (card) {
        const r = REALMS[t.realm] || REALMS.db;
        burstAt(card.offsetLeft + card.clientWidth / 2, card.offsetTop + card.clientHeight / 2, t.realm);
        floatPoints(card.offsetLeft + card.clientWidth / 2, card.offsetTop + card.clientHeight / 2, '+' + t.points + '⭐', r.color);
      }

      // Marcar como hecha
      const todayKey = dayKey(new Date());
      t.doneDate = todayKey;
      completing.add(tId);

      // Premio de puntos
      const res = award(kidId, t.points, 'complete', t.title);
      syncAllBadges();

      // Efectos después de breve retraso
      setTimeout(() => {
        completing.delete(tId);
        renderAll();
        sound.complete(t.realm);
        haptic(40);

        // Verificar día perfecto
        checkPerfectDay(kidId);
      }, 400);

      return;
    }

    // --- Modo edición toggle ---
    if (action === 'toggleEdit') {
      ev.preventDefault();
      editMode = !editMode;
      state.editMode = editMode; // para compat
      save();
      renderAll();
      return;
    }

    // --- Eliminar tarea ---
    if (action === 'deleteTask') {
      ev.preventDefault();
      if (confirm('¿Seguro que quieres borrar esta misión?')) {
        state.tasks = state.tasks.filter(t => t.id !== target.dataset.id);
        save();
        renderAll();
      }
      return;
    }

    // --- Editar tarea ---
    if (action === 'editTask') {
      ev.preventDefault();
      // Mostrar modal simple para editar título/días/puntos
      const t = state.tasks.find(t => t.id === target.dataset.id && t.kid === kidId);
      if (!t) return;
      openModal(
        '<h2>Editar misión</h2>' +
        '<div class="field"><label>Título de la misión</label><input class="input" id="taskTitle" value="' + esc(t.title) + '" placeholder="Levantarme temprano"></div>' +
        '<div class="seg-option"><input type="radio" name="day" id="day-all' + t.id + '" ' + (t.days.length === 7 ? 'checked' : '') + '><span><b>Todos los días</b></span></div>' +
        (t.days.length < 7
          ? '<div class="seg-option"><input type="radio" name="day" id="day-today' + t.id + '" ' + (t.days.includes(0) ? 'checked' : '') + '><span><b>Solo hoy</b></span></div>'
          : '') +
        '<div class="seg-option"><input type="radio" name="day" id="day-custom' + t.id + '" ' + (t.days.length > 0 && !t.days.includes(0) ? 'checked' : '') + '><span><b>Días personalizados</b></span></div>' +
        '<div class="emoji-row" id="emojiRow"></div>' +
        '<div class="points-row"><div class="pts-chip on" data-pts="5">5 pts</div><div class="pts-chip" data-pts="10">10 pts</div><div class="pts-chip" data-pts="15">15 pts</div><div class="pts-chip" data-pts="20">20 pts</div></div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-block" data-action="saveTask">Guardar</button><button type="button" class="btn btn-ghost" data-action="cancelEdit">Cancelar</button></div>'
      );

      // Cargar emojis
      const emojiRow = document.getElementById('emojiRow');
      if (emojiRow) {
        TASK_EMOJIS.forEach((em, i) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'emoji-btn' + (i === (TASK_EMOJIS.indexOf(t.icon) || 0) ? ' selected' : '') + '" data-emoji="' + em + '" aria-label="Emoji ' + em + '">';
          btn.innerHTML = em;
          btn.addEventListener('click', () => {
            document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          });
          emojiRow.appendChild(btn);
        });
        // Seleccionar actual
        emojiRow.querySelector('.emoji-btn.selected') || emojiRow.firstElementChild.click();
      }

      // Marcar día actual/radio
      document.querySelectorAll('input[name="day"]').forEach(r => {
        r.addEventListener('change', () => {
          document.querySelectorAll('input[name="day"]').forEach(r2 => r2.classList.remove('selected'));
          r.classList.add('selected');
        });
      });
      if (document.querySelector('input[name="day"]')) document.querySelector('input[name="day"]').dispatchEvent(new Event('change'));

      // Guardar edición
      const saveBtn = document.querySelector('[data-action="saveTask"]');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const titleInput = document.getElementById('taskTitle');
          const title = titleInput ? titleInput.value.trim() : '';
          const dayRadios = document.querySelectorAll('input[name="day"]');
          let days = [0, 1, 2, 3, 4, 5, 6]; // todos
          let pts = 5;
          dayRadios.forEach(r => { if (r.checked) { if (r.id.includes('today')) days = [new Date().getDay()]; if (r.id.includes('custom')) days = []; } });
          // Reconstruir days simples
          const selectedDayRad = document.querySelector('input[name="day"]:checked');
          if (selectedDayRad && selectedDayRad.id.includes('today')) {
            days = [new Date().getDay()];
          } else if (selectedDayRad && selectedDayRad.id.includes('custom')) {
            days = []; // mantener actual o pedir
          }
          // Puntos
          const ptsChip = document.querySelector('.pts-chip.on');
          if (ptsChip) pts = Number(ptsChip.dataset.pts) || 5;

          if (title) {
            t.title = title;
            t.icon = document.querySelector('.emoji-btn.selected') ? document.querySelector('.emoji-btn.selected').dataset.emoji : t.icon || '⚡';
            t.days = days;
            t.points = pts;
            save();
            renderAll();
            toast('Misión actualizada', t.icon);
          }
          closeModal();
        });
      }
      const cancelBtn = document.querySelector('[data-action="cancelEdit"]');
      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
      return;
    }

    // --- Ruleta: girar ---
    if (action === 'spin') {
      ev.preventDefault();
      if (spinning) return;
      spinning = true;
      const wheelBtn = document.getElementById('spinBtn');
      if (wheelBtn) wheelBtn.disabled = true;
      sound.win();

      // Mostrar reto
      activeChallenge = wheelPicks[0];
      const challengeEl = document.getElementById('challengeCard');
      if (challengeEl) {
        const r = REALMS[activeChallenge.realm];
        challengeEl.innerHTML =
          '<div class="challenge-realm"><span>' + r.emoji + ' ' + r.name + '</span></div>' +
          '<div class="challenge-emoji">' + activeChallenge.icon + '</div>' +
          '<h2 class="challenge-title">' + esc(activeChallenge.text) + '</h2>' +
          '<div class="challenge-pts">' + activeChallenge.points + ' pts</div>';
      }

      // Girar ruleta
      const rotor = document.querySelector('.wheel-rotor');
      if (rotor) {
        const totalRotations = 5 + Math.floor(Math.random() * 3); // 5 a 7 vueltas completas
        const randomIndex = Math.floor(Math.random() * wheelPicks.length);
        const finalAngle = (randomIndex * 45) + (360 * totalRotations);
        rotor.style.transition = 'transform 5.2s cubic-bezier(0.22, 1, 0.36, 1)';
        rotor.style.transform = 'rotate(' + finalAngle + 'deg)';
      }

      // Después de girar, permitir elegir "conseguido"
      setTimeout(() => {
        spinning = false;
        if (wheelBtn) wheelBtn.disabled = false;
        sound.win();
        // Mostrar opción de "¡Conseguido!"
        showChallengeResult(activeChallenge);
      }, 5300);

      return;
    }

    // --- Desafío completado / canje ---
    if (action === 'challengeComplete') {
      ev.preventDefault();
      if (!activeChallenge) return;
      const kid = currentKid();
      const res = award(kid.id, activeChallenge.points, 'challenge', activeChallenge.text);
      syncAllBadges();

      // Efecto
      const card = document.querySelector('.challenge-card');
      if (card) {
        const r = REALMS[activeChallenge.realm] || REALMS.db;
        burstAt(card.offsetLeft + card.clientWidth / 2, card.offsetTop + card.clientHeight / 2, activeChallenge.realm);
        floatPoints(card.offsetLeft + card.clientWidth / 2, card.offsetTop + card.clientHeight / 2, '+' + activeChallenge.points + '⭐', r.color);
      }

      // Log y UI
      pushLog(kid.id, 'challenge', activeChallenge.text, activeChallenge.points);
      sound.complete(activeChallenge.realm);
      haptic(40);
      toast('¡Reto completado! +' + activeChallenge.points + ' pts', activeChallenge.icon);
      activeChallenge = null;

      // Volver a cargar vista
      setTimeout(renderAll, 600);
      return;
    }

    // --- Canjear premio ---
    if (action === 'redeem') {
      ev.preventDefault();
      if (confirm('¿Canjear este premio por ' + target.dataset.id + '?')) {
        // Los puntos se descuentan automáticamente al award, pero aquí podemos confirmar
        // En este diseño los puntos NO se quitan al canjear (se quedan como "disponibles")
        // Pero podríamos restarlos si fuera necesario.
        toast('¡Premio canjeado!', '🎁');
        // Podríamos abrir un ticket aquí
        const r = state.rewards.find(r => r.id === target.dataset.id);
        if (r) showTicket(r, kid);
      }
      return;
    }

    // --- Añadir premio ---
    if (action === 'addReward') {
      ev.preventDefault();
      openModal(
        '<h2>Nuevo premio</h2>' +
        '<div class="field"><label>Título</label><input class="input" id="rewardTitle" placeholder="Premio"></div>' +
        '<div class="field"><label>Icono (emoji)</label><div class="emoji-row" id="rewardEmojiRow"></div></div>' +
        '<div class="field"><label>Costo en puntos</label><input class="input input-sm" id="rewardCost" type="number" min="1" value="50" placeholder="50"></div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-block" data-action="saveReward">Añadir</button><button type="button" class="btn btn-ghost" data-action="cancelEdit">Cancelar</button></div>'
      );

      // Emojis
      const er = document.getElementById('rewardEmojiRow');
      if (er) {
        REWARD_EMOJIS.forEach((em, i) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'emoji-btn' + (i === 0 ? ' selected' : '') + '" data-emoji="' + em + '" aria-label="Emoji ' + em + '">';
          btn.innerHTML = em;
          btn.addEventListener('click', () => {
            document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          });
          er.appendChild(btn);
        });
      }

      const saveR = document.querySelector('[data-action="saveReward"]');
      if (saveR) {
        saveR.addEventListener('click', () => {
          const title = document.getElementById('rewardTitle')?.value.trim() || 'Premio nuevo';
          const cost = Math.max(1, Number(document.getElementById('rewardCost')?.value) || 50);
          const emoji = document.querySelector('.emoji-btn.selected') ? document.querySelector('.emoji-btn.selected').dataset.emoji : '🎁';
          const id = 'rw-' + Date.now();
          state.rewards.push({ id, title, icon: emoji, cost });
          save();
          renderAll();
          toast('Premio añadido: ' + title, emoji);
          closeModal();
        });
      }
      const cancelR = document.querySelector('[data-action="cancelEdit"]');
      if (cancelR) cancelR.addEventListener('click', closeModal);
      return;
    }

    // --- Eliminar premio ---
    if (action === 'deleteReward') {
      ev.preventDefault();
      if (confirm('¿Borrar este premio permanentemente?')) {
        state.rewards = state.rewards.filter(r => r.id !== target.dataset.id);
        save();
        renderAll();
      }
      return;
    }

    // --- Editar premio ---
    if (action === 'editReward') {
      ev.preventDefault();
      const r = state.rewards.find(r => r.id === target.dataset.id && r.kid === kidId);
      if (!r) return;
      openModal(
        '<h2>Editar premio</h2>' +
        '<div class="field"><label>Título</label><input class="input" id="rewardTitle2" value="' + esc(r.title) + '"></div>' +
        '<div class="field"><label>Costo</label><input class="input input-sm" id="rewardCost2" type="number" min="1" value="' + r.cost + '"></div>' +
        '<div class="emoji-row" id="rewardEmojiRow2"></div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-block" data-action="saveReward2">Guardar</button><button type="button" class="btn btn-ghost" data-action="cancelEdit">Cancelar</button></div>'
      );

      const er2 = document.getElementById('rewardEmojiRow2');
      if (er2) {
        REWARD_EMOJIS.forEach((em, i) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'emoji-btn' + (i === 0 ? ' selected' : '') + '" data-emoji="' + em + '" aria-label="Emoji ' + em + '">';
          btn.innerHTML = em;
          btn.addEventListener('click', () => {
            document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          });
          er2.appendChild(btn);
        });
        // Seleccionar actual
        const currentIdx = REWARD_EMOJIS.indexOf(r.icon);
        if (currentIdx >= 0) {
          er2.querySelectorAll('.emoji-btn').forEach(b => b.classList.toggle('selected', REWARD_EMOJIS.indexOf(b.dataset.emoji) === currentIdx));
        } else {
          er2.firstElementChild.classList.add('selected');
        }
      }

      const saveR2 = document.querySelector('[data-action="saveReward2"]');
      if (saveR2) {
        saveR2.addEventListener('click', () => {
          const title = document.getElementById('rewardTitle2')?.value.trim() || r.title;
          const cost = Math.max(1, Number(document.getElementById('rewardCost2')?.value) || r.cost);
          const emoji = document.querySelector('.emoji-btn.selected') ? document.querySelector('.emoji-btn.selected').dataset.emoji : r.icon;
          r.title = title;
          r.cost = cost;
          r.icon = emoji;
          save();
          renderAll();
          toast('Premio actualizado', emoji);
          closeModal();
        });
      }
      const cancelR2 = document.querySelector('[data-action="cancelEdit"]');
      if (cancelR2) cancelR2.addEventListener('click', closeModal);
      return;
    }

    // --- Configuración / ajustes ---
    if (action === 'openSettings') {
      ev.preventDefault();
      openModal(
        '<h2>Ajustes de la app</h2>' +
        '<div class="switch-row"><span class="sw-label">Sonidos</span>' +
        '<label class="switch"><input type="checkbox" ' + (state.settings.sound ? 'checked' : '') + ' data-action="toggleSound"> <span class="slider round"></span></label>' +
        '</div>' +
        '<div class="switch-row"><span class="sw-label">Vibración</span>' +
        '<label class="switch"><input type="checkbox" ' + (state.settings.haptics ? 'checked' : '') + ' data-action="toggleHaptics"> <span class="slider round"></span></label>' +
        '</div>' +
        '<div class="field"><label>PIN de padre (4 dígitos)</label>' +
        '<input class="input" id="settingsPin" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off">' +
        '<small class="sw-sub">Deja vacío para quitar bloqueo.</small></div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-block" data-action="saveSettings">Guardar</button><button type="button" class="btn btn-ghost" data-action="closeModal">Cancelar</button></div>'
      );

      const pinIn = document.getElementById('settingsPin');
      if (pinIn) {
        pinIn.addEventListener('keydown', e => { if (e.key === 'Enter') saveSettings.click(); });
        setTimeout(() => pinIn.focus({ preventScroll: true }), 220);
      }

      // Toggle sonidos
      document.querySelector('[data-action="toggleSound"]').addEventListener('change', e => {
        state.settings.sound = e.target.checked;
        save();
        toast(e.target.checked ? 'Sonidos activados' : 'Sonidos desactivados', '🔊');
      });

      // Toggle vibración
      document.querySelector('[data-action="toggleHaptics"]').addEventListener('change', e => {
        state.settings.haptics = e.target.checked;
        save();
        toast(e.target.checked ? 'Vibración activada' : 'Vibración desactivada', '📳');
      });

      // Guardar ajustes
      const saveS = document.querySelector('[data-action="saveSettings"]');
      if (saveS) {
        saveS.addEventListener('click', () => {
          if (pinIn && pinIn.value.trim() && pinIn.value.trim() !== state.settings.pin) {
            toast('PIN incorrecto', '🔒');
            return;
          }
          closeModal();
        });
      }
      return;
    }

    // --- Logro toast click (abrir detalle) ---
    if (action === 'viewProgress') {
      renderView();
      // Ya se renderiza en el click general
    }
  });

  // --- Teclado: Enter en inputs de modales ---
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') closeModal();
    // En inputs numéricos PIN
    if (ev.target && ev.target.matches('input[type="password"][inputmode="numeric"]')) {
      if (ev.key >= '0' && ev.key <= '9') return;
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const form = ev.target.form;
        if (form && form.querySelector('[type="submit"]')) form.querySelector('[type="submit"]').click();
      }
    }
  });

  // Inicializar
  renderAll();
  sound.complete('db');
});

function dayKey(d) {
  const x = d || new Date();
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

// Helper: mapear dayKey desde getDay()
function dayKeyFromGetDay(day) {
  // day es 0=dom, 1=lun, ..., 6=sab. Devolvemos clave de hoy.
  const d = new Date();
  d.setDate(d.getDate() - (d.getDay() - day + 7) % 7 + 1);
  d.setHours(12, 0, 0, 0);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}