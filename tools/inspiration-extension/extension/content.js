/* Runs on instagram.com, in your own browser. It only watches YOUR clicks on the Save (bookmark) button,
   and sends the post's link and author to the club. It reads nothing else and clicks nothing for you. */
(() => {
  // the Save button's label, in the languages the team uses (when already saved it says Remove / Retirer)
  const SAVE = ['save', 'enregistrer', 'sauvegarder', 'guardar', 'speichern', 'salva'];
  const POST = /^\/(?:[^/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/;

  const label = (el) => (el.querySelector('svg[aria-label]')?.getAttribute('aria-label') || el.getAttribute('aria-label') || '').trim().toLowerCase();

  function postUrl(btn) {
    const box = btn.closest('article') || btn.closest('[role="dialog"]') || document;
    const own = location.pathname.match(POST);
    // in the feed: the post's own link (its date); on a post or Reel page: the page itself
    const a = box !== document && [...box.querySelectorAll('a[href]')].map((x) => x.getAttribute('href')).find((h) => POST.test(h));
    const m = (a && a.match(POST)) || own;
    if (!m) return null;
    const kind = m[1] === 'p' ? 'p' : 'reel';
    return `https://www.instagram.com/${kind}/${m[2]}/`;
  }

  function author(btn) {
    const box = btn.closest('article') || btn.closest('[role="dialog"]');
    if (box) {
      for (const a of box.querySelectorAll('header a[href^="/"], a[href^="/"][role="link"]')) {
        const h = a.getAttribute('href');
        const u = h.match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
        if (u && !['explore', 'reels', 'direct', 'accounts'].includes(u[1])) return u[1];
      }
    }
    const t = document.title.match(/@([A-Za-z0-9._]{1,30})/);   // "Name (@user) • Instagram"
    return t ? t[1] : '';
  }

  function toast(text, ok) {
    const d = document.createElement('div');
    d.textContent = text;
    d.style.cssText = `position:fixed;z-index:2147483647;left:50%;bottom:28px;transform:translateX(-50%);padding:10px 18px;border-radius:999px;
      font:600 14px/1.2 system-ui,sans-serif;color:#fff;background:${ok ? '#2b3767' : '#9b2c2c'};box-shadow:0 4px 18px rgba(0,0,0,.25)`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  }

  // capture phase: we read the label BEFORE Instagram switches it from "Save" to "Remove"
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[role="button"], button');
    if (!btn || !SAVE.includes(label(btn))) return;
    const url = postUrl(btn);
    if (!url) return;
    chrome.runtime.sendMessage({ type: 'saved', url, account: author(btn), savedAt: new Date().toISOString() }, (r) => {
      if (chrome.runtime.lastError) return;
      if (r && r.ok) toast(r.duplicate ? 'Déjà dans la bibliothèque du club' : 'Envoyé au club ✓', true);
      else toast(r && r.error ? 'Pas envoyé : ' + r.error : 'Pas envoyé', false);
    });
  }, true);
})();
