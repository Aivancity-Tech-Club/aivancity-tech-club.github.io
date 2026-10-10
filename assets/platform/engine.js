/* Points engine: turns recorded facts into points, bandanas and badges using rules/rules.yaml.
   Pure and deterministic: the same facts and rulebook always give the same result, so anyone can recompute.

   Fact shape (one record per thing that happened):
     { id, uid, type, date: "YYYY-MM-DD", status: "approved"|"pending"|"rejected",
       double?, place?, team?, proof?, title?, mentee?, newMember? }
   type is a rule id from the rulebook: attend, compete_enter, compete_place, talk_lightning, workshop,
   host_event, ship_project, club_contribution, open_source, skill_badge, certification, mentoring, referral.
   ("compete_place" uses compete_place_team when team is true, otherwise compete_place_solo.) */
(function (root) {
'use strict';

const ACC_ALIAS = { party_hat: 'party', cat_ears: 'catears' };
const normAcc = (a) => ACC_ALIAS[a] || a;

function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z'), day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return d.getUTCFullYear() + '-W' + (1 + Math.round(((d - first) / 864e5 - 3 + ((first.getUTCDay() + 6) % 7)) / 7));
}
const seasonOf = (rb, date) => (rb.seasons || []).find(s => date >= s.start && date <= s.end);

function ruleFor(rb, fact) {
  const id = fact.type === 'compete_place' ? (fact.team ? 'compete_place_team' : 'compete_place_solo') : fact.type;
  return (rb.rules || []).find(r => r.id === id);
}
function basePoints(rule, fact) {
  if (!rule) return 0;
  if (typeof rule.points === 'number') return rule.points;
  return Number(rule.points[fact.place] || rule.points[String(fact.place)] || 0);
}
function multiplier(rb, rule, fact) {
  if (!fact.double || !rule) return 1;
  const m = (rb.multipliers || []).find(x => (x.applies_to || []).includes(rule.id));
  return m ? m.factor : 1;
}

/* regularSessions: sorted list of "YYYY-MM-DD" dates of regular sessions that already happened */
function computeMember(rb, uid, facts, regularSessions, today) {
  const mine = facts.filter(f => f.uid === uid).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const history = [];   // every fact with the points it earned and why
  const counted = [];
  const seen = { attend: new Set(), ship: new Set(), referral: new Set(), month: {}, week: new Set() };
  const LIMIT_MONTH = { club_contribution: 3, open_source: 2 };

  for (const f of mine) {
    const rule = ruleFor(rb, f);
    const needsVerify = rule && rule.verified_by === 'organizer';
    let pts = 0, note = '';
    if (!rule) note = 'Unknown rule';
    else if (f.status === 'rejected') note = 'Not accepted' + (f.reason ? ': ' + f.reason : '');
    else if (needsVerify && f.status !== 'approved') note = 'Waiting for an organizer';
    else if (f.type === 'attend' && seen.attend.has(f.date)) note = 'Already checked in';
    else if (f.type === 'ship_project' && seen.ship.has(f.proof)) note = 'Project already counted';
    else if (f.type === 'referral' && seen.referral.has(f.newMember)) note = 'Already counted';
    else if (LIMIT_MONTH[f.type] && (seen.month[f.type + f.date.slice(0, 7)] || 0) >= LIMIT_MONTH[f.type]) note = 'Monthly limit reached';
    else if (f.type === 'mentoring' && seen.week.has(f.mentee + isoWeek(f.date))) note = 'Weekly limit for this pair reached';
    else {
      pts = basePoints(rule, f) * multiplier(rb, rule, f);
      if (f.type === 'attend') seen.attend.add(f.date);
      if (f.type === 'ship_project') seen.ship.add(f.proof);
      if (f.type === 'referral') seen.referral.add(f.newMember);
      if (LIMIT_MONTH[f.type]) { const k = f.type + f.date.slice(0, 7); seen.month[k] = (seen.month[k] || 0) + 1; }
      if (f.type === 'mentoring') seen.week.add(f.mentee + isoWeek(f.date));
      counted.push(f);
    }
    history.push({ fact: f, points: pts, note, rule: rule ? rule.name : f.type });
  }

  // streaks over regular sessions
  const attended = new Set(counted.filter(f => f.type === 'attend').map(f => f.date));
  let run = 0, maxRun = 0;
  const streakRule = (rb.rules || []).find(r => r.id === 'streak');
  for (const d of regularSessions) {
    if (d > today) break;
    if (attended.has(d)) {
      run++; maxRun = Math.max(maxRun, run);
      if (streakRule && run % 4 === 0) history.push({ fact: { id: 'streak-' + d, uid, type: 'streak', date: d, status: 'approved' }, points: streakRule.points, note: '', rule: streakRule.name });
    } else run = 0;
  }

  // per-session cap on regular Thursdays (double-points events are not capped)
  const cap = (rb.sessions && rb.sessions.point_cap_per_regular_session) || Infinity;
  const regular = new Set(regularSessions);
  const byDate = {};
  for (const h of history) if (h.points > 0 && regular.has(h.fact.date) && !h.fact.double) (byDate[h.fact.date] = byDate[h.fact.date] || []).push(h);
  for (const list of Object.values(byDate)) {
    let total = 0;
    for (const h of list) { const room = Math.max(0, cap - total); if (h.points > room) { h.note = `Session cap of ${cap} reached`; h.points = room; } total += h.points; }
  }
  history.sort((a, b) => (a.fact.date < b.fact.date ? 1 : a.fact.date > b.fact.date ? -1 : 0));

  const ok = history.filter(h => h.points > 0 || (h.fact.type === 'attend' && !h.note));
  const count = (t) => ok.filter(h => h.fact.type === t || (t === 'compete_place' && h.fact.type === 'compete_place')).length;
  const lifetime = history.reduce((a, h) => a + h.points, 0);
  const season = seasonOf(rb, today);
  const seasonPts = season ? history.filter(h => h.fact.date >= season.start && h.fact.date <= season.end).reduce((a, h) => a + h.points, 0) : 0;
  const seasonsActive = new Set(ok.filter(h => h.fact.type === 'attend').map(h => (seasonOf(rb, h.fact.date) || {}).id).filter(Boolean)).size;

  const counts = {
    attend: count('attend'), compete_enter: count('compete_enter'), talk: count('talk_lightning'), workshop: count('workshop'),
    ship_project: count('ship_project'), mentoring: count('mentoring'), certification: count('certification'),
    wins: ok.filter(h => h.fact.type === 'compete_place' && Number(h.fact.place) === 1).length, seasonsActive, maxStreak: maxRun,
  };

  // ranks: the highest bandana whose requirements, and all earlier ones, are met
  const ranks = rb.ranks || [];
  const reqDone = (req) => {
    const items = [];
    for (const [k, v] of Object.entries(req)) {
      if (k === 'lifetime_points') items.push({ key: k, v, label: `${v} lifetime points`, done: lifetime >= v, have: lifetime, need: v });
      else if (k === 'first_check_in') items.push({ key: k, v, label: 'Check in at a session', done: counts.attend >= 1 });
      else if (k === 'compete_enter') items.push({ key: k, v, label: `Enter ${v} competition${v > 1 ? 's' : ''}`, done: counts.compete_enter >= v });
      else if (k === 'talk_or_workshop') items.push({ key: k, v, label: `Give ${v} talk or workshop`, done: counts.talk + counts.workshop >= v });
      else if (k === 'ship_project_or_workshop') items.push({ key: k, v, label: `Ship ${v} project or give ${v} workshop`, done: counts.ship_project + counts.workshop >= v });
      else if (k === 'workshop') items.push({ key: k, v, label: `Give ${v} workshop`, done: counts.workshop >= v });
      else if (k === 'mentoring') items.push({ key: k, v, label: `${v} mentoring sessions (${counts.mentoring}/${v})`, done: counts.mentoring >= v });
      else if (k === 'seasons_active') items.push({ key: k, v, label: `Active ${v} seasons (${seasonsActive}/${v})`, done: seasonsActive >= v });
      else items.push({ key: k, v, label: k, done: false });
    }
    return items;
  };
  let rankIndex = -1;
  for (let i = 0; i < ranks.length; i++) { if (reqDone(ranks[i].requires).every(x => x.done)) rankIndex = i; else break; }
  const rank = ranks[Math.max(0, rankIndex)];
  const next = ranks[rankIndex + 1] || null;
  let progress = 1, checklist = [], waiting = false;
  if (next) {
    const lo = rankIndex >= 0 ? ranks[rankIndex].requires.lifetime_points || 0 : 0, hi = next.requires.lifetime_points || lo + 1;
    progress = Math.max(0, Math.min(1, (lifetime - lo) / Math.max(1, hi - lo)));
    checklist = reqDone(next.requires);
    waiting = lifetime >= hi && !checklist.every(x => x.done);
  }

  const badges = [];
  if (counts.wins >= 1) badges.push('first_blood');
  if (counts.talk + counts.workshop >= 1) badges.push('mic_drop');
  if (maxRun >= 8) badges.push('on_fire');
  if (counts.mentoring >= 5) badges.push('sensei');
  if (counts.ship_project >= 1) badges.push('shipped_it');
  if (counts.certification >= 1) badges.push('certified');
  if (ok.some(h => h.fact.type === 'attend' && (seasonOf(rb, h.fact.date) || {}).id === 'fall-2026')) badges.push('founding');

  return { uid, lifetime, season: seasonPts, rankIndex, rank: rank ? rank.id : 'white', rankName: rank ? rank.name : '',
           next: next ? next.id : null, nextName: next ? next.name : null, progress, waiting, checklist, badges, counts, history, isMember: rankIndex >= 0 };
}

function compute(rb, facts, members, regularSessions, today) {
  const out = {};
  for (const m of members) out[m.uid] = computeMember(rb, m.uid, facts, regularSessions, today);
  const top = Math.max(0, ...Object.values(out).map(s => s.season));
  const champions = top > 0 ? Object.values(out).filter(s => s.season === top).map(s => s.uid) : [];
  const acc = rb.accessories || { free: [], earned: [] };
  for (const s of Object.values(out)) {
    const unlocked = (acc.free || []).map(normAcc);
    for (const e of acc.earned || []) {
      const id = normAcc(e.id);
      if (id === 'crown' && champions.includes(s.uid)) unlocked.push(id);
      else if (/badge:\s*(\w+)/.test(e.unlocked_by || '') && s.badges.includes(RegExp.$1)) unlocked.push(id);
    }
    s.unlocked = unlocked; s.champion = champions.includes(s.uid);
  }
  return { byUid: out, champions, maxWorn: acc.max_worn || 2 };
}

const api = { compute, computeMember, isoWeek, normAcc };
if (typeof module !== 'undefined') module.exports = api; else root.PointsEngine = api;
})(this);
