/* Data layer for /mountain.
   Two backends with the same functions:
   - demo:     sample members kept in this browser only (used while config.js has no Firebase settings)
   - firebase: email-link sign-in for @aivancity.education, Firestore with an offline cache
   Facts are only ever added, never edited by members; points are always recomputed by engine.js. */
(function () {
'use strict';
const CFG = window.CLUB_PLATFORM || {};
const DOMAIN = (CFG.EMAIL_DOMAIN || 'aivancity.education').toLowerCase();
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
const SUBMIT_TYPES = ['ship_project', 'open_source', 'skill_badge', 'certification', 'mentoring'];
/* Messages go through I18N when the page loaded it (English otherwise). */
const tr = (k, en, v) => { if (window.I18N) { const x = I18N.t(k, v); if (x !== k) return x; } return en; };
const PHONE_RE = /^\+?[0-9 ().-]{6,20}$/;
const validEmail = (e) => new RegExp('^[^@\\s]+@' + DOMAIN.replace(/\./g, '\\.') + '$', 'i').test(String(e || '').trim());

/* ================= demo backend ================= */
function demoSeed() {
  const M = (uid, name, accessories) => ({ uid, name, accessories, github: '', role: 'member', joined: '2026-09-18' });
  const members = [
    M('lucas', 'Lucas M.', ['crown']), M('sofia', 'Sofia R.', ['glasses']), M('yanis', 'Yanis B.', ['headphones']),
    M('ines', 'Inès D.', ['flower']), M('theo', 'Théo L.', ['cap']), M('karim', 'Karim H.', ['party']), M('lea', 'Léa P.', []),
    M('noah', 'Noah T.', ['catears']), M('maya', 'Maya S.', []), M('hugo', 'Hugo V.', ['mustache']), M('zoe', 'Zoé F.', ['shades']),
    M('adam', 'Adam K.', ['beanie']), M('jade', 'Jade W.', []), M('omar', 'Omar S.', ['beard']),
  ];
  members.find(m => m.uid === 'lucas').role = 'organizer'; members.find(m => m.uid === 'sofia').role = 'organizer';
  const S = ['2026-09-24', '2026-10-01', '2026-10-08'];
  const F = []; let n = 0; const add = (uid, type, date, extra = {}) => F.push({ id: 'd' + (++n), uid, type, date, status: 'approved', ...extra });
  const attendAll = (uid, k = 3) => S.slice(0, k).forEach(d => add(uid, 'attend', d));
  ['lucas', 'sofia', 'yanis', 'ines', 'theo', 'noah', 'maya', 'hugo', 'zoe', 'adam', 'omar'].forEach(u => attendAll(u));
  ['karim', 'jade'].forEach(u => attendAll(u, 2)); add('lea', 'attend', '2026-10-08');
  // the September hackathon
  ['lucas', 'sofia', 'yanis', 'noah', 'zoe', 'hugo', 'adam', 'ines'].forEach(u => add(u, 'compete_enter', '2026-09-18', { double: true }));
  add('lucas', 'compete_place', '2026-09-18', { place: 1, team: true, double: true }); add('noah', 'compete_place', '2026-09-18', { place: 1, team: true, double: true });
  add('sofia', 'compete_place', '2026-09-18', { place: 2, team: true, double: true }); add('zoe', 'compete_place', '2026-09-18', { place: 2, team: true, double: true });
  add('yanis', 'compete_place', '2026-09-18', { place: 3, team: true, double: true });
  add('lucas', 'talk_lightning', '2026-09-24'); add('noah', 'talk_lightning', '2026-09-24'); add('sofia', 'talk_lightning', '2026-09-24');
  add('lucas', 'workshop', '2026-10-01'); add('lucas', 'ship_project', '2026-09-24', { proof: 'https://github.com/example/hackathon-app' });
  add('sofia', 'certification', '2026-10-03', { proof: 'https://www.credly.com/badges/example' });
  add('zoe', 'certification', '2026-10-05', { proof: 'https://www.credly.com/badges/example2' });
  add('noah', 'skill_badge', '2026-10-02', { proof: 'https://www.cloudskillsboost.google/public_profiles/example' });
  add('lucas', 'skill_badge', '2026-10-06', { proof: 'https://www.cloudskillsboost.google/public_profiles/example' });
  add('hugo', 'open_source', '2026-10-04', { proof: 'https://github.com/example/lib/pull/1', status: 'pending' });
  // you, in the demo
  const me = { uid: 'you', name: 'You (demo)', accessories: ['beanie', 'glasses'], github: '', role: 'member', joined: '2026-09-24' };
  members.push(me); attendAll('you'); add('you', 'compete_enter', '2026-09-18', { double: true });
  add('you', 'skill_badge', '2026-10-07', { proof: 'https://www.cloudskillsboost.google/public_profiles/you' });
  return { members, facts: F };
}
function demoBackend() {
  let state = store.get('nw-demo-v1') || demoSeed();
  const save = () => store.set('nw-demo-v1', state);
  const user = { uid: 'you', email: 'you@' + DOMAIN, demo: true };
  return {
    mode: 'demo',
    async init() {}, onAuth(cb) { cb(user); },
    async sendLink() { return { ok: true }; }, async signOut() { store.del('nw-demo-v1'); state = demoSeed(); },
    async onRoster() { return true; }, async requestStatus() { return store.get('nw-demo-req'); },
    async apply(d) { store.set('nw-demo-req', { ...d, email: user.email }); return { ok: true }; },
    async inviteLink() { return null; },
    async sendFeedback() { return { ok: true, demo: true }; },
    async loadMembers() { return state.members; }, async loadFacts() { return state.facts; },
    async getProfile(uid) { return state.members.find(m => m.uid === uid) || null; },
    async saveProfile(p) { Object.assign(state.members.find(m => m.uid === 'you'), p); save(); },
    async saveLook(acc) { state.members.find(m => m.uid === 'you').accessories = acc; save(); },
    async checkIn(code) {
      const date = todayStr();
      if (String(code).trim().toUpperCase() !== 'DEMO') return { ok: false, message: tr('m.checkin.demo', 'That code does not match this session. In the demo, use DEMO.') };
      if (state.facts.some(f => f.uid === 'you' && f.type === 'attend' && f.date === date)) return { ok: false, message: tr('m.checkin.dup', 'You already checked in today.') };
      state.facts.push({ id: 'd' + Date.now(), uid: 'you', type: 'attend', date, status: 'approved' }); save();
      return { ok: true, message: tr('m.checkin.ok', 'Checked in. +1 point.') };
    },
    async submit(s) {
      if (!SUBMIT_TYPES.includes(s.type)) return { ok: false, message: tr('m.proof.badtype', 'That kind of proof is not on the list.') };
      state.facts.push({ id: 'd' + Date.now(), uid: 'you', date: todayStr(), status: 'pending', ...s }); save();
      return { ok: true, message: tr('m.proof.ok', 'Sent. An organizer will check it within 7 days.') };
    },
    reset() { store.del('nw-demo-v1'); state = demoSeed(); },
  };
}

/* ================= Firebase backend ================= */
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
function linkErrorText(e) {
  const c = (e && e.code) || '';
  if (c.includes('invalid-action-code') || c.includes('expired-action-code')) return tr('err.link.expired', 'That sign-in link has expired or was already used. Request a new one below and open it right away.');
  if (c.includes('invalid-email')) return tr('err.link.email', 'The email in the link does not match. Request a new link from this browser.');
  if ((e && e.message || '').includes('referer') || c.includes('api-key')) return tr('err.link.key', 'Sign-in is blocked by the API key settings. If you just changed them, wait 5 minutes and try again.');
  const why = c || (e && e.message) || 'unknown error';
  return tr('err.link.other', 'Sign-in did not finish (' + why + '). Request a new link and try again.', { e: why });
}
function firebaseBackend() {
  let auth, db;
  const V = '10.12.2', base = 'https://www.gstatic.com/firebasejs/' + V + '/';
  return {
    mode: 'firebase',
    async init() {
      await loadScript(base + 'firebase-app-compat.js');
      await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-firestore-compat.js')]);
      firebase.initializeApp(CFG.FIREBASE);
      auth = firebase.auth(); db = firebase.firestore();
      try { await db.enablePersistence({ synchronizeTabs: true }); } catch (e) { /* private mode or another tab: online only */ }
      if (auth.isSignInWithEmailLink(location.href)) {
        let email = store.get('nw-email');
        // If the link was opened on another device, the page asks for the email (see completeLink).
        if (email) {
          try { await auth.signInWithEmailLink(email, location.href); store.del('nw-email'); }
          catch (e) { this.linkError = linkErrorText(e); }
          history.replaceState(null, '', location.pathname);
        } else this.pendingLink = location.href;
      }
    },
    async completeLink(email) {
      if (!validEmail(email)) throw new Error(tr('err.email', 'Use your @' + DOMAIN + ' school email.', { d: DOMAIN }));
      await auth.signInWithEmailLink(email.trim(), this.pendingLink); this.pendingLink = null; history.replaceState(null, '', location.pathname);
    },
    onAuth(cb) { auth.onAuthStateChanged(u => cb(u ? { uid: u.uid, email: u.email } : null)); },
    async sendLink(email) {
      if (!validEmail(email)) return { ok: false, message: tr('err.email', 'Use your @' + DOMAIN + ' school email.', { d: DOMAIN }) };
      try { await auth.sendSignInLinkToEmail(email.trim(), { url: location.origin + location.pathname, handleCodeInApp: true }); }
      catch (e) { return { ok: false, message: linkErrorText(e) }; }
      store.set('nw-email', email.trim());
      return { ok: true, message: tr('m.signin.sent', 'Check your inbox: we sent a sign-in link to ' + email.trim() + '.', { email: email.trim() }) };
    },
    async signOut() { await auth.signOut(); },
    /* Member = on the roster (added by an organizer) OR sent the /apply form, unless an organizer set status "removed". */
    async onRoster() {
      const u = auth.currentUser, em = (u.email || '').toLowerCase();
      const read = async (ref) => { try { return await ref.get({ source: 'server' }); } catch (e) { try { return await ref.get(); } catch (e2) { return null; } } };
      const r = await read(db.collection('roster').doc(em));
      if (r && r.exists) return true;
      const q = await read(db.collection('requests').doc(u.uid));
      return !!(q && q.exists && q.data().status !== 'removed');
    },
    async requestStatus() { try { const d = await db.collection('requests').doc(auth.currentUser.uid).get(); return d.exists ? d.data() : null; } catch (e) { return null; } },
    /* Application to join the club (and its WhatsApp group). Only the person and organizers can read it. */
    async apply(d) {
      const u = auth.currentUser;
      const doc = { email: u.email.toLowerCase(), name: d.name, program: d.program || '', phone: d.phone, interests: d.interests || [],
        level: d.level, heard: d.heard || '', consent: true, lang: d.lang === 'fr' ? 'fr' : 'en', at: firebase.firestore.FieldValue.serverTimestamp() };
      try { await db.collection('requests').doc(u.uid).set(doc, { merge: true }); return { ok: true }; }
      catch (e) { return { ok: false, message: tr('err.generic', 'Something went wrong. Try again in a moment.') + ' (' + (e.code || e.message) + ')' }; }
    },
    /* The WhatsApp invite link lives in Firestore (invites/whatsapp), not in this public repository.
       The rules only let people who applied, or who are on the roster, read it. */
    async inviteLink() {
      try { const d = await db.collection('invites').doc('whatsapp').get({ source: 'server' }); return d.exists ? (d.data().link || null) : null; }
      catch (e) { return null; }
    },
    async sendFeedback(f) {
      const doc = { topic: f.topic, message: f.message, lang: f.lang === 'fr' ? 'fr' : 'en', createdAt: firebase.firestore.FieldValue.serverTimestamp() };
      if (f.rating) doc.rating = f.rating;
      if (f.contact) doc.contact = f.contact;
      try { await db.collection('feedback').add(doc); return { ok: true }; }
      catch (e) { return { ok: false, message: tr('err.generic', 'Something went wrong. Try again in a moment.') + ' (' + (e.code || e.message) + ')' }; }
    },
    async loadMembers() { const s = await db.collection('members').get(); return s.docs.map(d => ({ uid: d.id, ...d.data() })); },
    async loadFacts() { const s = await db.collection('facts').get(); return s.docs.map(d => ({ id: d.id, ...d.data() })); },
    async getProfile(uid) { const d = await db.collection('members').doc(uid).get(); return d.exists ? { uid, ...d.data() } : null; },
    async saveProfile(p) {
      const uid = auth.currentUser.uid, ref = db.collection('members').doc(uid), doc = await ref.get();
      if (doc.exists) await ref.update({ name: p.name, github: p.github || '' });
      else {
        await ref.set({ name: p.name, github: p.github || '', accessories: [], consent: true, joined: firebase.firestore.FieldValue.serverTimestamp() });
        await db.collection('private').doc(uid).set({ email: auth.currentUser.email });
      }
    },
    async saveLook(acc) { await db.collection('members').doc(auth.currentUser.uid).update({ accessories: acc }); },
    async checkIn(code) {
      const uid = auth.currentUser.uid, date = todayStr(), c = String(code).trim().toUpperCase();
      try {
        await db.collection('facts').doc(uid + '_' + date).set({ uid, type: 'attend', date, code: c, status: 'approved', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        return { ok: true, message: tr('m.checkin.ok', 'Checked in. +1 point.') };
      } catch (e) {
        return { ok: false, message: tr('m.checkin.bad', 'That code did not work. Check it on the screen, and note codes only work during the session.') };
      }
    },
    async submit(s) {
      if (!SUBMIT_TYPES.includes(s.type)) return { ok: false, message: tr('m.proof.badtype', 'That kind of proof is not on the list.') };
      const uid = auth.currentUser.uid;
      await db.collection('facts').add({ uid, date: todayStr(), status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp(), ...s });
      return { ok: true, message: tr('m.proof.ok', 'Sent. An organizer will check it within 7 days.') };
    },
  };
}

window.ClubData = { create: () => (CFG.FIREBASE ? firebaseBackend() : demoBackend()), validEmail, validPhone: (p) => PHONE_RE.test(String(p || '').trim()), DOMAIN, SUBMIT_TYPES, todayStr };
})();
