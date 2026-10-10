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
  { date: "2026-09-18", track: "event", type: "Hackathon · In person", title: "RevenueCat Next Gen Hackathon",
    description: "Season opener: an in-person hackathon with RevenueCat Next Gen.", time: "Friday event" },
  { date: "2026-09-24", track: "event", type: "Presentations", title: "RevenueCat Next Gen: project presentations",
    description: "Teams presented the projects they built during the hackathon." },

  // ---------- October: find the Thursday rhythm ----------
  { date: "2026-10-01", track: "tech", type: "Workshop", title: "Basics of Coding",
    description: "The basics of coding, from writing your first lines to putting a project online." },
  { date: "2026-10-08", track: "tech", type: "CS50 2026", title: "CS50 2026: Memory",
    description: "A CS50 session on memory: how programs store data, pointers and what really happens in RAM." },
  { date: "2026-10-15", track: "tech", type: "Paper jam", title: "Paper Jam: a recent AI paper",
    description: "We break down a recent AI research paper together and try to rebuild its core idea in one session." },
  { date: "2026-10-22", track: "event", type: "Workshop + build", title: "Ship-It Night: Halloween Edition",
    description: "A short walkthrough of how to build a simple game, then everyone builds and ships something Halloween-themed." },
  { date: "2026-10-29", track: "break", title: "Toussaint break: no session",
    description: "The club is back on Thursday 5 November." },

  // ---------- November: going deeper ----------
  { date: "2026-11-05", track: "tech", type: "Discussion", title: "Speaker Spotlight", planned: true,
    description: "We watch a talk by a well-known engineer or founder together, then discuss what we can take from it." },
  { date: "2026-11-12", track: "event", type: "Coding league", title: "Coding Challenge", planned: true,
    description: "A league-style coding competition. Points count toward your bandana." },
  { date: "2026-11-19", track: "tech", type: "Career", title: "Get Hired: make yourself more hireable", planned: true,
    description: "CVs, GitHub profiles, LinkedIn and interview prep: practical steps to stand out for internships and jobs." },
  { date: "2026-11-26", track: "tech", type: "Business", title: "Starting a Student Enterprise", planned: true,
    description: "What it takes to start a business as a student, from first idea to the paperwork." },

  // ---------- December: the big finish ----------
  { date: "2026-12-03", track: "tech", type: "Systems design", title: "Systems Design: how would you build it?", planned: true,
    description: "Pick one well-known system, such as a search engine, and design it together on the whiteboard." },
  { date: "2026-12-10", track: "tech", type: "Build day", title: "Demo Polish Day", planned: true,
    description: "Polish your projects and demos before the finale." },
  { date: "2026-12-17", track: "event", type: "Hackathon", title: "Season Finale Hackathon", planned: true,
    description: "We close the season with a hackathon." },
  { date: "2026-12-18", track: "break", title: "Winter break",
    description: "The club is back on Thursday 7 January 2027." },
];

/* Ideas not placed yet (not shown on the site):
   Trivia Night (league) · Game Night (league) · topic workshop + open discussion ·
   Programming Time without AI (x2) · Algorithms sessions (x2) */

/* ---------- rendering (no need to edit below) ---------- */

const TRACK_LABEL = { tech: "Tech Club", gdg: "GDG on Campus", event: "Special event" };

function parseDate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function today0() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
function sorted() { return SESSIONS.map(s => ({ ...s, _d: parseDate(s.date) })).sort((a, b) => a._d - b._d); }
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function sessionHTML(s, { next = false, past = false } = {}) {
  const d = s._d;
  const day = d.toLocaleDateString("en-GB", { day: "2-digit" });
  const mon = d.toLocaleDateString("en-GB", { month: "short" });
  const wk = d.toLocaleDateString("en-GB", { weekday: "long" });
  if (s.track === "break") {
    return `<div class="break-row"><span class="mono">${esc(day)} ${esc(mon)}</span><b>${esc(s.title)}</b><span>${esc(s.description)}</span></div>`;
  }
  const chips = [
    `<span class="chip">${esc(s.type || TRACK_LABEL[s.track] || "Session")}</span>`,
    next ? '<span class="chip chip-next">Next up</span>' : "",
    past ? '<span class="chip chip-done">Done</span>' : "",
    !past && s.planned ? '<span class="chip chip-planned">Planned</span>' : "",
  ].join("");
  return `
    <article class="session track-${s.track}${next ? " is-next" : ""}${past ? " is-past" : ""}">
      <div class="session-date" aria-label="${esc(wk)} ${esc(day)} ${esc(mon)}">
        <span class="d">${esc(day)}</span><span class="m">${esc(mon)}</span>
      </div>
      <div class="session-body">
        <div class="session-meta">${chips}</div>
        <h3>${esc(s.title)}</h3>
        ${s.description ? `<p>${esc(s.description)}</p>` : ""}
        ${s.speaker ? `<p class="speaker">with ${esc(s.speaker)}</p>` : ""}
        <p class="where">${esc(wk)} · ${esc(s.time || CLUB.defaultTime)} · ${esc(s.room || CLUB.defaultRoom)}</p>
        ${s.link ? `<a class="session-link" href="${esc(s.link)}">Details →</a>` : ""}
      </div>
    </article>`;
}

/* Home page: the next few sessions (breaks included so nobody turns up to an empty room). */
function renderSchedule(el, { limit = 3 } = {}) {
  if (!el) return;
  const t = today0();
  const up = sorted().filter(s => s._d >= t).slice(0, limit);
  const firstReal = up.find(s => s.track !== "break");
  el.innerHTML = up.length
    ? up.map(s => sessionHTML(s, { next: s === firstReal })).join("")
    : `<p class="empty">New sessions will be posted here soon. Meanwhile, come by on Thursday, 1–2 PM, in ${esc(CLUB.defaultRoom)}.</p>`;
}

/* Home page: what we did recently, so visitors can see the club is active. */
function renderRecent(el, { limit = 3 } = {}) {
  if (!el) return;
  const t = today0();
  const past = sorted().filter(s => s._d < t && s.track !== "break").reverse().slice(0, limit);
  el.innerHTML = past.map(s => sessionHTML(s, { past: true })).join("");
  const wrap = el.closest("[data-hide-empty]"); if (wrap) wrap.hidden = !past.length;
}

/* Schedule page: the whole season, month by month, past sessions included. */
function renderSeason(el) {
  if (!el) return;
  const t = today0(), all = sorted();
  const firstReal = all.find(s => s._d >= t && s.track !== "break");
  const done = all.filter(s => s._d < t && s.track !== "break").length;
  const months = [];
  for (const s of all) {
    const key = s._d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    let m = months.find(x => x.key === key); if (!m) months.push(m = { key, items: [] });
    m.items.push(s);
  }
  el.innerHTML =
    `<p class="season-count mono">${esc(CLUB.season)} · ${done} session${done === 1 ? "" : "s"} done · ${all.filter(s => s._d >= t && s.track !== "break").length} to go</p>` +
    months.map(m => `
      <section class="month">
        <h2 class="month-head">${esc(m.key)}</h2>
        <div class="session-list">${m.items.map(s => sessionHTML(s, { next: s === firstReal, past: s._d < t })).join("")}</div>
      </section>`).join("");
}
