/* Shared sign-in box for /mountain, /apply and /village.
   School email + password. Creating an account sends ONE confirmation email; signing in sends none,
   which keeps the club inside Firebase's free plan limits.

   const box = ClubSignIn.mount(element, data);
   box.signin()          show the sign-in form
   box.verify(email)     signed in but email not confirmed yet
   Clicking "I've confirmed it" reloads the page once the email is confirmed, so each page's normal flow runs. */
(function () {
'use strict';
const T = (k, v) => (window.I18N ? I18N.t(k, v) : k);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MS = '<svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>';

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
.si .ms-btn { display: flex; align-items: center; justify-content: center; gap: 10px; }
.si .or { display: flex; align-items: center; gap: 10px; font-size: .85rem; opacity: .8; margin: 0; }
.si .or::before, .si .or::after { content: ""; flex: 1; border-top: 1px solid currentColor; opacity: .3; }
`;
function injectCss() {
  if (document.getElementById('si-css')) return;
  const st = document.createElement('style'); st.id = 'si-css'; st.textContent = CSS; document.head.appendChild(st);
}

function mount(el, data) {
  injectCss();
  let mode = 'signin', verifyEmail = '', msg = null, busy = false, showPw = false, asked = false, openManual = false, refused = false, whyOpen = false, resetSentTo = '';
  const kept = { email: '', pw: '', name: '' };

  function keep() {
    const e = el.querySelector('#si-email'), p = el.querySelector('#si-pw');
    if (e) kept.email = e.value; if (p) kept.pw = p.value;
    const n = el.querySelector('#si-name'); if (n) kept.name = n.value;
    const p2 = el.querySelector('#si-pw2'); if (p2) kept.pw2 = p2.value;
  }
  function msgHTML() {
    if (!msg) return '';
    const act = msg.offerCreate ? ` <a href="#" data-si="create">${esc(T('pw.nouser.create'))}</a>` : '';
    return `<p class="si-msg ${msg.ok ? 'ok' : 'bad'}" role="${msg.ok ? 'status' : 'alert'}">${esc(msg.text)}${act}</p>`;
  }

  // the "i" next to the quarantine step: a short, technical answer to "why do I have to do this?"
  function whyBtn() { return `<button type="button" class="si-i" data-si="why" aria-expanded="${whyOpen}" aria-controls="si-why" aria-label="${esc(T('q.why.aria'))}" title="${esc(T('q.why.aria'))}">i</button>`; }
  function whyBox() { return whyOpen ? `<div class="si-why" id="si-why" role="note"><b>${esc(T('q.why.h'))}</b>${T('q.why.p')}</div>` : `<div id="si-why" hidden></div>`; }

  function render() {
    keep();
    // the page's own heading/intro make no sense on the "confirm your email" step
    (el.parentElement || document).querySelectorAll('[data-si-intro]').forEach(x => { x.hidden = mode === 'verify'; });
    if (mode === 'verify' && window.ClubData && ClubData.ORG_CONFIRM) {
      el.innerHTML = `<div class="si"><div class="si-verify">
        <h2 style="margin:0;font-weight:400">${T(refused ? 'pw.wait.refused.h' : 'pw.wait.h')}</h2>
        <p style="margin:0">${T(refused ? 'pw.wait.refused.p' : 'pw.wait.p', { email: esc(verifyEmail) })}</p>
        ${msgHTML()}
        ${refused ? '' : `<div class="si-row"><button type="button" class="btn btn-primary" data-si="done" ${busy ? 'disabled' : ''}>${esc(T('pw.wait.check'))}</button></div>
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
        <div class="si-row"><button type="button" class="btn btn-primary" data-si="done" ${busy ? 'disabled' : ''}>${esc(T('pw.verify.done'))}</button>
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
    const create = mode === 'create', forgot = mode === 'forgot', link = mode === 'link';
    el.innerHTML = `<div class="si"><form novalidate>
      ${data.microsoft && !forgot && !link ? `<div class="ms-block" style="display:grid;gap:10px"><button class="btn ghost btn-ghost ms-btn" type="button" data-si="ms">${MS}<span>${esc(T('ms.btn'))}</span></button><p class="or"><span>${esc(T('ms.or.pw'))}</span></p></div>` : ''}
      ${link ? `<p style="margin:0">${esc(T('m.signin.otherdevice'))}</p>` : ''}
      ${forgot ? `<p style="margin:0">${esc(T('pw.forgot.p'))}</p>` : ''}
      ${create && window.ClubData && ClubData.ORG_CONFIRM ? `<div class="field"><label for="si-name">${esc(T('pw.manual.name'))}</label>
        <input class="input" id="si-name" maxlength="60" autocomplete="name" required value="${esc(kept.name || '')}"></div>` : ''}
      <div class="field"><label for="si-email">${esc(T('m.signin.email'))}</label>
        <input class="input" id="si-email" type="email" inputmode="email" autocomplete="${create ? 'email' : 'username'}" autocapitalize="off" spellcheck="false" required value="${esc(kept.email)}"></div>
      ${forgot || link ? '' : `<div class="field"><label for="si-pw">${esc(T(create ? 'pw.password.new' : 'pw.password'))}</label>
        <div class="si-pw"><input class="input" id="si-pw" type="${showPw ? 'text' : 'password'}" autocomplete="${create ? 'new-password' : 'current-password'}" minlength="${create ? 8 : 1}" required value="${esc(kept.pw)}">
        <button type="button" class="si-eye" data-si="eye" aria-pressed="${showPw}" aria-controls="si-pw">${esc(T(showPw ? 'pw.hide' : 'pw.show'))}</button></div></div>`}
      ${create ? `<div class="field"><label for="si-pw2">${esc(T('pw.password.again'))}</label>
        <input class="input" id="si-pw2" type="${showPw ? 'text' : 'password'}" autocomplete="new-password" minlength="8" required value="${esc(kept.pw2 || '')}"></div>` : ''}
      ${msgHTML()}
      <div><button class="btn btn-primary" type="submit" ${busy ? 'disabled' : ''}>${esc(T(create ? 'pw.create' : forgot ? 'pw.reset.btn' : link ? 'm.signin.confirm' : 'pw.signin'))}</button></div>
      <p class="si-links">
        ${mode === 'signin' ? `<a href="#" data-si="create">${esc(T('pw.toCreate'))}</a><a href="#" data-si="forgot">${esc(T('pw.forgot'))}</a>` : ''}
        ${create || forgot ? `<a href="#" data-si="signin">${esc(T('pw.toSignin'))}</a>` : ''}
      </p>
      ${mode === 'signin' && !(window.ClubData && ClubData.ORG_CONFIRM) ? `<p class="si-hint">${esc(T('pw.legacy'))}</p>` : ''}
      ${create ? `<p class="si-hint">${esc(T(window.ClubData && ClubData.ORG_CONFIRM ? 'pw.create.hint.org' : 'pw.create.hint'))}</p>` : ''}
    </form></div>`;
  }

  async function run(fn) { busy = true; render(); try { await fn(); } finally { busy = false; render(); } }

  el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-si]'); if (!a) return;
    const k = a.dataset.si; e.preventDefault();
    if (k === 'why') { whyOpen = !whyOpen; render(); const b = el.querySelector('[data-si="why"]'); if (b) b.focus(); return; }
    if (k === 'resendreset') { await run(async () => { const r = await data.resetPassword(resetSentTo); msg = r.ok ? { ok: true, text: T('pw.reset.resent') } : { text: r.message }; }); return; }
    if (k === 'eye') { keep(); showPw = !showPw; render(); const p = el.querySelector('#si-pw'); if (p) p.focus(); return; }
    if (['create', 'signin', 'forgot'].includes(k)) {
      keep(); resetSentTo = ''; whyOpen = false; const prefilled = k === 'create' && kept.email && kept.pw; mode = k;
      msg = prefilled ? { ok: true, text: T('pw.nouser') } : null; render();
      const i = el.querySelector(prefilled ? (el.querySelector('#si-name') ? '#si-name' : '#si-pw2') : '#si-email'); if (i) i.focus(); return;
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
  el.addEventListener('submit', async (e) => {
    e.preventDefault(); keep();
    const email = kept.email.trim(), pw = kept.pw;
    if (!email || (!['forgot', 'link'].includes(mode) && !pw)) { msg = { text: T('err.pw.empty') }; render(); return; }
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
        // no account with this email: go to "create an account" with what they typed
        else if (!wasCreate && /user-not-found/.test(r.code || '')) { mode = 'create'; kept.pw2 = ''; msg = { ok: true, text: T('pw.nouser') }; }
        // the server can't tell "wrong password" from "no account": offer both ways out
        else if (!wasCreate && /invalid-credential|invalid-login|wrong-password/.test(r.code || '')) msg = { text: T('pw.wrong.or.new'), offerCreate: true };
      }
    });
  });
  addEventListener('langchange', () => { if (el.firstChild) render(); });

  return {
    signin(error) { mode = data.pendingLink ? 'link' : 'signin'; msg = error ? { text: error } : null; render(); },
    create() { mode = 'create'; msg = null; render(); },
    get name() { return kept.name || ''; },
    verify(email) { mode = 'verify'; verifyEmail = email || ''; msg = null; render();
      if (data.accountRefused) data.accountRefused().then(r => { if (r) { refused = true; render(); } });
      if (data.manualConfirmPending) data.manualConfirmPending().then(p => { if (p && !asked) { asked = true; render(); } }); },
  };
}
window.ClubSignIn = { mount };
})();
