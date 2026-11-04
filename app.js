/* Acyz Lab: interfaz de la app. */
(() => {
  'use strict';

  // ---------- Utilidades ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = () => ymd(new Date());
  function weekKeyOf(date = new Date()) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lunes
    return ymd(d);
  }
  const todayIdx = () => (new Date().getDay() + 6) % 7; // 0 = lunes
  const DAY = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const fmtDate = iso => new Date(iso).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
  const mmss = s => `${Math.floor(s / 60)}:${pad(Math.max(0, Math.floor(s % 60)))}`;
  const app = $('#app');
  const tabbar = $('#tabbar');

  const ICON = {
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
    auto: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M5 4v16l10-8zM17 4h2v16h-2z" fill="currentColor"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M19 4v16L9 12zM5 4h2v16H5z" fill="currentColor"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  };

  // ---------- Espíritu shonen: frases y rangos (textos originales) ----------
  const QUOTES = [
    'Tu único rival es quien eras ayer.',
    'Cuando el cuerpo dice «basta», el espíritu dice «una más».',
    'Los límites existen para romperlos.',
    'Cada repetición es un paso más hacia tu mejor versión.',
    'No naciste fuerte: te haces fuerte, entreno a entreno.',
    'El héroe no es quien nunca cae, sino quien siempre se levanta.',
    'Hoy duele. Mañana es tu poder.',
    'La constancia vence al talento cuando el talento no entrena.',
    'Tu historia de entrenamiento se escribe hoy.',
    'No esperes a tener ganas: entrena y las ganas llegan.',
    'Supera tu límite… y luego supera el siguiente.',
    'Respira, concéntrate y da todo en esta serie.',
    'Las leyendas también empezaron con una sola flexión.',
    'El esfuerzo de hoy es el despertar de mañana.',
  ];
  const quote = (seed = Date.now()) => QUOTES[Math.abs(Math.floor(seed)) % QUOTES.length];
  const RANKS = [
    [0, 'E', 'El viaje comienza'], [3, 'D', 'Despertar'], [8, 'C', 'Entrenamiento duro'], [16, 'B', 'Sin rendirse'],
    [30, 'A', 'Más allá del límite'], [50, 'S', 'Élite'], [80, 'SS', 'Leyenda'], [120, 'SSS', 'Imparable'],
  ];
  function rankOf(n) {
    let i = 0;
    while (i < RANKS.length - 1 && n >= RANKS[i + 1][0]) i++;
    const [from, letter, title] = RANKS[i];
    const next = RANKS[i + 1];
    return { letter, title, next: next ? next[1] : null, left: next ? next[0] - n : 0, pct: next ? Math.round((n - from) / (next[0] - from) * 100) : 100 };
  }
  const equipSummary = p => {
    const eq = [];
    if (p.equipment.mancuernas.length) eq.push(`Mancuernas (${p.equipment.mancuernas.slice().sort((a, b) => a - b).join(', ')} kg)`);
    if (p.equipment.pesarusa.length) eq.push(`Pesa rusa (${p.equipment.pesarusa.slice().sort((a, b) => a - b).join(', ')} kg)`);
    ['barra', 'banda', 'cuerda'].forEach(k => p.equipment[k] && eq.push(EQUIPMENT_NAMES[k]));
    return eq.length ? eq.join(', ') : 'Solo peso corporal';
  };

  // ---------- Tema ----------
  function applyTheme() {
    const t = Store.settings.theme;
    if (t === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    $('meta[name="theme-color"]').setAttribute('content', dark ? '#0f1115' : '#f6f4f4');
    const btn = $('#theme-btn');
    if (btn) { btn.innerHTML = ICON[t === 'light' ? 'sun' : t === 'dark' ? 'moon' : 'auto']; btn.title = 'Tema: ' + { auto: 'automático', light: 'claro', dark: 'oscuro' }[t]; }
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  // ---------- Plan de la semana ----------
  const profileStamp = p => JSON.stringify([p.goal, p.level, p.days, p.minutes, p.equipment, p.space, p.limits]);

  function ensurePlan(forceSalt) {
    const p = Store.profile;
    const wk = weekKeyOf();
    let plan = Store.getPlan(wk);
    if (!plan || plan.stamp !== profileStamp(p) || forceSalt !== undefined) {
      const prev = Store.previousPlan(wk);
      const prevIds = prev ? prev.sessions.flatMap(s => s.exercises) : [];
      const salt = forceSalt ?? (plan ? plan.salt : 0);
      plan = Generator.generateWeek(p, wk, prevIds, salt);
      plan.stamp = profileStamp(p);
      Store.savePlan(plan);
    }
    return plan;
  }
  const doneThisWeek = wk => new Set(Store.history.filter(h => h.weekKey === wk).map(h => h.sessionIndex));
  function nextSession(plan) {
    const done = doneThisWeek(plan.weekKey);
    return plan.sessions.find(s => !done.has(s.index)) || null;
  }

  function streakWeeks() {
    const p = Store.profile;
    const byWeek = {};
    Store.history.forEach(h => { byWeek[h.weekKey] = (byWeek[h.weekKey] || 0) + 1; });
    const d = new Date();
    let wk = weekKeyOf(d), streak = 0;
    if ((byWeek[wk] || 0) >= p.days) streak++;
    for (let i = 0; i < 520; i++) {
      d.setDate(d.getDate() - 7);
      wk = weekKeyOf(d);
      if ((byWeek[wk] || 0) >= p.days) streak++; else break;
    }
    return streak;
  }

  // ---------- Navegación ----------
  let tab = 'hoy';
  function go(t) {
    tab = t;
    tabbar.hidden = false;
    $$('.tab', tabbar).forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    ({ hoy: viewHoy, plan: viewPlan, progreso: viewProgreso, perfil: viewPerfil })[t]();
    window.scrollTo(0, 0);
  }
  tabbar.addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) go(b.dataset.tab); });

  // ---------- Cuestionario ----------
  const GOAL_INFO = {
    grasa: ['Perder grasa', 'Circuitos intensos que queman calorías'],
    musculo: ['Ganar músculo', 'Series y repeticiones para crecer'],
    fuerza: ['Ganar fuerza', 'Pocas repeticiones, ejercicios exigentes'],
    resistencia: ['Resistencia', 'Aguantar más tiempo sin cansarte'],
    forma: ['Mantenerme en forma', 'Un poco de todo, sin pasarse'],
  };
  const LEVEL_INFO = {
    1: ['Principiante', 'Entreno poco o nada'],
    2: ['Intermedio', 'Entreno a veces y hago flexiones sin problema'],
    3: ['Avanzado', 'Entreno con regularidad desde hace tiempo'],
  };
  const SPACE_INFO = {
    1: ['Poco espacio', 'Solo el sitio de una esterilla'],
    2: ['Algo de espacio', 'Puedo dar un par de pasos o saltar la cuerda'],
    3: ['Mucho espacio', 'Puedo correr varios metros: patio, garaje, parque'],
  };
  const LIMIT_INFO = { rodillas: 'Rodillas', espalda: 'Espalda', hombros: 'Hombros' };

  let draft = null, wStep = 0, wEditing = false;
  const defaultDraft = () => ({
    goal: null, age: '', sex: null, weight: '', height: '', level: null, days: 3, minutes: 30,
    equipment: { mancuernas: [], pesarusa: [], barra: false, banda: false, cuerda: false },
    space: null, limits: [], maxPushups: '', maxSquats: '', bodyFat: '', intensity: 1,
  });

  const choice = (name, val, title, sub, checked) => `
    <label class="choice"><input type="radio" name="${name}" value="${val}" ${checked ? 'checked' : ''}>
      <span><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></label>`;
  const chip = (name, val, label, checked, type = 'radio') => `
    <label class="chip"><input type="${type}" name="${name}" value="${val}" ${checked ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  const kgChips = key => draft.equipment[key].slice().sort((a, b) => a - b)
    .map(k => `<button type="button" class="kg" data-action="kg-del" data-key="${key}" data-kg="${k}">${k} kg <span aria-hidden="true">×</span></button>`).join('');

  const WIZ = [
    { title: '¿Cuál es tu objetivo?', sub: 'Todo protagonista tiene una meta. ¿Cuál es la tuya?',
      body: () => `<div class="choices">${Object.entries(GOAL_INFO).map(([k, [t, s]]) => choice('goal', k, t, s, draft.goal === k)).join('')}</div>`,
      read: f => { draft.goal = f.get('goal'); return draft.goal ? '' : 'Elige un objetivo.'; } },
    { title: 'Tu punto de partida', sub: 'Para calcular tu metabolismo y tus calorías.',
      body: () => `
        <div class="grid2">
          <label class="field"><span>Edad</span><input name="age" type="number" inputmode="numeric" min="12" max="99" value="${esc(draft.age)}" placeholder="años"></label>
          <div class="field"><span>Sexo <small>(para la fórmula)</small></span><div class="chips">${chip('sex', 'h', 'Hombre', draft.sex === 'h')}${chip('sex', 'm', 'Mujer', draft.sex === 'm')}</div></div>
          <label class="field"><span>Peso</span><div class="unit"><input name="weight" type="number" inputmode="decimal" step="0.1" min="30" max="300" value="${esc(draft.weight)}"><em>kg</em></div></label>
          <label class="field"><span>Estatura</span><div class="unit"><input name="height" type="number" inputmode="numeric" min="120" max="230" value="${esc(draft.height)}"><em>cm</em></div></label>
        </div>`,
      read: f => {
        draft.age = +f.get('age'); draft.sex = f.get('sex'); draft.weight = +f.get('weight'); draft.height = +f.get('height');
        if (!(draft.age >= 12 && draft.age <= 99)) return 'Escribe una edad entre 12 y 99.';
        if (!draft.sex) return 'Elige el sexo para la fórmula.';
        if (!(draft.weight >= 30 && draft.weight <= 300)) return 'Escribe tu peso en kg.';
        if (!(draft.height >= 120 && draft.height <= 230)) return 'Escribe tu estatura en cm.';
        return '';
      } },
    { title: '¿Con qué nivel de poder empiezas?', sub: 'Y cuánto tiempo le darás al entrenamiento. Podrás cambiarlo cuando quieras.',
      body: () => `
        <div class="choices">${Object.entries(LEVEL_INFO).map(([k, [t, s]]) => choice('level', k, t, s, +draft.level === +k)).join('')}</div>
        <div class="field"><span>Días por semana</span><div class="chips">${[2, 3, 4, 5, 6].map(d => chip('days', d, d, +draft.days === d)).join('')}</div></div>
        <div class="field"><span>Minutos por sesión</span><div class="chips">${[15, 20, 30, 45, 60].map(m => chip('minutes', m, m + ' min', +draft.minutes === m)).join('')}</div></div>`,
      read: f => {
        draft.level = +f.get('level'); draft.days = +f.get('days'); draft.minutes = +f.get('minutes');
        return draft.level ? '' : 'Elige tu nivel.';
      } },
    { title: 'Tu arsenal en casa', sub: 'Marca solo lo que tengas: nunca te pondremos ejercicios con equipo que no marcaste. Sin nada también se puede entrenar.',
      body: () => `
        <div class="equip">
          ${['mancuernas', 'pesarusa'].map(k => `
            <div class="equip-item ${draft.equipment[k].length ? 'on' : ''}" data-equip="${k}">
              <b>${k === 'mancuernas' ? 'Mancuernas' : 'Pesas rusas (kettlebell)'}</b>
              <small>Añade cada peso que tengas, en kg${k === 'mancuernas' ? ' (por mancuerna)' : ''}.</small>
              <div class="kg-row"><input type="number" inputmode="decimal" step="0.5" min="0.5" max="100" placeholder="kg" data-kg-input="${k}" aria-label="Añadir peso de ${k === 'mancuernas' ? 'mancuerna' : 'pesa rusa'} en kg">
                <button type="button" class="btn small" data-action="kg-add" data-key="${k}">Añadir</button></div>
              <div class="kg-list">${kgChips(k)}</div>
            </div>`).join('')}
          ${[['barra', 'Barra de dominadas'], ['banda', 'Banda elástica'], ['cuerda', 'Cuerda de saltar']].map(([k, t]) =>
            `<label class="choice check"><input type="checkbox" name="${k}" ${draft.equipment[k] ? 'checked' : ''}><span><b>${t}</b></span></label>`).join('')}
        </div>`,
      read: f => {
        ['mancuernas', 'pesarusa'].forEach(k => {
          const v = parseFloat(($(`[data-kg-input="${k}"]`)?.value || '').replace(',', '.'));
          if (v > 0 && v <= 100 && !draft.equipment[k].includes(v)) draft.equipment[k].push(v);
        });
        ['barra', 'banda', 'cuerda'].forEach(k => { draft.equipment[k] = f.get(k) === 'on'; });
        return '';
      } },
    { title: 'Tu campo de entrenamiento', sub: '¿Cuánto espacio tienes? Así no te tocan piques ni zancadas si no caben.',
      body: () => `<div class="choices">${Object.entries(SPACE_INFO).map(([k, [t, s]]) => choice('space', k, t, s, +draft.space === +k)).join('')}</div>`,
      read: f => { draft.space = +f.get('space'); return draft.space ? '' : 'Elige cuánto espacio tienes.'; } },
    { title: 'Análisis avanzado', sub: 'Opcional, para un plan más exacto. Puedes dejarlo en blanco y seguir.', optional: true,
      body: () => `
        <div class="field"><span>¿Te molesta alguna zona?</span><div class="chips">${Object.entries(LIMIT_INFO).map(([k, t]) => chip('limits', k, t, draft.limits.includes(k), 'checkbox')).join('')}</div>
          <small class="hint">Quitamos los ejercicios que cargan esa zona.</small></div>
        <div class="grid2">
          <label class="field"><span>Máximo de flexiones seguidas</span><input name="maxPushups" type="number" inputmode="numeric" min="0" max="150" value="${esc(draft.maxPushups)}"></label>
          <label class="field"><span>Máximo de sentadillas seguidas</span><input name="maxSquats" type="number" inputmode="numeric" min="0" max="300" value="${esc(draft.maxSquats)}"></label>
          <label class="field"><span>% de grasa corporal</span><div class="unit"><input name="bodyFat" type="number" inputmode="decimal" step="0.5" min="3" max="60" value="${esc(draft.bodyFat)}"><em>%</em></div></label>
        </div>`,
      read: f => {
        draft.limits = f.getAll('limits');
        draft.maxPushups = +f.get('maxPushups') || ''; draft.maxSquats = +f.get('maxSquats') || ''; draft.bodyFat = +f.get('bodyFat') || '';
        return '';
      } },
    { title: 'Tu ficha de personaje', sub: 'Valores aproximados. No sustituyen el consejo de un profesional.',
      body: () => metricsHTML(draft) + `<p class="muted">Tu plan: <b>${esc(Generator.GOALS[draft.goal].label)}</b>, ${draft.days} días por semana, ${draft.minutes} minutos.</p>`,
      read: () => '' },
  ];

  function metricsHTML(p) {
    const m = Generator.metrics(p);
    return `
      <div class="stats">
        <div class="stat"><small>IMC</small><b>${m.bmi}</b><span>${esc(m.bmiLabel)}</span></div>
        <div class="stat"><small>Metabolismo basal</small><b>${m.bmr}</b><span>kcal/día en reposo</span></div>
        <div class="stat"><small>Para mantenerte</small><b>${m.maintenance}</b><span>kcal/día</span></div>
        <div class="stat accent"><small>Para tu objetivo</small><b>${m.target}</b><span>kcal/día aprox.</span></div>
      </div>
      <p class="muted small">Calculado con ${esc(m.formula)}. Proteína orientativa: unos ${m.protein} g al día.</p>`;
  }

  let wReturn = 'perfil';
  function startWizard(edit, step = 0) {
    wEditing = !!edit;
    wReturn = tab;
    draft = edit ? JSON.parse(JSON.stringify(Store.profile)) : defaultDraft();
    draft.limits = draft.limits || [];
    wStep = step;
    renderWizard();
  }
  function renderWizard(error = '') {
    tabbar.hidden = true;
    const s = WIZ[wStep];
    app.innerHTML = `
      <section class="wizard">
        ${wStep === 0 && !wEditing ? '<div class="speed hero-banner"><p class="eyebrow">Bienvenida a Acyz Lab</p><h1 class="hero">Tu leyenda empieza hoy</h1><p>Responde unas preguntas y armamos un plan a tu medida para superar tus límites.</p></div>' : ''}
        <div class="steps" aria-label="Paso ${wStep + 1} de ${WIZ.length}">${WIZ.map((_, i) => `<i class="${i <= wStep ? 'on' : ''}"></i>`).join('')}</div>
        <form id="wiz" novalidate>
          <h2>${esc(s.title)}</h2>
          <p class="muted">${esc(s.sub)}</p>
          ${s.body()}
          <p class="error" role="alert">${esc(error)}</p>
          <div class="wiz-nav">
            ${wStep > 0 && !wEditing ? '<button type="button" class="btn ghost" data-action="wiz-back">Atrás</button>' : wEditing ? '<button type="button" class="btn ghost" data-action="wiz-cancel">Cancelar</button>' : '<span></span>'}
            ${wEditing && wStep < WIZ.length - 1 ? '<button type="button" class="btn ghost" data-action="wiz-save">Guardar</button>' : ''}
            <button type="submit" class="btn primary">${wStep === WIZ.length - 1 ? (wEditing ? 'Guardar cambios' : 'Crear mi plan') : s.optional ? 'Seguir' : 'Siguiente'}</button>
          </div>
        </form>
      </section>`;
    window.scrollTo(0, 0);
  }
  function readWizard() {
    const form = $('#wiz');
    return WIZ[wStep].read(new FormData(form));
  }
  app.addEventListener('submit', e => {
    if (e.target.id !== 'wiz') return;
    e.preventDefault();
    const err = readWizard();
    if (err) return renderWizard(err);
    if (wStep < WIZ.length - 1) { wStep++; return renderWizard(); }
    saveDraft();
  });
  function saveDraft() {
    const p = Object.assign({}, draft);
    p.intensity = p.intensity || 1;
    p.updatedAt = new Date().toISOString();
    Store.saveProfile(p);
    if (!Store.weights.length || wEditing) Store.addWeight({ date: todayStr(), kg: p.weight });
    ensurePlan();
    if (!wEditing && !hasPin()) {
      createPin().then(() => { go('hoy'); toast('¡Listo! Tu entrenamiento comienza ahora.'); });
      return;
    }
    toast(wEditing ? 'Guardado. Tu plan se adaptó a los cambios.' : '¡Listo! Tu entrenamiento comienza ahora.');
    go(wEditing ? wReturn : 'hoy');
  }

  // ---------- Cuenta: entrar o registrarse ----------
  let authMode = 'entrar';
  function renderAuth(msg = '', isError = false) {
    tabbar.hidden = true;
    const signup = authMode === 'crear';
    app.innerHTML = `
      <section class="wizard auth">
        <div class="speed hero-banner"><p class="eyebrow">Acyz Lab</p><h1 class="hero">${signup ? 'Únete al entrenamiento' : '¡Hola de nuevo!'}</h1>
          <p>Con tu cuenta, tu progreso se guarda en la nube y lo ves igual en el celular y en el PC.</p></div>
        <button class="btn google block" data-action="auth-google"><svg class="g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Continuar con Google</button>
        <div class="divider"><span>o con tu correo</span></div>
        <form id="auth-form" novalidate>
          <label class="field"><span>Correo</span><input name="email" type="email" autocomplete="email" required></label>
          <label class="field"><span>Contraseña</span><input name="password" type="password" minlength="6" autocomplete="${signup ? 'new-password' : 'current-password'}" required></label>
          <p class="${isError ? 'error' : 'ok-msg'}" role="alert">${esc(msg)}</p>
          <button class="btn primary block">${signup ? 'Crear cuenta' : 'Entrar'}</button>
        </form>
        <div class="auth-links">
          <button class="link-btn" data-action="auth-switch">${signup ? '¿Ya tienes cuenta? Entra' : '¿No tienes cuenta? Créala'}</button>
          ${signup ? '' : '<button class="link-btn" data-action="auth-forgot">Olvidé mi contraseña</button>'}
        </div>
        <button class="btn ghost block" data-action="auth-local">Seguir sin cuenta (solo en este dispositivo)</button>
      </section>`;
  }
  function renderNewPassword(msg = '') {
    tabbar.hidden = true;
    app.innerHTML = `
      <section class="wizard auth">
        <h2>Nueva contraseña</h2>
        <form id="newpass-form" novalidate>
          <label class="field"><span>Escribe tu nueva contraseña</span><input name="password" type="password" minlength="6" autocomplete="new-password" required></label>
          <p class="error" role="alert">${esc(msg)}</p>
          <button class="btn primary block">Guardar contraseña</button>
        </form>
      </section>`;
  }
  const AUTH_ERRORS = {
    'Invalid login credentials': 'Correo o contraseña incorrectos.',
    'Email not confirmed': 'Primero confirma tu correo con el enlace que te enviamos.',
    'User already registered': 'Ya existe una cuenta con ese correo. Entra con ella.',
  };
  const authError = e => AUTH_ERRORS[e && e.message] || (e && /password/i.test(e.message) ? 'La contraseña debe tener al menos 6 caracteres.' : 'No se pudo completar. Revisa tu conexión e inténtalo de nuevo.');

  async function startApp() {
    await Store.init(Cloud.enabled && Cloud.user ? CloudAdapter : LocalAdapter);
    applyTheme();
    if (!Store.profile) return startWizard(false);
    tabbar.hidden = true; app.innerHTML = '';
    await requirePin();
    go('hoy');
  }

  // ---------- Código de 4 dígitos ----------
  const RESET_PIN = 'acyzlab.resetpin';
  const hasPin = () => !!(Store.security && Store.security.pinHash);
  async function createPin(intro) {
    for (;;) {
      const first = await Pin.prompt({
        title: 'Crea tu código secreto', sub: intro || 'Elige 4 dígitos. Te los pediremos cada vez que entres.',
        validate: async () => true, celebrate: false, successTitle: '¡Perfecto!', successText: 'Ahora repítelo para confirmar.', successSub: 'Paso 1 de 2',
      });
      const second = await Pin.prompt({
        title: 'Repite tu código', sub: 'Escribe los mismos 4 dígitos para confirmarlo.', mask: true,
        validate: async c => c === first || 'No coincide. Inténtalo otra vez.',
        successTitle: 'Código creado', successText: 'Tu cuenta está protegida.', successSub: 'Verificado y seguro',
        link: { prefix: '¿Te equivocaste?', label: 'Volver a empezar', onClick: () => {} },
      });
      if (second === null) continue; // eligió volver a empezar
      const salt = Pin.newSalt();
      await Store.saveSecurity({ pinHash: await Pin.hash(second, salt), salt, createdAt: new Date().toISOString() });
      try { sessionStorage.removeItem(RESET_PIN); } catch { /* */ }
      return second;
    }
  }
  async function requirePin() {
    let reset = false;
    try { reset = sessionStorage.getItem(RESET_PIN) === '1'; } catch { /* */ }
    if (!hasPin() || reset) return createPin(reset ? 'Elige tu código nuevo de 4 dígitos.' : undefined);
    const sec = Store.security;
    const r = await Pin.prompt({
      title: 'Introduce tu código', sub: 'Escribe tus 4 dígitos secretos.<br>Se verificará solo al completarlo.', mask: true,
      validate: async c => (await Pin.hash(c, sec.salt)) === sec.pinHash,
      successTitle: 'Verificado con éxito', successText: '¡De vuelta al entrenamiento!', successSub: 'Verificado y seguro',
      link: { prefix: '¿Olvidaste tu código?', label: 'Recupéralo', onClick: forgotPin },
    });
    if (r === null) return new Promise(() => {}); // «Olvidé mi código» sigue su propio camino
    return r;
  }
  function forgotPin() {
    if (Cloud.user) {
      if (confirm('Para crear un código nuevo, vuelve a entrar con tu cuenta (Google o correo). ¿Continuar?')) {
        try { sessionStorage.setItem(RESET_PIN, '1'); } catch { /* */ }
        Cloud.signOut().then(() => { authMode = 'entrar'; renderAuth('Entra de nuevo y podrás crear tu código nuevo.'); });
      } else requirePin().then(() => go(tab));
    } else if (confirm('Sin cuenta, la única forma de quitar el código es borrar los datos de este dispositivo y empezar de nuevo. ¿Borrar?')) {
      Store.reset().then(() => { applyTheme(); startWizard(false); });
    } else requirePin().then(() => go(tab));
  }
  // Pedir el código al volver tras más de 5 minutos fuera
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000 && Store.profile && hasPin() && !W.session && !Pin.isOpen() && tabbar.hidden === false) {
      requirePin();
    }
  });

  app.addEventListener('submit', async e => {
    if (e.target.id === 'auth-form') {
      e.preventDefault();
      const f = new FormData(e.target);
      const email = String(f.get('email') || '').trim(), password = String(f.get('password') || '');
      if (!/^\S+@\S+\.\S+$/.test(email)) return renderAuth('Escribe un correo válido.', true);
      if (password.length < 6) return renderAuth('La contraseña debe tener al menos 6 caracteres.', true);
      e.target.querySelector('button').disabled = true;
      try {
        if (authMode === 'crear') {
          const r = await Cloud.signUp(email, password);
          if (r.needsConfirm) { authMode = 'entrar'; return renderAuth('¡Cuenta creada! Revisa tu correo y abre el enlace para confirmarla. Luego entra aquí.'); }
        } else {
          await Cloud.signIn(email, password);
        }
        Cloud.localOnly = false;
        await startApp();
        toast('¡Sesión iniciada! Tu progreso se guarda en la nube.');
      } catch (err) { renderAuth(authError(err), true); }
    }
    if (e.target.id === 'newpass-form') {
      e.preventDefault();
      const password = String(new FormData(e.target).get('password') || '');
      if (password.length < 6) return renderNewPassword('La contraseña debe tener al menos 6 caracteres.');
      try { await Cloud.updatePassword(password); toast('Contraseña cambiada.'); await startApp(); }
      catch (err) { renderNewPassword(authError(err)); }
    }
  });
  window.addEventListener('acyz:password-recovery', () => renderNewPassword());

  // ---------- Hoy ----------
  function exerciseRow(id, p, fmt) {
    const ex = EXERCISE_BY_ID[id];
    if (!ex) return '';
    const d = Generator.dose(ex, p, fmt);
    const amount = d.duration ? `${d.duration} s` : `${d.reps} rep${ex.perSide ? ' por lado' : ''}`;
    const extra = d.kg ? ` · ${d.kg} kg` : (d.implement && d.implement !== 'ninguno' ? ' · ' + EQUIPMENT_NAMES[d.implement] : '');
    return `<li><details><summary><span class="ex-name">${esc(ex.name)}</span><span class="ex-dose">${amount}${esc(extra)}</span></summary>
      <div class="anim-box" data-anim="${ex.id}" data-impl="${d.implement || ''}"></div>
      <p>${esc(ex.desc)}</p>${d.tip ? `<p class="tip">${esc(d.tip)}</p>` : ''}</details></li>`;
  }
  function sessionCard(s, p, opts = {}) {
    const steps = Generator.buildSteps(s, p);
    const mins = Generator.estimateMinutes(steps);
    const fmt = Generator.format(p);
    return `
      <article class="card session ${opts.done ? 'done' : ''} ${opts.hero ? 'hero-card' : ''}">
        <div class="session-head">
          <div><p class="eyebrow">${esc(opts.eyebrow || DAY[s.day])}</p><h3>${esc(s.title)}</h3></div>
          ${opts.done ? `<span class="badge ok">${ICON.check} Hecha</span>` : `<span class="badge">~${mins} min</span>`}
        </div>
        <p class="muted small">${esc(Generator.describe(s, p))} · ${s.exercises.length} ejercicios</p>
        ${opts.open ? '' : '<details class="list-toggle"><summary>Ver ejercicios</summary>'}
        <ol class="ex-list">${s.exercises.map(id => exerciseRow(id, p, fmt)).join('')}</ol>
        <p class="muted small">Toca un ejercicio para ver cómo se hace. Incluye ${s.warmup.length} ejercicios de calentamiento y ${s.cooldown.length} de estiramiento.</p>
        <p class="equip-line small"><span>Equipo: ${esc(equipSummary(p))}</span><button class="link-btn" data-action="edit-equip">Cambiar</button></p>
        ${opts.open ? '' : '</details>'}
        <button class="btn ${opts.done ? 'ghost' : 'primary'} block" data-action="start" data-index="${s.index}">${opts.done ? 'Repetir' : `${ICON.play} Empezar`}</button>
      </article>`;
  }

  function viewHoy() {
    const p = Store.profile;
    const plan = ensurePlan();
    const done = doneThisWeek(plan.weekKey);
    const next = nextSession(plan);
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    const pct = Math.round(done.size / plan.sessions.length * 100);
    const trainedToday = Store.history.some(h => new Date(h.date).toDateString() === new Date().toDateString());
    let eyebrow = 'Próxima sesión';
    if (next && trainedToday) eyebrow = `Ya entrenaste hoy · siguiente (${DAY[Math.max(next.day, todayIdx() + 1) % 7].toLowerCase()})`;
    else if (next && next.day === todayIdx()) eyebrow = 'Toca hoy';
    else if (next && next.day < todayIdx()) eyebrow = 'Pendiente · puedes hacerla hoy';
    else if (next) eyebrow = `Próxima: el ${DAY[next.day].toLowerCase()}`;

    app.innerHTML = `
      <section>
        <p class="eyebrow">${esc(new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
        <h1 class="hero">${hello}</h1>
        <div class="speed quote-card"><p>«${esc(quote(Math.floor(Date.now() / 864e5)))}»</p></div>
        ${rankHTML()}
        <div class="week-bar card">
          <div class="row"><b>Esta semana</b><span>${done.size} de ${plan.sessions.length} sesiones</span></div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div class="dots">${DAY.map((d, i) => {
            const s = plan.sessions.find(x => x.day === i);
            const cls = s ? (done.has(s.index) ? 'done' : 'plan') : '';
            return `<span class="dot ${cls} ${i === todayIdx() ? 'today' : ''}" title="${d}">${d[0]}</span>`;
          }).join('')}</div>
          <div class="row small muted"><span>Racha: <b>${streakWeeks()}</b> semanas cumplidas</span><span>Nivel de poder ${Math.round((p.intensity || 1) * 100)}%</span></div>
        </div>
        ${next ? sessionCard(next, p, { eyebrow, hero: true, open: true }) : `
          <article class="card hero-card center">
            <h3>¡Arco semanal completado! 🔥</h3>
            <p class="muted">Hiciste todas las sesiones. Descansar también es entrenar: así tu cuerpo se hace más fuerte. Si quieres más, repite alguna desde la pestaña Plan.</p>
            <button class="btn ghost" data-action="tab" data-tab="plan">Ver el plan</button>
          </article>`}
      </section>`;
  }

  function rankHTML() {
    const r = rankOf(Store.history.length);
    return `<div class="card rank"><div class="rank-letter">${r.letter}</div><div class="rank-info">
      <small>Rango</small><b>${esc(r.title)}</b>
      <div class="bar"><i style="width:${r.pct}%"></i></div>
      <span class="small muted">${r.next ? `${r.left} ${r.left === 1 ? 'sesión' : 'sesiones'} para el rango ${r.next}` : 'Rango máximo. Eres imparable.'}</span></div></div>`;
  }

  // ---------- Plan ----------
  function viewPlan() {
    const p = Store.profile;
    const plan = ensurePlan();
    const done = doneThisWeek(plan.weekKey);
    const start = new Date(plan.weekKey + 'T00:00');
    const end = new Date(start); end.setDate(end.getDate() + 6);
    app.innerHTML = `
      <section>
        <p class="eyebrow">Semana del ${start.getDate()} al ${end.toLocaleDateString('es', { day: 'numeric', month: 'long' })}</p>
        <h1 class="hero">Arco de la semana</h1>
        <p class="muted">${esc(Generator.GOALS[p.goal].label)} · ${esc(plan.splitName)} · ${p.days} días · ${p.minutes} min</p>
        <div class="plan-grid">${plan.sessions.map(s => sessionCard(s, p, { done: done.has(s.index) })).join('')}</div>
        <div class="card">
          <h3>Tu equipo y tu espacio</h3>
          <p class="muted small">${esc(equipSummary(p))} · ${esc(SPACE_INFO[p.space][0])}. Solo te damos ejercicios con lo que marcaste.</p>
          <button class="btn ghost" data-action="edit-equip">Cambiar mi equipo</button>
        </div>
        <div class="card">
          <h3>¿Quieres otros ejercicios?</h3>
          <p class="muted small">Cada lunes se arma un plan nuevo y variado. Si quieres cambiarlo ya, genera otra versión de esta semana.</p>
          <button class="btn ghost" data-action="reshuffle">Cambiar ejercicios de esta semana</button>
        </div>
      </section>`;
  }

  // ---------- Progreso ----------
  function weightChart(ws) {
    if (ws.length < 2) return '<p class="muted small">Añade tu peso al menos dos días distintos para ver el gráfico.</p>';
    const W = 320, H = 150, P = 28;
    const pts = ws.slice(-30);
    const t0 = new Date(pts[0].date).getTime(), t1 = new Date(pts[pts.length - 1].date).getTime() || t0 + 1;
    const kgs = pts.map(w => w.kg);
    let lo = Math.min(...kgs), hi = Math.max(...kgs);
    if (hi - lo < 2) { lo -= 1; hi += 1; }
    const x = d => P + (new Date(d).getTime() - t0) / Math.max(1, t1 - t0) * (W - P - 10);
    const y = k => 10 + (hi - k) / (hi - lo) * (H - 30);
    const line = pts.map(w => `${x(w.date).toFixed(1)},${y(w.kg).toFixed(1)}`).join(' ');
    const area = `${x(pts[0].date)},${H - 20} ${line} ${x(pts[pts.length - 1].date)},${H - 20}`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de peso">
      <line x1="${P}" y1="${y(hi)}" x2="${W - 10}" y2="${y(hi)}" class="grid"/><line x1="${P}" y1="${y(lo)}" x2="${W - 10}" y2="${y(lo)}" class="grid"/>
      <text x="${P - 4}" y="${y(hi) + 4}" text-anchor="end">${hi.toFixed(0)}</text><text x="${P - 4}" y="${y(lo) + 4}" text-anchor="end">${lo.toFixed(0)}</text>
      <polygon points="${area}" class="area"/><polyline points="${line}" class="line"/>
      ${pts.map(w => `<circle cx="${x(w.date)}" cy="${y(w.kg)}" r="3"/>`).join('')}
      <text x="${P}" y="${H - 4}">${esc(new Date(pts[0].date + 'T00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' }))}</text>
      <text x="${W - 10}" y="${H - 4}" text-anchor="end">${esc(new Date(pts[pts.length - 1].date + 'T00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' }))}</text>
    </svg>`;
  }
  const FEEL = { facil: 'Fácil', bien: 'Bien', dificil: 'Difícil' };

  // El rival de todo protagonista: tú mismo la semana pasada
  function rivalHTML() {
    const wk = weekKeyOf();
    const d = new Date(); d.setDate(d.getDate() - 7);
    const prevWk = weekKeyOf(d);
    const sum = k => {
      const list = Store.history.filter(x => x.weekKey === k);
      return { n: list.length, min: list.reduce((t, x) => t + (x.minutes || 0), 0) };
    };
    const me = sum(wk), rival = sum(prevWk);
    let verdict;
    if (!rival.n && !me.n) verdict = 'Tu rival aún no ha aparecido. Entrena esta semana y será el rival a vencer la próxima.';
    else if (!rival.n) verdict = 'La semana pasada no hubo combate. ¡Esta semana marcas el récord a batir!';
    else if (me.n > rival.n || (me.n === rival.n && me.min > rival.min)) verdict = '¡Vas ganando! Ya superaste a tu yo de la semana pasada.';
    else if (me.n === rival.n && me.min === rival.min) verdict = 'Empate técnico. Una sesión más y lo superas.';
    else verdict = `Te faltan ${rival.n - me.n || 1} ${rival.n - me.n > 1 ? 'sesiones' : 'sesión'} para alcanzar a tu rival. ¡No te rindas!`;
    return `<div class="card rival">
      <h3>Tu rival: tú de la semana pasada</h3>
      <div class="vs"><div><small>Tú (esta semana)</small><b>${me.n}</b><span>${me.min} min</span></div><em>VS</em><div><small>Tu rival</small><b>${rival.n}</b><span>${rival.min} min</span></div></div>
      <p class="muted small">${esc(verdict)}</p></div>`;
  }

  function viewProgreso() {
    const h = Store.history;
    const ws = Store.weights;
    const totalMin = h.reduce((t, x) => t + (x.minutes || 0), 0);
    const monthKey = todayStr().slice(0, 7);
    const thisMonth = h.filter(x => x.date.slice(0, 7) === monthKey).length;
    const last = ws[ws.length - 1], first = ws[0];
    const diff = last && first && ws.length > 1 ? (last.kg - first.kg) : null;
    app.innerHTML = `
      <section>
        <h1 class="hero">Tu evolución</h1>
        <div class="stats">
          <div class="stat accent"><small>Racha</small><b>${streakWeeks()}</b><span>semanas cumplidas</span></div>
          <div class="stat"><small>Sesiones</small><b>${h.length}</b><span>${thisMonth} este mes</span></div>
          <div class="stat"><small>Minutos</small><b>${totalMin}</b><span>en total</span></div>
          <div class="stat"><small>Peso</small><b>${last ? last.kg : '—'}</b><span>${diff === null ? 'kg' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg desde el inicio`}</span></div>
        </div>

        ${rivalHTML()}

        <div class="card">
          <h3>Peso</h3>
          <form id="weight-form" class="kg-row">
            <input name="kg" type="number" inputmode="decimal" step="0.1" min="30" max="300" placeholder="Peso de hoy (kg)" aria-label="Peso de hoy en kg" required>
            <button class="btn primary small">Guardar</button>
          </form>
          ${weightChart(ws)}
          ${ws.length ? `<details><summary class="small">Ver registros</summary><ul class="simple">${ws.slice().reverse().slice(0, 20).map(w =>
            `<li><span>${esc(new Date(w.date + 'T00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }))}</span><b>${w.kg} kg</b><button class="link" data-action="weight-del" data-date="${w.date}" aria-label="Borrar">×</button></li>`).join('')}</ul></details>` : ''}
        </div>

        <div class="card">
          <h3>Registro de batallas</h3>
          ${h.length ? `<ul class="history">${h.slice().reverse().slice(0, 50).map(x => `
            <li><div><b>${esc(x.title)}</b><small>${esc(fmtDate(x.date))} · ${x.minutes} min</small></div>
            <span class="badge feel-${x.feedback}">${FEEL[x.feedback] || ''}</span></li>`).join('')}</ul>`
            : '<p class="muted small">Aquí aparecerán tus batallas ganadas, una por cada sesión terminada.</p>'}
        </div>

        <div class="card">
          <h3>Copia de seguridad</h3>
          <p class="muted small">Tus datos se guardan solo en este navegador. Descarga una copia para no perderlos o para pasarlos a otro dispositivo.</p>
          <div class="row-btns">
            <button class="btn ghost" data-action="export">Exportar copia</button>
            <label class="btn ghost">Importar copia<input type="file" accept="application/json,.json" id="import-file" hidden></label>
          </div>
        </div>
      </section>`;
  }

  // ---------- Perfil ----------
  function viewPerfil() {
    const p = Store.profile;
    const s = Store.settings;
    const row = (k, v) => `<li><span>${k}</span><b>${esc(v)}</b></li>`;
    app.innerHTML = `
      <section>
        <h1 class="hero">Tu ficha</h1>
        ${rankHTML()}
        ${metricsHTML(p)}
        <div class="card">
          <h3>Estadísticas del personaje</h3>
          <ul class="simple">
            ${row('Objetivo', Generator.GOALS[p.goal].label)}
            ${row('Edad · peso · estatura', `${p.age} años · ${p.weight} kg · ${p.height} cm`)}
            ${row('Nivel', Generator.LEVELS[p.level])}
            ${row('Entreno', `${p.days} días · ${p.minutes} min`)}
            ${row('Implementos', equipSummary(p))}
            ${row('Espacio', SPACE_INFO[p.space][0])}
            ${row('Zonas a cuidar', p.limits.length ? p.limits.map(l => LIMIT_INFO[l]).join(', ') : 'Ninguna')}
            ${p.maxPushups ? row('Máx. flexiones', p.maxPushups) : ''}
            ${p.maxSquats ? row('Máx. sentadillas', p.maxSquats) : ''}
            ${p.bodyFat ? row('% de grasa', p.bodyFat + ' %') : ''}
          </ul>
          <button class="btn primary" data-action="edit-profile">Editar mis datos</button>
        </div>
        <div class="card">
          <h3>Nivel de poder: ${Math.round((p.intensity || 1) * 100)}%</h3>
          <p class="muted small">Sube o baja sola según respondas «¿cómo te fue?» al terminar cada sesión.</p>
          <button class="btn ghost small" data-action="reset-intensity">Volver al 100%</button>
        </div>
        <div class="card">
          <h3>Ajustes</h3>
          <div class="field"><span>Tema</span><div class="chips">
            ${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, t]) => `<label class="chip"><input type="radio" name="theme" value="${k}" ${s.theme === k ? 'checked' : ''} data-setting="theme"><span>${t}</span></label>`).join('')}
          </div></div>
          <label class="choice check"><input type="checkbox" data-setting="sound" ${s.sound ? 'checked' : ''}><span><b>Sonido y vibración</b><small>Avisos en la cuenta atrás</small></span></label>
        </div>
        <div class="card"><h3>Código secreto</h3>
          <p class="muted small">Tus 4 dígitos para entrar a la app. Se guardan cifrados.</p>
          <button class="btn ghost" data-action="change-pin">Cambiar mi código</button></div>
        ${accountHTML()}
        <div class="card danger">
          <h3>Borrar todo</h3>
          <p class="muted small">Elimina tu perfil, el historial y el peso${Cloud.user ? ' (también de la nube)' : ' de este navegador'}. Exporta una copia antes si quieres conservarlos.</p>
          <button class="btn danger" data-action="wipe">Borrar mis datos</button>
        </div>
        <p class="muted small center">Acyz Lab · versión 1 · ${Cloud.user ? 'tus datos se guardan en tu cuenta' : 'tus datos se guardan en este dispositivo'}</p>
      </section>`;
  }

  const SYNC_TEXT = { idle: 'Conectado', saving: 'Guardando…', synced: 'Todo guardado en la nube ✓', offline: 'Sin internet: se guardará al volver la conexión', error: 'No se pudo guardar en la nube; se reintentará' };
  function accountHTML() {
    if (!Cloud.enabled) return '';
    if (Cloud.user) {
      return `<div class="card"><h3>Tu cuenta</h3>
        <p class="small"><b>${esc(Cloud.user.email || 'Cuenta de Google')}</b></p>
        <p class="muted small" id="sync-status">${esc(SYNC_TEXT[Cloud.status] || '')}</p>
        <button class="btn ghost" data-action="logout">Cerrar sesión</button></div>`;
    }
    return `<div class="card"><h3>Guarda tu progreso en la nube</h3>
      <p class="muted small">Ahora mismo tus datos solo están en este dispositivo. Entra con Google o con tu correo para tenerlos también en el celular y el PC.</p>
      <button class="btn primary" data-action="auth-open">Entrar o crear cuenta</button></div>`;
  }
  Cloud.onStatus(st => { const el = $('#sync-status'); if (el) el.textContent = SYNC_TEXT[st] || ''; });

  // ---------- Modo entrenamiento ----------
  const W = { steps: [], i: 0, remaining: 0, running: false, endAt: 0, timer: null, startedAt: 0, session: null, lock: null, audio: null, lastBeep: null };

  function beep(freq = 880, ms = 120, vol = 0.25) {
    if (!Store.settings.sound) return;
    try {
      W.audio = W.audio || new (window.AudioContext || window.webkitAudioContext)();
      const ctx = W.audio, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = freq; o.type = 'sine';
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + ms / 1000 + 0.02);
    } catch { /* sin audio */ }
  }
  const vibrate = pattern => { if (Store.settings.sound && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(pattern); } catch { /* */ } };

  async function lockScreen() {
    try { if ('wakeLock' in navigator) W.lock = await navigator.wakeLock.request('screen'); } catch { /* no disponible */ }
  }
  function releaseLock() { try { W.lock && W.lock.release(); } catch { /* */ } W.lock = null; }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && W.session && !W.lock) lockScreen(); });

  function startWorkout(index) {
    const plan = ensurePlan();
    const s = plan.sessions.find(x => x.index === index);
    if (!s) return;
    W.session = s;
    W.steps = Generator.buildSteps(s, Store.profile);
    W.i = 0;
    W.startedAt = Date.now();
    beep(660, 60, 0.05); // desbloquea el audio con el toque del usuario
    lockScreen();
    let ov = $('#workout');
    if (!ov) { ov = document.createElement('div'); ov.id = 'workout'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); document.body.appendChild(ov); }
    document.body.classList.add('no-scroll');
    enterStep(0);
  }

  function enterStep(i) {
    W.i = i;
    const st = W.steps[i];
    W.lastBeep = null;
    if (st.duration) { W.remaining = st.duration; W.running = true; W.endAt = Date.now() + W.remaining * 1000; }
    else { W.running = false; }
    renderWorkout();
    clearInterval(W.timer);
    if (st.duration) W.timer = setInterval(tick, 200);
  }

  function tick() {
    if (!W.running) return;
    W.remaining = Math.max(0, (W.endAt - Date.now()) / 1000);
    const secs = Math.ceil(W.remaining);
    if (secs <= 3 && secs >= 1 && W.lastBeep !== secs) { W.lastBeep = secs; beep(660, 100); vibrate(40); }
    updateTimer();
    if (W.remaining <= 0) {
      beep(990, 350); vibrate([120, 60, 120]);
      advance();
    }
  }

  function advance() {
    clearInterval(W.timer);
    if (W.i >= W.steps.length - 1) return finishWorkout();
    enterStep(W.i + 1);
  }

  function updateTimer() {
    const st = W.steps[W.i];
    const t = $('#w-time'); if (t) t.textContent = mmss(Math.ceil(W.remaining));
    const ring = $('#w-ring');
    if (ring && st.duration) ring.style.strokeDashoffset = String(565.5 * (1 - W.remaining / st.duration));
  }

  function renderWorkout() {
    const ov = $('#workout');
    const st = W.steps[W.i];
    const total = W.steps.length;
    const pct = Math.round(W.i / total * 100);
    const isRest = st.kind === 'rest';
    const nextWork = W.steps.slice(W.i + 1).find(x => x.kind === 'work');
    const amount = st.reps
      ? `<div class="w-reps"><b>${st.reps}</b><span>repeticiones${st.perSide ? ' por lado' : ''}</span></div>`
      : `<div class="w-timer"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" class="track"/><circle id="w-ring" cx="100" cy="100" r="90" class="ring" style="stroke-dasharray:565.5;stroke-dashoffset:0"/></svg>
          <div><b id="w-time">${mmss(Math.ceil(W.remaining))}</b>${st.perSide && !isRest ? '<span>mitad de tiempo por lado</span>' : ''}</div></div>`;
    const animStep = isRest ? nextWork : st;
    const anim = animStep && animStep.exId ? `<div class="w-anim ${isRest ? 'mini' : ''}" data-anim="${animStep.exId}" data-impl="${animStep.implement || ''}"></div>` : '';
    const implement = st.kg ? `<span class="badge">${st.kg} kg · ${EQUIPMENT_NAMES[st.implement]}</span>`
      : st.implement && st.implement !== 'ninguno' ? `<span class="badge">${EQUIPMENT_NAMES[st.implement]}</span>` : '';
    ov.className = (isRest ? 'rest' : 'work') + ' manga';
    setTimeout(() => Anim.mountAll(ov), 0);
    ov.innerHTML = `
      <div class="w-top">
        <button class="icon-btn" data-action="w-close" aria-label="Salir">${ICON.close}</button>
        <div class="w-progress"><div class="row small"><span>${esc(st.phase === 'prep' ? 'Empezamos' : st.phase)}</span><span>${pct}%</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>
      </div>
      <div class="w-body">
        <p class="eyebrow">${esc(st.phase === 'prep' ? 'Empezamos en' : isRest ? 'Recupera energía' : st.label || '')}</p>
        <h2 class="w-name">${esc(st.name)}</h2>
        ${implement}
        ${isRest ? '' : anim}
        ${amount}
        ${isRest ? `<button class="btn ghost small" data-action="w-plus">+15 s</button>` + (st.next ? `<p class="w-next">Siguiente: <b>${esc(st.next)}</b></p>` : '') + anim + `<p class="w-quote">«${esc(quote(W.i))}»</p>`
          : `${st.tip ? `<p class="tip">${esc(st.tip)}</p>` : ''}<details class="w-desc" ${W.i < 3 ? 'open' : ''}><summary>Cómo se hace</summary><p>${esc(st.desc)}</p></details>
             ${nextWork ? `<p class="w-next small">Después: ${esc(nextWork.name)}</p>` : ''}`}
      </div>
      <div class="w-controls">
        <button class="icon-btn big" data-action="w-prev" aria-label="Anterior" ${W.i === 0 ? 'disabled' : ''}>${ICON.prev}</button>
        ${st.duration
          ? `<button class="btn primary round" data-action="w-toggle" aria-label="${W.running ? 'Pausa' : 'Seguir'}">${W.running ? ICON.pause : ICON.play}</button>`
          : `<button class="btn primary round wide" data-action="w-next">${ICON.check} ¡Hecho!</button>`}
        <button class="icon-btn big" data-action="w-next" aria-label="${isRest ? 'Saltar descanso' : 'Saltar'}">${ICON.next}</button>
      </div>`;
    updateTimer();
  }

  function toggle() {
    const st = W.steps[W.i];
    if (!st.duration) return;
    if (W.running) { W.running = false; W.remaining = Math.max(0, (W.endAt - Date.now()) / 1000); }
    else { W.running = true; W.endAt = Date.now() + W.remaining * 1000; }
    renderWorkout();
  }

  function closeWorkout() {
    clearInterval(W.timer);
    releaseLock();
    W.session = null;
    $('#workout')?.remove();
    document.body.classList.remove('no-scroll');
  }

  function finishWorkout() {
    clearInterval(W.timer);
    const ov = $('#workout');
    const minutes = Math.max(1, Math.round((Date.now() - W.startedAt) / 60000));
    W.minutes = minutes;
    beep(523, 150); setTimeout(() => beep(659, 150), 160); setTimeout(() => beep(784, 300), 320);
    const before = rankOf(Store.history.length), after = rankOf(Store.history.length + 1);
    ov.className = 'finish speed burst';
    ov.innerHTML = `
      <div class="w-body center">
        <p class="eyebrow">Sesión completada</p>
        <h2 class="w-name">¡Límite superado! 🔥</h2>
        ${after.letter !== before.letter ? `<p class="rank-up">¡Subiste al rango <b>${after.letter}</b>: ${esc(after.title)}!</p>` : `<p class="w-quote">«${esc(quote(Date.now() / 1000))}»</p>`}
        <p class="muted">${esc(W.session.title)} · ${minutes} min</p>
        <h3>¿Cómo te fue?</h3>
        <div class="feel">
          <button class="btn feel-facil" data-action="feedback" data-v="facil"><b>Fácil</b><small>Necesito más poder</small></button>
          <button class="btn feel-bien" data-action="feedback" data-v="bien"><b>Bien</b><small>Justo en mi límite</small></button>
          <button class="btn feel-dificil" data-action="feedback" data-v="dificil"><b>Difícil</b><small>Me costó, pero no me rendí</small></button>
        </div>
      </div>`;
  }

  function saveFeedback(v) {
    const p = Store.profile;
    const delta = { facil: 0.08, bien: 0.03, dificil: -0.08 }[v];
    const before = p.intensity || 1;
    p.intensity = Math.round(Math.max(0.7, Math.min(1.5, before + delta)) * 100) / 100;
    Store.saveProfile(p);
    Store.addSession({
      id: Date.now().toString(36), date: new Date().toISOString(), weekKey: weekKeyOf(), sessionIndex: W.session.index,
      title: W.session.title, minutes: W.minutes, feedback: v, exercises: W.session.exercises, intensity: before,
    });
    closeWorkout();
    toast({ facil: '¡Tu poder crece! La próxima será más exigente.', bien: 'Buen ritmo. Seguimos subiendo poco a poco.', dificil: 'Lo diste todo. La próxima será algo más suave para que sigas creciendo.' }[v]);
    go('hoy');
  }

  // ---------- Avisos ----------
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3200);
  }

  // ---------- Acciones ----------
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    switch (a) {
      case 'wiz-back': readWizard(); if (wStep > 0) wStep--; renderWizard(); break;
      case 'wiz-cancel': go(wReturn); break;
      case 'wiz-save': { const err = readWizard(); if (err) renderWizard(err); else saveDraft(); break; }
      case 'edit-equip': startWizard(true, 3); break;
      case 'kg-add': {
        const k = el.dataset.key, inp = $(`[data-kg-input="${k}"]`);
        const v = parseFloat((inp.value || '').replace(',', '.'));
        if (!(v > 0 && v <= 100)) { inp.focus(); return; }
        if (!draft.equipment[k].includes(v)) draft.equipment[k].push(v);
        const f = new FormData($('#wiz')); ['barra', 'banda', 'cuerda'].forEach(x => { draft.equipment[x] = f.get(x) === 'on'; });
        renderWizard(); $(`[data-kg-input="${k}"]`).focus(); break;
      }
      case 'kg-del': {
        const k = el.dataset.key;
        draft.equipment[k] = draft.equipment[k].filter(x => x !== +el.dataset.kg);
        const f = new FormData($('#wiz')); ['barra', 'banda', 'cuerda'].forEach(x => { draft.equipment[x] = f.get(x) === 'on'; });
        renderWizard(); break;
      }
      case 'tab': go(el.dataset.tab); break;
      case 'start': startWorkout(+el.dataset.index); break;
      case 'reshuffle': {
        const plan = ensurePlan();
        ensurePlan((plan.salt || 0) + 1);
        toast('Nuevos ejercicios para esta semana.'); viewPlan(); break;
      }
      case 'w-toggle': toggle(); break;
      case 'w-next': beep(880, 80, 0.15); advance(); break;
      case 'w-prev': if (W.i > 0) enterStep(W.i - 1); break;
      case 'w-plus': W.remaining += 15; W.endAt += 15000; W.steps[W.i].duration += 15; updateTimer(); break;
      case 'w-close':
        if (confirm('¿Salir del entrenamiento? Esta sesión no se guardará.')) closeWorkout();
        break;
      case 'feedback': saveFeedback(el.dataset.v); break;
      case 'edit-profile': startWizard(true); break;
      case 'reset-intensity': { const p = Store.profile; p.intensity = 1; Store.saveProfile(p); viewPerfil(); toast('Intensidad al 100%.'); break; }
      case 'weight-del': Store.removeWeight(el.dataset.date); viewProgreso(); break;
      case 'export': {
        const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `acyzlab-copia-${todayStr()}.json`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('Copia descargada.'); break;
      }
      case 'auth-google':
        el.disabled = true;
        Cloud.signInWithGoogle().catch(err => { el.disabled = false; renderAuth(authError(err), true); });
        break;
      case 'auth-switch': authMode = authMode === 'crear' ? 'entrar' : 'crear'; renderAuth(); break;
      case 'auth-forgot': {
        const email = ($('#auth-form [name=email]').value || '').trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) { renderAuth('Escribe tu correo arriba y vuelve a pulsar «Olvidé mi contraseña».', true); break; }
        Cloud.resetPassword(email).then(() => renderAuth('Te enviamos un correo para crear una contraseña nueva.')).catch(err => renderAuth(authError(err), true));
        break;
      }
      case 'auth-local': Cloud.localOnly = true; startApp(); break;
      case 'change-pin': {
        const sec = Store.security;
        const ask = sec && sec.pinHash ? Pin.prompt({
          title: 'Tu código actual', sub: 'Primero escribe el código que usas ahora.', mask: true, celebrate: false,
          validate: async c => (await Pin.hash(c, sec.salt)) === sec.pinHash, successTitle: 'Correcto', successText: 'Ahora elige el nuevo.', successSub: 'Verificado',
          link: { prefix: '¿Cambiaste de idea?', label: 'Cancelar', onClick: () => {} },
        }) : Promise.resolve();
        ask.then(r => { if (r === null) return; return createPin('Elige tu código nuevo de 4 dígitos.').then(() => { viewPerfil(); toast('Código cambiado.'); }); });
        break;
      }
      case 'auth-open': authMode = 'entrar'; renderAuth(); break;
      case 'logout':
        if (confirm('¿Cerrar sesión? Tu progreso queda guardado en tu cuenta.')) {
          Cloud.signOut().then(() => { authMode = 'entrar'; renderAuth('Sesión cerrada.'); });
        }
        break;
      case 'wipe':
        if (confirm('¿Seguro que quieres borrar todos tus datos de este navegador? No se puede deshacer.')) {
          Store.reset().then(() => { applyTheme(); startWizard(false); toast('Datos borrados.'); });
        }
        break;
      case 'theme-cycle': {
        const order = ['auto', 'light', 'dark'];
        Store.saveSettings({ theme: order[(order.indexOf(Store.settings.theme) + 1) % 3] });
        applyTheme();
        if (tab === 'perfil' && Store.profile && !tabbar.hidden) viewPerfil();
        toast('Tema: ' + { auto: 'automático', light: 'claro', dark: 'oscuro' }[Store.settings.theme]);
        break;
      }
    }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.setting === 'theme') { Store.saveSettings({ theme: el.value }); applyTheme(); }
    if (el.dataset.setting === 'sound') Store.saveSettings({ sound: el.checked });
    if (el.id === 'import-file' && el.files[0]) {
      const file = el.files[0];
      if (!confirm('Importar esta copia reemplazará los datos actuales de este navegador. ¿Continuar?')) { el.value = ''; return; }
      file.text().then(t => Store.importJSON(t)).then(() => {
        applyTheme();
        toast('Copia importada.');
        Store.profile ? go('progreso') : startWizard(false);
      }).catch(err => toast('No se pudo importar: ' + err.message));
    }
  });

  document.addEventListener('toggle', e => { if (e.target.open) Anim.mountAll(e.target); }, true);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const k = e.target.dataset && e.target.dataset.kgInput;
    if (k) { e.preventDefault(); $(`[data-action="kg-add"][data-key="${k}"]`).click(); }
  });

  app.addEventListener('submit', e => {
    if (e.target.id !== 'weight-form') return;
    e.preventDefault();
    const kg = parseFloat(new FormData(e.target).get('kg'));
    if (!(kg >= 30 && kg <= 300)) return toast('Escribe un peso válido en kg.');
    Store.addWeight({ date: todayStr(), kg: Math.round(kg * 10) / 10 });
    const p = Store.profile; p.weight = Math.round(kg * 10) / 10; Store.saveProfile(p);
    toast('Peso guardado.');
    viewProgreso();
  });

  // ---------- Inicio ----------
  async function init() {
    $('#topbar-extra').innerHTML = `<button id="theme-btn" class="icon-btn" data-action="theme-cycle" aria-label="Cambiar tema"></button>`;
    try { await Cloud.init(); } catch (e) { console.warn('No se pudo comprobar la sesión', e); }
    if (Cloud.enabled && !Cloud.user && !Cloud.localOnly) {
      await Store.init(LocalAdapter); // para el tema
      applyTheme();
      renderAuth();
    } else {
      await startApp();
    }
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker no registrado', err));
    }
  }
  init();
})();
