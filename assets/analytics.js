/* Visitor counts with Cloudflare Web Analytics: free, no cookies, nothing shown to visitors.
   To turn it on: Cloudflare dashboard → Analytics & Logs → Web Analytics → Add a site → copy the token
   from the snippet it shows ({"token": "…"}) and paste it below. Empty = off. The stats are at
   dash.cloudflare.com → Web Analytics (only people with access to the club's Cloudflare account see them). */
(function () {
  var TOKEN = '7b2e9c4c2b2a44c08dfda3701760aaa3';
  if (!TOKEN || location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
  var s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: TOKEN }));
  document.head.appendChild(s);
})();
