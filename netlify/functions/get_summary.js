
import { ok, badRequest, store } from './utils.js';

export async function handler(event) {
  const date = (event.queryStringParameters?.date || '').trim();
  if (!date) return badRequest('date required');

  const s = store();
  const eventKey = `events/${date}.json`;
  const eventConf = await s.get(eventKey, { type: 'json' }).catch(() => null);

  const prefix = `availability/${date}/`;
  const { blobs } = await s.list({ prefix, cursor: undefined });
  const names = blobs.map(b => decodeURIComponent(b.key.split('/').pop().replace(/\.json$/, '')));

  return ok({ names, event: eventConf });
}
