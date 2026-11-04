// Simula muchas semanas con perfiles al azar y comprueba que el plan sale bien.
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = process.argv[2] || path.join(__dirname, "..", "..");
const ctx = { console, Math, JSON, Date, Object, Array, Set, Map, Number, String, isFinite, setTimeout };
vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8') + '\n;this.__x=1;', ctx, { filename: f });
load('exercises.js');
vm.runInContext('this.EXERCISES=EXERCISES;this.EXERCISE_BY_ID=EXERCISE_BY_ID;this.EQUIPMENT_NAMES=EQUIPMENT_NAMES;', ctx);
const extra = JSON.parse(fs.readFileSync(path.join(dir, 'data/exercises-extra.json'), 'utf8'));
for (const e of extra) { ctx.EXERCISES.push(e); ctx.EXERCISE_BY_ID[e.id] = e; }
load('variations.js');
vm.runInContext('this.Variations=Variations; Variations.build();', ctx);
load('generator.js');
vm.runInContext('this.Generator=Generator;', ctx);
const { EXERCISES, EXERCISE_BY_ID, Generator, EQUIPMENT_NAMES } = ctx;

const bases = EXERCISES.filter(e => !e.base);
console.log('bases', bases.length, 'con foto', bases.filter(e => e.media).length, 'variaciones', EXERCISES.length - bases.length);
// comprobar fotos en disco
const missing = bases.filter(e => e.media && !fs.existsSync(path.join(dir, 'media', e.media, '0.jpg')));
console.log('fotos que faltan', missing.map(e => e.id));
const badEquip = EXERCISES.filter(e => [...e.equip, ...(e.needs || []), ...(e.needsAny || []), ...(e.skipIf || [])].some(k => k !== 'ninguno' && !EQUIPMENT_NAMES[k]));
console.log('equipo desconocido', badEquip.map(e => e.id));

let seed = 7; const R = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pickOne = a => a[Math.floor(R() * a.length)];
const KEYS = Object.keys(EQUIPMENT_NAMES).filter(k => k !== 'ninguno');
let weeks = 0, errors = 0, varCount = 0, exCount = 0, t0 = Date.now(), maxMs = 0;
const used = new Set(); const groupCount = {};
for (let i = 0; i < 400; i++) {
  const equipment = {};
  const nEq = pickOne([0, 0, 1, 2, 4, 8, 22]);
  for (let j = 0; j < nEq; j++) {
    const k = pickOne(KEYS);
    if (k === 'mancuernas' || k === 'pesarusa') equipment[k] = [4, 8, 12, 16].slice(0, 1 + Math.floor(R() * 4));
    else if (k === 'barradisco' || k === 'barraz') equipment[k] = pickOne([40, 60, 100]);
    else equipment[k] = true;
  }
  const p = {
    goal: pickOne(['grasa', 'musculo', 'fuerza', 'resistencia', 'forma']), level: pickOne([1, 2, 3]), days: pickOne([2, 3, 4, 5, 6]),
    minutes: pickOne([15, 20, 30, 45, 60, 90]), equipment, space: pickOne([1, 2, 3]), limits: R() < 0.3 ? [pickOne(['rodillas', 'espalda', 'hombros'])] : [],
    weight: 50 + R() * 60, height: 160 + R() * 35, age: 18 + Math.floor(R() * 50), sex: pickOne(['h', 'm']), intensity: 0.8 + R() * 0.5,
    style: pickOne([undefined, 'fuerza', 'velocidad']), stamina: pickOne([1, 2, 3]),
  };
  let prev = [];
  for (let w = 0; w < 4; w++) {
    const s0 = Date.now();
    const plan = Generator.generateWeek(p, '2026-11-' + String(2 + w * 7).padStart(2, '0'), prev);
    maxMs = Math.max(maxMs, Date.now() - s0);
    weeks++;
    for (const s of plan.sessions) {
      const roots = new Set();
      if (s.exercises.length < 3) { errors++; console.log('pocos ejercicios', s.exercises.length, JSON.stringify(p)); }
      for (const id of [...s.exercises, ...s.warmup, ...s.cooldown]) {
        const ex = EXERCISE_BY_ID[id];
        if (!ex) { errors++; console.log('no existe', id); continue; }
        if (!Generator.allowed(ex, p)) { errors++; console.log('no permitido', id, JSON.stringify(p.equipment), p.limits, p.space); }
      }
      for (const id of s.exercises) {
        const ex = EXERCISE_BY_ID[id];
        const r = ex.base || ex.id;
        if (roots.has(r)) { errors++; console.log('repetido', id); }
        roots.add(r); used.add(id); exCount++; if (ex.base) varCount++;
        groupCount[ex.group] = (groupCount[ex.group] || 0) + 1;
        if (ex.level > p.level) { errors++; console.log('nivel alto', id); }
        const d = Generator.dose(ex, p, Generator.format(p));
        if (!(d.duration > 0 || d.reps > 0)) { errors++; console.log('dosis mala', id, d); }
      }
      const steps = Generator.buildSteps(s, p);
      if (steps.some(st => st.kind === 'work' && !st.name)) { errors++; console.log('paso sin nombre'); }
    }
    prev = plan.sessions.flatMap(s => s.exercises);
  }
}
console.log({ weeks, errors, ejerciciosDistintosUsados: used.size, pctVariaciones: Math.round(varCount / exCount * 100), msMedia: Math.round((Date.now() - t0) / weeks), msMax: maxMs, groupCount });
