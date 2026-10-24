# Buddy emails (free)

Emails members so they don't miss buddy news:

- **Someone asked them to be buddies**: with the sender's name and message.
- **Their request was accepted.**
- **Their buddy asked to end the pair**: it only ends if they agree.

It's a small Google Apps Script that runs every 10 minutes under the club's Google account. It's free, with no Firebase upgrade and no card.
Gmail allows about 100 emails a day on a normal Google account, which is plenty. Each email goes out once, in the person's
language (from their join form), from the club account's address with the name "aivancity Tech Club".

## Set it up (about 10 minutes, once)

1. **Sign in to Google with the account that owns the Firebase project** `aivancity-tech-club`. The script reads the
   database with that account's own access, so it must be an owner or editor of the project.
2. Open **https://script.google.com** → **New project**. Rename it "Tech Club buddy emails".
3. **Project Settings** (gear icon) → tick **Show "appsscript.json" manifest file in editor**.
4. Back in **Editor**, open `appsscript.json` and replace its content with the [`appsscript.json`](appsscript.json) from this folder.
5. Open `Code.gs` and replace its content with [`Code.gs`](Code.gs) from this folder. Click **Save**.
6. In the function menu at the top, pick **`testEmail`** and click **Run**.
   Google asks for permission. Pick the club account, then **Advanced** → **Go to Tech Club buddy emails (unsafe)** → **Allow**.
   The warning shows because the script is yours and not published. You should get a test email.
7. Pick **`setup`** and click **Run**. This starts the 10-minute timer. From now on, new requests, acceptances and
   "end the pair" requests get an email. Older ones don't.

To check that it's running, open **Triggers** (clock icon) for the timer and **Executions** for each run and any errors.

## Stop it or change it

- **Stop:** Triggers → delete the `run` trigger. To start again, run `setup`.
- **The site moved?** Change `SITE` at the top of `Code.gs`.

## If something goes wrong

- **"Firestore 403 … has not been used in project … / PERMISSION_DENIED"**: the account isn't an owner or editor of
  `aivancity-tech-club`. Use that account, or add this account in Firebase console → Project settings → Users and permissions.
- **"Firestore 403 … serviceusage"**: in Google Cloud console → IAM for `aivancity-tech-club`, give the account the role
  **Service Usage Consumer**. Owners already have it.
- **Nobody gets emails:** look at Executions. A person with no email on file is skipped, and the log says who.

## What it touches

- **Reads:** `buddies`, `members/{uid}` (name), `private/{uid}` (email), `requests/{uid}` (language).
- **Writes:** only `buddies/{id}.mailed`, a note of which emails went out. Nothing else changes.
- **Privacy:** addresses stay in the database and are only used to send these emails.
