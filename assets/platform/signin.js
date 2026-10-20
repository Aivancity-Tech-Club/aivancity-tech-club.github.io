/* The one sign-in / join box, used on every page (Mountain, Join, Village, events…).
   School email + password. Joining is ONE form: account + display name + WhatsApp number + level (+ GitHub),
   so nobody fills in a second form later. Signing in sends no email, which keeps the club inside Firebase's free plan.

   const box = ClubSignIn.mount(element, data, { onJoined });
   box.signin()          show the sign-in form ("New here? Join the club" switches to the join form in place)
   box.join()            show the join form (box.create() does the same)
   box.verify(email)     signed in but not approved / not confirmed yet
   onJoined(result)      called once the account and the join answers are saved (result.spot: an event spot saved with it)
   joinExtra()           more to send with the Join form, e.g. { spot: { event, status } } on an event
   Clicking "I've confirmed it" reloads the page once the email is confirmed, so each page's normal flow runs. */
(function () {
'use strict';
const T = (k, v) => (window.I18N ? I18N.t(k, v) : k);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MS = '<svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>';

// what the club asks new members, to plan sessions around them (the program is typed: DM 1–3, PGE 1–5 EN/FR…)
const INTERESTS = ['ai', 'web', 'data', 'cloud', 'games', 'competitive', 'startup', 'career'];
window.CLUB_JOIN = { INTERESTS };

const CSS = `
.si { display: grid; gap: 14px; }
.si form, .si .si-verify { display: grid; gap: 14px; margin: 0; }
.si .si-pw { position: relative; }
.si .si-pw .input { padding-right: 76px; }
.si .si-eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); min-height: 36px; padding: 0 12px; border-radius: 999px;
  border: 1.5px solid currentColor; background: transparent; color: inherit; font: inherit; font-size: .8rem; font-weight: 700; cursor: pointer; }
.si .si-msg { margin: 0; border-radius: 14px; padding: 10px 14px; font-size: .92rem; color: #1e1e1e; }
.si .si-msg.ok { background: #ccf6c5; } .si .si-msg.bad { background: #f8d8d8; }
.si .si-links { margin: 0; display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: .92rem; }
.si .si-links a { color: inherit; font-weight: 700; }
.si .si-hint { margin: 0; font-size: .85rem; opacity: .8; }
.si .si-row { display: flex; flex-wrap: wrap; gap: 10px; }
.si button[disabled] { opacity: .55; cursor: default; }
/* waiting for the server: the button keeps its colour and shows a small spinner */
.si button[aria-busy="true"] { opacity: 1; cursor: progress; display: inline-flex; align-items: center; gap: 8px; }
.si button[aria-busy="true"]::before, .si .si-spin::before { content: ""; width: 1em; height: 1em; flex: none; border-radius: 50%;
  border: 2.5px solid currentColor; border-right-color: transparent; animation: si-spin .8s linear infinite; }
.si .si-spin { display: flex; align-items: center; gap: 12px; font-weight: 700; }
.si .si-settle { display: grid; gap: 10px; padding: 8px 0; }
.si .si-settle p { margin: 0; }
@keyframes si-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .si button[aria-busy="true"]::before, .si .si-spin::before { animation-duration: 2.4s; } }
.si .si-manual summary { cursor: pointer; font-weight: 700; font-size: .92rem; }
.si .si-manual[open] { display: grid; gap: 10px; }
.si .si-steps { margin: 0; padding-left: 20px; display: grid; gap: 10px; font-size: .95rem; }
.si .si-steps a { color: inherit; font-weight: 700; }
.si .si-steps .btn { margin-top: 8px; }
.si .si-i { display: inline-grid; place-items: center; width: 24px; height: 24px; margin-left: 6px; vertical-align: -5px; border-radius: 50%; border: 2px solid currentColor;
  background: transparent; color: inherit; font: italic 700 14px/1 Georgia, serif; cursor: pointer; padding: 0; }
.si .si-i[aria-expanded="true"] { background: #2b3767; border-color: #2b3767; color: #fff; }
.si .si-why { margin: 10px 0 0; padding: 12px 14px; border-radius: 14px; border: 2px solid currentColor; font-size: .88rem; line-height: 1.5; font-style: normal; }
.si .si-why b { display: block; margin-bottom: 4px; }
.si .si-why code { font-family: ui-monospace, Menlo, monospace; font-size: .85em; }
.si .si-levels { display: flex; flex-wrap: wrap; gap: 8px; border: 0; padding: 0; margin: 0; }
.si .si-levels legend { font-weight: 700; margin-bottom: 8px; padding: 0; }
.si .si-levels label { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; border: 2px solid currentColor; border-radius: 999px; cursor: pointer; font-weight: 600; }
.si .si-levels.si-many label { min-height: 40px; padding: 0 12px; font-size: .92rem; }
.si .si-levels label:has(input:checked) { background: #2b3767; border-color: #2b3767; color: #fff; }
.si .si-levels input { accent-color: #2b3767; }
.si .si-check { display: flex; gap: 10px; align-items: flex-start; font-size: .95rem; font-weight: 400; }
.si .si-check input { width: 20px; height: 20px; margin-top: 2px; flex: none; accent-color: #2b3767; }
.si .si-err { margin: 4px 0 0; color: #b3261e; font-size: .88rem; font-weight: 700; }
.si [aria-invalid="true"] { border-color: #b3261e !important; }
@media (prefers-color-scheme: dark) { .si .si-err { color: #f2b8b5; } .si [aria-invalid="true"] { border-color: #f2b8b5 !important; } }
.si .si-opt { font-weight: 400; opacity: .8; }
.si .ms-btn { display: flex; align-items: center; justify-content: center; gap: 10px; }
.si .or { display: flex; align-items: center; gap: 10px; font-size: .85rem; opacity: .8; margin: 0; }
.si .or::before, .si .or::after { content: ""; flex: 1; border-top: 1px solid currentColor; opacity: .3; }
`;
function injectCss() {
  if (document.getElementById('si-css')) return;
  const st = document.createElement('style'); st.id = 'si-css'; st.textContent = CSS; document.head.appendChild(st);
}

function mount(el, data, opts = {}) {
  injectCss();
  let settling = false, waitingVerify = null;   // settling: the Join form was sent, the account is being set up
  let mode = 'signin', verifyEmail = '', msg = null, busy = false, showPw = false, asked = false, openManual = false, refused = false, whyOpen = false, resetSentTo = '';
  const kept = { email: '', pw: '', name: '', phone: '', level: '', github: '', consent: false, program: '', interests: [] };

  function keep() {
    const e = el.querySelector('#si-email'), p = el.querySelector('#si-pw');
    if (e) kept.email = e.value; if (p) kept.pw = p.value;
    const n = el.querySelector('#si-name'); if (n) kept.name = n.value;
    const p2 = el.querySelector('#si-pw2'); if (p2) kept.pw2 = p2.value;
    const ph = el.querySelector('#si-phone'); if (ph) kept.phone = ph.value;
    const gh = el.querySelector('#si-gh'); if (gh) kept.github = gh.value;
    const lv = el.querySelector('[name=si-level]:checked'); if (lv) kept.level = lv.value;
    const c = el.querySelector('#si-consent'); if (c) kept.consent = c.checked;
    const pr = el.querySelector('#si-program'); if (pr) kept.program = pr.value;
    if (el.querySelector('[name=si-int]')) kept.interests = [...el.querySelectorAll('[name=si-int]:checked')].map(x => x.value);
  }
  // inline errors: msg.field names the field the message is about, and the message shows right under that field
  const fe = (id) => (msg && msg.field === id ? `<p class="si-err" id="${id}-err">${esc(msg.text)}</p>` : '');
  const inv = (id, hint) => {
    const bad = msg && msg.field === id, ids = [hint, bad ? id + '-err' : ''].filter(Boolean).join(' ');
    return `${bad ? ' aria-invalid="true"' : ''}${ids ? ` aria-describedby="${ids}"` : ''}`;
  };
  function msgHTML() {
    if (!msg || msg.field) return '';
    const act = msg.offerCreate ? ` <a href="#" data-si="join">${esc(T('join.withthis'))}</a>` : msg.offerSignin ? ` <a href="#" data-si="signin">${esc(T('join.signin.instead'))}</a>` : '';
    return `<p class="si-msg ${msg.ok ? 'ok' : 'bad'}" role="${msg.ok ? 'status' : 'alert'}">${esc(msg.text)}${act}</p>`;
  }

  // the "i" next to the quarantine step: a short, technical answer to "why do I have to do this?"
  function whyBtn() { return `<button type="button" class="si-i" data-si="why" aria-expanded="${whyOpen}" aria-controls="si-why" aria-label="${esc(T('q.why.aria'))}" title="${esc(T('q.why.aria'))}">i</button>`; }
  function whyBox() { return whyOpen ? `<div class="si-why" id="si-why" role="note"><b>${esc(T('q.why.h'))}</b>${T('q.why.p')}</div>` : `<div id="si-why" hidden></div>`; }

  // the page around the box can follow along (e.g. /apply hides its join steps while someone signs in)
  function render() { draw(); if (opts.onMode) opts.onMode(mode); }
  function draw() {
    keep();
    if (settling) {
      el.innerHTML = `<div class="si"><div class="si-settle" role="status" aria-live="polite">
        <p class="si-spin">${esc(T('join.settling'))}</p><p class="si-hint">${esc(T(window.ClubData && ClubData.INSTANT ? 'join.settling.instant' : 'join.settling.p'))}</p></div></div>`;
      return;
    }
    // the page's own heading/intro make no sense on the "confirm your email" step
    (el.parentElement || document).querySelectorAll('[data-si-intro]').forEach(x => { x.hidden = mode === 'verify'; });
    if (mode === 'verify' && window.ClubData && ClubData.ORG_CONFIRM) {
      el.innerHTML = `<div class="si"><div class="si-verify">
        <h2 style="margin:0;font-weight:400">${T(refused ? 'pw.wait.refused.h' : 'pw.wait.h')}</h2>
        <p style="margin:0">${T(refused ? 'pw.wait.refused.p' : 'pw.wait.p', { email: esc(verifyEmail) })}</p>
        ${msgHTML()}
        ${refused ? '' : `<div class="si-row"><button type="button" class="btn btn-primary" data-si="done" ${busy ? 'disabled aria-busy="true"' : ''}>${esc(T('pw.wait.check'))}</button></div>
        <details class="si-manual"${openManual ? ' open' : ''}><summary>${esc(T('pw.fast.q'))}</summary>
          <ol class="si-steps">
            <li>${esc(T('pw.fast.1'))}<div><button type="button" class="btn btn-ghost ghost" data-si="fastmail" ${busy ? 'disabled' : ''}>${esc(T('pw.fast.btn'))}</button></div></li>
            <li>${T('pw.fast.2')}${whyBtn()}${whyBox()}</li>
            <li>${esc(T('pw.fast.3'))}</li>
          </ol></details>`}
        <p class="si-links"><a href="#" data-si="other">${esc(T('pw.other'))}</a></p></div></div>`;
      return;
    }
    if (mode === 'verify') {
      el.innerHTML = `<div class="si"><div class="si-verify">
        <h2 style="margin:0;font-weight:400">${T('pw.verify.h')}</h2>
        <p style="margin:0">${T('pw.verify.p', { email: esc(verifyEmail) })}</p>
        ${msgHTML()}
        <div class="si-row"><button type="button" class="btn btn-primary" data-si="done" ${busy ? 'disabled aria-busy="true"' : ''}>${esc(T('pw.verify.done'))}</button>
        <button type="button" class="btn btn-ghost ghost" data-si="resend" ${busy ? 'disabled' : ''}>${esc(T('pw.verify.resend'))}</button></div>
        ${data.requestManualConfirm ? (asked
          ? `<p class="si-msg ok" role="status">${esc(T('pw.manual.sent'))}</p>`
          : `<details class="si-manual"${openManual ? ' open' : ''}><summary>${esc(T('pw.manual.q'))}</summary>
              <p class="si-hint">${esc(T('pw.manual.p'))}</p>
              <div class="field"><label for="si-name">${esc(T('pw.manual.name'))}</label><input class="input" id="si-name" maxlength="60" autocomplete="name" value="${esc(kept.name || '')}"></div>
              <div><button type="button" class="btn btn-ghost ghost" data-si="manual" ${busy ? 'disabled' : ''}>${esc(T('pw.manual.btn'))}</button></div></details>`) : ''}
        <p class="si-links"><a href="#" data-si="other">${esc(T('pw.other'))}</a></p></div></div>`;
      return;
    }
    if (mode === 'forgot' && resetSentTo) {
      el.innerHTML = `<div class="si"><div class="si-verify">
        <h2 style="margin:0;font-weight:400">${T('pw.reset.h')}</h2>
        <p style="margin:0">${T('pw.reset.sent2', { email: esc(resetSentTo) })}</p>
        <ol class="si-steps">
          <li>${T('pw.reset.1')}${whyBtn()}${whyBox()}</li>
          <li>${esc(T('pw.reset.2'))}</li>
          <li>${esc(T('pw.reset.3'))}</li>
        </ol>
        ${msgHTML()}
        <div class="si-row"><button type="button" class="btn btn-primary" data-si="signin">${esc(T('pw.reset.back'))}</button>
        <button type="button" class="btn btn-ghost ghost" data-si="resendreset" ${busy ? 'disabled' : ''}>${esc(T('pw.reset.again'))}</button></div></div></div>`;
      return;
    }
    if (mode === 'join') {
      const ORG = window.ClubData && ClubData.ORG_CONFIRM;
      el.innerHTML = `<div class="si"><form novalidate data-si-form="join">
        <div class="field"><label for="si-name">${esc(T('join.name'))}</label>
          <input class="input" id="si-name" maxlength="40" autocomplete="nickname" required value="${esc(kept.name)}"${inv('si-name', 'si-name-h')}>
          <p class="si-hint" id="si-name-h">${esc(T('join.name.help'))}</p>${fe('si-name')}</div>
        <div class="field"><label for="si-email">${esc(T('m.signin.email'))}</label>
          <input class="input" id="si-email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" required placeholder="name@aivancity.education" value="${esc(kept.email)}"${inv('si-email')}>${fe('si-email')}</div>
        <div class="field"><label for="si-pw">${esc(T('pw.password.new'))}</label>
          <div class="si-pw"><input class="input" id="si-pw" type="${showPw ? 'text' : 'password'}" autocomplete="new-password" minlength="8" required value="${esc(kept.pw)}"${inv('si-pw')}>
          <button type="button" class="si-eye" data-si="eye" aria-pressed="${showPw}" aria-controls="si-pw">${esc(T(showPw ? 'pw.hide' : 'pw.show'))}</button></div>${fe('si-pw')}</div>
        <div class="field"><label for="si-phone">${esc(T('ev.join.phone'))}</label>
          <input class="input" id="si-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="+33 6 12 34 56 78" required value="${esc(kept.phone)}"${inv('si-phone', 'si-phone-h')}>
          <p class="si-hint" id="si-phone-h">${esc(T('ev.join.phone.help'))}</p>${fe('si-phone')}</div>
        <div class="field"><label for="si-program">${esc(T('join.program'))}</label>
          <input class="input" id="si-program" maxlength="60" autocomplete="off" required placeholder="${esc(T('join.program.ph'))}" value="${esc(kept.program)}"${inv('si-program', 'si-program-h')}>
          <p class="si-hint" id="si-program-h">${esc(T('join.program.help'))}</p>${fe('si-program')}</div>
        <fieldset class="si-levels si-many"${inv('si-int')}><legend>${esc(T('join.interests'))}</legend>
          ${INTERESTS.map(k => `<label><input type="checkbox" name="si-int" value="${k}"${kept.interests.includes(k) ? ' checked' : ''}><span>${T('int.' + k)}</span></label>`).join('')}${fe('si-int')}</fieldset>
        <fieldset class="si-levels si-many"${inv('si-level')}><legend>${esc(T('apply.level.legend'))}</legend>
          ${['new', 'some', 'solid'].map(l => `<label><input type="radio" name="si-level" value="${l}"${kept.level === l ? ' checked' : ''}><span>${esc(T('apply.level.' + l))}</span></label>`).join('')}${fe('si-level')}</fieldset>
        <div class="field"><label for="si-gh">${esc(T('join.github'))} <span class="si-opt">${esc(T('join.optional'))}</span></label>
          <input class="input" id="si-gh" maxlength="39" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="amina-k" value="${esc(kept.github)}"${inv('si-gh', 'si-gh-h')}>
          <p class="si-hint" id="si-gh-h">${esc(T('m.setup.github.help'))}</p>${fe('si-gh')}</div>
        <div><label class="si-check"><input type="checkbox" id="si-consent"${kept.consent ? ' checked' : ''}${inv('si-consent')}><span>${esc(T('join.consent'))}</span></label>${fe('si-consent')}</div>
        ${msgHTML()}
        <div><button class="btn btn-primary" type="submit" ${busy ? 'disabled aria-busy="true"' : ''}>${esc(T(busy ? 'join.busy' : 'join.btn'))}</button></div>
        <p class="si-hint">${esc(T(ClubData.INSTANT ? 'join.hint.instant' : ORG ? 'join.hint.org' : 'join.hint.email'))}</p>
        <p class="si-links"><a href="#" data-si="signin">${esc(T('join.have'))}</a></p>
      </form></div>`;
      return;
    }
    const create = mode === 'create', forgot = mode === 'forgot', link = mode === 'link';
    el.innerHTML = `<div class="si"><form novalidate>
      ${data.microsoft && !forgot && !link ? `<div class="ms-block" style="display:grid;gap:10px"><button class="btn ghost btn-ghost ms-btn" type="button" data-si="ms">${MS}<span>${esc(T('ms.btn'))}</span></button><p class="or"><span>${esc(T('ms.or.pw'))}</span></p></div>` : ''}
      ${link ? `<p style="margin:0">${esc(T('m.signin.otherdevice'))}</p>` : ''}
      ${forgot ? `<p style="margin:0">${esc(T('pw.forgot.p'))}</p>` : ''}
      ${create && window.ClubData && ClubData.ORG_CONFIRM ? `<div class="field"><label for="si-name">${esc(T('pw.manual.name'))}</label>
        <input class="input" id="si-name" maxlength="60" autocomplete="name" required value="${esc(kept.name || '')}"></div>` : ''}
      <div class="field"><label for="si-email">${esc(T('m.signin.email'))}</label>
        <input class="input" id="si-email" type="email" inputmode="email" autocomplete="${create ? 'email' : 'username'}" autocapitalize="off" spellcheck="false" required value="${esc(kept.email)}"${inv('si-email')}>${fe('si-email')}</div>
      ${forgot || link ? '' : `<div class="field"><label for="si-pw">${esc(T(create ? 'pw.password.new' : 'pw.password'))}</label>
        <div class="si-pw"><input class="input" id="si-pw" type="${showPw ? 'text' : 'password'}" autocomplete="${create ? 'new-password' : 'current-password'}" minlength="${create ? 8 : 1}" required value="${esc(kept.pw)}"${inv('si-pw')}>
        <button type="button" class="si-eye" data-si="eye" aria-pressed="${showPw}" aria-controls="si-pw">${esc(T(showPw ? 'pw.hide' : 'pw.show'))}</button></div>${fe('si-pw')}</div>`}
      ${create ? `<div class="field"><label for="si-pw2">${esc(T('pw.password.again'))}</label>
        <input class="input" id="si-pw2" type="${showPw ? 'text' : 'password'}" autocomplete="new-password" minlength="8" required value="${esc(kept.pw2 || '')}"></div>` : ''}
      ${msgHTML()}
      <div><button class="btn btn-primary" type="submit" ${busy ? 'disabled aria-busy="true"' : ''}>${esc(T(busy ? 'pw.busy' : create ? 'pw.create' : forgot ? 'pw.reset.btn' : link ? 'm.signin.confirm' : 'pw.signin'))}</button></div>
      <p class="si-links">
        ${mode === 'signin' ? `<a href="#" data-si="join">${esc(T('join.new'))}</a><a href="#" data-si="forgot">${esc(T('pw.forgot'))}</a>` : ''}
        ${create || forgot ? `<a href="#" data-si="signin">${esc(T('pw.toSignin'))}</a>` : ''}
      </p>
      ${mode === 'signin' && !(window.ClubData && ClubData.ORG_CONFIRM) ? `<p class="si-hint">${esc(T('pw.legacy'))}</p>` : ''}
      ${create ? `<p class="si-hint">${esc(T(window.ClubData && ClubData.ORG_CONFIRM ? 'pw.create.hint.org' : 'pw.create.hint'))}</p>` : ''}
    </form></div>`;
  }

  async function run(fn) {
    busy = true; render();
    try { await fn(); } finally {
      busy = false;
      // the page asked for the "waiting for approval" screen while the account was still being saved: show it now
      if (waitingVerify !== null && !(msg && !msg.ok)) { settling = false; const em = waitingVerify; waitingVerify = null; api.verify(em); return; }
      waitingVerify = null; render();
    }
  }

  el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-si]'); if (!a) return;
    const k = a.dataset.si; e.preventDefault();
    if (k === 'why') { whyOpen = !whyOpen; render(); const b = el.querySelector('[data-si="why"]'); if (b) b.focus(); return; }
    if (k === 'resendreset') { await run(async () => { const r = await data.resetPassword(resetSentTo); msg = r.ok ? { ok: true, text: T('pw.reset.resent') } : { text: r.message }; }); return; }
    if (k === 'eye') { keep(); showPw = !showPw; render(); const p = el.querySelector('#si-pw'); if (p) p.focus(); return; }
    if (['create', 'join', 'signin', 'forgot'].includes(k)) {
      keep(); resetSentTo = ''; whyOpen = false; mode = k === 'create' ? 'join' : k;
      msg = mode === 'join' && kept.email && kept.pw ? { ok: true, text: T('join.kept') } : null; render();
      const i = el.querySelector(mode === 'join' ? '#si-name' : '#si-email'); if (i) i.focus(); return;
    }
    if (k === 'ms') { await run(async () => { const r = await data.signInMicrosoft(); msg = r.ok ? null : { text: r.message }; }); return; }
    if (k === 'fastmail') { openManual = true; await run(async () => { const r = await data.resendVerification(); msg = r.ok ? { ok: true, text: T('pw.fast.sent') } : { text: r.message }; }); return; }
    if (k === 'resend') { await run(async () => { const r = await data.resendVerification(); msg = r.ok ? { ok: true, text: T('pw.verify.resent') } : { text: r.message }; }); return; }
    if (k === 'done') {
      await run(async () => { const ok = await data.refreshVerified(); if (ok) location.reload(); else msg = { text: T(window.ClubData && ClubData.ORG_CONFIRM ? 'pw.wait.notyet' : 'pw.verify.notyet') }; });
      return;
    }
    if (k === 'manual') {
      keep(); openManual = true;
      if (!kept.name.trim()) { msg = { text: T('pw.manual.noname') }; render(); const n = el.querySelector('#si-name'); if (n) n.focus(); return; }
      await run(async () => { const r = await data.requestManualConfirm(kept.name); if (r.ok) { asked = true; msg = null; } else msg = { text: r.message || T('err.generic') }; });
      return;
    }
    if (k === 'other') { await data.signOut(); mode = 'signin'; msg = null; render(); }
  });
  // the join form: account + answers in one go
  async function submitJoin() {
    // one problem at a time, shown under its field, with the focus moved there
    const bad = (text, field) => {
      msg = { text, field }; render();
      const f = el.querySelector('#' + field) || el.querySelector(`[name=${field}]`); if (f) f.focus();
    };
    const email = kept.email.trim(), name = kept.name.trim(), phone = kept.phone.trim(), github = kept.github.trim().replace(/^@/, '').replace(/^https?:\/\/github\.com\//i, '').replace(/\/.*$/, '');
    kept.program = kept.program.trim();
    if (!name) return bad(T('err.name'), 'si-name');
    if (!email) return bad(T('join.err.email'), 'si-email');
    if (!ClubData.validEmail(email)) return bad(T('err.email'), 'si-email');
    if (String(kept.pw).length < 8) return bad(T('err.pw.weak'), 'si-pw');
    if (!ClubData.validPhone(phone)) return bad(T('err.phone'), 'si-phone');
    if (!kept.program) return bad(T('join.err.program'), 'si-program');
    if (!kept.interests.length) return bad(T('join.err.interests'), 'si-int');
    if (!kept.level) return bad(T('err.level'), 'si-level');
    if (github && !/^[A-Za-z0-9-]{1,39}$/.test(github)) return bad(T('join.err.github'), 'si-gh');
    if (!kept.consent) return bad(T('join.err.consent'), 'si-consent');
    if (opts.onStart) opts.onStart();
    settling = true;   // from the tap on: a clear "setting up your account" screen instead of a frozen form
    await run(async () => {
      const r = await data.joinClub({ email, pw: kept.pw, name, phone, level: kept.level, github, program: kept.program, interests: kept.interests,
        lang: window.I18N ? I18N.lang : 'en', ...(opts.joinExtra ? opts.joinExtra() : {}) });
      if (r.ok) { kept.pw = ''; kept.pw2 = ''; msg = null; settling = true; if (opts.onJoined) opts.onJoined(r); return; }
      settling = false;
      if (opts.onFail) opts.onFail();
      if (/email-already-in-use/.test(r.code || '')) { mode = 'signin'; msg = { text: T('join.exists') }; return; }
      msg = { text: r.message || T('err.generic') };
    });
  }
  el.addEventListener('submit', async (e) => {
    e.preventDefault(); keep();
    if (mode === 'join') return submitJoin();
    const email = kept.email.trim(), pw = kept.pw;
    const need = (text, field) => { msg = { text, field }; render(); const f = el.querySelector('#' + field); if (f) f.focus(); };
    if (!email) return need(T('join.err.email'), 'si-email');
    if (!ClubData.validEmail(email)) return need(T('err.email'), 'si-email');
    if (!['forgot', 'link'].includes(mode) && !pw) return need(T('pw.err.empty'), 'si-pw');
    if (mode === 'create' && pw !== (kept.pw2 || '')) { msg = { text: T('pw.mismatch') }; render(); const p2 = el.querySelector('#si-pw2'); if (p2) p2.focus(); return; }
    if (mode === 'create' && window.ClubData && ClubData.ORG_CONFIRM && !String(kept.name || '').trim()) { msg = { text: T('pw.manual.noname') }; render(); const n = el.querySelector('#si-name'); if (n) n.focus(); return; }
    await run(async () => {
      if (mode === 'forgot') {
        const r = await data.resetPassword(email);
        if (r.ok) { resetSentTo = email; msg = null; } else msg = { text: r.message };
      } else if (mode === 'link') {
        try { await data.completeLink(email); msg = null; } catch (x) { msg = { text: x.message || T('err.generic') }; }
      } else {
        const wasCreate = mode === 'create';
        const r = wasCreate ? await data.signUp(email, pw, kept.name) : await data.signInPassword(email, pw);
        msg = r.ok ? null : { text: r.message };
        if (r.ok) { kept.pw = ''; kept.pw2 = ''; }
        // no account with this email: go to the join form with what they typed
        else if (!wasCreate && /user-not-found/.test(r.code || '')) { mode = 'join'; kept.pw2 = ''; msg = { ok: true, text: T('join.kept') }; }
        // the server can't tell "wrong password" from "no account": offer both ways out
        else if (!wasCreate && /invalid-credential|invalid-login|wrong-password/.test(r.code || '')) msg = { text: T('pw.wrong.or.new'), offerCreate: true };
      }
    });
  });
  addEventListener('langchange', () => { if (el.firstChild) render(); });

  const api = {
    signin(error) { settling = false; mode = data.pendingLink ? 'link' : 'signin'; msg = error ? { text: error } : null; render(); },
    join() { settling = false; mode = 'join'; msg = null; render(); },
    create() { settling = false; mode = 'join'; msg = null; render(); },
    get name() { return kept.name || ''; },
    verify(email) {
      if (busy && settling) { waitingVerify = email || ''; return; }   // still saving the join answers: switch once they're saved
      settling = false; mode = 'verify'; verifyEmail = email || ''; msg = null; render();
      if (data.accountRefused) data.accountRefused().then(r => { if (r) { refused = true; render(); } });
      if (data.manualConfirmPending) data.manualConfirmPending().then(p => { if (p && !asked) { asked = true; render(); } }); },
  };
  return api;
}
window.ClubSignIn = { mount };
})();
