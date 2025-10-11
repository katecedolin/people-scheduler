
import { ok, badRequest, store, dateKey } from './utils.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return badRequest('POST required');
  const { date, name, windows } = JSON.parse(event.body || '{}');
  if (!date || !name || !Array.isArray(windows) || !windows.length) return badRequest('date, name, windows required');

  const cleanName = name.trim().replace(/\s+/g, ' ');
  const s = store();
  const key = `availability/${dateKey(date)}/${encodeURIComponent(cleanName)}.json`;
  const payload = { date, name: cleanName, windows };

  await s.set(key, JSON.stringify(payload), { metadata: { type: 'availability', date } });
  return ok({ message: 'Availability saved', name: cleanName });
}
