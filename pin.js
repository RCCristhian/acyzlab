/*
 * Código de 4 dígitos en un pop-up con animación:
 * casillas en fila → se ordenan en cuadrado unidas por líneas → se funden en
 * una sola con ✓ y estallan partículas → todo en verde, «verificado».
 *
 * Pin.prompt(opciones) muestra el pop-up y devuelve una promesa con el código
 * (o null si se pulsó el enlace de abajo). El código se guarda cifrado
 * (hash SHA-256 con sal), nunca tal cual.
 */
const Pin = (() => {
  const BOX = 52, GAP = 14, W = 4 * BOX + 3 * GAP, H = 150;
  const ROW = [0, 1, 2, 3].map(i => [i * (BOX + GAP), (H - BOX) / 2]);
  const GX = (W - 2 * BOX - 34) / 2;
  const GRID = [[GX, 6], [GX + BOX + 34, 6], [GX, H - BOX - 6], [GX + BOX + 34, H - BOX - 6]];
  const CENTER = [(W - BOX) / 2, (H - BOX) / 2];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LOCK = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  async function hash(code, salt) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`acyzlab:${salt}:${code}`));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function newSalt() {
    const a = new Uint8Array(12); crypto.getRandomValues(a);
    return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * opciones: title, sub, mask (ocultar dígitos), validate(code) → true | false | 'mensaje',
   * successTitle, successSub, celebrate (false = sin la animación completa),
   * link: { prefix, label, onClick } (texto de abajo, como «¿Olvidaste tu código? Recupéralo»)
   */
  function prompt(o) {
    return new Promise(resolve => {
      document.getElementById('pin-lock')?.remove();
      const root = document.createElement('div');
      root.id = 'pin-lock';
      document.body.appendChild(root);
      document.body.classList.add('no-scroll');
      let code = '', busy = false, fails = 0, lockedUntil = 0;
      root.innerHTML = `
        <div class="pin-card" role="dialog" aria-modal="true" aria-labelledby="pin-title">
          <div class="pin-handle"></div>
          <h2 class="pin-title" id="pin-title">${o.title}</h2>
          <p class="pin-sub">${o.sub || ''}</p>
          <div class="pin-stage" style="width:${W}px;height:${H}px">
            <svg class="pin-lines" viewBox="0 0 ${W} ${H}" aria-hidden="true">
              ${[[0, 1], [0, 2], [1, 3], [2, 3]].map(([a, b]) => {
                const x1 = GRID[a][0] + BOX / 2, y1 = GRID[a][1] + BOX / 2, x2 = GRID[b][0] + BOX / 2, y2 = GRID[b][1] + BOX / 2;
                const len = Math.hypot(x2 - x1, y2 - y1);
                return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke-dasharray:${len};stroke-dashoffset:${len}"/>`;
              }).join('')}
            </svg>
            ${ROW.map(([x, y], i) => `<div class="pin-box" style="transform:translate(${x}px,${y}px)"><span></span></div>`).join('')}
            <div class="pin-ring" style="left:${W / 2}px;top:${H / 2}px"></div>
            <div class="pin-done" style="transform:translate(${CENTER[0]}px,${CENTER[1]}px)">${CHECK}</div>
            <div class="pin-burst" style="left:${W / 2}px;top:${H / 2}px"></div>
            <input class="pin-input" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="Código de 4 dígitos">
          </div>
          <p class="pin-msg" role="alert"></p>
          <p class="pin-foot">${o.link ? `${o.link.prefix ? `<span>${o.link.prefix}</span> ` : ''}<button type="button" class="pin-link">${o.link.label}</button>` : ''}</p>
          <p class="pin-secure">${LOCK} ${o.successSub || 'Verificado y seguro'}</p>
        </div>`;
      const boxes = [...root.querySelectorAll('.pin-box')];
      const msg = root.querySelector('.pin-msg');
      const input = root.querySelector('.pin-input');

      const paint = () => {
        boxes.forEach((b, i) => {
          const d = code[i];
          b.classList.toggle('filled', d !== undefined);
          b.classList.toggle('active', i === code.length && !busy);
          const span = b.querySelector('span');
          const txt = d === undefined ? '' : (o.mask ? '●' : d);
          if (span.textContent !== txt) { span.textContent = txt; span.style.animation = 'none'; void span.offsetWidth; span.style.animation = ''; }
        });
      };
      paint();
      const place = pos => boxes.forEach((b, i) => { b.style.transform = `translate(${pos[i][0]}px,${pos[i][1]}px)`; });

      async function fail(text) {
        fails++;
        root.classList.add('error');
        msg.textContent = text;
        if (navigator.vibrate) try { navigator.vibrate([60, 40, 60]); } catch { /* */ }
        await wait(500);
        root.classList.remove('error');
        code = ''; input.value = ''; busy = false; paint();
        if (fails >= 5) {
          lockedUntil = Date.now() + 30000;
          msg.textContent = 'Demasiados intentos. Espera 30 segundos.';
          setTimeout(() => { if (msg.isConnected) msg.textContent = ''; }, 30000);
        }
      }

      async function success() {
        input.blur();
        const fast = reduced();
        if (o.celebrate !== false && !fast) {
          root.classList.add('grid'); place(GRID);                       // 1. cuadrado con líneas
          await wait(800);
          root.classList.add('merge'); place(boxes.map(() => CENTER));   // 2. se funden en una
          await wait(200);
          root.classList.add('burst');                                   // 3. ✓ y partículas
          root.querySelector('.pin-burst').innerHTML = Array.from({ length: 36 }, () => {
            const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 110;
            const c = ['#34c759', '#34c759', '#30d158', '#7ef0ac', '#1f9d55'][Math.floor(Math.random() * 5)];
            const s = 4 + Math.random() * 7;
            return `<i style="--dx:${(Math.cos(a) * r).toFixed(1)}px;--dy:${(Math.sin(a) * r).toFixed(1)}px;--c:${c};width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;border-radius:${Math.random() < .5 ? '50%' : '2px'};animation-delay:${Math.floor(Math.random() * 90)}ms"></i>`;
          }).join('');
          if (navigator.vibrate) try { navigator.vibrate(40); } catch { /* */ }
          await wait(500);
        } else {
          root.classList.add('merge', 'burst');
        }
        root.classList.add('ok');                                        // 4. verde: verificado
        root.querySelector('.pin-title').textContent = o.successTitle || 'Verificado con éxito';
        root.querySelector('.pin-sub').textContent = o.successText || 'Tu código es correcto.';
        await wait(fast ? 400 : 1300);
        close();
        resolve(code);
      }

      async function onInput() {
        if (busy) { input.value = code; return; }
        if (Date.now() < lockedUntil) { input.value = ''; return; }
        msg.textContent = '';
        code = input.value.replace(/\D/g, '').slice(0, 4);
        input.value = code;
        paint();
        if (code.length < 4) return;
        busy = true; paint();
        await wait(200);
        const r = await o.validate(code);
        if (r === true) success();
        else fail(typeof r === 'string' ? r : 'Código incorrecto. Inténtalo otra vez.');
      }
      const refocus = () => { if (!busy) input.focus({ preventScroll: true }); };
      function onClick(e) {
        if (e.target.closest('.pin-link')) { close(); resolve(null); o.link.onClick(); return; }
        refocus();
      }
      function close() { root.remove(); if (!document.getElementById('workout')) document.body.classList.remove('no-scroll'); }
      input.addEventListener('input', onInput);
      root.addEventListener('click', onClick);
      requestAnimationFrame(() => { root.classList.add('show'); refocus(); });
    });
  }

  const isOpen = () => !!document.getElementById('pin-lock');
  return { prompt, hash, newSalt, isOpen };
})();
