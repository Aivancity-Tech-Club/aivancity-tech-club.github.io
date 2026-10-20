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
   Everything sits behind the page content and ignores clicks, so nothing on the page changes.
   (No cursor effects: anything that follows the mouse can get in the way of clicking.) */
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

  // the only text this adds (kept here so removing the theme touches nothing else)
  const TEXT = {
    en: { label: 'Pause the Halloween animations (tap three times for a surprise)', presents: 'aivancity Tech Club presents', title: 'A Night on the Mountain', skip: 'Tap to skip', skipKey: 'Click or press any key to skip' },
    fr: { label: 'Mettre en pause les animations d’Halloween (touchez trois fois pour une surprise)', presents: 'L’aivancity Tech Club présente', title: 'Une nuit sur la Montagne', skip: 'Touchez pour passer', skipKey: 'Cliquez ou appuyez sur une touche pour passer' },
  };
  const tx = (k) => TEXT[root.lang === 'fr' ? 'fr' : 'en'][k];
  const label = () => tx('label');

  /* the opening scene is decided right away (this file is not deferred on the home page), so a dark curtain covers the
     page from its first frame instead of the page flashing up and then being covered. It only plays on the home page,
     once per device, in a visible tab, without a #link, and never with "less motion", high contrast or paused animations. */
  const mq = (m) => matchMedia(m).matches;
  let introSeen = false; try { introSeen = localStorage.getItem('hw-intro') === '1'; } catch (e) {}
  const playIntro = /^\/(index(\.html)?)?$/.test(location.pathname) && !location.hash && !introSeen && !document.hidden
    && !root.classList.contains('hw-calm') && !mq('(prefers-reduced-motion: reduce)') && !mq('(forced-colors: active)');
  if (playIntro) {
    root.classList.add('hw-pre');
    const st = document.createElement('style');
    st.textContent = 'html.hw-pre{overflow:hidden}html.hw-pre::after{content:"";position:fixed;inset:0;z-index:399;background:#0d0912}';
    document.head.appendChild(st);
    setTimeout(() => root.classList.remove('hw-pre'), 4000);   // safety: never leave the curtain up if something fails
  }

  /* ---------- artwork (hand-drawn style: flat fills, dark outline) ---------- */
  // a bat seen from the side, flying to the right: the near wing flaps around the shoulder, the far wing follows
  const BAT = '<svg viewBox="0 0 60 36" aria-hidden="true" focusable="false">'
    + '<path class="hw-wing hw-far" d="M28.5 20C27.5 13 24 7 18 3C17 6 14.5 8 10 8.5C12 10.5 12.5 13 11.5 15.5C14.5 15 17 16.5 18 19C20.5 17.8 23.5 18.2 25 20.5Z"/>'
    + '<path class="hw-body" d="M17 22.5C19 19 25 18 32 18.5L37 17.5L38 13.5L40 16.6L42.5 14L43 17.8C45.5 19 46.5 21 45 22.6C43 24.4 38 24.6 33 24.6C27 25.6 21 26 17 22.5Z"/>'
    + '<circle class="hw-beye" cx="42.3" cy="19.8" r=".9"/>'
    + '<path class="hw-wing" d="M31.5 20C30 11 25 4 16 .5C15 4 12 6.5 6 7C8.5 9.5 9 12.5 7.5 15.5C11.5 14.8 14.5 16.5 15.5 19.5C18.5 17.8 22.5 18 25 21Z"/></svg>';
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
    // slow fog along the bottom, like a film poster (two layers drifting at different speeds)
    scene.append(el('hw-fog hw-fog-a'), el('hw-fog hw-fog-b'));
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
    // one tap: pause / play. Three quick taps: the surprise (and the pause setting stays as it was)
    let taps = 0, firstState = false, tapTimer = null;
    btn.addEventListener('click', () => {
      if (!taps) firstState = root.classList.contains('hw-calm');
      taps++; clearTimeout(tapTimer); tapTimer = setTimeout(() => { taps = 0; }, 700);
      if (taps >= 3) { taps = 0; root.classList.toggle('hw-calm', firstState); store.set(firstState); sync(); scare(); return; }
      const calm = root.classList.toggle('hw-calm'); store.set(calm); sync();
    });
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

    /* ---------- the dripping edge comes alive: now and then a drop swells under the edge and falls ---------- */
    const header = document.querySelector('.site-header');
    if (header) {
      const drops = el('hw-drops'); drops.setAttribute('aria-hidden', 'true'); header.append(drops);
      const drip = () => {
        if (moving() && drops.childElementCount < 3) {
          const d = el('hw-drop', '', `left:${rand(2, 97).toFixed(1)}%;--fall:${rand(50, 110).toFixed(0)}px;--t:${rand(2.6, 4.2).toFixed(1)}s`);
          d.addEventListener('animationend', () => d.remove());
          drops.append(d);
        }
        setTimeout(drip, rand(1800, 4200));
      };
      setTimeout(drip, 1200);
    }

    /* ---------- the pumpkin surprise: the lights dim, two eyes open in the dark, a low growl ---------- */
    let scaring = false;
    function growl() {
      try {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        const ac = new AC(), o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(70, ac.currentTime); o.frequency.linearRampToValueAtTime(48, ac.currentTime + 1.2);
        o2.type = 'sine'; o2.frequency.setValueAtTime(6, ac.currentTime);   // a slow wobble
        const wob = ac.createGain(); wob.gain.value = 12; o2.connect(wob); wob.connect(o.frequency);
        f.type = 'lowpass'; f.frequency.value = 260;
        g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.3);
        o.connect(f); f.connect(g); g.connect(ac.destination);
        o.start(); o2.start(); o.stop(ac.currentTime + 1.35); o2.stop(ac.currentTime + 1.35);
        setTimeout(() => ac.close && ac.close(), 1600);
      } catch (e) { /* no sound: the picture is enough */ }
    }
    function scare() {
      if (scaring) return; scaring = true;
      const calm = still.matches;
      const s = el('hw-scare' + (calm ? ' hw-still' : ''), '<div class="hw-eyes"><i></i><i></i></div>');
      s.setAttribute('aria-hidden', 'true');
      document.body.append(s);
      if (!calm) growl();
      const end = () => { s.classList.add('out'); setTimeout(() => { s.remove(); scaring = false; }, 600); };
      setTimeout(end, calm ? 1200 : 2600);
      s.addEventListener('click', end, { once: true });
    }

    /* ---------- the opening scene: a 3.5 s title card (moon, credit, title, hold, fade), skippable at any moment ---------- */
    if (playIntro) {
      try { localStorage.setItem('hw-intro', '1'); } catch (e) {}
      const touch = mq('(hover: none)');
      const intro = el('hw-intro', `<div class="hw-intro-fog"></div><div class="hw-intro-moon"></div>
        <div class="hw-intro-text"><small>${tx('presents')}</small><b>${tx('title')}</b></div><span class="hw-intro-skip">${tx(touch ? 'skip' : 'skipKey')}</span>`);
      intro.setAttribute('aria-hidden', 'true');
      document.body.append(intro);
      root.classList.add('hw-intro-on');
      root.classList.remove('hw-pre');
      const evs = ['keydown', 'wheel', 'touchmove'];
      let timer;
      const done = () => {
        if (intro.classList.contains('out')) return;
        clearTimeout(timer); intro.classList.add('out'); root.classList.remove('hw-intro-on');
        evs.forEach(t => removeEventListener(t, done)); setTimeout(() => intro.remove(), 700);
      };
      intro.addEventListener('click', done); evs.forEach(t => addEventListener(t, done, { passive: true }));
      // start once the title font is ready (at most 0.5 s), so the title never changes typeface mid-animation
      const font = document.fonts && document.fonts.load ? document.fonts.load('italic 60px "Instrument Serif"').catch(() => {}) : null;
      Promise.race([font, new Promise(r => setTimeout(r, 500))]).then(() => {
        intro.classList.add('go');
        timer = setTimeout(done, 3100);
      });
      document.addEventListener('visibilitychange', () => { if (document.hidden) done(); }, { once: true });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
