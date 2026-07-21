# Automation Monitoring

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

Frontend (Node 20+; `frontend/Makefile` activates it via nvm automatically):

```bash
cd frontend
make install
make dev          # http://localhost:5173
```

The frontend proxies `/api` to the backend, so start the backend too. Override
the proxy target with `VITE_API_PROXY_TARGET` if needed.

## Tests

```bash
cd backend  && make test    # Django — 29 tests
cd frontend && make test    # Vitest — 17 tests
```

**Backend** (`backend/automations/tests/`):

- `test_models.py` — crontab validation, `schedule_display` rendering, and
  `next_run_at` computation (set for active, cleared when inactive, recomputed
  on save).
- `test_signals.py` — the signal-driven denormalization: creating a run updates
  `last_run_*`, the latest run wins, and deleting reverts to the previous run
  (or clears it).
- `test_api.py` — CRUD, `?active=` / `?last_run_status=` filters, pagination,
  the KPIs and matching endpoints, and recording a run.
- `test_cache.py` — the read endpoints cache, and any Automation/AutomationRun
  write clears the cache (so a later read reflects the change).

**Frontend** (`frontend/src/lib/*.test.ts`):

- `cron.test.ts` — the Repetition ⇄ crontab mapping, including the round-trip
  that keeps an unedited "Edit" a no-op.
- `search.test.ts` — the client-side search across every displayed field
  (the "09:00 matches schedule and last-run" requirement).

The frontend suite needs Node 20+ (Vitest 4); `make test` selects it via
`.nvmrc`.

## Frontend

React 19 + TypeScript + MUI, data fetched with React Query. It renders the
mockup and adds a few extras:

- **KPI cards** (total / active / success rate) — all three are clickable:
  *Total* clears every filter, *Active Schedules* and *Success Rate* toggle
  their respective table filters.
- **Schedule** and **Runs** panels are date-navigable — a date picker browses
  automations scheduled on (`/matching/`) or runs that happened on (`/runs/`)
  any chosen day, defaulting to today / yesterday.
- **All Automations** table with client-side search across every displayed
  field (e.g. "09:00" hits both the schedule and last-run columns), sortable
  columns (name, schedule, status, last/next run), and pagination.
- **Create/Edit dialog** builds a crontab from a Repetition + Start Date (and
  reverses it when editing); rows can be edited, record a run, or be deleted
  (with a confirmation dialog). Mutations show toast feedback.

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

## Design decisions & trade-offs

- **Crontab as the single source of truth.** Schedules are stored as one crontab
  field; the human-readable label (`schedule_display`) is derived from it, and the
  Create/Edit form maps a friendly *Repetition + Start Date* onto a crontab (and
  back, so editing round-trips). This keeps the model expressive without exposing
  raw cron to the user.
- **Denormalize for reads, keep it honest with signals.** `next_run_at` is computed
  on save; `last_run_at` / `last_run_status` are materialized onto the row and kept
  in sync by `post_save`/`post_delete` signals on `AutomationRun`. Listing, filtering
  and the KPI aggregate then avoid per-row subqueries / N+1. The cost is write-time
  work and the discipline of centralizing sync in one place (signals).
- **Cache the expensive reads, invalidate simply.** `matching` (croniter per active
  automation) and `kpis` are cached; any write clears the cache via a signal. I chose
  `cache.clear()` over a version-key scheme because `matching` has one entry per date
  (no cheap key enumeration) and this cache is used only by these endpoints — so the
  bluntness costs nothing here, while staying trivial to reason about.
- **Filter, search, sort and paginate client-side.** The search must span every
  *displayed* field (e.g. "09:00" matches both the schedule and last-run columns),
  which needs all rows in the browser; doing filtering, sorting and paging there
  too is simplest and keeps search consistent with what's on screen. So the frontend loads the full
  list (walking the backend's pages, no silent cap) and paginates only the
  *display* with a `TablePagination` — filters/search apply first, then the result
  is paged. The trade-off: it holds every row in memory, which is fine into the
  low thousands. **To scale beyond that** you'd move pagination *and* search/filter
  server-side (the backend is already paginated, and the removed `search_text`
  denormalization is the hook for a server-side search) — at the cost of search no
  longer spanning arbitrary rendered text for free. The server-side `?active=` /
  `?last_run_status=` filters already exist for that path.
- **Docker keeps the DB shareable.** SQLite is bind-mounted to `backend/db.sqlite3`
  on the host, so it persists and stays inspectable (the exercise's "share the DB
  file"); `seed --if-empty` avoids wiping it on every startup.
