# Kaizen

Spoken Japanese for office teams: short daily lessons, a quiz, scripted office conversations and a team ranking.
Built from `../Kaizen_PRD.md` (v1.0 draft). Milestones **M1 to M4 are done**; M5 (hardening and polish) is next.

**New here? Read [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md).** It explains every file in plain language: what it does, why it exists, and what else could have been used.

## Status by milestone

| Milestone | What it covers | State |
|---|---|---|
| M1 Foundation | Create account and sign in, onboarding, roles, database schema, seed content | Done |
| M2 Learning | Today, Learn (levels, sets, gating), lesson card with audio, Say it (record and compare), points ledger, Settings | Done |
| M3 Quiz and streaks | Daily quiz (5 sets a day), review dates, unlock quiz, level quizzes, streak and weekly rest day, daily rollover job, Progress page | Done |
| M4 Role-play, ranking, admin | 24 role-plays, ranking, admin (users, content manager, dashboard, CSV export, audit log), reviewer queue | Done |
| M5 Hardening | Installable app (PWA) with offline audio, real text-to-speech audio, accessibility and mobile pass, backups, per-event analytics | Not started |

### Feature checklist

**Learner**
- Create an account with email and password and go straight in. Sign in again later.
- Onboarding: display name, show romaji or kana only, a three-point tour.
- **Today:** greeting, streak, points, level, daily goal ring (learning 70%, quiz 30%), Continue button, daily quiz card.
- **Learn:** five levels of five sets of five items (125). A level opens when the one before is finished, or by passing an unlock quiz. A set opens when the one before is finished. The server enforces both.
- **Lesson card:** listen at normal or slow speed, kana, romaji, "built from" parts, usage note, Next and Finish set.
- **Say it:** record up to 5 seconds, then hear the model and your own voice back to back. No score, and the recording never leaves the device.
- **Daily quiz:** 5 questions, alternating listen-and-pick-the-meaning with see-the-English-and-pick-the-Japanese. Five prepared sets a day (set 1 is the daily quiz, the others are "Practice set 2" to "5"). Each set has 3 new and 2 review questions. Points (10 per right answer) count only for the first completed daily quiz of the day.
- **Review dates:** every answer moves the item along 1, 3, 7, 14 and 30 days; a wrong answer sends it back to 1 day. Review questions carry a "Review" tag, and unseen items from higher levels carry "New from Level N".
- **Unlock quiz:** 5 questions from the levels below the target, 4 correct opens the target and every level below it (10 points per right answer plus 25). Retry as often as you like.
- **Level quiz:** 5 questions from one open level, unlimited, no points. Misses come back in the daily quiz.
- **Streak:** a day counts when you have learned 5 items and finished the daily quiz. One missed day per calendar week (Monday start) is covered by a rest day. Two missed days in a row break the streak.
- **Progress:** current and longest streak, points, a bar per level, a month calendar (goal met, rest day, missed, today).
- **Role-play:** 24 office conversations in four tiers of six (Starter, Easy, Medium, Challenge). Listen to all, Practise my part (pauses for your lines), Mark complete (+30 points, once). Each one opens when the one before is done.
- **Ranking:** every active learner by points, the top 20 plus your own row, ties go to whoever got there first. Shows display name, level and points only.

**Reviewer** (Review link)
- Items and role-play lines with filters (To review, Marked wrong, Approved, All) and by level.
- Play the audio, then mark Approved, or Wrong with a reason. Wrong items go back to the admin. Review never blocks publishing.

**Admin** (Admin link: Dashboard, Users, Content, Audit log)
- **Dashboard:** participation counts per learner (active days, streaks, points, level, quiz average), overall counts, and two CSV downloads (per learner per day, per learner). No recordings and no individual mistakes.
- **Users:** search, change role, deactivate (access blocked, data kept), reactivate, delete (all data removed).
- **Content:** edit levels, sets, items and role-plays. Publish or unpublish levels and role-plays. Edits go live at once. Changed text goes back to Draft for the reviewer and raises the version; changed kana flags the audio for regeneration. Reviewer reasons show on anything marked Wrong.
- **Audit log:** role changes, deactivations, deletions, publishing, edits and exports, with who and when.

**Not built yet:** installable app (PWA) and offline audio, real text-to-speech audio (the browser's Japanese voice is used meanwhile), the per-event analytics list from PRD section 15, a history of old versions of edited text, adding or removing role-play lines.

## Run it locally

You need Node 20+ and MySQL 8 or MariaDB. For development this project uses the MariaDB that ships with XAMPP.

```bash
# 1. Start MySQL (XAMPP Control Panel > MySQL > Start), then create the database once
mysql -u root -e "CREATE DATABASE IF NOT EXISTS kaizen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

# 2. Install, configure, build the schema, load the 125 items and 24 role-plays
npm install
cp .env.example .env          # then edit DATABASE_URL (XAMPP: mysql://root:@localhost:3306/kaizen) and AUTH_SECRET
npx prisma migrate deploy
npx prisma db seed

# 3. Go
npm run dev                   # http://localhost:3000
```

Environment variables (`.env`): `DATABASE_URL`, `AUTH_SECRET` (generate with `openssl rand -base64 32`), `AUTH_TRUST_HOST=true`, `CRON_SECRET` (protects the daily rollover). Nothing is committed: `.env` is git-ignored.

### Your first admin

Nobody is an admin until you say so. Create your account in the app, then:

```bash
npm run make-admin -- you@company.com                # admin
npm run make-admin -- someone@company.com reviewer   # reviewer
```

After that, admins change roles from Admin > Users. Roles are checked on the server on every request, so a change applies without signing in again. An admin cannot change, deactivate or delete their own account, and the last active admin is protected.

### Scripts

| Script | Does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` / `test` | tsc, ESLint, Vitest (60 unit tests) |
| `npm run db:migrate` | Create a new migration after changing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Add any missing items and role-plays. Never overwrites edits |
| `npm run make-admin -- <email> [role]` | Give an existing account a role |

### Testing

- **Unit tests** (`npm test`): the pure rules, namely review dates, set dealing, answer options, streaks and rest days, goal maths, IST day boundaries, ranking, role-play unlocking, CSV safety and the content editor helpers.
- **End-to-end scripts** in `e2e/` run against a live server and the real database: `m3-quiz-streaks.mjs` (55 checks) and `m4-roleplay-admin.mjs` (81 checks). Each file's first lines say how to run it. **Dev database only:** they create accounts and delete every user whose email ends in `@example.com`, and the M4 script briefly edits seeded content and restores it.
- Next-day behaviour (review dates coming due, streak rollover) is tested by shifting dates in the database, since the real clock cannot be moved.

## How it is built

- **Next.js 16** (App Router), TypeScript strict, Tailwind v4, Prisma 7 with the MariaDB driver adapter (works with MySQL 8 and MariaDB), Auth.js v5 (credentials, JWT sessions), Zod, `@node-rs/argon2`, Phosphor icons, Noto Sans JP (downloaded at build time, served from our own origin).
- Cache Components is switched off on purpose: every screen is per-user and request-time. This Next version also renames middleware to `proxy.ts`.
- **The server is the only authority** on gating, points, quiz sets, quiz scoring, streaks and roles. The browser never decides an outcome.
- `src/lib/dal.ts` decides who the user is. It re-reads the user from the database on every request, so deactivating an account takes effect at once. `src/lib/admin-api.ts` guards every admin and reviewer endpoint (same-origin check, signed in, role).
- Everything uses India Standard Time (UTC+5:30). The day boundary is midnight IST for everyone.
- Look: the minimalist skill's neutrals, flat 1px borders and pastel tags, with the prototype's vermilion as the single accent. Light and dark follow the system setting.

### Where things are

```
src/app/(auth)/         sign-in
src/app/onboarding/     two-step welcome
src/app/(app)/          Today, Learn, Level, Role-play list, Progress, Ranking, Settings (with sidebar / tab bar)
src/app/(focus)/        lesson, quizzes, role-play player (no navigation, just the task)
src/app/(manage)/       admin and review screens (wide layout, role-checked)
src/app/api/            route handlers (see below)
src/lib/                rules and server code. Pure, unit-tested files: config, goal, time,
                        quiz-core, streak-core, roleplay-core, ranking-core, csv, content-edit-core
src/components/         auth, app, manage
prisma/                 schema, migrations, seed (+ seed-data), make-admin
e2e/                    end-to-end scripts
```

Tunable numbers (review steps, point values, pass mark, quiz length) are all in `src/lib/config.ts`.

### API

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/signup`, Auth.js at `/api/auth/*` |
| Profile | `GET` and `PATCH /api/me` |
| Learning | `POST /api/items/:id/learned`, `POST /api/events` (say-it) |
| Quiz | `POST /api/quiz/start`, `/answer`, `/complete` |
| Role-play | `POST /api/roleplays/:id/complete` |
| Review | `POST /api/items/:id/verdict`, `POST /api/roleplay-lines/:id/verdict` (reviewer or admin) |
| Admin | `PATCH` and `DELETE /api/admin/users/:id`, `PATCH /api/admin/items\|levels\|sets\|roleplays\|roleplay-lines/:id`, `GET /api/admin/metrics.csv?type=daily\|summary` |
| Operations | `POST /api/internal/rollover` (cron, needs `x-cron-secret`), `GET /api/health` |

## Daily rollover (cron)

Streaks are always recomputed from the activity records, so the app stays correct even if the job is late. The job also records rest days and refreshes the streak table. Call it once a day just after midnight IST:

```bash
5 0 * * *  curl -s -X POST -H "x-cron-secret: $CRON_SECRET" https://your-domain/api/internal/rollover
```

Locally: `curl -X POST -H "x-cron-secret: <value from .env>" http://localhost:3000/api/internal/rollover`.

## Deploying (CloudPanel VPS, sketch)

The PRD leaves hosting until the app is built. The intended setup: a Node.js site in CloudPanel, MySQL 8 created in CloudPanel, `npm ci && npx prisma migrate deploy && npm run build`, run `npm start` under PM2 behind Nginx with Let's Encrypt, set the four environment variables, add the cron line above, nightly `mysqldump` copied off the server. Not yet configured: Next's `standalone` output, the PM2 file and the backup script (M5).

## Decisions and differences from the PRD

1. **Authentication is simplified on request.** The PRD's email verification, password reset and breached-password check (FR-A1, A2, A5) are removed. A new account is created and signed in at once. Anyone can register with any email address, so accounts and ranking names are unverified.
2. **Sessions are JWT**, as the PRD specifies. Each user also has a `sessionVersion` that can sign out other devices.
3. **Rate limits are held in memory**, correct for one Node process on one VPS. Move them to MySQL if the app is ever scaled out.
4. **`parts` and quiz id lists are stored as JSON text**, because MariaDB's JSON type is only an alias for text. The same code works on MySQL 8.
5. **XAMPP is MariaDB 10.4, not MySQL 8.** Migrations and all tests pass on it. Run the same migrations on MySQL 8 before the pilot.
6. **Quiz API differs from the PRD list:** `start`, `answer` and `complete` instead of one submit call, so answers cannot be probed and the right option is never sent before it is answered.
7. **Dashboard streaks** come from the stored streak table, so they are as of the last daily rollover. Learners' own screens recompute live.
8. **Content history:** an edit raises the version and flags audio for regeneration, but the old text is not stored (PRD FR-D6 is a "should").

## Tips

- **OneDrive:** this folder lives inside OneDrive, which will try to sync `node_modules` and `.next` (tens of thousands of small files). Right-click each > "Free up space", or move the project outside OneDrive and keep the PRD here.
- **Windows and Japanese text:** never pass Japanese through the `mysql.exe -e` command line. Windows turns it into "?". Read with `--default-character-set=utf8mb4` and write Japanese only through the app or Prisma. If seeded rows are ever damaged, correct them in Admin > Content.
- **`next dev` reload loop:** if the page keeps reloading after a `build` or `tsc` run, stop the dev server, delete `.next` and start it again. Do not write log files inside this folder while it runs.
