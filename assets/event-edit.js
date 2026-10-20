/* Organizers: create or edit an event (/event-edit, /event-edit?id=…). Saved to Firestore "events"; shows on the schedule when published. */
(async () => {
  const $ = (id) => document.getElementById(id), T = (k, v) => I18N.t(k, v);
  const show = (id) => ["eeLoading", "eeSignin", "eeNo", "eeForm"].forEach(g => $(g).hidden = g !== id);
  // ?d=… edits a session from schedule.js (its key: the date, or its own key when two share a day); ?id=… an event made on the site
  const qs = new URLSearchParams(location.search), fileSession = qs.get("d") ? findFileSession(qs.get("d")) : null;
  const fileDate = fileSession ? fileKey(fileSession) : null;
  const editId = fileDate ? "d-" + fileDate : qs.get("id");
  let hasSaved = false;
  $("yr").textContent = new Date().getFullYear();

  const data = ClubData.create();
  try { await data.init(); } catch (e) { $("eeLoading").textContent = T("m.dberror", { e: e.code || e.message || "?" }); return; }
  const siBox = ClubSignIn.mount($("siBox"), data);
  let ev = null, msg = null, busy = false, confirmDelete = false;

  const blank = () => ({ title: "", title_fr: "", date: "", time: CLUB.defaultTime, time_fr: "13 h – 14 h", room: CLUB.defaultRoom, type: "", type_fr: "",
    format: "workshop", level: "all", lang: "en", track: "event", description: "", description_fr: "", details: "", details_fr: "",
    speaker: "", link: "", linkText: "", registration: true, capacity: 0, deadline: "", published: true, autoConfirm: true });

  const opt = (v, label, cur) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(label)}</option>`;
  const fld = (id, label, val, attrs = "", help = "") => `<div class="field"><label for="${id}">${esc(T(label))}</label>
      <input class="input" id="${id}" value="${esc(val)}" ${attrs}>${help ? `<p class="help">${esc(T(help))}</p>` : ""}</div>`;
  const area = (id, label, val, max, rows, help = "") => `<div class="field"><label for="${id}">${esc(T(label))}</label>
      <textarea class="textarea" id="${id}" maxlength="${max}" rows="${rows}">${esc(val)}</textarea>${help ? `<p class="help">${esc(T(help))}</p>` : ""}</div>`;

  function draw() {
    const e = ev;
    $("eeH").innerHTML = T(editId ? "ee.h1.edit" : "ee.h1.new");
    $("eeForm").innerHTML = `
      <fieldset class="ee-sec"><legend>${esc(T("ee.sec.what"))}</legend>
        <div class="ee-two">${fld("title", "ee.title.en", e.title, 'maxlength="120" required')}${fld("title_fr", "ee.title.fr", e.title_fr, 'maxlength="120"')}</div>
        <div class="ee-two">${fld("type", "ee.type.en", e.type, 'maxlength="60"', "ee.type.help")}${fld("type_fr", "ee.type.fr", e.type_fr, 'maxlength="60"')}</div>
        <div class="ee-three">
          <div class="field"><label for="format">${esc(T("ee.format"))}</label><select class="select" id="format">${ClubData.EVENT_FORMATS.map(f => opt(f, T("fmt." + f), e.format)).join("")}</select></div>
          <div class="field"><label for="level">${esc(T("ee.level"))}</label><select class="select" id="level">${["all", "beginner", "intermediate", "advanced"].map(l => opt(l, T("level." + l), e.level)).join("")}</select></div>
          <div class="field"><label for="lang">${esc(T("ee.lang"))}</label><select class="select" id="lang">${["en", "fr", "both"].map(l => opt(l, T("lang.in." + l), e.lang)).join("")}</select></div>
        </div>
        <div class="field"><label for="track">${esc(T("ee.track"))}</label><select class="select" id="track">${["tech", "gdg", "event"].map(t => opt(t, T("ee.track." + t), e.track)).join("")}</select></div>
      </fieldset>
      <fieldset class="ee-sec"><legend>${esc(T("ee.sec.when"))}</legend>
        <div class="ee-three">
          ${fld("date", "ee.date", e.date, 'type="date" required')}
          ${fld("time", "ee.time.en", e.time, 'maxlength="60"', "ee.time.help")}
          ${fld("time_fr", "ee.time.fr", e.time_fr, 'maxlength="60"')}
        </div>
        ${fld("room", "ee.room", e.room, 'maxlength="100"')}
      </fieldset>
      <fieldset class="ee-sec"><legend>${esc(T("ee.sec.text"))}</legend>
        <div class="ee-two">${area("description", "ee.desc.en", e.description, 300, 3, "ee.desc.help")}${area("description_fr", "ee.desc.fr", e.description_fr, 300, 3)}</div>
        <div class="ee-two">${area("details", "ee.details.en", e.details, 5000, 10, "ee.details.help")}${area("details_fr", "ee.details.fr", e.details_fr, 5000, 10)}</div>
        <div class="ee-two">${fld("speaker", "ee.speaker", e.speaker, 'maxlength="120"')}<div></div></div>
        <div class="ee-two">${fld("link", "ee.link", e.link, 'type="url" maxlength="500" placeholder="https://…"', "ee.link.help")}${fld("linkText", "ee.linktext", e.linkText, 'maxlength="40"')}</div>
      </fieldset>
      <fieldset class="ee-sec"><legend>${esc(T("ee.sec.reg"))}</legend>
        <label class="check"><input type="checkbox" id="registration"${e.registration ? " checked" : ""}><span>${esc(T("ee.reg"))}</span></label>
        <div class="ee-two" id="regOpts"${e.registration ? "" : " hidden"}>
          ${fld("capacity", "ee.capacity", e.capacity || "", 'type="number" min="0" max="1000" inputmode="numeric"', "ee.capacity.help")}
          ${fld("deadline", "ee.deadline", e.deadline, 'type="date"', "ee.deadline.help")}
        </div>
        <label class="check"><input type="checkbox" id="autoConfirm"${e.autoConfirm !== false ? " checked" : ""}><span>${esc(T("ee.auto"))}</span></label>
        <p class="help">${esc(T("ee.auto.help"))}</p>
        <p class="help">${esc(T("ee.reg.help"))}</p>
      </fieldset>
      <fieldset class="ee-sec"${editId ? " hidden" : ""}><legend>${esc(T("ee.sec.pub"))}</legend>
        <label class="check"><input type="checkbox" id="published"${e.published ? " checked" : ""}><span>${esc(T("ee.published"))}</span></label>
      </fieldset>
      ${msg ? `<p class="notice ${msg.ok ? "ok" : "bad"} form-msg" role="${msg.ok ? "status" : "alert"}">${msg.html || esc(msg.text)}</p>` : ""}
      <div class="ee-actions">
        <button class="btn btn-primary" type="submit" ${busy ? "disabled aria-busy=\"true\"" : ""}>${esc(T(editId ? "ee.save" : "ee.create"))}</button>
        ${editId ? `<a class="btn btn-ghost" href="${fileDate ? "/event?d=" + encodeURIComponent(fileDate) : "/event?id=" + encodeURIComponent(editId)}">${esc(T("ee.view"))}</a>` : ""}
        ${fileDate && hasSaved ? `<button type="button" class="link-btn danger" id="del" ${busy ? "disabled aria-busy=\"true\"" : ""}>${esc(T(confirmDelete ? "ee.del.sure" : "ee.reset"))}</button>` : ""}
      </div>`;
  }
  const read = () => {
    const v = (id) => $(id).value;
    return { id: editId || undefined, title: v("title"), title_fr: v("title_fr"), type: v("type"), type_fr: v("type_fr"), format: v("format"), level: v("level"), lang: v("lang"), track: v("track"),
      date: v("date"), time: v("time"), time_fr: v("time_fr"), room: v("room"), description: v("description"), description_fr: v("description_fr"),
      details: v("details"), details_fr: v("details_fr"), speaker: v("speaker"), link: v("link"), linkText: v("linkText"),
      registration: $("registration").checked, capacity: v("capacity"), deadline: v("deadline"), autoConfirm: $("autoConfirm").checked,
      // visibility and status are managed from the event's Manage menu; editing details keeps them as they are
      published: editId ? (fileDate ? true : !!ev.published) : $("published").checked, cancelled: !!ev.cancelled, hidden: !!ev.hidden, deleted: !!ev.deleted };
  };

  $("eeForm").addEventListener("change", (e) => { if (e.target.id === "registration") $("regOpts").hidden = !e.target.checked; });
  $("eeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = read(); ev = { ...ev, ...f };
    const bad = !f.title.trim() ? ["ee.err.title", "title"] : !/^\d{4}-\d{2}-\d{2}$/.test(f.date) ? ["ee.err.date", "date"]
      : f.link.trim() && !/^https:\/\/\S+$/.test(f.link.trim()) ? ["ee.err.link", "link"] : null;
    if (bad) { msg = { text: T(bad[0]) }; draw(); $(bad[1]).focus(); return; }
    busy = true; msg = null; draw();
    const r = await data.saveEvent(f);
    busy = false;
    if (!r.ok) { msg = { text: T(r.code || "err.generic") + (r.detail ? ` (${r.detail})` : "") }; draw(); return; }
    location.href = fileDate ? "/event?d=" + encodeURIComponent(fileDate) : "/event?id=" + encodeURIComponent(r.id);
  });
  $("eeForm").addEventListener("click", async (e) => {
    if (!e.target.closest("#del")) return;
    if (!confirmDelete) { ev = { ...ev, ...read() }; confirmDelete = true; draw(); $("del").focus(); return; }
    busy = true; draw();
    const r = await data.deleteEvent(editId);
    if (r.ok) location.href = fileDate ? "/event?d=" + encodeURIComponent(fileDate) : "/schedule"; else { busy = false; msg = { text: T(r.code || "err.generic") }; draw(); }
  });
  addEventListener("langchange", () => { if (!$("eeForm").hidden) { ev = { ...ev, ...read() }; draw(); } });

  data.onAuth(async (u) => {
    try {
      if (!u) { show("eeSignin"); siBox.signin(data.linkError); return; }
      if (!u.verified) { show("eeSignin"); siBox.verify(u.email); return; }
      if (!(await data.onRoster())) { show("eeNo"); return; }
      const p = await data.getProfile(u.uid);
      const isOrg = p && (p.role === "organizer" || (data.mode === "demo" && new URLSearchParams(location.search).has("elder")) || data.mode === "demo");
      if (!isOrg) { show("eeNo"); return; }
      if (editId) {
        const x = await data.getEvent(editId); hasSaved = !!x;
        // a session from schedule.js: start from the file's version (or the version saved earlier)
        const base = fileSession ? { ...blank(), ...Object.fromEntries(Object.entries(fileSession).filter(([k]) => k in blank())), registration: !!fileSession.registration, published: true } : null;
        if (!x && !base) { show("eeNo"); $("eeNo").querySelector("p").textContent = T("ev.notfound"); return; }
        ev = { ...(base || blank()), ...(x || {}) };
      } else ev = blank();
      draw(); show("eeForm");
    } catch (e) { console.error(e); show("eeLoading"); $("eeLoading").textContent = T("m.dberror", { e: e.code || e.message || "?" }); }
  });
})();
