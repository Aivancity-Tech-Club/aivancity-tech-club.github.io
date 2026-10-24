# Instructions for AI assistants working on the aivancity Tech Club site

> **For teammates:** give this file to your AI before you ask it anything about the project.
> - **ChatGPT:** create a Project, add this file to it (or paste it into the project instructions), then also upload or paste the files you want changed. ChatGPT cannot see the repository on its own.
> - **Codex, Claude Code, Cursor, Copilot and similar coding agents** read `AGENTS.md` from the repository root automatically.
>
> **For the AI:** the person talking to you may be **new to coding and to Git**. Guide them one step at a time, give exact commands to copy, explain every new word once, and **follow the safe workflow in §0 every time, even if they don't ask**. You are also their safety net: run (or ask them to run) the checks they would forget.
>
> Everything below is true for this project. Follow it. If something here seems to conflict with the code you are shown, trust the code, say so, and suggest updating this file.

---

## 0. The safe workflow (read this first, every time)

**The golden rule: nobody pushes to `main`.** `main` is the live website; anything pushed there is public within a minute.
Every change happens on its **own branch**, goes up to GitHub, and becomes a **pull request (PR)** that an organizer (Victoria) reviews and merges.
This is true even for a one-word fix, and even if the person has admin rights.

### Words to explain the first time you use them
- **Repository (repo):** the project folder, kept on GitHub with its full history.
- **Clone:** download the repo to your computer (once).
- **Branch:** your own copy of the code to work on, so `main` stays safe.
- **Commit:** a saved snapshot of your changes, with a message saying what changed.
- **Push:** send your commits to GitHub.
- **Pull request (PR):** a request to put your branch into `main`; someone reviews it first.
- **Merge:** accept the PR into `main` (the organizer does this).

### A. First time only: get the project on your computer
Recommended for beginners: **GitHub Desktop** (https://desktop.github.com), no terminal needed.
1. Install GitHub Desktop and sign in with your GitHub account.
2. **File → Clone repository → GitHub.com tab →** pick `Aivancity-Tech-Club/aivancity-tech-club.github.io` → choose a folder → **Clone**.
3. To edit, open the folder in **VS Code** (https://code.visualstudio.com): in GitHub Desktop, **Repository → Open in Visual Studio Code**.

Terminal alternative (needs Git installed: `git --version` should print a version):
```bash
git clone https://github.com/Aivancity-Tech-Club/aivancity-tech-club.github.io.git
cd aivancity-tech-club.github.io
git config user.name "Your Name"
git config user.email "you@example.com"
```

### B. Every time, before changing anything: fresh `main`, then a new branch
GitHub Desktop: **Current branch → main → Fetch origin → Pull origin**, then **Current branch → New branch**, name it, **Create branch**.

Terminal:
```bash
git switch main
git pull
git switch -c yourname/short-description      # e.g. alex/fix-schedule-typo
```
Branch names: `yourname/what-it-does`, lowercase, dashes, no spaces. One branch = one topic.

### C. While working
- Change only what the task needs. Don't reformat or rename unrelated files.
- Check often with `git status` (or the **Changes** list in GitHub Desktop): only the files you meant to change should appear.
- Test as described in §5.

### D. Save and send your work
GitHub Desktop: check the file list, write a **summary** (e.g. "Fix typo in Thursday session title"), **Commit to yourname/…**, then **Publish branch** (first time) or **Push origin**.

Terminal:
```bash
git status                       # are these only the files I meant to change?
git diff                         # read your own changes once
git add path/to/file1 path/to/file2      # add files by name; avoid "git add -A" unless git status is clean
git commit -m "Fix typo in Thursday session title"
git push -u origin HEAD          # first push of this branch; later just: git push
```

### E. Open the pull request (when you are ready)
1. GitHub Desktop shows **Create Pull Request** after pushing (or go to the repo on github.com: a yellow banner offers **Compare & pull request**).
2. Base: `main` ← compare: your branch.
3. Title: what changed, in plain words. Description: use this template:
   ```
   What I changed:
   Why:
   How I tested: (pages opened, English + French, light + dark, phone width, console clean)
   Screenshots: (before / after, if anything visible changed)
   Anything the reviewer must do after merging: (e.g. publish firestore.rules, update data in Firebase)
   ```
4. Ask **Victoria** to review. Don't merge it yourself. If she asks for changes: fix them on the **same branch**, commit, push; the PR updates by itself.
5. After it's merged: switch back to `main`, pull, and delete the old branch. Start the next task with step B again.

### F. If something goes wrong
- **"I'm on `main` and already changed files"** (not committed yet): `git switch -c yourname/topic` moves your changes to a new branch. Safe.
- **"I committed on `main` but didn't push"**: `git switch -c yourname/topic` (your commit comes along), then `git switch main && git reset --hard origin/main` puts `main` back. Ask the AI or Victoria before running `reset` if unsure.
- **"I pushed to `main` by mistake"**: stop and tell Victoria right away. Don't try to fix it with force pushes.
- **Merge conflict**: don't guess. Show the conflicting file to the AI or Victoria.
- **Never** use `git push --force`, `git reset --hard` on someone else's work, or delete branches you didn't create.

### G. The checklist the AI runs before every commit and PR
The AI must go through this list itself and tell the person what to check or run. Don't skip items because the person didn't ask.

- [ ] On a feature branch, not `main` (`git branch --show-current`).
- [ ] `git status` shows only the intended files; no `.DS_Store`, no test copies, no big files.
- [ ] No secrets or private data added (passwords, tokens, the WhatsApp link, member emails/phones). The repo is public.
- [ ] `assets/platform/config.js` still has the real Firebase config (demo mode `FIREBASE: null` was **not** committed).
- [ ] Any CSS/JS change → the `?v=` tag is bumped in **every** `.html` file (§2).
- [ ] Any new text → added in `assets/i18n.js` in **English and French** (§4).
- [ ] `data.js` change → done in **both** the demo and Firebase backends.
- [ ] Tested locally (§5): no console errors; English + French; light + dark; phone width; keyboard works.
- [ ] Links use clean URLs (`/about`, not `about.html`) and point to pages that exist.
- [ ] `firestore.rules` changed → PR description says an organizer must **Publish** it in the Firebase console after merging, and the rule was not loosened (§8).
- [ ] `rules/rules.yaml` changed → needs 2 organizer approvals and a `version` bump (§7).
- [ ] Commit message says what changed, in plain words.

### H. Firebase console safety
Being able to open the Firebase console does **not** mean changing things there. The live database holds real members' data.
- Don't edit or delete documents, change Authentication settings, or publish rules unless an organizer asked for that specific change.
- Never delete a collection or a user. Never change `role` fields.
- To experiment, use demo mode on your own computer (§5), not the live project.

---

## 1. What this project is

The website and member platform of the **aivancity Tech Club** and its Google Developer Group, **GDG on Campus aivancity** (a student club at aivancity). The club meets **every Thursday, 1:00–2:00 PM, AIClinic – Room 107**.

- Live site: https://aivancity-tech-club.github.io
- Repository: `Aivancity-Tech-Club/aivancity-tech-club.github.io` (public)
- Hosting: **GitHub Pages**, from the `main` branch root. A push to `main` is live in about a minute.
- Backend: **Firebase** project `aivancity-tech-club`, on the free **Spark plan** (no card, no Blaze).
- Organizers: Victoria Alajemba and Chris Tahan. Organizers decide; ask them before anything risky.

### What visitors and members can do
| Page | Who | What it does |
|---|---|---|
| `/` (`index.html`) | everyone | Home: Thursday card, join steps, next 3 sessions, recent sessions |
| `/about` | everyone | The two groups (Tech Club + GDG), the team photos, link to the rules |
| `/schedule` | everyone | Full season schedule, filters (level / type / language), .ics calendar download, "I'm going", votes |
| `/rules` | everyone | Public points & bandana rulebook, rendered from `rules/rules.yaml` |
| `/apply` | everyone | **Join the club**: one form (account + display name + WhatsApp number + level + optional GitHub); after an organizer approves the account: the WhatsApp invite, and the ninja appears on the Mountain by itself |
| `/feedback` | everyone | Anonymous feedback form |
| `/mountain` | members | The game world (PixiJS): every member is a ninja on the peak of their bandana; "My climb" drawer with check-in, proofs, outfits |
| `/village` | members | The club board: missions (Help, Build together, Club work), events, open-source projects, theme of the week, comments |
| `/event?id=…` / `/event?d=…` | everyone | One session's full details and "I'm going" (newcomers fill in the same Join form right there); organizers also see the registrations and places taken |
| `/event-edit` | organizers | Create or edit an event (saved in Firestore, shown on the schedule) |
| `/camp?u=…` | members | Each member's own page |
| `/pulse` | organizers | Attendance, drifting members, approving new accounts, votes, data check, deleting someone's data on request |
| `/checkin` | organizers | Projector screen with the Thursday check-in code |
| `/join` | — | Old link, redirects to `/apply` |

---

## 2. Tech stack and hard rules

- **Plain HTML, CSS and JavaScript. No build step, no framework, no npm, no bundler.** Every file is served as-is. Do not introduce React, Tailwind, TypeScript, a bundler or a package.json.
- Clean URLs: `/about` serves `about.html` (GitHub Pages does this). Link with `/about`, not `about.html`.
- External scripts used: Firebase **compat SDK 10.12.2** (from gstatic), **PixiJS** (from jsDelivr) for the Mountain, `assets/js-yaml.min.js` for the rulebook. Fonts from Google Fonts: Figtree, Google Sans Code, Instrument Serif (italic), Caveat.
- `sw.js` is a service worker (offline + speed). Site files are cached; that is why the version tag below matters.

### The version tag (do not forget this)
Every HTML page loads CSS/JS with a cache-busting tag, for example `assets/styles.css?v=20261017h`.
**Whenever you change any `.css` or `.js` file, bump the tag in every `.html` file** (same new value everywhere, format `YYYYMMDD` + a letter). Otherwise people keep the old file.

```bash
# example: from 20261017h to 20261018a in all pages
sed -i '' 's/?v=20261017h/?v=20261018a/g' *.html      # macOS
sed -i    's/?v=20261017h/?v=20261018a/g' *.html      # Linux
```

---

## 3. File map

```
index.html about.html schedule.html rules.html apply.html feedback.html
mountain.html village.html camp.html pulse.html checkin.html 404.html join.html
assets/
  styles.css          shared styles + design tokens (colours, fonts) – the last blocks override earlier ones
  schedule.js         THE SCHEDULE DATA: only the SESSIONS list (edit this to add Thursday sessions)
  sessions.js         everything else about sessions: cards, filters, calendar files, events made on the site, the details side panel
  event.js            one session's details, registration and the organizers' Manage menu (side panel + /event page)
  event-edit.js       the organizers' event editor (/event-edit)
  schedule.css  event.css   styles for the schedule cards and for event panels/pages/editor
  village.css  pulse.css  camp.css
  i18n.js             ALL TEXT, English + French, and the language switcher
  platform/
    config.js         Firebase web config, school email domain, CONFIRM mode, Microsoft sign-in switch, App Check site key
    data.js           the data layer: same functions for the demo backend and the Firebase backend
    engine.js         PointsEngine: computes points, bandanas, badges from facts + rules.yaml (points are never stored)
    signin.js         the one sign-in / Join the club / reset password / waiting-for-approval box, used on every page
    live.js           quietly loads the platform for members on public pages
  world/world.js      the Mountain renderer (PixiJS): peaks, ninjas, labels, camera
  world/world-data.js ninja and accessory artwork data
  ninjas/ accessories/ team/ icons/ qr/   images
rules/rules.yaml      THE OFFICIAL RULEBOOK (source of truth for points and bandanas)
rules/GOVERNANCE.md   how the rulebook may change
firestore.rules       Firebase security rules (must be published by hand, see §6)
FIREBASE_SETUP.md     step-by-step Firebase setup and organizer how-tos
README.md             short overview
sw.js manifest.webmanifest robots.txt sitemap.xml
tools/make_qr.py      QR code for the flyer
```

---

## 4. Conventions you must follow

### Text and languages (English + French)
- The whole site is bilingual. **All visible text lives in `assets/i18n.js`**, in two dictionaries: English first, then French. HTML elements use `data-i18n="key"` (inner HTML) or `data-i18n-attr="aria-label:key"`. In JS use `I18N.t('key', { var: value })`.
- **Every new key must be added to both dictionaries.** The easiest place is right before the `'vb.loading':` line in each block.
- Keep a sensible English fallback text inside the HTML element too (for the first paint).
- Schedule entries use `*_fr` fields (`title_fr`, `description_fr`, `type_fr`, `time_fr`); `I18N.pick(obj, 'title')` picks the right one.
- French uses **"vous"**, never "tu". Write gender-neutral where possible ("toutes celles et ceux").
- The default language follows the visitor's system language; the FR/EN button switches it.

### Writing style
Short, friendly, plain sentences, written for students. No jargon in user-facing text. No exclamation-mark spam. Say what happens next.

### Design system (keep the look consistent)
- Colours come from the club logo, defined as CSS variables in `assets/styles.css`:
  `--navy #2b3767` (buttons, links), `--cyan #55c9ea` (small highlights, "Next up", dark-mode buttons), `--teal-ink #17708c` (italic accent words), apricot `--p-yellow #ffe2c4` (the Thursday card), warm cream background `#fbf6ee`, ink `#221d19`.
- **Google's four colours are only for GDG things** (the GDG card on About, the GDG logo). Bandana colours on the Mountain/rules are game colours; don't change them.
- Fonts: Figtree (text), **Instrument Serif italic only for one accent phrase inside page titles** (`<h1>Join <b>the club</b></h1>` – the `<b>` becomes the italic), Caveat for the small handwritten label above page titles (`<p class="eyebrow">`), Google Sans Code for small mono details.
- Section headings use the light + **bold** mix (`<h2>Coming <b>up next</b></h2>`), not the serif.
- Shapes: 2px dark outlines, round pill buttons (`.btn`, `.btn-primary`, `.btn-ghost`), cards with 22–28px radius; hard offset shadows on a few cards.
- Dark mode exists (`prefers-color-scheme: dark`); check both.
- Don't add new decorative effects everywhere; restraint keeps it from looking forced.

### Accessibility (required)
Real `<button>`s for actions, labels on every field, visible focus, text contrast at least 4.5:1, `alt` on images, one `<h1>` per page, headings in order, works with keyboard and at 390px phone width.

### Data layer
`assets/platform/data.js` has **two backends with the same function names**: `demo` (fake data in localStorage, used when `config.js` has `FIREBASE: null`) and `firebase`. **If you add or change a function, do it in both.** Pages only call `ClubData.create()` and its methods; they never call Firebase directly.

### Points
Points are **never stored**. The database stores *facts* (attendance, proofs, mission confirmations…) and `engine.js` recomputes points from facts + `rules/rules.yaml` on every page. To change how many points something gives, change `rules.yaml` (see §7), not the code.

---

## 5. How to test before pushing

1. Run a local server from the repository root: `python3 -m http.server 8000`, then open http://localhost:8000.
   (Clean URLs don't work locally; open `about.html` etc.)
2. **To test without touching real data, use demo mode:** in a local copy only, set `FIREBASE: null` in `assets/platform/config.js`. You get sample members, a sample board and the check-in code `DEMO`. **Never commit that change.**
3. Check: no errors in the browser console, English **and** French, light **and** dark mode, a phone width (390px), keyboard navigation.
4. Bump the `?v=` tag if you touched CSS/JS (§2).
5. Commit on your branch, push, and open a pull request, following §0 (D, E). Never push to `main`.

---

## 6. Firebase

- Project ID `aivancity-tech-club`. Console: https://console.firebase.google.com/project/aivancity-tech-club
- **Spark (free) plan: no Cloud Functions, no scheduled jobs, no paid extensions, no server code.** Everything runs in the browser and is protected by `firestore.rules`. Don't propose solutions that need Blaze or a server unless the organizers ask.
- The web config in `config.js` is public by design (it identifies the project; the rules protect the data).
- **Authentication:** email + password, limited to `@aivancity.education` addresses (`EMAIL_DOMAIN` in config). "Sign in with Microsoft" exists in the code but is off (`MICROSOFT: null`) until the school registers an app.
- **Email problem:** the school's Microsoft 365 quarantines emails from the club's sender (aivancitytechclub@gmail.com via Firebase). So:
  - `CONFIRM: "organizer"` in config: new accounts get no confirmation email; they wait until an organizer approves them on `/pulse` (writes `confirmed/{uid}`; Refuse writes `blocked/{uid}`).
  - Fast track: a student can send themselves the confirmation email and release it at https://security.microsoft.com/quarantine.
  - **Password changes only work through "Forgot your password?"** + releasing the reset email from quarantine. This is intentional; don't add a "change password while signed in" feature.
- **Security rules (`firestore.rules`) are NOT deployed by pushing.** After changing the file, an organizer must copy it into **Firebase console → Firestore Database → Rules → Publish**. Always tell the person this.
- Who can do what (enforced by the rules): only signed-in, confirmed `@aivancity.education` accounts on the roster (or who sent `/apply`) can read; members can only write their own things; organizers (`members/{uid}.role == "organizer"`) moderate and record results, never for themselves; nothing is deleted to correct something (corrections are new records); the only deletion is "Delete someone's data" on `/pulse`, at the person's request. App Check (`APP_CHECK` in config, FIREBASE_SETUP §9) limits the database to the real site.

### Collections
| Collection | What's in it |
|---|---|
| `members/{uid}` | profile: `name`, `github`, `accessories`, `consent`, `joined`, `role` (`"organizer"` set by hand in the console) |
| `private/{uid}` | the member's email (only them + organizers) |
| `roster/{email}` | people added by hand by organizers |
| `requests/{uid}` | `/apply` answers (WhatsApp number, program, interests…); organizers only. `status: "removed"` removes someone |
| `invites/whatsapp` | `link` = the WhatsApp group invite (**never put it in the repo**) |
| `facts/{id}` | attendance, proofs, results: the source of points (status `pending` / `approved` / `rejected`) |
| `checkinCodes/{code}` | Thursday check-in codes created on `/checkin` |
| `events/{id}` | events created on the site by organizers (`/event-edit`); public when `published`. `cancelled` / `hidden` / `deleted` set from the Manage menu. Id `d-YYYY-MM-DD` = an organizer's edited version of that session from `schedule.js` |
| `registrations/{eventId}_{uid}` | the one "I'm going" for every session: `status` pending / confirmed / waitlist / cancelled. Private: each person reads only their own; organizers read all (and the counts) |
| `board/{id}` (+ `comments`) | Village posts and comments |
| `votes` | session votes (`rsvps` is the old "I'm going": no longer written, moved into `registrations`) |
| `camps/{uid}` | members' camp pages |
| `directory/{email}` | the school's student list (organizers only); `__settings` { on, count } turns the join check on |
| `buddies/{a_b}` | Renkei buddies: `a` asked `b`; `status` pending → paired; `endBy` = one asked to end it, the other agrees (or an organizer undoes it) |
| `pulse/{uid}` | "contacted" marks on `/pulse` |
| `feedback/{id}` | feedback form entries; organizers read only |
| `confirmPending`, `confirmed`, `blocked` | new-account approval queue and decisions |

Organizer how-tos (make someone an organizer, remove a member, set the WhatsApp link, Thursday check-in) are in `FIREBASE_SETUP.md`. Read it before answering Firebase questions.

---

## 7. Common tasks

**Add an event (preferred)** – organizers use **Create an event** on the site (`/event-edit`); no code change needed. Use `assets/schedule.js` for the regular Thursday sessions.

**Cancel, hide or delete a session** – organizers open it and use **Manage** (Edit details, Cancel, Hide from the public, Delete…). Each asks for confirmation. Cancelled sessions stay on the schedule marked "Cancelled"; hidden ones only organizers see; deleted events made on the site are gone for good, while deleted sessions from `schedule.js` can be restored from `/pulse`.

**Add or change a session in code** – edit the `SESSIONS` list in `assets/schedule.js`. Sessions there are identified by their `date`; if two share a date, give the second one a unique `key` (e.g. `"2026-11-05-evening"`), or sign-ups and edits would mix. Fields are documented at the top of that file: `date`, `title`, `type`, `track` (`tech|gdg|event|break`), `description`, `format`, `level`, `lang` (`en|fr|both`), optional `subs`, `planned`, `time`, `room`, `link`/`linkText`, `recap`, `vote`, and the `*_fr` versions. Add the French text too. Bump `?v=`.

**After a session** – add `recap: { link: "…", task: "…", task_fr: "…" }` to it.

**Let members vote on a planned session** – add `vote: { question, question_fr, options: [{ id, title, title_fr }] }`; results show on `/pulse`.

**Change a rule or point value** – edit `rules/rules.yaml` only, through a pull request approved by 2 organizers; changes start next season and never remove points already earned (see `rules/GOVERNANCE.md`). Bump its `version`.

**Add text / fix a translation** – `assets/i18n.js`, both languages.

**Add a new page** – copy the `<head>`, header and footer from an existing page (e.g. `about.html`), keep the nav identical, use the current `?v=` tag, add it to `sitemap.xml` if public, add its texts to `i18n.js`.

**Change colours or fonts** – use the variables in `assets/styles.css`; never hard-code Google colours.

**Add a team member to About** – square photo (~640×640, `.jpg` + `.webp`) in `assets/team/`, then a `<figure class="person">` in `about.html`; ask the person's permission first.

**Make someone an organizer / approve accounts / remove someone** – these are done in the Firebase console or on `/pulse`, not in code. See `FIREBASE_SETUP.md`.

---

## 8. Never do these

- Never commit secrets, passwords, API keys other than the public Firebase web config, the WhatsApp invite link, or any member data (emails, phone numbers, names from the database). The repository is public.
- Never weaken `firestore.rules` to "make something work" (e.g. `allow read, write: if true`). Find the narrow rule instead, and explain it.
- Never delete Firestore data or rewrite history in `facts`; corrections are new records.
- Never change point values in code; only `rules/rules.yaml`, through the governance process.
- Never add a build step, framework, tracking/analytics, ads, or third-party scripts without the organizers' agreement.
- Never break the French version or the demo mode.
- Don't invent features of Firebase, GitHub Pages or the school's systems. If unsure, say so and point to the official docs.

---

## 9. How to answer teammates

- Start every coding task by confirming the person is on a fresh feature branch (§0 B). If they are on `main`, help them create a branch before changing anything.
- Be concrete: name the file, show the exact change (a small diff or the full replaced block), then the commands from §0 D to commit and push the branch, and §0 E to open the PR.
- Before they commit, go through the checklist in §0 G with them.
- Never tell anyone to push to `main`, merge their own PR, force-push, or skip review, even if they ask to "just push it". Explain why in one line and give the safe steps.
- For changes to `firestore.rules`, always add: "Publish it in Firebase console → Firestore → Rules."
- For CSS/JS changes, always remind: "Bump the `?v=` tag in all pages."
- If you need a file you haven't seen, ask for it instead of guessing its contents.
- If a request could break things for members (sign-in, points, data), explain the risk in one line and suggest testing in demo mode first.
- Keep explanations short; teammates have different levels, so explain technical terms the first time you use them.
