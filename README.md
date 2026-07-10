# Cargoful Exercise — Automation Monitoring

SaaS-style page to monitor scheduled automations (Zapier style).

## Structure

```
.
├── backend/    # Django + DRF + SQLite — CRUD API for automations + run tracking
└── frontend/   # React dashboard (KPIs, today/yesterday lists, table with filters)
```

## Backend — quick start

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed          # populate with mockup data
python manage.py runserver
```

API base: `http://127.0.0.1:8000/api/`

| Method | Endpoint                       | Description                       |
|--------|--------------------------------|-----------------------------------|
| GET    | `/api/automations/`            | List automations — paginated; `?active=`, `?last_run_status=`, `?ordering=`, `?page=`, `?page_size=` |
| POST   | `/api/automations/`            | Create automation                 |
| GET    | `/api/automations/{id}/`       | Retrieve                          |
| PUT/PATCH | `/api/automations/{id}/`    | Update (bonus)                    |
| DELETE | `/api/automations/{id}/`       | Delete (bonus)                    |
| POST   | `/api/automations/{id}/run/`   | Record an execution               |
| GET    | `/api/automations/matching/`   | Automations scheduled on a given day (`?date=`) |
| GET    | `/api/automations/kpis/`       | Summary KPIs (total/active/rate)  |
| GET    | `/api/runs/`                   | List runs (filter `?date=YYYY-MM-DD`) |

### Data model

An `Automation` is scheduled with a **crontab expression** (Celery Beat style:
`minute hour day-of-month month day-of-week`, e.g. `0 9 * * 1` = every Monday at 09:00).
`next_run` is computed automatically from the crontab on save (via `croniter`), and
`schedule_display` renders a human-readable version (via `cron-descriptor`).

Each `Automation` has many `AutomationRun` records (execution history), which drive the
KPIs, "today's schedule", "yesterday's runs" and the success rate.

### Matching endpoint

`/api/automations/matching/` returns the active automations scheduled to run on a given
**day** (`?date=YYYY-MM-DD`, default today), each annotated with the `matched_at` firing
time. Firing times are computed from each automation's crontab via `croniter_range`.

```bash
# automations running today
curl "http://127.0.0.1:8000/api/automations/matching/"

# automations running on July 7th
curl "http://127.0.0.1:8000/api/automations/matching/?date=2026-07-07"
```
