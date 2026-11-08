# Paisa — Personal Expense Tracker

A local-first personal expense tracker with a Next.js frontend, FastAPI backend, and PostgreSQL database. Run the complete application on your own computer with Docker Compose. No bank credentials, account registration, cloud service, or runtime internet connection is required.

## Features

- Ten pages: Dashboard, Add Expense, Calendar, Analytics, Savings, Savings Transactions, Subscriptions, Stipends, Expense History, Settings.
- Stipend-funded monthly budgets: a confirmed receipt funds the month after its earning month using the actual amount received.
- Atomic expense batches, duplicate warnings, edits, linked refunds, and confirmation before deleting expenses and refunds.
- A separate savings ledger with credits, debits, historical balances, and recalculation after backdated changes.
- Subscription renewals every 30 days from an explicit next payment date, selectable actual paid date, catch-up processing, pause/resume, and occurrence tombstones preventing deleted charges from reappearing.
- Search, combined filters and pagination; Indian rupee formatting; interactive Recharts analytics.
- Monday–Sunday spending on the dashboard and in analytics, including full weeks that cross month boundaries.
- Weekly automatic JSON backups, manual downloads, and a safety backup before restore.
- Light/dark themes, responsive floating navigation, mobile drawer, keyboard-accessible date picker, and reduced-motion support.

Regular spending and savings-funded transactions remain separate throughout the application. Money uses Python Decimal and PostgreSQL NUMERIC, with exact decimal strings in backups.

## Requirements

- Docker Desktop or Docker Engine with Docker Compose.
- Internet access for the initial image/dependency downloads. Once images are built, normal operation is local/offline.

## Quick start

```sh
git clone https://github.com/bhabs456/Expense-Tracker.git
cd Expense-Tracker
docker compose up -d --build
```

Open:

| Service | Local address |
| --- | --- |
| Application | http://localhost:3030 |
| API documentation | http://localhost:8080/docs |
| API health | http://localhost:8080/api/v1/health |
| PostgreSQL host port | localhost:55432 |

All published ports bind to loopback. The frontend proxies `/api/v1/*` requests to FastAPI through Docker's private network. The Compose database username/password are local development defaults, not financial credentials. Keep this deployment on your own computer; multi-user authentication and public hosting are outside its scope.

Later starts:

```sh
docker compose up -d
docker compose ps
docker compose logs --tail=50 backend frontend
```

Stop while preserving records:

```sh
docker compose stop
```

`docker compose down` also preserves the database volume. **Do not run `docker compose down -v` unless you intentionally want to erase the database.** Download a backup from Settings before maintenance.

If a host port is occupied, change its left-hand value in `compose.yaml`; keep internal service addresses unchanged.

## First use

Tracking starts on **1 November 2026**, with zero opening savings. Transactions cannot precede tracking start or be future-dated. Calendar validation and billing use Asia/Kolkata time.

1. Add a stipend with its earning month, expected amount and actual receipt details. Confirm only when received. An October 2026 earning month funds November 2026, even when received late; pending receipts contribute nothing.
2. Add regular expenses in a batch. Select savings funding for savings-funded purchases, or create a debit in Savings Transactions. Add bonuses/gifts as credits in that ledger.
3. Set up subscriptions with the next payment date. Choose Not paid yet to begin charging on that date, then every 30 days. Choose Already paid to select the actual paid date and record/link that payment; its next date defaults to payment date + 30 days and can be adjusted.
4. Adjust savings goals, default payment method and theme in Settings.
5. Download backups regularly and keep them somewhere safe on your device.

Completed-month savings become available on the first day of the next month. Current-month projected savings are shown separately. Later refunds recalculate the original expense month. Backdated changes recalculate balances from source records. Negative historical savings balances require explicit confirmation.

The subscription processor catches up at startup and every 60 seconds; the frontend also requests processing when opened. Paused periods stay skipped, and deleting a generated expense retains an occurrence tombstone. Deleting a subscription preserves historical expenses.

Adding a subscription does not itself create an expense. Example: add an unpaid YouTube Premium subscription on 1 November with the next payment due on 22 November. Expenses are recorded on 22 November, 22 December and 21 January, every 30 days. Already paid records the initial expense on your selected actual payment date, defaulting to today. Due charges catch up when the app runs; this only tracks expenses and does not pay providers.

Migration `0002` adds `first_billing_date` while retaining existing subscriptions' previous start-date + 30-day schedules. Migration `0004` adds an editable **One billing cycle** option. Turning it off resumes future 30-day renewals and keeps previously skipped dates skipped. New backups use version 4 to preserve the option. Versions 1–3 remain restorable.

## Backup and restore

Settings → Backup now downloads all records as JSON. Restore requires a supported backup, typed confirmation, and a safety backup of current data before replacement.

The backend saves an automatic backup every Sunday at 5:00 PM India time. If the app was off, it makes one catch-up backup for the latest missed Sunday when it starts. The date in `auto-YYYY-MM-DD.json` identifies the scheduled Sunday. The backup itself records its actual creation time. Settings → Local backup files lists automatic, manual, and safety backups for download.

Backups are stored in the project's `backups/` folder, which is excluded from Git. Database records live in Docker's persistent PostgreSQL volume.

Never commit backups, database files, private environment files, or personal financial data. This repository includes application code and tests only; no personal or QA records are seeded.

## Architecture

```text
Browser → Next.js :3000 → /api/v1 proxy → FastAPI :8000 → PostgreSQL
                                            └────────→ local backups/
```

- `frontend/src/app`: App Router pages, shared layout, API proxy.
- `frontend/src/modules`: feature components and API services.
- `frontend/src/components`: shared inputs, charts, dialogs and navigation.
- `frontend/src/styles`: lightweight interaction, calendar and glass navigation styles.
- `backend/app`: API routes, schemas, models, financial calculations and backups.
- `backend/migrations`: Alembic schema migrations.
- `backend/tests`, `frontend/tests`: focused regression tests.
- `compose.yaml`: frontend, backend and PostgreSQL services.

No external fonts, large decorative assets or heavy animation libraries are required.

## Local development

Start PostgreSQL first:

```sh
docker compose up -d db
```

Backend (Python 3.14 is used by the container):

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend (Node.js 24 is used by the container), in another terminal:

```sh
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

`DATABASE_URL` defaults to the local Compose database at port 55432. `BACKUP_DIR` controls local backup storage. `API_URL` is server-only, defaults to http://127.0.0.1:8000, and is set to http://backend:8000 in Compose. If macOS file watching fails, use `npm run dev -- --webpack` or build and run with `npm start`.

## Tests

With Docker services running:

```sh
# Disposable SQLite database per test
docker compose exec -T backend python -m pytest -q

# Optional PostgreSQL regression tests: create the disposable database once
docker compose exec -T db createdb -U tracker tracker_test
docker compose exec -T -e TEST_DATABASE_URL=postgresql+psycopg://tracker:tracker@db:5432/tracker_test backend python -m pytest -q
```

The test suite refuses PostgreSQL databases whose names do not end in `_test`. Tests recreate tables in that database; never use the live database as a test target.

```sh
cd frontend
npm ci
npm test
npm run typecheck
npm run format:check
npm run build
```

Latest local checks: 47 backend tests and four frontend tests passed, along with type checking, formatting and production build. Browser checks covered all ten pages at eight widths in both themes. Native confirmation branches, assistive-technology coverage and cross-browser checks still need further verification; this is not a claim of exhaustive accessibility certification.

## Schema changes

The backend container runs `alembic upgrade head` before starting the API. Add a new migration for future schema changes rather than editing an already applied migration. Backup format versioning is independent of database migration versioning.

## Scope

This application is designed for one person on one local computer. Cloud sync, bank integration, authentication, multiple users, CSV/Excel export and advanced forecasting are outside the current scope.

## Latest UI and savings behavior

- V1.1 defines 11 fixed categories and 42 subcategories. New expense and subscription entries require an approved pair.
- Savings goals are targets, not upfront deductions. The entire monthly budget left after regular spending becomes available savings after month-end, counted once. It does not increase the next month's spending budget. The Savings page shows completed monthly savings, direct credits and savings-funded purchases separately.
- Calendar supports browsing future months from the tracking start; future-dated expense entry stays blocked. Dashboard/Analytics reporting selectors remain bounded to the current month.
- Dropdown arrows and collapsed navigation controls have consistent spacing. Visible scrollbars are hidden while page, table and dialog scrolling remain available. Native smooth scrolling respects reduced-motion preferences.
- Shared editor keyboard focus stays inside the modal, including when initially pressing Shift+Tab.
- Side-income allocation into the regular spending budget is not yet implemented; direct savings ledger credits are unchanged.

Migration `0003` applies deterministic V1.1 mappings and writes the original and proposed classifications to `taxonomy_v11_audit`. Ambiguous legacy pairs stay available for manual review. Take a PostgreSQL backup before upgrading. Docker host ports default to 3030 for the app and 8080 for the API. Override them with `FRONTEND_PORT` and `BACKEND_PORT` in the project’s local `.env` file.
