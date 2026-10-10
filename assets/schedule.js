/* ============================================================
   CLUB SCHEDULE — edit this list to update the website.
   Each session: date (YYYY-MM-DD), title, track, and an
   optional description / speaker / link.

   track: "tech"  → Tech Club session
          "gdg"   → GDG on Campus aivancity session
          "event" → special event (hackathon, talk, DevFest…)

   Regular meetings: every Thursday, 1:00–2:00 PM, AIClinic – Room 107.
   Override time/room per session with `time` / `room` if needed.
   ============================================================ */

const CLUB = {
  defaultTime: "1:00 – 2:00 PM",
  defaultRoom: "AIClinic – Room 107",
};

const SESSIONS = [
  { date: "2026-10-15", track: "tech",  title: "Kick-off: meet the club", description: "Who we are, what we'll build this semester, and how to get involved." },
  { date: "2026-10-22", track: "gdg",   title: "Topic to be announced" },
  { date: "2026-10-29", track: "tech",  title: "Topic to be announced" },
  { date: "2026-11-05", track: "gdg",   title: "Topic to be announced" },
  { date: "2026-11-12", track: "tech",  title: "Topic to be announced" },
  { date: "2026-11-19", track: "gdg",   title: "Topic to be announced" },
  { date: "2026-11-26", track: "tech",  title: "Topic to be announced" },
  { date: "2026-12-03", track: "event", title: "Topic to be announced" },
];

/* ---------- rendering (no need to edit below) ---------- */

const TRACK_LABEL = { tech: "Tech Club", gdg: "GDG on Campus", event: "Special event" };

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function renderSchedule(el, { limit = Infinity, showPast = false } = {}) {
  if (!el) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let items = SESSIONS
    .map(s => ({ ...s, _d: parseDate(s.date) }))
    .sort((a, b) => a._d - b._d);

  const upcoming = items.filter(s => s._d >= today);
  const past = items.filter(s => s._d < today);
  items = upcoming.slice(0, limit);

  if (!items.length) {
    el.innerHTML = `<p class="empty">New sessions will be posted here soon. Meanwhile, come by on Thursday, 1–2 PM, in ${CLUB.defaultRoom}.</p>`;
  } else {
    el.innerHTML = items.map((s, i) => sessionHTML(s, i === 0)).join("");
  }

  if (showPast && past.length) {
    const wrap = document.getElementById("past-sessions");
    if (wrap) {
      wrap.hidden = false;
      wrap.querySelector(".session-list").innerHTML =
        past.reverse().map(s => sessionHTML(s, false, true)).join("");
    }
  }
}

function sessionHTML(s, isNext, isPast = false) {
  const d = s._d;
  const day = d.toLocaleDateString("en-GB", { day: "2-digit" });
  const mon = d.toLocaleDateString("en-GB", { month: "short" });
  const wk = d.toLocaleDateString("en-GB", { weekday: "long" });
  const tbd = /to be announced/i.test(s.title);
  return `
    <article class="session track-${s.track}${isNext ? " is-next" : ""}${isPast ? " is-past" : ""}">
      <div class="session-date" aria-label="${wk} ${day} ${mon}">
        <span class="d">${day}</span><span class="m">${mon}</span>
      </div>
      <div class="session-body">
        <div class="session-meta">
          <span class="chip">${TRACK_LABEL[s.track] || "Session"}</span>
          ${isNext ? '<span class="chip chip-next">Next up</span>' : ""}
        </div>
        <h3 class="${tbd ? "tbd" : ""}">${s.title}</h3>
        ${s.description ? `<p>${s.description}</p>` : ""}
        ${s.speaker ? `<p class="speaker">with ${s.speaker}</p>` : ""}
        <p class="where">${wk} · ${s.time || CLUB.defaultTime} · ${s.room || CLUB.defaultRoom}</p>
        ${s.link ? `<a class="session-link" href="${s.link}">Details →</a>` : ""}
      </div>
    </article>`;
}
