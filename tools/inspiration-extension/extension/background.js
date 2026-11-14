/* Sends what you choose to the club's Apps Script (address and key are in the extension's settings).
   Three ways in: Instagram's Save button (content.js), right-click on anything, and the extension's icon. */
async function sendItem(item) {
  const { endpoint, key, name } = await chrome.storage.sync.get({ endpoint: '', key: '', name: '' });
  if (!endpoint) return { ok: false, error: 'réglez l’extension (clic droit sur l’icône › Options)' };
  try {
    // text/plain keeps it a "simple" request, which Apps Script accepts without extra set-up
    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ key, by: name, ...item }) });
    const data = await r.json().catch(() => ({}));
    return data.ok ? { ok: true, duplicate: !!data.duplicate } : { ok: false, error: data.error || 'HTTP ' + r.status };
  } catch (e) { return { ok: false, error: 'réseau' }; }
}
self.sendItem = sendItem;

function flash(ok) {   // a ✓ or ! on the icon for 3 seconds (right-click has no other way to answer)
  chrome.action.setBadgeBackgroundColor({ color: ok ? '#2b3767' : '#9b2c2c' });
  chrome.action.setBadgeText({ text: ok ? '✓' : '!' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => chrome.contextMenus.create({
    id: 'send', title: 'Envoyer au Tech Club', contexts: ['image', 'video', 'link', 'page', 'selection'] }));
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const kind = info.mediaType || (info.linkUrl ? 'link' : info.selectionText ? 'text' : 'page');
  const media = info.srcUrl && /^https?:/.test(info.srcUrl) ? info.srcUrl : '';   // blob: videos can't be fetched: the page link is kept
  const res = await sendItem({ kind, url: info.linkUrl || info.pageUrl || (tab && tab.url) || '', page: info.pageUrl || '',
    media, title: (tab && tab.title) || '', note: info.selectionText ? info.selectionText.slice(0, 300) : '' });
  flash(res.ok);
});

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === 'saved') sendItem({ kind: 'instagram-save', url: msg.url, account: msg.account }).then(reply);
  else if (msg.type === 'send') sendItem(msg.item).then((r) => { flash(r.ok); reply(r); });
  else return;
  return true;   // keeps the channel open for the async reply
});
