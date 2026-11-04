# Acyz Lab

Entrenador personal con estilo anime shonen: hace un plan semanal a tu medida y te guía en cada sesión. Funciona en PC y en celular, se puede instalar como app y funciona sin internet.

**Web:** https://rccristhian.github.io/acyzlab/

## Qué hace

- **Cuenta**: entrar con Google o con correo y contraseña (Supabase). Cada persona ve solo sus datos, iguales en el celular y en el PC. También se puede usar sin cuenta, solo en el dispositivo.
- **Código secreto de 4 dígitos**: se crea al registrarse y se pide cada vez que entras (y al volver tras 5 minutos fuera), en un pop-up con animación. Se guarda cifrado. Se puede cambiar en Perfil; si se olvida, se recupera volviendo a entrar con la cuenta.
- **Personaje y misiones** (inspirado en apps tipo «leveling», con diseño propio): ventana de estado con nivel, experiencia (XP), rango, poder y cuatro estadísticas (Fuerza, Agilidad, Resistencia, Voluntad). Cada entreno es una **misión** con recompensa.
- **Misiones sorpresa**: si sueles entrenar de tarde o noche, aparecen por la mañana (5:00 a 9:00); si entrenas de mañana, por la noche (19:00 a 23:59). Son más probables tras un entreno ligero. Son ejercicios suaves (flexiones, sentadillas, plancha, bici estática…) según tu equipo, y dan XP y estadísticas.
- **Rival y entrenar juntos**: elige a un amigo como rival, invítale a entrenar a la vez y veréis en directo una barra con el progreso de los dos. Da XP extra.
- **Avisos con la app cerrada**: en Perfil → «Activar avisos». Te llega «⚠ ¡Misión sorpresa!» en tu franja y «⚔ ¡Te han retado!» cuando tu rival te invita. En iPhone hace falta añadir la app a la pantalla de inicio primero.
- **Cuestionario inicial**: objetivo, edad, sexo, peso, estatura, tu historia de origen (día a día, cómo responde tu cuerpo, horas de sueño), nivel, días por semana, minutos por sesión, estilo de lucha (aguante y qué poder quieres despertar), equipo (mancuernas y pesas rusas con sus kilos, barra con discos, barra Z, rack, banco, cajón, barra de dominadas, paralelas, TRX, banda, cuerda, rueda abdominal, balón medicinal, fitball, saco de boxeo, poleas, máquinas de piernas, bici estática, cinta, elíptica y remo), espacio disponible y, si quieres, limitaciones, máximos de flexiones o sentadillas y % de grasa. Calcula el IMC, el metabolismo basal y las calorías orientativas.
- **709 ejercicios** con nombre y explicación en español: 683 con **fotos reales** que se alternan como un mini vídeo (de Free Exercise DB, dominio público); el resto con animación de figura. Los 121 básicos van dentro de la app y los otros 588 se cargan aparte (`data/exercises-extra.json`) para que arranque rápido.
- **1.700 variaciones** generadas solas a partir de cada ejercicio: tempo lento, con pausa, a una mano, otro agarre, repeticiones y media, isométrico, versión fácil y versión difícil. A veces el plan te pone una, con su explicación.
- **Catálogo de técnicas** (en Plan → «Abrir el catálogo»): busca por nombre, músculo o equipo, filtra por tipo y por lo que puedes hacer con tu equipo, y mira fotos, músculos y variaciones de cada ejercicio.
- **Plan semanal** que cambia cada semana: cuerpo completo, superior/inferior o empuje/tracción/piernas según los días. Usa circuitos por tiempo o series y repeticiones según el objetivo. Solo usa el equipo que marcaste y respeta tu espacio y tus limitaciones. Además te dice qué peso usar.
- **Modo entrenamiento** paso a paso, con temporizador, sonido, vibración, pantalla siempre encendida y barra de progreso. Al final pregunta «¿cómo te fue?» y ajusta tu «nivel de poder» (la intensidad).
- **Amigos**: busca a tus amigos por su correo (el de Google o el que registraron), envía o acepta solicitudes y compite en un **ranking de poder**. El cara a cara (VS) compara poder, sesiones, minutos, racha e intensidad, y muestra sus últimas clases. Cada uno elige su nombre de luchador. Solo tus amigos ven tus estadísticas.
- **Progreso**: rangos de E a SSS, racha semanal, tu rival (tú de la semana pasada), registro de batallas, peso con gráfico y copia de seguridad para exportar e importar.

## Cómo abrirla

- **En internet**: https://rccristhian.github.io/acyzlab/. En el celular, ábrela en Chrome o Safari y elige «Añadir a pantalla de inicio».
- **En este PC sin internet**: doble clic en `abrir-acyz-lab.bat` (se abre en `http://localhost:8765`; deja la ventana negra abierta).

## Conectar Supabase (cuentas y nube)

**Ya está conectado:** proyecto de Supabase **CC17**, tabla `acyzlab_user_data`, entrada con correo y con Google (proyecto de Google Cloud «Acyz Lab», en producción). Estos pasos sirven si algún día hay que montarlo de nuevo en otro proyecto:

1. En [supabase.com](https://supabase.com) crea un proyecto.
2. **SQL Editor → New query**: pega `supabase/schema.sql` y pulsa **Run**; luego haz lo mismo con `supabase/amigos.sql`, `supabase/duelos.sql` y `supabase/avisos.sql`. Publica `supabase/functions/acyzlab-push` como Edge Function con «Verify JWT» apagado (la función comprueba la sesión por su cuenta). Crea la tabla y las reglas para que cada persona solo vea lo suyo.
3. **Authentication → URL Configuration**:
   - En *Site URL* pon `https://rccristhian.github.io/acyzlab/`.
   - En *Redirect URLs* añade esa misma dirección y `http://localhost:8765/`.
4. **Google**:
   - En [Google Cloud Console](https://console.cloud.google.com/apis/credentials) crea un «ID de cliente de OAuth» de tipo *Aplicación web*.
   - En «URI de redireccionamiento autorizados» pon `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
   - Copia el *Client ID* y el *Client Secret* en Supabase → **Authentication → Sign In / Providers → Google**. El secreto se queda en Supabase y nunca va en este código.
5. En **Project Settings → API Keys** copia la *Project URL* y la clave **publishable** (o *anon*) en `config.js`. **Nunca** pongas la clave *secret* ni la *service_role*.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html`, `styles.css` | Estructura y diseño |
| `app.js` | Pantallas, cuenta y modo entrenamiento |
| `pin.js` | Pop-up del código de 4 dígitos con su animación |
| `exercises.js` | Banco de ejercicios básico (121) |
| `data/exercises-extra.json` | 588 ejercicios más de Free Exercise DB, traducidos (se cargan aparte) |
| `catalog.js` | Carga el catálogo ampliado |
| `variations.js` | Crea las variaciones de cada ejercicio |
| `tools/catalogo/` | Traducciones y script para rehacer el catálogo, y simulación de semanas |
| `generator.js` | Cálculos y generador del plan |
| `animations.js` | Animaciones de los ejercicios |
| `storage.js` | Guardado: en el dispositivo o en Supabase |
| `config.js` | Dirección y clave pública de Supabase |
| `supabase/schema.sql` | Tabla y reglas de seguridad de la base de datos |
| `supabase/amigos.sql` | Tablas, búsqueda y reglas de seguridad de amigos |
| `social.js` | Amigos, solicitudes, ranking de poder y duelos |
| `leveling.js` | Nivel, XP, estadísticas y misiones sorpresa |
| `media/` | Fotos reales de los ejercicios (Free Exercise DB, dominio público) |
| `supabase/duelos.sql` | Tabla y reglas de seguridad para entrenar juntos |
| `supabase/avisos.sql` | Tablas de avisos y tarea automática cada 10 minutos |
| `supabase/functions/acyzlab-push/` | Servidor de avisos (Edge Function de Supabase) |
| `privacidad.html`, `terminos.html`, `legal.css` | Política de privacidad y condiciones de uso (las pide Google) |
| `vendor/supabase.js` | Librería oficial de Supabase (v2.110.0, licencia MIT) |
| `manifest.json`, `sw.js`, `icons/` | Instalación como app y uso sin internet |

Si cambias algún archivo, sube el número de `VERSION` en `sw.js` para que los dispositivos reciban la versión nueva.
