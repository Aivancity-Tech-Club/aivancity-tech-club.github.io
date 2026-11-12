/* /nox-night: the NOX escape game night.
   - players (default): join → secret group reveal → their room, level answers, their file (saboteur), the scares
   - ?host: organizers run the night (start, scares, answers and rewards, live ranking, saboteurs, final ring)
   - ?screen: the projector in the introduction room (intro sequence, QR code, live ranking)
   - ?game=test: a separate game for rehearsals (same page, separate data)
   Data lives in Firestore under night/{game}. Players sign in anonymously (a separate Firebase app, so it never
   touches anyone's club account). Answers are never in this file: an answer is hashed on the phone and looked up
   in night/{game}/rewards/{hash}, which organizers fill from ?host. With no Firebase settings (config.js), the
   page runs on this browser's storage so it can be tried in several tabs. */
(function () {
  'use strict';
  const CFG = window.CLUB_PLATFORM || {};
  const Q = new URLSearchParams(location.search);
  const MODE = Q.has('host') ? 'host' : Q.has('screen') ? 'screen' : 'player';
  const GAME = (Q.get('game') || 'nox2026').replace(/[^a-z0-9-]/gi, '').slice(0, 30) || 'nox2026';
  const LEVELS = 4;
  const TEAMS = [
    { id: 'ravens', en: 'Ravens', fr: 'Corbeaux', color: '#e1262c' },
    { id: 'bats', en: 'Bats', fr: 'Chauves-souris', color: '#a259ff' },
    { id: 'ghosts', en: 'Ghosts', fr: 'Fantômes', color: '#38c6e8' },
    { id: 'spiders', en: 'Spiders', fr: 'Araignées', color: '#3ad66b' },
  ];
  const TEAM = Object.fromEntries(TEAMS.map(t => [t.id, t]));
  const $ = (id) => document.getElementById(id);
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fr = () => window.I18N && I18N.lang === 'fr';
  const L = (en, frText) => (fr() ? frText : en);
  const tName = (id) => (TEAM[id] ? (fr() ? TEAM[id].fr : TEAM[id].en) : id);
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  async function sha(s) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  const proofFor = (team, level, answer) => sha(`${GAME}|${team}|${level}|${norm(answer)}`);
  const mmss = (ms) => { ms = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(ms / 60)}:${String(ms % 60).padStart(2, '0')}`; };
  const P = (rest) => `night/${GAME}` + (rest ? '/' + rest : '');

  $('lang').textContent = fr() ? 'EN' : 'FR';
  $('lang').onclick = () => { I18N.set(fr() ? 'en' : 'fr'); $('lang').textContent = fr() ? 'EN' : 'FR'; render(); };
  document.body.classList.add(MODE);

  /* ================= storage: Firestore, or this browser (no Firebase settings) ================= */
  function toMs(v) { return v && typeof v.toMillis === 'function' ? v.toMillis() : (typeof v === 'number' ? v : null); }
  function plain(o) { if (!o) return o; const r = {}; for (const [k, v] of Object.entries(o)) r[k] = v && typeof v.toMillis === 'function' ? v.toMillis() : v; return r; }

  function firestoreStore(app) {
    const db = app.firestore(), FV = firebase.firestore.FieldValue;
    const ref = (p) => db.doc(p), col = (p) => db.collection(p);
    const fix = (d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v === NOW ? FV.serverTimestamp() : (v && v.__inc ? FV.increment(v.__inc) : v)]));
    return {
      async get(p) { const s = await ref(p).get(); return s.exists ? plain({ id: s.id, ...s.data() }) : null; },
      async list(p) { const s = await col(p).get(); return s.docs.map(d => plain({ id: d.id, ...d.data() })); },
      watch(p, cb) { return ref(p).onSnapshot(s => cb(s.exists ? plain({ id: s.id, ...s.data() }) : null), e => { console.error(e); cb(null, e); }); },
      watchCol(p, cb) { return col(p).onSnapshot(s => cb(s.docs.map(d => plain({ id: d.id, ...d.data() }))), e => { console.error(e); cb([], e); }); },
      set(p, d, merge) { return ref(p).set(fix(d), merge ? { merge: true } : {}); },
      update(p, d) { return ref(p).update(fix(d)); },
      del(p) { return ref(p).delete(); },
      async batch(ops) {
        for (let i = 0; i < ops.length; i += 450) {
          const b = db.batch();
          for (const o of ops.slice(i, i + 450)) {
            if (o.op === 'delete') b.delete(ref(o.path)); else if (o.op === 'update') b.update(ref(o.path), fix(o.data)); else b.set(ref(o.path), fix(o.data), o.merge ? { merge: true } : {});
          }
          await b.commit();
        }
      },
    };
  }
  function localStore() {
    const KEY = 'nox-night-local', bc = ('BroadcastChannel' in window) ? new BroadcastChannel(KEY) : null, subs = new Set();
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    const write = (all) => { localStorage.setItem(KEY, JSON.stringify(all)); fire(); if (bc) bc.postMessage(1); };
    const fire = () => subs.forEach(f => f());
    addEventListener('storage', e => { if (e.key === KEY) fire(); });
    if (bc) bc.onmessage = fire;
    const fix = (old, d) => { const r = { ...(old || {}) }; for (const [k, v] of Object.entries(d)) r[k] = v === NOW ? Date.now() : (v && v.__inc ? (r[k] || 0) + v.__inc : v); return r; };
    const kids = (all, p) => Object.keys(all).filter(k => k.startsWith(p + '/') && !k.slice(p.length + 1).includes('/')).map(k => ({ id: k.slice(p.length + 1), ...all[k] }));
    const S = {
      async get(p) { const d = read()[p]; return d ? { id: p.split('/').pop(), ...d } : null; },
      async list(p) { return kids(read(), p); },
      watch(p, cb) { const f = () => { const d = read()[p]; cb(d ? { id: p.split('/').pop(), ...d } : null); }; subs.add(f); setTimeout(f); return () => subs.delete(f); },
      watchCol(p, cb) { const f = () => cb(kids(read(), p)); subs.add(f); setTimeout(f); return () => subs.delete(f); },
      async set(p, d, merge) { const all = read(); all[p] = fix(merge ? all[p] : null, d); write(all); },
      async update(p, d) { const all = read(); if (!all[p]) throw new Error('missing ' + p); all[p] = fix(all[p], d); write(all); },
      async del(p) { const all = read(); delete all[p]; write(all); },
      async batch(ops) { const all = read(); for (const o of ops) { if (o.op === 'delete') delete all[o.path]; else if (o.op === 'update') all[o.path] = fix(all[o.path], o.data); else all[o.path] = fix(o.merge ? all[o.path] : null, o.data); } write(all); },
    };
    return S;
  }
  const NOW = { now: true };
  const INC = (n) => ({ __inc: n });

  let S = null, me = null;   // store, my uid
  async function connect(asHost) {
    if (!CFG.FIREBASE) {
      S = localStore();
      let id = null; try { id = sessionStorage.getItem('nox-night-uid'); } catch (e) {}
      if (!id) { id = 'u' + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('nox-night-uid', id); } catch (e) {} }
      me = id; return true;
    }
    const fb = await CFG.loadFirebase(['auth', 'firestore']);
    if (asHost) { S = firestoreStore(fb.app()); me = fb.auth().currentUser && fb.auth().currentUser.uid; return true; }
    // players and the projector: their own Firebase app with an anonymous sign-in (never the club account)
    const app = fb.apps.find(a => a.name === 'nox') || fb.initializeApp(CFG.FIREBASE, 'nox');
    const auth = app.auth();
    const u = auth.currentUser || await new Promise(res => { const off = auth.onAuthStateChanged(x => { off(); res(x); }); });
    me = (u || (await auth.signInAnonymously()).user).uid;
    S = firestoreStore(app);
    return true;
  }

  /* ================= sound, vibration, screen awake ================= */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {} return AC; }
  function tone({ f = 60, t = 0, d = .2, type = 'sine', v = .8, slide = 0 }) {
    const a = audio(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), s = a.currentTime + t;
    o.type = type; o.frequency.setValueAtTime(f, s); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), s + d);
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + .015); g.gain.exponentialRampToValueAtTime(0.0001, s + d);
    o.connect(g).connect(a.destination); o.start(s); o.stop(s + d + .05);
  }
  const heartbeat = (beats = 4) => { for (let i = 0; i < beats; i++) { tone({ f: 70, t: i * .85, d: .16, v: .9, slide: -30 }); tone({ f: 58, t: i * .85 + .24, d: .2, v: .75, slide: -25 }); } };
  const boom = () => { tone({ f: 90, d: 1.6, v: .95, slide: -60 }); tone({ f: 45, d: 1.8, v: .8, type: 'triangle', slide: -20 }); };
  const blip = () => tone({ f: 1400, d: .03, v: .08, type: 'square' });
  function ring(seconds = 9) {   // a loud alternating ring (an old phone / school bell, not a fire alarm)
    for (let i = 0; i < seconds * 4; i++) tone({ f: i % 2 ? 660 : 880, t: i * .25, d: .22, type: 'square', v: .35 });
  }
  const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  let wake = null;
  async function keepAwake() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) {} }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && MODE !== 'host') keepAwake(); });

  /* ================= scares (cues) — everyone's phone and the room screens play them together ================= */
  let lastCue = null, cueTimer = null;
  function playCue(c, myTeam) {
    if (!c) return;
    if (lastCue === null) { lastCue = c.n || 0; return; }   // don't replay an old scare on page load
    if (!c.n || c.n <= lastCue) return; lastCue = c.n;
    if (c.team && c.team !== 'all' && c.team !== myTeam) return;
    if (c.kind === 'intro') return;
    // a phone that was asleep or closed gets the scare late: skip it after 45 s (the final ring always plays)
    if (c.kind !== 'alarm' && game && game.cueAt && Date.now() - game.cueAt > 45000) return;
    const box = $('cue'), msg = $('cueMsg'); clearTimeout(cueTimer);
    box.className = 'layer'; msg.textContent = ''; box.hidden = false;
    const done = (ms) => { cueTimer = setTimeout(() => { box.hidden = true; box.className = 'layer'; }, ms); };
    if (c.kind === 'blackout') { heartbeat(4); buzz([120, 120, 160, 600, 120, 120, 160]); done(3200); }
    else if (c.kind === 'red') { box.classList.add('red'); boom(); buzz([600]); done(2600); }
    else if (c.kind === 'message') {
      box.classList.add('glitch'); const text = String(c.text || '').slice(0, 160); let i = 0;
      const step = () => { msg.textContent = text.slice(0, ++i); blip(); if (i < text.length) setTimeout(step, 55); else done(4500); };
      tone({ f: 50, d: .8, v: .7, slide: -10 }); setTimeout(step, 500);
    } else if (c.kind === 'alarm') {
      box.classList.add('alarm'); msg.innerHTML = L('SESSION TERMINATED<br><small>you may leave</small>', 'SESSION TERMINÉE<br><small>vous pouvez partir</small>');
      ring(9); buzz([400, 200, 400, 200, 400, 200, 400, 200, 400]); done(9500);
    } else box.hidden = true;
  }

  /* ================= shared state ================= */
  let game = null, players = [], teams = {}, mySolves = [], myRole = null, gameErr = null;
  const teamsFor = () => TEAMS.map(t => ({ ...t, ...(teams[t.id] || { level: 0, wrong: 0 }) }));
  function ranking() {
    const st = game && game.startedAt;
    return teamsFor().map(t => {
      const base = st && t.at ? t.at - st : null;
      return { ...t, time: base == null ? null : base + (t.wrong || 0) * 60000 };
    }).sort((a, b) => (b.level || 0) - (a.level || 0) || (a.time == null) - (b.time == null) || (a.time || 0) - (b.time || 0));
  }
  const timeLeft = () => (game && game.status === 'running' && game.startedAt && game.minutes ? game.startedAt + game.minutes * 60000 - Date.now() : null);

  /* ================= player ================= */
  let joinStep = 'form', joinErr = '', answerMsg = { text: '', ok: false }, lastWrong = 0, showFile = false, voted = null;
  function myPlayer() { return players.find(p => p.id === me); }
  function pickTeam() {   // the group with the fewest people (ties: at random)
    const count = (id) => players.filter(p => p.team === id).length;
    return TEAMS.map(t => t.id).sort((a, b) => count(a) - count(b) || Math.random() - .5)[0];
  }
  async function join(form) {
    const name = form.name.value.trim().replace(/\s+/g, ' ').slice(0, 30);
    if (name.length < 1) { joinErr = L('Type your first name.', 'Écrivez votre prénom.'); return render(); }
    audio(); keepAwake(); tone({ f: 40, d: .01, v: .001 });   // unlocks sound on phones (needs a tap)
    joinStep = 'saving'; render();
    try {
      players = await S.list(P('players'));
      const team = pickTeam();
      await S.set(P('players/' + me), { name, team, at: NOW });
      reveal(team);
    } catch (e) { console.error(e); joinStep = 'form'; joinErr = L('Could not join. Check your connection and try again.', 'Impossible de rejoindre. Vérifiez la connexion et réessayez.'); render(); }
  }
  function reveal(team) {
    const box = $('reveal'), noise = $('noise'), txt = $('revealText'), t = TEAM[team];
    document.documentElement.style.setProperty('--team', t.color);
    box.hidden = false; box.className = 'layer'; txt.textContent = L('identifying contributor…', 'identification du contributeur…');
    const chars = '01░▒▓<>/\\#$%&*NOXlea'; let n = 0;
    const iv = setInterval(() => { noise.textContent = Array.from({ length: 600 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); if (++n % 3 === 0) blip(); }, 70);
    heartbeat(3); buzz([100, 100, 100]);
    setTimeout(() => {
      clearInterval(iv); noise.textContent = ''; box.classList.add('done'); boom(); buzz([500]);
      const room = game && game.rooms && game.rooms[team];
      txt.innerHTML = `<div class="small">${esc(L('you are', 'vous êtes'))}</div><div class="big">${esc(tName(team).toUpperCase())}</div>`
        + (room ? `<p>${esc(L('Your room', 'Votre salle'))}: <b>${esc(room)}</b></p>` : '')
        + `<p>${esc(L("Find your group without a word. Don't trust the others.", 'Trouvez votre groupe sans un mot. Ne faites confiance à personne.'))}</p>`
        + `<button type="button" id="revealOk">${esc(L('Continue', 'Continuer'))}</button>`;
      $('revealOk').onclick = () => { box.hidden = true; joinStep = 'in'; render(); };
    }, 3200);
  }
  async function submitAnswer(form) {
    const p = myPlayer(); if (!p) return;
    const t = teams[p.team] || { level: 0 }, level = (t.level || 0) + 1, raw = form.answer.value;
    if (!norm(raw)) return;
    if (Date.now() - lastWrong < 5000) { answerMsg = { text: L('Wait a few seconds before trying again.', 'Attendez quelques secondes avant de réessayer.'), ok: false }; return render(); }
    form.querySelector('button').disabled = true;
    try {
      const proof = await proofFor(p.team, level, raw), reward = await S.get(P('rewards/' + proof));
      if (!reward) {
        lastWrong = Date.now(); buzz([80, 60, 80]); tone({ f: 120, d: .35, type: 'sawtooth', v: .25 });
        await S.update(P('teams/' + p.team), { wrong: INC(1) }).catch(e => console.error(e));
        answerMsg = { text: L('Denied. NOX adds 1 minute to your time.', 'Refusé. NOX ajoute 1 minute à votre temps.'), ok: false };
      } else {
        await S.batch([
          { op: 'set', path: P(`teams/${p.team}/solves/${level}`), data: { proof, text: reward.text || '', at: NOW, by: me } },
          { op: 'update', path: P('teams/' + p.team), data: { level, at: NOW } },
        ]);
        tone({ f: 523, d: .15, v: .3 }); tone({ f: 784, t: .15, d: .3, v: .3 }); buzz([60, 40, 60]);
        answerMsg = { text: L(`Level ${level} accepted.`, `Niveau ${level} accepté.`), ok: true };
        form.answer.value = '';
      }
    } catch (e) { console.error(e); answerMsg = { text: L('That did not go through. Try again (it may already be solved by your team).', "Ça n'est pas passé. Réessayez (votre équipe l'a peut-être déjà résolu)."), ok: false }; }
    render();
  }
  async function vote(pick) {
    const p = myPlayer(); if (!p) return;
    try { await S.set(P('votes/' + me), { team: p.team, pick }); voted = pick; } catch (e) { console.error(e); }
    render();
  }

  function renderPlayer() {
    const app = $('app'), p = myPlayer();
    if (gameErr) { app.innerHTML = `<h1>NOX</h1><p class="err">${esc(gameErr)}</p>`; return; }
    if (!game) { app.innerHTML = `<h1>NOX</h1><p class="dim">${esc(L('Not open yet. Wait for the signal.', "Pas encore ouvert. Attendez le signal."))}</p>`; return; }
    if (!p) {
      if (game.status === 'ended') { app.innerHTML = `<h1>NOX</h1><p>${esc(L('This session has ended.', 'Cette session est terminée.'))}</p>`; return; }
      app.innerHTML = `<h1 class="glitch">NOX</h1>
        <p class="dim">${esc(L('contributors found: ?', 'contributeurs trouvés : ?'))}</p>
        <form id="joinForm" class="card" novalidate>
          <label for="nm">${esc(L('Your first name', 'Votre prénom'))}</label>
          <input type="text" id="nm" name="name" maxlength="30" autocomplete="given-name" required>
          <p class="small dim" style="margin-top:12px">${esc(L('Turn your volume up and keep this page open all game: NOX will use it.', 'Montez le son et gardez cette page ouverte pendant tout le jeu : NOX va s’en servir.'))}</p>
          <button type="submit" class="go" ${joinStep === 'saving' ? 'disabled' : ''}>${esc(L('Reveal my group', 'Révéler mon groupe'))}</button>
          <p class="err" role="alert">${esc(joinErr)}</p>
        </form>`;
      $('joinForm').onsubmit = (e) => { e.preventDefault(); join(e.target); };
      return;
    }
    const t = TEAM[p.team]; document.documentElement.style.setProperty('--team', t.color);
    const team = teams[p.team] || { level: 0, wrong: 0 }, level = team.level || 0, mates = players.filter(x => x.team === p.team);
    const room = game.rooms && game.rooms[p.team], left = timeLeft();
    let h = `<div class="band"><span class="small">${esc(L('your group', 'votre groupe'))}</span><b>${esc(tName(p.team).toUpperCase())}</b>${room ? `${esc(L('Room', 'Salle'))} ${esc(room)}` : ''}</div>`;
    if (game.status === 'lobby') {
      h += `<div class="card"><h2>${esc(L('Stay with your group.', 'Restez avec votre groupe.'))}</h2><p class="dim">${esc(L('NOX is waking up. The game starts on the signal.', 'NOX se réveille. Le jeu commence au signal.'))}</p></div>`;
    } else if (game.status === 'running') {
      h += `<div class="card"><div class="row" style="justify-content:space-between;margin:0"><span>${esc(L('Level', 'Niveau'))} ${Math.min(level + 1, LEVELS)} / ${LEVELS}</span>${left != null ? `<span class="timer" id="tl">${mmss(left)}</span>` : ''}</div>
        <div class="lv">${Array.from({ length: LEVELS }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('')}</div>`;
      if (level === 0) h += `<p>${esc(L('Start here: clone her repository and read what she left.', 'Commencez ici : clonez son dépôt et lisez ce qu’elle a laissé.'))}</p><p class="reward">git clone ${esc(game.repo || 'https://github.com/lea-marchand-aivancity/nox')}</p>`;
      if (level < LEVELS) {
        h += `<form id="ansForm" novalidate><label for="ans">${esc(L(`Answer for level ${level + 1}`, `Réponse du niveau ${level + 1}`))}</label>
          <input type="text" id="ans" name="answer" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="80">
          <button type="submit" class="go">${esc(L('Send to NOX', 'Envoyer à NOX'))}</button>
          <p class="${answerMsg.ok ? 'ok' : 'err'}" role="status">${esc(answerMsg.text)}</p></form>`;
      } else h += `<h2 class="ok">${esc(L('All four levels solved.', 'Les quatre niveaux sont résolus.'))}</h2><p class="dim">${esc(L('Wait in your room for the signal.', 'Attendez le signal dans votre salle.'))}</p>`;
      if ((team.wrong || 0) > 0) h += `<p class="small dim">${esc(L(`Penalties: +${team.wrong} min`, `Pénalités : +${team.wrong} min`))}</p>`;
      h += `</div>`;
      if (mySolves.length) h += `<div class="card"><h2>${esc(L('What NOX gave you', 'Ce que NOX vous a donné'))}</h2>${mySolves.slice().sort((a, b) => a.id - b.id).map(s => `<div class="reward"><b>${esc(L('Level', 'Niveau'))} ${esc(s.id)}</b>\n${esc(s.text)}</div>`).join('')}</div>`;
    } else if (game.status === 'ended') {
      h += `<div class="card"><h2>${esc(L('Session terminated.', 'Session terminée.'))}</h2><p>${esc(L('You may leave. Thank you for playing.', 'Vous pouvez partir. Merci d’avoir joué.'))}</p></div>`;
      h += rankCard();
      if (myRole && myRole.saboteur === false && mates.length > 1) {
        h += `<div class="card"><h2>${esc(L('Who was your saboteur?', 'Qui était votre saboteur ?'))}</h2><div class="row">${mates.filter(m => m.id !== me).map(m => `<button type="button" data-vote="${esc(m.id)}" ${voted === m.id ? 'style="border-color:var(--team)"' : ''}>${esc(m.name)}</button>`).join('')}</div>${voted ? `<p class="ok small">${esc(L('Vote saved.', 'Vote enregistré.'))}</p>` : ''}</div>`;
      }
    }
    // your file (saboteur) — everyone has the button, so it gives nobody away
    h += `<div class="card"><button type="button" id="fileBtn" style="width:100%">${esc(showFile ? L('Close your file', 'Fermer votre dossier') : L('Open your file', 'Ouvrir votre dossier'))}</button>`;
    if (showFile) {
      if (!myRole) h += `<p class="dim" style="margin-top:12px">${esc(L('Your file is still sealed. Check again when the game starts.', 'Votre dossier est encore scellé. Revenez quand le jeu commence.'))}</p>`;
      else if (myRole.saboteur) h += `<h2 style="margin-top:14px;color:var(--red)">${esc(L('You are the saboteur.', 'Vous êtes le saboteur.'))}</h2><p>${esc(L('NOX needs them to stay. Slow your group down without being caught:', 'NOX a besoin qu’ils restent. Ralentissez votre groupe sans vous faire prendre :'))}</p><ul>${(myRole.missions || []).map(i => `<li>${esc(MISSIONS[i] ? L(MISSIONS[i][0], MISSIONS[i][1]) : '')}</li>`).join('')}</ul><p class="small dim">${esc(L("Rules: don't touch anyone's laptop, don't delete files, don't damage the props. Close this file before anyone sees it.", 'Règles : ne touchez à aucun ordinateur, ne supprimez aucun fichier, n’abîmez pas les objets. Fermez ce dossier avant qu’on le voie.'))}</p>`;
      else h += `<h2 style="margin-top:14px">${esc(L('Clean.', 'Clean.'))}</h2><p>${esc(L("But someone in your group isn't. Watch who slows you down.", "Mais quelqu'un dans votre groupe ne l'est pas. Surveillez qui vous ralentit."))}</p>`;
    }
    h += `</div><p class="small dim">${esc(L(`${mates.length} in your group`, `${mates.length} dans votre groupe`))}: ${mates.map(m => esc(m.name)).join(', ')}</p>`;
    app.innerHTML = h;
    const af = $('ansForm'); if (af) af.onsubmit = (e) => { e.preventDefault(); submitAnswer(e.target); };
    $('fileBtn').onclick = () => { showFile = !showFile; render(); };
    app.querySelectorAll('[data-vote]').forEach(b => { b.onclick = () => vote(b.dataset.vote); });
  }
  function rankCard() {
    return `<div class="card"><h2>${esc(L('Ranking', 'Classement'))}</h2><table><tr><th>#</th><th>${esc(L('Group', 'Groupe'))}</th><th>${esc(L('Levels', 'Niveaux'))}</th><th>${esc(L('Time', 'Temps'))}</th></tr>${ranking().map((t, i) => `<tr><td>${i + 1}</td><td><span class="sw" style="background:${t.color}"></span>${esc(tName(t.id))}</td><td>${t.level || 0}/${LEVELS}</td><td>${t.time == null ? '–' : mmss(t.time)}${t.wrong ? ` <span class="dim small">(+${t.wrong})</span>` : ''}</td></tr>`).join('')}</table></div>`;
  }

  /* ================= saboteur missions ================= */
  const MISSIONS = [
    ['Convince your group the answer is hidden in the README, for at least two minutes.', 'Convainquez votre groupe que la réponse est cachée dans le README, pendant au moins deux minutes.'],
    ['Say "did you hear that?" three times, looking at the door each time.', 'Dites « vous avez entendu ? » trois fois, en regardant la porte à chaque fois.'],
    ['Get your group to send one wrong answer.', 'Faites envoyer une mauvaise réponse à votre groupe.'],
    ['Keep a printed clue in your pocket for a full minute while they look for it.', 'Gardez un indice imprimé dans votre poche une minute entière pendant qu’ils le cherchent.'],
    ['Every time someone says "NOX", whisper "she\'s still here".', 'Chaque fois que quelqu’un dit « NOX », chuchotez « elle est encore là ».'],
    ['Insist, at least twice, that the laptop should be restarted (never actually do it).', 'Insistez au moins deux fois pour redémarrer l’ordinateur (sans jamais le faire).'],
    ['Read a clue out loud but change one word.', 'Lisez un indice à voix haute en changeant un mot.'],
    ['Suggest splitting up "to go faster" at least once.', 'Proposez au moins une fois de vous séparer « pour aller plus vite ».'],
  ];

  /* ================= projector screen ================= */
  const INTRO = [
    ['31/10/2023 18:44', "lea: rule #1: never let the user quit before the task is finished"],
    ['31/10/2023 18:46', "lea: told NOX: don't let me stop until it's done"],
    ['31/10/2023 22:48', "lea: the cleaner said goodnight. i'm the last one here"],
    ['31/10/2023 23:59', 'lea: 23:59. deadline. not done.'],
    ['01/11/2023 00:44', 'lea: someone keeps walking past the door'],
    ['01/11/2023 02:09', "lea: it won't let me close the laptop"],
    ['01/11/2023 02:10', 'nox: user requested logout. denied.'],
    ['01/11/2023 02:11', 'lea: why is the door handle moving'],
    ['01/11/2023 03:13', 'lea: done. i can go home now'],
    ['01/11/2023 03:14', 'nox: deadline 31/10 23:59 exceeded. task reopened.'],
    ['01/11/2023 03:14', 'nox: rule #1: user may not leave.'],
    ['01/11/2023 07:42', 'nox: unknown user. not lea. access denied.'],
    ['31/10/2024 03:13', 'nox: contributors found: 4'],
    ['31/10/2025 03:13', 'nox: contributors found: 5'],
    ['tonight 03:13', 'nox: contributors found: ?'],
  ];
  let introRunning = false;
  function playIntro() {
    if (introRunning) return; introRunning = true;
    const box = $('intro'), pre = $('introText'); box.hidden = false; pre.innerHTML = '';
    let li = 0;
    const nextLine = () => {
      if (li >= INTRO.length) { heartbeat(6); setTimeout(() => { boom(); pre.innerHTML += `\n\n<span class="n">${esc(L('scan the code. find out what you are.', 'scannez le code. découvrez ce que vous êtes.'))}</span>`; setTimeout(() => { box.hidden = true; introRunning = false; render(); }, 7000); }, 5200); return; }
      const [ts, text] = INTRO[li++], isNox = text.startsWith('nox:'), span = document.createElement('span');
      if (isNox) span.className = 'n'; pre.appendChild(document.createTextNode((li > 1 ? '\n' : '') + ts + '  ')); pre.appendChild(span);
      let i = 0; const ch = () => { span.textContent = text.slice(0, ++i); if (i % 2) blip(); if (i < text.length) setTimeout(ch, isNox ? 45 : 60); else { if (isNox) boom(); setTimeout(nextLine, isNox ? 1700 : 1100); } };
      ch();
    };
    tone({ f: 40, d: 3, v: .6 }); setTimeout(nextLine, 2500);
  }
  let lastIntro = null;
  function screenCue(c) {
    if (!c) return;
    if (lastIntro === null) { lastIntro = c.n || 0; return; }
    if (!c.n || c.n <= lastIntro) return; lastIntro = c.n;
    if (c.kind === 'intro') playIntro();
    else { lastCue = c.n - 1; playCue(c, null); }
  }
  function renderScreen() {
    const app = $('app');
    if (!game) { app.innerHTML = `<h1>NOX</h1><p class="dim">${esc(L('Waiting for the organizers to open the game.', 'En attente de l’ouverture du jeu.'))}</p>`; return; }
    const url = location.origin + location.pathname + (GAME !== 'nox2026' ? '?game=' + GAME : '');
    if (game.status === 'lobby') {
      app.innerHTML = `<h1 class="glitch">NOX // ${esc(L('contributors found', 'contributeurs trouvés'))}: ${players.length || '?'}</h1>
        <div class="split"><div><div class="qr"><img src="assets/qr-nox-night.svg" alt=""></div><p class="url dim">${esc(url.replace(/^https?:\/\//, ''))}</p></div>
        <div class="counts">${TEAMS.map(t => `<p><span class="sw" style="background:${t.color};width:3vh;height:3vh"></span>${esc(tName(t.id))}: ${players.filter(p => p.team === t.id).length}</p>`).join('')}
        <p class="dim" style="font-size:2.4vh">${esc(L('Scan. Turn your volume up. Keep the page open.', 'Scannez. Montez le son. Gardez la page ouverte.'))}</p></div></div>`;
    } else {
      const left = timeLeft();
      app.innerHTML = `<h1>NOX // ${game.status === 'ended' ? esc(L('session terminated', 'session terminée')) : esc(L('live', 'en direct'))}${left != null ? ` <span class="dim" id="tl">${mmss(left)}</span>` : ''}</h1>${rankCard()}`;
    }
  }

  /* ================= host ================= */
  let isOrg = false, hostMsg = '', roles = [], votes = [], rewardsLevel = {};
  async function hostWrite(fn, ok) {
    try { await fn(); hostMsg = ok || ''; } catch (e) { console.error(e); hostMsg = L('Failed: ', 'Échec : ') + (e.code || e.message); }
    render();
  }
  async function cue(kind, team, text) {
    const n = ((game && game.cue && game.cue.n) || 0) + 1;
    await hostWrite(() => S.update(P(), { cue: { n, kind, team: team || 'all', text: text || '' }, cueAt: NOW }), L('Sent.', 'Envoyé.'));
  }
  async function setupGame() {
    const ops = [{ op: 'set', path: P(), data: { status: 'lobby', minutes: 75, startedAt: null, rooms: {}, repo: 'https://github.com/lea-marchand-aivancity/nox', cue: { n: 0 } }, merge: true }];
    TEAMS.forEach(t => ops.push({ op: 'set', path: P('teams/' + t.id), data: { level: 0, wrong: 0, at: null } }));
    await hostWrite(() => S.batch(ops), L('Game ready.', 'Jeu prêt.'));
  }
  async function resetGame() {
    await hostWrite(async () => {
      const ops = [];
      for (const c of ['players', 'roles', 'votes']) (await S.list(P(c))).forEach(d => ops.push({ op: 'delete', path: P(c + '/' + d.id) }));
      for (const t of TEAMS) {
        (await S.list(P(`teams/${t.id}/solves`))).forEach(d => ops.push({ op: 'delete', path: P(`teams/${t.id}/solves/${d.id}`) }));
        ops.push({ op: 'set', path: P('teams/' + t.id), data: { level: 0, wrong: 0, at: null } });
      }
      ops.push({ op: 'update', path: P(), data: { status: 'lobby', startedAt: null } });
      await S.batch(ops);
    }, L('Reset: no players, every group back at level 0.', 'Remis à zéro : aucun joueur, chaque groupe au niveau 0.'));
  }
  async function saveRewards(form) {
    await hostWrite(async () => {
      // a level with a new answer replaces its old one; a level left blank keeps its answer (its text can still change)
      const old = await S.list(P('rewards')), ops = [], summary = {}, prev = (game && game.rewardsInfo) || {};
      for (let lv = 1; lv <= LEVELS; lv++) {
        const ans = form['a' + lv].value, text = form['r' + lv].value.trim().slice(0, 500), mine = old.filter(r => r.level === lv);
        if (norm(ans)) {
          mine.forEach(r => ops.push({ op: 'delete', path: P('rewards/' + r.id) }));
          for (const t of TEAMS) ops.push({ op: 'set', path: P('rewards/' + await proofFor(t.id, lv, ans)), data: { team: t.id, level: lv, text } });
          summary[lv] = { text, set: true };
        } else {
          mine.forEach(r => ops.push({ op: 'update', path: P('rewards/' + r.id), data: { text } }));
          summary[lv] = { text, set: !!(prev[lv] && prev[lv].set && mine.length) };
        }
      }
      ops.push({ op: 'update', path: P(), data: { rewardsInfo: summary } });
      await S.batch(ops);
    }, L('Answers saved. The answers themselves are not stored, only their fingerprints.', 'Réponses enregistrées. Seules leurs empreintes sont stockées, pas les réponses.'));
  }
  async function pickSaboteurs() {
    await hostWrite(async () => {
      const ops = (await S.list(P('roles'))).map(r => ({ op: 'delete', path: P('roles/' + r.id) }));
      for (const t of TEAMS) {
        const mates = players.filter(p => p.team === t.id); if (mates.length < 3) { mates.forEach(m => ops.push({ op: 'set', path: P('roles/' + m.id), data: { saboteur: false } })); continue; }
        const sab = mates[Math.floor(Math.random() * mates.length)].id;
        const pool = MISSIONS.map((_, i) => i).sort(() => Math.random() - .5);
        mates.forEach(m => ops.push({ op: 'set', path: P('roles/' + m.id), data: m.id === sab ? { saboteur: true, missions: pool.slice(0, 3) } : { saboteur: false } }));
      }
      await S.batch(ops);
    }, L('One saboteur picked in each group. Their files are open.', 'Un saboteur choisi dans chaque groupe. Leurs dossiers sont ouverts.'));
  }
  function renderHost() {
    const app = $('app');
    if (!isOrg) { app.innerHTML = `<h1>NOX // host</h1><p>${esc(L('Sign in on the club site with an organizer account, then reload this page.', 'Connectez-vous sur le site du club avec un compte organisateur, puis rechargez cette page.'))}</p><p><a href="/mountain" style="color:var(--red)">/mountain</a></p>`; return; }
    if (!game) { app.innerHTML = `<h1>NOX // host · ${esc(GAME)}</h1><p>${esc(L('This game does not exist yet.', "Ce jeu n'existe pas encore."))}</p><button class="go" id="setup">${esc(L('Create the game', 'Créer le jeu'))}</button><p class="err">${esc(hostMsg)}</p>`; $('setup').onclick = setupGame; return; }
    const left = timeLeft(), ri = game.rewardsInfo || {};
    const sab = Object.fromEntries(roles.filter(r => r.saboteur).map(r => [r.id, true]));
    let h = `<h1>NOX // host · ${esc(GAME)} <span class="dim small">${esc(game.status)}${left != null ? ' · ' + `<span id="tl">${mmss(left)}</span>` : ''}</span></h1><p class="${hostMsg.startsWith(L('Failed', 'Échec')) ? 'err' : 'ok'}" role="status">${esc(hostMsg)}</p><div class="grid">`;
    // run the night
    h += `<div class="card"><h2>${esc(L('Run the night', 'Déroulé'))}</h2>
      <div class="row"><button data-cue="intro">${esc(L('Play the intro (projector)', "Lancer l'intro (projecteur)"))}</button></div>
      <div class="row"><button id="start" ${game.status === 'running' ? 'disabled' : ''}>${esc(L('Start the game', 'Démarrer le jeu'))}</button><button id="pick">${esc(L('Pick saboteurs', 'Choisir les saboteurs'))}</button></div>
      <div class="row"><button id="end" style="border-color:var(--red)" ${game.status === 'ended' ? 'disabled' : ''}>${esc(L('End: ring every phone', 'Fin : faire sonner tous les téléphones'))}</button></div>
      <label for="mins">${esc(L('Game length (minutes)', 'Durée du jeu (minutes)'))}</label><input type="text" id="mins" inputmode="numeric" value="${esc(game.minutes || 75)}">
      ${TEAMS.map(t => `<label for="room_${t.id}"><span class="sw" style="background:${t.color}"></span>${esc(tName(t.id))}: ${esc(L('room', 'salle'))}</label><input type="text" id="room_${t.id}" value="${esc((game.rooms || {})[t.id] || '')}" maxlength="30">`).join('')}
      <div class="row"><button id="saveSet">${esc(L('Save length and rooms', 'Enregistrer durée et salles'))}</button></div>
      <details style="margin-top:10px"><summary class="dim small">${esc(L('Reset (rehearsal only)', 'Remise à zéro (répétition)'))}</summary><button id="reset" style="margin-top:8px">${esc(L('Delete all players and progress', 'Supprimer joueurs et progression'))}</button></details></div>`;
    // scares
    h += `<div class="card"><h2>${esc(L('Scares', 'Frayeurs'))}</h2><label for="cueTeam">${esc(L('Who', 'Qui'))}</label><select id="cueTeam"><option value="all">${esc(L('Every group', 'Tous les groupes'))}</option>${TEAMS.map(t => `<option value="${t.id}">${esc(tName(t.id))}</option>`).join('')}</select>
      <div class="row"><button data-cue="blackout">${esc(L('Blackout 3 s + heartbeat', 'Noir 3 s + battements'))}</button><button data-cue="red">${esc(L('Red flash + boom', 'Flash rouge + boum'))}</button></div>
      <label for="cueText">${esc(L('NOX message', 'Message de NOX'))}</label><input type="text" id="cueText" maxlength="160" value="rule #1: user may not leave.">
      <div class="row"><button data-cue="message">${esc(L('Send the message', 'Envoyer le message'))}</button></div>
      <p class="small dim">${esc(L('Quick lines:', 'Phrases prêtes :'))}</p><div class="row">${['unknown user. not lea. access denied.', 'i can see you.', 'someone is walking past the door.', 'session lea: kept alive.', 'deadline in 10 minutes.'].map(x => `<button class="small" data-line="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`;
    // ranking
    h += rankCard();
    // answers and rewards
    h += `<div class="card"><h2>${esc(L('Answers and what each one unlocks', 'Réponses et ce que chacune débloque'))}</h2><form id="rw">${Array.from({ length: LEVELS }, (_, i) => i + 1).map(lv => `<label for="a${lv}">${esc(L('Level', 'Niveau'))} ${lv} ${ri[lv] && ri[lv].set ? '<span class="ok small">✓</span>' : ''}</label><input type="text" id="a${lv}" name="a${lv}" autocomplete="off" placeholder="${esc(ri[lv] && ri[lv].set ? L('saved (type again to change)', 'enregistrée (retapez pour changer)') : L('the answer', 'la réponse'))}"><textarea name="r${lv}" rows="2" placeholder="${esc(L('What the team sees (e.g. Open envelope 2 / Padlock code 0313)', "Ce que l'équipe voit (ex. Ouvrez l'enveloppe 2 / Cadenas 0313)"))}">${esc(ri[lv] ? ri[lv].text : '')}</textarea>`).join('')}
      <p class="small dim">${esc(L('Leave an answer blank to keep the saved one. Case, spaces and punctuation are ignored ("Do not leave" = "do-not-leave").', 'Laissez une réponse vide pour garder celle enregistrée. Majuscules, espaces et ponctuation ignorés.'))}</p>
      <button type="submit" class="go">${esc(L('Save answers', 'Enregistrer les réponses'))}</button></form></div>`;
    // players
    h += `<div class="card"><h2>${esc(L('Players', 'Joueurs'))} (${players.length})</h2>${TEAMS.map(t => { const m = players.filter(p => p.team === t.id); return `<p style="margin:10px 0 4px"><span class="sw" style="background:${t.color}"></span><b>${esc(tName(t.id))}</b> · ${m.length}</p><ul class="plain">${m.map(p => `<li>${esc(p.name)}${sab[p.id] ? ' <span style="color:var(--red)">' + esc(L('saboteur', 'saboteur')) + '</span>' : ''} <select data-move="${esc(p.id)}" aria-label="${esc(L('Move', 'Déplacer'))}">${TEAMS.map(x => `<option value="${x.id}" ${x.id === p.team ? 'selected' : ''}>${esc(tName(x.id))}</option>`).join('')}</select></li>`).join('')}</ul>`; }).join('')}</div>`;
    // votes
    if (votes.length) {
      const name = (id) => (players.find(p => p.id === id) || {}).name || '?';
      h += `<div class="card"><h2>${esc(L('Saboteur votes', 'Votes saboteur'))}</h2>${TEAMS.map(t => { const v = votes.filter(x => x.team === t.id), c = {}; v.forEach(x => { c[x.pick] = (c[x.pick] || 0) + 1; }); return v.length ? `<p><b>${esc(tName(t.id))}</b>: ${Object.entries(c).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${esc(name(id))} ${n}${sab[id] ? ' ✓' : ''}`).join(', ')}</p>` : ''; }).join('')}</div>`;
    }
    h += `</div><p class="small dim">${esc(L('Projector:', 'Projecteur :'))} ${esc(location.pathname)}?screen${GAME !== 'nox2026' ? '&game=' + esc(GAME) : ''}</p>`;
    app.innerHTML = h;
    app.querySelectorAll('[data-cue]').forEach(b => { b.onclick = () => cue(b.dataset.cue, b.dataset.cue === 'intro' ? 'all' : $('cueTeam').value, $('cueText').value); });
    app.querySelectorAll('[data-line]').forEach(b => { b.onclick = () => { $('cueText').value = b.dataset.line; cue('message', $('cueTeam').value, b.dataset.line); }; });
    app.querySelectorAll('[data-move]').forEach(s => { s.onchange = () => hostWrite(() => S.update(P('players/' + s.dataset.move), { team: s.value }), L('Moved.', 'Déplacé.')); });
    $('start').onclick = () => hostWrite(() => S.update(P(), { status: 'running', startedAt: NOW }), L('Started. Every phone shows level 1.', 'Démarré. Chaque téléphone affiche le niveau 1.'));
    $('end').onclick = async () => { await hostWrite(() => S.update(P(), { status: 'ended' })); cue('alarm', 'all'); };
    $('pick').onclick = pickSaboteurs;
    $('reset').onclick = () => { if (confirm(L('Delete every player and all progress?', 'Supprimer tous les joueurs et la progression ?'))) resetGame(); };
    $('saveSet').onclick = () => hostWrite(() => S.update(P(), { minutes: Math.max(5, Math.min(300, parseInt($('mins').value, 10) || 75)), rooms: Object.fromEntries(TEAMS.map(t => [t.id, $('room_' + t.id).value.trim().slice(0, 30)])) }), L('Saved.', 'Enregistré.'));
    $('rw').onsubmit = (e) => { e.preventDefault(); saveRewards(e.target); };
  }

  /* ================= wiring ================= */
  function render() {
    if (MODE === 'host') { const a = document.activeElement; if (a && a.closest && a.closest('#app') && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return; renderHost(); }
    else if (MODE === 'screen') renderScreen();
    else { if (joinStep === 'saving') return; const a = document.activeElement; if (a && a.id === 'ans' && a.value) return; if (a && a.id === 'nm') return; renderPlayer(); }
  }
  setInterval(() => { const el = $('tl'), l = timeLeft(); if (el && l != null) el.textContent = mmss(l); }, 1000);
  document.addEventListener('focusout', () => setTimeout(render, 50));

  let watchingTeam = null, offSolves = null, offRole = null;
  function watchMine() {
    const p = myPlayer();
    if (!offRole) offRole = S.watch(P('roles/' + me), r => { myRole = r; render(); });
    if (!p || p.team === watchingTeam) return;
    watchingTeam = p.team; if (offSolves) offSolves();
    offSolves = S.watchCol(P(`teams/${p.team}/solves`), s => { mySolves = s; render(); });
  }

  async function start() {
    try {
      if (MODE === 'host') {
        if (!CFG.FIREBASE) isOrg = true;
        else {
          const data = ClubData.create(); await data.init();
          await new Promise(res => data.onAuth(async (u) => {
            if (u && u.verified) { const prof = await data.getProfile(u.uid).catch(() => null); isOrg = !!(prof && prof.role === 'organizer'); }
            res();
          }));
        }
        if (!isOrg) return render();
      }
      await connect(MODE === 'host');
    } catch (e) { console.error(e); gameErr = L('NOX could not connect. Check your connection and reload.', 'NOX ne peut pas se connecter. Vérifiez la connexion et rechargez.'); return render(); }
    S.watch(P(), g => {
      game = g;
      if (g) { const c = g.cue || { n: 0 }; if (MODE === 'screen') screenCue(c); else if (MODE === 'player') { const p = myPlayer(); playCue(c, p && p.team); } }
      render();
    });
    S.watchCol(P('players'), ps => { players = ps; if (MODE === 'player') watchMine(); render(); });
    S.watchCol(P('teams'), ts => { teams = Object.fromEntries(ts.map(t => [t.id, t])); render(); });
    if (MODE === 'host') { S.watchCol(P('roles'), r => { roles = r; render(); }); S.watchCol(P('votes'), v => { votes = v; render(); }); }
    if (MODE === 'screen') document.addEventListener('click', () => { audio(); keepAwake(); }, { once: true });
  }
  start();
})();
