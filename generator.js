/*
 * Generador: métricas (IMC, metabolismo, calorías), plan semanal y pasos del entrenamiento.
 * No toca el almacenamiento: recibe el perfil y devuelve datos.
 */
const Generator = (() => {
  const GOALS = {
    grasa:       { label: 'Perder grasa',     format: 'circuito' },
    musculo:     { label: 'Ganar músculo',    format: 'series' },
    fuerza:      { label: 'Ganar fuerza',     format: 'series' },
    resistencia: { label: 'Resistencia',      format: 'circuito' },
    forma:       { label: 'Mantenerse en forma', format: 'series' },
  };
  const LEVELS = { 1: 'Principiante', 2: 'Intermedio', 3: 'Avanzado' };
  const WARMUP_SEC = 40;
  const STRETCH_SEC = 40;

  // ---------- Métricas ----------
  function metrics(p) {
    const h = p.height / 100;
    const bmi = p.weight / (h * h);
    let bmiLabel = 'Peso saludable';
    if (bmi < 18.5) bmiLabel = 'Bajo peso';
    else if (bmi >= 30) bmiLabel = 'Obesidad';
    else if (bmi >= 25) bmiLabel = 'Sobrepeso';

    // Mifflin-St Jeor
    let bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? -161 : 5);
    let formula = 'Mifflin-St Jeor';
    // Si se conoce el % de grasa, Katch-McArdle es más exacta
    if (p.bodyFat > 3 && p.bodyFat < 60) {
      const lean = p.weight * (1 - p.bodyFat / 100);
      bmr = 370 + 21.6 * lean;
      formula = 'Katch-McArdle (usa tu % de grasa)';
    }
    // actividad: tu día a día (si lo respondiste) + los días de entreno
    const activity = p.activity
      ? [1.2, 1.35, 1.5, 1.65][p.activity - 1] + p.days * 0.035
      : (p.days <= 2 ? 1.375 : p.days <= 4 ? 1.465 : 1.55);
    const maintenance = bmr * activity;
    let adj = { grasa: -0.18, musculo: 0.1, fuerza: 0.05, resistencia: 0.05, forma: 0 }[p.goal] || 0;
    // tipo de cuerpo: si te cuesta subir de peso, un poco más; si te cuesta bajar, un poco menos
    if (p.bodyType === 'subir') adj += p.goal === 'grasa' ? 0.05 : 0.05;
    if (p.bodyType === 'bajar') adj -= p.goal === 'musculo' ? 0.05 : 0.03;
    let target = maintenance * (1 + adj);
    if (p.goal === 'grasa') target = Math.max(target, maintenance - 600, bmr);
    const round10 = n => Math.round(n / 10) * 10;
    return {
      bmi: Math.round(bmi * 10) / 10, bmiLabel,
      bmr: Math.round(bmr), formula,
      maintenance: round10(maintenance),
      target: round10(target),
      protein: Math.round(p.weight * (p.goal === 'musculo' || p.goal === 'fuerza' ? 1.8 : 1.4)),
    };
  }

  // ---------- Utilidades ----------
  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const WEIGHTS = ['mancuernas', 'pesarusa', 'barradisco', 'barraz'];
  function hasEquip(p, key) {
    if (key === 'ninguno') return true;
    const e = p.equipment || {};
    if (key === 'mancuernas' || key === 'pesarusa') return Array.isArray(e[key]) && e[key].length > 0;
    if (key === 'barradisco' || key === 'barraz') return Number(e[key]) > 0; // peso máximo que puedes cargar
    return !!e[key];
  }
  // Pesos posibles de cada implemento (para la barra: de la barra sola hasta tu máximo, de 2,5 en 2,5 kg)
  function weightsOf(p, imp) {
    const e = p.equipment || {};
    if (imp === 'barradisco' || imp === 'barraz') {
      const min = imp === 'barradisco' ? 20 : 10, max = Number(e[imp]) || 0, out = [];
      for (let w = min; w <= max + 0.01; w += 2.5) out.push(w);
      return out.length ? out : (max ? [max] : []);
    }
    return (e[imp] || []).slice().sort((a, b) => a - b);
  }

  // Implemento con el que se hará el ejercicio (prefiere pesas si las hay)
  // Si hay varias pesas posibles, elige la que mejor encaja con el peso sugerido;
  // si todas son demasiado pesadas y el ejercicio se puede hacer sin peso, sin peso.
  function implementFor(ex, p) {
    const weighted = ex.equip.filter(k => WEIGHTS.includes(k) && hasEquip(p, k));
    if (weighted.length && ex.kgFactor) {
      const scored = weighted.map(k => {
        const s = suggestKg(ex, p, k);
        return { k, s, err: s ? Math.abs(Math.log(s.kg / s.target)) : 9 };
      }).sort((a, b) => a.err - b.err);
      const best = scored[0];
      if (best.s && best.s.heavy && ex.equip.includes('ninguno')) return 'ninguno';
      return best.k;
    }
    if (weighted.length) return weighted[0];
    return ex.equip.find(k => hasEquip(p, k)) || null;
  }

  function allowed(ex, p) {
    if (!implementFor(ex, p)) return false;
    if (ex.needs && !ex.needs.every(k => hasEquip(p, k))) return false;
    if (ex.needsAny && !ex.needsAny.some(k => hasEquip(p, k))) return false;
    if ((ex.space || 1) > (p.space || 1)) return false;
    if ((p.limits || []).some(l => ex.loads.includes(l))) return false;
    return true;
  }

  // ---------- Plan semanal ----------
  const TEMPLATES = {
    full:      ['piernas', 'empuje', 'traccion', 'core', 'cardio', 'piernas', 'empuje', 'traccion', 'core', 'cardio'],
    superior:  ['empuje', 'traccion', 'empuje', 'traccion', 'core', 'empuje', 'traccion', 'core', 'cardio'],
    inferior:  ['piernas', 'piernas', 'core', 'piernas', 'cardio', 'core', 'piernas', 'cardio'],
    empuje:    ['empuje', 'empuje', 'core', 'empuje', 'cardio', 'empuje', 'core'],
    traccion:  ['traccion', 'traccion', 'core', 'traccion', 'cardio', 'traccion', 'core'],
    piernas:   ['piernas', 'piernas', 'core', 'piernas', 'cardio', 'piernas', 'core'],
  };
  const TITLES = { full: 'Cuerpo completo', superior: 'Tren superior', inferior: 'Tren inferior', empuje: 'Empuje', traccion: 'Tracción', piernas: 'Piernas' };
  const SPLITS = {
    2: ['full', 'full'],
    3: ['full', 'full', 'full'],
    4: ['superior', 'inferior', 'superior', 'inferior'],
    5: ['empuje', 'traccion', 'piernas', 'superior', 'inferior'],
    6: ['empuje', 'traccion', 'piernas', 'empuje', 'traccion', 'piernas'],
  };
  // Días sugeridos (0 = lunes)
  const DAYS = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
  const SPLIT_NAMES = { 2: 'Cuerpo completo', 3: 'Cuerpo completo', 4: 'Superior / inferior', 5: 'Empuje / tracción / piernas + superior / inferior', 6: 'Empuje / tracción / piernas' };

  function format(p) {
    const f = GOALS[p.goal].format;
    const L = p.level;
    const k = p.intensity || 1;
    if (f === 'circuito') {
      const base = p.goal === 'resistencia'
        ? [[40, 20], [45, 15], [50, 10]][L - 1]
        : [[30, 30], [40, 20], [45, 15]][L - 1];
      const st = { 1: [-5, 5], 2: [0, 0], 3: [5, -5] }[p.stamina || 2]; // cuánto aguantas sin parar
      const work = clamp(Math.round((base[0] + st[0]) * k / 5) * 5, 20, 60);
      const rest = clamp(Math.round((base[1] + st[1]) / k / 5) * 5, 10, 40);
      return { kind: 'circuito', work, rest, roundRest: 60 };
    }
    const cfg = {
      musculo: { sets: [3, 3, 4][L - 1], reps: [10, 12, 12][L - 1], rest: 75 },
      fuerza:  { sets: [3, 4, 5][L - 1], reps: [6, 6, 5][L - 1], rest: 120 },
      forma:   { sets: [2, 3, 3][L - 1], reps: [10, 12, 12][L - 1], rest: 60 },
    }[p.goal];
    let sets = cfg.sets;
    let rest = Math.round(cfg.rest / Math.sqrt(k) / 5) * 5;
    // Si hay poco tiempo, menos series y descansos más cortos para que quepan al menos 3 ejercicios
    const mainSec = mainSeconds(p);
    while (sets > 2 && 3 * sets * (SET_SEC + rest) > mainSec) sets--;
    // Si sobra mucho tiempo (sesiones largas), una serie más
    while (sets < 5 && 8 * sets * (SET_SEC + rest) < mainSec * 0.8) sets++;
    if (3 * sets * (SET_SEC + rest) > mainSec) rest = Math.max(30, Math.floor(mainSec / (3 * sets) - SET_SEC) / 5 * 5);
    return { kind: 'series', sets, reps: Math.max(3, Math.round(cfg.reps * k)), rest: Math.round(rest / 5) * 5 };
  }

  const SET_SEC = 50; // duración aproximada de una serie
  function mainSeconds(p) {
    const warm = p.minutes <= 20 ? 4 : 5;
    const cool = p.minutes <= 20 ? 3 : 4;
    return Math.max(5 * 60, p.minutes * 60 - warm * WARMUP_SEC - cool * STRETCH_SEC - 40);
  }

  function counts(p, fmt) {
    const warm = p.minutes <= 20 ? 4 : 5;
    const cool = p.minutes <= 20 ? 3 : 4;
    const mainSec = mainSeconds(p);
    let n, rounds = null;
    if (fmt.kind === 'circuito') {
      const per = fmt.work + fmt.rest;
      n = clamp(Math.round(mainSec / (per * 3 + 20)), 4, 10);
      rounds = clamp(Math.floor((mainSec + fmt.roundRest) / (n * per + fmt.roundRest)), 2, 6);
    } else {
      const perEx = fmt.sets * (SET_SEC + fmt.rest);
      n = clamp(Math.floor(mainSec / perEx), 3, 8);
    }
    return { warm, cool, n, rounds };
  }

  function pick(pool, rand, p, used, scoreExtra) {
    let best = null, bestScore = -Infinity;
    for (const ex of pool) {
      if (used.has(ex.id)) continue;
      let s = rand() + (scoreExtra ? scoreExtra(ex) : 0);
      // nivel: preferir el más cercano al del usuario (fuerza prefiere lo más difícil)
      const diff = p.level - ex.level;
      if (diff < 0) continue;
      s -= diff * (p.goal === 'fuerza' ? 0.45 : 0.25);
      // usar el equipo que tiene
      const imp = implementFor(ex, p);
      if (imp && imp !== 'ninguno') s += 0.35;
      if (ex.media) s += 0.15; // preferir los que tienen fotos reales
      if (p.style === 'fuerza' && (ex.kgFactor || ex.machine || ex.level >= 2) && ex.group !== 'cardio') s += 0.3;
      if (p.style === 'velocidad' && (ex.group === 'cardio' || /salto|jump|piques|slam/.test(ex.id))) s += 0.4;
      if (s > bestScore) { bestScore = s; best = ex; }
    }
    return best;
  }

  /**
   * Genera el plan de una semana.
   * weekKey: "2026-11-02" (lunes). prevIds: ejercicios de la semana anterior (para variar).
   */
  function generateWeek(p, weekKey, prevIds = [], salt = 0) {
    const rand = rng(hashString(weekKey + '|' + salt + '|' + p.goal + p.level + p.days));
    const fmt = format(p);
    const c = counts(p, fmt);
    const split = SPLITS[p.days];
    const prev = new Set(prevIds);
    const weekUse = {};
    const letter = {};
    const sessions = split.map((type, i) => {
      letter[type] = (letter[type] || 0) + 1;
      const keepCardio = p.goal === 'forma' || p.style === 'velocidad' || p.bodyType === 'bajar';
      const tpl = TEMPLATES[type].filter(g => !(g === 'cardio' && fmt.kind === 'series' && !keepCardio));
      const used = new Set();
      const ids = [];
      for (let s = 0; ids.length < c.n && s < c.n * 3; s++) {
        const group = tpl[s % tpl.length];
        const pool = EXERCISES.filter(e => e.group === group && allowed(e, p));
        const extra = ex => (prev.has(ex.id) ? -0.5 : 0) - (weekUse[ex.id] || 0) * 0.35;
        let ex = pick(pool, rand, p, used, extra);
        if (!ex) { // si no hay de ese grupo, usar core o cardio
          const alt = EXERCISES.filter(e => (e.group === 'core' || e.group === 'cardio') && allowed(e, p));
          ex = pick(alt, rand, p, used, extra);
        }
        if (!ex) continue;
        used.add(ex.id); ids.push(ex.id);
        weekUse[ex.id] = (weekUse[ex.id] || 0) + 1;
      }
      const warmPool = EXERCISES.filter(e => e.group === 'calentamiento');
      const coolPool = EXERCISES.filter(e => e.group === 'estiramiento');
      const shuffle = arr => arr.map(x => [rand(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
      // el calentamiento empieza suave (marcha) y luego varía
      const warmup = ['cal-marcha', ...shuffle(warmPool.filter(e => e.id !== 'cal-marcha')).map(e => e.id)].slice(0, c.warm);
      const cooldown = [...shuffle(coolPool.filter(e => e.id !== 'est-respiracion')).map(e => e.id)].slice(0, c.cool - 1).concat('est-respiracion');
      const sameType = split.filter(t => t === type).length > 1;
      return {
        index: i,
        type,
        title: TITLES[type] + (sameType ? ' ' + 'ABC'[letter[type] - 1] : ''),
        day: DAYS[p.days][i],
        exercises: ids,
        warmup, cooldown,
      };
    });
    return { weekKey, salt, createdAt: new Date().toISOString(), splitName: SPLIT_NAMES[p.days], sessions };
  }

  // ---------- Dosis (se calcula al momento con la intensidad actual) ----------
  function suggestKg(ex, p, imp) {
    const list = weightsOf(p, imp);
    if (!list.length || !ex.kgFactor) return null;
    const levelMult = [0.7, 1, 1.3][p.level - 1];
    const goalMult = { fuerza: 1.25, musculo: 1, forma: 0.85, grasa: 0.75, resistencia: 0.7 }[p.goal];
    const target = p.weight * ex.kgFactor * levelMult * goalMult * (p.intensity || 1);
    // la pesa más cercana al peso ideal (un poco de preferencia por la más ligera)
    const err = w => Math.abs(Math.log(w / target)) * (w > target ? 1.2 : 1);
    const kg = list.reduce((best, w) => (err(w) < err(best) ? w : best), list[0]);
    return { kg, target, light: kg < target * 0.7, heavy: kg > target * 1.35 };
  }

  function repsFor(ex, p, baseReps) {
    let r = baseReps;
    // usa el máximo de flexiones o sentadillas si lo dio
    if (ex.group === 'empuje' && p.maxPushups > 0 && ex.equip.includes('ninguno') && implementFor(ex, p) === 'ninguno') {
      const ratio = { flexion: 0.6, 'flexion-rodillas': 0.9, 'flexion-inclinada': 1, 'flexion-diamante': 0.4, 'flexion-declinada': 0.45, 'flexion-pica': 0.45, 'fondos-silla': 0.7 }[ex.id];
      if (ratio) r = Math.round(p.maxPushups * ratio * (p.goal === 'fuerza' ? 0.6 : 0.75) * (p.intensity || 1));
    }
    if (ex.group === 'piernas' && p.maxSquats > 0 && implementFor(ex, p) === 'ninguno') {
      const ratio = { sentadilla: 0.6, 'sentadilla-sumo': 0.6, 'zancada-atras': 0.35, bulgara: 0.25, 'sentadilla-salto': 0.3, 'zancada-salto': 0.25, 'pistol-asistida': 0.15 }[ex.id];
      if (ratio) r = Math.round(p.maxSquats * ratio * (p.intensity || 1));
    }
    // ejercicios fáciles sin peso en fuerza: más repeticiones lentas
    if (p.goal === 'fuerza' && ex.level < p.level && !ex.kgFactor) r = Math.round(r * 1.5);
    if (ex.id === 'dominada') r = Math.min(r, p.level === 3 ? 8 : 5);
    if (ex.id === 'dominada-negativa') r = Math.min(r, 6);
    if (ex.id === 'burpee') r = Math.min(r, 15);
    return clamp(r, 3, 40);
  }

  function dose(ex, p, fmt) {
    const imp = implementFor(ex, p);
    const out = { implement: imp, kg: null, tip: '' };
    const kgInfo = WEIGHTS.includes(imp) ? suggestKg(ex, p, imp) : null;
    if (ex.machine) out.tip = 'Elige un peso con el que termines la serie pudiendo hacer 2 repeticiones más.';
    if (imp === 'barradisco' && ex.level >= 2) out.tip = 'Calienta con la barra sola y luego sube al peso indicado. Si dudas de la técnica, baja el peso.';
    if (kgInfo) {
      out.kg = kgInfo.kg;
      if (kgInfo.light && imp !== 'barradisco' && imp !== 'barraz') out.tip = 'Tu pesa es ligera para este ejercicio: baja en 3 segundos y haz más repeticiones.';
      if (kgInfo.heavy) out.tip = 'Tu pesa es pesada para este ejercicio: haz menos repeticiones con buena técnica.';
    }
    if (fmt.kind === 'circuito') {
      out.duration = fmt.work;
      return out;
    }
    if (ex.type === 'time') {
      const base = { fuerza: 30, musculo: 35, forma: 30 }[p.goal] || 30;
      out.duration = clamp(Math.round(base * [0.8, 1, 1.3][p.level - 1] * (p.intensity || 1) / 5) * 5, 15, 90);
      return out;
    }
    let reps = repsFor(ex, p, fmt.reps);
    if (kgInfo && kgInfo.light) reps = Math.round(reps * 1.3);
    if (kgInfo && kgInfo.heavy) reps = Math.max(3, Math.round(reps * 0.7));
    out.reps = clamp(reps, 3, 40);
    return out;
  }

  // ---------- Pasos del entrenamiento ----------
  function buildSteps(session, p) {
    const fmt = format(p);
    const c = counts(p, fmt);
    const steps = [];
    const get = id => EXERCISE_BY_ID[id];
    steps.push({ phase: 'prep', kind: 'rest', name: '¡Prepárate!', duration: 10, next: get(session.warmup[0])?.name });

    session.warmup.forEach((id, i) => {
      const ex = get(id); if (!ex) return;
      steps.push({ phase: 'Calentamiento', kind: 'work', exId: id, name: ex.name, desc: ex.desc, duration: WARMUP_SEC, label: `${i + 1} de ${session.warmup.length}` });
    });
    const main = session.exercises.map(get).filter(Boolean);
    steps.push({ phase: 'Calentamiento', kind: 'rest', name: '¡Ahora va en serio!', duration: 15, next: main[0]?.name });

    if (fmt.kind === 'circuito') {
      for (let r = 1; r <= c.rounds; r++) {
        main.forEach((ex, i) => {
          const d = dose(ex, p, fmt);
          steps.push({ phase: 'Circuito', kind: 'work', exId: ex.id, name: ex.name, desc: ex.desc, perSide: ex.perSide, ...d, label: `Ronda ${r} de ${c.rounds} · ${i + 1}/${main.length}` });
          const last = i === main.length - 1;
          if (last && r === c.rounds) return;
          const nextEx = last ? main[0] : main[i + 1];
          steps.push({ phase: 'Circuito', kind: 'rest', name: last ? 'Descanso entre rondas' : 'Descanso', duration: last ? fmt.roundRest : fmt.rest, next: nextEx.name });
        });
      }
    } else {
      main.forEach((ex, i) => {
        const d = dose(ex, p, fmt);
        for (let s = 1; s <= fmt.sets; s++) {
          steps.push({ phase: 'Series', kind: 'work', exId: ex.id, name: ex.name, desc: ex.desc, perSide: ex.perSide, ...d, label: `Serie ${s} de ${fmt.sets} · ejercicio ${i + 1}/${main.length}` });
          const lastSet = s === fmt.sets;
          if (lastSet && i === main.length - 1) break;
          steps.push({ phase: 'Series', kind: 'rest', name: 'Descanso', duration: fmt.rest, next: lastSet ? main[i + 1].name : ex.name });
        }
      });
    }

    steps.push({ phase: 'Vuelta a la calma', kind: 'rest', name: 'Combate superado. A estirar', duration: 15, next: get(session.cooldown[0])?.name });
    session.cooldown.forEach((id, i) => {
      const ex = get(id); if (!ex) return;
      steps.push({ phase: 'Vuelta a la calma', kind: 'work', exId: id, name: ex.name, desc: ex.desc, duration: STRETCH_SEC, perSide: ex.perSide, label: `${i + 1} de ${session.cooldown.length}` });
    });
    return steps;
  }

  function estimateMinutes(steps) {
    const sec = steps.reduce((t, s) => t + (s.duration || (s.reps || 10) * 3.5 * (s.perSide ? 2 : 1)), 0);
    return Math.round(sec / 60);
  }

  function describe(session, p) {
    const fmt = format(p);
    const c = counts(p, fmt);
    return fmt.kind === 'circuito'
      ? `Circuito · ${c.rounds} rondas · ${fmt.work} s trabajo / ${fmt.rest} s descanso`
      : `${fmt.sets} series · descanso ${fmt.rest} s`;
  }

  return { GOALS, LEVELS, metrics, generateWeek, buildSteps, estimateMinutes, describe, format, dose, implementFor, allowed, hasEquip };
})();
