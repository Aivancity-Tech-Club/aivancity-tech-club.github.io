# Turning on the Mountain (Firebase setup)

After any change to `firestore.rules`, paste it into **Firestore → Rules** again and **Publish**.

Until these steps are done, `/mountain` runs in **demo mode**: sample members, saved only in your own browser.
Firebase's free plan (Spark) covers a club of this size. No credit card needed.

Takes about 15 minutes. Do it signed in with a Google account the club will keep (not a personal one that leaves with you).

## 1. Create the project
1. Go to https://console.firebase.google.com and click **Create a project**.
2. Name it `aivancity-tech-club`. You can turn Google Analytics off.

## 2. Turn on email-link sign-in
1. **Build → Authentication → Get started**.
2. **Sign-in method → Email/Password → Enable**, then also turn on **Email link (passwordless sign-in)**. Save.
3. **Settings → Authorized domains → Add domain:** `aivancity-tech-club.github.io`

## 2a. How members sign in
Members sign in with their **school email and a password**. Creating an account sends one confirmation email
(the free plan allows 1,000 a day); signing in sends none. "Forgot your password?" sends a reset email (150 a day).
Email sign-in *links* are no longer offered: the free plan only allows 5 of those per day for the whole project.
Nothing to change in the console: Email/Password is the provider that was already switched on in step 2.
Emails are sent through the club Gmail (**aivancitytechclub@gmail.com**): Authentication → Templates → SMTP settings,
with a Google app password. If that password is ever revoked, emails stop until a new one is pasted there.

## 2b. Sign in with Microsoft (recommended for school accounts)
School email security can use up one-time email links before students click them. Signing in with the
school's Microsoft account avoids email entirely. Do this once, signed in with your **@aivancity.education** account:

1. Go to https://entra.microsoft.com → **Applications → App registrations → New registration**.
   - **Name:** `aivancity Tech Club`
   - **Supported account types:** **Accounts in this organizational directory only (single tenant)**.
     This matters: it makes Microsoft itself refuse anyone outside aivancity.
   - **Redirect URI:** platform **Web**, value `https://aivancity-tech-club.firebaseapp.com/__/auth/handler`
   - Click **Register**.
2. On the app's **Overview** page, copy the **Application (client) ID** and the **Directory (tenant) ID**.
3. **Certificates & secrets → New client secret** → any description, 24 months → **Add**, then copy the secret's **Value**
   right away (it's only shown once). Put a reminder in your calendar to renew it before it expires.
4. **Token configuration → Add optional claim → ID → email → Add** (accept the Microsoft Graph prompt if asked).
5. In Firebase: **Authentication → Sign-in method → Add new provider → Microsoft** → enable it, paste the
   **client ID** and the secret **Value** → **Save**.
6. In `assets/platform/config.js`, replace `MICROSOFT: null,` with
   `MICROSOFT: { tenant: "the Directory (tenant) ID" },` then commit and push.
   The "Sign in with Microsoft" button appears on `/apply` and `/mountain`. The email link stays as a backup.

If step 1 says you're not allowed to register apps, or students see **"Need admin approval"** when they sign in,
the school's IT has to allow it once (they approve the app for the whole school).

## 3. Create the database
1. **Build → Firestore Database → Create database**.
2. Location: **eur3 (europe-west)** so member data stays in the EU.
3. Start in **production mode**.
4. Open the **Rules** tab, replace everything with the contents of `firestore.rules` from this repository, and click **Publish**.

## 4. Connect the website
1. **Project settings (gear icon) → General → Your apps → Web (`</>`)**. Name it `website`. Skip hosting.
2. Copy the `firebaseConfig` object it shows.
3. Open `assets/platform/config.js`, replace `FIREBASE: null,` with `FIREBASE: { ...the values you copied... },`
4. Commit and push. These values are safe to publish: they identify the project, and the security rules decide who can read or write.

## 5. Who is a member
The Mountain is members only. A verified `@aivancity.education` account becomes a member **automatically when it sends the
`/apply` form**. Organizers can also add people by hand with the **roster** (useful for yourself and other organizers).

**Add yourself first** (you need to be on the roster to do anything else):
1. **Firestore Database → Data → Start collection** named `roster`.
2. **Document ID:** your full school email address, in lower case.
3. Add a field `addedBy` (string) with your name, then **Save**.

**Make yourself an organizer:** sign in at `/mountain`, create your profile, then open
**members → your document** and add the field `role` (string) = `organizer`.

**Adding someone by hand:** add one `roster` document per member email, the same way.
**Removing someone:** delete their `roster` document (if any) and, in `requests`, set `status` (string) = `removed` on theirs.
They lose access straight away; their history stays in the log, and they can't re-apply on their own.

## 6. Joining the WhatsApp group (the `/apply` form)
New people fill in the form at `/apply` (school email sign-in, then name, program, WhatsApp number, interests, level).
Their answers land in the `requests` collection, one document per person. Only organizers can read them.

**Set the invite link once** (it is never stored in this public repository):
1. In WhatsApp: **Group info → Group settings → Approve new participants → On.**
   Then **Group info → Invite via link** and copy the link.
2. **Firestore → Data → Start collection** named `invites`, **Document ID** `whatsapp`,
   field `link` (string) = the link you copied.

After sending the form, the person sees a **Join the WhatsApp group** button. Because approval is on,
an organizer still accepts each person inside WhatsApp, so the link is useless to anyone who skipped the form.
The link never expires, so there is nothing to renew. If it leaks, reset it in WhatsApp (**Invite via link → Reset link**) and paste the new one into `invites/whatsapp`.

Sending the form also makes the person a club member straight away: they can sign in at `/mountain`,
pick their display name and track their bandana and badges. Nobody has to add them to the roster.
Leave `invites/whatsapp` empty (or delete it) to switch to manual invites: the page then tells people an organizer will send the invite.

## 7. Feedback (the `/feedback` form)
Anyone can send feedback, signed in or not, anonymously unless they leave an email.
It lands in the `feedback` collection: topic, optional 1–5 rating, message, optional contact, language and time.
Only organizers can read it; nobody can edit it.

The organizer screens (next build) will turn all of this into buttons: approve requests, manage the roster, read feedback.

## 7b. The Village Board (`/village`)
Members post **missions** (Help or Build together), **events** and **open-source projects**, and comment on them.
Nothing to set up: it uses the `board` collection (comments live under each post) and the rules in `firestore.rules`.
- Missions pay what the rulebook says (Help = mentoring, Build = collab), capped by `missions.monthly_cap` in `rules/rules.yaml`.
- Points are written when the poster confirms. If a poster never confirms, an organizer can confirm from the board.
- Organizers see an "Elder view": they can hide or show any post or comment. A post or comment reported by 3 members
  disappears for everyone else until an organizer looks at it (hide it, or leave it).
- Mission types: Help (mentoring), Build together (collab) and Club work (club_quest). Build and Club work count from Spring 2027.
- **Theme of the week:** organizers post it from "New post" → "Theme of the week" (a Monday + up to 7 daily tasks).
  It's pinned at the top of the board during its week (or before, if it's the next one).
- **Post as the team:** organizers can pick "Organizing team" or "Council of Elders" as the author when they post.
  The details panel still says who posted it, so people know who to message.

## 7c. Keeping members coming back

- **Club pulse (`/pulse`, organizers only):** attendance per Thursday, who is drifting away (came twice or more, missed the
  last two Thursdays), who signed up but never came, and newcomers without a buddy. "Message on WhatsApp" opens a
  ready-made message using the phone number from their `/apply` form; "Mark as contacted" (collection `pulse`) tells the
  other organizers so nobody gets two messages. Organizers find the page in their profile menu.
- **Buddies:** "Post a buddy mission" puts a Help mission on the Village board in the name of the organizing team. The
  first member to take it is the newcomer's buddy; confirm it like any mission once they've met.
- **"I'm going" (collection `rsvps`) and votes (collection `votes`):** members only, one per person and session.
- **Votes on a planned session:** add a `vote` to the session in `assets/schedule.js`, for example
  `vote: { question: "What should this session be?", options: [{ id: "trivia", title: "Trivia Night" }, { id: "algo", title: "Algorithms" }] }`.
  Results show on `/pulse`; then replace the session's title with the winner.
- **Recaps:** after a session, add `recap: { link: "https://… slides or notes", task: "a 15-minute take-home task" }`
  to it in `assets/schedule.js`. Past sessions then show "Missed it? Catch up".
- **Camps (collection `camps`):** each member's own page (`/camp`), members only. Members can report a camp; organizers
  can hide it from the camp page.
- **Feedback:** the `/feedback` form has a "Why I stopped coming" topic; the drifting-away message links to it.

## 7d. Approving new accounts (no confirmation email for now)
The school's Microsoft email blocks our confirmation emails, so for now (`CONFIRM: "organizer"` in
`assets/platform/config.js`) nobody gets an email. A student creates an account (name, school email, password) and sees
"Waiting for approval". They appear at the top of **/pulse** under "New accounts to approve": **Approve** the people you know
are aivancity students (writes `confirmed/{uid}`); **Refuse** blocks the account (`blocked/{uid}`).
To go back to confirmation emails once the school allows aivancitytechclub@gmail.com, set `CONFIRM: "email"`.

## 7e. Events made on the site (no Google Forms)
Organizers create events on the site: **profile menu → Create an event** (or **/pulse → Events → New event**).
Fill in the title, date, time, place, a short description and the full details (English, and French if you like), then choose:
- **People must register to attend** (on or off), the **number of places** (empty = no limit; when full, people join a waiting list)
  and an optional **registration deadline**.
- **Show this event on the site** (untick to keep it as a draft only organizers see).
Each event gets its own page (`/event?id=…`) with all the details; share that link in the WhatsApp group.

**Registering:** anyone with an aivancity account can tap **I'm going**. Students who aren't members yet create an account
and fill in the short join form (WhatsApp number, level) on the event page itself. Members are confirmed straight away;
everyone else shows as **To confirm**. On the event page (organizers see a **Registrations** list) tap **Confirm**
(this also approves their account), **Move to waiting list** or **Remove**, or **Confirm all**. **Download CSV** gives the list.
Data: `events/{id}` (organizers write, everyone reads published ones) and `registrations/{eventId}_{uid}`
(status `pending`, `confirmed`, `waitlist` or `cancelled`; no names in it, so the site can show how many places are left).
Sessions written in `assets/schedule.js` also get a details page (`/event?d=YYYY-MM-DD`), and organizers can **edit** them
from that page (**Edit**): the changes are saved as event `d-YYYY-MM-DD` and replace the file's version on the site.
**Undo my changes** in the editor brings the original back.
**I'm going** shows on every upcoming session. Members tap it once; people who aren't members yet create an account,
join, and appear as **To confirm** in that session's registrations.

## 8. Every Thursday: the check-in code
An organizer opens **/checkin** (also in their profile menu, and on /pulse) on the laptop connected to the projector:
1. Pick how long the code works (1 hour by default) and tap **Show a check-in code**. A new random code appears in big letters,
   with a countdown and the number of people checked in.
2. Members type it on the Mountain: **My climb → Thursday check-in**. Each person can check in once per day.
3. **New code** replaces it (for example if it was shared outside the room); **End check-in** closes it early.
If the page is reloaded, the code that is still open today comes back.

## How the data is protected
- Only verified `@aivancity.education` accounts **on the club roster** can read anything.
- Members can only add their own check-in (with a valid code, during the session) and their own proof submissions, which start as **pending**.
- Organizers can record results and approve or reject submissions, but never for themselves.
- Nothing is ever deleted. Corrections are new records, so the history stays complete.
- Email addresses live in a separate `private` collection that only the person and organizers can read.
- Points are never stored. Every page recalculates them from the facts and `rules/rules.yaml`.
