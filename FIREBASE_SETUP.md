# Turning on the Mountain (Firebase setup)

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

## 5. Make the first organizers
1. Each organizer signs in once at `/mountain` and creates their profile.
2. In **Firestore Database → Data → members**, open their document and add a field `role` (string) = `organizer`.
   Members can't give themselves this role; only someone with console access can.

## 6. Every Thursday: the check-in code
Until the organizer screens are built (next step of the project), create the code in the console:
1. **Firestore → Data → Start collection** (first time) named `checkinCodes`.
2. **Add document** with the code as the **Document ID**, for example `K7Q2`, and these fields:
   - `date` (string): `2026-10-15`
   - `validFrom` (timestamp): that day, 13:00
   - `validUntil` (timestamp): that day, 14:15
   - `double` (boolean): `false`
3. Show the code on the projector. Members type it in **My climb → Thursday check-in**.

## How the data is protected
- Only verified `@aivancity.education` accounts can read anything.
- Members can only add their own check-in (with a valid code, during the session) and their own proof submissions, which start as **pending**.
- Organizers can record results and approve or reject submissions, but never for themselves.
- Nothing is ever deleted. Corrections are new records, so the history stays complete.
- Email addresses live in a separate `private` collection that only the person and organizers can read.
- Points are never stored. Every page recalculates them from the facts and `rules/rules.yaml`.
