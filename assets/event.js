/* One session's details, places and registration (with account creation for newcomers), plus the organizers' list of registrations.
   Used two ways: the side panel on the schedule and home page (ClubEvent.open), and the shareable page /event?id=… or /event?d=YYYY-MM-DD.
   Needs schedule.js, i18n.js, config.js, signin.js and data.js. */
(function () {
'use strict';
const T = (k, v) => I18N.t(k, v), P = (o, f) => I18N.pick(o, f);

/* ---------- one shared connection to the club platform ---------- */
let data = null, ready = null, user = undefined, who = null;
const listeners = new Set();
function platform() {
  if (!ready) {
    data = ClubData.create();
    ready = data.init().then(() => {
      data.onAuth(async (u) => {
        const w = { me: u, member: false, hasReq: false, refused: false, isOrg: false };
        if (u) {
          try {
            if (data.accountRefused) w.refused = await data.accountRefused();
            const req = await data.requestStatus(); w.hasReq = !!(req && req.phone);
            if (u.verified) {
              w.member = await data.onRoster();
              const p = w.member ? await data.getProfile(u.uid) : null;
              w.isOrg = !!(p && (p.role === 'organizer' || (data.mode === 'demo' && new URLSearchParams(location.search).has('elder'))));
            }
          } catch (e) { /* not in the club yet */ }
        }
        user = u; who = w; listeners.forEach(fn => fn());
      });
      return null;
    }, (e) => e);
  }
  return ready;
}

// someone signed in on this device before (the top bar remembers it): wait for the account before showing the sign-up box
const signedHere = () => { try { return !!localStorage.getItem('nw-signed'); } catch (e) { return true; } };
// the club data, usable before it has loaded: calls wait for it, simple settings read as "not set" until then
const laterData = new Proxy({}, { get(_, k) {
  if (data && typeof data[k] !== 'function') return data[k];
  if (!data && ['microsoft', 'pendingLink', 'linkError', 'mode'].includes(k)) return undefined;
  return async (...a) => { await platform(); return data[k](...a); };
} });

/* ---------- text helpers ---------- */
const linkify = (t) => t.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//, '')} ↗</a>`);
// blank line = new paragraph, lines starting with "- " = a list, links become clickable
function richText(text) {
  const bullet = /^\s*[-•*]\s+/;
  return String(text || '').trim().split(/\n\s*\n/).filter(Boolean).map(block => {
    const out = []; let para = [], items = [];
    const flushP = () => { if (para.length) out.push(`<p>${para.map(l => linkify(esc(l))).join('<br>')}</p>`); para = []; };
    const flushL = () => { if (items.length) out.push(`<ul>${items.map(l => `<li>${linkify(esc(l))}</li>`).join('')}</ul>`); items = []; };
    for (const l of block.split('\n')) { if (bullet.test(l)) { flushP(); items.push(l.replace(bullet, '')); } else { flushL(); para.push(l); } }
    flushP(); flushL(); return out.join('');
  }).join('');
}
const fmtDay = (d) => { const s = parseDate(d).toLocaleDateString(LOC(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); };

/* ---------- mount one event into an element ----------
   opts: { id } or { date }, heading: 'h1' | 'h2', onTitle(text), focusRegister */
async function mount(root, opts) {
  const H = opts.heading || 'h2', H2 = H === 'h1' ? 'h2' : 'h3';
  const q = (sel) => root.querySelector(sel);
  root.innerHTML = `<div class="ev">
      <${H} class="ev-title" tabindex="-1">${esc(T('ev.loading'))}</${H}>
      <div class="session-meta ev-chips"></div>
      <p class="ev-lede"></p>
      <div class="ev-manage" hidden></div>
      <p class="notice bad ev-banner" role="status" hidden></p>
      <div class="ev-body" hidden>
        <div class="ev-facts"></div>
        <div class="ev-actions"></div>
        <div class="ev-card ev-reg" tabindex="-1" hidden></div>
        <div class="ev-details"></div>
        <div class="ev-recap"></div>
        <section class="ev-org" hidden></section>
      </div>
    </div>`;
  let ev = null, err = null;
  // a session from schedule.js can have an organizer's edited version saved as event "d-YYYY-MM-DD"
  const fk = opts.date || (FILE_ID.test(opts.id || '') ? opts.id.slice(2) : null);   // a session from schedule.js (see fileKey)
  const fileSession = fk ? findFileSession(fk) : null;
  const siteId = fk ? 'd-' + fk : opts.id;
  const reread = async () => { const x = await data.getEvent(siteId); return fileSession ? { ...fileSession, ...(x || {}) } : x; };
  /* Show the details at once from what the schedule already has (the file, plus the events and edits it loaded);
     the club database loads in the background and only the sign-up box waits for it. */
  const known = opts.session && opts.session.title ? opts.session
    : siteId ? (window.allSessions ? allSessions().find(x => (x.id || 'd-' + fileKey(x)) === siteId) : null) || fileSession : null;
  const background = platform().then(async (e) => {
    err = e; if (e) return null;
    try { return await reread(); } catch (x) { return null; }
  });
  if (known) ev = { ...known }; else { const fresh = await background; ev = fresh; }
  if (!root.isConnected) return () => {};
  if (!ev) {
    q('.ev-title').textContent = T('ev.notfound');
    q('.ev-lede').innerHTML = `<a class="btn btn-ghost" href="/schedule">${esc(T('ev.back'))} →</a>`;
    return () => {};
  }
  ev = { ...ev, _d: parseDate(ev.date) };
  const fromFile = !!fileSession, isSite = !!ev.id && !fromFile, today = today0(), past = ev._d < today;
  // one "I'm going" for every session (registrations/{key}_{uid}), the same one as the button on the schedule cards
  const key = fromFile ? 'd-' + fk : ev.id;
  const regOn = () => !past && !ev.cancelled;
  // hidden: a site event that isn't published, or a file session an organizer hid
  const isHidden = () => (isSite ? ev.published === false || !!ev.hidden : !!ev.hidden);
  let joining = false, regs = [], busy = false, msg = null, siBox = null, people = {}, orgFilter = 'all';
  const W = () => who || { me: null, member: false, hasReq: false, refused: false, isOrg: false };
  // registrations are private: organizers load everyone's (and see the count); anyone else only their own spot
  const taken = () => regs.filter(r => r.status === 'pending' || r.status === 'confirmed').length;
  const full = () => W().isOrg && ev.capacity && taken() >= ev.capacity;
  const mine = () => (W().me ? regs.find(r => r.uid === W().me.uid) : null);
  const deadlinePassed = () => ev.deadline && parseDate(ev.deadline) < today;

  function draw() {
    if (!root.isConnected) return;
    const w = W();
    if (ev.deleted && !w.isOrg) {   // removed: only organizers still see it (to restore it)
      q('.ev-title').textContent = T('ev.removed'); q('.ev-chips').innerHTML = ''; q('.ev-banner').hidden = true; q('.ev-manage').hidden = true;
      q('.ev-lede').innerHTML = `<a class="btn btn-ghost" href="/schedule">${esc(T('ev.back'))} →</a>`; q('.ev-body').hidden = true; return;
    }
    q('.ev-title').textContent = P(ev, 'title');
    if (opts.onTitle) opts.onTitle(P(ev, 'title'));
    q('.ev-chips').innerHTML = [
      `<span class="chip">${esc(P(ev, 'type') || T('track.' + ev.track) || T('sched.session'))}</span>`,
      ev.track === 'gdg' ? `<span class="chip">GDG on Campus</span>` : '',
      ev.lang ? `<span class="chip chip-lang">${esc(langLabel(ev))}</span>` : '',
      ev.level ? `<span class="chip chip-level lv-${esc(ev.level)}">${esc(T('level.' + ev.level))}</span>` : '',
      past ? `<span class="chip chip-done">${esc(T('sched.done'))}</span>` : '',
      !past && ev.planned ? `<span class="chip chip-planned">${esc(T('sched.planned'))}</span>` : '',
      ev.cancelled ? `<span class="chip chip-cancelled">${esc(T('ev.cancelled.chip'))}</span>` : '',
      w.isOrg && isHidden() && !ev.deleted ? `<span class="chip chip-planned">${esc(T('ev.hidden.chip'))}</span>` : '',
      w.isOrg && ev.deleted ? `<span class="chip chip-cancelled">${esc(T('ev.deleted.chip'))}</span>` : '',
    ].join('');
    q('.ev-lede').textContent = P(ev, 'description') || '';
    q('.ev-banner').hidden = !ev.cancelled; q('.ev-banner').textContent = ev.cancelled ? T('ev.cancelled.banner') : '';
    drawManage();
    const fact = (k, v) => (v ? `<span><small>${esc(T(k))}</small>${v}</span>` : '');
    q('.ev-facts').innerHTML = fact('ev.when', esc(fmtDay(ev.date))) + fact('ev.time', esc(P(ev, 'time') || T('sched.time')))
      + fact('ev.where', esc(P(ev, 'room') || T('sched.room'))) + (ev.speaker ? fact('ev.speaker', esc(ev.speaker)) : '')
      + (W().isOrg && ev.registration && ev.capacity ? fact('ev.placesh', esc(T(full() ? 'ev.full' : 'ev.places', { n: taken(), cap: ev.capacity }))) : '')
      + (ev.registration && ev.deadline && !past ? fact('ev.deadline', esc(fmtDay(ev.deadline))) : '');
    q('.ev-actions').innerHTML = `
      ${ev.link && !past ? `<a class="btn btn-primary" href="${esc(ev.link)}" target="_blank" rel="noopener">${esc(P(ev, 'linkText') || T('sched.more'))} ↗</a>` : ''}
      ${!past && !ev.cancelled ? `<button type="button" class="cal-btn" data-ics="${esc(sessionKey(ev))}">${esc(T('sched.cal.one'))}</button>` : ''}
      <button type="button" class="cal-btn no-ico" data-copy>${esc(T('ev.copy'))}</button>`;
    const details = P(ev, 'details');
    q('.ev-details').innerHTML = details ? `<${H2}>${esc(T('ev.about'))}</${H2}>${richText(details)}` : '';
    q('.ev-recap').innerHTML = past && ev.recap ? recapHTML(ev) : '';
    q('.ev-body').hidden = false;
    drawReg(); drawOrg();
  }

  /* ---------- organizers: Manage (edit, cancel, hide, delete) ----------
   A small menu; anything that changes what people see asks for a confirmation first. */
  let menuOpen = false, confirming = null, manageMsg = null;
  const editHref = '/event-edit?' + (fromFile ? 'd=' + encodeURIComponent(fk) : 'id=' + encodeURIComponent(ev.id));
  const CHANGES = {
    cancel:   { patch: { cancelled: true }, ask: true },
    uncancel: { patch: { cancelled: false } },
    hide:     { patch: isSite ? { published: false } : { hidden: true }, ask: true },
    show:     { patch: { published: true, hidden: false } },
    delete:   { ask: true, danger: true },
    restore:  { patch: { deleted: false } },
  };
  function drawManage() {
    const box = q('.ev-manage');
    if (!W().isOrg) { box.hidden = true; return; }
    box.hidden = false;
    const item = (k, danger) => `<li><button type="button" class="ev-mi${danger ? ' danger' : ''}" data-mi="${k}">${esc(T('ev.m.' + k))}</button></li>`;
    const items = ev.deleted ? item('restore') : [
      `<li><a class="ev-mi" href="${editHref}">${esc(T('ev.m.edit'))}</a></li>`,
      item(ev.cancelled ? 'uncancel' : 'cancel'),
      item(isHidden() ? 'show' : 'hide'),
      item('delete', true),
    ].join('');
    const c = confirming && CHANGES[confirming];
    const delKind = isSite ? 'site' : 'file';
    box.innerHTML = `<button type="button" class="btn btn-ghost ev-manage-btn" aria-expanded="${menuOpen}" data-menu>${esc(T('ev.manage'))} <span aria-hidden="true">▾</span></button>
      <ul class="ev-menu"${menuOpen ? '' : ' hidden'}>${items}</ul>
      ${c ? `<div class="ev-confirm${c.danger ? ' danger' : ''}" role="group" aria-labelledby="evcH">
          <p class="ev-confirm-h" id="evcH">${esc(T('ev.c.' + confirming + '.h'))}</p>
          <p>${esc(T('ev.c.' + confirming + '.p' + (confirming === 'delete' ? '.' + delKind : '')))}</p>
          <div class="ev-confirm-act"><button type="button" class="btn ${c.danger ? 'btn-danger' : 'btn-primary'}" data-yes="${confirming}">${esc(T('ev.c.' + confirming + '.yes'))}</button>
            <button type="button" class="btn btn-ghost" data-no>${esc(T('ev.c.no'))}</button></div></div>` : ''}
      ${manageMsg ? `<p class="notice ${manageMsg.ok ? 'ok' : 'bad'} form-msg" role="status">${esc(manageMsg.text)}</p>` : ''}`;
  }
  async function change(kind) {
    manageMsg = null;
    let r;
    if (kind === 'delete' && isSite) r = await data.deleteEvent(ev.id);
    else {
      const fields = { ...ev }; delete fields._d; delete fields.id;
      const patch = kind === 'delete' ? { deleted: true } : CHANGES[kind].patch;
      // a file session's saved version must stay published, so the public site knows it was changed, hidden or deleted
      r = await data.saveEvent({ ...fields, ...patch, ...(fromFile ? { published: true } : {}), id: key });
    }
    if (!r.ok) { manageMsg = { text: T(r.code || 'err.generic') + (r.detail ? ` (${r.detail})` : '') }; drawManage(); return; }
    if (window.loadSiteEvents) loadSiteEvents();   // the schedule behind the panel updates too
    if (kind === 'delete' && isSite) { if (opts.onRemoved) opts.onRemoved(); return; }
    const fresh = await reread(); ev = { ...fresh, _d: parseDate(fresh.date) };
    manageMsg = { ok: true, text: T('ev.done.' + kind) };
    draw();
    const btn = q('[data-menu]'); if (btn) btn.focus();
  }
  root.addEventListener('click', async (e) => {
    if (e.target.closest('[data-menu]')) { menuOpen = !menuOpen; confirming = null; manageMsg = null; drawManage(); const f = q('.ev-menu .ev-mi'); if (menuOpen && f) f.focus(); return; }
    const mi = e.target.closest('[data-mi]');
    if (mi) {
      const k = mi.dataset.mi; menuOpen = false;
      if (CHANGES[k].ask) { confirming = k; drawManage(); q('[data-yes]').focus(); }
      else { confirming = null; drawManage(); await change(k); }
      return;
    }
    if (e.target.closest('[data-no]')) { confirming = null; drawManage(); q('[data-menu]').focus(); return; }
    const yes = e.target.closest('[data-yes]');
    if (yes) { yes.disabled = true; const k = yes.dataset.yes; confirming = null; await change(k); }
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (menuOpen || confirming)) { e.stopPropagation(); menuOpen = false; confirming = null; drawManage(); q('[data-menu]').focus(); }
  });

  /* ---------- registration ---------- */
  const intro = () => `<${H2} class="reg-h">${esc(T(full() ? 'ev.waitlist.h' : 'ev.reg.h'))}</${H2}>`;
  const msgHTML = () => (msg ? `<p class="notice ${msg.ok ? 'ok' : 'bad'} form-msg" role="${msg.ok ? 'status' : 'alert'}">${esc(msg.text)}</p>` : '');
  function drawReg() {
    const box = q('.ev-reg'), w = W();
    if (!regOn()) { box.hidden = true; return; }
    box.hidden = false;
    if (past) { box.innerHTML = `${intro()}<p class="help">${esc(T('ev.reg.past'))}</p>`; return; }
    const r = mine();
    if (deadlinePassed() && !(r && r.status !== 'cancelled')) { box.innerHTML = `${intro()}<p class="help">${esc(T('ev.reg.closed', { d: fmtDay(ev.deadline) }))}</p>`; return; }
    if (err) { box.innerHTML = `${intro()}<p class="notice bad">${esc(T('m.dberror', { e: err.code || err.message || '?' }))}</p>`; return; }
    // not signed in on this device: show the Join form at once (what it sends waits for the club database); otherwise wait to know who it is
    if (user === undefined && signedHere()) { box.innerHTML = `${intro()}<p class="loading-line" role="status">${esc(T('ev.loading'))}</p>`; return; }
    // the Join form was just sent: the new account signs in before its answers are saved, so wait instead of flashing another form
    if (joining && w.me) { box.innerHTML = `${intro()}<p class="loading-line" role="status">${esc(T('join.saving'))}</p>`; return; }
    if (!w.me) {
      if (!q('.reg-auth')) {   // keep what the person is typing when the page redraws
        box.innerHTML = `${intro()}<p class="help">${esc(T('ev.reg.account'))}</p><div class="reg-auth"></div>`;
        // the one Join form; once it's sent, save the spot straight away (no second tap)
        siBox = ClubSignIn.mount(q('.reg-auth'), laterData, {
          onStart: () => { joining = true; }, onFail: () => { joining = false; drawReg(); },
          // the spot is saved together with the account (one go, no second wait)
          joinExtra: () => ({ spot: { event: key, status: ClubData.INSTANT && ev.autoConfirm !== false ? 'confirmed' : 'pending' } }),
          onJoined: (r) => {
            joining = false; if (who) { who.hasReq = true; if (ClubData.INSTANT) who.member = true; }   // joining makes them a member straight away
            if (r && r.spot) {   // done: show "You're in" right away
              const uid = data.currentUid();
              // the page hears about the new account a moment later: know it now
              if (!who || !who.me) { who = { ...(who || W()), me: { uid, email: '', verified: !!ClubData.INSTANT } }; user = who.me; }
              regs = [{ id: key + '_' + uid, event: key, uid, status: r.spot, at: Date.now() }];
              msg = null; syncCards(); q('.ev-reg').innerHTML = ''; draw();
              const b = q('.ev-reg'); if (b) { b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); b.focus({ preventScroll: true }); }
              return;
            }
            act(async () => { const s = await signUpForSpot(); if (!s.ok) msg = { text: T(s.code || 'err.generic') }; });
          } });
        siBox.join();
      }
      return;
    }
    if (w.refused) { box.innerHTML = `${intro()}<p class="help">${esc(T('ev.reg.refused'))}</p>`; return; }
    if (r && r.status !== 'cancelled') {
      const k = { confirmed: 'ev.st.confirmed', pending: 'ev.st.pending', waitlist: 'ev.st.waitlist' }[r.status] || 'ev.st.pending';
      box.innerHTML = `<${H2} class="reg-h">${esc(T(k + '.h'))}</${H2}><p class="ev-status st-${esc(r.status)}">${esc(T(k))}</p>${msgHTML()}
        <p style="margin:0"><button type="button" class="link-btn" data-act="cancel" ${busy ? 'disabled aria-busy="true"' : ''}>${esc(T('ev.cancel'))}</button></p>`;
      return;
    }
    if (!w.member && !w.hasReq) {
      if (q('.ev-join') && !busy && !msg) return;   // don't wipe the form while it's being filled in
      const name = (siBox && siBox.name) || '';
      box.innerHTML = `${intro()}<p class="help">${esc(T('ev.join.p'))}</p>
        <form class="ev-join" novalidate>
          <div class="field"><label for="jName">${esc(T('apply.name'))}</label><input class="input" id="jName" maxlength="60" autocomplete="name" required value="${esc(name)}"></div>
          <div class="field"><label for="jPhone">${esc(T('ev.join.phone'))}</label><input class="input" id="jPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="+33 6 12 34 56 78" required>
            <p class="help">${esc(T('ev.join.phone.help'))}</p></div>
          <div class="field"><label for="jProgram">${esc(T('ev.join.program'))}</label><input class="input" id="jProgram" maxlength="60"></div>
          <fieldset class="field"><legend>${esc(T('apply.level.legend'))}</legend><div class="choices">
            ${['new', 'some', 'solid'].map(l => `<label class="choice"><input type="radio" name="jLevel" value="${l}"><span>${esc(T('apply.level.' + l))}</span></label>`).join('')}</div></fieldset>
          <label class="check"><input type="checkbox" id="jConsent"><span>${esc(T('apply.consent'))}</span></label>
          ${msgHTML()}
          <div><button class="btn btn-primary" type="submit" ${busy ? 'disabled aria-busy="true"' : ''}>${esc(T(full() ? 'ev.join.btn.wait' : 'ev.join.btn'))}</button></div>
        </form>`;
      return;
    }
    box.innerHTML = `${intro()}${!w.member ? `<p class="help">${esc(T('ev.reg.review'))}</p>` : ''}${msgHTML()}
      <p style="margin:0"><button type="button" class="btn btn-primary" data-act="go" ${busy ? 'disabled aria-busy="true"' : ''}>${esc(T(full() ? 'ev.waitlist.btn' : 'rsvp.btn'))}</button></p>`;
  }
  async function reloadRegs() {
    if (past || err) return;
    try { regs = W().isOrg ? await data.loadRegistrations(key) : W().me ? await data.myRegistration(key).then(r => (r ? [r] : [])) : []; } catch (e) { regs = []; }
  }
  async function signUpForSpot() {
    // members are confirmed straight away, unless the organizers chose to confirm each spot for this event (autoConfirm off)
    const status = full() ? 'waitlist' : W().member && ev.autoConfirm !== false ? 'confirmed' : 'pending';
    let r = await data.register(key, status);
    if (!r.ok && status === 'confirmed') r = await data.register(key, 'pending');   // profile not finished yet: an organizer confirms
    return r;
  }
  // members: keep the one-tap button on the schedule cards behind the panel in step
  function syncCards() {
    const X = window.CLUB_LIVE, me = W().me; if (!X || !me) return;
    const r = regs.find(x => x.uid === me.uid);
    X.regs = X.regs.filter(x => x.event !== key).concat(r ? [r] : []);
    if (typeof fillLive === 'function') document.querySelectorAll('#season, #upcoming-list').forEach(fillLive);
  }
  async function act(fn) {
    busy = true; msg = null; drawReg();
    try { await fn(); } finally {
      busy = false; await reloadRegs(); syncCards(); q('.ev-reg').innerHTML = ''; draw(); const b = q('.ev-reg'); if (b && !b.hidden) b.focus({ preventScroll: true }); }
  }

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (b && b.dataset.act === 'go') await act(async () => { const r = await signUpForSpot(); if (!r.ok) msg = { text: T(r.code || 'err.generic') }; });
    if (b && b.dataset.act === 'cancel') await act(async () => { const r = await data.register(key, 'cancelled'); msg = r.ok ? { ok: true, text: T('ev.cancelled') } : { text: T(r.code || 'err.generic') }; });
    const c = e.target.closest('[data-copy]');
    if (c) { try { await navigator.clipboard.writeText(location.origin + eventHref(ev)); c.textContent = T('ev.copied'); setTimeout(() => (c.textContent = T('ev.copy')), 2000); } catch (x) {} }
    const of = e.target.closest('[data-of]'); if (of) { orgFilter = of.dataset.of; drawOrg(); }
    const o = e.target.closest('[data-org]'); if (o) await orgAction(o);
  });
  root.addEventListener('submit', async (e) => {
    if (!e.target.closest('.ev-join')) return;
    e.preventDefault();
    const v = (sel) => q(sel).value.trim();
    const f = { name: v('#jName'), phone: v('#jPhone'), program: v('#jProgram'), heard: '', interests: [],
      level: (root.querySelector('[name=jLevel]:checked') || {}).value, lang: I18N.lang };
    const bad = !f.name ? ['err.name', '#jName'] : !ClubData.validPhone(f.phone) ? ['err.phone', '#jPhone'] : !f.level ? ['err.level'] : !q('#jConsent').checked ? ['err.consent'] : null;
    if (bad) {
      const old = q('.ev-join .form-msg'); if (old) old.remove();
      const p = document.createElement('p'); p.className = 'notice bad form-msg'; p.setAttribute('role', 'alert'); p.textContent = T(bad[0]);
      q('.ev-join > div:last-child').before(p); if (bad[1]) q(bad[1]).focus(); return;
    }
    await act(async () => {
      const a = await data.apply(f);
      if (!a.ok) { msg = { text: a.message || T('err.generic') }; return; }
      if (who) who.hasReq = true;
      const r = await signUpForSpot(); if (!r.ok) msg = { text: T(r.code || 'err.generic') };
    });
  });

  /* ---------- organizers: who registered ---------- */
  async function loadPeople() { const ids = regs.map(r => r.uid).filter(u => !people[u]); if (ids.length) Object.assign(people, await data.whoAre(ids)); }
  function drawOrg() {
    const box = q('.ev-org');
    if (!W().isOrg || past) { box.hidden = true; return; }
    box.hidden = false;
    const n = (s) => regs.filter(r => r.status === s).length;
    const list = regs.filter(r => (orgFilter === 'all' ? r.status !== 'cancelled' : r.status === orgFilter)).sort((a, b) => a.at - b.at);
    const wa = (p) => (p.phone ? `https://wa.me/${p.phone.replace(/[^0-9]/g, '')}` : '');
    box.innerHTML = `<div class="ev-org-head"><${H2}>${esc(T('ev.org.h'))}</${H2}>
        <div class="ev-org-tools">
        ${regs.length ? `<button type="button" class="btn btn-ghost" data-org="csv">${esc(T('ev.csv'))}</button>` : ''}
        ${n('pending') ? `<button type="button" class="btn btn-primary" data-org="all">${esc(T('ev.confirmall', { n: n('pending') }))}</button>` : ''}</div></div>
      ${!past ? `<div class="s-tabs" role="group" aria-label="${esc(T('ev.org.h'))}">${['all', 'pending', 'confirmed', 'waitlist', 'cancelled'].map(s =>
          `<button type="button" class="s-tab" data-of="${s}" aria-pressed="${orgFilter === s}">${esc(T('ev.os.' + s))} <small>${s === 'all' ? regs.filter(r => r.status !== 'cancelled').length : n(s)}</small></button>`).join('')}</div>
      ${list.length ? `<ul class="ev-people">${list.map(r => { const p = people[r.uid] || {};
        return `<li><div><b>${esc(p.name || '…')}</b>${p.member ? '' : ` <span class="chip chip-planned">${esc(T('ev.newacc'))}</span>`}<small>${esc(p.email || '')}${p.phone ? ' · ' + esc(p.phone) : ''}</small></div>
          <span class="chip st-chip st-${esc(r.status)}">${esc(T('ev.os.' + r.status))}</span>
          <div class="ev-row-act">${r.status !== 'confirmed' ? `<button type="button" class="btn btn-primary" data-org="ok" data-reg="${esc(r.id)}">${esc(T('ev.confirm'))}</button>` : ''}
            ${r.status !== 'waitlist' && r.status !== 'cancelled' ? `<button type="button" class="link-btn" data-org="wait" data-reg="${esc(r.id)}">${esc(T('ev.towait'))}</button>` : ''}
            ${r.status !== 'cancelled' ? `<button type="button" class="link-btn" data-org="drop" data-reg="${esc(r.id)}">${esc(T('ev.drop'))}</button>` : ''}
            ${wa(p) ? `<a class="link-btn" href="${esc(wa(p))}" target="_blank" rel="noopener">WhatsApp ↗</a>` : ''}</div></li>`; }).join('')}</ul>`
        : `<p class="help">${esc(T('ev.org.none'))}</p>`}` : `<p class="help">${esc(T('ev.org.noreg'))}</p>`}`;
  }
  async function orgAction(b) {
    const k = b.dataset.org;
    if (k === 'csv') {
      const rows = [['name', 'email', 'phone', 'status', 'registered']].concat(regs.map(r => { const p = people[r.uid] || {}; return [p.name || '', p.email || '', p.phone || '', r.status, r.at ? new Date(r.at).toISOString() : '']; }));
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = `registrations-${ev.date}.csv`; document.body.appendChild(a); a.click(); a.remove();
      return;
    }
    b.disabled = true;
    const targets = k === 'all' ? regs.filter(r => r.status === 'pending') : [regs.find(r => r.id === b.dataset.reg)];
    const to = k === 'ok' || k === 'all' ? 'confirmed' : k === 'wait' ? 'waitlist' : 'cancelled';
    for (const r of targets) await data.setRegistration(r, to);
    await reloadRegs(); await loadPeople(); draw();
  }

  // redraw the sign-up box from scratch, except a Join form someone may be filling in (still signed out)
  const resetReg = () => { if (!(q('.reg-auth') && !W().me)) q('.ev-reg').innerHTML = ''; };
  const onLang = () => { q('.ev-reg').innerHTML = ''; draw(); };
  addEventListener('langchange', onLang);
  const onWho = async () => {
    await reloadRegs(); if (W().isOrg) await loadPeople();
    resetReg(); draw();
    if (opts.focusRegister) { opts.focusRegister = false; const b = q('.ev-reg'); if (b && !b.hidden) { b.scrollIntoView({ block: 'start' }); b.focus({ preventScroll: true }); } }
  };
  listeners.add(onWho);
  draw();   // straight away, from what the page already knows
  // then the fresh version from the database (an organizer may have just edited it) and the person's own spot
  background.then(async (fresh) => {
    if (!root.isConnected) return;
    if (fresh && fresh.date) ev = { ...fresh, _d: parseDate(fresh.date) };
    await reloadRegs(); resetReg(); draw();
    if (who) onWho();
  });
  /* On the event's own page (opened from a link or a QR code), the top bar's "Join" leads to this event's sign-up box:
     joining there also saves the spot, so nobody ends up on the Join page and misses the event. */
  const onTopJoin = (e) => {
    const a = e.target.closest && e.target.closest('.site-header a.nav-join'); if (!a || !root.isConnected) return;
    const box = q('.ev-reg'); if (!box || box.hidden || W().member) return;   // past, cancelled, or already a member: the normal link
    e.preventDefault();
    box.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    const first = box.querySelector('input, button'); (first || box).focus({ preventScroll: true });
  };
  if (H === 'h1') document.addEventListener('click', onTopJoin);
  return () => { listeners.delete(onWho); removeEventListener('langchange', onLang); document.removeEventListener('click', onTopJoin); };
}

/* ---------- the side panel (schedule and home page), like the Village board's ---------- */
let panel = null, unmount = null, lastFocus = null;
function ensurePanel() {
  if (panel) return panel;
  panel = document.createElement('div');
  panel.className = 'ev-drawer'; panel.hidden = true;
  panel.innerHTML = `<div class="ev-scrim" data-ev-close></div>
    <div class="ev-panel" role="dialog" aria-modal="true" aria-labelledby="evPanelTitle">
      <div class="ev-panel-head"><a class="link-btn ev-open-page" href="#"></a>
        <button type="button" class="ev-x" data-ev-close aria-label="Close">×</button></div>
      <div class="ev-panel-body"></div>
    </div>`;
  document.body.appendChild(panel);
  panel.addEventListener('click', (e) => { if (e.target.closest('[data-ev-close]')) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel && !panel.hidden) close(); });
  return panel;
}
async function open(s, { register = false, push = true } = {}) {
  ensurePanel();
  if (panel.hidden) lastFocus = document.activeElement;
  if (unmount) { unmount(); unmount = null; }
  const body = panel.querySelector('.ev-panel-body'), link = panel.querySelector('.ev-open-page');
  link.href = eventHref(s); link.textContent = T('ev.openpage') + ' ↗';
  panel.querySelector('.ev-x').setAttribute('aria-label', T('vb.close'));
  panel.hidden = false; document.documentElement.classList.add('ev-locked');
  if (push) history.pushState({ ev: 1 }, '', location.pathname + (s.id ? '?event=' + encodeURIComponent(s.id) : '?d=' + encodeURIComponent(fileKey(s))));
  const pending = mount(body, { id: s.id, date: s.id ? null : fileKey(s), session: s, heading: 'h2', focusRegister: register, onRemoved: () => close() });
  const t = body.querySelector('.ev-title'); t.id = 'evPanelTitle'; t.focus({ preventScroll: true });
  body.parentElement.scrollTop = 0;
  unmount = await pending;
}
function close(push = true) {
  if (!panel || panel.hidden) return;
  panel.hidden = true; document.documentElement.classList.remove('ev-locked');
  if (unmount) { unmount(); unmount = null; }
  if (push) history.pushState({}, '', location.pathname);
  if (lastFocus && lastFocus.isConnected) lastFocus.focus();
}
addEventListener('popstate', () => {
  if (!panel) return;
  const p = new URLSearchParams(location.search), id = p.get('event'), d = p.get('d');
  const s = id ? { id } : d ? findFileSession(d) : null;
  if (s) open(s, { push: false }); else close(false);
});

window.ClubEvent = { mount, open, close };
})();
