/* Sends each saved post to the club's Apps Script (the address and key are set in the extension's settings). */
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type !== 'saved') return;
  chrome.storage.sync.get({ endpoint: '', key: '', name: '' }, async ({ endpoint, key, name }) => {
    if (!endpoint) return reply({ ok: false, error: 'réglez l’extension (icône › Réglages)' });
    try {
      // text/plain keeps it a "simple" request, which Apps Script accepts without extra set-up
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ key, by: name, url: msg.url, account: msg.account, savedAt: msg.savedAt }) });
      const data = await r.json().catch(() => ({}));
      reply(data.ok ? { ok: true, duplicate: !!data.duplicate } : { ok: false, error: data.error || ('HTTP ' + r.status) });
    } catch (e) { reply({ ok: false, error: 'réseau' }); }
  });
  return true;   // keeps the channel open for the async reply
});
