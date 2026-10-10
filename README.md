# aivancity Tech Club · GDG on Campus aivancity

Website for the aivancity Tech Club and its Google Developer Group on Campus.
Plain HTML/CSS/JS, so no build step. It runs as-is on GitHub Pages.

**We meet every Thursday, 1:00–2:00 PM, AIClinic – Room 107.**

Live site: https://aivancity-tech-club.github.io/ · Schedule (flyer QR code): https://aivancity-tech-club.github.io/schedule.html

## Files

| File | What it is |
|---|---|
| `index.html` | Home page: meeting card, the two groups, the next 3 sessions |
| `schedule.html` | Full schedule (this is the page the flyer QR code opens) |
| `rules.html` | Public rules page, generated from `rules/rules.yaml` |
| `rules/rules.yaml` | **The official points & bandana rulebook, the source of truth** |
| `rules/GOVERNANCE.md` | How the rules can change (pull request + 2 organizer approvals) |
| `assets/schedule.js` | **The schedule data. Edit this to add or change sessions.** |
| `assets/styles.css` | Styles (GDG on Campus brand colours) |
| `assets/tech-club-logo.svg` | Tech Club logo (vector; `tech-club-logo.png` is a 512px copy for phone home screens) |
| `assets/gdg-mark.svg` | GDG mark |
| `tools/make_qr.py` | Generates the QR code for print |

## Updating the schedule

Open `assets/schedule.js` and edit the `SESSIONS` list:

```js
{ date: "2026-10-22", track: "gdg", title: "Intro to Gemini API",
  description: "Build your first AI app in 45 minutes.", speaker: "Jane Doe" },
```

`track` is `"tech"`, `"gdg"` or `"event"`. Past sessions move to the bottom of the schedule page automatically.
Commit and push, and the site updates in about a minute.

## The rulebook

`rules/rules.yaml` is the club's official points and bandana rulebook. The Rules page and the
points platform read it directly, so editing that file (through an approved pull request) is the
only way to change a rule. See `rules/GOVERNANCE.md`.

## Publishing on GitHub Pages

1. Create a new **public** repo on GitHub, e.g. `tech-club`.
2. Upload these files to it (drag and drop on github.com works), or:
   ```bash
   git init && git add . && git commit -m "Club website"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/tech-club.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages**, then under *Build and deployment* choose **Deploy from a branch**, pick **main** and **/ (root)**, and click **Save**.
4. After about a minute the site is live at `https://YOUR-USERNAME.github.io/tech-club/`.
   The schedule page is at `https://YOUR-USERNAME.github.io/tech-club/schedule.html`.

## QR code for flyers

```bash
pip install qrcode pillow
python tools/make_qr.py https://YOUR-USERNAME.github.io/tech-club/schedule.html
```

Scan it with your phone before printing.

#GDGOnCampus
