# Inspiration extension: send what inspires you to the club's agents

Everything goes to the **Inspiration library** (Drive › 03 Marketing › Inspiration › *Inspiration library*), which
the Video Lead and the Head of Growth check every day. Three ways to send something:

| You do | What arrives |
|---|---|
| **Save (bookmark) a post on instagram.com** | Its link and author (the agent then gets the author's numbers through the official API) |
| **Right-click** an image, a video, a link or any page → **Envoyer au Tech Club** (any site: TikTok, YouTube, LinkedIn, Pinterest…) | The link, and for an image the image itself, saved in the Inspiration folder |
| **Click the extension's icon** (or **Alt+Shift+S**) | The page you are on, with an optional note: why you like it |

It runs in your own browser and only acts when **you** save, right-click or click. It does not log in anywhere,
scrape or click anything for you. Computer only (Chrome, Edge, Brave); phone apps can't run extensions.

## 1. The club script (once, by one organizer, 5 minutes)
1. https://script.google.com → **New project** → name it "Tech Club inspiration inbox".
2. Replace `Code.gs` with [`apps-script/Code.gs`](apps-script/Code.gs) → **Save**.
3. **Project Settings** (gear) → **Script properties** → **Add** `CLUB_KEY` = a long password you make up
   (share it only with the team).
4. **Deploy → New deployment** → gear → **Web app** → Execute as **Me**, Who has access **Anyone** → **Deploy**.
   Allow the permissions (Advanced → Go to … → Allow: it needs the sheet and the Inspiration folder).
   Copy the **Web app URL** (ends in `/exec`).
5. Later changes to `Code.gs`: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy** (the URL stays the same).

## 2. The extension (each team member, 2 minutes)
1. Download *tech-club-inspiration-extension.zip* from Drive › 03 Marketing › Inspiration and **unzip it**.
2. Chrome → `chrome://extensions` → turn on **Developer mode** (top right) → **Load unpacked** → choose the unzipped folder.
3. Puzzle-piece icon → **pin** "Tech Club · Inspiration". Right-click its icon → **Options** → paste the **Web app URL**,
   the **club key** and your first name → **Enregistrer**.
4. Try it: right-click any image → **Envoyer au Tech Club**. A ✓ appears on the icon; a new row appears in the library.

A **!** on the icon means it wasn't sent (wrong key or address: check Options). If Instagram changes its page and
saves stop showing "Envoyé au club ✓", right-click still works; tell an organizer.
