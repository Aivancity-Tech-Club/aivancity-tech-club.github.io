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
  /* How new accounts are confirmed:
     "organizer" = no confirmation email; a new account waits until an organizer approves it on /pulse.
                   Use this while the school's email blocks our messages.
     "email"     = the usual confirmation email. */
  CONFIRM: "organizer",
  /* "Sign in with Microsoft" (school accounts). Leave null to hide the button.
     When the app is registered (see FIREBASE_SETUP.md, step 2b), set it to:
     MICROSOFT: { tenant: "the Directory (tenant) ID from the Microsoft app's Overview page" }, */
  MICROSOFT: null,
  /* App Check: only the real site (not scripts or copies of it) can use the database. Free on the Spark plan.
     null = off. To turn it on, paste the reCAPTCHA v3 SITE key here (see FIREBASE_SETUP.md, step 9), e.g.
     APP_CHECK: "6Lc…", */
  APP_CHECK: null,
};

/* ----- Nothing to edit below: loads Firebase once per page (with App Check when it's on). ----- */
(function () {
  const C = window.CLUB_PLATFORM, base = 'https://www.gstatic.com/firebasejs/10.12.2/', loaded = {};
  const load = (n) => loaded[n] || (loaded[n] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = base + 'firebase-' + n + '-compat.js';
    s.onload = res; s.onerror = () => rej(new Error('Could not load ' + s.src)); document.head.appendChild(s);
  }));
  let started = false;
  // parts: e.g. ['auth', 'firestore']; returns the firebase namespace, ready to use
  C.loadFirebase = async (parts = []) => {
    await load('app');
    await Promise.all(parts.concat(C.APP_CHECK ? ['app-check'] : []).map(load));
    if (!started) {
      started = true;
      if (!firebase.apps.length) firebase.initializeApp(C.FIREBASE);
      if (C.APP_CHECK) {
        // on your own computer, the console prints a debug token to add in Firebase console → App Check → Manage debug tokens
        if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        firebase.appCheck().activate(C.APP_CHECK, true);
      }
    }
    return firebase;
  };
  // headers for the public REST reads (the schedule): App Check's token when it's on
  C.appCheckHeaders = async () => {
    if (!C.APP_CHECK || !C.FIREBASE) return {};
    try { await C.loadFirebase(); const t = await firebase.appCheck().getToken(); return { 'X-Firebase-AppCheck': t.token }; } catch (e) { return {}; }
  };
})();
