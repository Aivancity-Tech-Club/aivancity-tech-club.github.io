# Content studio

Makes the club's social-media posts in the club's own look (the colours, fonts and ninjas of the website),
from a short description of the post. Used by the Marketing agent; anyone can run it too.

One post = two files in `posts/`:
- `YYYY-MM-DD-name.json`: what the visuals say (carousel slides, stories, the Reel's text beats).
- `YYYY-MM-DD-name.md`: the French texts (captions, LinkedIn, e-mail, WhatsApp, alt texts), the posting calendar
  and what to check before posting.

## Make the files

```bash
node tools/content-studio/render.js tools/content-studio/posts/2026-11-19-get-hired.json OUT_FOLDER
```

It writes the Instagram carousel (`carousel-*.png`, 1080 × 1350), the same slides as a PDF for a LinkedIn
document post, the stories (`story-*.png`, 1080 × 1920), a silent Reel / TikTok / YouTube Short (`reel.mp4`)
and its cover. Needs Node, Playwright with Chromium, and ffmpeg (all already on the cloud machine; on your own
computer: `npm i -g playwright && npx playwright install chromium`, and ffmpeg from ffmpeg.org).
The site itself still has no build step: this folder is a tool, nothing on the website loads it.

QR codes: `python3 tools/make_qr.py "https://aivancity-tech-club.github.io/event?d=DATE&src=ig" tools/content-studio/posts/qr-DATE.svg --light`
(`pip install segno`). Scan it with an iPhone and an Android before posting.

## Rules for every post
- **French only**, with "vous". Plain and friendly, no exclamation-mark spam.
- **Only true facts**: dates, times, rooms, language and topics come from `assets/schedule.js` or the event;
  points from `rules/rules.yaml`. Never invent a speaker, a number, a photo, a quote or a partner.
- The session language is always stated (e.g. "Séance en anglais").
- Links carry where they were posted: `&src=ig`, `li`, `tt`, `yt`, `wa`, `mail`.
- A post for a local business or sponsor in exchange for something says **"Collaboration commerciale"**.
- Every image gets a French alt text.

## Where the files go
The agent puts each post in Google Drive, `Tech Club Agents / 01 To approve / DATE name`, with the texts as a Google Doc.
An organizer reads it, posts it (Meta Business Suite, LinkedIn, TikTok), then moves the folder to `02 Published`.
