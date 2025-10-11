
import { getStore } from '@netlify/blobs';

export function assertAdmin(event) {
  const { admin } = JSON.parse(event.body || '{}');
  const expected = process.env.ADMIN_PASSCODE || '';
  if (!expected || admin !== expected) {
    return { ok: false, statusCode: 401, message: 'Unauthorized: admin code is invalid or missing.' };
  }
  return { ok: true };
}

export function badRequest(message) {
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok:false, message })
  };
}

export function ok(data) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok:true, ...data })
  };
}

export function store() {
  return getStore('table-scheduler'); // logical namespace
}

export function dateKey(date) {
  return (date || '').trim();
}

export function timeToMinutes(t) {
  const [h,m] = t.split(':').map(Number);
  return h*60 + m;
}
export function minutesToTime(m) {
  const h = Math.floor(m/60).toString().padStart(2,'0');
  const mm = (m%60).toString().padStart(2,'0');
  return `${h}:${mm}`;
}
