# Climb Coach (free)

Every two weeks, each member gets a short personal email:

- their bandana and points, and exactly what's missing for the next bandana;
- in French or English: the language of their class on the school's student list (`_FR` / `_EN`), else the language
  the site was in when they joined;
- one idea for the next two weeks, for the step they need most, plus one matched to their interests;
- a buddy request waiting for them, if any;
- the next session.

**Nothing goes to members without an organizer's OK.** Every 14 days the organizers in `REVIEWERS` first get a review
email with **every email attached** as a spreadsheet file (opens in Excel or Google Sheets: name, email, language,
subject, full text). To leave someone out, click the link in the last column of their row. Then **Approve and send**:
exactly the emails in the file go out a few minutes later. Or **Skip this round**.

The organizer in `ADMIN` (top of `Code.gs`) also gets a digest after each round: **who moved up a bandana** (for the
public shout-out) and who has no email on file. Members can turn the emails off with the link at the bottom.

Points come from the site's own engine and rules, fetched from the live site, so the email always matches the
Mountain. Change `rules/rules.yaml` and the next round follows it.

It's a Google Apps Script under the club's Google account, like the buddy emails: free, no Firebase upgrade.
Gmail allows about 100 emails a day on a normal account; if there are more members, the rest go out the next day
(it keeps 20 a day free for the buddy emails).

## Set it up (about 15 minutes, once)

1. Sign in to Google with **the account that owns the Firebase project** (the same one as the buddy emails).
2. **https://script.google.com** → **New project** → name it "Tech Club climb coach".
3. **Project Settings** (gear) → tick **Show "appsscript.json" manifest file in editor**.
4. In **Editor**, replace `appsscript.json` with [`appsscript.json`](appsscript.json), and `Code.gs` with [`Code.gs`](Code.gs). **Save**.
5. Pick **`preview`** in the function menu → **Run**. Allow the permissions (Advanced → Go to … (unsafe) → Allow).
   `ADMIN` gets what three members would receive. Nobody else gets anything. Change the text in `TEXT` if needed.
6. **Deploy → New deployment** → type **Web app** → Execute as **Me**, Who has access **Anyone** → **Deploy**.
   Copy the **Web app URL** (it ends in `/exec`) and paste it into `WEBAPP_URL` at the top of `Code.gs`, then **Save**.
   This makes the "turn these emails off" link work. Test it in a private window.
7. Pick **`setup`** → **Run**. At the next 9:00 run the reviewers get the first round to check; then every 14 days.

Check it in **Triggers** (clock icon: a daily `run`) and **Executions**.

## Change or stop it

- **Stop:** Triggers → delete `run`. **Start again:** run `setup`.
- **Who checks each round:** `REVIEWERS` (any one can approve). **Who gets the digest:** `ADMIN`. **How often:** `EVERY_DAYS`.
- **Missed the review email?** Nothing goes out; the next round's review replaces it after 14 days.
- **Someone wants the emails back:** the confirmation page after "turn off" has a link to turn them back on.

## What it touches

- **Reads:** `members`, `facts`, `private` (email), `requests` (language, interests), `buddies`, `directory` (class language), and the site's
  `rules/rules.yaml`, `assets/platform/engine.js`, `assets/schedule.js`.
- **Writes:** nothing in the database. It remembers what it sent, the last bandanas and who turned the emails off
  in the script's own properties.

## Points news (a short email when an organizer gives points)

Same script, same sender, same review. When an organizer gives someone points (Pulse → **Give points**,
**Mark people present**, an approved proof, a confirmed Village board mission), that person gets a short email:
what they got and why, their new total and bandana, in their language. Points members earn by themselves
(check-in code, starter steps, buddy sessions) are not announced: they see those right away.

- Every day around **18:00** (Paris), it looks for points given since the last emails. Nothing new: nobody gets anything.
- Something new: the `REVIEWERS` get **"To check: N points emails"** with one line per person, a **Leave out** link
  each, and **Approve and send** / **Skip these**. Members get nothing until someone approves.
- While a check is waiting for an answer, no new one starts; points given meanwhile come in the next one.
- A wrong amount? **Leave out** that person, fix it on Pulse, and the corrected points come in the next check.
- Members can turn these off separately from the Climb Coach (link at the bottom).

### Turn it on (5 minutes)

1. In the Apps Script project, replace `Code.gs` with the new [`Code.gs`](Code.gs). **Save**.
2. **Deploy → Manage deployments** → pencil icon → Version: **New version** → **Deploy**. The web address stays the same.
   (Needed because the links in these emails are new.)
3. Pick **`pointsPreview`** → **Run**: `ADMIN` gets what up to three members would receive for points given in the last 7 days.
4. Pick **`pointsSetup`** → **Run**. The first check (today around 18:00) covers the last 7 days.

**Stop:** Triggers → delete `pointsRun`. **Change the hour:** `POINTS_HOUR`, then run `pointsSetup` again.
