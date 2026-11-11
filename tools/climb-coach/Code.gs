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
const ADMIN = 'victoria.alajemba@aivancity.education';   // gets the review email, the digest and the previews
const REVIEWERS = [ADMIN];                                // organizers who get the review email; any one of them can approve the round
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
  const t = ScriptApp.newTrigger('run').timeBased().everyDays(1).atHour(9).create();
  P.setProperty('DAILY_TRIGGER', t.getUniqueId());
  if (!P.getProperty('SECRET')) P.setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid());
  Logger.log('Ready. At the next run (around 9:00) the organizers get the first round to check; members get nothing until one approves it. Then every ' + EVERY_DAYS + ' days.');
  if (!WEBAPP_URL) Logger.log('Remember to deploy the web app (README step 6), or the "turn off" links will not work.');
}

/* ---------- the timer runs this every day ---------- */
function run() {
  const lock = LockService.getScriptLock(); if (!lock.tryLock(5000)) return;
  // remove one-off "send now" triggers that already fired (the daily one stays)
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'run' && !isDaily(t)).forEach(t => { try { ScriptApp.deleteTrigger(t); } catch (x) {} });
  try {
    let cycle = JSON.parse(P.getProperty('CYCLE') || 'null');
    const now = Date.now();
    // a new round every EVERY_DAYS: it starts with a review email to the organizers, and nothing goes to members until one approves
    if (!cycle || (now - cycle.start >= EVERY_DAYS * 864e5 - 3600e3 && (cycle.finished || !cycle.approved))) {
      cycle = { start: now, token: Utilities.getUuid(), approved: false, done: [], finished: false, skipped: [] };
      save(cycle); review(load(), cycle); return;
    }
    if (!cycle.approved || cycle.finished) return;
    // send exactly what the organizers read (stored at review time), minus anyone excluded or who turned the emails off since
    const batch = loadBatch(), excluded = cycle.excluded || [];
    for (const m of batch) {
      if (cycle.done.includes(m.uid)) continue;
      if (MailApp.getRemainingDailyQuota() <= KEEP_FOR_OTHERS) { save(cycle); Logger.log('Daily limit: the rest go out tomorrow.'); return; }
      if (!excluded.includes(m.uid) && !P.getProperty('off:' + m.uid)) {
        try { MailApp.sendEmail({ to: m.email, subject: m.subject, htmlBody: m.html, name: FROM_NAME }); }
        catch (e) { Logger.log('Could not email ' + m.uid + ': ' + e); }
      }
      cycle.done.push(m.uid);
    }
    const ctx = load();
    cycle.finished = true; save(cycle);
    digest(ctx, cycle);
  } finally { lock.releaseLock(); }
}

/* ---------- the review email: who would get what, a few real samples, and one button to approve (or skip) the round ---------- */
function review(ctx, cycle) {
  const off = (p) => !!P.getProperty('off:' + p.uid);
  const going = ctx.people.filter(p => p.email && !off(p)), noEmail = ctx.people.filter(p => !p.email), offList = ctx.people.filter(off);
  // every email, built now and stored: what the organizers read is exactly what will be sent
  const batch = going.map(p => { const m = build(ctx, p); return { uid: p.uid, name: p.name, email: p.email, lang: p.lang, subject: m.subject, html: m.html }; });
  saveBatch(batch);
  const link = (act, uid) => webappUrl() + '?round=' + encodeURIComponent(cycle.token) + '&act=' + act + (uid ? '&u=' + encodeURIComponent(uid) : '')
    + '&s=' + sign(act + ':' + cycle.token + (uid ? ':' + uid : ''));
  const cell = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const csv = '﻿' + [['Name', 'Email', 'Language', 'Subject', 'Email text', 'Do not send to this person (click)'].map(cell).join(',')]
    .concat(batch.map(m => [m.name, m.email, m.lang.toUpperCase(), m.subject, toText(m.html), link('exclude', m.uid)].map(cell).join(','))).join('\r\n');
  const day = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
  const btn = (href, label, main) => '<a href="' + href + '" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold;'
    + (main ? 'background:#2e3a6e;color:#fff' : 'border:2px solid #2e3a6e;color:#2e3a6e') + '">' + label + '</a>';
  const sample = batch.slice(0, 2);
  const html = '<div style="font-family:Arial,sans-serif;max-width:640px">'
    + '<h2 style="margin:0 0 8px">Climb Coach: ' + batch.length + ' emails to check</h2>'
    + '<p><b>' + batch.length + '</b> members would get an email (' + batch.filter(m => m.lang === 'fr').length + ' in French, ' + batch.filter(m => m.lang === 'en').length + ' in English). '
    + offList.length + ' turned the emails off. ' + noEmail.length + ' have no email on file.</p>'
    + '<p><b>Nothing has been sent.</b> The attached file (opens in Excel or Google Sheets) has every email: who, subject and full text. '
    + 'To leave someone out, click the link in the last column of their row. When everything looks right, approve: exactly these emails go out within a few minutes.</p>'
    + '<p>' + btn(link('approve'), 'Approve and send', true) + btn(link('skip'), 'Skip this round', false) + '</p>'
    + sample.map(m => '<hr style="margin:24px 0"><p style="font-size:13px;color:#57504a;margin:0 0 4px">How it looks, for <b>' + esc(m.name) + '</b> (' + m.lang.toUpperCase() + ') · subject: <b>' + esc(m.subject) + '</b></p>'
      + '<div style="border:1px solid #ddd;border-radius:12px">' + m.html + '</div>').join('')
    + '</div>';
  MailApp.sendEmail({ to: REVIEWERS.join(','), subject: 'To check: ' + batch.length + ' Climb Coach emails (' + day + ')', htmlBody: html, name: FROM_NAME,
    attachments: [Utilities.newBlob(csv, 'text/csv', 'climb-coach-' + day + '.csv')] });
}
// the email as plain text, for the review file
function toText(html) {
  return String(html).replace(/<li[^>]*>/g, '\n- ').replace(/<\/p>|<\/ul>|<br\s*\/?>/g, '\n').replace(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '$2 ($1)')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\n\s*\n+/g, '\n').trim();
}
// the round's emails, kept in the script's properties (compressed, in pieces) between the review and the sending
function saveBatch(batch) {
  const data = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify(batch), 'application/json')).getBytes());
  const old = Number(P.getProperty('BATCH_N') || 0); for (let i = 0; i < old; i++) P.deleteProperty('BATCH_' + i);
  const size = 8000, n = Math.ceil(data.length / size);
  for (let i = 0; i < n; i++) P.setProperty('BATCH_' + i, data.slice(i * size, (i + 1) * size));
  P.setProperty('BATCH_N', String(n));
}
function loadBatch() {
  const n = Number(P.getProperty('BATCH_N') || 0); if (!n) return [];
  let data = ''; for (let i = 0; i < n; i++) data += P.getProperty('BATCH_' + i) || '';
  return JSON.parse(Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(data), 'application/x-gzip')).getDataAsString());
}

function isDaily(t) { return P.getProperty('DAILY_TRIGGER') === t.getUniqueId(); }
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
      starter: (st, bs) => 'Quick points on the Mountain: set up your camp, visit the <a href="' + SITE + '/village">Village board</a>, open a mission and ask someone to be your buddy (+' + st + ' each). Then come on a Thursday with your buddy: +' + bs + ' each time you both check in.',
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
      starter: (st, bs) => 'Des points rapides sur la Montagne : installez votre camp, visitez le <a href="' + SITE + '/village">Village board</a>, ouvrez une mission et proposez un binôme (+' + st + ' chacun). Puis venez un jeudi avec votre binôme : +' + bs + ' chaque fois que vous pointez tous les deux.',
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
  else if (has('lifetime_points') && s.rank === 'white' && ctx.pts('starter')) ideas.push(I.starter(ctx.pts('starter'), ctx.pts('buddy_session') || 2));
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
  const q0 = (e && e.parameter) || {};
  if (q0.round) return roundAnswer(q0);
  const q = q0, uid = String(q.u || ''), fr = q.l === 'fr';
  const ok = uid && q.s === sign(uid), on = q.on === '1';
  if (ok) { if (on) P.deleteProperty('off:' + uid); else P.setProperty('off:' + uid, '1'); }
  const url = webappUrl() + '?u=' + encodeURIComponent(uid) + '&s=' + q.s + '&l=' + (fr ? 'fr' : 'en');
  const msg = !ok ? (fr ? 'Ce lien n’est pas valide.' : 'This link is not valid.')
    : on ? (fr ? 'C’est noté : vous recevrez à nouveau les e-mails du Climb Coach.' : 'Done: you will get the Climb Coach emails again.')
    : (fr ? 'C’est noté : vous ne recevrez plus ces e-mails. <a href="' + url + '&on=1">Les réactiver</a>' : 'Done: you won’t get these emails any more. <a href="' + url + '&on=1">Turn them back on</a>');
  return HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;font-size:17px;line-height:1.5">'
    + '<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b625b">aivancity Tech Club</p><p>' + msg + '</p></div>').setTitle('aivancity Tech Club');
}
// an organizer clicked "Approve and send" or "Skip this round" in the review email
function roundAnswer(q) {
  const page = (msg) => HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;font-size:17px;line-height:1.5"><p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b625b">Climb Coach</p><p>' + msg + '</p></div>').setTitle('Climb Coach');
  const act = ['skip', 'exclude'].includes(q.act) ? q.act : 'approve', uid = String(q.u || '');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const cycle = JSON.parse(P.getProperty('CYCLE') || 'null');
    if (!cycle || cycle.token !== q.round || q.s !== sign(act + ':' + q.round + (act === 'exclude' ? ':' + uid : ''))) return page('This link is not valid, or a newer round has replaced it.');
    if (cycle.finished) return page('This round is already finished.');
    if (cycle.approved) return page('This round is already approved: the emails are going out.');
    if (act === 'exclude') {
      cycle.excluded = (cycle.excluded || []).filter(x => x !== uid).concat([uid]); save(cycle);
      const m = loadBatch().find(x => x.uid === uid);
      return page('Done: ' + esc(m ? m.name + ' (' + m.email + ')' : 'this member') + ' will not get an email in this round. ' + cycle.excluded.length + ' left out so far.');
    }
    if (act === 'skip') { cycle.finished = true; cycle.skippedRound = true; save(cycle); return page('Skipped: no emails will go out for this round. The next round comes in ' + EVERY_DAYS + ' days.'); }
    cycle.approved = true; cycle.approvedAt = Date.now(); save(cycle);
  } finally { lock.releaseLock(); }
  ScriptApp.newTrigger('run').timeBased().after(60 * 1000).create();   // send in about a minute, not at tomorrow's 9:00
  return page('Approved. The emails go out in the next few minutes, and you will get the digest when they are done.');
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
