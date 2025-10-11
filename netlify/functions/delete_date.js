
import { ok, badRequest, store, assertAdmin } from './utils.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return badRequest('POST required');
  const adminCheck = assertAdmin(event);
  if (!adminCheck.ok) return {
    statusCode: adminCheck.statusCode, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ok:false, message: adminCheck.message })
  };
  const { date } = JSON.parse(event.body || '{}');
  if (!date) return badRequest('date required');

  const s = store();
  // Delete event
  await s.delete(`events/${date}.json`).catch(()=>{});
  // Delete schedule
  await s.delete(`schedule/${date}.json`).catch(()=>{});
  // Delete availability entries
  const prefix = `availability/${date}/`;
  const { blobs } = await s.list({ prefix, cursor: undefined });
  for (const b of blobs) await s.delete(b.key).catch(()=>{});

  return ok({ message: 'All data for date deleted.' });
}
