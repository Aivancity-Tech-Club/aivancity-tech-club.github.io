/* /showcase: apps built by aivancity students. The list lives in assets/showcase-apps.js.
   Category buttons and a search box filter the cards; the chosen category is kept in the address (?c=health) so it can be shared.
   The home page uses this file too (#scHome): it shows 3 apps, apps marked featured: true first, the others taking turns each day. */
(function () {
  const grid = document.getElementById('scGrid'), cats = document.getElementById('scCats'), search = document.getElementById('scSearch');
  const count = document.getElementById('scCount'), empty = document.getElementById('scEmpty'), home = document.getElementById('scHome');
  if ((!grid && !home) || typeof SHOWCASE_APPS === 'undefined') return;
  const T = (k, v) => I18N.t(k, v), pick = (o, f) => I18N.pick(o, f) || o[f] || '';
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https:\/\/\S+$/.test(u || '') ? u : '');
  const catOf = (id) => SHOWCASE_CATEGORIES.find(c => c.id === id);
  const apps = SHOWCASE_APPS.filter(a => a && a.id && a.name);
  let current = new URLSearchParams(location.search).get('c') || 'all';
  if (current !== 'all' && !catOf(current)) current = 'all';

  function logo(a) {
    return a.logo ? `<img class="sc-logo" src="assets/showcase/${esc(a.logo)}" alt="" width="56" height="56" loading="lazy">`
      : `<span class="sc-logo sc-letter" style="background:${esc(/^#[0-9a-f]{3,8}$/i.test(a.color || '') ? a.color : '#2b3767')}" aria-hidden="true">${esc(a.name.trim()[0].toUpperCase())}</span>`;
  }
  function card(a, h = 'h2') {
    const cat = catOf(a.category), link = safeUrl(a.link), repo = safeUrl(a.repo);
    const cover = a.cover ? `<img src="assets/showcase/${esc(a.cover)}" alt="${esc(T('sc.shot', { name: a.name }))}" width="960" height="600" loading="lazy">`
      : `<span class="sc-cover-name" aria-hidden="true">${esc(a.name)}</span>`;
    return `<article class="sc-card" id="${esc(a.id)}" aria-labelledby="sc_${esc(a.id)}">
      <div class="sc-cover${a.cover ? '' : ' sc-cover-plain'}" ${a.cover ? '' : `style="--sc-c:${esc(a.color || '#2b3767')}"`}>${cover}</div>
      <div class="sc-body">
        <div class="sc-head">${logo(a)}
          <div><${h} id="sc_${esc(a.id)}">${esc(a.name)}</${h}>
          ${cat ? `<p class="sc-cat">${esc(pick(cat, 'title'))}</p>` : ''}</div>
        </div>
        <p class="sc-tag">${esc(pick(a, 'tagline'))}</p>
        <p class="sc-desc">${esc(pick(a, 'description'))}</p>
        ${pick(a, 'note') ? `<p class="sc-note">${esc(pick(a, 'note'))}</p>` : ''}
        ${a.by || pick(a, 'season') ? `<p class="sc-meta">${[a.by ? esc(T('sc.by', { names: a.by })) : '', esc(pick(a, 'season'))].filter(Boolean).join(' · ')}</p>` : ''}
        <p class="sc-actions">
          ${link ? `<a class="btn btn-primary" href="${esc(link)}" target="_blank" rel="noopener">${esc(T('sc.open'))} <span aria-hidden="true">↗</span><span class="sr-only"> ${esc(T('sc.newtab'))}</span></a>` : ''}
          ${repo ? `<a class="btn btn-ghost" href="${esc(repo)}" target="_blank" rel="noopener">${esc(T('sc.code'))}<span class="sr-only"> ${esc(T('sc.newtab'))}</span></a>` : ''}
        </p>
      </div>
    </article>`;
  }
  // home page: 3 apps with a screenshot; featured ones first, then the rest in an order that changes once a day
  if (home) {
    const day = Math.floor(Date.now() / 864e5), seeded = (id) => { let h = day; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 2147483647; return h; };
    const pool = apps.filter(a => a.cover && safeUrl(a.link) && a.id !== 'tech-club'); // the club's own site is not shown on its own home page
    const chosen = pool.filter(a => a.featured).concat(pool.filter(a => !a.featured).sort((a, b) => seeded(a.id) - seeded(b.id))).slice(0, 3);
    const draw = () => { home.innerHTML = chosen.map(a => card(a, 'h3')).join(''); };
    const section = home.closest('section'); if (section) section.hidden = !chosen.length;
    draw(); addEventListener('langchange', draw);
    return;
  }
  function matches(a, q) {
    if (!q) return true;
    const cat = catOf(a.category) || {};
    return [a.name, a.tagline, a.tagline_fr, a.description, a.description_fr, a.by, cat.title, cat.title_fr].join(' ').toLowerCase().includes(q);
  }
  function renderCats() {
    const n = (id) => apps.filter(a => id === 'all' || a.category === id).length;
    const btn = (id, label) => `<button type="button" class="sc-chip" data-cat="${esc(id)}" aria-pressed="${current === id}">${esc(label)} <small>${n(id)}</small></button>`;
    cats.innerHTML = btn('all', T('sc.all')) + SHOWCASE_CATEGORIES.filter(c => n(c.id)).map(c => btn(c.id, pick(c, 'title'))).join('');
  }
  function render() {
    const q = search.value.trim().toLowerCase();
    const list = apps.filter(a => (current === 'all' || a.category === current) && matches(a, q));
    grid.innerHTML = list.map(a => card(a)).join('');
    empty.hidden = list.length > 0;
    count.textContent = T(list.length === 1 ? 'sc.count1' : 'sc.count', { n: list.length });
  }
  cats.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    current = b.dataset.cat;
    const u = new URL(location.href); if (current === 'all') u.searchParams.delete('c'); else u.searchParams.set('c', current);
    history.replaceState(null, '', u);
    renderCats(); render();
    const again = cats.querySelector(`[data-cat="${current}"]`); if (again) again.focus();
  });
  search.addEventListener('input', render);
  document.getElementById('scReset').addEventListener('click', () => { search.value = ''; current = 'all'; history.replaceState(null, '', location.pathname); renderCats(); render(); search.focus(); });
  document.getElementById('scTotal').textContent = apps.length;
  addEventListener('langchange', () => { renderCats(); render(); });
  renderCats(); render();
  if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView({ block: 'start' }); }
})();
