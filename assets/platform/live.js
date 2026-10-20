/* Members-only live bits on public pages (home, schedule): one-tap "I'm going" (your own registrations) and votes.
   Visitors never load Firebase. For members (html.is-member) this loads the platform quietly,
   then publishes window.CLUB_LIVE and fires a "club:live" event that sessions.js listens to. */
(function () {
'use strict';
if (!document.documentElement.classList.contains('is-member')) return;
const v = (document.currentScript && document.currentScript.src.split('?')[1]) || '';
const load = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src + (v ? '?' + v : ''); s.onload = res; s.onerror = rej; document.head.appendChild(s); });
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* "I'm going" used to live in its own list (rsvps). Move this member's upcoming ones into registrations, once, then remove them. */
async function moveOldRsvps(data, from) {
  try {
    const old = await data.myRsvps(); if (!old.length) return;
    for (const r of old) {
      if (r.date >= from && window.findFileSession && findFileSession(r.date)) { const k = 'd-' + r.date; if (!(await data.register(k, 'confirmed')).ok) await data.register(k, 'pending'); }
      await data.setRsvp(r.date, false);
    }
  } catch (e) { /* tried again next time */ }
}

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
        // the old "I'm going" list is moved over once per device, in the background (it never holds the page up)
        let moved = false; try { moved = localStorage.getItem('nw-rsvp-moved') === user.uid; } catch (e) {}
        if (!moved) moveOldRsvps(data, from).then(() => { try { localStorage.setItem('nw-rsvp-moved', user.uid); } catch (e) {} });
        // only what these pages show: your own spots and the session votes (no list of all members)
        const [votes, regs] = await Promise.all([data.loadVotes(from), data.myRegistrations()]);
        window.CLUB_LIVE = { data, uid: data.currentUid(), regs, votes };
        dispatchEvent(new CustomEvent('club:live'));
      } catch (e) { /* not a member after all, or offline: the public page still works */ }
    });
  } catch (e) {}
})();
})();
