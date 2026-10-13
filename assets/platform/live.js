/* Members-only live bits on public pages (home, schedule): "I'm going" and votes.
   Visitors never load Firebase. For members (html.is-member) this loads the platform quietly,
   then publishes window.CLUB_LIVE and fires a "club:live" event that schedule.js listens to. */
(function () {
'use strict';
if (!document.documentElement.classList.contains('is-member')) return;
const v = (document.currentScript && document.currentScript.src.split('?')[1]) || '';
const load = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src + (v ? '?' + v : ''); s.onload = res; s.onerror = rej; document.head.appendChild(s); });
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

(async () => {
  try {
    if (!window.CLUB_PLATFORM) await load('/assets/platform/config.js');
    if (!window.ClubData) await load('/assets/platform/data.js');
    const data = ClubData.create();
    await data.init();
    data.onAuth(async (user) => {
      if (!user || !user.verified) return;
      try {
        const from = today();
        const [rsvps, votes, members] = await Promise.all([data.loadRsvps(from), data.loadVotes(from), data.loadMembers()]);
        window.CLUB_LIVE = { data, uid: data.currentUid(), rsvps, votes, names: Object.fromEntries(members.map(m => [m.uid, m.name])) };
        dispatchEvent(new CustomEvent('club:live'));
      } catch (e) { /* not a member after all, or offline: the public page still works */ }
    });
  } catch (e) {}
})();
})();
