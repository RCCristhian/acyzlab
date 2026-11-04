# Acyz Lab

Entrenador personal con estilo anime shonen: hace un plan semanal a tu medida y te guía en cada sesión. Funciona en PC y en celular, se puede instalar como app y funciona sin internet.

## Qué hace

- **Cuestionario inicial**: objetivo, edad, sexo, peso, estatura, nivel, días por semana, minutos por sesión, implementos que tienes (mancuernas y pesas rusas con sus kilos, barra, banda, cuerda), espacio disponible y, si quieres, limitaciones, máximos de flexiones o sentadillas y % de grasa. Calcula el IMC, el metabolismo basal y las calorías orientativas.
- **62 ejercicios + calentamiento y estiramientos**, cada uno con descripción y animación propia.
- **Plan semanal** que cambia cada semana: cuerpo completo, superior/inferior o empuje/tracción/piernas según los días. Usa circuitos por tiempo o series y repeticiones según el objetivo. Solo usa el equipo que marcaste y respeta tu espacio y tus limitaciones. Además te dice qué peso usar.
- **Modo entrenamiento** paso a paso, con temporizador, sonido, vibración, pantalla siempre encendida y barra de progreso. Al final pregunta «¿cómo te fue?» y ajusta tu «nivel de poder» (la intensidad).
- **Progreso**: rangos de E a SSS, racha semanal, tu rival (tú de la semana pasada), registro de batallas, peso con gráfico y copia de seguridad para exportar e importar.

## Cómo abrirla

- **Lo más fácil**: doble clic en `abrir-acyz-lab.bat`. Se abre en el navegador en `http://localhost:8765`. Deja abierta la ventana negra mientras la usas.
- También puedes abrir `index.html` directamente, pero así no se puede instalar como app.

## Tus datos

Se guardan solo en el navegador que uses (en este dispositivo). Para no perderlos o pasarlos a otro dispositivo: **Progreso → Copia de seguridad → Exportar copia**, y luego **Importar copia** en el otro.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html`, `styles.css` | Estructura y diseño |
| `app.js` | Pantallas y modo entrenamiento |
| `exercises.js` | Banco de ejercicios |
| `generator.js` | Cálculos y generador del plan |
| `animations.js` | Animaciones de los ejercicios |
| `storage.js` | Guardado de datos (se puede cambiar por un servidor con cuentas en el futuro) |
| `manifest.json`, `sw.js`, `icons/` | Instalación como app y uso sin internet |

Si cambias algún archivo, sube el número de `VERSION` en `sw.js` para que los dispositivos reciban la versión nueva.
