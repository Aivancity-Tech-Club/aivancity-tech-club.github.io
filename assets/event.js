/* The event page (/event?id=… for events made on the site, /event?d=YYYY-MM-DD for sessions in schedule.js):
   full details, places, registration (with account creation for newcomers), and the organizer's list of registrations. */
(async () => {
  const $ = (id) => document.getElementById(id), T = (k, v) => I18N.t(k, v), P = (o, f) => I18N.pick(o, f);
  const q = new URLSearchParams(location.search), evId = q.get("id"), evDate = q.get("d");
  $("yr").textContent = new Date().getFullYear();
  $("evTitle").textContent = T("ev.loading");

  /* ---------- text helpers ---------- */
  const linkify = (t) => t.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//, "")} ↗</a>`);
  // blank line = new paragraph, lines starting with "- " = a list, links become clickable
  function richText(text) {
    const bullet = /^\s*[-•*]\s+/;
    return String(text || "").trim().split(/\n\s*\n/).filter(Boolean).map(block => {
      // consecutive "- " lines become a list; other lines stay a paragraph
      const out = []; let para = [], items = [];
      const flushP = () => { if (para.length) out.push(`<p>${para.map(l => linkify(esc(l))).join("<br>")}</p>`); para = []; };
      const flushL = () => { if (items.length) out.push(`<ul>${items.map(l => `<li>${linkify(esc(l))}</li>`).join("")}</ul>`); items = []; };
      for (const l of block.split("\n")) { if (bullet.test(l)) { flushP(); items.push(l.replace(bullet, "")); } else { flushL(); para.push(l); } }
      flushP(); flushL(); return out.join("");
    }).join("");
  }
  const fmtDay = (d) => { const s = parseDate(d).toLocaleDateString(LOC(), { weekday: "long", day: "numeric", month: "long", year: "numeric" }); return s.charAt(0).toUpperCase() + s.slice(1); };

  /* ---------- load the event ---------- */
  const data = ClubData.create();
  let dataErr = null;
  try { await data.init(); } catch (e) { dataErr = e; }
  let ev = null;
  if (evDate) ev = SESSIONS.find(s => s.date === evDate && s.track !== "break") || null;
  else if (evId && !dataErr) ev = await data.getEvent(evId);
  if (!ev) {
    $("evTitle").textContent = T("ev.notfound");
    $("evLede").innerHTML = `<a class="btn btn-ghost" href="/schedule">${esc(T("ev.back"))} →</a>`;
    return;
  }
  ev = { ...ev, _d: parseDate(ev.date) };
  const isSite = !!ev.id, today = today0(), past = ev._d < today;
  document.title = `${P(ev, "title")} · aivancity Tech Club`;

  let regs = [], me = null, isOrg = false, member = false, hasReq = false, refused = false, busy = false, msg = null;
  const taken = () => regs.filter(r => r.status === "pending" || r.status === "confirmed").length;
  const full = () => ev.capacity && taken() >= ev.capacity;
  const mine = () => (me ? regs.find(r => r.uid === me.uid) : null);
  const deadlinePassed = () => ev.deadline && parseDate(ev.deadline) < today;

  /* ---------- the page ---------- */
  function drawPage() {
    $("evTitle").textContent = P(ev, "title");
    $("evChips").innerHTML = [
      `<span class="chip">${esc(P(ev, "type") || T("track." + ev.track) || T("sched.session"))}</span>`,
      ev.track === "gdg" ? `<span class="chip">GDG on Campus</span>` : "",
      ev.lang ? `<span class="chip chip-lang">${esc(langLabel(ev))}</span>` : "",
      ev.level ? `<span class="chip chip-level lv-${esc(ev.level)}">${esc(T("level." + ev.level))}</span>` : "",
      past ? `<span class="chip chip-done">${esc(T("sched.done"))}</span>` : "",
      !past && ev.planned ? `<span class="chip chip-planned">${esc(T("sched.planned"))}</span>` : "",
      isOrg && isSite && !ev.published ? `<span class="chip chip-planned">${esc(T("ev.draft"))}</span>` : "",
    ].join("");
    $("evLede").textContent = P(ev, "description") || "";
    const details = P(ev, "details");
    $("evDetails").innerHTML = details ? `<h2 class="side-h">${esc(T("ev.about"))}</h2>${richText(details)}` : "";
    $("evRecap").innerHTML = past && ev.recap ? recapHTML(ev) : "";
    const row = (k, v) => (v ? `<div><dt>${esc(T(k))}</dt><dd>${v}</dd></div>` : "");
    $("evFacts").innerHTML = `<dl class="ev-facts">
        ${row("ev.when", esc(fmtDay(ev.date)))}
        ${row("ev.time", esc(P(ev, "time") || T("sched.time")))}
        ${row("ev.where", esc(P(ev, "room") || T("sched.room")))}
        ${ev.speaker ? row("ev.speaker", esc(ev.speaker)) : ""}
        ${ev.registration && ev.capacity ? row("ev.placesh", esc(T(full() ? "ev.full" : "ev.places", { n: taken(), cap: ev.capacity }))) : ""}
        ${ev.registration && ev.deadline && !past ? row("ev.deadline", esc(fmtDay(ev.deadline))) : ""}
      </dl>
      <div class="ev-actions">
        ${ev.link ? `<a class="btn btn-primary" href="${esc(ev.link)}" target="_blank" rel="noopener">${esc(P(ev, "linkText") || T("sched.more"))} ↗</a>` : ""}
        ${!past ? `<button type="button" class="cal-btn" data-ics="${esc(sessionKey(ev))}">${esc(T("sched.cal.one"))}</button>` : ""}
        <button type="button" class="cal-btn no-ico" id="copyLink">${esc(T("ev.copy"))}</button>
      </div>`;
    $("evBody").hidden = false;
    drawReg(); drawOrg();
  }

  /* ---------- registration ---------- */
  let siBox = null;
  function regIntro() { return `<h2 class="side-h" id="regH">${esc(T(full() ? "ev.waitlist.h" : "ev.reg.h"))}</h2>`; }
  function msgHTML() { return msg ? `<p class="notice ${msg.ok ? "ok" : "bad"} form-msg" role="${msg.ok ? "status" : "alert"}">${esc(msg.text)}</p>` : ""; }
  function drawReg() {
    const box = $("register");
    if (!ev.registration || !isSite) { box.hidden = true; return; }
    box.hidden = false;
    if (past) { box.innerHTML = `${regIntro()}<p class="help">${esc(T("ev.reg.past"))}</p>`; return; }
    const r = mine();
    if (deadlinePassed() && !(r && r.status !== "cancelled")) { box.innerHTML = `${regIntro()}<p class="help">${esc(T("ev.reg.closed", { d: fmtDay(ev.deadline) }))}</p>`; return; }
    if (dataErr) { box.innerHTML = `${regIntro()}<p class="notice bad">${esc(T("m.dberror", { e: dataErr.code || dataErr.message || "?" }))}</p>`; return; }
    if (!me) {
      box.innerHTML = `${regIntro()}<p class="help">${esc(T("ev.reg.account"))}</p><div id="regAuth"></div>`;
      siBox = ClubSignIn.mount($("regAuth"), data); siBox.create();
      return;
    }
    if (refused) { box.innerHTML = `${regIntro()}<p class="help">${esc(T("ev.reg.refused"))}</p>`; return; }
    if (r && r.status !== "cancelled") {
      const k = { confirmed: "ev.st.confirmed", pending: "ev.st.pending", waitlist: "ev.st.waitlist" }[r.status] || "ev.st.pending";
      box.innerHTML = `<h2 class="side-h" id="regH">${esc(T(k + ".h"))}</h2><p class="ev-status st-${esc(r.status)}">${esc(T(k))}</p>${msgHTML()}
        <p><button type="button" class="link-btn" data-act="cancel" ${busy ? "disabled" : ""}>${esc(T("ev.cancel"))}</button></p>`;
      return;
    }
    if (!member && !hasReq) {
      // not in the club yet: the short join form, then the spot
      const name = (siBox && siBox.name) || "";
      box.innerHTML = `${regIntro()}<p class="help">${esc(T("ev.join.p"))}</p>
        <form class="ev-join" novalidate>
          <div class="field"><label for="jName">${esc(T("apply.name"))}</label><input class="input" id="jName" maxlength="60" autocomplete="name" required value="${esc(name)}"></div>
          <div class="field"><label for="jPhone">${esc(T("ev.join.phone"))}</label><input class="input" id="jPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="+33 6 12 34 56 78" required>
            <p class="help">${esc(T("ev.join.phone.help"))}</p></div>
          <div class="field"><label for="jProgram">${esc(T("ev.join.program"))}</label><input class="input" id="jProgram" maxlength="60"></div>
          <fieldset class="field"><legend>${esc(T("apply.level.legend"))}</legend><div class="choices">
            ${["new", "some", "solid"].map(l => `<label class="choice"><input type="radio" name="jLevel" value="${l}"><span>${esc(T("apply.level." + l))}</span></label>`).join("")}</div></fieldset>
          <label class="check"><input type="checkbox" id="jConsent"><span>${esc(T("apply.consent"))}</span></label>
          ${msgHTML()}
          <div><button class="btn btn-primary" type="submit" ${busy ? "disabled" : ""}>${esc(T(full() ? "ev.join.btn.wait" : "ev.join.btn"))}</button></div>
        </form>`;
      return;
    }
    box.innerHTML = `${regIntro()}${!member ? `<p class="help">${esc(T("ev.reg.review"))}</p>` : ""}${msgHTML()}
      <p><button type="button" class="btn btn-primary" data-act="go" ${busy ? "disabled" : ""}>${esc(T(full() ? "ev.waitlist.btn" : "rsvp.btn"))}</button></p>`;
  }

  async function reloadRegs() { if (isSite && ev.registration) { try { regs = await data.loadRegistrations(ev.id); } catch (e) { regs = []; } } }
  async function signUpForSpot() {
    const status = full() ? "waitlist" : member ? "confirmed" : "pending";
    let r = await data.register(ev.id, status);
    if (!r.ok && status === "confirmed") r = await data.register(ev.id, "pending");   // the profile isn't finished yet: an organizer confirms
    return r;
  }
  async function act(fn) { busy = true; msg = null; drawReg(); try { await fn(); } finally { busy = false; await reloadRegs(); drawPage(); } }

  $("register").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    if (b.dataset.act === "go") await act(async () => { const r = await signUpForSpot(); if (!r.ok) msg = { text: T(r.code || "err.generic") }; });
    if (b.dataset.act === "cancel") await act(async () => { const r = await data.register(ev.id, "cancelled"); msg = r.ok ? { ok: true, text: T("ev.cancelled") } : { text: T(r.code || "err.generic") }; });
    const h = $("regH"); if (h) $("register").focus();
  });
  $("register").addEventListener("submit", async (e) => {
    if (!e.target.closest(".ev-join")) return;
    e.preventDefault();
    const f = { name: $("jName").value.trim(), phone: $("jPhone").value.trim(), program: $("jProgram").value.trim(), heard: "", interests: [],
      level: (document.querySelector("[name=jLevel]:checked") || {}).value, lang: I18N.lang };
    const bad = !f.name ? ["err.name", "jName"] : !ClubData.validPhone(f.phone) ? ["err.phone", "jPhone"] : !f.level ? ["err.level"] : !$("jConsent").checked ? ["err.consent"] : null;
    if (bad) { msg = { text: T(bad[0]) }; drawReg(); if (bad[1]) $(bad[1]).focus(); return; }
    await act(async () => {
      const a = await data.apply(f);
      if (!a.ok) { msg = { text: a.message || T("err.generic") }; return; }
      hasReq = true;
      const r = await signUpForSpot(); if (!r.ok) msg = { text: T(r.code || "err.generic") };
    });
  });
  document.addEventListener("click", async (e) => {
    if (!e.target.closest("#copyLink")) return;
    try { await navigator.clipboard.writeText(location.origin + eventHref(ev)); e.target.textContent = T("ev.copied"); setTimeout(() => (e.target.textContent = T("ev.copy")), 2000); } catch (x) {}
  });

  /* ---------- organizers: who registered ---------- */
  let people = {}, orgFilter = "all";
  const stLabel = (s) => T("ev.os." + s);
  async function loadPeople() { const ids = regs.map(r => r.uid).filter(u => !people[u]); if (ids.length) Object.assign(people, await data.whoAre(ids)); }
  function drawOrg() {
    const box = $("evOrg");
    if (!isOrg || !isSite) { box.hidden = true; return; }
    box.hidden = false;
    const n = (s) => regs.filter(r => r.status === s).length;
    const list = regs.filter(r => orgFilter === "all" ? r.status !== "cancelled" : r.status === orgFilter).sort((a, b) => a.at - b.at);
    const wa = (p) => (p.phone ? `https://wa.me/${p.phone.replace(/[^0-9]/g, "")}` : "");
    box.innerHTML = `<div class="ev-org-head"><h2 id="orgH">${esc(T("ev.org.h"))}</h2>
        <div class="ev-org-tools"><a class="btn btn-ghost" href="/event-edit?id=${encodeURIComponent(ev.id)}">${esc(T("ev.edit"))}</a>
        ${ev.registration && regs.length ? `<button type="button" class="btn btn-ghost" data-org="csv">${esc(T("ev.csv"))}</button>` : ""}
        ${n("pending") ? `<button type="button" class="btn btn-primary" data-org="all">${esc(T("ev.confirmall", { n: n("pending") }))}</button>` : ""}</div></div>
      ${ev.registration ? `<div class="s-tabs" role="group" aria-label="${esc(T("ev.org.h"))}">${["all", "pending", "confirmed", "waitlist", "cancelled"].map(s =>
          `<button type="button" class="s-tab" data-of="${s}" aria-pressed="${orgFilter === s}">${esc(s === "all" ? T("ev.os.all") : stLabel(s))} <small>${s === "all" ? regs.filter(r => r.status !== "cancelled").length : n(s)}</small></button>`).join("")}</div>
      ${list.length ? `<ul class="ev-people">${list.map(r => { const p = people[r.uid] || {};
        return `<li><div><b>${esc(p.name || "…")}</b>${p.member ? "" : ` <span class="chip chip-planned">${esc(T("ev.newacc"))}</span>`}<small>${esc(p.email || "")}${p.phone ? " · " + esc(p.phone) : ""}</small></div>
          <span class="chip st-chip st-${esc(r.status)}">${esc(stLabel(r.status))}</span>
          <div class="ev-row-act">${r.status !== "confirmed" ? `<button type="button" class="btn btn-primary" data-org="ok" data-reg="${esc(r.id)}">${esc(T("ev.confirm"))}</button>` : ""}
            ${r.status !== "waitlist" && r.status !== "cancelled" ? `<button type="button" class="link-btn" data-org="wait" data-reg="${esc(r.id)}">${esc(T("ev.towait"))}</button>` : ""}
            ${r.status !== "cancelled" ? `<button type="button" class="link-btn" data-org="drop" data-reg="${esc(r.id)}">${esc(T("ev.drop"))}</button>` : ""}
            ${wa(p) ? `<a class="link-btn" href="${esc(wa(p))}" target="_blank" rel="noopener">WhatsApp ↗</a>` : ""}</div></li>`; }).join("")}</ul>`
        : `<p class="help">${esc(T("ev.org.none"))}</p>`}` : `<p class="help">${esc(T("ev.org.noreg"))}</p>`}`;
  }
  $("evOrg").addEventListener("click", async (e) => {
    const of = e.target.closest("[data-of]"); if (of) { orgFilter = of.dataset.of; drawOrg(); return; }
    const b = e.target.closest("[data-org]"); if (!b) return;
    const k = b.dataset.org;
    if (k === "csv") {
      const rows = [["name", "email", "phone", "status", "registered"]].concat(regs.map(r => { const p = people[r.uid] || {}; return [p.name || "", p.email || "", p.phone || "", r.status, r.at ? new Date(r.at).toISOString() : ""]; }));
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })); a.download = `registrations-${ev.date}.csv`; document.body.appendChild(a); a.click(); a.remove();
      return;
    }
    b.disabled = true;
    const targets = k === "all" ? regs.filter(r => r.status === "pending") : [regs.find(r => r.id === b.dataset.reg)];
    const to = k === "ok" || k === "all" ? "confirmed" : k === "wait" ? "waitlist" : "cancelled";
    for (const r of targets) await data.setRegistration(r, to);
    await reloadRegs(); await loadPeople(); drawPage();
  });

  addEventListener("langchange", drawPage);
  drawPage();
  if (dataErr) return;

  /* ---------- who is looking ---------- */
  data.onAuth(async (u) => {
    me = u; member = false; hasReq = false; refused = false; isOrg = false; msg = null;
    if (u) {
      try {
        if (data.accountRefused) refused = await data.accountRefused();
        const req = await data.requestStatus(); hasReq = !!(req && req.phone);
        if (u.verified) {
          member = await data.onRoster();
          const p = member ? await data.getProfile(u.uid) : null;
          isOrg = !!(p && (p.role === "organizer" || (data.mode === "demo" && q.has("elder"))));
        }
      } catch (e) { /* not in the club yet */ }
    }
    await reloadRegs();
    if (isOrg) await loadPeople();
    drawPage();
    if (location.hash === "#register" && !$("register").hidden) { $("register").scrollIntoView({ block: "start" }); $("register").focus({ preventScroll: true }); }
  });
})();
