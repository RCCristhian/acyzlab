/*
 * Catálogo ampliado: carga aparte (data/exercises-extra.json) los ejercicios de
 * Free Exercise DB (dominio público) para que la app arranque rápido, y luego crea
 * las variaciones. El service worker guarda el archivo para usarlo sin internet.
 */
const Catalog = (() => {
  // Súbelo si cambia el catálogo: así el plan de la semana se rehace con los ejercicios nuevos.
  const VERSION = 2;
  let ready = null;

  function add(list) {
    for (const e of list) {
      if (!e || !e.id || EXERCISE_BY_ID[e.id]) continue;
      EXERCISES.push(e);
      EXERCISE_BY_ID[e.id] = e;
    }
  }

  function load() {
    if (ready) return ready;
    const timeout = new Promise(res => setTimeout(() => res(null), 8000));
    const req = fetch('data/exercises-extra.json')
      .then(r => (r.ok ? r.json() : null))
      .then(list => { if (Array.isArray(list)) add(list); Variations.build(); return true; })
      .catch(err => { console.warn('No se pudo cargar el catálogo ampliado', err); Variations.build(); return false; });
    // Si tarda mucho (red lenta), la app arranca con los ejercicios básicos y el resto llega después
    ready = Promise.race([req, timeout]).then(() => { Variations.build(); return EXERCISES.length; });
    return ready;
  }

  const stats = () => {
    const bases = EXERCISES.filter(e => !e.base);
    return { bases: bases.length, photos: bases.filter(e => e.media).length, variants: EXERCISES.length - bases.length };
  };

  return { VERSION, load, stats };
})();
