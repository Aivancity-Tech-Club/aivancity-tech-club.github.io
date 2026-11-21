# Club data snapshot (free)

Gives the agents the club's member and attendance data without giving them the database.

Every morning a small Google Apps Script reads the database (read only) and rewrites a Google Sheet,
**Club data snapshot**, in Drive › Tech Club Agents › 08 Data:

| Tab | What's in it |
|---|---|
| **Summary** | Members, new members, check-ins at the last session, how many are drifting, never came, or have no buddy |
| **Members** | One row each: name, bandana, points, next bandana, badges, check-ins, first and last check-in, buddies, and a **follow-up** tag (`drifting`, `never came`, `newcomer without a buddy`) |
| **Sessions** | Check-ins per day, with what was on the schedule |
| **Registrations** | Per event: confirmed, pending, waitlist, cancelled, and the check-ins that day |
| **Votes** | Votes per session and choice |

Points come from the site's own engine and `rules/rules.yaml`, so they match the Mountain.
**No email address and no phone number is written to the sheet.** It writes nothing in the database.
A "session" here is a day with at least one check-in (Pulse uses the Thursdays in `schedule.js`, so its
"drifting" list can differ when a Thursday had no session).

## Set it up (about 10 minutes, once)

1. Sign in to Google with **the account that owns the Firebase project** (the same one as Climb Coach).
2. Share the Drive folder **Tech Club Agents › 08 Data** with that account as **editor** (skip if it is the same account).
3. https://script.google.com → **New project** → name it "Tech Club data snapshot".
4. **Project Settings** (gear) → tick **Show "appsscript.json" manifest file in editor**.
5. In **Editor**, replace `appsscript.json` with [`appsscript.json`](appsscript.json) and `Code.gs` with [`Code.gs`](Code.gs). **Save**.
6. Pick **`run`** in the function menu → **Run**. Allow the permissions (Advanced → Go to … → Allow).
   The log shows the sheet's address. Open it and check it looks right.
7. Pick **`setup`** → **Run**: from now on it refreshes every morning around 6:00.

**Stop:** Triggers (clock icon) → delete `run`. **Errors:** see Executions; the fixes are the same as in
`tools/buddy-emails/README.md` ("If something goes wrong").
