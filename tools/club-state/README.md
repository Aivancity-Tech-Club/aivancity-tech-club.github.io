# Club state: what is really scheduled

```bash
node tools/club-state/schedule.js          # today and later
node tools/club-state/schedule.js --all    # the whole season
```

Organizers move, hide and create events on the website (`/event-edit`, the Manage menu). Those edits are saved in the
database, not in `assets/schedule.js`, so the file alone can be out of date. This prints the schedule exactly as
visitors see it: `schedule.js` with the live edits applied, plus events made on the site.

Each line has a status: `confirmed`, `planned (not confirmed)`, `cancelled`, `hidden` or `deleted`.
**Agents prepare public content only for `confirmed` sessions.** A `planned` one is an idea: ask an organizer first.
