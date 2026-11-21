#!/usr/bin/env node
/* What is REALLY on the club's schedule: assets/schedule.js with the organizers' live edits applied,
   exactly as the website shows it (same merge as allSessions() in assets/sessions.js).

     node tools/club-state/schedule.js            # today and later
     node tools/club-state/schedule.js --all      # the whole season
     node tools/club-state/schedule.js --json     # for other scripts

   Why: organizers move, hide and create events on the site (/event-edit, Manage). Those live in the database,
   not in schedule.js, so the file alone can be wrong. Agents must use THIS, never schedule.js on its own.
   It reads only what any visitor's browser reads (published events, with the site's public web key). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const SITE = 'https://aivancity-tech-club.github.io';

function fileSessions() {
  const box = {};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets/schedule.js'), 'utf8') + '\n;this.OUT = { CLUB, SESSIONS };', box);
  return box.OUT;
}
function webConfig() {
  const src = fs.readFileSync(path.join(ROOT, 'assets/platform/config.js'), 'utf8');
  const pick = (k) => (src.match(new RegExp(k + ':\\s*"([^"]+)"')) || [])[1];
  return { apiKey: pick('apiKey'), projectId: pick('projectId') };
}
const val = (v) => ('stringValue' in v ? v.stringValue : 'booleanValue' in v ? v.booleanValue : 'integerValue' in v ? Number(v.integerValue)
  : 'doubleValue' in v ? v.doubleValue : 'timestampValue' in v ? v.timestampValue
  : 'mapValue' in v ? doc(v.mapValue) : 'arrayValue' in v ? (v.arrayValue.values || []).map(val) : null);
const doc = (d) => Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, val(v)]));

async function liveEvents() {
  const { apiKey, projectId } = webConfig();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: {
    from: [{ collectionId: 'events' }], where: { fieldFilter: { field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } } } } }) });
  if (!res.ok) throw new Error('could not read the live events (HTTP ' + res.status + ')');
  return (await res.json()).filter((x) => x.document).map((x) => ({ id: x.document.name.split('/').pop(), ...doc(x.document) })).filter((e) => e.date);
}

(async () => {
  const { CLUB, SESSIONS } = fileSessions(), events = await liveEvents();
  const fileKey = (s) => s.key || s.date, FILE_ID = /^d-\d{4}-\d{2}-\d{2}(-[a-z0-9-]{1,40})?$/;
  const over = Object.fromEntries(events.filter((e) => FILE_ID.test(e.id)).map((e) => [e.id.slice(2), e]));
  const fromFile = SESSIONS.map((s) => (over[fileKey(s)] && s.track !== 'break' ? { ...s, ...over[fileKey(s)], _edited: true } : s));
  const madeOnSite = events.filter((e) => !(FILE_ID.test(e.id) && SESSIONS.some((s) => fileKey(s) === e.id.slice(2)))).map((e) => ({ ...e, _site: true }));
  const all = fromFile.concat(madeOnSite).map((s) => ({
    date: s.date, title: s.title, title_fr: s.title_fr || '', time: s.time || CLUB.defaultTime, room: s.room || CLUB.defaultRoom,
    lang: s.lang || '', level: s.level || '', format: s.format || '', track: s.track || '', description: s.description || '',
    status: s.deleted ? 'deleted' : s.hidden ? 'hidden' : s.cancelled ? 'cancelled' : s.planned ? 'planned (not confirmed)' : 'confirmed',
    source: s._site ? 'made on the site' : s._edited ? 'schedule.js, edited on the site' : 'schedule.js',
    link: SITE + (s.id ? '/event?id=' + encodeURIComponent(s.id) : '/event?d=' + encodeURIComponent(fileKey(s))),
  })).sort((a, b) => a.date.localeCompare(b.date));

  const today = new Date().toISOString().slice(0, 10), args = process.argv.slice(2);
  const rows = args.includes('--all') ? all : all.filter((s) => s.date >= today);
  if (args.includes('--json')) return console.log(JSON.stringify(rows, null, 1));
  console.log('date       | status                  | title | time | room | lang | source');
  for (const s of rows) {
    const off = s.status === 'hidden' || s.status === 'deleted';   // not shown to visitors
    console.log(`${s.date} | ${s.status.padEnd(23)} | ${off ? '(' + s.title + ')' : s.title} | ${s.track === 'break' ? '' : s.time} | ${s.track === 'break' ? '' : s.room} | ${s.lang} | ${s.source}`);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
