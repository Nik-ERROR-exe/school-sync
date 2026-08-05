# CLAUDE.md

This file gives Claude Code (claude.ai/code) the context it needs to work effectively in this repository.

## Project Overview

**SchoolSync** is a School Management / ERP system for "Amarkor Vidyalaya," used to manage teachers, classes,
subjects, timetables, exam results, substitute-teacher assignments, and student promotion between academic
years. It is a two-tier web app:

- **`backend/`** — a Python **FastAPI** REST API (source of truth for business logic, auth, and data).
- **`frontend/`** — a **React + TypeScript** single-page app (Vite-built) that consumes the API.

There are two user roles baked into the domain model: **ADMIN** (school administration) and **TEACHER**.
Most `admin_*` API modules/pages are admin-only; `teacher_*` modules/pages are scoped to the logged-in teacher.

## Tech Stack

### Backend (`backend/`)
- **Framework**: FastAPI (`app/main.py` is the entrypoint/ASGI app)
- **ORM**: SQLAlchemy 2.0 (typed `Mapped[...]` / `mapped_column` style — see `app/models/`)
- **DB**: PostgreSQL (via `psycopg2`, sync driver — `DATABASE_URL` is normalized to `postgresql+psycopg2://`
  even if an async/plain URL is supplied, see `app/config.py`)
- **Migrations**: Alembic (`backend/alembic/`, config in `backend/alembic.ini`)
- **Auth**: JWT via `python-jose`, password hashing via `bcrypt` (`app/core/security.py`)
- **Validation/Settings**: Pydantic v2 + `pydantic-settings` (`app/config.py`), reading a local `.env` (never committed)
- **Background jobs**: Celery + Redis (optional, gated by `USE_CELERY` setting) — email notifications, etc.
  (`app/tasks/`)
- **Rate limiting**: `slowapi` (`app/core/ratelimit.py`), returns JSON 429s
- **Reports/exports**: `openpyxl` (Excel), `reportlab` (PDF)
- **Email**: `aiosmtplib` (`app/core/email.py`)
- **Testing**: `pytest` + `pytest-asyncio` (`backend/tests/`)
- **Container**: `python:3.10-slim` Docker image (`backend/Dockerfile`), served with `uvicorn --proxy-headers`
  (deployed behind a reverse proxy, e.g. Render)

### Frontend (`frontend/`)
- **Framework**: React 19 + TypeScript, built with Vite
- **Routing**: `@tanstack/react-router`
- **Server state**: `@tanstack/react-query`
- **Forms/validation**: `react-hook-form` + `zod` (+ `@hookform/resolvers`)
- **HTTP client**: `axios` (`src/api.ts`, `src/api/*.ts`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite` plugin)
- **i18n**: `i18next` / `react-i18next` — locales in `src/locales/en` and `src/locales/mr` (English + Marathi)
- **Icons**: `lucide-react`
- **Toasts**: `react-hot-toast`
- **Deployment**: Vercel (`frontend/vercel.json` rewrites all routes to `index.html` for client-side routing)

## Repository Layout

```
school-sync/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, routers, startup admin-seed + archival
│   │   ├── config.py                # Settings (env-driven), DATABASE_URL normalization, JWT_SECRET validation
│   │   ├── database.py              # SQLAlchemy engine/session/Base
│   │   ├── api/                     # Route handlers, split by domain + role prefix (admin_*, teacher_*, public_*)
│   │   ├── core/                    # security, email, ratelimit, exceptions, date_utils (cross-cutting)
│   │   ├── models/                  # SQLAlchemy ORM models (one file per entity)
│   │   ├── schemas/                 # Pydantic request/response schemas (mirrors models/)
│   │   ├── services/                # Business logic, called from api/ handlers (auth, results, timetable, etc.)
│   │   └── tasks/                   # Celery tasks (email notifications)
│   ├── alembic/                     # DB migrations (versions/ + env.py)
│   ├── tests/                       # pytest suite
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                     # axios calls per domain (classes, students, results, promotion, ...)
│   │   ├── components/              # Shared UI (Navbar, Sidebar, ...)
│   │   ├── context/                 # AuthContext (auth state/JWT)
│   │   ├── features/                # Feature-scoped modules (promotion, results, substitute, timetable)
│   │   ├── hooks/                   # Custom hooks (e.g. useKeepAlive)
│   │   ├── pages/                   # Route-level pages, split into pages/admin and pages/teacher
│   │   ├── locales/                 # i18next translation files (en, mr)
│   │   └── router.tsx                # Route tree + auth-based route protection
│   └── vercel.json
├── skills-lock.json
└── CLAUDE.md
```

### Naming convention to know
API modules and frontend pages are prefixed by **audience**, not by feature alone:
- `admin_*` → admin-only endpoints/pages (teachers, classes, subjects, timetable config, results approval,
  substitute assignment, promotion, reports).
- `teacher_*` → endpoints/pages scoped to the authenticated teacher (their classes, their students, their
  results entry, their timetable).
- `public_timetable.py` → unauthenticated/public endpoints.

When adding a new endpoint, follow this prefix convention and register the router in `app/main.py` under the
`/api/v1` prefix (`API_PREFIX`), matching the existing `app.include_router(...)` block.

## Development Commands

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate      # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Run the API (reads backend/.env — see Environment section)
uvicorn app.main:app --reload --port 8000

# Database migrations
alembic revision --autogenerate -m "describe change"
alembic upgrade head

# Tests
pytest
pytest tests/test_auth.py -v
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # Vite dev server
npm run build       # tsc -b && vite build
npm run lint         # eslint .
npm run preview      # preview production build
```

### Docker (backend)
```bash
cd backend
docker build -t school-sync-backend .
docker run -p 8000:8000 --env-file .env school-sync-backend
```

## Environment Configuration

Backend settings are defined in `app/config.py` and loaded from `backend/.env` (never commit this file). Key
variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (auto-normalized to the `psycopg2` sync driver) |
| `JWT_SECRET` | **Required**, ≥32 chars — app refuses to start without it |
| `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT config |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` / `SMTP_FROM_EMAIL` | Email notifications |
| `REDIS_URL`, `USE_CELERY` | Background task queue (optional) |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`, `INITIAL_ADMIN_TEACHER_ID`, `INITIAL_ADMIN_NAME` | Bootstrap admin account seeded on first startup (leave `INITIAL_ADMIN_PASSWORD` blank to auto-generate a strong random one, printed once to logs) |
| `FRONTEND_ORIGIN` | Comma-separated allowed CORS origins |
| `ACADEMIC_TERM_START` | Cutoff date (`YYYY-MM-DD`) used to auto-purge old substitute-assignment records on startup |

**Never hard-code secrets (JWT secret, DB credentials, SMTP credentials, admin passwords) into source files.**
They belong only in `.env` / the deployment platform's environment variable settings.

## Architecture Notes

- **Layering**: `api/` (HTTP/routing) → `services/` (business logic) → `models/` (persistence). Pydantic
  `schemas/` define the request/response contracts. Keep this separation — don't put business logic directly
  in route handlers or raw SQLAlchemy queries directly in `api/` files if a `services/` module already owns
  that domain.
- **Auth flow**: `app/core/security.py` handles password hashing (bcrypt) and JWT creation/decoding;
  `app/api/deps.py` provides FastAPI dependencies for extracting/validating the current user and role from
  the `Authorization` header.
- **Startup side effects** (`app/main.py`): on boot the app (1) seeds an initial ADMIN account if none exists,
  and (2) purges `substitute_assignments` rows older than `ACADEMIC_TERM_START`. Be careful when touching
  `seed_initial_admin()` or `purge_old_substitute_assignments()` — they run automatically on every process
  start, including in production.
- **CORS**: origins are currently hard-coded in `app/main.py` (`school-sync-fj5p.vercel.app` and
  `localhost:5173`) rather than reading `FRONTEND_ORIGIN` end-to-end — check this block if requests from a
  new frontend origin start failing CORS.
- **Timetable logic**: substitute/timetable generation logic lives under `app/services/timetable/` and
  `app/services/substitute_service.py`; there's a dedicated `tests/test_timetable_solver.py` — run it after
  touching scheduling logic.
- **i18n**: the frontend supports English and Marathi (`src/locales/en`, `src/locales/mr`). Any new
  user-facing string should be added to both locale files, not hard-coded in JSX.
- **Route protection**: `frontend/src/router.tsx` redirects based on `AuthContext`'s `isAuthenticated` state;
  new pages must be registered here and, if role-restricted, guarded consistently with existing
  `pages/admin/*` vs `pages/teacher/*` patterns.

## Conventions

- **Backend models**: SQLAlchemy 2.0 typed style (`Mapped[...]`, `mapped_column(...)`) — follow the pattern in
  `app/models/teacher.py` for new models/relationships, including `TYPE_CHECKING`-guarded imports for
  relationship type hints.
- **Backend schemas**: one `schemas/<entity>.py` file per `models/<entity>.py`, matching names.
- **Migrations**: always generate via `alembic revision --autogenerate`, then hand-review the generated file
  before committing — autogenerate can miss constraint/index changes.
- **Frontend API calls**: colocate axios calls per domain under `src/api/<domain>.ts` (see `classes.ts`,
  `students.ts`, `results.ts`) rather than inlining fetch calls in components; consume them via React Query
  hooks.
- **Tests**: add/extend `pytest` tests under `backend/tests/` for any change to auth, results authorization,
  substitute assignment, or timetable solving — these are the areas with existing dedicated test files
  (`test_auth.py`, `test_result_authorization.py`, `test_substitute.py`, `test_timetable_solver.py`).

## Git Configuration Rules

**Always commit as the repository owner, never as Claude/Anthropic.** Before running any `git commit`,
Claude Code must ensure the local git identity is set to:

- **Name**: `Nik-ERROR-exe`
- **Email**: `wnikhil146@gmail.com`

Concretely:

1. Before the **first** commit in a session, verify the identity is correct:
   ```bash
   git config user.name
   git config user.email
   ```
2. If either is missing or incorrect, set them (locally, scoped to this repo — do not use `--global` unless
   explicitly asked):
   ```bash
   git config user.name "Nik-ERROR-exe"
   git config user.email "wnikhil146@gmail.com"
   ```
3. Every commit Claude Code creates in this repository must use this identity. **Never** let a commit go out
   under `claude`, `Claude`, `noreply@anthropic.com`, or any other placeholder identity — check
   `user.name`/`user.email` again if there's any reason to suspect they changed (e.g. a fresh clone, a new
   shell/container, or after any tool that might touch global git config).
4. Do not amend, override, or rewrite this identity via commit flags (`--author=`) either, unless the user
   explicitly asks for a different author for a specific commit.

## Security Notes

- `JWT_SECRET`, `INITIAL_ADMIN_PASSWORD`, `SMTP_PASSWORD`, and `DATABASE_URL` credentials must never be
  committed or printed into source files — they are environment-only.
- The `.env` file is git-ignored (see `.gitignore`); don't remove it from `.gitignore` and don't create a
  committed `.env.example` containing real secret values — use placeholder values only.
- Password hashing is bcrypt via `app/core/security.py` — don't introduce a second hashing scheme.
- Rate limiting (`slowapi`) is applied via `app.state.limiter`; keep new sensitive endpoints (auth, password
  reset, etc.) rate-limited consistently with existing ones.