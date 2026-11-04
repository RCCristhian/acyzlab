# Catálogo ampliado (herramientas)

Así se crea `data/exercises-extra.json` a partir de [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (dominio público).

- `es1.txt`, `es2.txt`, `es3.txt`: una línea por ejercicio importado: `IdOriginal|Nombre en español|Explicación|ajustes`.
  Los ajustes van separados por `;`: `g=` grupo, `eq=` equipo, `n=` equipo extra necesario, `na=` basta uno de estos,
  `skip=` no usar si tienes este equipo, `l=` nivel, `t=time` por tiempo, `ps` por cada lado, `sp=` espacio,
  `k=` fracción del peso corporal, `lo=` zonas que carga, `pr=` prioridad (negativa = sale menos).
  Un ejercicio que no está en estas listas no se importa.
- `build.py`: junta todo. Uso: descarga `dist/exercises.json` de Free Exercise DB en una carpeta junto a los `es*.txt` y ejecuta
  `python build.py <esa carpeta> ../../data/exercises-extra.json`.
- `sim.js`: simula 1.600 semanas con perfiles al azar y avisa de cualquier error del plan. Uso: `node sim.js ../..`.

Las fotos van en `media/<IdOriginal>/0.jpg` y `1.jpg` (reducidas a 520 px de ancho).
Si cambias el catálogo, sube `VERSION` en `catalog.js` y en `sw.js`.
