/**
 * aivancity Tech Club: receives posts saved on Instagram (from the Chrome extension) and adds them to the
 * Inspiration library sheet. Deploy as a web app; see ../README.md.
 *
 * The key is NOT in this file: set it in Project Settings → Script properties → CLUB_KEY.
 */
const SHEET_ID = '1Q_sxKg3g4qXzKjzPs8dDZ0IHAmGNu2MezKWiyNv3wpU';   // Drive › 03 Marketing › Inspiration › Inspiration library
const TAB = 'Reels';

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    const key = PropertiesService.getScriptProperties().getProperty('CLUB_KEY');
    if (!key || d.key !== key) return out({ ok: false, error: 'clé incorrecte' });
    const url = String(d.url || '');
    if (!/^https:\/\/www\.instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/$/.test(url)) return out({ ok: false, error: 'lien non reconnu' });
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB);
      const last = sh.getLastRow();
      const links = last > 1 ? sh.getRange(2, 2, last - 1, 1).getFormulas().flat().concat(sh.getRange(2, 2, last - 1, 1).getValues().flat()) : [];
      if (links.some((l) => String(l).indexOf(url) !== -1)) return out({ ok: true, duplicate: true });
      const account = String(d.account || '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 30);
      sh.appendRow([last, '=HYPERLINK("' + url + '","Open")', Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd'),
                    String(d.by || '').slice(0, 40), account ? '@' + account : '', '', '', '', '', '', '']);
      return out({ ok: true });
    } finally { lock.releaseLock(); }
  } catch (err) { return out({ ok: false, error: 'erreur du script' }); }
}

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
