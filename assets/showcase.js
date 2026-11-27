/* /showcase: apps built by aivancity students. The list lives in assets/showcase-apps.js.
   Newest first. Category buttons and a search box filter the cards; the chosen category is kept in the address (?c=health) so it can be shared.
   The home page uses this file too (#scHome): one big "app of the day" (featured: true first, otherwise a different one each day) and small tiles for all the others.

   From the club database (Firestore), read without loading Firebase for visitors (one small REST request each):
   - showcaseHidden/{appId}        organizers hide an app with the "Hide from the site" button on its card; it disappears for everyone else
   - showcaseVotes/{appId}_{uid}   { app, v: 1 | -1 } one like or dislike per signed-in school account; click again to remove it
   A signed-out visitor who votes gets the club's Join box (or Sign in) in a dialog; the vote is saved once they're in.
   Firebase itself is only loaded for people already signed in on this device, or when someone votes. */
(function () {
  const grid = document.getElementById('scGrid'), cats = document.getElementById('scCats'), search = document.getElementById('scSearch');
  const count = document.getElementById('scCount'), empty = document.getElementById('scEmpty'), home = document.getElementById('scHome');
  if ((!grid && !home) || typeof SHOWCASE_APPS === 'undefined') return;
  const VER = (document.currentScript && document.currentScript.src.split('?')[1]) || '';
  const T = (k, v) => I18N.t(k, v), pick = (o, f) => I18N.pick(o, f) || o[f] || '';
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https:\/\/\S+$/.test(u || '') ? u : '');
  const catOf = (id) => SHOWCASE_CATEGORIES.find(c => c.id === id);
  // newest first (by the date it was added), featured apps on top; apps with the same date keep the file's order
  const ALL = SHOWCASE_APPS.filter(a => a && a.id && a.name).map((a, i) => ({ a, i }))
    .sort((x, y) => (!!y.a.featured - !!x.a.featured) || String(y.a.added || '').localeCompare(String(x.a.added || '')) || x.i - y.i).map(x => x.a);

  let hidden = new Set();            // app ids hidden by organizers
  const voteDocs = new Map();        // showcaseVotes doc id -> { app, v }
  let tally = {}, mine = {};         // app -> { up, down }; app -> my vote (1 | -1)
  let uid = null, isOrg = false, pendingVote = null, joining = false, started = false;
  // organizers see hidden apps on /showcase (marked "Hidden"), nobody sees them on the home page
  const apps = () => ALL.filter(a => (isOrg && grid) || !hidden.has(a.id));

  /* ---------- reading the club database without Firebase (public lists only) ---------- */
  const FB = window.CLUB_PLATFORM && CLUB_PLATFORM.FIREBASE;
  async function listDocs(col) {
    if (!FB) return [];
    const base = `https://firestore.googleapis.com/v1/projects/${FB.projectId}/databases/(default)/documents/${col}?pageSize=300&key=${encodeURIComponent(FB.apiKey)}`;
    let out = [], tok = '';
    do {
      const r = await fetch(base + (tok ? '&pageToken=' + encodeURIComponent(tok) : ''), { headers: CLUB_PLATFORM.appCheckHeaders ? await CLUB_PLATFORM.appCheckHeaders() : {} });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); out = out.concat(j.documents || []); tok = j.nextPageToken || '';
    } while (tok && out.length < 20000);
    return out.map(d => ({ id: d.name.split('/').pop(), f: d.fields || {} }));
  }
  function recount() {
    tally = {}; mine = {};
    voteDocs.forEach(({ app, v }, id) => {
      const c = tally[app] || (tally[app] = { up: 0, down: 0 }); if (v === 1) c.up++; else c.down++;
      if (uid && id === app + '_' + uid) mine[app] = v;
    });
  }

  function logo(a) {
    return a.logo ? `<img class="sc-logo" src="assets/showcase/${esc(a.logo)}" alt="" width="56" height="56" loading="lazy">`
      : `<span class="sc-logo sc-letter" style="background:${esc(/^#[0-9a-f]{3,8}$/i.test(a.color || '') ? a.color : '#2b3767')}" aria-hidden="true">${esc(a.name.trim()[0].toUpperCase())}</span>`;
  }
  function voteBar(a) {
    const c = tally[a.id] || { up: 0, down: 0 }, m = mine[a.id] || 0;
    const b = (v, icon, n, key) => `<button type="button" class="sc-v" data-vote="${v}" data-app="${esc(a.id)}" aria-pressed="${m === v}"
      aria-label="${esc(T(key, { name: a.name, n }))}"><span aria-hidden="true">${icon}</span> <span class="sc-n" aria-hidden="true">${n}</span></button>`;
    return `<div class="sc-foot"><div class="sc-vote">${b(1, '👍', c.up, 'sc.like')}${b(-1, '👎', c.down, 'sc.dislike')}</div>
      ${isOrg ? `<button type="button" class="link-btn sc-hide" data-hide="${esc(a.id)}">${esc(T(hidden.has(a.id) ? 'sc.unhide' : 'sc.hide'))}</button>` : ''}</div>`;
  }
  function card(a) {
    const cat = catOf(a.category), link = safeUrl(a.link), repo = safeUrl(a.repo), off = hidden.has(a.id);
    const cover = a.cover ? `<img src="assets/showcase/${esc(a.cover)}" alt="${esc(T('sc.shot', { name: a.name }))}" width="960" height="600" loading="lazy">`
      : `<span class="sc-cover-name" aria-hidden="true">${esc(a.name)}</span>`;
    return `<article class="sc-card${off ? ' is-hidden' : ''}" id="${esc(a.id)}" aria-labelledby="sc_${esc(a.id)}">
      <div class="sc-cover${a.cover ? '' : ' sc-cover-plain'}" ${a.cover ? '' : `style="--sc-c:${esc(a.color || '#2b3767')}"`}>${cover}</div>
      <div class="sc-body">
        <div class="sc-head">${logo(a)}
          <div><h2 id="sc_${esc(a.id)}">${esc(a.name)}${off ? ` <span class="chip">${esc(T('sc.hidden'))}</span>` : ''}</h2>
          ${cat ? `<p class="sc-cat">${esc(pick(cat, 'title'))}</p>` : ''}</div>
        </div>
        <p class="sc-tag">${esc(pick(a, 'tagline'))}</p>
        <p class="sc-desc">${esc(pick(a, 'description'))}</p>
        ${pick(a, 'note') ? `<p class="sc-note">${esc(pick(a, 'note'))}</p>` : ''}
        ${a.by || pick(a, 'season') ? `<p class="sc-meta">${[a.by ? esc(T('sc.by', { names: a.by })) : '', esc(pick(a, 'season'))].filter(Boolean).join(' · ')}</p>` : ''}
        <p class="sc-actions">
          ${link ? `<a class="btn btn-primary" href="${esc(link)}" target="_blank" rel="noopener">${esc(T('sc.open'))} <span aria-hidden="true">↗</span><span class="sr-only"> ${esc(T('sc.newtab'))}</span></a>` : ''}
          ${repo ? `<a class="btn btn-ghost" href="${esc(repo)}" target="_blank" rel="noopener">${esc(T('sc.code'))}<span class="sr-only"> ${esc(T('sc.newtab'))}</span></a>` : ''}
        </p>
        ${voteBar(a)}
      </div>
    </article>`;
  }

  /* ---------- home page: one big "app of the day", then a tile for every other app ---------- */
  function drawHome() {
    const day = Math.floor(Date.now() / 864e5), seeded = (id) => { let h = day; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 2147483647; return h; };
    const shown = apps().filter(a => a.id !== 'tech-club'); // the club's own site is not shown on its own home page
    const pool = shown.filter(a => a.cover && safeUrl(a.link));
    const spot = pool.filter(a => a.featured).concat(pool.filter(a => !a.featured).sort((a, b) => seeded(a.id) - seeded(b.id)))[0];
    const rest = shown.filter(a => a !== spot);
    const tile = (a) => {
      const cat = catOf(a.category);
      return `<li><a class="sc-tile" href="/showcase#${esc(a.id)}">${logo(a)}<span><b>${esc(a.name)}</b>${cat ? `<small>${esc(pick(cat, 'title'))}</small>` : ''}</span></a></li>`;
    };
    let h = '';
    if (spot) {
      const cat = catOf(spot.category), link = safeUrl(spot.link), repo = safeUrl(spot.repo);
      h += `<article class="sc-spot" aria-labelledby="sc_${esc(spot.id)}">
        <a class="sc-spot-cover" href="${esc(link)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
          <img src="assets/showcase/${esc(spot.cover)}" alt="" width="960" height="600" loading="lazy"></a>
        <div class="sc-spot-body">
          <p class="sc-kicker">${esc(T('home.sc.today'))}${cat ? ` · ${esc(pick(cat, 'title'))}` : ''}</p>
          <div class="sc-head">${logo(spot)}<h3 id="sc_${esc(spot.id)}">${esc(spot.name)}</h3></div>
          <p class="sc-tag">${esc(pick(spot, 'tagline'))}</p>
          <p class="sc-desc">${esc(pick(spot, 'description'))}</p>
          ${pick(spot, 'note') ? `<p class="sc-note">${esc(pick(spot, 'note'))}</p>` : ''}
          <p class="sc-actions">
            <a class="btn btn-primary" href="${esc(link)}" target="_blank" rel="noopener">${esc(T('sc.open'))} <span aria-hidden="true">↗</span><span class="sr-only"> ${esc(T('sc.newtab'))}</span></a>
            ${repo ? `<a class="btn btn-ghost" href="${esc(repo)}" target="_blank" rel="noopener">${esc(T('sc.code'))}<span class="sr-only"> ${esc(T('sc.newtab'))}</span></a>` : ''}
          </p>
        </div>
      </article>`;
    }
    if (rest.length) h += `<h3 class="sc-rail-h">${esc(T(rest.length === 1 ? 'home.sc.more1' : 'home.sc.more', { n: rest.length }))}</h3>
      <ul class="sc-rail">${rest.map(tile).join('')}</ul>`;
    home.innerHTML = h;
    const section = home.closest('section'); if (section) section.hidden = !shown.length;
  }
  if (home) {
    const first = () => { if (!started) { started = true; drawHome(); } };
    // wait a moment for the hidden list so a hidden app doesn't flash; draw anyway if the database is slow
    listDocs('showcaseHidden').then(ds => { hidden = new Set(ds.map(d => d.id)); if (started) drawHome(); }).catch(() => {}).finally(first);
    setTimeout(first, 1200);
    addEventListener('langchange', () => { if (started) drawHome(); });
    return;
  }

  /* ---------- /showcase ---------- */
  let current = new URLSearchParams(location.search).get('c') || 'all';
  if (current !== 'all' && !catOf(current)) current = 'all';
  const msgEl = document.getElementById('scMsg');
  function say(text) { if (!msgEl) return; msgEl.textContent = text || ''; msgEl.hidden = !text; }
  function matches(a, q) {
    if (!q) return true;
    const cat = catOf(a.category) || {};
    return [a.name, a.tagline, a.tagline_fr, a.description, a.description_fr, a.by, cat.title, cat.title_fr].join(' ').toLowerCase().includes(q);
  }
  function renderCats() {
    const n = (id) => apps().filter(a => id === 'all' || a.category === id).length;
    const btn = (id, label) => `<button type="button" class="sc-chip" data-cat="${esc(id)}" aria-pressed="${current === id}">${esc(label)} <small>${n(id)}</small></button>`;
    cats.innerHTML = btn('all', T('sc.all')) + SHOWCASE_CATEGORIES.filter(c => n(c.id)).map(c => btn(c.id, pick(c, 'title'))).join('');
  }
  function render() {
    const q = search.value.trim().toLowerCase();
    const list = apps().filter(a => (current === 'all' || a.category === current) && matches(a, q));
    grid.innerHTML = list.map(card).join('');
    empty.hidden = list.length > 0;
    count.textContent = T(list.length === 1 ? 'sc.count1' : 'sc.count', { n: list.length });
    document.getElementById('scTotal').textContent = ALL.filter(a => !hidden.has(a.id)).length;
  }
  function redraw(focusSel) {
    if (!started) return;
    renderCats(); render();
    if (focusSel) { const el = grid.querySelector(focusSel); if (el) el.focus(); }
  }
  cats.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    current = b.dataset.cat;
    const u = new URL(location.href); if (current === 'all') u.searchParams.delete('c'); else u.searchParams.set('c', current);
    history.replaceState(null, '', u);
    renderCats(); render();
    const again = cats.querySelector(`[data-cat="${current}"]`); if (again) again.focus();
  });
  search.addEventListener('input', render);
  document.getElementById('scReset').addEventListener('click', () => { search.value = ''; current = 'all'; history.replaceState(null, '', location.pathname); renderCats(); render(); search.focus(); });
  addEventListener('langchange', () => redraw());

  /* ---------- Firebase, only when needed: people signed in on this device, or someone who votes ---------- */
  const loadJs = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src + (VER ? '?' + VER : ''); s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  let platform = null;
  function platformStart() {
    return platform || (platform = (async () => {
      if (!window.CLUB_PLATFORM) await loadJs('/assets/platform/config.js');
      await Promise.all([window.ClubData ? 0 : loadJs('/assets/platform/data.js'), window.ClubSignIn ? 0 : loadJs('/assets/platform/signin.js')]);
      const data = ClubData.create(); await data.init();
      data.onAuth(async (u) => {
        uid = u && u.verified ? u.uid : null; isOrg = false;
        if (uid && data.getProfile) { try { const p = await data.getProfile(uid); isOrg = !!(p && p.role === 'organizer'); } catch (e) {} }
        recount(); redraw();
        if (uid && !joining) afterSignIn();
      });
      return data;
    })());
  }
  const H = document.documentElement;
  if (H.classList.contains('is-member') || H.classList.contains('is-signed')) platformStart().catch(() => {});

  /* ---------- likes and dislikes ---------- */
  async function vote(app, v) {
    say('');
    if (!uid) { pendingVote = { app, v }; openSignIn(); return; }
    const data = await platformStart(), id = app + '_' + uid, before = voteDocs.get(id), nv = (mine[app] || 0) === v ? 0 : v;
    if (nv) voteDocs.set(id, { app, v: nv }); else voteDocs.delete(id);
    recount(); redraw(`[data-app="${app}"][data-vote="${v}"]`);
    const r = await data.setShowcaseVote(app, nv);
    if (!r.ok) {
      if (before) voteDocs.set(id, before); else voteDocs.delete(id);
      recount(); redraw(`[data-app="${app}"][data-vote="${v}"]`);
      say(T(r.code === 'vb.err.denied' ? 'sc.vote.denied' : 'sc.vote.err'));
    }
  }
  /* ---------- organizers: hide or show an app ---------- */
  async function toggleHide(app) {
    say('');
    const data = await platformStart(), on = !hidden.has(app), r = await data.setShowcaseHidden(app, on);
    if (!r.ok) { say(T('sc.hide.err')); return; }
    if (on) hidden.add(app); else hidden.delete(app);
    redraw(`[data-hide="${app}"]`);
  }
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-vote]'); if (b) { vote(b.dataset.app, Number(b.dataset.vote)); return; }
    const h = e.target.closest('[data-hide]'); if (h) toggleHide(h.dataset.hide);
  });

  /* ---------- signed out: the club's Join box (with "Sign in" for existing accounts) in a dialog ---------- */
  let dlg = null;
  async function openSignIn() {
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.className = 'sc-dlg'; dlg.setAttribute('aria-labelledby', 'scDlgH');
      document.body.appendChild(dlg);
      dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-sc-close]')) dlg.close(); });
      dlg.addEventListener('close', () => { if (!uid) pendingVote = null; });
    }
    dlg.innerHTML = `<div class="sc-dlg-in"><button type="button" class="sc-dlg-x" data-sc-close aria-label="${esc(T('sc.close'))}">×</button>
      <h2 id="scDlgH">${esc(T('sc.vote.h'))}</h2><p class="help">${esc(T('sc.vote.p'))}</p>
      <div class="sc-si"><p class="loading-line" role="status">${esc(T('sc.loading'))}</p></div></div>`;
    dlg.showModal();
    try {
      const data = await platformStart();
      if (uid) { afterSignIn(); return; }
      const box = ClubSignIn.mount(dlg.querySelector('.sc-si'), data, {
        onStart: () => { joining = true; }, onFail: () => { joining = false; },
        onJoined: () => { joining = false; if (uid) afterSignIn(); },   // otherwise onAuth calls it as soon as the account is ready
      });
      box.join();
    } catch (e) {
      dlg.querySelector('.sc-si').innerHTML = `<p class="notice bad">${esc(T('sc.vote.err'))}</p>`;
    }
  }
  function afterSignIn() {
    if (dlg && dlg.open) dlg.close();
    if (pendingVote && uid) { const p = pendingVote; pendingVote = null; vote(p.app, p.v); }
  }

  /* ---------- first draw: wait a moment for the hidden list, then the votes fill in ---------- */
  const first = () => {
    if (started) return; started = true;
    renderCats(); render();
    if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView({ block: 'start' }); }
  };
  listDocs('showcaseHidden').then(ds => { hidden = new Set(ds.map(d => d.id)); redraw(); }).catch(() => {}).finally(first);
  setTimeout(first, 1200);
  listDocs('showcaseVotes').then(ds => {
    ds.forEach(d => { const app = d.f.app && d.f.app.stringValue, v = Number(d.f.v && d.f.v.integerValue); if (app && (v === 1 || v === -1)) voteDocs.set(d.id, { app, v }); });
    recount(); redraw();
  }).catch(() => {});
})();
