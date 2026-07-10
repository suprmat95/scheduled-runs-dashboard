# Cargoful Exercise — Automation Monitoring

SaaS-style page to monitor scheduled automations (Zapier style). Full-stack:
a Django/DRF backend and a React dashboard.

## Structure

```
.
├── backend/            # Django + DRF + SQLite — CRUD API for automations + run tracking
├── frontend/           # React + TS + Vite + MUI dashboard
└── docker-compose.yml  # runs both services with one command
```

## Run with Docker (recommended)

Requires Docker. From the repo root:

```bash
make up           # or: docker compose up --build
```

- Frontend → **http://localhost:5173**
- Backend API → **http://localhost:8000/api/**

The backend migrates and seeds the mockup data on first start. The SQLite file
lives on the host at `backend/db.sqlite3` (via a bind mount), so it persists
across restarts and is directly inspectable.

Other targets: `make down`, `make logs`, `make ps`, `make reseed` (reset the DB
to the mockup data).

## Run natively (without Docker)

Backend (Python 3.10+):

```bash
cd backend
make setup        # venv + install + migrate + seed
make run          # http://127.0.0.1:8000
```

Frontend (Node 18+):

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

The frontend proxies `/api` to the backend, so start the backend too. Override
the proxy target with `VITE_API_PROXY_TARGET` if needed.

## Frontend

React 19 + TypeScript + MUI, data fetched with React Query. It renders the
mockup: KPI cards (total / active / success rate), today's schedule, yesterday's
runs, and a table of all automations. The **active** and **success rate** KPI
cards toggle table filters, and the search box matches across every displayed
field client-side (e.g. "09:00" hits both the schedule and last-run columns).
The Create dialog builds a crontab from a Repetition + Start Date; rows can
record a run or be deleted.

## Backend API

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
`next_run_at` is computed automatically from the crontab on save (via `croniter`), and
`schedule_display` renders a human-readable version (via `cron-descriptor`).

Each `Automation` has many `AutomationRun` records (execution history). The latest
run's outcome is denormalized onto the automation (`last_run_at` / `last_run_status`,
kept in sync by signals) to drive the KPIs, "today's schedule", "yesterday's runs"
and the success rate without per-row queries.

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
