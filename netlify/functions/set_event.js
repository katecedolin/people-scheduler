
import { ok, badRequest, store, dateKey } from './utils.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return badRequest('POST required');
  const { date, eventStart, eventEnd, maxMinutes } = JSON.parse(event.body || '{}');
  if (!date || !eventStart || !eventEnd) return badRequest('date, eventStart, eventEnd required');

  const s = store();
  const key = `events/${dateKey(date)}.json`;
  const conf = { date, eventStart, eventEnd, maxMinutes: Math.max(5, Number(maxMinutes || 120)) };

  await s.set(key, JSON.stringify(conf), { metadata: { type: 'event' }});
  return ok({ message:'Event saved', event: conf });
}
