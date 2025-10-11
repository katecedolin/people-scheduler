
const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, children = []) => {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => {
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else e.setAttribute(k,v);
  });
  children.forEach(c => e.appendChild(c));
  return e;
};

function showTab(which) {
  ['participant','organizer','summary'].forEach(id => {
    $(id).classList.toggle('hidden', id !== which);
  });
}
window.showTab = showTab;

// Branding
$('applyTheme').addEventListener('click', () => {
  const color = $('colorPicker').value;
  document.documentElement.style.setProperty('--brand', color);
  document.documentElement.style.setProperty('--brand-600', color);
  document.documentElement.style.setProperty('--brand-700', color);
  const file = $('logoInput').files?.[0];
  if (file) {
    const url = URL.createObjectURL(file);
    const img = $('logoPreview');
    img.src = url;
    img.classList.remove('hidden');
  }
});

// Participant: availability windows
function addWindowRow(start='09:00', end='11:00') {
  const row = el('div', {class:'grid md:grid-cols-3 gap-2'} , [
    el('div', {}, [el('input', {type:'time', value:start, class:'w-full'})]),
    el('div', {}, [el('input', {type:'time', value:end, class:'w-full'})]),
    el('div', {}, [el('button', {class:'btn-secondary w-full'}, [document.createTextNode('Remove')])])
  ]);
  row.querySelector('button').addEventListener('click', () => row.remove());
  $('windows').appendChild(row);
}
$('addWindowBtn').addEventListener('click', () => addWindowRow());
// one default row
addWindowRow();

async function postJSON(path, data) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });
  return res.json();
}
async function getJSON(path) {
  const res = await fetch(path);
  return res.json();
}

// Submit availability
$('submitAvailabilityBtn').addEventListener('click', async () => {
  const name = $('name').value.trim();
  const date = $('date').value;
  const eventStart = $('eventStart').value;
  const eventEnd = $('eventEnd').value;
  const maxMinutes = parseInt($('maxMinutes').value || '120', 10);

  const windows = Array.from($('windows').children).map(row => {
    const [s, e] = row.querySelectorAll('input');
    return { start: s.value, end: e.value };
  }).filter(w => w.start && w.end);

  if (!name || !date || !eventStart || !eventEnd || windows.length === 0) {
    $('participantStatus').textContent = 'Please fill name, date, event times, and at least one window.';
    return;
  }

  // set event (idempotent) then add availability
  const setRes = await postJSON('/.netlify/functions/set_event', {
    date, eventStart, eventEnd, maxMinutes
  });
  if (!setRes.ok) {
    $('participantStatus').textContent = 'Problem saving event: ' + setRes.message;
    return;
  }

  const res = await postJSON('/.netlify/functions/add_availability', {
    date, name, windows
  });
  $('participantStatus').textContent = res.message || (res.ok ? 'Saved!' : 'Error saving.');
});

// See who has submitted (participant side)
$('previewParticipantsBtn').addEventListener('click', async () => {
  const date = $('date').value;
  if (!date) { $('participantStatus').textContent = 'Enter a date first.'; return; }
  const res = await getJSON('/.netlify/functions/get_summary?date=' + encodeURIComponent(date));
  if (!res.ok) { $('participantStatus').textContent = res.message; return; }
  const names = res.names || [];
  $('participantStatus').innerHTML = `Participants so far (${names.length}): <strong>${names.join(', ') || 'None'}</strong>`;
});

// Organizer
$('generateBtn').addEventListener('click', async () => {
  const date = $('orgDate').value;
  const admin = $('adminCode').value;
  if (!date) { $('organizerStatus').textContent = 'Enter a date.'; return; }
  const res = await postJSON('/.netlify/functions/generate_schedule', { date, admin });
  if (!res.ok) { $('organizerStatus').textContent = res.message; return; }

  renderSchedule(res.schedule);
  // warnings
  const warnings = res.single_coverage || [];
  $('singleCoverageWarnings').innerHTML = warnings.length
    ? `Needs confirmation: ${warnings.length} intervals have only one person available.`
    : 'All intervals have 2 people.';

  $('organizerStatus').textContent = 'Generated. Review and click "Save schedule" to confirm.';
});

$('saveScheduleBtn').addEventListener('click', async () => {
  const date = $('orgDate').value;
  const admin = $('adminCode').value;
  if (!date) { $('organizerStatus').textContent = 'Enter a date.'; return; }
  const schedule = window.__currentSchedule;
  if (!schedule) { $('organizerStatus').textContent = 'Generate a schedule first.'; return; }
  const res = await postJSON('/.netlify/functions/save_schedule', { date, admin, schedule });
  $('organizerStatus').textContent = res.message || (res.ok ? 'Saved.' : 'Error.');
});

$('loadScheduleBtn').addEventListener('click', async () => {
  const date = $('orgDate').value;
  if (!date) { $('organizerStatus').textContent = 'Enter a date.'; return; }
  const res = await getJSON('/.netlify/functions/get_schedule?date=' + encodeURIComponent(date));
  if (!res.ok) { $('organizerStatus').textContent = res.message; return; }
  renderSchedule(res.schedule);
  $('organizerStatus').textContent = 'Loaded saved schedule.';
});

$('deleteDateBtn').addEventListener('click', async () => {
  const date = $('orgDate').value;
  const admin = $('adminCode').value;
  if (!date) { $('organizerStatus').textContent = 'Enter a date.'; return; }
  if (!confirm(`Type the date to confirm deletion of all data for ${date}. This cannot be undone.`)) return;
  const res = await postJSON('/.netlify/functions/delete_date', { date, admin });
  $('organizerStatus').textContent = res.message || (res.ok ? 'Deleted.' : 'Error.');
  $('scheduleArea').innerHTML = '';
  $('singleCoverageWarnings').innerHTML = '';
});

// Summary tab
$('refreshSummaryBtn').addEventListener('click', async () => {
  const date = $('sumDate').value;
  if (!date) { $('summaryArea').textContent = 'Enter a date.'; return; }
  const res = await getJSON('/.netlify/functions/get_summary?date=' + encodeURIComponent(date));
  if (!res.ok) { $('summaryArea').textContent = res.message; return; }
  const names = res.names || [];
  const conf = res.event;
  $('summaryArea').innerHTML = `
    <div>Participants (${names.length}): <strong>${names.join(', ') || 'None'}</strong></div>
    <div class="text-sm mt-2">Event window: ${conf?.eventStart || '—'} to ${conf?.eventEnd || '—'} · Max per person: ${conf?.maxMinutes || '—'} minutes</div>
  `;
});

// Render schedule
function renderSchedule(schedule) {
  window.__currentSchedule = schedule;
  const area = $('scheduleArea');
  if (!schedule || !schedule.assignments) { area.textContent = 'No schedule.'; return; }

  const list = document.createElement('div');
  list.className = 'space-y-2';
  schedule.assignments.forEach(a => {
    const item = document.createElement('div');
    item.className = 'p-3 bg-gray-100 rounded-xl';
    item.textContent = `${a.start}–${a.end}: ${a.people.join(' & ')}`;
    list.appendChild(item);
  });
  area.innerHTML = '';
  area.appendChild(list);
}
