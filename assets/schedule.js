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
  { date: "2026-09-18", format: "hackathon", level: "all", track: "event", type: "Hackathon · In person", title: "RevenueCat Next Gen Hackathon",
    description: "Season opener: an in-person hackathon with RevenueCat Next Gen.", time: "Friday event",
    type_fr: "Hackathon · En présentiel",
    title_fr: "Hackathon RevenueCat Next Gen",
    description_fr: "Lancement de la saison : un hackathon en présentiel avec RevenueCat Next Gen.",
    time_fr: "Événement du vendredi" },
  { date: "2026-09-24", format: "talk", level: "all", track: "event", type: "Presentations", title: "RevenueCat Next Gen: project presentations",
    description: "Teams presented the projects they built during the hackathon.",
    type_fr: "Présentations",
    title_fr: "RevenueCat Next Gen : présentation des projets",
    description_fr: "Les équipes ont présenté les projets construits pendant le hackathon." },

  // ---------- October: find the Thursday rhythm ----------
  { date: "2026-10-01", format: "workshop", level: "beginner", track: "tech", type: "Workshop", title: "Basics of Coding",
    description: "The basics of coding, from writing your first lines to putting a project online.",
    type_fr: "Atelier",
    title_fr: "Les bases du code",
    description_fr: "Les bases de la programmation, des premières lignes à la mise en ligne d'un projet." },
  { date: "2026-10-08", format: "workshop", level: "intermediate", track: "tech", type: "CS50 2026", title: "CS50 2026: Memory",
    description: "A CS50 session on memory: how programs store data, pointers and what really happens in RAM.",
    type_fr: "CS50 2026",
    title_fr: "CS50 2026 : la mémoire",
    description_fr: "Une séance CS50 sur la mémoire : comment les programmes stockent les données, les pointeurs et ce qui se passe vraiment dans la RAM." },
  { date: "2026-10-15", format: "talk", level: "advanced", track: "tech", type: "Paper jam", title: "Paper Jam: a recent AI paper",
    description: "We break down a recent AI research paper together and try to rebuild its core idea in one session.",
    type_fr: "Paper jam",
    title_fr: "Paper Jam : un article récent en IA",
    description_fr: "On décortique ensemble un article de recherche récent en IA et on essaie d'en reconstruire l'idée centrale en une séance." },
  { date: "2026-10-22", format: "workshop", level: "all", track: "event", type: "Workshop + build", title: "Ship-It Night: Halloween Edition",
    description: "A short walkthrough of how to build a simple game, then everyone builds and ships something Halloween-themed.",
    type_fr: "Atelier + build",
    title_fr: "Ship-It Night : spécial Halloween",
    description_fr: "Une courte démo pour créer un petit jeu, puis chacun construit et publie quelque chose sur le thème d'Halloween." },
  { date: "2026-10-29", format: "trip", level: "beginner", track: "event", type: "Field trip · Beginners", title: "Learn to code in Swift at Apple",
    description: "A beginners' trip to Apple on the Champs-Élysées: an iOS engineer introduces Swift with Swift Playgrounds (in French). Bring an iPad if you have one, and confirm only if you're sure to come.",
    time: "5:00 – 6:00 PM", room: "Apple Office, Champs-Élysées",
    link: "https://forms.cloud.microsoft/e/16AcR8eukd", linkText: "Confirm your attendance",
    type_fr: "Sortie · Débutants",
    title_fr: "Apprendre à coder en Swift chez Apple",
    description_fr: "Sortie débutants chez Apple, sur les Champs-Élysées : un ingénieur iOS initie à Swift avec Swift Playgrounds (en français). Apportez un iPad si vous en avez un, et ne confirmez que si vous êtes sûr(e) de venir.",
    time_fr: "17 h – 18 h", room_fr: "Bureaux d'Apple, Champs-Élysées",
    linkText_fr: "Confirmer ma présence" },

  // ---------- November: going deeper ----------
  { date: "2026-11-05", format: "talk", level: "all", track: "tech", type: "Discussion", title: "Speaker Spotlight", planned: true,
    description: "We watch a talk by a well-known engineer or founder together, then discuss what we can take from it.",
    type_fr: "Discussion",
    title_fr: "Speaker Spotlight",
    description_fr: "On regarde ensemble la conférence d'un ingénieur ou d'une fondatrice reconnu(e), puis on discute de ce qu'on peut en retenir." },
  { date: "2026-11-12", format: "competition", level: "intermediate", track: "event", type: "Coding league", title: "Coding Challenge", planned: true,
    description: "A league-style coding competition. Points count toward your bandana.",
    type_fr: "Ligue de code",
    title_fr: "Coding Challenge",
    description_fr: "Une compétition de code façon ligue. Les points comptent pour votre bandana." },
  { date: "2026-11-19", format: "career", level: "all", track: "tech", type: "Career", title: "Get Hired: make yourself more hireable", planned: true,
    description: "CVs, GitHub profiles, LinkedIn and interview prep: practical steps to stand out for internships and jobs.",
    type_fr: "Carrière",
    title_fr: "Get Hired : devenir plus recrutable",
    description_fr: "CV, profil GitHub, LinkedIn et préparation aux entretiens : des conseils concrets pour se démarquer en stage et en emploi." },
  { date: "2026-11-26", format: "career", level: "all", track: "tech", type: "Business", title: "Starting a Student Enterprise", planned: true,
    description: "What it takes to start a business as a student, from first idea to the paperwork.",
    type_fr: "Entrepreneuriat",
    title_fr: "Créer une entreprise étudiante",
    description_fr: "Ce qu'il faut pour lancer une entreprise en étant étudiant, de la première idée aux démarches." },

  // ---------- December: the big finish ----------
  { date: "2026-12-03", format: "workshop", level: "advanced", track: "tech", type: "Systems design", title: "Systems Design: how would you build it?", planned: true,
    description: "Pick one well-known system, such as a search engine, and design it together on the whiteboard.",
    type_fr: "Conception de systèmes",
    title_fr: "Systems Design : comment le construiriez-vous ?",
    description_fr: "On choisit un système connu, comme un moteur de recherche, et on le conçoit ensemble au tableau." },
  { date: "2026-12-10", format: "build", level: "all", track: "tech", type: "Build day", title: "Demo Polish Day", planned: true,
    description: "Polish your projects and demos before the finale.",
    type_fr: "Journée build",
    title_fr: "Demo Polish Day",
    description_fr: "On peaufine projets et démos avant la finale." },
  { date: "2026-12-17", format: "hackathon", level: "all", track: "event", type: "Hackathon", title: "Season Finale Hackathon", planned: true,
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
        ${s.link && !past ? `<p><a class="btn btn-primary session-cta" href="${esc(s.link)}" target="_blank" rel="noopener">${esc(F(s, "linkText") || L("sched.more"))} ↗</a></p>` : ""}
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

/* Schedule page: upcoming sessions by default, past ones behind a filter,
   plus Level and Type filters. The choice is kept in the address (?when=past&level=beginner&type=workshop),
   so a filtered view can be shared. */
const FORMATS = ["workshop", "hackathon", "competition", "talk", "trip", "career", "build"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const FILTER = { when: "upcoming", level: "", type: "" };
(function readFilters() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get("when") === "past") FILTER.when = "past";
    if (LEVELS.includes(q.get("level"))) FILTER.level = q.get("level");
    if (FORMATS.includes(q.get("type"))) FILTER.type = q.get("type");
  } catch (e) {}
})();
function writeFilters() {
  try {
    const q = new URLSearchParams();
    if (FILTER.when === "past") q.set("when", "past");
    if (FILTER.level) q.set("level", FILTER.level);
    if (FILTER.type) q.set("type", FILTER.type);
    history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
  } catch (e) {}
}
const matches = (s) => (!FILTER.level || s.level === FILTER.level || s.level === "all") && (!FILTER.type || s.format === FILTER.type);

function renderSeason(el) {
  if (!el) return;
  const t = today0(), all = sorted(), loc = LOC();
  const firstReal = all.find(s => s._d >= t && s.track !== "break");
  const real = all.filter(s => s.track !== "break");
  const nUp = real.filter(s => s._d >= t).length, nPast = real.filter(s => s._d < t).length;
  const filtering = !!(FILTER.level || FILTER.type);
  const past = FILTER.when === "past";
  let list = all.filter(s => (past ? s._d < t : s._d >= t));
  // breaks only make sense in the plain upcoming view (so nobody turns up to an empty room)
  list = list.filter(s => (s.track === "break" ? !past && !filtering : matches(s)));
  if (past) list.reverse();

  const btn = (group, value, label, on, extra = "") =>
    `<button type="button" class="fchip" data-f="${group}" data-v="${value}" aria-pressed="${on}"${extra}>${label}</button>`;
  const usedFormats = FORMATS.filter(f => real.some(s => s.format === f));
  const bar = `
    <div class="filters">
      <div class="seg" role="group" aria-label="${esc(L("sched.f.when"))}">
        ${btn("when", "upcoming", `${esc(L("sched.f.upcoming"))} <small>${nUp}</small>`, !past)}
        ${btn("when", "past", `${esc(L("sched.f.past"))} <small>${nPast}</small>`, past)}
      </div>
      <div class="fgroup" role="group" aria-label="${esc(L("sched.f.level"))}">
        <span class="flabel">${esc(L("sched.f.level"))}</span>
        ${btn("level", "", esc(L("sched.f.any")), !FILTER.level)}
        ${LEVELS.map(l => btn("level", l, `<i class="dot lv-${l}"></i>${esc(L("level." + l))}`, FILTER.level === l)).join("")}
      </div>
      <div class="fgroup" role="group" aria-label="${esc(L("sched.f.type"))}">
        <span class="flabel">${esc(L("sched.f.type"))}</span>
        ${btn("type", "", esc(L("sched.f.any")), !FILTER.type)}
        ${usedFormats.map(f => btn("type", f, esc(L("fmt." + f)), FILTER.type === f)).join("")}
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
    `<p class="season-count mono" aria-live="polite">${esc(L("sched.count", { season: L("sched.season"), done: nPast, left: nUp }))}</p>` +
    empty +
    months.map(m => `
      <section class="month">
        <h2 class="month-head">${esc(m.key)}</h2>
        <div class="session-list">${m.items.map(s => sessionHTML(s, { next: s === firstReal, past: s._d < t })).join("")}</div>
      </section>`).join("");

  if (!el.dataset.wired) {
    el.dataset.wired = "1";
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-f], [data-reset]"); if (!b) return;
      if (b.hasAttribute("data-reset")) { FILTER.level = ""; FILTER.type = ""; }
      else FILTER[b.dataset.f] = b.dataset.v || (b.dataset.f === "when" ? "upcoming" : "");
      writeFilters(); renderSeason(el);
      const again = el.querySelector(`[data-f="${b.dataset.f}"][data-v="${b.dataset.v}"]`); if (again) again.focus();
    });
  }
}
