/**
 * aivancity Tech Club: the inbox of the Chrome extension "Tech Club · Inspiration".
 * Adds each item a team member sends (an Instagram save, an image, a video, a link or a page, with an optional note)
 * to the Inspiration library sheet, and saves images into the Inspiration folder so the agents can study them.
 * Deploy as a web app; see ../README.md.
 *
 * The key is NOT in this file: set it in Project Settings → Script properties → CLUB_KEY.
 */
const SHEET_ID = '1Q_sxKg3g4qXzKjzPs8dDZ0IHAmGNu2MezKWiyNv3wpU';   // Drive › 03 Marketing › Inspiration › Inspiration library
const FOLDER_ID = '1YSASWsXP1VY8cu4eQZddCPapg7ZL2YVM';             // Drive › 03 Marketing › Inspiration
const TAB = 'Reels';
const NOTE_COL = 12, NOTE_HEADER = 'Note from the team';
const MAX_BYTES = 15 * 1024 * 1024;

function doPost(e) {
  try {
    const d = JSON.parse((e.postData && e.postData.contents) || '{}');
    const key = PropertiesService.getScriptProperties().getProperty('CLUB_KEY');
    if (!key || d.key !== key) return out({ ok: false, error: 'clé incorrecte' });
    let url = clean(d.url, 2000);
    if (!/^https?:\/\//.test(url)) return out({ ok: false, error: 'lien non reconnu' });
    const ig = url.match(/^https:\/\/www\.instagram\.com\/(?:[^\/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (ig) url = 'https://www.instagram.com/' + (ig[1] === 'p' ? 'p' : 'reel') + '/' + ig[2] + '/';
    const media = /^https?:\/\//.test(d.media || '') ? clean(d.media, 4000) : '';

    const lock = LockService.getScriptLock(); lock.waitLock(15000);
    try {
      const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB);
      if (sh.getRange(1, NOTE_COL).getValue() !== NOTE_HEADER) sh.getRange(1, NOTE_COL).setValue(NOTE_HEADER);
      const last = sh.getLastRow();
      if (last > 1 && !media) {   // the same link again (an image is always added: one page can have several)
        const links = sh.getRange(2, 2, last - 1, 1).getFormulas().flat().map(String);
        if (links.some((l) => l.indexOf('"' + url + '"') !== -1)) return out({ ok: true, duplicate: true });
      }
      let file = '';
      if (media) file = saveImage(media, last);
      const account = d.account ? '@' + clean(d.account, 30).replace(/[^A-Za-z0-9._]/g, '')
                                : (url.match(/^https?:\/\/(?:www\.)?([^\/]+)/) || [])[1] || '';
      const note = [clean(d.note, 500), d.kind && d.kind !== 'instagram-save' ? '(' + d.kind + (d.title ? ' · ' + clean(d.title, 120) : '') + ')' : '']
                   .filter(String).join(' ');
      sh.appendRow([last, '=HYPERLINK("' + url.replace(/"/g, '%22') + '","Open")', Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd'),
                    clean(d.by, 40), account, '', '', '', '', '', file, note]);
      return out({ ok: true });
    } finally { lock.releaseLock(); }
  } catch (err) { return out({ ok: false, error: 'erreur du script' }); }
}

/* Saves an image into the Inspiration folder and returns a link to it ('' when it isn't an image or is too big). */
function saveImage(src, n) {
  try {
    const r = UrlFetchApp.fetch(src, { muteHttpExceptions: true, followRedirects: true });
    if (r.getResponseCode() !== 200) return '';
    const blob = r.getBlob(), type = String(blob.getContentType() || '');
    if (type.indexOf('image/') !== 0 || blob.getBytes().length > MAX_BYTES) return '';
    const ext = (type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '');
    const f = DriveApp.getFolderById(FOLDER_ID).createFile(blob.setName(('0' + n).slice(-2) + '-image.' + ext));
    return '=HYPERLINK("' + f.getUrl() + '","image")';
  } catch (e) { return ''; }
}

function clean(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
