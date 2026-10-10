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
2. **Document ID:** your school email in lower case, e.g. `REDACTED`.
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

## 8. Every Thursday: the check-in code
Until the organizer screens are built (next step of the project), create the code in the console:
1. **Firestore → Data → Start collection** (first time) named `checkinCodes`.
2. **Add document** with the code as the **Document ID**, for example `K7Q2`, and these fields:
   - `date` (string): `2026-10-15`
   - `validFrom` (timestamp): that day, 13:00
   - `validUntil` (timestamp): that day, 14:15
   - `double` (boolean): `false`
3. Show the code on the projector. Members type it in **My climb → Thursday check-in**.

## How the data is protected
- Only verified `@aivancity.education` accounts **on the club roster** can read anything.
- Members can only add their own check-in (with a valid code, during the session) and their own proof submissions, which start as **pending**.
- Organizers can record results and approve or reject submissions, but never for themselves.
- Nothing is ever deleted. Corrections are new records, so the history stays complete.
- Email addresses live in a separate `private` collection that only the person and organizers can read.
- Points are never stored. Every page recalculates them from the facts and `rules/rules.yaml`.
