
# Table Scheduler (Netlify)

A simple Netlify-hosted app that collects availability and generates fair schedules under these rules:

- PST time zone
- 5-minute slots
- 2 people at the table at all times if possible
- If only 1 person is available for a slot, the organizer must confirm by saving the schedule
- Max time at table per person (default 120 minutes)
- Exactly one shift per person per date (a single contiguous block)
- Even-ish distribution (greedy by least-assigned minutes)

## What’s included

- **Frontend**: Plain HTML + Tailwind + vanilla JS (no build step)
- **Serverless functions**: Netlify Functions using `@netlify/blobs` for storage
- **Storage**: Netlify Blobs (free tier), logical namespace: `table-scheduler`

## Deploy (one-time)

1. Create a new Netlify site (or use `netlify deploy`).
2. Set an environment variable:
   - `ADMIN_PASSCODE` – your organizer/admin code (used for generating/saving/deleting per-date data).
3. Ensure Functions settings are default. No build step needed.
4. Deploy. (e.g., drag & drop this folder in the Netlify UI or use the CLI.)

## How to use

- Share the site URL with participants.
- **Participants** (no login):
  - Enter name, date (YYYY-MM-DD), event window (start/end), and one or more availability windows.
  - Submits are stored under that date.
- **Organizer**:
  - Open the Organizer tab.
  - Enter the date and admin passcode.
  - Click **Generate schedule**. Review warnings about any single-person coverage.
  - Click **Save schedule (confirm)** to finalize/save.
  - Click **Load saved** later to view the last confirmed schedule.
  - **Delete this date’s data** wipes event + availability + schedule for that single date.

## Endpoints (Functions)

- `POST /.netlify/functions/set_event` – `{ date, eventStart, eventEnd, maxMinutes }`
- `POST /.netlify/functions/add_availability` – `{ date, name, windows:[{start,end}] }`
- `GET  /.netlify/functions/get_summary?date=YYYY-MM-DD` – returns `{ names, event }`
- `POST /.netlify/functions/generate_schedule` – `{ date, admin }` -> `{ schedule, single_coverage }`
- `POST /.netlify/functions/save_schedule` – `{ date, admin, schedule }`
- `GET  /.netlify/functions/get_schedule?date=YYYY-MM-DD`
- `POST /.netlify/functions/delete_date` – `{ date, admin }`

## Notes & Tips

- **PST** is a display convention in the UI. The app does not convert time zones; instruct participants to enter local times in PST.
- Availability windows are intersected with the event’s start/end for that date.
- If a person submits multiple times for the same date **with the same name**, the latest submission overwrites the previous one (same key).
- The algorithm is greedy for simplicity. If your scenarios get complex, consider exporting availabilities and using a solver.

## Development

- Install deps: `npm install`
- Local dev with Netlify CLI: `netlify dev`
- No build step; public assets served from `public/`

---doesn't work rn, redo the algorithm


