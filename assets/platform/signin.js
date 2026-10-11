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
  let mode = 'signin', verifyEmail = '', msg = null, busy = false, showPw = false;
  const kept = { email: '', pw: '' };

  function keep() {
    const e = el.querySelector('#si-email'), p = el.querySelector('#si-pw');
    if (e) kept.email = e.value; if (p) kept.pw = p.value;
  }
  function msgHTML() { return msg ? `<p class="si-msg ${msg.ok ? 'ok' : 'bad'}" role="${msg.ok ? 'status' : 'alert'}">${esc(msg.text)}</p>` : ''; }

  function render() {
    keep();
    // the page's own heading/intro make no sense on the "confirm your email" step
    (el.parentElement || document).querySelectorAll('[data-si-intro]').forEach(x => { x.hidden = mode === 'verify'; });
    if (mode === 'verify') {
      el.innerHTML = `<div class="si"><div class="si-verify">
        <h2 style="margin:0;font-weight:400">${T('pw.verify.h')}</h2>
        <p style="margin:0">${T('pw.verify.p', { email: esc(verifyEmail) })}</p>
        ${msgHTML()}
        <div class="si-row"><button type="button" class="btn btn-primary" data-si="done" ${busy ? 'disabled' : ''}>${esc(T('pw.verify.done'))}</button>
        <button type="button" class="btn btn-ghost ghost" data-si="resend" ${busy ? 'disabled' : ''}>${esc(T('pw.verify.resend'))}</button></div>
        <p class="si-links"><a href="#" data-si="other">${esc(T('pw.other'))}</a></p></div></div>`;
      return;
    }
    const create = mode === 'create', forgot = mode === 'forgot', link = mode === 'link';
    el.innerHTML = `<div class="si"><form novalidate>
      ${data.microsoft && !forgot && !link ? `<div class="ms-block" style="display:grid;gap:10px"><button class="btn ghost btn-ghost ms-btn" type="button" data-si="ms">${MS}<span>${esc(T('ms.btn'))}</span></button><p class="or"><span>${esc(T('ms.or.pw'))}</span></p></div>` : ''}
      ${link ? `<p style="margin:0">${esc(T('m.signin.otherdevice'))}</p>` : ''}
      ${forgot ? `<p style="margin:0">${esc(T('pw.forgot.p'))}</p>` : ''}
      <div class="field"><label for="si-email">${esc(T('m.signin.email'))}</label>
        <input class="input" id="si-email" type="email" inputmode="email" autocomplete="${create ? 'email' : 'username'}" autocapitalize="off" spellcheck="false" required value="${esc(kept.email)}"></div>
      ${forgot || link ? '' : `<div class="field"><label for="si-pw">${esc(T(create ? 'pw.password.new' : 'pw.password'))}</label>
        <div class="si-pw"><input class="input" id="si-pw" type="${showPw ? 'text' : 'password'}" autocomplete="${create ? 'new-password' : 'current-password'}" minlength="${create ? 8 : 1}" required value="${esc(kept.pw)}">
        <button type="button" class="si-eye" data-si="eye" aria-pressed="${showPw}" aria-controls="si-pw">${esc(T(showPw ? 'pw.hide' : 'pw.show'))}</button></div></div>`}
      ${msgHTML()}
      <div><button class="btn btn-primary" type="submit" ${busy ? 'disabled' : ''}>${esc(T(create ? 'pw.create' : forgot ? 'pw.reset.btn' : link ? 'm.signin.confirm' : 'pw.signin'))}</button></div>
      <p class="si-links">
        ${mode === 'signin' ? `<a href="#" data-si="create">${esc(T('pw.toCreate'))}</a><a href="#" data-si="forgot">${esc(T('pw.forgot'))}</a>` : ''}
        ${create || forgot ? `<a href="#" data-si="signin">${esc(T('pw.toSignin'))}</a>` : ''}
      </p>
      ${mode === 'signin' ? `<p class="si-hint">${esc(T('pw.legacy'))}</p>` : ''}
      ${create ? `<p class="si-hint">${esc(T('pw.create.hint'))}</p>` : ''}
    </form></div>`;
  }

  async function run(fn) { busy = true; render(); try { await fn(); } finally { busy = false; render(); } }

  el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-si]'); if (!a) return;
    const k = a.dataset.si; e.preventDefault();
    if (k === 'eye') { keep(); showPw = !showPw; render(); const p = el.querySelector('#si-pw'); if (p) p.focus(); return; }
    if (['create', 'signin', 'forgot'].includes(k)) { keep(); mode = k; msg = null; render(); const i = el.querySelector('#si-email'); if (i) i.focus(); return; }
    if (k === 'ms') { await run(async () => { const r = await data.signInMicrosoft(); msg = r.ok ? null : { text: r.message }; }); return; }
    if (k === 'resend') { await run(async () => { const r = await data.resendVerification(); msg = r.ok ? { ok: true, text: T('pw.verify.resent') } : { text: r.message }; }); return; }
    if (k === 'done') {
      await run(async () => { const ok = await data.refreshVerified(); if (ok) location.reload(); else msg = { text: T('pw.verify.notyet') }; });
      return;
    }
    if (k === 'other') { await data.signOut(); mode = 'signin'; msg = null; render(); }
  });
  el.addEventListener('submit', async (e) => {
    e.preventDefault(); keep();
    const email = kept.email.trim(), pw = kept.pw;
    if (!email || (!['forgot', 'link'].includes(mode) && !pw)) { msg = { text: T('err.pw.empty') }; render(); return; }
    await run(async () => {
      if (mode === 'forgot') {
        const r = await data.resetPassword(email);
        msg = r.ok ? { ok: true, text: T('pw.reset.sent', { email }) } : { text: r.message };
      } else if (mode === 'link') {
        try { await data.completeLink(email); msg = null; } catch (x) { msg = { text: x.message || T('err.generic') }; }
      } else {
        const r = mode === 'create' ? await data.signUp(email, pw) : await data.signInPassword(email, pw);
        msg = r.ok ? null : { text: r.message };
        if (r.ok) kept.pw = '';
      }
    });
  });
  addEventListener('langchange', () => { if (el.firstChild) render(); });

  return {
    signin(error) { mode = data.pendingLink ? 'link' : 'signin'; msg = error ? { text: error } : null; render(); },
    verify(email) { mode = 'verify'; verifyEmail = email || ''; msg = null; render(); },
  };
}
window.ClubSignIn = { mount };
})();
