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
     *_fr        French version of title, type, description, time (shown when the site is in French)

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
    description: "Season opener: an in-person hackathon with RevenueCat Next Gen.", time: "Friday event",
    type_fr: "Hackathon · En présentiel",
    title_fr: "Hackathon RevenueCat Next Gen",
    description_fr: "Lancement de la saison : un hackathon en présentiel avec RevenueCat Next Gen.",
    time_fr: "Événement du vendredi" },
  { date: "2026-09-24", track: "event", type: "Presentations", title: "RevenueCat Next Gen: project presentations",
    description: "Teams presented the projects they built during the hackathon.",
    type_fr: "Présentations",
    title_fr: "RevenueCat Next Gen : présentation des projets",
    description_fr: "Les équipes ont présenté les projets construits pendant le hackathon." },

  // ---------- October: find the Thursday rhythm ----------
  { date: "2026-10-01", track: "tech", type: "Workshop", title: "Basics of Coding",
    description: "The basics of coding, from writing your first lines to putting a project online.",
    type_fr: "Atelier",
    title_fr: "Les bases du code",
    description_fr: "Les bases de la programmation, des premières lignes à la mise en ligne d'un projet." },
  { date: "2026-10-08", track: "tech", type: "CS50 2026", title: "CS50 2026: Memory",
    description: "A CS50 session on memory: how programs store data, pointers and what really happens in RAM.",
    type_fr: "CS50 2026",
    title_fr: "CS50 2026 : la mémoire",
    description_fr: "Une séance CS50 sur la mémoire : comment les programmes stockent les données, les pointeurs et ce qui se passe vraiment dans la RAM." },
  { date: "2026-10-15", track: "tech", type: "Paper jam", title: "Paper Jam: a recent AI paper",
    description: "We break down a recent AI research paper together and try to rebuild its core idea in one session.",
    type_fr: "Paper jam",
    title_fr: "Paper Jam : un article récent en IA",
    description_fr: "On décortique ensemble un article de recherche récent en IA et on essaie d'en reconstruire l'idée centrale en une séance." },
  { date: "2026-10-22", track: "event", type: "Workshop + build", title: "Ship-It Night: Halloween Edition",
    description: "A short walkthrough of how to build a simple game, then everyone builds and ships something Halloween-themed.",
    type_fr: "Atelier + build",
    title_fr: "Ship-It Night : spécial Halloween",
    description_fr: "Une courte démo pour créer un petit jeu, puis chacun construit et publie quelque chose sur le thème d'Halloween." },
  { date: "2026-10-29", track: "break", title: "Toussaint break: no session",
    description: "The club is back on Thursday 5 November.",
    title_fr: "Vacances de la Toussaint : pas de séance",
    description_fr: "Le club reprend le jeudi 5 novembre." },

  // ---------- November: going deeper ----------
  { date: "2026-11-05", track: "tech", type: "Discussion", title: "Speaker Spotlight", planned: true,
    description: "We watch a talk by a well-known engineer or founder together, then discuss what we can take from it.",
    type_fr: "Discussion",
    title_fr: "Speaker Spotlight",
    description_fr: "On regarde ensemble la conférence d'un ingénieur ou d'une fondatrice reconnu(e), puis on discute de ce qu'on peut en retenir." },
  { date: "2026-11-12", track: "event", type: "Coding league", title: "Coding Challenge", planned: true,
    description: "A league-style coding competition. Points count toward your bandana.",
    type_fr: "Ligue de code",
    title_fr: "Coding Challenge",
    description_fr: "Une compétition de code façon ligue. Les points comptent pour votre bandana." },
  { date: "2026-11-19", track: "tech", type: "Career", title: "Get Hired: make yourself more hireable", planned: true,
    description: "CVs, GitHub profiles, LinkedIn and interview prep: practical steps to stand out for internships and jobs.",
    type_fr: "Carrière",
    title_fr: "Get Hired : devenir plus recrutable",
    description_fr: "CV, profil GitHub, LinkedIn et préparation aux entretiens : des conseils concrets pour se démarquer en stage et en emploi." },
  { date: "2026-11-26", track: "tech", type: "Business", title: "Starting a Student Enterprise", planned: true,
    description: "What it takes to start a business as a student, from first idea to the paperwork.",
    type_fr: "Entrepreneuriat",
    title_fr: "Créer une entreprise étudiante",
    description_fr: "Ce qu'il faut pour lancer une entreprise en étant étudiant, de la première idée aux démarches." },

  // ---------- December: the big finish ----------
  { date: "2026-12-03", track: "tech", type: "Systems design", title: "Systems Design: how would you build it?", planned: true,
    description: "Pick one well-known system, such as a search engine, and design it together on the whiteboard.",
    type_fr: "Conception de systèmes",
    title_fr: "Systems Design : comment le construiriez-vous ?",
    description_fr: "On choisit un système connu, comme un moteur de recherche, et on le conçoit ensemble au tableau." },
  { date: "2026-12-10", track: "tech", type: "Build day", title: "Demo Polish Day", planned: true,
    description: "Polish your projects and demos before the finale.",
    type_fr: "Journée build",
    title_fr: "Demo Polish Day",
    description_fr: "On peaufine projets et démos avant la finale." },
  { date: "2026-12-17", track: "event", type: "Hackathon", title: "Season Finale Hackathon", planned: true,
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
        ${s.link ? `<a class="session-link" href="${esc(s.link)}">→</a>` : ""}
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
    : `<p class="empty">${L("sched.empty")}</p>`;
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
  const t = today0(), all = sorted(), loc = LOC();
  const firstReal = all.find(s => s._d >= t && s.track !== "break");
  const done = all.filter(s => s._d < t && s.track !== "break").length;
  const left = all.filter(s => s._d >= t && s.track !== "break").length;
  const months = [];
  for (const s of all) {
    let key = s._d.toLocaleDateString(loc, { month: "long", year: "numeric" });
    key = key.charAt(0).toUpperCase() + key.slice(1);
    let m = months.find(x => x.key === key); if (!m) months.push(m = { key, items: [] });
    m.items.push(s);
  }
  el.innerHTML =
    `<p class="season-count mono">${esc(L("sched.count", { season: L("sched.season"), done, left }))}</p>` +
    months.map(m => `
      <section class="month">
        <h2 class="month-head">${esc(m.key)}</h2>
        <div class="session-list">${m.items.map(s => sessionHTML(s, { next: s === firstReal, past: s._d < t })).join("")}</div>
      </section>`).join("");
}
