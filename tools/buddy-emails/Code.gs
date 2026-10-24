/**
 * aivancity Tech Club: buddy emails (free, no Firebase upgrade).
 *
 * Runs every 10 minutes in Google Apps Script, under the Google account that owns the Firebase project.
 * It reads the `buddies` collection and emails people so they don't miss anything:
 *   - someone asked them to be buddies (with the sender's message),
 *   - their request was accepted,
 *   - their buddy asked to end the pair.
 * Each email is sent once: the pair's document remembers it in a `mailed` field.
 * Email addresses come from private/{uid} (only organizers and this script can read them); nobody else sees them.
 *
 * Setup: see README.md next to this file.
 */

const PROJECT = 'aivancity-tech-club';                    // Firebase project id
const SITE = 'https://aivancity-tech-club.github.io';     // change this when the site moves
const FROM_NAME = 'aivancity Tech Club';
const BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';

/* ---------- run this once by hand: it sets the 10-minute timer ---------- */
function setup() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('run').timeBased().everyMinutes(10).create();
  // only things that happen from now on get an email (no flood of old requests)
  PropertiesService.getScriptProperties().setProperty('START', new Date().toISOString());
  Logger.log('Ready. Buddy emails go out every 10 minutes from now on.');
}

/* ---------- optional: check that sending works (emails you only) ---------- */
function testEmail() {
  const me = Session.getActiveUser().getEmail();
  send(me, 'en', 'request', { name: 'Test Ninja', msg: 'This is a test of the buddy emails. If you can read this, it works.' });
  Logger.log('Test email sent to ' + me);
}

/* ---------- the timer runs this ---------- */
function run() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;   // the previous run is still going
  try {
    const start = PropertiesService.getScriptProperties().getProperty('START') || new Date().toISOString();
    const cache = {};
    for (const doc of listAll('buddies')) {
      if (MailApp.getRemainingDailyQuota() < 2) { Logger.log('Daily email limit reached; the rest go out tomorrow.'); return; }
      const id = doc.name.split('/').pop(), f = plain(doc.fields || {}), mailed = f.mailed || {};
      const created = f.createdAt || '', accepted = f.acceptedAt || '', endAt = f.endAt || '';
      // 1. a new request: tell the person who was asked
      if (f.status === 'pending' && !mailed.req && created >= start) {
        if (notify(cache, f.b, 'request', { name: who(cache, f.a).name, msg: f.msg || '' })) mark(id, 'req', true);
      }
      // 2. accepted: tell the person who asked
      if (f.status === 'paired' && !mailed.ok && accepted >= start) {
        if (notify(cache, f.a, 'accepted', { name: who(cache, f.b).name })) mark(id, 'ok', true);
      }
      // 3. one of them asked to end the pair: tell the other one
      if (f.status === 'paired' && f.endBy && endAt && mailed.end !== endAt && endAt >= start) {
        const other = f.endBy === f.a ? f.b : f.a;
        if (notify(cache, other, 'end', { name: who(cache, f.endBy).name })) mark(id, 'end', endAt);
      }
    }
  } finally { lock.releaseLock(); }
}

/* ---------- people: name (members), email (private), language (requests) ---------- */
function who(cache, uid) {
  if (cache[uid]) return cache[uid];
  const m = plain((getDoc('members/' + uid) || {}).fields || {});
  const p = plain((getDoc('private/' + uid) || {}).fields || {});
  const r = plain((getDoc('requests/' + uid) || {}).fields || {});
  return (cache[uid] = { name: m.name || r.name || 'A club member', email: p.email || r.email || '', lang: r.lang === 'fr' ? 'fr' : 'en' });
}
function notify(cache, uid, kind, data) {
  const p = who(cache, uid);
  if (!p.email) { Logger.log('No email for ' + uid + '; skipped.'); return true; }   // nothing to send to: don't retry forever
  try { send(p.email, p.lang, kind, data); return true; }
  catch (e) { Logger.log('Could not email ' + uid + ': ' + e); return false; }
}

/* ---------- the emails ---------- */
const TEXT = {
  en: {
    request: { subject: n => n + ' wants to be your buddy', lead: n => '<b>' + n + '</b> sent you a Renkei buddy request on the Tech Club site.',
      quote: 'Their message:', cta: 'Answer on the Mountain' },
    accepted: { subject: n => n + ' is your buddy now', lead: n => '<b>' + n + '</b> accepted your buddy request. You\'re tied together: say hi on Thursday!', cta: 'See your buddies' },
    end: { subject: n => n + ' asked to end your buddy pair', lead: n => '<b>' + n + '</b> asked to end your buddy pair. It only ends if you agree.', cta: 'Answer on the Mountain' },
    foot: 'You get this because you\'re a member of the aivancity Tech Club. Buddy emails only, nothing else.',
  },
  fr: {
    request: { subject: n => n + ' veut être votre binôme', lead: n => '<b>' + n + '</b> vous a envoyé une demande de binôme Renkei sur le site du Tech Club.',
      quote: 'Son message :', cta: 'Répondre sur la Montagne' },
    accepted: { subject: n => n + ' est maintenant votre binôme', lead: n => '<b>' + n + '</b> a accepté votre demande de binôme. Vous êtes liés : dites bonjour jeudi !', cta: 'Voir vos binômes' },
    end: { subject: n => n + ' a demandé à défaire votre binôme', lead: n => '<b>' + n + '</b> a demandé à défaire votre binôme. Il ne sera défait que si vous êtes d\'accord.', cta: 'Répondre sur la Montagne' },
    foot: 'Vous recevez cet e-mail parce que vous êtes membre de l\'aivancity Tech Club. Seulement les e-mails de binôme, rien d\'autre.',
  },
};
function send(to, lang, kind, d) {
  const L = TEXT[lang] || TEXT.en, t = L[kind], name = esc(d.name);
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1e1e1e">'
    + '<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b625b;margin:0 0 12px">aivancity Tech Club · Renkei</p>'
    + '<p style="font-size:17px;line-height:1.5;margin:0 0 16px">' + t.lead(name) + '</p>'
    + (d.msg ? '<p style="margin:0 0 6px;color:#6b625b;font-size:14px">' + t.quote + '</p><blockquote style="margin:0 0 20px;padding:10px 14px;border-left:4px solid #1e1e1e;background:#fbf6ee;font-style:italic;font-size:15px">' + esc(d.msg) + '</blockquote>' : '')
    + '<p style="margin:0 0 28px"><a href="' + SITE + '/mountain#me" style="display:inline-block;background:#2e3a6e;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px">' + t.cta + ' →</a></p>'
    + '<p style="font-size:12px;color:#8a817a;margin:0">' + L.foot + '</p></div>';
  MailApp.sendEmail({ to, subject: t.subject(d.name), htmlBody: html, name: FROM_NAME });
}

/* ---------- Firestore (REST, with this account's own access) ---------- */
function req(url, opts) {
  const r = UrlFetchApp.fetch(url, Object.assign({
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': PROJECT },
    muteHttpExceptions: true, contentType: 'application/json',
  }, opts || {}));
  const code = r.getResponseCode();
  if (code === 404) return null;
  if (code >= 300) throw new Error('Firestore ' + code + ': ' + r.getContentText().slice(0, 300));
  return JSON.parse(r.getContentText() || '{}');
}
function getDoc(path) { return req(BASE + '/' + path); }
function listAll(col) {
  const out = []; let token = '';
  do {
    const r = req(BASE + '/' + col + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : '')) || {};
    (r.documents || []).forEach(d => out.push(d)); token = r.nextPageToken || '';
  } while (token);
  return out;
}
// remember that an email went out (only touches mailed.<key>; does nothing if the pair was deleted meanwhile)
function mark(id, key, value) {
  const v = typeof value === 'boolean' ? { booleanValue: value } : { stringValue: String(value) };
  req(BASE + '/buddies/' + id + '?updateMask.fieldPaths=mailed.' + key + '&currentDocument.exists=true',
    { method: 'patch', payload: JSON.stringify({ fields: { mailed: { mapValue: { fields: { [key]: v } } } } }) });
}
// Firestore's typed values -> plain values (timestamps stay as ISO strings, so they compare as text)
function plain(fields) {
  const o = {};
  for (const k in fields) o[k] = val(fields[k]);
  return o;
}
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
