
import { ok, badRequest, store } from './utils.js';

export async function handler(event) {
  const date = (event.queryStringParameters?.date || '').trim();
  if (!date) return badRequest('date required');
  const s = store();
  const sch = await s.get(`schedule/${date}.json`, { type:'json' }).catch(() => null);
  if (!sch) return ok({ message:'No saved schedule for this date.', schedule: null });
  return ok({ schedule: sch });
}
