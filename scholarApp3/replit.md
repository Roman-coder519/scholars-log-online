# Scholar's Log

A student productivity web app with dashboard, tasks, habits, grades, deadlines, schedule, week view, analytics, and prayer times widget.

## Architecture

**Monorepo (pnpm workspaces)**:
- `artifacts/scholars-log` — React + Vite frontend (wouter routing, framer-motion, recharts, shadcn/ui)
- `artifacts/api-server` — Express 5 REST API server
- `lib/db` — Drizzle ORM + PostgreSQL schema and client
- `lib/api-spec` — OpenAPI 3.1 spec + orval codegen config
- `lib/api-zod` — Generated Zod schemas from OpenAPI spec
- `lib/api-client-react` — Generated React Query hooks from OpenAPI spec

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS v4, shadcn/ui, framer-motion, recharts, wouter, date-fns
- **Backend**: Express 5, TypeScript, Drizzle ORM, Zod
- **Database**: PostgreSQL (Replit-managed)
- **Code generation**: Orval (generates hooks + Zod schemas from OpenAPI spec)

## Color Theme

Forest green primary (`hsl(150 40% 35%)`), warm off-white background, muted purple accents. Fonts: Inter (sans) + Merriweather (serif).

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Daily progress, prayer times, timeline, stats |
| `/tasks` | Tasks | Full task CRUD with priority, status, grouping by date |
| `/habits` | Habits | Daily habit tracking with streaks |
| `/grades` | Grades | Grade book with subject summaries and letter grades |
| `/deadlines` | Deadlines | Due date tracking with overdue detection |
| `/week` | Week | 7-day bar chart overview |
| `/analytics` | Analytics | Line charts, pie chart, streak bar chart |
| `/schedule` | Schedule | Monthly calendar view with task dots |
| `/settings` | Settings | Name, city (prayer times), theme, calculation method |

## API Endpoints

- `GET/POST /api/tasks`, `GET/PUT/DELETE /api/tasks/:id`, `GET /api/tasks/today`
- `GET/POST /api/habits`, `PUT/DELETE /api/habits/:id`, `GET /api/habits/today`
- `POST /api/habits/:id/complete`, `POST /api/habits/:id/uncomplete`
- `GET/POST /api/grades`, `PUT/DELETE /api/grades/:id`, `GET /api/grades/summary`
- `GET/POST /api/deadlines`, `PUT/DELETE /api/deadlines/:id`
- `GET /api/dashboard/summary`, `GET /api/dashboard/prayer-times`, `GET /api/dashboard/week`
- `GET/PUT /api/settings`

## Prayer Times

Calculated server-side using solar angle math based on city name lookup (CITY_COORDS table in `dashboard.ts`). Supports 5 standard calculation methods (ISNA, MWL, Egyptian, Umm Al-Qura, Karachi).

## Running Locally

The API server and frontend are managed by Replit workflows:
- **API Server**: builds and serves at port 8080
- **Frontend**: Vite dev server

Run codegen after changing the OpenAPI spec:
```
pnpm --filter @workspace/api-spec run codegen
```

Push DB schema changes:
```
pnpm --filter @workspace/db run push
```
