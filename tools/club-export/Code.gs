/**
 * aivancity Tech Club: daily club data snapshot for the agents (free, no Firebase upgrade).
 *
 * Every morning it reads the club database (read only) and writes a Google Sheet "Club data snapshot":
 * members with their bandana, points and attendance, who needs a follow-up, check-ins per session,
 * registrations per event and votes. The agents (Community Lead, Season Planner, Chief of Staff, Growth Analyst)
 * read that sheet; they never touch the database.
 *
 * Points come from the site's own engine and rules (fetched from the live site), so the numbers match the Mountain.
 * No email address and no phone number is ever written to the sheet.
 *
 * Runs in Google Apps Script under the Google account that owns the Firebase project (like Climb Coach).
 * Setup: see README.md next to this file.
 */
const PROJECT = 'aivancity-tech-club';
const SITE = 'https://aivancity-tech-club.github.io';
const FOLDER_ID = '1K8OSaSHwkTeful1c4Hwp3uQbeyIlpKeK';   // Drive › Tech Club Agents › 08 Data (share it with this account as editor)
const SHEET_NAME = 'Club data snapshot';
const BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';
const P = PropertiesService.getScriptProperties();

/* ---------- 1. run this once by hand: makes the first snapshot and logs the sheet's address ---------- */
function run() {
  const tabs = buildTabs(loadAll());
  const ss = sheet();
  Object.keys(tabs).forEach((name) => {
    const rows = tabs[name], sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.clearContents();
    if (rows.length) sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sh.setFrozenRows(1);
  });
  const first = ss.getSheetByName('Sheet1') || ss.getSheetByName('Feuille 1');
  if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
  Logger.log('Snapshot written: ' + ss.getUrl());
}

/* ---------- 2. then run this once: a new snapshot every morning around 6:00 ---------- */
function setup() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'run').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('run').timeBased().everyDays(1).atHour(6).create();
  Logger.log('Ready: a new snapshot every morning.');
}

function sheet() {
  const id = P.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { /* deleted: make a new one */ } }
  const ss = SpreadsheetApp.create(SHEET_NAME);
  P.setProperty('SHEET_ID', ss.getId());
  try { DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(FOLDER_ID)); }
  catch (e) { Logger.log('Could not put the sheet in "08 Data": share that folder with this account as editor, or move the sheet there yourself.'); }
  return ss;
}

/* ---------- loading: the site's engine, rules and schedule, and the club's data ---------- */
function loadAll() {
  const get = (path) => UrlFetchApp.fetch(SITE + '/' + path + '?t=' + Date.now(), { muteHttpExceptions: true }).getContentText();
  const mod = (code) => { const module = { exports: {} }, exports = module.exports; eval(code); return module.exports; };   // eslint-disable-line no-unused-vars
  const jsyaml = mod(get('assets/js-yaml.min.js')), engine = mod(get('assets/platform/engine.js'));
  const docs = (c) => listAll(c).map((d) => Object.assign({ id: d.name.split('/').pop() }, plain(d.fields || {})));
  return {
    engine, rb: jsyaml.load(get('rules/rules.yaml')), SESSIONS: eval(get('assets/schedule.js') + '\n;SESSIONS'),
    today: Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd'),
    stamp: Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd HH:mm'),
    members: docs('members'), facts: docs('facts'), requests: docs('requests'), buddies: docs('buddies'),
    events: docs('events'), registrations: docs('registrations'), votes: docs('votes'),
  };
}

/* ---------- the tables (no Google service used here, so it can be tested anywhere) ---------- */
function buildTabs(d) {
  const today = d.today, day = (x) => String(x || '').slice(0, 10);
  const daysAgo = (x) => Math.floor((new Date(today + 'T12:00:00Z') - new Date(day(x) + 'T12:00:00Z')) / 864e5);
  const thursday = (x) => new Date(x + 'T12:00:00Z').getUTCDay() === 4;
  const regular = d.SESSIONS.filter((s) => s.track !== 'break' && thursday(s.date) && s.date <= today).map((s) => s.date).sort();
  const reqBy = {}; d.requests.forEach((r) => { reqBy[r.uid || r.id] = r; });
  const members = d.members.map((m) => Object.assign({}, m, { uid: m.uid || m.id })).filter((m) => (reqBy[m.uid] || {}).status !== 'removed');
  const res = d.engine.compute(d.rb, d.facts, members, regular, today).byUid;

  // attendance: approved check-ins, per member and per day
  const attends = {}, perDate = {};
  d.facts.filter((f) => f.type === 'attend' && f.status === 'approved').forEach((f) => {
    (attends[f.uid] = attends[f.uid] || []).push(f.date); perDate[f.date] = (perDate[f.date] || 0) + 1;
  });
  Object.keys(attends).forEach((u) => attends[u].sort());
  const held = Object.keys(perDate).sort();                 // days a session really happened (at least one check-in)
  const lastTwo = held.slice(-2), last4 = held.slice(-4);

  const paired = d.buddies.filter((b) => b.status === 'paired'), buddyCount = {};
  paired.forEach((b) => { buddyCount[b.a] = (buddyCount[b.a] || 0) + 1; buddyCount[b.b] = (buddyCount[b.b] || 0) + 1; });

  // the schedule as visitors see it (file + organizers' edits), to name each day and each event
  const FILE_ID = /^d-\d{4}-\d{2}-\d{2}(-[a-z0-9-]{1,40})?$/, fileKey = (x) => x.key || x.date;
  const over = {}; d.events.filter((e) => FILE_ID.test(e.id)).forEach((e) => { over[e.id.slice(2)] = e; });
  const all = d.SESSIONS.map((x) => (over[fileKey(x)] && x.track !== 'break' ? Object.assign({}, x, over[fileKey(x)]) : x))
    .concat(d.events.filter((e) => !(FILE_ID.test(e.id) && d.SESSIONS.some((x) => fileKey(x) === e.id.slice(2)))))
    .filter((x) => x.date && x.track !== 'break');
  const shown = all.filter((x) => !x.hidden && !x.deleted && x.published !== false);
  const titleOn = {}; shown.forEach((x) => { titleOn[x.date] = titleOn[x.date] ? titleOn[x.date] + ' + ' + x.title : x.title; });
  const eventOf = {}; all.forEach((x) => { eventOf[x.id || 'd-' + fileKey(x)] = x; });

  const followUp = (m) => {
    if (m.role === 'organizer') return '';
    const a = attends[m.uid] || [], joined = day(m.joined || (reqBy[m.uid] || {}).at);
    if (a.length >= 2 && lastTwo.length === 2 && !a.some((x) => lastTwo.indexOf(x) !== -1)) return 'drifting';
    if (!a.length && joined && daysAgo(joined) >= 7) return 'never came';
    if (a.length < 3 && !buddyCount[m.uid] && ((a[0] && daysAgo(a[0]) <= 21) || (joined && daysAgo(joined) <= 21))) return 'newcomer without a buddy';
    return '';
  };
  const memberRows = members.map((m) => {
    const r = res[m.uid] || {}, a = attends[m.uid] || [], q = reqBy[m.uid] || {};
    return [m.uid, m.name || q.name || '', m.role || 'member', day(m.joined || q.at), q.lang || '', [].concat(q.interests || []).join(', '),
      r.rank || '', r.rankName || '', r.lifetime || 0, r.season || 0, r.nextName || '', (r.badges || []).join(', '),
      a.length, a[0] || '', a[a.length - 1] || '', buddyCount[m.uid] || 0, followUp(m)];
  }).sort((x, y) => y[8] - x[8]);

  const regCount = {};
  d.registrations.forEach((g) => { const c = (regCount[g.event] = regCount[g.event] || { confirmed: 0, pending: 0, waitlist: 0, cancelled: 0 }); if (g.status in c) c[g.status]++; });
  const regRows = Object.keys(regCount).map((id) => { const e = eventOf[id] || {}, c = regCount[id]; return [id, e.date || '', e.title || '', c.confirmed, c.pending, c.waitlist, c.cancelled, perDate[e.date] || 0]; })
    .sort((x, y) => (x[1] < y[1] ? 1 : -1));

  const voteCount = {};
  d.votes.forEach((v) => { const k = v.date + '\u0000' + v.choice; voteCount[k] = (voteCount[k] || 0) + 1; });
  const voteRows = Object.keys(voteCount).map((k) => k.split('\u0000').concat(voteCount[k])).sort();

  const nonOrg = memberRows.filter((r) => r[2] !== 'organizer'), count = (tag) => nonOrg.filter((r) => r[16] === tag).length;
  const active = Object.keys(attends).filter((u) => attends[u].some((x) => last4.indexOf(x) !== -1)).length;
  const joinedIn = (n) => memberRows.filter((r) => r[3] && daysAgo(r[3]) <= n).length;
  const byRank = {}; memberRows.forEach((r) => { byRank[r[6] || 'none'] = (byRank[r[6] || 'none'] || 0) + 1; });

  return {
    Summary: [['What', 'Value'], ['Updated (Paris time)', d.stamp], ['Members', memberRows.length], ['Joined in the last 7 days', joinedIn(7)],
      ['Joined in the last 30 days', joinedIn(30)], ['Came to at least one of the last 4 sessions', active],
      ['Check-ins at the last session', held.length ? perDate[held[held.length - 1]] + ' (' + held[held.length - 1] + ')' : ''],
      ['Average check-ins, last 4 sessions', last4.length ? Math.round(last4.reduce((s, x) => s + perDate[x], 0) / last4.length) : 0],
      ['Drifting (came twice or more, missed the last two sessions)', count('drifting')], ['Signed up 7+ days ago, never came', count('never came')],
      ['Newcomers without a buddy', count('newcomer without a buddy')], ['Buddy pairs', paired.length],
      ['Members per bandana', Object.keys(byRank).map((k) => k + ': ' + byRank[k]).join(' · ')],
      ['Note', 'A "session" here is a day with at least one check-in. No email or phone number is in this file.']],
    Members: [['uid', 'name', 'role', 'joined', 'language', 'interests', 'bandana', 'bandana name', 'lifetime points', 'season points', 'next bandana',
      'badges', 'check-ins', 'first check-in', 'last check-in', 'buddies', 'follow-up']].concat(memberRows),
    Sessions: [['date', 'check-ins', 'on the schedule that day']].concat(held.map((x) => [x, perDate[x], titleOn[x] || '']).reverse()),
    Registrations: [['event id', 'date', 'title', 'confirmed', 'pending', 'waitlist', 'cancelled', 'check-ins that day']].concat(regRows),
    Votes: [['session', 'choice', 'votes']].concat(voteRows),
  };
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
    (r.documents || []).forEach((x) => out.push(x)); token = r.nextPageToken || '';
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
