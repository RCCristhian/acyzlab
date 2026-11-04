/*
 * Nivel, experiencia (XP), estadísticas y misiones sorpresa.
 * Solo cálculos: recibe el historial y el perfil y devuelve datos.
 */
const Leveling = (() => {
  const STATS = {
    fuerza: { label: 'Fuerza', short: 'FUE' },
    agilidad: { label: 'Agilidad', short: 'AGI' },
    resistencia: { label: 'Resistencia', short: 'RES' },
    voluntad: { label: 'Voluntad', short: 'VOL' },
  };
  const FEEL_MULT = { facil: 0.9, bien: 1, dificil: 1.2 };

  /** XP y puntos de estadística que da una sesión terminada. */
  function sessionReward(rec) {
    const xp = Math.round((60 + (rec.minutes || 0) * 6) * (FEEL_MULT[rec.feedback] || 1) + (rec.duel ? 40 : 0));
    const st = { fuerza: 0, agilidad: 0, resistencia: Math.max(1, Math.round((rec.minutes || 0) / 10)), voluntad: 1 };
    (rec.exercises || []).forEach(id => {
      const ex = typeof EXERCISE_BY_ID !== 'undefined' ? EXERCISE_BY_ID[id] : null;
      if (!ex) return;
      if (ex.group === 'cardio') st.agilidad += 1;
      else if (ex.group === 'core') st.voluntad += 0.5;
      else st.fuerza += 1;
    });
    st.fuerza = Math.round(st.fuerza / 2); st.agilidad = Math.round(st.agilidad); st.voluntad = Math.round(st.voluntad);
    return { xp, stats: st };
  }

  const need = level => 120 + (level - 1) * 40; // XP para pasar del nivel `level` al siguiente

  /** Nivel actual, XP dentro del nivel y estadísticas totales. */
  function progress(history = [], quests = []) {
    let xp = 0;
    const stats = { fuerza: 5, agilidad: 5, resistencia: 5, voluntad: 5 };
    const add = r => { xp += r.xp; for (const k in r.stats) stats[k] += r.stats[k] || 0; };
    history.forEach(h => add(sessionReward(h)));
    quests.filter(q => q.status === 'completada').forEach(q => add({ xp: q.xp, stats: q.stats || {} }));
    let level = 1, rest = xp;
    while (rest >= need(level)) { rest -= need(level); level++; }
    return { xp, level, into: rest, need: need(level), pct: Math.round(rest / need(level) * 100), stats };
  }

  // ---------- Misiones sorpresa ----------
  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  /** ¿Cuándo sueles entrenar? Devuelve la franja de las misiones sorpresa (la contraria). */
  function questSlot(history) {
    const last = history.slice(-6);
    if (!last.length) return null;
    const hours = last.map(h => new Date(h.date).getHours());
    const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
    // entrena de tarde/noche → misión por la mañana (5:00 a 9:00); de mañana o mediodía → por la noche (19:00 a 23:59)
    return avg >= 15 ? { slot: 'manana', from: 5, to: 9, label: 'antes de las 9:00' } : { slot: 'noche', from: 19, to: 24, label: 'antes de medianoche' };
  }

  const TASKS = [
    { id: 'flexiones', label: 'Flexiones', unit: 'rep', amount: [10, 20, 30], avoid: 'hombros', media: 'Pushups' },
    { id: 'sentadillas', label: 'Sentadillas', unit: 'rep', amount: [25, 40, 60], avoid: 'rodillas', media: 'Bodyweight_Squat' },
    { id: 'abdominales', label: 'Abdominales (crunches)', unit: 'rep', amount: [25, 40, 50], media: 'Air_Bike' },
    { id: 'plancha', label: 'Plancha', unit: 's', amount: [40, 60, 90], media: 'Plank' },
    { id: 'zancadas', label: 'Zancadas (total)', unit: 'rep', amount: [16, 24, 30], avoid: 'rodillas', media: 'Bodyweight_Walking_Lunge' },
    { id: 'puente', label: 'Puentes de glúteo', unit: 'rep', amount: [20, 30, 40], media: 'Butt_Lift_Bridge' },
    { id: 'caminata', label: 'Caminata a paso rápido', unit: 'min', amount: [15, 20, 25] },
    { id: 'dominadas', label: 'Dominadas', unit: 'rep', amount: [0, 6, 10], needs: 'barra', minLevel: 2, avoid: 'hombros', media: 'Pullups' },
    { id: 'colgarse', label: 'Colgarte de la barra', unit: 's', amount: [30, 45, 60], needs: 'barra', media: null },
    { id: 'bici', label: 'Bicicleta estática suave', unit: 'min', amount: [15, 15, 20], needs: 'bici', media: 'Recumbent_Bike' },
    { id: 'cinta', label: 'Caminar en la cinta inclinada', unit: 'min', amount: [15, 15, 20], needs: 'cinta', media: 'Jogging_Treadmill' },
    { id: 'eliptica', label: 'Elíptica suave', unit: 'min', amount: [15, 15, 20], needs: 'eliptica', media: 'Elliptical_Trainer' },
    { id: 'comba', label: 'Saltar la cuerda', unit: 'min', amount: [3, 4, 5], needs: 'cuerda', avoid: 'rodillas', media: 'Rope_Jumping' },
    { id: 'rueda', label: 'Rueda abdominal', unit: 'rep', amount: [6, 10, 15], needs: 'rodillo', avoid: 'espalda', media: 'Ab_Roller' },
  ];
  const TASK_STAT = { flexiones: 'fuerza', sentadillas: 'fuerza', dominadas: 'fuerza', zancadas: 'fuerza', puente: 'fuerza', abdominales: 'voluntad', plancha: 'voluntad', rueda: 'voluntad', colgarse: 'voluntad', caminata: 'resistencia', bici: 'resistencia', cinta: 'resistencia', eliptica: 'resistencia', comba: 'agilidad' };

  /**
   * Decide si hoy aparece una misión sorpresa y cuándo.
   * Devuelve null o { id, date, slot, appearAt, expiresAt, tasks, xp, stats }.
   */
  function planQuest(profile, history, now = new Date(), seedExtra = '') {
    if (!profile || history.length < 1) return null;
    const win = questSlot(history);
    if (!win) return null;
    const date = ymd(now);
    const rand = rng(hashString(date + '|' + seedExtra));
    // más probable si el último entreno fue ligero (fácil o corto) en los últimos 2 días
    const recent = history.filter(h => now - new Date(h.date) < 2 * 864e5);
    const light = recent.some(h => h.feedback === 'facil' || (h.minutes || 0) < 20);
    const chance = light ? 0.7 : 0.35;
    if (rand() > chance) return null;
    const start = new Date(now); start.setHours(win.from, 0, 0, 0);
    const end = new Date(now); end.setHours(win.to === 24 ? 23 : win.to, win.to === 24 ? 59 : 0, 0, 0);
    const appearAt = new Date(start.getTime() + rand() * Math.max(0, (end - start) - 75 * 60000));
    const L = profile.level || 1;
    const eq = profile.equipment || {};
    const limits = profile.limits || [];
    const pool = TASKS.filter(t => (!t.needs || eq[t.needs]) && (!t.avoid || !limits.includes(t.avoid)) && (t.minLevel || 1) <= L && t.amount[L - 1] > 0);
    // preferimos al menos una con máquina si la tiene (bici, cinta...)
    const ordered = pool.map(t => [rand() + (t.needs ? 0.25 : 0), t]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    const n = L === 1 ? 2 : 3;
    const tasks = ordered.slice(0, n).map(t => ({ id: t.id, label: t.label, unit: t.unit, target: t.amount[L - 1], media: t.media || null, done: false }));
    const stats = {};
    tasks.forEach(t => { const k = TASK_STAT[t.id]; stats[k] = (stats[k] || 0) + 1; });
    stats.voluntad = (stats.voluntad || 0) + 1;
    return { id: `${date}-${win.slot}`, date, slot: win.slot, slotLabel: win.label, appearAt: appearAt.toISOString(), expiresAt: end.toISOString(), tasks, xp: 60 + tasks.length * 25, stats, status: 'nueva' };
  }

  return { STATS, sessionReward, progress, planQuest, questSlot };
})();
