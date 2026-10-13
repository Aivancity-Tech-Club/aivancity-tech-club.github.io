/* ============================================================
   CLUB SCHEDULE: edit this list to update the website.

   Each entry:
     date        "YYYY-MM-DD"
     title       what the session is called
     type        short label shown as a chip (Workshop, Hackathon…)
     track       "tech" | "gdg" | "event" | "break"   (sets the colour)
     description one or two sentences, written for students
     planned     true = the plan may still change (shown as "Planned")
     time / room override the defaults below when needed
     link, linkText  optional button, e.g. a sign-up form (hidden once the session is past)
     format      workshop | hackathon | competition | talk | trip | career | build   (the Type filter)
     level       beginner | intermediate | advanced | all   ("all" shows under every level)
     *_fr        French version of title, type, description, time (shown when the site is in French)
     lang        the language the session is given in: "en" | "fr" | "both"   (shown as a tag, and the Language filter)
     subs        optional support in the other language, e.g. "fr" = French slides/subtitles for an English talk
     recap       after the session, so people who missed it can catch up:
                 { link: "https://… notes or slides", task: "a 15-minute take-home task", task_fr: "…" }
     vote        for a Planned session, members choose what it will be (one vote each, can change it):
                 { question: "What should this session be?", question_fr: "…",
                   options: [{ id: "trivia", title: "Trivia Night", title_fr: "…" }, { id: "algo", title: "Algorithms" }] }

   Past sessions stay on the site automatically, so people can see
   what the club has already done.

   Regular meetings: every Thursday, 1:00–2:00 PM, AIClinic – Room 107.
   ============================================================ */

const CLUB = {
  defaultTime: "1:00 – 2:00 PM",
  defaultRoom: "AIClinic – Room 107",
  season: "Fall 2026",
};

const SESSIONS = [
  // ---------- September: kick-off ----------
  { lang: "en", date: "2026-09-18", format: "hackathon", level: "all", track: "event", type: "Hackathon · In person", title: "RevenueCat Next Gen Hackathon",
    description: "Season opener: an in-person hackathon with RevenueCat Next Gen.", time: "Friday event",
    type_fr: "Hackathon · En présentiel",
    title_fr: "Hackathon RevenueCat Next Gen",
    description_fr: "Lancement de la saison : un hackathon en présentiel avec RevenueCat Next Gen.",
    time_fr: "Événement du vendredi" },
  { lang: "en", date: "2026-09-24", format: "talk", level: "all", track: "event", type: "Presentations", title: "RevenueCat Next Gen: project presentations",
    description: "Teams presented the projects they built during the hackathon.",
    type_fr: "Présentations",
    title_fr: "RevenueCat Next Gen : présentation des projets",
    description_fr: "Les équipes ont présenté les projets construits pendant le hackathon." },

  // ---------- October: find the Thursday rhythm ----------
  { lang: "en", date: "2026-10-01", format: "workshop", level: "beginner", track: "tech", type: "Workshop", title: "Basics of Coding",
    description: "The basics of coding, from writing your first lines to putting a project online.",
    type_fr: "Atelier",
    title_fr: "Les bases du code",
    description_fr: "Les bases de la programmation, des premières lignes à la mise en ligne d'un projet." },
  { lang: "en", date: "2026-10-08", format: "workshop", level: "intermediate", track: "tech", type: "CS50 2026", title: "CS50 2026: Memory",
    description: "A CS50 session on memory: how programs store data, pointers and what really happens in RAM.",
    type_fr: "CS50 2026",
    title_fr: "CS50 2026 : la mémoire",
    description_fr: "Une séance CS50 sur la mémoire : comment les programmes stockent les données, les pointeurs et ce qui se passe vraiment dans la RAM." },
  { lang: "en", date: "2026-10-15", format: "talk", level: "advanced", track: "tech", type: "Paper jam", title: "Paper Jam: a recent AI paper",
    description: "We break down a recent AI research paper together and try to rebuild its core idea in one session.",
    type_fr: "Paper jam",
    title_fr: "Paper Jam : un article récent en IA",
    description_fr: "On décortique ensemble un article de recherche récent en IA et on essaie d'en reconstruire l'idée centrale en une séance." },
  { lang: "en", date: "2026-10-22", format: "workshop", level: "all", track: "event", type: "Workshop + build", title: "Ship-It Night: Halloween Edition",
    description: "A short walkthrough of how to build a simple game, then everyone builds and ships something Halloween-themed.",
    type_fr: "Atelier + build",
    title_fr: "Ship-It Night : spécial Halloween",
    description_fr: "Une courte démo pour créer un petit jeu, puis chacun construit et publie quelque chose sur le thème d'Halloween." },
  { date: "2026-10-29", format: "trip", level: "beginner", track: "event", type: "Field trip · Beginners", title: "Learn to code in Swift at Apple", lang: "fr",
    description: "A beginners' trip to Apple on the Champs-Élysées: an iOS engineer introduces Swift with Swift Playgrounds (in French). Bring an iPad if you have one, and confirm only if you're sure to come.",
    time: "5:00 – 6:00 PM", room: "Apple Office, Champs-Élysées",
    link: "https://forms.cloud.microsoft/e/16AcR8eukd", linkText: "Confirm your attendance",
    type_fr: "Sortie · Débutants",
    title_fr: "Apprendre à coder en Swift chez Apple",
    description_fr: "Sortie débutants chez Apple, sur les Champs-Élysées : un ingénieur iOS initie à Swift avec Swift Playgrounds (en français). Apportez un iPad si vous en avez un, et ne confirmez que si vous êtes sûr(e) de venir.",
    time_fr: "17 h – 18 h", room_fr: "Bureaux d'Apple, Champs-Élysées",
    linkText_fr: "Confirmer ma présence" },

  // ---------- November: going deeper ----------
  { lang: "en", date: "2026-11-05", format: "talk", level: "all", track: "tech", type: "Discussion", title: "Speaker Spotlight", planned: true,
    description: "We watch a talk by a well-known engineer or founder together, then discuss what we can take from it.",
    type_fr: "Discussion",
    title_fr: "Speaker Spotlight",
    description_fr: "On regarde ensemble la conférence d'un ingénieur ou d'une fondatrice reconnu(e), puis on discute de ce qu'on peut en retenir." },
  { lang: "en", date: "2026-11-12", format: "competition", level: "intermediate", track: "event", type: "Coding league", title: "Coding Challenge", planned: true,
    description: "A league-style coding competition. Points count toward your bandana.",
    type_fr: "Ligue de code",
    title_fr: "Coding Challenge",
    description_fr: "Une compétition de code façon ligue. Les points comptent pour votre bandana." },
  { lang: "en", date: "2026-11-19", format: "career", level: "all", track: "tech", type: "Career", title: "Get Hired: make yourself more hireable", planned: true,
    description: "CVs, GitHub profiles, LinkedIn and interview prep: practical steps to stand out for internships and jobs.",
    type_fr: "Carrière",
    title_fr: "Get Hired : devenir plus recrutable",
    description_fr: "CV, profil GitHub, LinkedIn et préparation aux entretiens : des conseils concrets pour se démarquer en stage et en emploi." },
  { lang: "en", date: "2026-11-26", format: "career", level: "all", track: "tech", type: "Business", title: "Starting a Student Enterprise", planned: true,
    description: "What it takes to start a business as a student, from first idea to the paperwork.",
    type_fr: "Entrepreneuriat",
    title_fr: "Créer une entreprise étudiante",
    description_fr: "Ce qu'il faut pour lancer une entreprise en étant étudiant, de la première idée aux démarches." },

  // ---------- December: the big finish ----------
  { lang: "en", date: "2026-12-03", format: "workshop", level: "advanced", track: "tech", type: "Systems design", title: "Systems Design: how would you build it?", planned: true,
    description: "Pick one well-known system, such as a search engine, and design it together on the whiteboard.",
    type_fr: "Conception de systèmes",
    title_fr: "Systems Design : comment le construiriez-vous ?",
    description_fr: "On choisit un système connu, comme un moteur de recherche, et on le conçoit ensemble au tableau." },
  { lang: "en", date: "2026-12-10", format: "build", level: "all", track: "tech", type: "Build day", title: "Demo Polish Day", planned: true,
    description: "Polish your projects and demos before the finale.",
    type_fr: "Journée build",
    title_fr: "Demo Polish Day",
    description_fr: "On peaufine projets et démos avant la finale." },
  { lang: "en", date: "2026-12-17", format: "hackathon", level: "all", track: "event", type: "Hackathon", title: "Season Finale Hackathon", planned: true,
    description: "We close the season with a hackathon.",
    type_fr: "Hackathon",
    title_fr: "Hackathon de fin de saison",
    description_fr: "On clôture la saison avec un hackathon." },
  { date: "2026-12-18", track: "break", title: "Winter break",
    description: "The club is back on Thursday 7 January 2027.",
    title_fr: "Vacances d'hiver",
    description_fr: "Le club reprend le jeudi 7 janvier 2027." },
];

/* Ideas not placed yet (not shown on the site):
   Trivia Night (league) · Game Night (league) · topic workshop + open discussion ·
   Programming Time without AI (x2) · Algorithms sessions (x2) */

/* ---------- rendering (no need to edit below) ---------- */

const L = (k, v) => (window.I18N ? I18N.t(k, v) : k);
const F = (s, field) => (window.I18N ? I18N.pick(s, field) : s[field]);
const LOC = () => (window.I18N ? I18N.locale() : "en-GB");

function parseDate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function today0() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
function sorted() { return SESSIONS.map(s => ({ ...s, _d: parseDate(s.date) })).sort((a, b) => a._d - b._d); }
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
    !past && s.planned ? `<span class="chip chip-planned">${L("sched.planned")}</span>` : "",
  ].join("");
  const Wk = wk.charAt(0).toUpperCase() + wk.slice(1);
  return `
    <article class="session track-${s.track}${next ? " is-next" : ""}${past ? " is-past" : ""}">
      <div class="session-date" aria-label="${esc(wk)} ${esc(day)} ${esc(mon)}">
        <span class="d">${esc(day)}</span><span class="m">${esc(mon)}</span>
      </div>
      <div class="session-body">
        <div class="session-meta">${chips}</div>
        <h3>${esc(title)}</h3>
        ${desc ? `<p>${esc(desc)}</p>` : ""}
        ${s.speaker ? `<p class="speaker">${esc(s.speaker)}</p>` : ""}
        <p class="where">${esc(Wk)} · ${esc(F(s, "time") || L("sched.time"))} · ${esc(F(s, "room") || L("sched.room"))}</p>
        ${!past && s.vote && s.vote.options ? `<div class="poll" data-poll="${esc(s.date)}" hidden></div>` : ""}
        ${past && s.recap ? recapHTML(s) : ""}
        ${!past ? `<div class="rsvp" data-rsvp="${esc(s.date)}" hidden></div>` : ""}
        ${!past ? `<p class="session-actions">${s.link ? `<a class="btn btn-primary session-cta" href="${esc(s.link)}" target="_blank" rel="noopener">${esc(F(s, "linkText") || L("sched.more"))} ↗</a>` : ""}<button type="button" class="cal-btn" data-ics="${esc(s.date)}">${esc(L("sched.cal.one"))}</button></p>` : ""}
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

/* ---------- members only: "I'm going" and votes (filled in once live.js has loaded the platform) ---------- */
function initials(n) { return String(n || "?").split(/\s+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase(); }
function fillLive(root) {
  const X = window.CLUB_LIVE; if (!X || !root) return;
  root.querySelectorAll("[data-rsvp]").forEach(box => {
    const date = box.dataset.rsvp, who = X.rsvps.filter(r => r.date === date).map(r => r.uid);
    const mine = who.includes(X.uid), others = who.filter(u => u !== X.uid).map(u => X.names[u]).filter(Boolean);
    const shown = (mine ? [L("rsvp.you")] : []).concat(others);
    const line = !who.length ? L("rsvp.first")
      : shown.length <= 2 ? L("rsvp.names", { names: shown.join(L("rsvp.and")) })
      : L("rsvp.more", { names: shown.slice(0, 2).join(", "), n: shown.length - 2 });
    box.hidden = false;
    box.innerHTML = `<button type="button" class="rsvp-btn" data-going="${esc(date)}" aria-pressed="${mine}">${esc(L(mine ? "rsvp.yes" : "rsvp.btn"))}</button>
      <span class="rsvp-faces" aria-hidden="true">${who.slice(0, 5).map(u => `<i>${esc(initials(u === X.uid ? (X.names[u] || "You") : X.names[u]))}</i>`).join("")}</span>
      <span class="rsvp-line">${who.length ? `<b>${esc(L("rsvp.count", { n: who.length }))}</b> · ` : ""}${esc(line)}</span>`;
  });
  root.querySelectorAll("[data-poll]").forEach(box => {
    const s = SESSIONS.find(x => x.date === box.dataset.poll); if (!s || !s.vote) return;
    const votes = X.votes.filter(v => v.date === s.date), mine = (votes.find(v => v.uid === X.uid) || {}).choice;
    const total = votes.length;
    box.hidden = false;
    box.innerHTML = `<p class="poll-q">${esc(F(s.vote, "question") || L("poll.q"))}</p>
      <div class="poll-opts" role="group" aria-label="${esc(F(s.vote, "question") || L("poll.q"))}">${s.vote.options.map(o => {
        const n = votes.filter(v => v.choice === o.id).length, pct = total ? Math.round(n * 100 / total) : 0;
        return `<button type="button" class="poll-opt" data-vote="${esc(s.date)}" data-choice="${esc(o.id)}" aria-pressed="${mine === o.id}">
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
    const date = g.dataset.going, on = g.getAttribute("aria-pressed") !== "true", before = X.rsvps.slice();
    X.rsvps = X.rsvps.filter(r => !(r.date === date && r.uid === X.uid)); if (on) X.rsvps.push({ date, uid: X.uid });
    const box = g.closest("[data-rsvp]"); fillLive(box.parentElement); box.querySelector("[data-going]").focus();
    const r = await X.data.setRsvp(date, on); if (!r.ok) { X.rsvps = before; fillLive(box.parentElement); }
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
  const t = today0();
  const up = sorted().filter(s => s._d >= t).slice(0, limit);
  const firstReal = up.find(s => s.track !== "break");
  el.innerHTML = up.length
    ? up.map(s => sessionHTML(s, { next: s === firstReal })).join("")
    : `<p class="empty">${L("sched.empty")}</p>`;
  fillLive(el);
}

/* Home page: what we did recently, so visitors can see the club is active. */
function renderRecent(el, { limit = 3 } = {}) {
  if (!el) return;
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
  const desc = [F(s, "description"), s.lang ? langLabel(s) : "", s.planned ? L("sched.cal.planned") : "", s.link ? s.link : "", SITE + "/schedule"].filter(Boolean).join("\n\n");
  const next = (d) => { const x = parseDate(d); x.setDate(x.getDate() + 1); return x.getFullYear() + String(x.getMonth() + 1).padStart(2, "0") + String(x.getDate()).padStart(2, "0"); };
  return [
    "BEGIN:VEVENT",
    `UID:${s.date}-${(s.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}@aivancity-tech-club.github.io`,
    `DTSTAMP:${stamp}`,
    t ? `DTSTART;TZID=Europe/Paris:${t.start}` : `DTSTART;VALUE=DATE:${s.date.replace(/-/g, "")}`,
    t ? `DTEND;TZID=Europe/Paris:${t.end}` : `DTEND;VALUE=DATE:${next(s.date)}`,
    `SUMMARY:${icsEscape(title)}`,
    `LOCATION:${icsEscape(room)}`,
    `DESCRIPTION:${icsEscape(desc)}`,
    `URL:${SITE}/schedule`,
    `STATUS:${s.planned ? "TENTATIVE" : "CONFIRMED"}`,
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
const upcomingReal = () => { const t = today0(); return sorted().filter(s => s._d >= t && s.track !== "break"); };
// any "Add to calendar" button on any page (home or schedule)
document.addEventListener("click", (e) => {
  const one = e.target.closest("[data-ics]"), all = e.target.closest("[data-ics-all]");
  if (one) { const s = SESSIONS.find(x => x.date === one.dataset.ics && x.track !== "break"); if (s) downloadICS([s], `tech-club-${s.date}.ics`); }
  if (all) downloadICS(upcomingReal(), "aivancity-tech-club.ics");
});

/* Schedule page: Upcoming / Past, plus two small dropdowns (level, type).
   The choice is kept in the address (?when=past&level=beginner&type=workshop), so a filtered view can be shared. */
const FORMATS = ["workshop", "hackathon", "competition", "talk", "trip", "career", "build"];
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
  const t = today0(), all = sorted(), loc = LOC();
  const firstReal = all.find(s => s._d >= t && s.track !== "break");
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
