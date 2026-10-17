/* Data layer for /mountain.
   Two backends with the same functions:
   - demo:     sample members kept in this browser only (used while config.js has no Firebase settings)
   - firebase: email-link sign-in for school accounts, Firestore with an offline cache
   Facts are only ever added, never edited by members; points are always recomputed by engine.js. */
(function () {
'use strict';
const CFG = window.CLUB_PLATFORM || {};
const DOMAIN = (CFG.EMAIL_DOMAIN || 'aivancity.education').toLowerCase();
const ORG_CONFIRM = CFG.CONFIRM === 'organizer';   // no confirmation email: organizers review new accounts
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
/* Events made on the site by organizers (events/{id}). Only these fields are saved. */
const EVENT_FORMATS = ['workshop', 'hackathon', 'competition', 'talk', 'trip', 'career', 'build', 'social', 'other'];
function cleanEvent(e) {
  const t = (v, n) => String(v == null ? '' : v).trim().slice(0, n), day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : '');
  return {
    title: t(e.title, 120), title_fr: t(e.title_fr, 120), date: day(e.date), time: t(e.time, 60), time_fr: t(e.time_fr, 60), room: t(e.room, 100),
    type: t(e.type, 60), type_fr: t(e.type_fr, 60), format: EVENT_FORMATS.includes(e.format) ? e.format : 'other',
    level: ['all', 'beginner', 'intermediate', 'advanced'].includes(e.level) ? e.level : 'all',
    lang: ['en', 'fr', 'both'].includes(e.lang) ? e.lang : 'en', track: ['tech', 'gdg', 'event'].includes(e.track) ? e.track : 'event',
    description: t(e.description, 300), description_fr: t(e.description_fr, 300), details: t(e.details, 5000), details_fr: t(e.details_fr, 5000),
    speaker: t(e.speaker, 120), link: /^https:\/\/\S+$/.test(t(e.link, 500)) ? t(e.link, 500) : '', linkText: t(e.linkText, 40),
    registration: !!e.registration, capacity: Math.max(0, Math.min(1000, parseInt(e.capacity, 10) || 0)), deadline: day(e.deadline), published: !!e.published,
  };
}
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
  const day = 864e5, now = Date.now();
  const boardSeed = () => ({ active: null, posts: [
    { id: 'p1', kind: 'mission', mtype: 'help', title: 'Explain React hooks before my project deadline', body: 'I get useState but useEffect keeps looping. 30 minutes on a call or after Thursday\'s session would save me.', link: '', by: 'lea', createdAt: now - 2 * day, hidden: false, reports: {}, status: 'open', takenBy: null, takenAt: null },
    { id: 'p2', kind: 'mission', mtype: 'build', title: 'Add a dark mode to our study-planner app', body: 'Flutter app, MIT licence. The theme switch is half done, I need someone to finish the colour tokens.', link: 'https://github.com/example/study-planner', by: 'ines', createdAt: now - 4 * day, hidden: false, reports: {}, status: 'taken', takenBy: 'hugo', takenAt: now - 3 * day },
    { id: 'p3', kind: 'event', title: 'DevFest Paris 2026', body: 'Google Developer Groups conference: talks on AI, Cloud and Android. Student tickets are cheaper.', link: 'https://gdg.community.dev/', by: 'sofia', createdAt: now - 5 * day, hidden: false, reports: {}, date: '2026-11-21', where: 'Paris' },
    { id: 'p4', kind: 'oss', title: 'First issues in a French open-data library', body: 'Good-first-issue labels, friendly maintainers, Python. Merged pull requests count as open-source points.', link: 'https://github.com/example/opendata-fr', by: 'lucas', createdAt: now - 6 * day, hidden: false, reports: {} },
    { id: 'p5', kind: 'mission', mtype: 'help', title: 'Review my first REST API', body: 'Express + SQLite, about 300 lines. Looking for feedback on structure and error handling.', link: '', by: 'you', createdAt: now - 1 * day, hidden: false, reports: {}, status: 'review', takenBy: 'noah', takenAt: now - day, doneAt: now - 3600e3 },
  ], comments: { p1: [{ id: 'c1', by: 'noah', text: 'I can do Thursday after the session if nobody takes it before.', createdAt: now - day, hidden: false, reports: {} }] } });
  const board = () => store.get('nw-demo-board-v1') || boardSeed();
  const saveBoard = (B) => store.set('nw-demo-board-v1', B);
  // demo extras: a few "going", a vote, two camps, applications (one person who never came)
  const extraSeed = () => {
    const up = (typeof SESSIONS !== 'undefined' ? SESSIONS : []).map(x => x.date).filter(d => d >= todayStr()).sort();
    const rsvps = up.length ? ['lucas', 'sofia', 'noah', 'ines', 'maya', 'zoe'].map(uid => ({ date: up[0], uid })) : [];
    const requests = state.members.filter(m => m.uid !== 'you').map((m, i) => ({ uid: m.uid, name: m.name, phone: '+33 6 00 00 00 ' + String(10 + i), at: now - (30 - i) * day }));
    requests.push({ uid: 'amir', name: 'Amir N.', phone: '+33 6 11 22 33 44', at: now - 9 * day }, { uid: 'clara', name: 'Clara B.', phone: '+33 6 55 66 77 88', at: now - 4 * day });
    return { rsvps, votes: [], pulse: {}, requests, camps: {
      noah: { color: 'night', working: 'A Flutter app that splits rent between flatmates', dream: 'Spotify', askMe: 'Flutter, Firebase, getting your first hackathon win', about: 'Second year. I like building small apps that fix annoying things.',
        song: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT', proud: [{ title: 'Won the September hackathon', text: 'Team of three, built in 24 hours with RevenueCat.', link: 'https://github.com/example/hackathon-app' }], hidden: false, reports: {} },
      sofia: { color: 'mint', working: 'Google Cloud Associate Engineer prep', dream: 'Google DeepMind', askMe: 'Cloud certifications, Python', about: '', song: '', proud: [], hidden: false, reports: {} },
    } };
  };
  const extra = () => store.get('nw-demo-extra-v1') || extraSeed();
  const saveExtra = (X) => store.set('nw-demo-extra-v1', X);
  const inDays = (n) => { const d = new Date(Date.now() + n * day); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const demoEvents = () => [{ id: 'demo-build-night', ...cleanEvent({ title: 'Build night: ship a tiny app', title_fr: 'Soirée build : publiez une mini-app', date: inDays(9),
    time: '6:00 – 9:00 PM', time_fr: '18 h – 21 h', room: 'AIClinic – Room 107', type: 'Build night', type_fr: 'Soirée build', format: 'build', level: 'all', lang: 'en',
    description: 'Three hours to build and ship something small with friends. Pizza included.', description_fr: 'Trois heures pour construire et publier un petit projet entre amis. Pizza offerte.',
    details: 'Bring a laptop and an idea, or pick one from our list.\n\nWe start with a 10-minute demo of how to put a site online, then everyone builds. Organizers walk around to help.\n\nAt 8:30 PM, anyone who wants can show what they made in 1 minute.',
    details_fr: 'Venez avec un ordinateur et une idée, ou choisissez-en une dans notre liste.\n\nOn commence par 10 minutes de démo pour mettre un site en ligne, puis tout le monde construit. Les organisateurs passent aider.\n\nÀ 20 h 30, celles et ceux qui le souhaitent montrent leur projet en 1 minute.',
    registration: true, capacity: 20, deadline: inDays(8), published: true }) }];
  const demoRegs = () => ['lucas', 'sofia', 'noah'].map((uid, i) => ({ id: 'demo-build-night_' + uid, event: 'demo-build-night', uid, status: i === 2 ? 'pending' : 'confirmed', at: now - i * day }));
  const demoTarget = (B, postId, commentId) => (commentId ? (B.comments[postId] || []).find(c => c.id === commentId) : B.posts.find(p => p.id === postId));
  const user = { uid: 'you', email: 'you@' + DOMAIN, demo: true };
  return {
    mode: 'demo',
    microsoft: false, async signInMicrosoft() { return { ok: true }; },
    async signInPassword() { return { ok: true }; }, async signUp() { return { ok: true }; }, async resendVerification() { return { ok: true }; },
    async refreshVerified() { return true; }, async resetPassword() { return { ok: true }; },
    async init() {}, onAuth(cb) { cb({ ...user, verified: true }); },
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
    /* ---------- Village Board (demo: kept in this browser) ---------- */
    async loadBoard(isOrg) { return board().posts.filter(p => isOrg || !p.hidden).map(p => normPost(p.id, p)).sort((a, b) => b.at - a.at); },
    async myMission() { return board().active || null; },
    async createPost(p) {
      const B = board(), post = { id: 'p' + Date.now(), kind: p.kind, title: p.title, body: p.body || '', link: p.link || '', by: 'you', createdAt: Date.now(), hidden: false, reports: {} };
      if (p.kind === 'mission') Object.assign(post, { mtype: p.mtype, status: 'open', takenBy: null, takenAt: null });
      if (p.kind === 'mission') { for (const k of ['outcome', 'time', 'level']) if (p[k]) post[k] = String(p[k]); if ((p.skills || []).length) post.skills = p.skills.slice(0, 5); }
      if (['team', 'council'].includes(p.as)) post.as = p.as;
      if (p.for && typeof p.for === 'string') post.for = p.for.slice(0, 128);
      if (p.kind !== 'week' && /^\d{4}-\d{2}-\d{2}$/.test(p.expires || '')) post.expires = p.expires;
      if (p.kind === 'event') Object.assign(post, { date: p.date || '', where: p.where || '' });
      if (p.kind === 'week') Object.assign(post, { start: p.start, days: p.days || [] });
      if (p.id) { if (B.posts.some(x => x.id === p.id)) return { ok: true, skipped: true }; post.id = p.id; }
      B.posts.push(post); saveBoard(B); return { ok: true };
    },
    async editPost(id, p) { const B = board(), post = B.posts.find(x => x.id === id); Object.assign(post, p, { editedAt: Date.now() }); if (!p.expires) delete post.expires; saveBoard(B); return { ok: true }; },
    async takeMission(post) {
      const B = board(), x = B.posts.find(q => q.id === post.id);
      if (B.active && B.posts.some(q => q.id === B.active && q.takenBy === 'you' && q.status === 'taken')) return { ok: false, code: 'vb.err.busy' };
      if (!x || x.status !== 'open') return { ok: false, code: 'vb.err.gone' };
      Object.assign(x, { status: 'taken', takenBy: 'you', takenAt: Date.now() }); B.active = x.id; saveBoard(B); return { ok: true };
    },
    async releaseMission(post) { const B = board(); Object.assign(B.posts.find(q => q.id === post.id), { status: 'open', takenBy: null, takenAt: null }); B.active = null; saveBoard(B); return { ok: true }; },
    async finishMission(post) { const B = board(); Object.assign(B.posts.find(q => q.id === post.id), { status: 'review', doneAt: Date.now() }); B.active = null; saveBoard(B); return { ok: true }; },
    async reopenMission(post) { const B = board(); Object.assign(B.posts.find(q => q.id === post.id), { status: 'open', takenBy: null, takenAt: null }); saveBoard(B); return { ok: true }; },
    async confirmMission(post) {
      const B = board(); Object.assign(B.posts.find(q => q.id === post.id), { status: 'done', confirmedAt: Date.now() }); saveBoard(B);
      state.facts.push({ id: 'm_' + post.id, uid: post.takenBy, type: MISSION_RULE[post.mtype] || 'mentoring', date: todayStr(), status: 'approved', missionId: post.id, mentee: post.by, recordedBy: 'you', title: post.title });
      save(); return { ok: true };
    },
    async closePost(post) { const B = board(); B.posts.find(q => q.id === post.id).status = 'closed'; saveBoard(B); return { ok: true }; },
    async deletePost(post) { const B = board(); B.posts = B.posts.filter(q => q.id !== post.id); saveBoard(B); return { ok: true }; },
    async report(postId, commentId) { const B = board(), t = demoTarget(B, postId, commentId); t.reports = { ...(t.reports || {}), you: true }; saveBoard(B); return { ok: true }; },
    async setHidden(postId, commentId, hidden) { const B = board(); demoTarget(B, postId, commentId).hidden = !!hidden; saveBoard(B); return { ok: true }; },
    async loadComments(postId, isOrg) { return (board().comments[postId] || []).filter(c => isOrg || !c.hidden).map(c => normPost(c.id, c)).sort((a, b) => a.at - b.at); },
    async addComment(postId, text) { const B = board(); (B.comments[postId] = B.comments[postId] || []).push({ id: 'c' + Date.now(), by: 'you', text, createdAt: Date.now(), hidden: false, reports: {} }); saveBoard(B); return { ok: true }; },
    async deleteComment(postId, cid) { const B = board(); B.comments[postId] = (B.comments[postId] || []).filter(c => c.id !== cid); saveBoard(B); return { ok: true }; },
    // ---------- sessions: "I'm going" and votes; camps; organizer follow-ups ----------
    async loadRsvps() { return extra().rsvps; },
    async setRsvp(date, on) { const X = extra(); X.rsvps = X.rsvps.filter(r => !(r.date === date && r.uid === 'you')); if (on) X.rsvps.push({ date, uid: 'you' }); saveExtra(X); return { ok: true }; },
    async loadVotes() { return extra().votes; },
    async vote(date, choice) { const X = extra(); X.votes = X.votes.filter(v => !(v.date === date && v.uid === 'you')); if (choice) X.votes.push({ date, uid: 'you', choice }); saveExtra(X); return { ok: true }; },
    async getCamp(uid) { const c = extra().camps[uid]; return c ? { uid, ...c } : null; },
    async saveCamp(c) { const X = extra(), old = X.camps.you || { hidden: false, reports: {} }; X.camps.you = { ...old, ...cleanCamp(c), updatedAt: Date.now() }; saveExtra(X); return { ok: true }; },
    async reportCamp(uid) { const X = extra(); if (X.camps[uid]) { X.camps[uid].reports = { ...(X.camps[uid].reports || {}), you: true }; saveExtra(X); } return { ok: true }; },
    async hideCamp(uid, hidden) { const X = extra(); if (X.camps[uid]) { X.camps[uid].hidden = !!hidden; saveExtra(X); } return { ok: true }; },
    async loadRequests() { return extra().requests; },
    async loadPulse() { return extra().pulse; },
    async markContacted(uid) { const X = extra(); X.pulse[uid] = { contactedAt: Date.now(), by: 'you' }; saveExtra(X); return { ok: true }; },
    // ---------- organizers: Thursday check-in codes ----------
    async activeCheckinCodes() { const c = extra().code; return c && c.until > Date.now() ? [c] : []; },
    async createCheckinCode(minutes, double) { const X = extra(); X.code = { code: 'DEMO', date: todayStr(), until: Date.now() + minutes * 60e3, double: !!double }; saveExtra(X); return { ok: true, ...X.code }; },
    async endCheckinCode() { const X = extra(); X.code = null; saveExtra(X); return { ok: true }; },
    async countCheckins(date) { return state.facts.filter(f => f.type === 'attend' && f.date === date).length; },
    async requestManualConfirm() { return { ok: true }; }, async manualConfirmPending() { return false; },
    async loadPendingConfirms() { const X = extra(); return X.pending || [{ uid: 'newbie', email: 'jane.doe@' + DOMAIN, name: 'Jane D.', at: now - 3600e3 }]; },
    async confirmByHand(uid) { const X = extra(); X.pending = (X.pending || [{ uid: 'newbie' }]).filter(p => p.uid !== uid); saveExtra(X); return { ok: true }; },
    // ---------- events made on the site, and registrations ----------
    async loadEvents(all) { return (extra().events || demoEvents()).filter(e => all || e.published); },
    async getEvent(id) { return (extra().events || demoEvents()).find(e => e.id === id) || null; },
    async saveEvent(ev) {
      const X = extra(); X.events = X.events || demoEvents(); const id = ev.id || 'e' + Date.now(), doc = { id, ...cleanEvent(ev) };
      const i = X.events.findIndex(e => e.id === id); if (i >= 0) X.events[i] = doc; else X.events.push(doc); saveExtra(X); return { ok: true, id };
    },
    async deleteEvent(id) { const X = extra(); X.events = (X.events || demoEvents()).filter(e => e.id !== id); saveExtra(X); return { ok: true }; },
    async loadRegistrations(eventId) { return (extra().regs || demoRegs()).filter(r => r.event === eventId); },
    async register(eventId, status) {
      const X = extra(); X.regs = X.regs || demoRegs(); const id = eventId + '_you';
      X.regs = X.regs.filter(r => r.id !== id).concat({ id, event: eventId, uid: 'you', status, at: Date.now() }); saveExtra(X); return { ok: true };
    },
    async setRegistration(reg, status) { const X = extra(); X.regs = (X.regs || demoRegs()).map(r => (r.id === reg.id ? { ...r, status } : r)); saveExtra(X); return { ok: true }; },
    async whoAre(uids) { const out = {}; for (const u of uids) { const m = state.members.find(x => x.uid === u); out[u] = { name: m ? m.name : 'Jane D.', email: (m ? u : 'jane.doe') + '@' + DOMAIN, phone: '+33 6 00 00 00 00', member: !!m }; } return out; },
    currentUid() { return 'you'; },
    reset() { store.del('nw-demo-v1'); store.del('nw-demo-board-v1'); store.del('nw-demo-extra-v1'); state = demoSeed(); },
  };
}

/* ================= Firebase backend ================= */
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
function linkErrorText(e) {
  const c = (e && e.code) || '';
  if (c.includes('invalid-action-code') || c.includes('expired-action-code')) return tr('err.link.expired', 'That sign-in link has expired or was already used. Request a new one below and open it right away.') + ' (' + c.replace('auth/', '') + ')';
  if (c.includes('quota-exceeded') || c.includes('too-many-requests')) return tr('err.link.quota', 'Sign-in emails are paused for today: the club reached its daily limit. Try again tomorrow, or tell an organizer.');
  if (c.includes('invalid-email')) return tr('err.link.email', 'The email in the link does not match. Request a new link from this browser.');
  if ((e && e.message || '').includes('referer') || c.includes('api-key')) return tr('err.link.key', 'Sign-in is blocked by the API key settings. If you just changed them, wait 5 minutes and try again.');
  const why = c || (e && e.message) || 'unknown error';
  return tr('err.link.other', 'Sign-in did not finish (' + why + '). Request a new link and try again.', { e: why });
}
/* remembered per browser so static pages can hide "Join" for people already in the club */
// signed in (any school account, member or not): the top bar shows an account menu instead of "Sign in"
function markSigned(email) { try { email ? localStorage.setItem('nw-signed', email) : localStorage.removeItem('nw-signed'); } catch (e) {} document.documentElement.classList.toggle('is-signed', !!email); if (window.ClubMe) ClubMe.refresh(); }
function markMember(on) { try { on ? localStorage.setItem('nw-member', '1') : (localStorage.removeItem('nw-member'), localStorage.removeItem('nw-me')); } catch (e) {} document.documentElement.classList.toggle('is-member', !!on); if (window.ClubMe) ClubMe.refresh(); }
/* Village Board helpers shared by both backends */
const MISSION_RULE = { help: 'mentoring', build: 'collab', club: 'club_quest' };
const tsMs = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : v ? Date.parse(v) : Date.now());
function normPost(id, d) { return { id, ...d, at: tsMs(d.createdAt), takenAtMs: d.takenAt ? tsMs(d.takenAt) : 0, reportCount: Object.keys(d.reports || {}).length }; }
function fail(e, code) {
  console.error(e);
  const c = (e && e.code) || '';
  return { ok: false, code: code && (c === 'permission-denied' || c === 'failed-precondition' || c === 'not-found') ? code : c === 'permission-denied' ? 'vb.err.denied' : 'err.generic', detail: c || (e && e.message) || '' };
}
function pwErrorText(e) {
  const c = (e && e.code) || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-login')) return tr('err.pw.wrong', 'Email or password is wrong.');
  if (c.includes('email-already-in-use')) return tr('err.pw.exists', 'There is already an account with this email. Sign in, or use "Forgot your password?".');
  if (c.includes('weak-password')) return tr('err.pw.weak', 'Use at least 8 characters.');
  if (c.includes('too-many-requests')) return tr('err.pw.many', 'Too many attempts. Wait a few minutes and try again.');
  if (c.includes('quota-exceeded')) return tr('err.link.quota', 'Sign-in emails are paused for today: the club reached its daily limit. Try again tomorrow, or tell an organizer.');
  if (c.includes('network')) return tr('m.dberror', 'Could not reach the club database. Check your connection.', { e: c });
  return tr('err.link.other', 'Sign-in did not finish (' + (c || (e && e.message) || '?') + ').', { e: c || (e && e.message) || '?' });
}
function msErrorText(e) {
  const c = (e && e.code) || '';
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request' || c === 'auth/user-cancelled') return tr('err.ms.closed', 'The Microsoft window was closed before signing in. Try again.');
  if (c === 'auth/account-exists-with-different-credential') return tr('err.ms.exists', 'This email already has an account from an email link. Ask an organizer to merge it, or use the email link below.');
  return tr('err.ms.other', 'Microsoft sign-in did not finish (' + (c || (e && e.message) || '?') + ').', { e: c || (e && e.message) || '?' });
}
let checkSchoolAccount = async () => ({ ok: true });
/* ---------- camps (a member's own space on the Mountain): only these fields, trimmed to size ---------- */
const CAMP_COLORS = ['sky', 'mint', 'sun', 'rose', 'lilac', 'sand', 'night', 'forest'];
const httpsOr = (u) => (/^https:\/\/\S+$/.test(String(u || '').trim()) ? String(u).trim().slice(0, 300) : '');
function cleanCamp(c) {
  c = c || {};
  const str = (v, n) => String(v || '').trim().slice(0, n);
  return {
    color: CAMP_COLORS.includes(c.color) ? c.color : 'sky',
    working: str(c.working, 140), dream: str(c.dream, 60), askMe: str(c.askMe, 140), about: str(c.about, 280),
    song: httpsOr(c.song),
    proud: (Array.isArray(c.proud) ? c.proud : []).map(x => ({ title: str(x && x.title, 80), text: str(x && x.text, 200), link: httpsOr(x && x.link) }))
      .filter(x => x.title).slice(0, 4),
  };
}
function firebaseBackend() {
  let auth, db;
  const FV = () => firebase.firestore.FieldValue;
  const target = (postId, commentId) => { const p = db.collection('board').doc(postId); return commentId ? p.collection('comments').doc(commentId) : p; };
  // a mission step by the member who took it: the post changes and their "current mission" is cleared together
  const missionStep = async (post, change) => {
    const b = db.batch();
    b.update(db.collection('board').doc(post.id), change);
    b.update(db.collection('members').doc(auth.currentUser.uid), { activeMission: null });
    try { await b.commit(); return { ok: true }; } catch (e) { return fail(e); }
  };
  // organizer-confirm mode: make sure a new account is in the organizers' review list (once)
  const reviewQueue = async (u, name) => {
    try {
      if (await manuallyConfirmed(u.uid) || await isBlocked(u.uid)) return;
      const ref = db.collection('confirmPending').doc(u.uid), cur = await ref.get();
      if (cur.exists && !name) return;
      await ref.set({ email: (u.email || '').toLowerCase(), name: String(name || (cur.exists && cur.data().name) || u.email.split('@')[0]).trim().slice(0, 60), at: FV().serverTimestamp() });
    } catch (e) {}
  };
  let lastVerified = false;
  const isBlocked = async (uid) => { try { const d = await db.collection('blocked').doc(uid).get(); return d.exists; } catch (e) { return false; } };
  const manuallyConfirmed = async (uid) => { try { const d = await db.collection('confirmed').doc(uid).get(); return d.exists; } catch (e) { return false; } };
  const V = '10.12.2', base = 'https://www.gstatic.com/firebasejs/' + V + '/';
  return {
    mode: 'firebase',
    async init() {
      await loadScript(base + 'firebase-app-compat.js');
      await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-firestore-compat.js')]);
      firebase.initializeApp(CFG.FIREBASE);
      auth = firebase.auth(); db = firebase.firestore();
      checkSchoolAccount = async () => {
        const u = auth.currentUser;
        const em = (u && (u.email || ((u.providerData || []).find(x => x.email) || {}).email)) || '';
        if (validEmail(em)) return { ok: true };
        await auth.signOut();
        return { ok: false, message: tr('err.email', 'Use your school email address.') };
      };
      if (CFG.MICROSOFT) {
        try { const r = await auth.getRedirectResult(); if (r && r.user) { const c = await checkSchoolAccount(); if (!c.ok) this.linkError = c.message; } }
        catch (e) { this.linkError = msErrorText(e); }
      }
      try { await db.enablePersistence({ synchronizeTabs: true }); } catch (e) { /* private mode or another tab: online only */ }
      if (auth.isSignInWithEmailLink(location.href)) {
        let email = store.get('nw-email');
        // If the link was opened on another device, the page asks for the email (see completeLink).
        if (email) {
          try { await auth.signInWithEmailLink(email, location.href); store.del('nw-email'); }
          catch (e) {
            // the link may have been opened twice (e.g. two tabs): if this browser is already signed in as that email, all is well
            await new Promise((res) => { const off = auth.onAuthStateChanged(() => { off(); res(); }); });
            const u = auth.currentUser;
            if (u && (u.email || '').toLowerCase() === String(email).toLowerCase()) store.del('nw-email');
            else this.linkError = linkErrorText(e);
          }
          history.replaceState(null, '', location.pathname);
        } else this.pendingLink = location.href;
      }
    },
    microsoft: !!CFG.MICROSOFT,
    /* Sign in with the school's Microsoft account (popup; falls back to a full-page redirect if popups are blocked).
       The app is registered as single-tenant, so Microsoft itself only lets aivancity accounts in. */
    async signInMicrosoft() {
      const p = new firebase.auth.OAuthProvider('microsoft.com');
      p.setCustomParameters({ tenant: CFG.MICROSOFT.tenant, prompt: 'select_account', domain_hint: DOMAIN });
      try { await auth.signInWithPopup(p); }
      catch (e) {
        const c = (e && e.code) || '';
        if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-environment') { await auth.signInWithRedirect(p); return { ok: true }; }
        return { ok: false, message: msErrorText(e) };
      }
      return checkSchoolAccount();
    },
    async completeLink(email) {
      if (!validEmail(email)) throw new Error(tr('err.email', 'Use your school email address.'));
      await auth.signInWithEmailLink(email.trim(), this.pendingLink); this.pendingLink = null; history.replaceState(null, '', location.pathname);
    },
    // verified: the email is confirmed (email link, confirmation email or Microsoft). Unverified accounts can't read club data.
    onAuth(cb) {
      auth.onAuthStateChanged(async u => {
        if (!u) markMember(false);
        markSigned(u ? u.email : null);
        const ms = u && (u.providerData || []).some(p => p.providerId === 'microsoft.com');
        let verified = !!(u && (u.emailVerified || ms));
        if (u && !verified) verified = await manuallyConfirmed(u.uid);
        if (u && !verified && ORG_CONFIRM && validEmail(u.email)) reviewQueue(u);   // waits for an organizer
        lastVerified = verified;
        cb(u ? { uid: u.uid, email: u.email, verified } : null);
      });
    },
    /* ---------- email + password (free plan friendly: no email at each sign-in) ---------- */
    async signInPassword(email, pw) {
      if (!validEmail(email)) return { ok: false, message: tr('err.email', 'Use your school email address.') };
      try { await auth.signInWithEmailAndPassword(email.trim(), pw); return { ok: true }; }
      catch (e) { return { ok: false, message: pwErrorText(e), code: (e && e.code) || '' }; }
    },
    async signUp(email, pw, name) {
      if (!validEmail(email)) return { ok: false, message: tr('err.email', 'Use your school email address.') };
      if (String(pw || '').length < 8) return { ok: false, message: tr('err.pw.weak', 'Use at least 8 characters.') };
      try {
        const cred = await auth.createUserWithEmailAndPassword(email.trim(), pw);
        if (ORG_CONFIRM) await reviewQueue(cred.user, name);
        else await cred.user.sendEmailVerification({ url: location.origin + location.pathname });
        return { ok: true };
      } catch (e) { return { ok: false, message: pwErrorText(e) }; }
    },
    async resendVerification() {
      try { await auth.currentUser.sendEmailVerification({ url: location.origin + location.pathname }); return { ok: true }; }
      catch (e) { return { ok: false, message: pwErrorText(e) }; }
    },
    // after the person clicked the confirmation link (maybe in another tab): refresh the account and its security token
    async refreshVerified() {
      const u = auth.currentUser; if (!u) return false;
      await u.reload();
      if (auth.currentUser.emailVerified) {
        await auth.currentUser.getIdToken(true);
        try { await db.collection('confirmPending').doc(u.uid).delete(); } catch (e) {}   // no organizer approval needed any more
        return true;
      }
      return manuallyConfirmed(u.uid);
    },
    // the email never arrived: ask an organizer to confirm this account by hand
    async requestManualConfirm(name) {
      const u = auth.currentUser;
      try { await db.collection('confirmPending').doc(u.uid).set({ email: (u.email || '').toLowerCase(), name: String(name || '').trim().slice(0, 60), at: FV().serverTimestamp() }); return { ok: true }; }
      catch (e) { return fail(e); }
    },
    async accountRefused() { return auth.currentUser ? isBlocked(auth.currentUser.uid) : false; },
    async manualConfirmPending() {
      try { const d = await db.collection('confirmPending').doc(auth.currentUser.uid).get(); return d.exists; } catch (e) { return false; }
    },
    async loadPendingConfirms() {
      const s = await db.collection('confirmPending').get();
      return s.docs.map(d => { const x = d.data(); return { uid: d.id, email: x.email, name: x.name, at: x.at && x.at.toMillis ? x.at.toMillis() : 0 }; });
    },
    async confirmByHand(uid, yes) {
      const b = db.batch();
      if (yes) b.set(db.collection('confirmed').doc(uid), { by: auth.currentUser.uid, at: FV().serverTimestamp() });
      else if (ORG_CONFIRM) b.set(db.collection('blocked').doc(uid), { by: auth.currentUser.uid, at: FV().serverTimestamp() });
      b.delete(db.collection('confirmPending').doc(uid));
      try { await b.commit(); return { ok: true }; } catch (e) { return fail(e); }
    },
    async resetPassword(email) {
      if (!validEmail(email)) return { ok: false, message: tr('err.email', 'Use your school email address.') };
      try { await auth.sendPasswordResetEmail(email.trim(), { url: location.origin + location.pathname }); }
      catch (e) { if (!(e && e.code === 'auth/user-not-found')) return { ok: false, message: pwErrorText(e) }; }
      return { ok: true };
    },
    async sendLink(email) {
      if (!validEmail(email)) return { ok: false, message: tr('err.email', 'Use your school email address.') };
      try { await auth.sendSignInLinkToEmail(email.trim(), { url: location.origin + location.pathname, handleCodeInApp: true }); }
      catch (e) { return { ok: false, message: linkErrorText(e) }; }
      store.set('nw-email', email.trim());
      return { ok: true, message: tr('m.signin.sent', 'Check your inbox: we sent a sign-in link to ' + email.trim() + '.', { email: email.trim() }) };
    },
    async signOut() { markMember(false); markSigned(null); await auth.signOut(); },
    /* Member = on the roster (added by an organizer) OR sent the /apply form, unless an organizer set status "removed". */
    async onRoster() {
      const u = auth.currentUser, em = (u.email || '').toLowerCase();
      const read = async (ref) => { try { return await ref.get({ source: 'server' }); } catch (e) { try { return await ref.get(); } catch (e2) { return null; } } };
      const r = await read(db.collection('roster').doc(em));
      if (r && r.exists) { markMember(true); return true; }
      const q = await read(db.collection('requests').doc(u.uid));
      const yes = !!(q && q.exists && q.data().status !== 'removed'); markMember(yes); return yes;
    },
    async requestStatus() { try { const d = await db.collection('requests').doc(auth.currentUser.uid).get(); return d.exists ? d.data() : null; } catch (e) { return null; } },
    /* Application to join the club (and its WhatsApp group). Only the person and organizers can read it. */
    async apply(d) {
      const u = auth.currentUser;
      const doc = { email: u.email.toLowerCase(), name: d.name, program: d.program || '', phone: d.phone, interests: d.interests || [],
        level: d.level, heard: d.heard || '', consent: true, lang: d.lang === 'fr' ? 'fr' : 'en', at: firebase.firestore.FieldValue.serverTimestamp() };
      try { await db.collection('requests').doc(u.uid).set(doc, { merge: true }); if (lastVerified) markMember(true); return { ok: true }; }
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
    async getProfile(uid) {
      try { const d = await db.collection('members').doc(uid).get(); return d.exists ? { uid, ...d.data() } : null; }
      catch (e) { if (e && e.code === 'permission-denied') return null; throw e; }
    },
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
    /* ---------- Village Board (missions, events, open-source projects) ---------- */
    async loadBoard(isOrg) {
      let q = db.collection('board'); if (!isOrg) q = q.where('hidden', '==', false);
      const snap = await q.get();
      return snap.docs.map(d => normPost(d.id, d.data())).sort((a, b) => b.at - a.at);
    },
    async myMission() {
      const m = await db.collection('members').doc(auth.currentUser.uid).get();
      return (m.exists && m.data().activeMission) || null;
    },
    async createPost(p) {
      const doc = { kind: p.kind, title: p.title, body: p.body || '', link: p.link || '', by: auth.currentUser.uid, createdAt: FV().serverTimestamp(), hidden: false, reports: {} };
      if (p.kind === 'mission') Object.assign(doc, { mtype: p.mtype, status: 'open', takenBy: null, takenAt: null });
      if (p.kind === 'mission') { for (const k of ['outcome', 'time', 'level']) if (p[k]) doc[k] = String(p[k]); if ((p.skills || []).length) doc.skills = p.skills.slice(0, 5); }
      if (['team', 'council'].includes(p.as)) doc.as = p.as;
      if (p.for && typeof p.for === 'string') doc.for = p.for.slice(0, 128);
      if (p.kind !== 'week' && /^\d{4}-\d{2}-\d{2}$/.test(p.expires || '')) doc.expires = p.expires;
      if (p.kind === 'event') Object.assign(doc, { date: p.date || '', where: p.where || '' });
      if (p.kind === 'week') Object.assign(doc, { start: p.start, days: p.days || [] });
      try {
        if (p.id) {   // starter pack: fixed ids, so publishing twice never duplicates
          const ref = db.collection('board').doc(p.id);
          if ((await ref.get()).exists) return { ok: true, skipped: true };
          await ref.set(doc);
        } else await db.collection('board').add(doc);
        return { ok: true };
      } catch (e) { return fail(e); }
    },
    async editPost(id, p) {
      const doc = { ...p, editedAt: FV().serverTimestamp() }; if (doc.expires === '') doc.expires = FV().delete();
      try { await db.collection('board').doc(id).update(doc); return { ok: true }; } catch (e) { return fail(e); }
    },
    async takeMission(post) {
      const uid = auth.currentUser.uid, me = db.collection('members').doc(uid);
      try {
        const m = await me.get(), cur = m.exists ? m.data().activeMission : null;
        if (cur) {   // one mission at a time; clear a stale pointer (e.g. a mission that went back on the board)
          const c = await db.collection('board').doc(cur).get().catch(() => null);
          if (c && c.exists && c.data().takenBy === uid && c.data().status === 'taken') return { ok: false, code: 'vb.err.busy' };
          await me.update({ activeMission: null });
        }
        const b = db.batch();
        b.update(db.collection('board').doc(post.id), { status: 'taken', takenBy: uid, takenAt: FV().serverTimestamp() });
        b.update(me, { activeMission: post.id });
        await b.commit(); return { ok: true };
      } catch (e) { return fail(e, 'vb.err.gone'); }
    },
    async releaseMission(post) { return missionStep(post, { status: 'open', takenBy: null, takenAt: null }); },
    async finishMission(post) { return missionStep(post, { status: 'review', doneAt: FV().serverTimestamp() }); },
    async reopenMission(post) {
      try { await db.collection('board').doc(post.id).update({ status: 'open', takenBy: null, takenAt: null }); return { ok: true }; } catch (e) { return fail(e); }
    },
    /* the poster (or an elder) confirms: the mission becomes "done" and the taker's points fact is written in the same step */
    async confirmMission(post) {
      const uid = auth.currentUser.uid, b = db.batch();
      b.update(db.collection('board').doc(post.id), { status: 'done', confirmedAt: FV().serverTimestamp() });
      b.set(db.collection('facts').doc('m_' + post.id), { uid: post.takenBy, type: MISSION_RULE[post.mtype] || 'mentoring', date: todayStr(), status: 'approved',
        missionId: post.id, mentee: post.by, recordedBy: uid, title: post.title.slice(0, 80), createdAt: FV().serverTimestamp() });
      try { await b.commit(); return { ok: true }; } catch (e) { return fail(e); }
    },
    async closePost(post) { try { await db.collection('board').doc(post.id).update({ status: 'closed' }); return { ok: true }; } catch (e) { return fail(e); } },
    async deletePost(post) { try { await db.collection('board').doc(post.id).delete(); return { ok: true }; } catch (e) { return fail(e); } },
    async report(postId, commentId) {
      try { await target(postId, commentId).update('reports.' + auth.currentUser.uid, true); return { ok: true }; } catch (e) { return fail(e); }
    },
    async setHidden(postId, commentId, hidden) {
      try { await target(postId, commentId).update({ hidden: !!hidden }); return { ok: true }; } catch (e) { return fail(e); }
    },
    async loadComments(postId, isOrg) {
      let q = db.collection('board').doc(postId).collection('comments'); if (!isOrg) q = q.where('hidden', '==', false);
      const snap = await q.get();
      return snap.docs.map(d => normPost(d.id, d.data())).sort((a, b) => a.at - b.at);
    },
    async addComment(postId, text) {
      try {
        await db.collection('board').doc(postId).collection('comments').add({ by: auth.currentUser.uid, text, createdAt: FV().serverTimestamp(), hidden: false, reports: {} });
        return { ok: true };
      } catch (e) { return fail(e); }
    },
    async deleteComment(postId, cid) { try { await target(postId, cid).delete(); return { ok: true }; } catch (e) { return fail(e); } },
    // ---------- sessions: "I'm going" and votes (doc id = date_uid, so one per person and session) ----------
    async loadRsvps(fromDate) {
      const s = await db.collection('rsvps').where('date', '>=', fromDate || '2000-01-01').get();
      return s.docs.map(d => ({ date: d.data().date, uid: d.data().uid }));
    },
    async setRsvp(date, on) {
      const uid = auth.currentUser.uid, ref = db.collection('rsvps').doc(date + '_' + uid);
      try { if (on) await ref.set({ date, uid, at: FV().serverTimestamp() }); else await ref.delete(); return { ok: true }; } catch (e) { return fail(e); }
    },
    async loadVotes(fromDate) {
      const s = await db.collection('votes').where('date', '>=', fromDate || '2000-01-01').get();
      return s.docs.map(d => ({ date: d.data().date, uid: d.data().uid, choice: d.data().choice }));
    },
    async vote(date, choice) {
      const uid = auth.currentUser.uid, ref = db.collection('votes').doc(date + '_' + uid);
      try { if (choice) await ref.set({ date, uid, choice: String(choice).slice(0, 40), at: FV().serverTimestamp() }); else await ref.delete(); return { ok: true }; } catch (e) { return fail(e); }
    },
    // ---------- camps ----------
    async getCamp(uid) { try { const d = await db.collection('camps').doc(uid).get(); return d.exists ? { uid, ...d.data() } : null; } catch (e) { if (e && e.code === 'permission-denied') return null; throw e; } },
    async saveCamp(c) {
      const uid = auth.currentUser.uid, ref = db.collection('camps').doc(uid), doc = { ...cleanCamp(c), updatedAt: FV().serverTimestamp() };
      try {
        const cur = await ref.get();
        if (cur.exists) await ref.update(doc); else await ref.set({ ...doc, hidden: false, reports: {} });
        return { ok: true };
      } catch (e) { return fail(e); }
    },
    async reportCamp(uid) { try { await db.collection('camps').doc(uid).update('reports.' + auth.currentUser.uid, true); return { ok: true }; } catch (e) { return fail(e); } },
    async hideCamp(uid, hidden) { try { await db.collection('camps').doc(uid).update({ hidden: !!hidden }); return { ok: true }; } catch (e) { return fail(e); } },
    // ---------- organizers: applications and who has been contacted ----------
    async loadRequests() {
      const s = await db.collection('requests').get();
      return s.docs.map(d => { const x = d.data(); return { uid: d.id, name: x.name, phone: x.phone, lang: x.lang || 'en', status: x.status || '', at: x.at && x.at.toMillis ? x.at.toMillis() : 0 }; })
        .filter(r => r.status !== 'removed');
    },
    async loadPulse() {
      const s = await db.collection('pulse').get(), out = {};
      s.docs.forEach(d => { const x = d.data(); out[d.id] = { contactedAt: x.contactedAt && x.contactedAt.toMillis ? x.contactedAt.toMillis() : 0, by: x.by }; });
      return out;
    },
    async markContacted(uid) {
      try { await db.collection('pulse').doc(uid).set({ contactedAt: FV().serverTimestamp(), by: auth.currentUser.uid }); return { ok: true }; } catch (e) { return fail(e); }
    },
    // ---------- organizers: Thursday check-in codes (checkinCodes/{CODE} { date, validFrom, validUntil, double }) ----------
    async activeCheckinCodes() {
      const s = await db.collection('checkinCodes').where('date', '==', todayStr()).get();
      return s.docs.map(d => ({ code: d.id, date: d.data().date, until: d.data().validUntil.toMillis(), double: !!d.data().double }))
        .filter(c => c.until > Date.now()).sort((a, b) => b.until - a.until);
    },
    async createCheckinCode(minutes, double) {
      const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', r = new Uint32Array(5); crypto.getRandomValues(r);
      const code = Array.from(r, n => A[n % A.length]).join(''), now = Date.now(), until = now + minutes * 60e3;
      try {
        await db.collection('checkinCodes').doc(code).set({ date: todayStr(), validFrom: firebase.firestore.Timestamp.fromMillis(now - 60e3),
          validUntil: firebase.firestore.Timestamp.fromMillis(until), double: !!double, by: auth.currentUser.uid });
        return { ok: true, code, date: todayStr(), until, double: !!double };
      } catch (e) { return fail(e); }
    },
    async endCheckinCode(code) {
      try { await db.collection('checkinCodes').doc(code).update({ validUntil: firebase.firestore.Timestamp.now() }); return { ok: true }; } catch (e) { return fail(e); }
    },
    async countCheckins(date) {
      const s = await db.collection('facts').where('type', '==', 'attend').where('date', '==', date).get();
      return s.size;
    },
    // ---------- events made on the site (events/{id}) and registrations (registrations/{eventId}_{uid}) ----------
    async loadEvents(all) {
      const q = all ? db.collection('events') : db.collection('events').where('published', '==', true);
      const s = await q.get(); return s.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async getEvent(id) { try { const d = await db.collection('events').doc(id).get(); return d.exists ? { id, ...d.data() } : null; } catch (e) { return null; } },
    async saveEvent(ev) {
      const ref = ev.id ? db.collection('events').doc(ev.id) : db.collection('events').doc(), doc = cleanEvent(ev);
      try {
        const cur = ev.id ? await ref.get() : null;
        if (cur && cur.exists) await ref.update({ ...doc, updatedAt: FV().serverTimestamp() });
        else await ref.set({ ...doc, createdBy: auth.currentUser.uid, createdAt: FV().serverTimestamp(), updatedAt: FV().serverTimestamp() });
        return { ok: true, id: ref.id };
      } catch (e) { return fail(e); }
    },
    async deleteEvent(id) { try { await db.collection('events').doc(id).delete(); return { ok: true }; } catch (e) { return fail(e); } },
    async loadRegistrations(eventId) {
      const s = await db.collection('registrations').where('event', '==', eventId).get();
      return s.docs.map(d => { const x = d.data(); return { id: d.id, event: x.event, uid: x.uid, status: x.status, at: x.at && x.at.toMillis ? x.at.toMillis() : 0 }; });
    },
    async register(eventId, status) {
      const uid = auth.currentUser.uid;
      try { await db.collection('registrations').doc(eventId + '_' + uid).set({ event: eventId, uid, status, at: FV().serverTimestamp() }); return { ok: true }; }
      catch (e) { return fail(e); }
    },
    // organizers: confirming someone's spot also confirms their account (they were reviewed)
    async setRegistration(reg, status) {
      const b = db.batch(); b.update(db.collection('registrations').doc(reg.id), { status });
      if (status === 'confirmed') {
        b.set(db.collection('confirmed').doc(reg.uid), { by: auth.currentUser.uid, at: FV().serverTimestamp() });
        b.delete(db.collection('confirmPending').doc(reg.uid));
      }
      try { await b.commit(); return { ok: true }; } catch (e) { return fail(e); }
    },
    // organizers: names and contact details for a list of accounts (join form first, then profile, then the approval list)
    async whoAre(uids) {
      const out = {}, get = (c, id) => db.collection(c).doc(id).get().then(d => (d.exists ? d.data() : {})).catch(() => ({}));
      await Promise.all(uids.map(async uid => {
        const [R, M, P, C] = await Promise.all([get('requests', uid), get('members', uid), get('private', uid), get('confirmPending', uid)]);
        out[uid] = { name: M.name || R.name || C.name || '', email: R.email || P.email || C.email || '', phone: R.phone || '', member: !!M.name };
      }));
      return out;
    },
    currentUid() { return auth.currentUser ? auth.currentUser.uid : null; },
    async submit(s) {
      if (!SUBMIT_TYPES.includes(s.type)) return { ok: false, message: tr('m.proof.badtype', 'That kind of proof is not on the list.') };
      const uid = auth.currentUser.uid;
      await db.collection('facts').add({ uid, date: todayStr(), status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp(), ...s });
      return { ok: true, message: tr('m.proof.ok', 'Sent. An organizer will check it within 7 days.') };
    },
  };
}

window.ClubData = { EVENT_FORMATS, cleanEvent, ORG_CONFIRM, CAMP_COLORS, cleanCamp, create: () => (CFG.FIREBASE ? firebaseBackend() : demoBackend()), validEmail, validPhone: (p) => PHONE_RE.test(String(p || '').trim()), DOMAIN, SUBMIT_TYPES, todayStr };
})();
