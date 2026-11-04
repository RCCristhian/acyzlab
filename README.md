# Acyz Lab

Entrenador personal con estilo anime shonen: hace un plan semanal a tu medida y te guía en cada sesión. Funciona en PC y en celular, se puede instalar como app y funciona sin internet.

**Web:** https://rccristhian.github.io/acyzlab/

## Qué hace

- **Cuenta**: entrar con Google o con correo y contraseña (Supabase). Cada persona ve solo sus datos, iguales en el celular y en el PC. También se puede usar sin cuenta, solo en el dispositivo.
- **Código secreto de 4 dígitos**: se crea al registrarse y se pide cada vez que entras (y al volver tras 5 minutos fuera), en un pop-up con animación. Se guarda cifrado. Se puede cambiar en Perfil; si se olvida, se recupera volviendo a entrar con la cuenta.
- **Cuestionario inicial**: objetivo, edad, sexo, peso, estatura, nivel, días por semana, minutos por sesión, implementos que tienes (mancuernas y pesas rusas con sus kilos, barra, banda, cuerda), espacio disponible y, si quieres, limitaciones, máximos de flexiones o sentadillas y % de grasa. Calcula el IMC, el metabolismo basal y las calorías orientativas.
- **62 ejercicios + calentamiento y estiramientos**, cada uno con descripción y animación propia.
- **Plan semanal** que cambia cada semana: cuerpo completo, superior/inferior o empuje/tracción/piernas según los días. Usa circuitos por tiempo o series y repeticiones según el objetivo. Solo usa el equipo que marcaste y respeta tu espacio y tus limitaciones. Además te dice qué peso usar.
- **Modo entrenamiento** paso a paso, con temporizador, sonido, vibración, pantalla siempre encendida y barra de progreso. Al final pregunta «¿cómo te fue?» y ajusta tu «nivel de poder» (la intensidad).
- **Progreso**: rangos de E a SSS, racha semanal, tu rival (tú de la semana pasada), registro de batallas, peso con gráfico y copia de seguridad para exportar e importar.

## Cómo abrirla

- **En internet**: https://rccristhian.github.io/acyzlab/. En el celular, ábrela en Chrome o Safari y elige «Añadir a pantalla de inicio».
- **En este PC sin internet**: doble clic en `abrir-acyz-lab.bat` (se abre en `http://localhost:8765`; deja la ventana negra abierta).

## Conectar Supabase (cuentas y nube)

1. En [supabase.com](https://supabase.com) crea un proyecto.
2. **SQL Editor → New query**: pega `supabase/schema.sql` y pulsa **Run**. Crea la tabla y las reglas para que cada persona solo vea lo suyo.
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
| `exercises.js` | Banco de ejercicios |
| `generator.js` | Cálculos y generador del plan |
| `animations.js` | Animaciones de los ejercicios |
| `storage.js` | Guardado: en el dispositivo o en Supabase |
| `config.js` | Dirección y clave pública de Supabase |
| `supabase/schema.sql` | Tabla y reglas de seguridad de la base de datos |
| `vendor/supabase.js` | Librería oficial de Supabase (v2.110.0, licencia MIT) |
| `manifest.json`, `sw.js`, `icons/` | Instalación como app y uso sin internet |

Si cambias algún archivo, sube el número de `VERSION` en `sw.js` para que los dispositivos reciban la versión nueva.
