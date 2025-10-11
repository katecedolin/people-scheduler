
import { ok, badRequest, store, assertAdmin, timeToMinutes, minutesToTime } from './utils.js';

// Greedy fair scheduler with 5-minute slots, 1 shift per person, maxMinutes cap, try to assign 2 per slot.
export async function handler(event) {
  if (event.httpMethod !== 'POST') return badRequest('POST required');
  const adminCheck = assertAdmin(event);
  if (!adminCheck.ok) return {
    statusCode: adminCheck.statusCode, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ok:false, message: adminCheck.message })
  };

  const { date } = JSON.parse(event.body || '{}');
  if (!date) return badRequest('date required');

  const s = store();
  const eventConf = await s.get(`events/${date}.json`, { type:'json' });
  if (!eventConf) return badRequest('No event found for date.');

  const prefix = `availability/${date}/`;
  const { blobs } = await s.list({ prefix, cursor: undefined });
  const people = [];
  for (const b of blobs) {
    const data = await s.get(b.key, { type:'json' });
    if (data) people.push(data);
  }

  const startMin = timeToMinutes(eventConf.eventStart);
  const endMin   = timeToMinutes(eventConf.eventEnd);
  const slot = 5;
  const slots = [];
  for (let t = startMin; t < endMin; t += slot) {
    slots.push({ t, need: 2, assigned: [] });
  }

  // Build availability map per person in minutes
  const P = people.map(p => ({
    name: p.name,
    max: eventConf.maxMinutes || 120,
    assigned: 0,
    hasShift: false,
    currentShiftStart: null,
    windows: (p.windows||[]).map(w => [Math.max(startMin, timeToMinutes(w.start)), Math.min(endMin, timeToMinutes(w.end))]).filter(([a,b]) => b>a)
  }));

  function available(p, t) {
    return p.windows.some(([a,b]) => t >= a && t < b);
  }

  // Simple fairness: always pick people with lowest assigned minutes who are available and either continuing a shift or haven't had one yet.
  for (const sSlot of slots) {
    const t = sSlot.t;
    const candidates = P.filter(p => available(p, t) && p.assigned < p.max && (!p.hasShift || p.currentShiftStart !== null));
    // prefer continuing shifts
    const cont = candidates.filter(p => p.currentShiftStart !== null);
    const fresh = candidates.filter(p => p.currentShiftStart === null);

    function pickOne(pool) {
      if (!pool.length) return null;
      pool.sort((a,b) => a.assigned - b.assigned || a.name.localeCompare(b.name));
      const p = pool[0];
      return p;
    }

    while (sSlot.assigned.length < 2) {
      let p = pickOne(cont) || pickOne(fresh);
      if (!p) break;
      // Start shift if new
      if (p.currentShiftStart === null) {
        if (p.hasShift) { // already had a shift earlier, skip to enforce "1 shift per person"
          // remove from pool
          const i = fresh.indexOf(p);
          if (i>=0) fresh.splice(i,1);
          // try next
          if (fresh.length===0 && cont.length===0) break;
          continue;
        }
        p.currentShiftStart = t;
        p.hasShift = true;
      }

      sSlot.assigned.push(p.name);
      p.assigned += slot;

      // If person reached max, end their shift now
      if (p.assigned >= p.max) p.currentShiftStart = null;

      // remove chosen from consideration for this slot
      const idxC = cont.indexOf(p);
      if (idxC>=0) cont.splice(idxC,1);
      const idxF = fresh.indexOf(p);
      if (idxF>=0) fresh.splice(idxF,1);
    }

    // Anyone whose availability ended at this minute should end shift
    for (const p of P) {
      if (p.currentShiftStart !== null) {
        const stillAvail = available(p, t+slot);
        if (!stillAvail) p.currentShiftStart = null;
      }
    }
  }

  // Collect single coverage warnings
  const single = slots.filter(s => s.assigned.length === 1).map(s => ({
    start: minutesToTime(s.t),
    end: minutesToTime(s.t + slot),
    person: s.assigned[0]
  }));

  // Coalesce assignments into readable ranges
  function coalesceAssignments(slots) {
    const ranges = [];
    let cur = null;
    for (const s of slots) {
      const key = s.assigned.sort().join('|');
      if (!key) continue;
      if (!cur) {
        cur = { start: s.t, end: s.t + slot, people: [...s.assigned].sort() };
      } else if (key === cur.people.join('|')) {
        cur.end += slot;
      } else {
        ranges.push(cur);
        cur = { start: s.t, end: s.t + slot, people: [...s.assigned].sort() };
      }
    }
    if (cur) ranges.push(cur);
    return ranges.map(r => ({
      start: minutesToTime(r.start),
      end: minutesToTime(r.end),
      people: r.people
    }));
  }

  const assignments = coalesceAssignments(slots.filter(s => s.assigned.length > 0));
  const schedule = { date, start: eventConf.eventStart, end: eventConf.eventEnd, assignments };

  return ok({ schedule, single_coverage: single });
}
