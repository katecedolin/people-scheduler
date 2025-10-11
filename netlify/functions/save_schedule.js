
import { ok, badRequest, store, assertAdmin } from './utils.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return badRequest('POST required');
  const adminCheck = assertAdmin(event);
  if (!adminCheck.ok) return {
    statusCode: adminCheck.statusCode, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ok:false, message: adminCheck.message })
  };
  const { date, schedule } = JSON.parse(event.body || '{}');
  if (!date || !schedule) return badRequest('date and schedule required');

  const s = store();
  const key = `schedule/${date}.json`;
  await s.set(key, JSON.stringify(schedule), { metadata: { type: 'schedule' } });
  return ok({ message: 'Schedule saved.' });
}
