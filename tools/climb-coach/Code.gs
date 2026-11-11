/**
 * aivancity Tech Club: Climb Coach (free, no Firebase upgrade).
 *
 * Every two weeks, each member gets a personal email: their bandana, what's missing for the next one,
 * one idea for this week (matched to what they need and what they like), a buddy request waiting, and the next session.
 * The organizer in ADMIN gets a short digest: who moved up a bandana (for a shout-out), who couldn't be emailed.
 *
 * Points are computed with the site's own engine and rules (assets/platform/engine.js + rules/rules.yaml),
 * fetched from the live site, so the email always says exactly what the Mountain says.
 * Members can turn the emails off with the link at the bottom of each one.
 *
 * Runs in Google Apps Script under the Google account that owns the Firebase project (like the buddy emails).
 * Setup: see README.md next to this file.
 */

const PROJECT = 'aivancity-tech-club';
const SITE = 'https://aivancity-tech-club.github.io';
const FROM_NAME = 'aivancity Tech Club';
const GDG = 'https://gdg.community.dev/gdg-on-campus-aivancity-villejuif-france/';   // the club's GDG on Campus chapter page
// Every idea in the emails must match rules/rules.yaml (who records what, what counts) and things that exist today.
const ADMIN = 'victoria.alajemba@aivancity.education';   // gets the digest and the previews
// the web app's address, from Deploy → Manage deployments (it ends in /exec). The "turn these emails off" link uses it.
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyzTrbaDSCrHNj1hXlgIxoyJGCpEz8Qc7N6ldd1gcv-j8vYQMB5eA8A7ibneC95rLEp/exec';
const EVERY_DAYS = 14;                                    // one email every two weeks
const KEEP_FOR_OTHERS = 20;                               // daily emails left for the buddy emails script
const BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';
const P = PropertiesService.getScriptProperties();

/* ---------- 1. run this first: emails ADMIN what three members would receive (nobody else gets anything) ---------- */
function preview() {
  const ctx = load(), people = ctx.people.filter(p => p.email).slice(0, 3);
  if (!people.length) { Logger.log('No members with an email yet.'); return; }
  people.forEach(p => { const m = build(ctx, p); MailApp.sendEmail({ to: ADMIN, subject: '[Preview for ' + p.name + '] ' + m.subject, htmlBody: m.html, name: FROM_NAME }); });
  Logger.log('Sent ' + people.length + ' previews to ' + ADMIN + '.');
}

/* ---------- 2. then run this once: it starts the daily timer (emails go out every two weeks) ---------- */
function setup() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'run').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('run').timeBased().everyDays(1).atHour(9).create();
  if (!P.getProperty('SECRET')) P.setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid());
  Logger.log('Ready. The first round starts at the next run (around 9:00), then every ' + EVERY_DAYS + ' days.');
  if (!WEBAPP_URL) Logger.log('Remember to deploy the web app (README step 6), or the "turn off" links will not work.');
}

/* ---------- the timer runs this every day ---------- */
function run() {
  const lock = LockService.getScriptLock(); if (!lock.tryLock(5000)) return;
  try {
    let cycle = JSON.parse(P.getProperty('CYCLE') || 'null');
    const now = Date.now();
    if (!cycle || (cycle.finished && now - cycle.start >= EVERY_DAYS * 864e5 - 3600e3)) cycle = { start: now, done: [], finished: false, skipped: [] };
    if (cycle.finished) return;
    const ctx = load();
    for (const p of ctx.people) {
      if (cycle.done.includes(p.uid)) continue;
      if (MailApp.getRemainingDailyQuota() <= KEEP_FOR_OTHERS) { save(cycle); Logger.log('Daily limit: the rest go out tomorrow.'); return; }
      if (P.getProperty('off:' + p.uid)) { cycle.done.push(p.uid); continue; }
      if (!p.email) { cycle.skipped.push(p.name); cycle.done.push(p.uid); continue; }
      try { const m = build(ctx, p); MailApp.sendEmail({ to: p.email, subject: m.subject, htmlBody: m.html, name: FROM_NAME }); }
      catch (e) { Logger.log('Could not email ' + p.uid + ': ' + e); }
      cycle.done.push(p.uid);
    }
    cycle.finished = true; save(cycle);
    digest(ctx, cycle);
  } finally { lock.releaseLock(); }
}
function save(cycle) { P.setProperty('CYCLE', JSON.stringify(cycle)); }

/* ---------- digest for the organizers: new bandanas since last round, and who couldn't be reached ---------- */
function digest(ctx, cycle) {
  const before = JSON.parse(P.getProperty('RANKS') || '{}'), now = {}, moves = [];
  ctx.people.forEach(p => { const s = ctx.res.byUid[p.uid]; if (!s || !s.isMember) return; now[p.uid] = s.rank;
    if (before[p.uid] && before[p.uid] !== s.rank) moves.push(p.name + ': ' + ctx.rankName(before[p.uid], 'en') + ' → ' + ctx.rankName(s.rank, 'en')); });
  P.setProperty('RANKS', JSON.stringify(now));
  const off = ctx.people.filter(p => P.getProperty('off:' + p.uid)).length;
  const html = '<div style="font-family:Arial,sans-serif;max-width:560px">'
    + '<h2 style="margin:0 0 8px">Climb Coach: round sent</h2>'
    + '<p>' + (cycle.done.length - cycle.skipped.length - off) + ' members got their email. ' + off + ' turned it off.</p>'
    + '<h3>New bandanas since the last round (for a shout-out)</h3>'
    + (moves.length ? '<ul>' + moves.map(m => '<li>' + esc(m) + '</li>').join('') + '</ul>' : '<p>None this time' + (Object.keys(before).length ? '' : ' (first round: nothing to compare with yet)') + '.</p>')
    + (cycle.skipped.length ? '<h3>No email on file</h3><p>' + cycle.skipped.map(esc).join(', ') + '</p>' : '')
    + '</div>';
  MailApp.sendEmail({ to: ADMIN, subject: 'Climb Coach: ' + moves.length + ' new bandana' + (moves.length === 1 ? '' : 's') + ' to celebrate', htmlBody: html, name: FROM_NAME });
}

/* ---------- loading: the site's engine and rules, and the club's data ---------- */
function load() {
  const get = (path) => UrlFetchApp.fetch(SITE + '/' + path + '?t=' + Date.now(), { muteHttpExceptions: true }).getContentText();
  const mod = (code) => { const module = { exports: {} }, exports = module.exports; eval(code); return module.exports; };   // eslint-disable-line no-unused-vars
  const jsyaml = mod(get('assets/js-yaml.min.js')), engine = mod(get('assets/platform/engine.js'));
  const rb = jsyaml.load(get('rules/rules.yaml'));
  const SESSIONS = eval(get('assets/schedule.js') + '\n;SESSIONS');
  const today = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
  const thursday = (d) => new Date(d + 'T12:00:00Z').getUTCDay() === 4;
  const regular = SESSIONS.filter(s => s.track !== 'break' && thursday(s.date) && s.date <= today).map(s => s.date).sort();
  const docs = (c) => listAll(c).map(d => Object.assign({ id: d.name.split('/').pop() }, plain(d.fields || {})));
  // the next session as the Schedule page shows it: the file's sessions with organizers' edits ("d-YYYY-MM-DD"), plus events made on the site
  const FILE_ID = /^d-\d{4}-\d{2}-\d{2}(-[a-z0-9-]{1,40})?$/, fileKey = (x) => x.key || x.date, siteEvents = docs('events');
  const over = Object.fromEntries(siteEvents.filter(e => FILE_ID.test(e.id)).map(e => [e.id.slice(2), e]));
  const all = SESSIONS.map(x => (over[fileKey(x)] && x.track !== 'break' ? Object.assign({}, x, over[fileKey(x)]) : x))
    .concat(siteEvents.filter(e => !(FILE_ID.test(e.id) && SESSIONS.some(x => fileKey(x) === e.id.slice(2)))))
    .filter(x => x.date && !x.hidden && !x.deleted && x.published !== false && !x.cancelled && x.track !== 'break');
  const next = all.filter(x => x.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;

  const members = docs('members').map(m => Object.assign(m, { uid: m.id }));
  const facts = docs('facts'), priv = byId(docs('private')), reqs = byId(docs('requests')), buddies = docs('buddies'), dir = byId(docs('directory'));
  const res = engine.compute(rb, facts, members, regular, today);
  // language: the class on the school's student list (_FR / _EN), else the language the site was in when they joined
  const people = members.filter(m => (reqs[m.uid] || {}).status !== 'removed').map(m => {
    const email = (priv[m.uid] || {}).email || (reqs[m.uid] || {}).email || '', cls = (dir[String(email).toLowerCase()] || {}).lang;
    return { uid: m.uid, name: m.name || (reqs[m.uid] || {}).name || 'there', email,
      lang: cls === 'fr' || cls === 'en' ? cls : (reqs[m.uid] || {}).lang === 'fr' ? 'fr' : 'en', interests: (reqs[m.uid] || {}).interests || [] };
  });
  const pts = (id) => { const r = (rb.rules || []).find(x => x.id === id); return r && typeof r.points === 'number' ? r.points : null; };
  const rankName = (id, lang) => (TEXT[lang].rank[id] || id);
  const nameOf = (uid) => (members.find(m => m.uid === uid) || {}).name || '';
  return { rb, res, people, buddies, next, today, pts, rankName, nameOf };
}
const byId = (list) => Object.fromEntries(list.map(x => [x.id, x]));

/* ---------- the email ---------- */
const TEXT = {
  en: {
    rank: { white: 'White', yellow: 'Yellow', green: 'Green', blue: 'Blue', red: 'Red', black: 'Black' },
    hi: n => 'Hi ' + n + ',',
    subjNew: 'Your first step on the Mountain',
    subj: (n, next) => n > 0 ? n + ' point' + (n === 1 ? '' : 's') + ' to ' + next + ' on the Mountain' : 'One step left for ' + next + ' on the Mountain',
    subjTop: 'You reached the top of the Mountain',
    notYet: 'Your first check-in at a Thursday session makes you a ninja and starts your climb.',
    where: (rank, p) => 'You wear the <b>' + rank + ' bandana</b>, with <b>' + p + ' point' + (p === 1 ? '' : 's') + '</b>.',
    toNext: next => 'To reach <b>' + next + '</b>:',
    top: 'You hold the Black bandana. Thank you for carrying the club.',
    idea: 'One idea for these two weeks',
    how: '<b>How you get the points:</b> done something? On the Mountain, open <b>My climb → Submit a proof</b> and paste the link (your Skills Boost public profile, the repo, the certificate). An organizer checks it, then the points appear.',
    buddy: n => '<b>' + n + '</b> asked to be your buddy. Answer on the Mountain.',
    session: (t, d) => 'Next session: <b>' + t + '</b>, ' + d + '.',
    gdg: 'Not on our <a href="' + GDG + '" style="color:#8a817a">GDG on Campus chapter</a> yet? Join it to follow the club there.',
    cta: 'Open my climb', off: 'You get this every two weeks as a club member.', offLink: 'Turn these emails off',
    req: { first_check_in: 'Check in at a session', lifetime_points: v => v + ' points in total', compete_enter: v => 'Enter ' + v + ' competition' + (v > 1 ? 's' : ''),
      talk_or_workshop: v => 'Give ' + v + ' talk or workshop', ship_project_or_workshop: v => 'Ship ' + v + ' project or give ' + v + ' workshop', workshop: v => 'Give ' + v + ' workshop',
      mentoring: v => v + ' mentoring sessions', seasons_active: v => 'Be active ' + v + ' seasons' },
    ideas: {
      first_check_in: 'Come this Thursday and type the session code on the Mountain: that check-in is your first point.',
      points: (cert, badge) => 'Pick one: a professional certification (+' + cert + '), a skill badge on <a href="https://www.cloudskillsboost.google/">Google Cloud Skills Boost</a> (+' + badge + '), or a mission on the <a href="' + SITE + '/village">Village board</a>.',
      compete_enter: 'Take part in a club competition when one is announced (WhatsApp or the Schedule page). Organizers record who took part: there is nothing to send.',
      talk: 'Give a lightning talk (10 minutes or less) at a Thursday session, about something you built or learned. Ask an organizer for a slot: they record it.',
      ship: 'Present a project from a public GitHub repo at a session, or lead a session of 30 minutes or more on something you know.',
      mentoring: 'Help a newer member on a <a href="' + SITE + '/village">Village board</a> mission: each confirmed one counts as a mentoring session.',
      ai: 'Into AI? Create a free account on <a href="https://www.cloudskillsboost.google/">Google Cloud Skills Boost</a>, earn a skill badge on an AI topic, then send your public profile link as proof.',
      web: 'Into web? Build a small site in a public repo and present it at a session.',
      data: 'Into data? Skill badges on <a href="https://www.cloudskillsboost.google/">Google Cloud Skills Boost</a> cover data topics too, and each badge counts.',
      cloud: 'Into cloud? Each skill badge on <a href="https://www.cloudskillsboost.google/">Google Cloud Skills Boost</a> earns points, and a professional certification earns more.',
      career: 'Building your CV? Certifications and a shipped project are what recruiters look for.',
    },
  },
  fr: {
    rank: { white: 'Blanc', yellow: 'Jaune', green: 'Vert', blue: 'Bleu', red: 'Rouge', black: 'Noir' },
    hi: n => 'Bonjour ' + n + ',',
    subjNew: 'Votre premier pas sur la Montagne',
    subj: (n, next) => n > 0 ? 'Encore ' + n + ' point' + (n === 1 ? '' : 's') + ' pour le bandana ' + next : 'Plus qu’une étape pour le bandana ' + next,
    subjTop: 'Vous êtes au sommet de la Montagne',
    notYet: 'Votre premier pointage à une séance du jeudi fait de vous un ninja et lance votre ascension.',
    where: (rank, p) => 'Vous portez le <b>bandana ' + rank + '</b>, avec <b>' + p + ' point' + (p > 1 ? 's' : '') + '</b>.',
    toNext: next => 'Pour atteindre le <b>bandana ' + next + '</b> :',
    top: 'Vous portez le bandana Noir. Merci de porter le club.',
    idea: 'Une idée pour ces deux semaines',
    how: '<b>Comment obtenir les points :</b> vous avez fait quelque chose ? Sur la Montagne, ouvrez <b>Mon ascension → Envoyer une preuve</b> et collez le lien (votre profil public Skills Boost, le dépôt, le certificat). Un organisateur vérifie, puis les points apparaissent.',
    buddy: n => '<b>' + n + '</b> vous propose d’être son binôme. Répondez sur la Montagne.',
    session: (t, d) => 'Prochaine séance : <b>' + t + '</b>, ' + d + '.',
    gdg: 'Pas encore sur notre <a href="' + GDG + '" style="color:#8a817a">chapitre GDG on Campus</a> ? Rejoignez-le pour suivre le club sur ce réseau.',
    cta: 'Voir mon ascension', off: 'Vous recevez cet e-mail toutes les deux semaines en tant que membre du club.', offLink: 'Ne plus recevoir ces e-mails',
    req: { first_check_in: 'Pointer à une séance', lifetime_points: v => v + ' points au total', compete_enter: v => 'Participer à ' + v + ' compétition' + (v > 1 ? 's' : ''),
      talk_or_workshop: v => 'Donner ' + v + ' présentation ou atelier', ship_project_or_workshop: v => 'Livrer ' + v + ' projet ou animer ' + v + ' atelier', workshop: v => 'Animer ' + v + ' atelier',
      mentoring: v => v + ' séances de mentorat', seasons_active: v => 'Être actif ' + v + ' saisons' },
    ideas: {
      first_check_in: 'Venez ce jeudi et tapez le code de la séance sur la Montagne : ce pointage est votre premier point.',
      points: (cert, badge) => 'Au choix : une certification professionnelle (+' + cert + '), un badge de compétence sur <a href="https://www.cloudskillsboost.google/">Google Cloud Skills Boost</a> (+' + badge + '), ou une mission du <a href="' + SITE + '/village">Village board</a>.',
      compete_enter: 'Participez à une compétition du club dès qu’elle est annoncée (WhatsApp ou la page Programme). Les organisateurs enregistrent les participants : rien à envoyer.',
      talk: 'Faites une présentation éclair (10 minutes maximum) lors d’une séance du jeudi, sur un projet ou quelque chose que vous avez appris. Demandez un créneau à un organisateur : il l’enregistre.',
      ship: 'Présentez un projet d’un dépôt GitHub public lors d’une séance, ou animez une séance de 30 minutes ou plus sur un sujet que vous maîtrisez.',
      mentoring: 'Aidez un nouveau membre sur une mission du <a href="' + SITE + '/village">Village board</a> : chaque mission confirmée compte comme une séance de mentorat.',
      ai: 'L’IA vous intéresse ? Créez un compte gratuit sur <a href="https://www.cloudskillsboost.google/">Google Cloud Skills Boost</a>, obtenez un badge de compétence sur un sujet d’IA, puis envoyez le lien de votre profil public comme preuve.',
      web: 'Le web vous intéresse ? Créez un petit site dans un dépôt public et présentez-le lors d’une séance.',
      data: 'La data vous intéresse ? Les badges de compétence sur <a href="https://www.cloudskillsboost.google/">Google Cloud Skills Boost</a> couvrent aussi la data, et chaque badge compte.',
      cloud: 'Le cloud vous intéresse ? Chaque badge de compétence sur <a href="https://www.cloudskillsboost.google/">Google Cloud Skills Boost</a> rapporte des points, et une certification professionnelle encore plus.',
      career: 'Vous préparez votre CV ? Les certifications et un projet livré sont ce que les recruteurs regardent.',
    },
  },
};

function build(ctx, p) {
  const L = TEXT[p.lang], s = ctx.res.byUid[p.uid] || { isMember: false, lifetime: 0, checklist: [], rank: 'white' };
  const first = String(p.name).split(' ')[0];
  const missing = (s.checklist || []).filter(c => !c.done);
  const ptsItem = missing.find(c => c.key === 'lifetime_points'), left = ptsItem ? Math.max(0, ptsItem.v - s.lifetime) : 0;
  let subject, body = '';
  if (!s.isMember) {
    subject = L.subjNew; body += '<p>' + L.notYet + '</p>';
  } else if (!s.next) {
    subject = L.subjTop; body += '<p>' + L.where(ctx.rankName(s.rank, p.lang), s.lifetime) + '</p><p>' + L.top + '</p>';
  } else {
    const nextName = ctx.rankName(s.next, p.lang);
    subject = L.subj(left, nextName);
    body += '<p>' + L.where(ctx.rankName(s.rank, p.lang), s.lifetime) + '</p><p style="margin:0 0 6px">' + L.toNext(nextName) + '</p><ul style="margin:0 0 16px;padding-left:20px">'
      + (s.checklist || []).map(c => { const f = L.req[c.key]; const t = typeof f === 'function' ? f(c.v) : (f || c.key);
        return '<li style="margin:2px 0;' + (c.done ? 'color:#8a817a;text-decoration:line-through' : '') + '">' + esc(t) + (c.key === 'lifetime_points' && !c.done ? ' (' + s.lifetime + '/' + c.v + ')' : '') + '</li>'; }).join('')
      + '</ul>';
  }
  // one idea, for the most useful missing step, plus one matched to their interests
  const I = L.ideas, ideas = [];
  const has = (k) => missing.some(c => c.key === k);
  if (!s.isMember || has('first_check_in')) ideas.push(I.first_check_in);
  else if (has('compete_enter')) ideas.push(I.compete_enter);
  else if (has('talk_or_workshop')) ideas.push(I.talk);
  else if (has('ship_project_or_workshop') || has('workshop')) ideas.push(I.ship);
  else if (has('mentoring')) ideas.push(I.mentoring);
  else if (has('lifetime_points')) ideas.push(I.points(ctx.pts('certification') || 15, ctx.pts('skill_badge') || 3));
  const fav = (p.interests || []).find(k => I[k]); if (fav) ideas.push(I[fav]);
  // ideas are our own text with links (no member data in them), so they are not escaped
  if (ideas.length) body += '<p style="margin:0 0 4px;font-weight:bold">' + L.idea + '</p><ul style="margin:0 0 12px;padding-left:20px">' + ideas.map(x => '<li style="margin:2px 0">' + x + '</li>').join('') + '</ul>';
  if (s.isMember) body += '<p style="margin:0 0 16px;font-size:14px;color:#57504a">' + L.how + '</p>';
  const asked = ctx.buddies.filter(b => b.status === 'pending' && b.b === p.uid);
  if (asked.length) body += '<p>' + L.buddy(esc(ctx.nameOf(asked[0].a) || '…')) + '</p>';
  if (ctx.next) {
    const t = p.lang === 'fr' ? (ctx.next.title_fr || ctx.next.title) : ctx.next.title;
    const d = Utilities.formatDate(new Date(ctx.next.date + 'T12:00:00Z'), 'Europe/Paris', p.lang === 'fr' ? 'dd/MM' : 'd MMM');
    const tm = p.lang === 'fr' ? (ctx.next.time_fr || ctx.next.time) : ctx.next.time;
    body += '<p>' + L.session(esc(t), d + (tm ? ', ' + esc(tm) : '') + (ctx.next.room ? ' · ' + esc(ctx.next.room) : '')) + '</p>';
  }
  const url = webappUrl(), sig = sign(p.uid);
  const offUrl = url ? url + '?u=' + encodeURIComponent(p.uid) + '&s=' + sig + '&l=' + p.lang : '';
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1e1e1e;font-size:15px;line-height:1.5">'
    + '<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b625b;margin:0 0 12px">aivancity Tech Club · ' + (p.lang === 'fr' ? 'Montagne' : 'Mountain') + '</p>'
    + '<p>' + L.hi(esc(first)) + '</p>' + body
    + '<p style="margin:20px 0 28px"><a href="' + SITE + '/mountain#me" style="display:inline-block;background:#2e3a6e;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px">' + L.cta + ' →</a></p>'
    + '<p style="font-size:12px;color:#8a817a;margin:0 0 8px">' + L.gdg + '</p>'
    + '<p style="font-size:12px;color:#8a817a;margin:0">' + L.off + (offUrl ? ' <a href="' + offUrl + '" style="color:#8a817a">' + L.offLink + '</a>' : '') + '</p></div>';
  return { subject, html };
}

/* ---------- "turn these emails off" (deployed as a web app; the link is signed so nobody can turn off someone else) ---------- */
function doGet(e) {
  const q = (e && e.parameter) || {}, uid = String(q.u || ''), fr = q.l === 'fr';
  const ok = uid && q.s === sign(uid), on = q.on === '1';
  if (ok) { if (on) P.deleteProperty('off:' + uid); else P.setProperty('off:' + uid, '1'); }
  const url = webappUrl() + '?u=' + encodeURIComponent(uid) + '&s=' + q.s + '&l=' + (fr ? 'fr' : 'en');
  const msg = !ok ? (fr ? 'Ce lien n’est pas valide.' : 'This link is not valid.')
    : on ? (fr ? 'C’est noté : vous recevrez à nouveau les e-mails du Climb Coach.' : 'Done: you will get the Climb Coach emails again.')
    : (fr ? 'C’est noté : vous ne recevrez plus ces e-mails. <a href="' + url + '&on=1">Les réactiver</a>' : 'Done: you won’t get these emails any more. <a href="' + url + '&on=1">Turn them back on</a>');
  return HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;font-size:17px;line-height:1.5">'
    + '<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b625b">aivancity Tech Club</p><p>' + msg + '</p></div>').setTitle('aivancity Tech Club');
}
function webappUrl() { return WEBAPP_URL || String(ScriptApp.getService().getUrl() || '').replace(/\/dev$/, '/exec'); }
function sign(uid) {
  let secret = P.getProperty('SECRET');
  if (!secret) { secret = Utilities.getUuid() + Utilities.getUuid(); P.setProperty('SECRET', secret); }   // made on first use (preview can run before setup)
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(uid, secret)).replace(/=+$/, '').slice(0, 22);
}

/* ---------- Firestore (REST, with this account's own access; read only) ---------- */
function req(url) {
  const r = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': PROJECT }, muteHttpExceptions: true });
  const code = r.getResponseCode();
  if (code === 404) return null;
  if (code >= 300) throw new Error('Firestore ' + code + ': ' + r.getContentText().slice(0, 300));
  return JSON.parse(r.getContentText() || '{}');
}
function listAll(col) {
  const out = []; let token = '';
  do {
    const r = req(BASE + '/' + col + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : '')) || {};
    (r.documents || []).forEach(d => out.push(d)); token = r.nextPageToken || '';
  } while (token);
  return out;
}
function plain(fields) { const o = {}; for (const k in fields) o[k] = val(fields[k]); return o; }
function val(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return plain(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
  return null;
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
