# Inspiration extension: Instagram saves → the club's Inspiration library

When you **save (bookmark) a post on instagram.com** in Chrome, its link and author are added to the club's
Inspiration library (Drive › 03 Marketing › Inspiration › *Inspiration library*, tab *Reels*). The Video Lead
studies each new row (the author's numbers through the official API, then the patterns).

It runs in your own browser and only reacts to **your** click on Save. It does not log in, scrape or click anything
for you. It works on a computer (Chrome, Edge, Brave). In the phone app, keep saving as usual; those don't sync.

## 1. The club script (once, by one organizer, 5 minutes)
1. https://script.google.com → **New project** → name it "Tech Club inspiration inbox".
2. Replace `Code.gs` with [`apps-script/Code.gs`](apps-script/Code.gs) → **Save**.
3. **Project Settings** (gear) → **Script properties** → add `CLUB_KEY` = a long password you make up
   (share it only with the team).
4. **Deploy → New deployment** → type **Web app** → Execute as **Me**, Who has access **Anyone** → **Deploy**,
   allow the permissions, and copy the **Web app URL** (ends in `/exec`).

## 2. The extension (each team member, 2 minutes)
1. Get the `extension` folder: from Drive (*Inspiration › tech-club-inspiration-extension.zip*, then unzip) or this repository.
2. In Chrome: `chrome://extensions` → turn on **Developer mode** (top right) → **Load unpacked** → choose the `extension` folder.
3. Click the extension's icon (pin it from the puzzle-piece menu) → paste the **Web app URL**, the **club key** and
   your first name → **Enregistrer**.
4. Save any post on instagram.com: "Envoyé au club ✓" appears at the bottom of the page.

If Instagram changes its page and saves stop being detected, the toast stops appearing: tell an organizer.
