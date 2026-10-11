/* Platform settings.
   While FIREBASE is null, /mountain runs in demo mode with sample members (nothing is saved online).
   To go live, paste the config object from Firebase console → Project settings → Your apps → Web app.
   See FIREBASE_SETUP.md. */
window.CLUB_PLATFORM = {
  FIREBASE: {
    apiKey: "AIzaSyABsBdYzjzIi7CkTPliPdQ2WruW8PU4UU0",
    authDomain: "aivancity-tech-club.firebaseapp.com",
    projectId: "aivancity-tech-club",
    storageBucket: "aivancity-tech-club.firebasestorage.app",
    messagingSenderId: "140910640539",
    appId: "1:140910640539:web:ab870ebff27702e29a753e",
  },
  /* FIREBASE: {
       apiKey: "…", authDomain: "….firebaseapp.com", projectId: "…",
       storageBucket: "….appspot.com", messagingSenderId: "…", appId: "…"
     }, */
  EMAIL_DOMAIN: "aivancity.education",
  /* "Sign in with Microsoft" (school accounts). Leave null to hide the button.
     When the app is registered (see FIREBASE_SETUP.md, step 2b), set it to:
     MICROSOFT: { tenant: "the Directory (tenant) ID from the Microsoft app's Overview page" }, */
  MICROSOFT: null,
};
