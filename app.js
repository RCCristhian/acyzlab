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
    const e = p.equipment || {}, eq = [];
    if ((e.mancuernas || []).length) eq.push(`Mancuernas (${e.mancuernas.slice().sort((a, b) => a - b).join(', ')} kg)`);
    if ((e.pesarusa || []).length) eq.push(`Pesa rusa (${e.pesarusa.slice().sort((a, b) => a - b).join(', ')} kg)`);
    if (Number(e.barradisco) > 0) eq.push(`Barra con discos (hasta ${e.barradisco} kg)`);
    if (Number(e.barraz) > 0) eq.push(`Barra Z (hasta ${e.barraz} kg)`);
    EQUIP_CHECKS.forEach(k => e[k] && eq.push(EQUIPMENT_NAMES[k]));
    return eq.length ? eq.join(', ') : 'Solo peso corporal';
  };
  // equipo que se marca con una casilla (sin pesos)
  const EQUIP_GROUPS = [
    ['Para apoyarte o colgarte', ['rack', 'banco', 'cajon', 'barra', 'paralelas', 'trx']],
    ['Accesorios', ['banda', 'cuerda', 'rodillo', 'balon', 'fitball', 'saco']],
    ['Máquinas', ['poleas', 'maqpiernas', 'bici', 'cinta', 'eliptica', 'remoergo']],
  ];
  const EQUIP_CHECKS = EQUIP_GROUPS.flatMap(g => g[1]);
  const emptyEquipment = () => Object.assign({ mancuernas: [], pesarusa: [], barradisco: 0, barraz: 0 }, Object.fromEntries(EQUIP_CHECKS.map(k => [k, false])));

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
  const profileStamp = p => JSON.stringify([p.goal, p.level, p.days, p.minutes, p.equipment, p.space, p.limits, p.style, p.stamina, p.bodyType]);

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
    ({ hoy: viewHoy, plan: viewPlan, progreso: viewProgreso, amigos: viewAmigos, perfil: viewPerfil })[t]();
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
  const ACTIVITY_INFO = {
    1: ['Sedentario', 'Paso casi todo el día sentado'],
    2: ['Algo activo', 'Camino un rato cada día'],
    3: ['Activo', 'Estoy mucho de pie o me muevo bastante'],
    4: ['Muy activo', 'Trabajo físico o deporte casi a diario'],
  };
  const BODY_INFO = {
    subir: ['Me cuesta subir de peso', 'Como y no engordo ni gano músculo fácilmente'],
    normal: ['Ni mucho ni poco', 'Subo o bajo según lo que haga'],
    bajar: ['Me cuesta bajar de peso', 'Gano grasa con facilidad'],
  };
  const SLEEP_INFO = { 1: 'Menos de 6 h', 2: '6 a 7 h', 3: '7 a 9 h' };
  const STAMINA_INFO = {
    1: ['Me canso rápido', 'Subir tres pisos de escaleras ya me deja sin aire'],
    2: ['Aguante normal', 'Puedo trotar unos 10 minutos'],
    3: ['Mucho aguante', 'Corro 30 minutos o más sin problema'],
  };
  const STYLE_INFO = {
    fuerza: ['Fuerza bruta', 'Quiero levantar más y ser más fuerte'],
    velocidad: ['Velocidad', 'Quiero ser rápido, ágil y explosivo'],
    equilibrio: ['Equilibrio', 'Un poco de todo, sin descuidar nada'],
  };

  let draft = null, wStep = 0, wEditing = false;
  const defaultDraft = () => ({
    goal: null, age: '', sex: null, weight: '', height: '', level: null, days: 3, minutes: 30,
    equipment: emptyEquipment(),
    space: null, limits: [], maxPushups: '', maxSquats: '', bodyFat: '', intensity: 1,
    activity: null, bodyType: null, sleep: null, stamina: null, style: null,
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
    { key: 'origen', title: 'Tu historia de origen', sub: 'Todo protagonista tiene un pasado. Cuéntanos cómo es el tuyo.',
      body: () => `
        <div class="field"><span>¿Cómo es tu vida fuera del entrenamiento?</span></div>
        <div class="choices">${Object.entries(ACTIVITY_INFO).map(([k, [t, s]]) => choice('activity', k, t, s, +draft.activity === +k)).join('')}</div>
        <div class="field"><span>¿Cómo responde tu cuerpo?</span></div>
        <div class="choices">${Object.entries(BODY_INFO).map(([k, [t, s]]) => choice('bodyType', k, t, s, draft.bodyType === k)).join('')}</div>
        <div class="field"><span>¿Cuántas horas duermes normalmente?</span><div class="chips">${Object.entries(SLEEP_INFO).map(([k, t]) => chip('sleep', k, t, +draft.sleep === +k)).join('')}</div></div>`,
      read: f => {
        draft.activity = +f.get('activity'); draft.bodyType = f.get('bodyType'); draft.sleep = +f.get('sleep');
        if (!draft.activity) return 'Cuéntanos cómo es tu día a día.';
        if (!draft.bodyType) return 'Elige cómo responde tu cuerpo.';
        if (!draft.sleep) return 'Dinos cuánto duermes.';
        return '';
      } },
    { key: 'nivel', title: '¿Con qué nivel de poder empiezas?', sub: 'Y cuánto tiempo le darás al entrenamiento. Podrás cambiarlo cuando quieras.',
      body: () => `
        <div class="choices">${Object.entries(LEVEL_INFO).map(([k, [t, s]]) => choice('level', k, t, s, +draft.level === +k)).join('')}</div>
        <div class="field"><span>Días por semana</span><div class="chips">${[2, 3, 4, 5, 6].map(d => chip('days', d, d, +draft.days === d)).join('')}</div></div>
        <div class="field"><span>Minutos por sesión</span><div class="chips">${[15, 20, 30, 45, 60].map(m => chip('minutes', m, m + ' min', +draft.minutes === m)).join('')}</div></div>`,
      read: f => {
        draft.level = +f.get('level'); draft.days = +f.get('days'); draft.minutes = +f.get('minutes');
        return draft.level ? '' : 'Elige tu nivel.';
      } },
    { key: 'estilo', title: 'Tu estilo de lucha', sub: 'Cada guerrero entrena a su manera.',
      body: () => `
        <div class="field"><span>¿Cuánto aguantas sin parar?</span></div>
        <div class="choices">${Object.entries(STAMINA_INFO).map(([k, [t, s]]) => choice('stamina', k, t, s, +draft.stamina === +k)).join('')}</div>
        <div class="field"><span>¿Qué poder quieres despertar?</span></div>
        <div class="choices">${Object.entries(STYLE_INFO).map(([k, [t, s]]) => choice('style', k, t, s, draft.style === k)).join('')}</div>`,
      read: f => {
        draft.stamina = +f.get('stamina'); draft.style = f.get('style');
        if (!draft.stamina) return 'Dinos cuánto aguantas.';
        return draft.style ? '' : 'Elige tu estilo de lucha.';
      } },
    { key: 'equipo', title: 'Tu arsenal', sub: 'Marca solo lo que tengas: nunca te pondremos ejercicios con equipo que no marcaste. Sin nada también se puede entrenar.',
      body: () => `
        <div class="equip">
          <p class="equip-title">Pesas</p>
          ${['mancuernas', 'pesarusa'].map(k => `
            <div class="equip-item ${draft.equipment[k].length ? 'on' : ''}" data-equip="${k}">
              <b>${k === 'mancuernas' ? 'Mancuernas' : 'Pesas rusas (kettlebell)'}</b>
              <small>Añade cada peso que tengas, en kg${k === 'mancuernas' ? ' (por mancuerna)' : ''}.</small>
              <div class="kg-row"><input type="number" inputmode="decimal" step="0.5" min="0.5" max="100" placeholder="kg" data-kg-input="${k}" aria-label="Añadir peso de ${k === 'mancuernas' ? 'mancuerna' : 'pesa rusa'} en kg">
                <button type="button" class="btn small" data-action="kg-add" data-key="${k}">Añadir</button></div>
              <div class="kg-list">${kgChips(k)}</div>
            </div>`).join('')}
          <div class="grid2">
            ${[['barradisco', 'Barra con discos', 'Peso máximo que puedes cargar (barra + discos)'], ['barraz', 'Barra Z', 'Peso máximo con discos']].map(([k, t, h]) => `
              <label class="field equip-item ${Number(draft.equipment[k]) > 0 ? 'on' : ''}"><span>${t}</span>
                <div class="unit"><input name="${k}" type="number" inputmode="decimal" step="2.5" min="0" max="400" placeholder="No tengo" value="${Number(draft.equipment[k]) > 0 ? draft.equipment[k] : ''}"><em>kg</em></div>
                <small>${h}</small></label>`).join('')}
          </div>
          ${EQUIP_GROUPS.map(([g, keys]) => `<p class="equip-title">${g}</p>
            <div class="chips">${keys.map(k => chip(k, 'on', EQUIPMENT_NAMES[k], !!draft.equipment[k], 'checkbox')).join('')}</div>`).join('')}
        </div>`,
      read: f => {
        ['mancuernas', 'pesarusa'].forEach(k => {
          const v = parseFloat(($(`[data-kg-input="${k}"]`)?.value || '').replace(',', '.'));
          if (v > 0 && v <= 100 && !draft.equipment[k].includes(v)) draft.equipment[k].push(v);
        });
        readEquipChecks(f);
        return '';
      } },
    { key: 'espacio', title: 'Tu campo de entrenamiento', sub: '¿Cuánto espacio tienes? Así no te tocan piques ni zancadas si no caben.',
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

  function readEquipChecks(f) {
    EQUIP_CHECKS.forEach(k => { draft.equipment[k] = f.get(k) === 'on'; });
    ['barradisco', 'barraz'].forEach(k => {
      if (!f.has(k)) return;
      const v = parseFloat(String(f.get(k) || '').replace(',', '.'));
      draft.equipment[k] = v > 0 && v <= 400 ? v : 0;
    });
  }
  let wReturn = 'perfil';
  function startWizard(edit, step = 0) {
    wEditing = !!edit;
    wReturn = tab;
    draft = edit ? JSON.parse(JSON.stringify(Store.profile)) : defaultDraft();
    draft.limits = draft.limits || [];
    draft.equipment = Object.assign(emptyEquipment(), draft.equipment || {});
    wStep = typeof step === 'string' ? Math.max(0, WIZ.findIndex(w => w.key === step)) : step;
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
    if (!wEditing && p.sleep === 1) p.intensity = 0.9; // con poco sueño, empezamos más suave
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
${Cloud.providers.google ? `<button class="btn google block" data-action="auth-google"><svg class="g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Continuar con Google</button>
        <div class="divider"><span>o con tu correo</span></div>` : ""}
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
        <p class="muted small center legal-links">Al continuar aceptas las <a href="terminos.html">condiciones de uso</a> y la <a href="privacidad.html">política de privacidad</a>.</p>
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
    publishSoon();
    checkQuest();
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

  // Foto real del ejercicio (dos fotos que se alternan) o, si no hay, la animación de figura
  function visual(exId, implement, cls) {
    const ex = EXERCISE_BY_ID[exId];
    if (ex && ex.media) {
      return `<div class="photo ${cls}" role="img" aria-label="${esc(ex.name)}">
        <img src="media/${ex.media}/0.jpg" alt="" loading="lazy" decoding="async"><img src="media/${ex.media}/1.jpg" alt="" loading="lazy" decoding="async"></div>`;
    }
    return `<div class="${cls}" data-anim="${exId}" data-impl="${implement || ''}"></div>`;
  }

  // ---------- Hoy ----------
  function exerciseRow(id, p, fmt) {
    const ex = EXERCISE_BY_ID[id];
    if (!ex) return '';
    const d = Generator.dose(ex, p, fmt);
    const amount = d.duration ? `${d.duration} s` : `${d.reps} rep${ex.perSide ? ' por lado' : ''}`;
    const extra = d.kg ? ` · ${d.kg} kg` : (d.implement && d.implement !== 'ninguno' ? ' · ' + EQUIPMENT_NAMES[d.implement] : '');
    return `<li><details><summary><span class="ex-name">${esc(ex.name)}</span><span class="ex-dose">${amount}${esc(extra)}</span></summary>
      ${visual(ex.id, d.implement, 'anim-box')}
      <p>${esc(ex.desc)}</p>${d.tip ? `<p class="tip">${esc(d.tip)}</p>` : ''}</details></li>`;
  }
  function sessionCard(s, p, opts = {}) {
    const steps = Generator.buildSteps(s, p);
    const mins = Generator.estimateMinutes(steps);
    const fmt = Generator.format(p);
    return `
      <article class="card session ${opts.done ? 'done' : ''} ${opts.hero ? 'hero-card sys' : ''}">
        ${opts.hero ? '<p class="sys-tag">Misión diaria</p>' : ''}
        <div class="session-head">
          <div><p class="eyebrow">${esc(opts.eyebrow || DAY[s.day])}</p><h3>${esc(s.title)}</h3></div>
          ${opts.done ? `<span class="badge ok">${ICON.check} Hecha</span>` : `<span class="badge">~${mins} min</span>`}
        </div>
        <p class="muted small">${esc(Generator.describe(s, p))} · ${s.exercises.length} ejercicios</p>
        ${opts.done ? '' : `<p class="reward">Recompensa: <b>+${Leveling.sessionReward({ minutes: mins, exercises: s.exercises, feedback: 'bien' }).xp} XP</b> · Fuerza · Resistencia · Voluntad</p>`}
        ${opts.open ? '' : '<details class="list-toggle"><summary>Ver ejercicios</summary>'}
        <ol class="ex-list">${s.exercises.map(id => exerciseRow(id, p, fmt)).join('')}</ol>
        <p class="muted small">Toca un ejercicio para ver cómo se hace. Incluye ${s.warmup.length} ejercicios de calentamiento y ${s.cooldown.length} de estiramiento.</p>
        <p class="equip-line small"><span>Equipo: ${esc(equipSummary(p))}</span><button class="link-btn" data-action="edit-equip">Cambiar</button></p>
        ${opts.open ? '' : '</details>'}
        <button class="btn ${opts.done ? 'ghost' : 'primary'} block" data-action="start" data-index="${s.index}">${opts.done ? 'Repetir' : `${ICON.play} Aceptar misión`}</button>
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
        ${statusHTML()}
        ${questCardHTML()}
        <div class="speed quote-card"><p>«${esc(quote(Math.floor(Date.now() / 864e5)))}»</p></div>
        <div class="week-bar card">
          <div class="row"><b>Esta semana</b><span>${done.size} de ${plan.sessions.length} sesiones</span></div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div class="dots">${DAY.map((d, i) => {
            const s = plan.sessions.find(x => x.day === i);
            const cls = s ? (done.has(s.index) ? 'done' : 'plan') : '';
            return `<span class="dot ${cls} ${i === todayIdx() ? 'today' : ''}" title="${d}">${d[0]}</span>`;
          }).join('')}</div>
          <div class="row small muted"><span>Racha: <b>${streakWeeks()}</b> semanas cumplidas</span><span>Poder <b>${powerOf().toLocaleString('es')}</b></span></div>
        </div>
        ${next ? sessionCard(next, p, { eyebrow, hero: true, open: true }) : `
          <article class="card hero-card center">
            <h3>¡Arco semanal completado! 🔥</h3>
            <p class="muted">Hiciste todas las sesiones. Descansar también es entrenar: así tu cuerpo se hace más fuerte. Si quieres más, repite alguna desde la pestaña Plan.</p>
            <button class="btn ghost" data-action="tab" data-tab="plan">Ver el plan</button>
          </article>`}
      </section>`;
  }

  // ---------- Poder (estilo shonen) ----------
  function weekCount(k) { return Store.history.filter(h => h.weekKey === k).length; }
  function powerOf() {
    const h = Store.history;
    const minutes = h.reduce((t, x) => t + (x.minutes || 0), 0);
    const base = 100 + h.length * 120 + minutes * 8 + streakWeeks() * 300 + weekCount(weekKeyOf()) * 50 + (lvl().level - 1) * 60;
    return Math.round(base * ((Store.profile && Store.profile.intensity) || 1));
  }
  function buildStats() {
    const p = Store.profile || {};
    const h = Store.history;
    const r = rankOf(h.length);
    return {
      power: powerOf(), rank: r.letter, rankTitle: r.title, playerLevel: lvl().level,
      sessions: h.length, minutes: h.reduce((t, x) => t + (x.minutes || 0), 0),
      streak: streakWeeks(), week: weekCount(weekKeyOf()), weekTarget: p.days || 0,
      intensity: p.intensity || 1, goal: p.goal || '', level: p.level || 0,
      recent: h.slice(-5).reverse().map(x => ({ t: x.title, d: x.date, m: x.minutes, f: x.feedback })),
      lastAt: h.length ? h[h.length - 1].date : null,
    };
  }
  let publishTimer = null;
  function publishSoon() {
    if (!Cloud.user || !Store.profile) return;
    clearTimeout(publishTimer);
    publishTimer = setTimeout(() => Social.publish(buildStats(), Store.settings.nickname).catch(() => {}), 500);
  }
  window.addEventListener('acyz:synced', publishSoon);

  // ---------- Ventana de estado (nivel, XP, estadísticas) ----------
  const lvl = () => Leveling.progress(Store.history, Store.quests);
  function playerName() {
    return Store.settings.nickname || (Cloud.user ? Social.displayNameOf(Cloud.user) : 'Jugador');
  }
  function statusHTML() {
    const g = lvl();
    const r = rankOf(Store.history.length);
    return `<section class="sys status">
      <p class="sys-tag">Estado del jugador</p>
      <div class="status-top">
        <div class="rank-letter">${r.letter}</div>
        <div class="status-id"><small>Nombre</small><b>${esc(playerName())}</b><span class="small muted">Rango ${r.letter} · ${esc(r.title)}</span></div>
        <div class="status-lv"><small>Nivel</small><b>${g.level}</b></div>
      </div>
      <div class="xp"><div class="bar"><i style="width:${g.pct}%"></i></div><span class="small muted">XP ${g.into} / ${g.need} · Poder ${powerOf().toLocaleString('es')}</span></div>
      <div class="stat-grid">${Object.entries(Leveling.STATS).map(([k, s]) => `<div><small>${s.label}</small><b>${g.stats[k]}</b></div>`).join('')}</div>
    </section>`;
  }

  function rankHTML() {
    const r = rankOf(Store.history.length);
    return `<div class="card rank"><div class="rank-letter">${r.letter}</div><div class="rank-info">
      <small>Rango · Poder ${powerOf().toLocaleString('es')}</small><b>${esc(r.title)}</b>
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
        ${statusHTML()}
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
            ${p.activity ? row('Día a día', ACTIVITY_INFO[p.activity][0]) : ''}
            ${p.bodyType ? row('Tu cuerpo', BODY_INFO[p.bodyType][0]) : ''}
            ${p.style ? row('Estilo de lucha', STYLE_INFO[p.style][0] + ' · ' + STAMINA_INFO[p.stamina || 2][0]) : ''}
            ${row('Zonas a cuidar', p.limits.length ? p.limits.map(l => LIMIT_INFO[l]).join(', ') : 'Ninguna')}
            ${p.maxPushups ? row('Máx. flexiones', p.maxPushups) : ''}
            ${p.maxSquats ? row('Máx. sentadillas', p.maxSquats) : ''}
            ${p.bodyFat ? row('% de grasa', p.bodyFat + ' %') : ''}
          </ul>
          <button class="btn primary" data-action="edit-profile">Editar mis datos</button>
        </div>
        <div class="card">
          <h3>Intensidad: ${Math.round((p.intensity || 1) * 100)}%</h3>
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
        <p class="muted small center">Acyz Lab · versión 1 · fotos de ejercicios: Free Exercise DB (dominio público) · ${Cloud.user ? 'tus datos se guardan en tu cuenta' : 'tus datos se guardan en este dispositivo'}</p>
        <p class="muted small center legal-links"><a href="privacidad.html">Privacidad</a> · <a href="terminos.html">Condiciones</a></p>
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

  // ---------- Misiones sorpresa ----------
  const todayKey = () => ymd(new Date());
  function currentQuest() {
    const q = Store.quests.find(x => x.date === todayKey() && x.status !== 'ninguna');
    if (!q) return null;
    if ((q.status === 'nueva' || q.status === 'activa') && Date.now() > new Date(q.expiresAt).getTime()) {
      q.status = 'fallida'; Store.saveQuest(q);
    }
    return q;
  }
  function checkQuest() {
    if (!Store.profile || W.session || Pin.isOpen()) return;
    const now = new Date();
    let q = Store.quests.find(x => x.date === todayKey());
    if (!q) {
      const win = Leveling.questSlot(Store.history);
      if (!win || now.getHours() < win.from || now.getHours() >= win.to) return; // aún no es la franja
      q = Leveling.planQuest(Store.profile, Store.history, now, (Cloud.user && Cloud.user.id) || 'local');
      Store.saveQuest(q || { id: todayKey() + '-ninguna', date: todayKey(), status: 'ninguna' });
      if (!q) return;
    }
    q = currentQuest();
    if (q && q.status === 'nueva' && now >= new Date(q.appearAt) && !q.shown) {
      q.shown = true; Store.saveQuest(q);
      showQuestPopup(q);
      if (tab === 'hoy' && !tabbar.hidden) viewHoy();
    }
  }
  setInterval(checkQuest, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(checkQuest, 800); });

  const unitTxt = t => t.unit === 'min' ? `${t.target} min` : t.unit === 's' ? `${t.target} s` : `× ${t.target}`;
  const hhmm = iso => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  function questTasksHTML(q, interactive) {
    return `<ul class="quest-tasks">${q.tasks.map((t, i) => `
      <li class="${t.done ? 'done' : ''}">
        ${interactive ? `<button class="quest-check" data-action="quest-task" data-i="${i}" aria-pressed="${t.done}" aria-label="Marcar ${esc(t.label)}">${t.done ? ICON.check : ''}</button>` : '<span class="quest-dot"></span>'}
        <span class="quest-name">${esc(t.label)}</span><b>${unitTxt(t)}</b></li>`).join('')}</ul>`;
  }
  function questCardHTML() {
    const q = currentQuest();
    if (!q || !(q.status === 'nueva' && q.shown) && q.status !== 'activa' && q.status !== 'completada' && q.status !== 'fallida') return '';
    if (q.status === 'completada') return `<section class="sys quest done"><p class="sys-tag">Misión sorpresa · completada</p><p class="small">Ganaste <b>+${q.xp} XP</b>. Vuelve mañana: el sistema siempre vigila.</p></section>`;
    if (q.status === 'fallida') return `<section class="sys quest failed"><p class="sys-tag">Misión sorpresa · tiempo agotado</p><p class="small muted">Esta vez se escapó. La próxima no se te escapa.</p></section>`;
    const left = q.tasks.filter(t => !t.done).length;
    return `<section class="sys quest">
      <p class="sys-tag">⚠ Misión sorpresa</p>
      <p class="small">Complétala antes de las <b>${hhmm(q.expiresAt)}</b>. Recompensa: <b>+${q.xp} XP</b> y estadísticas.</p>
      ${questTasksHTML(q, true)}
      <p class="small muted">${left ? `Te ${left === 1 ? 'falta 1 objetivo' : `faltan ${left} objetivos`}. Toca cada uno cuando lo termines.` : ''}</p>
    </section>`;
  }
  function showQuestPopup(q) {
    const ov = document.createElement('div');
    ov.id = 'quest-popup'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `
      <div class="sys quest-pop">
        <p class="sys-tag">⚠ Alerta del sistema</p>
        <h2>¡Ha aparecido una misión sorpresa!</h2>
        <p class="muted">Ejercicios suaves para subir tu personaje. Tienes hasta las <b>${hhmm(q.expiresAt)}</b>.</p>
        ${questTasksHTML(q, false)}
        <p class="reward">Recompensa: <b>+${q.xp} XP</b> · ${Object.keys(q.stats).map(k => `+${q.stats[k]} ${Leveling.STATS[k].short}`).join(' · ')}</p>
        <div class="row-btns center-btns">
          <button class="btn ghost" data-action="quest-later">Más tarde</button>
          <button class="btn primary" data-action="quest-accept">Aceptar misión</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    beep(880, 120); setTimeout(() => beep(1175, 160), 140);
  }
  function closeQuestPopup() { $('#quest-popup')?.remove(); }
  function toggleQuestTask(i) {
    const q = currentQuest();
    if (!q || (q.status !== 'activa' && q.status !== 'nueva')) return;
    const before = lvl().level;
    q.status = 'activa';
    q.tasks[i].done = !q.tasks[i].done;
    if (q.tasks.every(t => t.done)) {
      q.status = 'completada'; q.completedAt = new Date().toISOString();
      Store.saveQuest(q);
      const after = lvl().level;
      toast(after > before ? `¡Misión completada! +${q.xp} XP · ¡Subiste al nivel ${after}!` : `¡Misión completada! +${q.xp} XP`);
      beep(784, 150); setTimeout(() => beep(1047, 250), 160);
      publishSoon();
    } else Store.saveQuest(q);
    viewHoy();
  }

  // ---------- Amigos ----------
  const GOAL_SHORT = { grasa: 'Perder grasa', musculo: 'Ganar músculo', fuerza: 'Fuerza', resistencia: 'Resistencia', forma: 'En forma' };
  let social = null;
  const fmtN = n => Number(n || 0).toLocaleString('es');
  const initial = name => esc((name || '?').trim().charAt(0).toUpperCase());

  async function viewAmigos() {
    if (!Cloud.enabled || !Cloud.user) {
      app.innerHTML = `<section><h1 class="hero">Amigos</h1>
        <div class="card center"><h3>Entrena junto a tus amigos</h3>
          <p class="muted">Para añadir amigos y competir en el ranking de poder necesitas una cuenta.</p>
          ${Cloud.enabled ? '<button class="btn primary" data-action="auth-open">Entrar o crear cuenta</button>' : ''}</div></section>`;
      return;
    }
    app.innerHTML = `<section><h1 class="hero">Amigos</h1><div class="card"><p class="muted">Cargando a tus rivales…</p></div></section>`;
    try {
      await Social.publish(buildStats(), Store.settings.nickname);
      social = await Social.load();
    } catch (e) {
      console.warn(e);
      app.innerHTML = `<section><h1 class="hero">Amigos</h1><div class="card"><h3>Sin conexión</h3>
        <p class="muted">No pudimos cargar tus amigos. Revisa tu internet e inténtalo de nuevo.</p>
        <button class="btn ghost" data-action="tab" data-tab="amigos">Reintentar</button></div></section>`;
      return;
    }
    if (tab !== 'amigos') return;
    const mine = { profile: social.me || { user_id: Cloud.user.id, display_name: Social.displayNameOf(Cloud.user, Store.settings.nickname), stats: buildStats() }, isMe: true };
    mine.profile.stats = buildStats();
    const ranking = [mine, ...social.friends].sort((a, b) => (b.profile.stats.power || 0) - (a.profile.stats.power || 0));
    const myPos = ranking.indexOf(mine) + 1;
    app.innerHTML = `
      <section>
        <h1 class="hero">Amigos</h1>
        <div class="speed quote-card"><p>${social.friends.length
          ? (myPos === 1 ? '«Estás en la cima. Ahora todos van a por ti.»' : `«Vas ${myPos}.º de ${ranking.length}. Tu rival te espera: ¡supéralo!»`)
          : '«Un verdadero guerrero necesita rivales. ¡Invita a tus amigos!»'}</p></div>

        <div class="card">
          <h3>Ranking de poder</h3>
          <ol class="ranking">${ranking.map((x, i) => {
            const s = x.profile.stats || {};
            return `<li class="${x.isMe ? 'me' : ''}" ${x.isMe ? '' : `data-action="vs" data-id="${x.id}" role="button" tabindex="0"`}>
              <span class="pos">${i + 1}</span>
              <span class="avatar">${initial(x.profile.display_name)}</span>
              <span class="who"><b>${esc(x.profile.display_name)}${x.isMe ? ' (tú)' : ''}</b><small>Rango ${esc(s.rank || 'E')} · ${fmtN(s.week)} esta semana · racha ${fmtN(s.streak)}</small></span>
              <span class="pow"><b>${fmtN(s.power)}</b><small>poder</small></span>
            </li>`;
          }).join('')}</ol>
          ${social.friends.length ? '<p class="muted small">Toca a un amigo para ver el cara a cara.</p>' : ''}
        </div>

        ${social.incoming.length ? `<div class="card"><h3>Solicitudes recibidas</h3><ul class="history">${social.incoming.map(x => `
          <li><div><b>${esc(x.profile.display_name)}</b><small>${esc(x.profile.email || '')} quiere ser tu rival</small></div>
            <span class="row-btns"><button class="btn primary small" data-action="friend-accept" data-id="${x.id}">Aceptar</button>
            <button class="link" data-action="friend-remove" data-id="${x.id}" aria-label="Rechazar">×</button></span></li>`).join('')}</ul></div>` : ''}

        <div class="card">
          <h3>Añadir amigo</h3>
          <p class="muted small">Escribe el correo con el que tu amigo entró en Acyz Lab (el de Google o el que registró).</p>
          <form id="friend-form" class="kg-row">
            <input name="email" type="email" inputmode="email" autocomplete="off" placeholder="correo@ejemplo.com" aria-label="Correo de tu amigo" required>
            <button class="btn primary small">Buscar</button>
          </form>
          <div id="friend-result"></div>
          ${social.outgoing.length ? `<p class="small muted" style="margin-top:12px">Esperando respuesta:</p><ul class="history">${social.outgoing.map(x => `
            <li><div><b>${esc(x.profile.display_name)}</b><small>Solicitud enviada</small></div>
              <button class="link-btn" data-action="friend-remove" data-id="${x.id}">Cancelar</button></li>`).join('')}</ul>` : ''}
        </div>

        <div class="card">
          <h3>Tu nombre de luchador</h3>
          <form id="nick-form" class="kg-row">
            <input name="nick" maxlength="40" value="${esc(mine.profile.display_name)}" aria-label="Tu nombre de luchador">
            <button class="btn ghost small">Guardar</button>
          </form>
          <p class="muted small">Así te verán tus amigos en el ranking.</p>
        </div>
        <button class="btn ghost block" data-action="tab" data-tab="amigos">Actualizar</button>
      </section>`;
  }

  function vsRow(label, a, b, fmt = fmtN, higherWins = true) {
    const win = a === b ? 0 : ((a > b) === higherWins ? 1 : 2);
    return `<div class="vs-row"><b class="${win === 1 ? 'win' : ''}">${fmt(a)}</b><span>${label}</span><b class="${win === 2 ? 'win' : ''}">${fmt(b)}</b></div>`;
  }
  function openVs(id) {
    const f = social && social.friends.find(x => String(x.id) === String(id));
    if (!f) return;
    const a = buildStats(), b = f.profile.stats || {};
    const myName = esc(Social.displayNameOf(Cloud.user, Store.settings.nickname));
    const name = esc(f.profile.display_name);
    const verdict = a.power === b.power ? '¡Empate de poder! El próximo entreno decide.'
      : a.power > b.power ? `¡Tu poder supera al de ${name}! Mantén el ritmo.` : `¡${name} lleva ventaja! Entrena para superar su poder.`;
    const ov = document.createElement('div');
    ov.id = 'vs-screen'; ov.className = 'speed burst'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `
      <div class="vs-wrap">
        <button class="icon-btn vs-close" data-action="vs-close" aria-label="Cerrar">${ICON.close}</button>
        <div class="vs-head">
          <div><span class="avatar big">${initial(myName)}</span><b>${myName}</b><small>Rango ${esc(a.rank)}</small></div>
          <em>VS</em>
          <div><span class="avatar big rival">${initial(name)}</span><b>${name}</b><small>Rango ${esc(b.rank || 'E')}</small></div>
        </div>
        <div class="vs-power"><b class="${a.power >= b.power ? 'win' : ''}">${fmtN(a.power)}</b><span>PODER</span><b class="${(b.power || 0) >= a.power ? 'win' : ''}">${fmtN(b.power)}</b></div>
        <div class="vs-table">
          ${vsRow('Sesiones esta semana', a.week, b.week || 0)}
          ${vsRow('Sesiones en total', a.sessions, b.sessions || 0)}
          ${vsRow('Minutos entrenados', a.minutes, b.minutes || 0)}
          ${vsRow('Racha (semanas)', a.streak, b.streak || 0)}
          ${vsRow('Intensidad', a.intensity, b.intensity || 1, v => Math.round((v || 1) * 100) + '%')}
        </div>
        <p class="vs-verdict">${verdict}</p>
        <div class="card vs-recent"><h3>Últimas clases de ${name}</h3>
          ${(b.recent || []).length ? `<ul class="history">${b.recent.map(r => `<li><div><b>${esc(r.t)}</b><small>${esc(fmtDate(r.d))} · ${fmtN(r.m)} min</small></div><span class="badge feel-${esc(r.f)}">${FEEL[r.f] || ''}</span></li>`).join('')}</ul>`
            : '<p class="muted small">Todavía no ha terminado ninguna sesión.</p>'}
          ${b.goal ? `<p class="muted small">Objetivo: ${esc(GOAL_SHORT[b.goal] || b.goal)}</p>` : ''}
        </div>
        <button class="link-btn vs-remove" data-action="friend-remove" data-id="${f.id}" data-confirm="1">Quitar de amigos</button>
      </div>`;
    document.body.appendChild(ov);
    document.body.classList.add('no-scroll');
  }
  function closeVs() { $('#vs-screen')?.remove(); document.body.classList.remove('no-scroll'); }

  app.addEventListener('submit', async e => {
    if (e.target.id === 'friend-form') {
      e.preventDefault();
      const out = $('#friend-result');
      const email = String(new FormData(e.target).get('email') || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) { out.innerHTML = '<p class="error">Escribe un correo válido.</p>'; return; }
      if (email === (Cloud.user.email || '').toLowerCase()) { out.innerHTML = '<p class="error">Ese eres tú. ¡Tu rival más difícil!</p>'; return; }
      out.innerHTML = '<p class="muted small">Buscando…</p>';
      try {
        const found = await Social.find(email);
        if (!found) { out.innerHTML = '<p class="muted small">No encontramos a nadie con ese correo. Pídele que entre primero en Acyz Lab con su cuenta.</p>'; return; }
        const already = [...social.friends, ...social.incoming, ...social.outgoing].find(x => x.profile.user_id === found.user_id);
        out.innerHTML = `<div class="found"><span class="avatar">${initial(found.display_name)}</span><b>${esc(found.display_name)}</b>
          ${already ? '<span class="badge">Ya conectados</span>' : `<button class="btn primary small" data-action="friend-add" data-uid="${found.user_id}">Agregar</button>`}</div>`;
      } catch (err) { console.warn(err); out.innerHTML = '<p class="error">No se pudo buscar. Revisa tu conexión.</p>'; }
    }
    if (e.target.id === 'nick-form') {
      e.preventDefault();
      const nick = String(new FormData(e.target).get('nick') || '').trim().slice(0, 40);
      Store.saveSettings({ nickname: nick });
      await Social.publish(buildStats(), nick).catch(() => {});
      toast('Nombre de luchador guardado.');
      viewAmigos();
    }
  });

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
    const anim = animStep && animStep.exId ? visual(animStep.exId, animStep.implement, 'w-anim' + (isRest ? ' mini' : '')) : '';
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
    const reward = Leveling.sessionReward({ minutes, exercises: W.session.exercises, feedback: 'bien', duel: !!W.duel });
    const lvBefore = lvl().level;
    const lvAfter = Leveling.progress(Store.history.concat({ minutes, exercises: W.session.exercises, feedback: 'bien', duel: !!W.duel }), Store.quests).level;
    ov.className = 'finish speed burst';
    ov.innerHTML = `
      <div class="w-body center">
        <p class="sys-tag">Misión completada</p>
        <h2 class="w-name">¡Límite superado! 🔥</h2>
        <p class="reward big">+${reward.xp} XP · +${reward.stats.fuerza} FUE · +${reward.stats.agilidad} AGI · +${reward.stats.resistencia} RES · +${reward.stats.voluntad} VOL</p>
        ${lvAfter > lvBefore ? `<p class="rank-up">¡SUBISTE DE NIVEL! Nivel ${lvBefore} → <b>${lvAfter}</b></p>` : ''}
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
      case 'edit-equip': startWizard(true, 'equipo'); break;
      case 'kg-add': {
        const k = el.dataset.key, inp = $(`[data-kg-input="${k}"]`);
        const v = parseFloat((inp.value || '').replace(',', '.'));
        if (!(v > 0 && v <= 100)) { inp.focus(); return; }
        if (!draft.equipment[k].includes(v)) draft.equipment[k].push(v);
        readEquipChecks(new FormData($('#wiz')));
        renderWizard(); $(`[data-kg-input="${k}"]`).focus(); break;
      }
      case 'kg-del': {
        const k = el.dataset.key;
        draft.equipment[k] = draft.equipment[k].filter(x => x !== +el.dataset.kg);
        readEquipChecks(new FormData($('#wiz')));
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
      case 'quest-accept': {
        const q = currentQuest(); if (q) { q.status = 'activa'; Store.saveQuest(q); }
        closeQuestPopup(); go('hoy'); toast('Misión aceptada. ¡A por ella!'); break;
      }
      case 'quest-later': closeQuestPopup(); if (tab === 'hoy') viewHoy(); break;
      case 'quest-task': toggleQuestTask(+el.dataset.i); break;
      case 'vs': openVs(el.dataset.id); break;
      case 'vs-close': closeVs(); break;
      case 'friend-add':
        el.disabled = true;
        Social.request(el.dataset.uid).then(() => { toast('¡Solicitud enviada! Cuando acepte, aparecerá en tu ranking.'); viewAmigos(); })
          .catch(err => { el.disabled = false; console.warn(err); toast('No se pudo enviar la solicitud.'); });
        break;
      case 'friend-accept':
        Social.accept(el.dataset.id).then(() => { toast('¡Nuevo rival en tu ranking!'); viewAmigos(); }).catch(() => toast('No se pudo aceptar.'));
        break;
      case 'friend-remove':
        if (el.dataset.confirm && !confirm('¿Quitar a este amigo? Dejaréis de ver vuestro progreso.')) break;
        Social.remove(el.dataset.id).then(() => { closeVs(); viewAmigos(); }).catch(() => toast('No se pudo completar.'));
        break;
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
