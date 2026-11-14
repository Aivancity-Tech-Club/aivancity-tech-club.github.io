let tab;
chrome.tabs.query({ active: true, currentWindow: true }, ([t]) => { tab = t; document.getElementById('page').textContent = (t && (t.title || t.url)) || ''; });
document.getElementById('go').addEventListener('click', () => {
  const s = document.getElementById('s'); s.textContent = 'Envoi…';
  const item = { kind: 'page', url: (tab && tab.url) || '', title: (tab && tab.title) || '', note: document.getElementById('note').value.trim().slice(0, 500) };
  chrome.runtime.sendMessage({ type: 'send', item }, (r) => {
    s.textContent = r && r.ok ? (r.duplicate ? 'Déjà dans la bibliothèque ✓' : 'Envoyé au club ✓') : 'Pas envoyé : ' + ((r && r.error) || 'erreur');
    if (r && r.ok) setTimeout(() => window.close(), 1200);
  });
});
