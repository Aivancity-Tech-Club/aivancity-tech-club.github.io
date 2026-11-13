/* /projects: the club's projects, from the database (projects/{id}),
   and organizers add and edit them here. The About page uses this file too, read-only (it has no organizer form). */
(function () {
  const READONLY = !document.getElementById('pjForm'), stubs = {};
  // on a read-only page, the organizer controls don't exist: hand back a detached element so the code below stays simple
  const $ = (id) => document.getElementById(id) || stubs[id] || (stubs[id] = document.createElement(/Title|Tags|Pub|Link|Repo|Image|Date|Meta|Desc|Text/.test(id) ? 'input' : 'div')), T = (k, v) => I18N.t(k, v);
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pick = (p, f) => I18N.pick(p, f) || p[f] || '';
  let data, projects = [], isOrg = false, editing = null, delSure = false;
  try { data = ClubData.create(); } catch (e) { return; }

  function card(p) {
    const title = pick(p, 'title'), when = p.date ? new Date(p.date + 'T12:00').toLocaleDateString(I18N.locale(), { month: 'long', year: 'numeric' }) : '';
    const cover = p.image ? `<img class="pj-img" src="${esc(p.image)}" alt="" loading="lazy">`
      : `<span class="sub">${esc(when)}</span><span class="name pj-name">${esc(title)}</span>`;
    return `<article class="proj" aria-labelledby="pj_${esc(p.id)}">
      <div class="proj-cover${p.image ? ' has-img' : ' pj-cover'}" aria-hidden="true">${cover}</div>
      <div class="proj-body">
        <h2 id="pj_${esc(p.id)}">${esc(title)}${!p.published ? ` <span class="chip">${esc(T('pj.hidden'))}</span>` : ''}</h2>
        ${pick(p, 'desc') ? `<p>${esc(pick(p, 'desc')).replace(/\n/g, '<br>')}</p>` : ''}
        ${(p.tags || []).length ? `<ul class="proj-tags" aria-label="${esc(T('pj.skills'))}">${p.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${pick(p, 'meta') ? `<p class="proj-meta">${esc(pick(p, 'meta'))}</p>` : ''}
        <p class="proj-actions">
          ${p.link ? `<a class="btn btn-primary" href="${esc(p.link)}" target="_blank" rel="noopener">${esc(pick(p, 'linkText') || T('pj.open'))} →</a>` : ''}
          ${p.repo ? `<a class="btn btn-ghost" href="${esc(p.repo)}" target="_blank" rel="noopener">${esc(T('pj.code'))}</a>` : ''}
          ${isOrg ? `<button type="button" class="btn btn-ghost" data-pj-edit="${esc(p.id)}">${esc(T('pj.edit'))}</button>
          <button type="button" class="btn btn-ghost" data-pj-del="${esc(p.id)}">${esc(T('pj.delete'))}</button>` : ''}
        </p>
      </div>
    </article>`;
  }
  function render() {
    const list = projects.filter(p => !p.removed).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    $('siteProjects').innerHTML = list.map(card).join('');
  }
  async function load() {
    try { projects = await data.loadProjects(isOrg); } catch (e) { projects = []; }
    render();
  }

  /* ---------- organizers: add and edit ---------- */
  const F = { title: 'pjTitle', title_fr: 'pjTitleFr', desc: 'pjDesc', desc_fr: 'pjDescFr', meta: 'pjMeta', meta_fr: 'pjMetaFr', link: 'pjLink', repo: 'pjRepo',
    linkText: 'pjLinkText', linkText_fr: 'pjLinkTextFr', image: 'pjImage', date: 'pjDate' };
  function openForm(p) {
    editing = p ? p.id : null; delSure = false;
    Object.entries(F).forEach(([k, id]) => { $(id).value = (p && p[k]) || ''; });
    $('pjTags').value = ((p && p.tags) || []).join(', ');
    $('pjPub').checked = !p || p.published !== false;
    $('pjFormH').textContent = T(p ? 'pj.edit.h' : 'pj.add.h');
    $('pjDel').hidden = !p; $('pjDel').textContent = T('pj.delete'); $('pjMsg').hidden = true;
    $('pjForm').hidden = false; $('pjForm').scrollIntoView({ block: 'start', behavior: 'smooth' }); $('pjTitle').focus({ preventScroll: true });
  }
  function closeForm() { $('pjForm').hidden = true; editing = null; }
  $('pjAdd').addEventListener('click', () => openForm(null));
  $('pjCancel').addEventListener('click', closeForm);
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-pj-edit]'); if (b) openForm(projects.find(p => p.id === b.dataset.pjEdit)); });
  $('pjForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const p = Object.fromEntries(Object.entries(F).map(([k, id]) => [k, $(id).value.trim()]));
    p.tags = $('pjTags').value; p.published = $('pjPub').checked; if (editing) p.id = editing;
    const bad = (k, msg) => { $('pjMsg').textContent = T(msg); $('pjMsg').hidden = false; $(F[k] || k).focus(); };
    if (p.title.length < 2) return bad('title', 'pj.err.title');
    for (const k of ['link', 'repo', 'image']) if (p[k] && !/^https:\/\/\S+$/.test(p[k])) return bad(k, 'pj.err.url');
    $('pjSave').disabled = true;
    const r = await data.saveProject(p);
    $('pjSave').disabled = false;
    if (!r.ok) { $('pjMsg').textContent = T(r.code || 'err.generic'); $('pjMsg').hidden = false; return; }
    closeForm(); await load();
    const c = $('pj_' + r.id); if (c) c.closest('.proj').scrollIntoView({ block: 'center' });
  });
  // Delete straight from a card: first click asks, second click deletes
  let armed = null;
  async function remove(id) {
    const r = await data.deleteProject(id);
    $('pjNote').hidden = r.ok; if (!r.ok) { $('pjNote').textContent = T(r.code || 'err.generic'); return; }
    if (editing === id) closeForm();
    await load();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pj-del]');
    if (armed && armed !== b) { armed.textContent = T('pj.delete'); armed.classList.remove('btn-danger'); armed = null; }
    if (!b) return;
    if (armed !== b) { armed = b; b.textContent = T('pj.delete.sure'); b.classList.add('btn-danger'); return; }
    armed = null; b.disabled = true; remove(b.dataset.pjDel);
  });
  $('pjDel').addEventListener('click', async () => {
    if (!delSure) { delSure = true; $('pjDel').textContent = T('pj.delete.sure'); $('pjDel').classList.add('btn-danger'); return; }
    const r = await data.deleteProject(editing);
    if (r.ok) { closeForm(); await load(); } else { $('pjMsg').textContent = T(r.code || 'err.generic'); $('pjMsg').hidden = false; }
  });
  addEventListener('langchange', () => { render(); if (!$('pjForm').hidden) $('pjFormH').textContent = T(editing ? 'pj.edit.h' : 'pj.add.h'); });

  Promise.resolve(data.init && data.init()).then(() => {
    load();
    if (!data.onAuth) return;
    data.onAuth(async (u) => {
      if (!u || !u.verified) return;
      const prof = await (data.getProfile ? data.getProfile(u.uid).catch(() => null) : null);
      const org = !!(prof && prof.role === 'organizer') || (data.mode === 'demo' && new URLSearchParams(location.search).has('elder'));
      if (org && !isOrg && !READONLY) { isOrg = true; $('pjAdmin').hidden = false; load(); }
    });
  }).catch(() => {});
})();
