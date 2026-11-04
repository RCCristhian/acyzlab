/*
 * Variaciones generadas: de cada ejercicio base salen varias versiones
 * (tempo, pausa, unilateral, agarre, rango parcial, isométrico, más fácil o más difícil)
 * sin escribirlas a mano. Cada variación es un ejercicio más, con id "base~clave"
 * (no cambiar las claves: el historial guarda esos ids).
 *
 * Campos que añade: base (id del ejercicio base), vkey, vlabel y vtip (cómo hacerla).
 */
const Variations = (() => {
  const STRENGTH = new Set(['piernas', 'empuje', 'traccion', 'core']);
  // Movimientos explosivos o técnicos: no se hacen lentos, con pausa ni isométricos
  const EXPLOSIVE = /salto|lanzamiento|golpe|slam|cargada|arrancada|envi[oó]n|swing|push press|dos tiempos|pliom|explosiv|muscle up|turco|molino|halo|ocho|barco|balanc|vueltas|landmine|giro|patinador/i;
  const BODY = ['ninguno', 'trx', 'barra', 'paralelas'];
  const isBody = ex => ex.equip.every(k => BODY.includes(k));
  const has = (ex, re) => re.test(ex.name);

  const RULES = [
    {
      key: 'tempo', label: 'Tempo lento 3-1-1',
      tip: 'Baja en 3 segundos, para 1 segundo y sube en 1. Contrólalo todo el recorrido.',
      when: ex => ex.type === 'reps' && STRENGTH.has(ex.group) && !has(ex, EXPLOSIVE),
    },
    {
      key: 'pausa', label: 'Con pausa',
      tip: 'Para 2 segundos en el punto más difícil (abajo en sentadillas y flexiones, arriba en remos y curls) y sigue sin rebotar.',
      when: ex => ex.type === 'reps' && ['piernas', 'empuje', 'traccion'].includes(ex.group) && !has(ex, EXPLOSIVE),
    },
    {
      key: 'una', label: 'A una mano',
      tip: 'Hazlo con un solo brazo y luego cambia. Mantén el tronco quieto, sin girarte ni inclinarte.',
      perSide: true,
      when: ex => ex.type === 'reps' && !ex.perSide && ['empuje', 'traccion'].includes(ex.group)
        && ex.equip.some(k => ['mancuernas', 'pesarusa', 'poleas', 'banda'].includes(k))
        && !ex.equip.some(k => ['barradisco', 'barraz'].includes(k))
        && /^(curl|press|remo|elevaci|extensi|patada|jal[oó]n|aperturas|p[aá]jaro)/i.test(ex.name)
        && !/una mano|alterno|alterna|m[aá]quina|cruzad|balanc/i.test(ex.name),
    },
    {
      key: 'agarre', label: ex => GRIP(ex).label,
      tip: ex => GRIP(ex).tip,
      when: ex => ex.type === 'reps' && !!GRIP(ex),
    },
    {
      key: 'parcial', label: 'Repeticiones y media',
      tip: 'Baja del todo, sube solo hasta la mitad, vuelve a bajar y después sube completo: eso cuenta como una.',
      when: ex => ex.type === 'reps' && ['piernas', 'empuje', 'traccion'].includes(ex.group) && !has(ex, EXPLOSIVE)
        && !/gemelo|talones|mu[nñ]eca|encogimiento|rotaci/i.test(ex.name),
    },
    {
      key: 'iso', label: 'Isométrico', type: 'time',
      tip: 'Quédate quieto en la mitad del recorrido, en el punto más duro, aguantando la postura con buena técnica.',
      when: ex => ex.type === 'reps' && ['piernas', 'empuje', 'traccion'].includes(ex.group) && !has(ex, EXPLOSIVE)
        && !ex.equip.includes('barradisco') && !ex.machine
        && /sentadilla|zancada|flexi[oó]n|dominada|remo|curl|puente|fondos|press|elevaci/i.test(ex.name)
        && !/mu[nñ]eca|nórdico|pino|una mano/i.test(ex.name),
    },
    {
      key: 'facil', label: 'Versión fácil', delta: -1,
      tip: ex => EASY(ex),
      when: ex => ex.level >= 2 && STRENGTH.has(ex.group) && isBody(ex) && !has(ex, EXPLOSIVE),
    },
    {
      key: 'dificil', label: 'Versión difícil', delta: 1,
      tip: ex => HARD(ex),
      // las versiones ya facilitadas (asistida, de rodillas, inclinada…) suben de nivel con otro ejercicio, no con esta variación
      when: ex => ex.level <= 2 && STRENGTH.has(ex.group) && isBody(ex) && !has(ex, /salto|carrera|caminando|asistid|rodillas|inclinad|negativa|colgarse/i),
    },
  ];

  function GRIP(ex) {
    const n = ex.name;
    if (/^flexi[oó]n/i.test(n) && !/cerrad|diamante|abierta|una mano|pino|pliom|reloj|giradas/i.test(n))
      return { label: 'Agarre cerrado', tip: 'Pon las manos más juntas que los hombros y baja con los codos pegados al cuerpo: trabaja más el tríceps.' };
    if (/^curl/i.test(n) && !/martillo|invertid|zottman|mu[nñ]eca|femoral|dedos|nórdico|predicador/i.test(n) && !ex.machine)
      return { label: 'Agarre martillo', tip: 'Palmas mirándose durante todo el recorrido: trabaja también el antebrazo.' };
    if (/^(remo|jal[oó]n al pecho|dominada)/i.test(n) && !/supin|neutro|mixto|una mano|escapular|en v|en t|cuello|cara|renegado|lastrada|esternón|encogimiento|lado a lado/i.test(n))
      return { label: 'Agarre supino', tip: 'Gira las palmas hacia ti: el bíceps ayuda más y notas la espalda baja del dorsal.' };
    if (/^press/i.test(n) && ex.equip.includes('mancuernas') && !/neutro|enfrentad|palma|arnold|cubano|cerrado|una mano|alterno/i.test(n))
      return { label: 'Agarre neutro', tip: 'Palmas mirándose durante todo el empuje: suele ser más cómodo para los hombros.' };
    return null;
  }
  function EASY(ex) {
    const n = ex.name;
    if (/flexi[oó]n/i.test(n)) return 'Apoya las rodillas en el suelo o las manos en un mueble alto. Mantén el cuerpo recto.';
    if (/dominada|colgarse/i.test(n)) return 'Ayúdate con una banda o apoyando los pies en una silla, y baja despacio.';
    if (/fondos/i.test(n)) return 'Deja los pies apoyados en el suelo para quitarte parte del peso.';
    if (/sentadilla|zancada|pierna/i.test(n)) return 'Sujétate a una mesa o pared y baja solo hasta donde controles.';
    if (ex.type === 'time') return 'Apoya las rodillas o acorta la palanca para aguantar con buena postura.';
    return 'Haz menos recorrido, a ritmo cómodo y con apoyo si lo necesitas.';
  }
  function HARD(ex) {
    if (ex.type === 'time') return 'Aguanta levantando un brazo o una pierna y cambia cada pocos segundos.';
    if (ex.group === 'core') return 'Hazlo muy lento y aleja brazos y piernas del centro, sin descansar entre repeticiones.';
    return 'Ponte una mochila con peso (libros o botellas) o baja en 4 segundos y sube explosivo.';
  }

  const done = new Set();
  let count = 0;
  /** Crea las variaciones de los ejercicios base que aún no las tienen. */
  function build() {
    const bases = EXERCISES.filter(e => !e.base && !done.has(e.id));
    for (const ex of bases) {
      done.add(ex.id);
      const list = [];
      for (const r of RULES) {
        if (!r.when(ex)) continue;
        const id = `${ex.id}~${r.key}`;
        if (EXERCISE_BY_ID[id]) continue;
        const label = typeof r.label === 'function' ? r.label(ex) : r.label;
        const v = {
          ...ex,
          id, base: ex.id, vkey: r.key, vlabel: label,
          vtip: typeof r.tip === 'function' ? r.tip(ex) : r.tip,
          name: `${ex.name} · ${label.toLowerCase()}`,
          level: Math.max(1, Math.min(3, ex.level + (r.delta || 0))),
          type: r.type || ex.type,
        };
        if (r.perSide) v.perSide = true;
        EXERCISES.push(v);
        EXERCISE_BY_ID[id] = v;
        list.push(v);
      }
      if (list.length) VARIANTS_OF[ex.id] = list;
      count += list.length;
    }
    return count;
  }
  const VARIANTS_OF = {};
  return { build, of: id => VARIANTS_OF[id] || [], get count() { return count; } };
})();
