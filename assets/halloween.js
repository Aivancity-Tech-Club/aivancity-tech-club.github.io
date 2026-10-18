/* Halloween decorations: temporary, and fully separate from the rest of the site.
   Everything lives in this file and assets/halloween.css; no other file depends on them.

   Switch off:  set on: false below, then bump the ?v= tag in every page as usual.
                It also switches itself off after `until`, so nothing stays up by accident.
   Remove for good after the event: delete assets/halloween.js and assets/halloween.css, then
                remove the one <script src="assets/halloween.js…"> line from every page:
                sed -i '/assets\/halloween.js/d' *.html        (macOS: sed -i '' …)
   Try it:      add ?halloween=1 to any URL to see it outside the dates, ?halloween=0 to hide it.

   Visitors can pause the animations with the pumpkin button (remembered on their device).
   People whose system asks for less motion only get the still decorations.
   Everything sits behind the page content and ignores clicks, so nothing on the page changes. */
(() => {
  const HALLOWEEN = { on: true, from: '2026-10-01', until: '2026-11-02' };

  const q = new URLSearchParams(location.search).get('halloween');
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const active = q === '1' || (q !== '0' && HALLOWEEN.on && today >= HALLOWEEN.from && today <= HALLOWEEN.until);
  if (!active) return;

  const root = document.documentElement;
  const store = { get: () => { try { return localStorage.getItem('hw-calm') === '1'; } catch (e) { return false; } },
                  set: (v) => { try { localStorage.setItem('hw-calm', v ? '1' : '0'); } catch (e) {} } };
  root.classList.add('hw');
  if (store.get()) root.classList.add('hw-calm');

  // the stylesheet next to this file, with the same ?v= tag
  const me = document.currentScript && document.currentScript.src;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = me ? me.replace(/halloween\.js/, 'halloween.css') : 'assets/halloween.css';
  document.head.appendChild(css);

  // the only text this adds: the pumpkin button's label (kept here so removing the theme touches nothing else)
  const TEXT = {
    en: 'Pause the Halloween animations',
    fr: 'Mettre en pause les animations d’Halloween',
  };
  const label = () => TEXT[root.lang === 'fr' ? 'fr' : 'en'];

  /* ---------- artwork (hand-drawn style: flat fills, dark outline) ---------- */
  const BAT = '<svg viewBox="0 0 64 26" aria-hidden="true" focusable="false"><path d="M32 8l-2.4-5.5-.6 4.6C25 7 21 4 15 3 9 2.5 4 5 1 10c4-1.5 7-.5 9 2 2-2.6 6-2.6 8 0 2.2-2 6-1.6 8 1.8 2.4-.4 4.6 1.6 6 5.2 1.4-3.6 3.6-5.6 6-5.2 2-3.4 5.8-3.8 8-1.8 2-2.6 6-2.6 8 0 2-2.5 5-3.5 9-2-3-5-8-7.5-14-7-6 1-10 4-14 4.1l-.6-4.6z"/></svg>';
  const GHOST = '<svg viewBox="0 0 40 48" aria-hidden="true" focusable="false"><path class="hw-sheet" d="M6 44V20a14 14 0 0 1 28 0v24l-4.7-4-4.6 4-4.7-4-4.7 4-4.6-4z"/><ellipse class="hw-eye" cx="15" cy="20" rx="2.2" ry="3.2"/><ellipse class="hw-eye" cx="25" cy="20" rx="2.2" ry="3.2"/><ellipse class="hw-eye" cx="20" cy="28.5" rx="2" ry="2.6"/></svg>';
  const PUMPKIN = (face) => `<svg viewBox="0 0 48 44" aria-hidden="true" focusable="false"><path class="hw-stem" d="M24 11c-.5-4 .5-7 4-9"/><g class="hw-gourd"><ellipse cx="16" cy="27" rx="12" ry="14.5"/><ellipse cx="32" cy="27" rx="12" ry="14.5"/><ellipse cx="24" cy="27" rx="8.5" ry="15.5"/></g>${face ? '<g class="hw-face"><path d="M14 23l4-6 4 6z"/><path d="M26 23l4-6 4 6z"/><path d="M13 30q11 8 22 0l-3 1.5-2.5-2-2.6 2.6-2.4-2.4-2.4 2.4-2.6-2.6-2.5 2z"/></g>' : ''}</svg>`;
  const LEAF = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="hw-blade" d="M12 1.5c5.5 4 9 10 0 21-9-11-5.5-17 0-21z"/><path class="hw-rib" d="M12 5v17"/></svg>';
  const MOON = '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle class="hw-disc" cx="60" cy="60" r="42"/><circle class="hw-crater" cx="46" cy="50" r="7"/><circle class="hw-crater" cx="70" cy="72" r="9"/><circle class="hw-crater" cx="74" cy="44" r="4"/>'
    + '<path class="hw-tiny" d="M102 22l-1-2.4-.3 2c-1.8 0-3.6-1.4-6.2-1.8-2.6-.2-4.8.9-6.1 3.1 1.7-.7 3-.2 3.9.9.9-1.1 2.6-1.1 3.5 0 1-.9 2.6-.7 3.5.8 1-.2 2 .7 2.6 2.3.6-1.6 1.6-2.5 2.6-2.3.9-1.5 2.5-1.7 3.5-.8.9-1.1 2.6-1.1 3.5 0 .9-1.1 2.2-1.6 3.9-.9-1.3-2.2-3.5-3.3-6.1-3.1-2.6.4-4.4 1.8-6.2 1.8l-.3-2z"/>'
    + '<path class="hw-tiny" d="M16 96l-.7-1.6-.2 1.3c-1.2 0-2.4-.9-4.1-1.2-1.7-.1-3.2.6-4 2 1.1-.4 2-.1 2.6.6.6-.7 1.7-.7 2.3 0 .7-.6 1.7-.5 2.3.5.7-.1 1.3.5 1.7 1.5.4-1 1-1.6 1.7-1.5.6-1 1.6-1.1 2.3-.5.6-.7 1.7-.7 2.3 0 .6-.7 1.5-1 2.6-.6-.8-1.4-2.3-2.1-4-2-1.7.3-2.9 1.2-4.1 1.2l-.2-1.3z"/></svg>';

  // a corner spiderweb, drawn from the corner (0,0): spokes plus sagging threads
  const web = () => {
    const spokes = [0, 18, 36, 54, 72, 90].map(a => a * Math.PI / 180);
    const p = (r, a) => `${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`;
    let path = spokes.map(a => `M0 0L${p(100, a)}`).join('');
    [20, 37, 54, 71, 88].forEach((r) => {
      for (let i = 0; i < spokes.length - 1; i++) {
        const a1 = spokes[i], a2 = spokes[i + 1];
        path += `M${p(r, a1)}Q${p(r * 0.84, (a1 + a2) / 2)} ${p(r, a2)}`;
      }
    });
    return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const el = (cls, html, style) => { const n = document.createElement('div'); n.className = cls; if (html) n.innerHTML = html; if (style) n.setAttribute('style', style); return n; };

  const build = () => {
    const scene = el('hw-scene');
    scene.setAttribute('aria-hidden', 'true');

    scene.append(el('hw-haze'));
    scene.append(el('hw-moon', MOON));
    scene.append(el('hw-web hw-web-bl', web()));

    // bats crossing the sky (the third one only on wider screens)
    [{ y: 14, d: 34, s: 30, dl: -6 }, { y: 26, d: 46, s: 22, dl: -28, rev: 1 }, { y: 9, d: 58, s: 18, dl: -40, wide: 1 }].forEach((b) => {
      scene.append(el(`hw-anim hw-bat${b.rev ? ' hw-rev' : ''}${b.wide ? ' hw-wide' : ''}`,
        `<div class="hw-bob">${BAT}</div>`, `--y:${b.y}vh;--d:${b.d}s;--s:${b.s}px;--dl:${b.dl}s`));
    });
    // little ghosts that appear now and then
    [{ x: 4, y: 58, dl: -3 }, { x: 88, y: 70, dl: -12, wide: 1 }].forEach((g) => {
      scene.append(el(`hw-anim hw-ghost${g.wide ? ' hw-wide' : ''}`, GHOST, `--x:${g.x}vw;--y:${g.y}vh;--dl:${g.dl}s`));
    });
    // two small pumpkins floating in the background (wider screens only; phones have the corner one)
    [{ x: 92, y: 34, s: 30, dl: 0, wide: 1 }, { x: 7, y: 84, s: 24, dl: -2, wide: 1 }].forEach((p) => {
      scene.append(el(`hw-anim hw-float${p.wide ? ' hw-wide' : ''}`, PUMPKIN(false), `--x:${p.x}vw;--y:${p.y}vh;--s:${p.s}px;--dl:${p.dl}s`));
    });
    // autumn leaves (half of them only on wider screens)
    const tints = ['#e8772e', '#c4512a', '#e9a23b', '#9c2a22'];
    for (let i = 0; i < 8; i++) {
      const dur = rand(16, 26);
      scene.append(el(`hw-anim hw-leaf${i % 2 ? ' hw-wide' : ''}`, `<div class="hw-sway">${LEAF}</div>`,
        `--x:${(i * 12.5 + rand(1, 10)).toFixed(1)}vw;--d:${dur.toFixed(1)}s;--dl:${(-rand(0, dur)).toFixed(1)}s;--sw:${rand(3, 5).toFixed(1)}s;--s:${rand(14, 22).toFixed(0)}px;--c:${tints[i % 4]}`));
    }
    // the occasional bat that swoops past
    const swoop = el('hw-anim hw-swoop', BAT);
    scene.append(swoop);
    document.body.append(scene);

    // the pumpkin in the corner: a real button that pauses / plays the animations
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hw-pumpkin';
    btn.innerHTML = PUMPKIN(true);
    const sync = () => {
      const calm = root.classList.contains('hw-calm');
      btn.setAttribute('aria-pressed', String(calm));
      btn.setAttribute('aria-label', label());
      btn.title = label();
    };
    btn.addEventListener('click', () => { const calm = root.classList.toggle('hw-calm'); store.set(calm); sync(); });
    addEventListener('langchange', sync);
    sync();
    document.body.append(btn);

    const still = matchMedia('(prefers-reduced-motion: reduce)');
    const moving = () => !still.matches && !root.classList.contains('hw-calm') && !document.hidden;

    // every 25-45 s, one bat swoops across the screen
    const next = () => setTimeout(() => {
      if (moving()) { swoop.classList.remove('go'); void swoop.offsetWidth; swoop.classList.add('go'); }
      next();
    }, rand(25000, 45000));
    next();

    // a few tiny embers follow the mouse (mouse and trackpad only, never on touch)
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const layer = el('hw-embers');
      layer.setAttribute('aria-hidden', 'true');
      document.body.append(layer);
      const pool = Array.from({ length: 10 }, () => layer.appendChild(document.createElement('i')));
      let k = 0, last = 0, lx = 0, ly = 0;
      addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || !moving()) return;
        const now = e.timeStamp;
        if (now - last < 45 || Math.hypot(e.clientX - lx, e.clientY - ly) < 14) return;
        last = now; lx = e.clientX; ly = e.clientY;
        const s = pool[k++ % pool.length];
        s.className = '';
        s.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--dx:${rand(-14, 14).toFixed(0)}px`;
        void s.offsetWidth;
        s.className = 'on';
      }, { passive: true });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
