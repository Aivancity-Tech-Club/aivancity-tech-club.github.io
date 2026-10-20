/* Everything about sessions except the list itself (that lives in schedule.js, which must load first):
   rendering the cards, filters, calendar files, events made on the site, and the details side panel.
   Nobody needs to edit this file to add or change a session. */
const ASSET_V = (document.currentScript && document.currentScript.src.split("?")[1]) || "";

const L = (k, v) => (window.I18N ? I18N.t(k, v) : k);
const F = (s, field) => (window.I18N ? I18N.pick(s, field) : s[field]);
const LOC = () => (window.I18N ? I18N.locale() : "en-GB");

function parseDate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function today0() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
/* Events organizers create on the site (Firestore "events") are added to SESSIONS once loaded (see loadSiteEvents). */
let SITE_EVENTS = [], EVENTS_READY = false;
// what we saw last time shows straight away; the fresh list replaces it a moment later
try { const c = JSON.parse(localStorage.getItem("tc-events-v1") || "null"); if (c && Array.isArray(c.events)) { SITE_EVENTS = c.events; EVENTS_READY = true; } } catch (e) {}
/* loading placeholder (first visit only): the same shapes as the session cards, with a soft shimmer */
function skeletonHTML(n) {
  const card = `<div class="sk-session" aria-hidden="true"><span class="skx sk-date"></span><div><span class="skx sk-chips"></span><span class="skx sk-h"></span><span class="skx sk-l"></span><span class="skx sk-l short"></span></div></div>`;
  return `<div class="sched-skel" role="status" aria-busy="true"><span class="sr-only">${esc(L("ev.loading"))}</span>${card.repeat(n)}</div>`;
}
/* Everything on the schedule: the file's sessions (with organizers' edits applied, "d-YYYY-MM-DD") plus events made on the site.
   Hidden and deleted ones are left out; cancelled ones stay, marked Cancelled. */
const offSite = (e) => e.hidden || e.deleted || e.published === false;
/* Sessions in this file are identified by their date. Two sessions on the same day? Give the second one its own
   `key`, for example key: "2026-11-05-evening". Events made on the site always have their own id. */
const fileKey = (s) => s.key || s.date;
const findFileSession = (k) => SESSIONS.find(s => fileKey(s) === k && s.track !== "break") || null;
const FILE_ID = /^d-\d{4}-\d{2}-\d{2}(-[a-z0-9-]{1,40})?$/;   // an organizer's saved version of a file session
(function checkKeys() {
  const seen = new Set();
  for (const s of SESSIONS) { const k = fileKey(s); if (seen.has(k)) console.warn(`schedule.js: two sessions share "${k}". Add a unique key to one of them.`); seen.add(k); }
})();
function allSessions() {
  const over = Object.fromEntries(SITE_EVENTS.filter(e => FILE_ID.test(e.id || "")).map(e => [e.id.slice(2), e]));
  const fromFile = SESSIONS.map(s => (over[fileKey(s)] && s.track !== "break" ? { ...s, ...over[fileKey(s)] } : s));
  const madeOnSite = SITE_EVENTS.filter(e => !(FILE_ID.test(e.id || "") && SESSIONS.some(s => fileKey(s) === e.id.slice(2))));
  return fromFile.concat(madeOnSite).filter(s => !offSite(s));
}
const sessionKey = (s) => (s.id ? "ev:" + s.id : fileKey(s));
const regKey = (s) => s.id || "d-" + fileKey(s);
const eventHref = (s) => (s.id ? "/event?id=" + encodeURIComponent(s.id) : "/event?d=" + encodeURIComponent(fileKey(s)));
function sorted() { return allSessions().filter(s => s.date).map(s => ({ ...s, _d: parseDate(s.date) })).sort((a, b) => a._d - b._d); }
/* One "I'm going" for every session (registrations). Visitors: it opens the session at the sign-up step.
   Members: one tap here (filled in by fillLive). Who else is going, and how many, only organizers see. */
function regOpen(s) { const t = today0(); return s.track !== "break" && s._d >= t && (!s.deadline || parseDate(s.deadline) >= t); }
function regHTML(s) {
  return `<p class="reg-row" data-going-row="${esc(regKey(s))}"><a class="btn btn-primary" data-reg-open href="${esc(eventHref(s))}#register">${esc(L("rsvp.btn"))}</a></p>`;
}
// what a member's "I'm going" asks for: confirmed straight away, unless places are limited (then an organizer confirms)
const goingStatus = (s) => (s && s.capacity ? "pending" : "confirmed");
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function sessionHTML(s, { next = false, past = false } = {}) {
  const d = s._d, loc = LOC();
  const day = d.toLocaleDateString(loc, { day: "2-digit" });
  const mon = d.toLocaleDateString(loc, { month: "short" }).replace(".", "");
  const wk = d.toLocaleDateString(loc, { weekday: "long" });
  const title = F(s, "title"), desc = F(s, "description");
  if (s.track === "break") {
    return `<div class="break-row"><span class="mono">${esc(day)} ${esc(mon)}</span><b>${esc(title)}</b><span>${esc(desc)}</span></div>`;
  }
  const chips = [
    `<span class="chip">${esc(F(s, "type") || L("track." + s.track) || L("sched.session"))}</span>`,
    s.track === "gdg" ? `<span class="chip">GDG on Campus</span>` : "",
    s.lang ? `<span class="chip chip-lang">${esc(langLabel(s))}</span>` : "",
    s.level ? `<span class="chip chip-level lv-${esc(s.level)}">${esc(L("level." + s.level))}</span>` : "",
    next ? `<span class="chip chip-next">${L("sched.next")}</span>` : "",
    past ? `<span class="chip chip-done">${L("sched.done")}</span>` : "",
    !past && s.planned && !s.cancelled ? `<span class="chip chip-planned">${L("sched.planned")}</span>` : "",
    s.cancelled ? `<span class="chip chip-cancelled">${L("ev.cancelled.chip")}</span>` : "",
  ].join("");
  const open = !past && !s.cancelled;   // a cancelled session keeps its card but takes no sign-ups
  const Wk = wk.charAt(0).toUpperCase() + wk.slice(1);
  return `
    <article class="session track-${s.track}${next ? " is-next" : ""}${past ? " is-past" : ""}${s.cancelled ? " is-cancelled" : ""}" data-key="${esc(sessionKey(s))}">
      <div class="session-date" aria-label="${esc(wk)} ${esc(day)} ${esc(mon)}">
        <span class="d">${esc(day)}</span><span class="m">${esc(mon)}</span>
      </div>
      <div class="session-body">
        <div class="session-meta">${chips}</div>
        <h3><a class="session-title" href="${esc(eventHref(s))}">${esc(title)}</a></h3>
        ${desc ? `<p>${esc(desc)}</p>` : ""}
        ${s.speaker ? `<p class="speaker">${esc(s.speaker)}</p>` : ""}
        <p class="where">${esc(Wk)} · ${esc(F(s, "time") || L("sched.time"))} · ${esc(F(s, "room") || L("sched.room"))}</p>
        ${!past && s.vote && s.vote.options ? `<div class="poll" data-poll="${esc(fileKey(s))}" hidden></div>` : ""}
        ${past && s.recap ? recapHTML(s) : ""}
        ${open && regOpen(s) ? regHTML(s) : ""}
        ${!past || s.link ? `<p class="session-actions">` : ""}${!past && s.link ? `<a class="btn btn-primary session-cta" href="${esc(s.link)}" target="_blank" rel="noopener">${esc(F(s, "linkText") || L("sched.more"))} ↗</a>` : ""}${open ? `<button type="button" class="cal-btn" data-ics="${esc(sessionKey(s))}">${esc(L("sched.cal.one"))}</button>` : ""}${!past || s.link ? "</p>" : ""}
      </div>
    </article>`;
}

/* "In English", "In French · English subtitles", "English & French" */
function langLabel(s) {
  const main = L("lang.in." + s.lang);
  return s.subs && s.subs !== s.lang && s.lang !== "both" ? L("lang.subs", { lang: main, subs: L("lang.sub." + s.subs) }) : main;
}

function recapHTML(s) {
  const r = s.recap || {}, task = F(r, "task");
  if (!r.link && !task) return "";
  return `<div class="recap"><b>${esc(L("sched.recap.h"))}</b>
    ${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(F(r, "linkText") || L("sched.recap.link"))} ↗</a>` : ""}
    ${task ? `<p><span>${esc(L("sched.recap.task"))}</span> ${esc(task)}</p>` : ""}</div>`;
}

/* ---------- members only: one-tap "I'm going" and votes (filled in once live.js has loaded the platform) ---------- */
function fillLive(root) {
  const X = window.CLUB_LIVE; if (!X || !root) return;
  root.querySelectorAll("[data-going-row]").forEach(row => {
    const key = row.dataset.goingRow, r = X.regs.find(x => x.event === key), st = r && r.status !== "cancelled" ? r.status : "";
    const note = st === "pending" ? L("rsvp.pending") : st === "waitlist" ? L("rsvp.waitlist") : st ? L("rsvp.undo") : "";
    // same look as the visitors' button it replaces (no flash from blue to white while the page finishes loading)
    row.innerHTML = `<button type="button" class="btn ${st ? "rsvp-on" : "btn-primary"}" data-going="${esc(key)}" aria-pressed="${!!st}">${esc(L(st === "confirmed" ? "rsvp.yes" : st ? "rsvp.asked" : "rsvp.btn"))}</button>`
      + (note ? `<span class="rsvp-line">${esc(note)}</span>` : "");
  });
  root.querySelectorAll("[data-poll]").forEach(box => {
    const s = findFileSession(box.dataset.poll); if (!s || !s.vote) return;
    const votes = X.votes.filter(v => v.date === fileKey(s)), mine = (votes.find(v => v.uid === X.uid) || {}).choice;
    const total = votes.length;
    box.hidden = false;
    box.innerHTML = `<p class="poll-q">${esc(F(s.vote, "question") || L("poll.q"))}</p>
      <div class="poll-opts" role="group" aria-label="${esc(F(s.vote, "question") || L("poll.q"))}">${s.vote.options.map(o => {
        const n = votes.filter(v => v.choice === o.id).length, pct = total ? Math.round(n * 100 / total) : 0;
        return `<button type="button" class="poll-opt" data-vote="${esc(fileKey(s))}" data-choice="${esc(o.id)}" aria-pressed="${mine === o.id}">
          ${mine ? `<i class="poll-bar" style="width:${pct}%"></i>` : ""}<span>${esc(F(o, "title"))}</span>${mine ? `<small>${pct}%</small>` : ""}</button>`;
      }).join("")}</div>
      <p class="poll-meta">${esc(mine ? L(total === 1 ? "poll.voted1" : "poll.voted", { n: total }) : L("poll.hint"))}</p>`;
  });
}
addEventListener("club:live", () => document.querySelectorAll("#season, #upcoming-list").forEach(fillLive));
document.addEventListener("click", async (e) => {
  const X = window.CLUB_LIVE; if (!X) return;
  const g = e.target.closest("[data-going]"), v = e.target.closest("[data-vote]");
  if (g) {
    const key = g.dataset.going, on = g.getAttribute("aria-pressed") !== "true", before = X.regs.slice();
    const s = allSessions().find(x => regKey(x) === key), status = on ? goingStatus(s) : "cancelled";
    X.regs = X.regs.filter(r => r.event !== key).concat({ event: key, uid: X.uid, status });
    const row = g.closest("[data-going-row]"), redraw = () => { fillLive(row.parentElement); const b = row.querySelector("[data-going]"); if (b) b.focus(); };
    redraw();
    let r = await X.data.register(key, status);
    if (!r.ok && status === "confirmed") { r = await X.data.register(key, "pending"); if (r.ok) { X.regs = X.regs.map(x => (x.event === key ? { ...x, status: "pending" } : x)); redraw(); } }
    if (!r.ok) { X.regs = before; redraw(); }
  }
  if (v) {
    const date = v.dataset.vote, choice = v.dataset.choice, before = X.votes.slice();
    X.votes = X.votes.filter(x => !(x.date === date && x.uid === X.uid)); X.votes.push({ date, uid: X.uid, choice });
    const box = v.closest("[data-poll]"); fillLive(box.parentElement);
    const again = box.querySelector(`[data-choice="${choice}"]`); if (again) again.focus();
    const r = await X.data.vote(date, choice); if (!r.ok) { X.votes = before; fillLive(box.parentElement); }
  }
});

/* Home page: the next few sessions (breaks included so nobody turns up to an empty room). */
function renderSchedule(el, { limit = 3 } = {}) {
  if (!el) return;
  if (!EVENTS_READY) { el.innerHTML = skeletonHTML(limit); return; }
  const t = today0();
  const up = sorted().filter(s => s._d >= t).slice(0, limit);
  const firstReal = up.find(s => s.track !== "break" && !s.cancelled);
  el.innerHTML = up.length
    ? up.map(s => sessionHTML(s, { next: s === firstReal })).join("")
    : `<p class="empty">${L("sched.empty")}</p>`;
  fillLive(el);
}

/* Home page: what we did recently, so visitors can see the club is active. */
function renderRecent(el, { limit = 3 } = {}) {
  if (!el) return;
  if (!EVENTS_READY) { const w = el.closest("[data-hide-empty]"); if (w) w.hidden = true; return; }
  const t = today0();
  const past = sorted().filter(s => s._d < t && s.track !== "break").reverse().slice(0, limit);
  el.innerHTML = past.map(s => sessionHTML(s, { past: true })).join("");
  const wrap = el.closest("[data-hide-empty]"); if (wrap) wrap.hidden = !past.length;
}

/* ---------- calendar files (.ics) ----------
   One session, or every upcoming one. Times are Paris time; calendars convert for the reader.
   Planned sessions are marked tentative. Importing the file again updates the same events (stable UIDs). */
const SITE = "https://aivancity-tech-club.github.io";
function icsTimes(s) {
  const m = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(s.time || CLUB.defaultTime);
  if (!m) return null;                                   // e.g. "Friday event": all day
  const h24 = (h) => (+h % 12) + (/pm/i.test(m[5]) ? 12 : 0);
  const p2 = (n) => String(n).padStart(2, "0"), ymd = s.date.replace(/-/g, "");
  return { start: `${ymd}T${p2(h24(m[1]))}${m[2]}00`, end: `${ymd}T${p2(h24(m[3]))}${m[4]}00` };
}
function icsEscape(t) { return String(t || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1"); }
function icsFold(line) {                                 // lines longer than 75 octets are folded
  const out = []; let cur = "";
  for (const ch of line) { if (new TextEncoder().encode(cur + ch).length > 74) { out.push(cur); cur = " " + ch; } else cur += ch; }
  return out.concat(cur).join("\r\n");
}
function icsEvent(s, stamp) {
  const t = icsTimes(s), title = F(s, "title"), room = F(s, "room") || L("sched.room");
  const desc = [F(s, "description"), s.lang ? langLabel(s) : "", s.planned ? L("sched.cal.planned") : "", s.link ? s.link : "", SITE + eventHref(s)].filter(Boolean).join("\n\n");
  const next = (d) => { const x = parseDate(d); x.setDate(x.getDate() + 1); return x.getFullYear() + String(x.getMonth() + 1).padStart(2, "0") + String(x.getDate()).padStart(2, "0"); };
  return [
    "BEGIN:VEVENT",
    `UID:${s.id ? "ev-" + s.id : fileKey(s) + "-" + (s.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}@aivancity-tech-club.github.io`,
    `DTSTAMP:${stamp}`,
    t ? `DTSTART;TZID=Europe/Paris:${t.start}` : `DTSTART;VALUE=DATE:${s.date.replace(/-/g, "")}`,
    t ? `DTEND;TZID=Europe/Paris:${t.end}` : `DTEND;VALUE=DATE:${next(s.date)}`,
    `SUMMARY:${icsEscape(title)}`,
    `LOCATION:${icsEscape(room)}`,
    `DESCRIPTION:${icsEscape(desc)}`,
    `URL:${SITE}${eventHref(s)}`,
    `STATUS:${s.cancelled ? "CANCELLED" : s.planned ? "TENTATIVE" : "CONFIRMED"}`,
    ...(t ? ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(title)}`, "TRIGGER:-PT1H", "END:VALARM"] : []),
    "END:VEVENT",
  ].map(icsFold).join("\r\n");
}
function icsFile(list) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//aivancity Tech Club//Schedule//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:aivancity Tech Club", "X-WR-TIMEZONE:Europe/Paris",
    "BEGIN:VTIMEZONE", "TZID:Europe/Paris",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE",
    ...list.map(s => icsEvent(s, stamp)),
    "END:VCALENDAR", "",
  ].join("\r\n");
}
function downloadICS(list, name) {
  const url = URL.createObjectURL(new Blob([icsFile(list)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const upcomingReal = () => { const t = today0(); return sorted().filter(s => s._d >= t && s.track !== "break" && !s.cancelled); };
// any "Add to calendar" button on any page (home or schedule)
document.addEventListener("click", (e) => {
  const one = e.target.closest("[data-ics]"), all = e.target.closest("[data-ics-all]");
  if (one) { const s = allSessions().find(x => sessionKey(x) === one.dataset.ics && x.track !== "break"); if (s) downloadICS([s], `tech-club-${s.date}.ics`); }
  if (all) downloadICS(upcomingReal(), "aivancity-tech-club.ics");
});

/* Schedule page: Upcoming / Past, plus two small dropdowns (level, type).
   The choice is kept in the address (?when=past&level=beginner&type=workshop), so a filtered view can be shared. */
const FORMATS = ["workshop", "hackathon", "competition", "talk", "trip", "career", "build", "social", "other"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const LANGS = ["en", "fr"];
const FILTER = { when: "upcoming", level: "", type: "", lang: "" };
(function readFilters() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get("when") === "past") FILTER.when = "past";
    if (LEVELS.includes(q.get("level"))) FILTER.level = q.get("level");
    if (FORMATS.includes(q.get("type"))) FILTER.type = q.get("type");
    if (LANGS.includes(q.get("lang"))) FILTER.lang = q.get("lang");
  } catch (e) {}
})();
function writeFilters() {
  try {
    const q = new URLSearchParams();
    if (FILTER.when === "past") q.set("when", "past");
    if (FILTER.level) q.set("level", FILTER.level);
    if (FILTER.type) q.set("type", FILTER.type);
    if (FILTER.lang) q.set("lang", FILTER.lang);
    history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
  } catch (e) {}
}
const matches = (s) => (!FILTER.level || s.level === FILTER.level || s.level === "all") && (!FILTER.type || s.format === FILTER.type)
  && (!FILTER.lang || s.lang === FILTER.lang || s.lang === "both" || s.subs === FILTER.lang);

function renderSeason(el) {
  if (!el) return;
  if (!EVENTS_READY) { el.innerHTML = `<div class="s-bar sk-bar" aria-hidden="true"><span class="skx sk-tabs"></span><span class="skx sk-sel"></span></div>` + skeletonHTML(4); return; }
  const t = today0(), all = sorted(), loc = LOC();
  const firstReal = all.find(s => s._d >= t && s.track !== "break" && !s.cancelled);
  const real = all.filter(s => s.track !== "break");
  const nUp = real.filter(s => s._d >= t).length, nPast = real.filter(s => s._d < t).length;
  const filtering = !!(FILTER.level || FILTER.type || FILTER.lang);
  const past = FILTER.when === "past";
  let list = all.filter(s => (past ? s._d < t : s._d >= t));
  // breaks only make sense in the plain upcoming view (so nobody turns up to an empty room)
  list = list.filter(s => (s.track === "break" ? !past && !filtering : matches(s)));
  if (past) list.reverse();

  const tab = (v, label, n, on) => `<button type="button" class="s-tab" data-when="${v}" aria-pressed="${on}">${esc(label)} <small>${n}</small></button>`;
  const opt = (v, label, cur) => `<option value="${v}"${v === cur ? " selected" : ""}>${esc(label)}</option>`;
  const usedFormats = FORMATS.filter(f => real.some(s => s.format === f));
  const bar = `
    <div class="s-bar">
      <div class="s-tabs" role="group" aria-label="${esc(L("sched.f.when"))}">${tab("upcoming", L("sched.f.upcoming"), nUp, !past)}${tab("past", L("sched.f.past"), nPast, past)}</div>
      <div class="s-selects">
        <label class="s-select${FILTER.level ? " on" : ""}"><span class="sr-only">${esc(L("sched.f.level"))}</span>
          <select data-f="level">${opt("", L("sched.f.alllevels"), FILTER.level)}${LEVELS.map(l => opt(l, L("level." + l), FILTER.level)).join("")}</select></label>
        <label class="s-select${FILTER.type ? " on" : ""}"><span class="sr-only">${esc(L("sched.f.type"))}</span>
          <select data-f="type">${opt("", L("sched.f.alltypes"), FILTER.type)}${usedFormats.map(f => opt(f, L("fmt." + f), FILTER.type)).join("")}</select></label>
        ${real.some(s => s.lang) ? `<label class="s-select${FILTER.lang ? " on" : ""}"><span class="sr-only">${esc(L("sched.f.lang"))}</span>
          <select data-f="lang">${opt("", L("sched.f.alllangs"), FILTER.lang)}${LANGS.map(l => opt(l, L("lang.name." + l), FILTER.lang)).join("")}</select></label>` : ""}
        ${filtering ? `<button type="button" class="s-clear" data-reset>${esc(L("sched.reset"))}</button>` : ""}
      </div>
    </div>`;

  const months = [];
  for (const s of list) {
    let key = s._d.toLocaleDateString(loc, { month: "long", year: "numeric" });
    key = key.charAt(0).toUpperCase() + key.slice(1);
    let m = months.find(x => x.key === key); if (!m) months.push(m = { key, items: [] });
    m.items.push(s);
  }
  const empty = !list.length
    ? `<div class="filter-empty"><p>${esc(L(filtering ? "sched.none" : past ? "sched.nopast" : "sched.empty"))}</p>${filtering ? `<button type="button" class="btn btn-ghost" data-reset>${esc(L("sched.reset"))}</button>` : ""}</div>`
    : "";
  el.innerHTML = bar +
    `<p class="season-count mono" aria-live="polite">${esc(filtering ? L("sched.shown", { n: list.filter(s => s.track !== "break").length }) : L("sched.count", { season: L("sched.season"), done: nPast, left: nUp }))}</p>` +
    empty +
    months.map(m => `
      <section class="month">
        <h2 class="month-head">${esc(m.key)}</h2>
        <div class="session-list">${m.items.map(s => sessionHTML(s, { next: s === firstReal, past: s._d < t })).join("")}</div>
      </section>`).join("");
  fillLive(el);

  if (!el.dataset.wired) {
    el.dataset.wired = "1";
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-when], [data-reset]"); if (!b) return;
      if (b.hasAttribute("data-reset")) { FILTER.level = ""; FILTER.type = ""; FILTER.lang = ""; } else FILTER.when = b.dataset.when;
      writeFilters(); renderSeason(el);
      const again = el.querySelector(b.dataset.when ? `[data-when="${b.dataset.when}"]` : "select"); if (again) again.focus();
    });
    el.addEventListener("change", (e) => {
      const sel = e.target.closest("select[data-f]"); if (!sel) return;
      FILTER[sel.dataset.f] = sel.value; writeFilters(); renderSeason(el);
      const again = el.querySelector(`select[data-f="${sel.dataset.f}"]`); if (again) again.focus();
    });
  }
}

/* ---------- events made on the site ----------
   Read straight from Firestore's public REST endpoint, so visitors don't load the Firebase SDK.
   Pages listen for "club:events" and draw again once they arrive. */
function restValue(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  return null;
}
const restDoc = (d) => { const o = {}; for (const [k, v] of Object.entries(d.fields || {})) o[k] = restValue(v); return o; };
async function loadSiteEvents() {
  const giveUp = setTimeout(() => { if (!EVENTS_READY) { EVENTS_READY = true; dispatchEvent(new CustomEvent("club:events")); } }, 3000);
  try {
    if (!window.CLUB_PLATFORM) await new Promise((res, rej) => { const x = document.createElement("script"); x.src = "/assets/platform/config.js" + (ASSET_V ? "?" + ASSET_V : ""); x.onload = res; x.onerror = rej; document.head.appendChild(x); });
    const C = window.CLUB_PLATFORM || {};
    if (!C.FIREBASE) {                     // demo mode: events created in this browser
      let X = null; try { X = JSON.parse(localStorage.getItem("nw-demo-extra-v1")); } catch (e) {}
      SITE_EVENTS = X && X.events ? X.events.filter(e => e.published && e.date) : [];
    } else {
      const base = `https://firestore.googleapis.com/v1/projects/${C.FIREBASE.projectId}/databases/(default)/documents`, key = "key=" + C.FIREBASE.apiKey;
      const headers = { "Content-Type": "application/json", ...(C.appCheckHeaders ? await C.appCheckHeaders() : {}) };
      const res = await fetch(`${base}:runQuery?${key}`, { method: "POST", headers, body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: "events" }], where: { fieldFilter: { field: { fieldPath: "published" }, op: "EQUAL", value: { booleanValue: true } } } } }) });
      if (!res.ok) throw new Error("events " + res.status);   // keep the last saved list
      const ev = await res.json();
      SITE_EVENTS = (Array.isArray(ev) ? ev : []).filter(x => x.document).map(x => ({ id: x.document.name.split("/").pop(), ...restDoc(x.document) })).filter(e => e.date);
    }
    try { localStorage.setItem("tc-events-v1", JSON.stringify({ events: SITE_EVENTS, at: Date.now() })); } catch (e) {}
  } catch (e) { /* offline or blocked: the schedule from this file (and the last saved events) still shows */ }
  clearTimeout(giveUp); EVENTS_READY = true;
  dispatchEvent(new CustomEvent("club:events"));
}
// only the pages that list sessions need them (home and schedule); the others call loadSiteEvents() when they do
if (document.querySelector("#season, #upcoming-list")) loadSiteEvents();

/* ---------- the details side panel (schedule and home page) ----------
   Clicking a card opens it; "I'm going" opens it at the registration step. The panel's code loads on first use. */
let panelLoading = null;
function loadPanel() {
  if (window.ClubEvent) return Promise.resolve();
  if (!panelLoading) {
    const js = (src) => new Promise((res, rej) => { const x = document.createElement("script"); x.src = src + (ASSET_V ? "?" + ASSET_V : ""); x.onload = res; x.onerror = rej; document.head.appendChild(x); });
    if (!document.querySelector('link[href*="event.css"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/assets/event.css" + (ASSET_V ? "?" + ASSET_V : ""); document.head.appendChild(l); }
    panelLoading = (async () => {
      if (!window.CLUB_PLATFORM) await js("/assets/platform/config.js");
      if (!window.ClubSignIn) await js("/assets/platform/signin.js");
      if (!window.ClubData) await js("/assets/platform/data.js");
      await js("/assets/event.js");
    })();
  }
  return panelLoading;
}
async function openSession(s, register) {
  if (!s) return;
  try { await loadPanel(); ClubEvent.open(s, { register }); } catch (e) { location.href = eventHref(s) + (register ? "#register" : ""); }
}
document.addEventListener("click", (e) => {
  const card = e.target.closest("article.session[data-key]"); if (!card || !document.querySelector("#season, #upcoming-list")) return;
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const going = e.target.closest("[data-reg-open]"), title = e.target.closest("a.session-title");
  if (!going && !title && e.target.closest("a, button, input, select, textarea, label, summary")) return;   // its own buttons keep working
  if (!going && !title && getSelection && String(getSelection()).length) return;                         // selecting text isn't a click
  e.preventDefault();
  openSession(allSessions().find(x => sessionKey(x) === card.dataset.key), !!going);
});
// a shared /schedule?event=… or ?d=… link opens that session's panel
(function deepLink() {
  try {
    const p = new URLSearchParams(location.search), id = p.get("event"), d = p.get("d");
    if (!(id || d) || !document.querySelector("#season, #upcoming-list")) return;
    const s = id ? { id } : findFileSession(d); if (s) openSession(s, location.hash === "#register");
  } catch (e) {}
})();
