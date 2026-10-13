# Kaizen: the whole project, explained simply

This guide explains every file in the `kaizen-app` folder: **what it does**, **why it is there**, and **what else could have been used** (and why that was not chosen). Read Part 1 first. It is short and makes everything else easier.

---

# Part 1: The big picture

## What Kaizen is

A website where colleagues learn spoken Japanese a few minutes a day. You learn words, take a quiz, keep a streak, practise office conversations and see a team ranking. Admins manage users and content; reviewers check the Japanese.

## The three layers (the most important idea)

Think of a restaurant.

| Layer | Restaurant | In Kaizen | Folders |
|---|---|---|---|
| What you see | The dining room | Pages and buttons | `src/app/(...)/page.tsx`, `src/components` |
| The doors | The waiter taking orders | API routes: the browser sends a request ("I learned this word") | `src/app/api` |
| The rules and the data | The kitchen and the pantry | The logic ("is this level unlocked?", "how many points?") and the database | `src/lib`, `prisma` |

A page never talks to the database directly except through `src/lib`. A button never changes data by itself: it asks an API route, the route asks a `lib` function, and `lib` talks to the database.

## One request, start to finish

Example: you tap **Next** on a lesson card.

1. The browser sends `POST /api/items/12/learned`.
2. `src/proxy.ts` quickly checks you have a login cookie.
3. The route file (`api/items/[id]/learned/route.ts`) checks you are signed in, using `src/lib/dal.ts`.
4. It calls `markItemLearned` in `src/lib/learning.ts`.
5. That function checks the rules (is the level open? is the set open?), saves to the database through `src/lib/db.ts`, adds points if a set or level just finished, and replies.
6. The browser updates the screen.

**Golden rule: the server decides everything.** Points, unlocks, quiz scores and roles are all decided on the server. The browser only shows things. This stops anyone cheating by editing the page.

## Two words you will see: "server" and "client"

- **Server component:** runs on the server, builds the page, can read the database directly. Most pages are this. Fast, and secrets stay hidden.
- **Client component:** runs in the browser, needed when something reacts to clicks, typing, audio or the microphone. These files start with `"use client"`.

## Folder names in brackets, like `(app)`

A folder in round brackets is a **route group**. The brackets are not part of the web address. They only let different areas share a layout:

- `(auth)`: the sign-in page.
- `(app)`: normal screens with the sidebar (Today, Learn, Progress...).
- `(focus)`: full-screen tasks with no sidebar (lessons, quizzes, role-play).
- `(manage)`: admin and review screens (wider layout, staff only).

A folder in square brackets, like `[id]`, means "any value goes here". `/roleplay/7` is handled by `roleplay/[id]`.

## "Pure" files

Some files in `src/lib` end in `-core` (like `quiz-core.ts`). They contain **only rules and maths, no database**. That makes them easy to test and impossible to break by a database problem. The files without `-core` call them and add the database part.

## Time: India Standard Time

Everyone is on IST (UTC+5:30). "Today" means the IST calendar day. This is handled in one file (`src/lib/time.ts`).

---

# Part 2: Files at the top of the folder

### `package.json`
**What:** The project's shopping list and command list. It names every library the app uses and defines commands like `npm run dev`.
**Why:** Every Node project has one; it is how `npm install` knows what to download.
**Instead:** Nothing really replaces it in Node projects. (Yarn and pnpm are other installers that read the same file; npm was used because it comes with Node.)

### `package-lock.json`
**What:** An exact record of every library version that was installed.
**Why:** So you and the server get identical versions and nothing changes by surprise.
**Instead:** Skipping it means different machines could install different versions and behave differently.

### `tsconfig.json`
**What:** Settings for TypeScript, the language the code is written in. Strict mode is on, and `@/` is a shortcut for the `src/` folder.
**Why:** TypeScript catches mistakes (wrong names, missing data) before the app runs. The PRD requires strict mode.
**Instead:** Plain JavaScript is quicker to start but lets many bugs through to real users.

### `next.config.ts`
**What:** Settings for Next.js, the framework. Here it: turns off "cache components" (not useful for a per-user app), adds safety headers to every response, keeps the password library out of the bundle, and hides the little "N" dev button.
**Why:** The headers (no framing, no sniffing, microphone only from our own site) are cheap protection.
**Instead:** The headers could be set in Nginx on the server. Doing it here means they travel with the app wherever it runs.

### `eslint.config.mjs`
**What:** Rules for ESLint, a tool that reads the code and flags suspicious patterns (unused variables, React mistakes).
**Why:** Keeps code tidy; `npm run lint` is part of the checks.
**Instead:** Prettier only formats; it does not find bugs. ESLint was already included by Next.js.

### `vitest.config.mts`
**What:** Settings for Vitest, the unit-test runner. It tells it where tests are and how to understand the `@/` shortcut.
**Why:** The pure rule files (quiz, streak, ranking...) have 60 fast tests.
**Instead:** Jest does the same but is slower to configure with modern TypeScript.

### `prisma.config.ts`
**What:** Tells the Prisma tool where the schema, migrations and seed script are, and which database to connect to (from `.env`).
**Why:** Required by Prisma 7.
**Instead:** Older Prisma put this in `schema.prisma`; version 7 moved it here.

### `.env` (not shared or committed)
**What:** Secrets and settings for your computer: database address, the login-signing secret, the cron password.
**Why:** Secrets must never be in the code or in git.
**Instead:** A secrets manager (like Vault) is for big teams; one server with an `.env` file is the normal simple choice.

### `.env.example`
**What:** A copy of `.env` with fake values, safe to share.
**Why:** Shows what settings are needed without exposing the real ones.

### `.gitignore`
**What:** Lists files git must not track: `node_modules`, `.next`, `.env`.
**Why:** Keeps secrets and huge generated folders out of version history.

### `AGENTS.md`
**What:** A note that Next.js 16 created, telling AI coding tools that this version differs from older ones and to read its built-in docs.
**Why:** It was added by the framework, not by us. It is harmless and can be left alone.

### `README.md`
**What:** The front page: what is built, how to run it, how to make an admin.
**Why:** The first thing anyone opening the project should read.

### `docs/PROJECT_GUIDE.md`
**What:** This file.

### `e2e/m3-quiz-streaks.mjs` and `e2e/m4-roleplay-admin.mjs`
**What:** Scripts that act like real users against a running copy of the app: sign up, answer quizzes, promote an admin, edit content, download CSVs. 55 and 81 checks.
**Why:** Unit tests check single rules; these check that everything works together, including that learners are blocked from admin actions.
**Instead:** A tool like Playwright or Cypress records real browser clicks. We used plain scripts talking to the API because they are faster and also test the security rules directly. Careful: they are for the development database only, because they delete `@example.com` accounts.

### `public/` (five `.svg` files) and `src/app/favicon.ico`
**What:** Leftover starter images from the Next.js template (logos for Next and Vercel). Nothing in Kaizen uses them. `favicon.ico` is the default browser-tab icon.
**Why:** They came with the template. They are safe to delete. A real Kaizen icon can replace them later.

---

# Part 3: The database (`prisma/`)

The database is where everything lasting lives: users, progress, points, quizzes. **Prisma** is the tool that lets the code talk to MySQL using typed code instead of raw SQL.

**Why Prisma:** The PRD chose it. It gives auto-complete, catches typos, and keeps a history of schema changes (migrations).
**Instead:** Writing raw SQL (`mysql2`) gives full control but no safety net and far more code. Drizzle or TypeORM are similar tools to Prisma; Prisma was fixed by the PRD.

### `prisma/schema.prisma`
**What:** The blueprint of every table. 20 tables:
- **People:** `users`, `email_tokens` (unused now that email steps were removed; kept so the schema matches the PRD).
- **Content:** `levels`, `sets`, `items`, `item_audio`, `item_reviews`, `roleplays`, `roleplay_lines`.
- **Progress:** `user_items` (what you learned), `user_levels` (what is unlocked), `user_roleplays`, `user_item_review` (when each word is due again).
- **Points and quizzes:** `points_ledger`, `quiz_sets`, `quiz_attempts`.
- **Activity and streaks:** `study_events`, `daily_activity`, `streaks`.
- **Admin:** `audit_log`.
**Why:** One file describes the whole database, and Prisma creates the tables from it.
**Notes:** Lists such as quiz item ids are stored as text in JSON form, because XAMPP's database (MariaDB) treats its JSON type as plain text anyway. The same code works on real MySQL 8.

### `prisma/migrations/` (3 files)
**What:** A numbered history of changes to the database: `init` created all tables; `roleplay_line_review_note` added the reviewer's reason on role-play lines; `migration_lock.toml` records that this is MySQL.
**Why:** Lets you rebuild the database exactly, on any machine, with one command (`prisma migrate deploy`).
**Instead:** Editing tables by hand in phpMyAdmin works once but cannot be repeated or reviewed on the production server.

### `prisma/seed.ts`
**What:** Fills the database with the 5 levels, 125 items and 24 role-plays. It only adds what is missing and never overwrites edits.
**Why:** The app needs content on day one.
**Instead:** Typing content into the admin screen is slow; shipping it as seed data is repeatable.

### `prisma/seed-data/content.js` and `roleplays.js`
**What:** The actual Japanese lessons and conversations, copied from the prototype. One short line per item.
**Why:** Easy to read and edit as plain text.
**Instead:** JSON or a spreadsheet import would also work. These kept the prototype's compact format so nothing had to be re-typed.

### `prisma/make-admin.ts`
**What:** A small command: `npm run make-admin -- email`. It sets an existing account's role.
**Why:** The very first admin has to come from somewhere; no screen can promote you until someone is already admin.
**Instead:** A "first user becomes admin" rule is risky because anyone who signs up first on a new server would own it. A command run by the person with server access is safer.

### `src/generated/prisma/` (not hand-written)
**What:** Code that Prisma writes automatically from the schema (the typed database client).
**Why:** It is what makes `prisma.user.findMany(...)` auto-complete. Do not edit it; it is rebuilt by `npx prisma generate`.

---

# Part 4: Security and sign-in

### `src/proxy.ts`
**What:** The doorman. Every page request passes it first. If you have no login cookie, you are sent to `/signin`. (In Next.js 16 this is what used to be called "middleware".)
**Why:** A quick first check before any page loads.
**Instead:** Checking in every page alone works but is easy to forget. Note this is only a quick check: the real checks happen in `dal.ts` next to the data. A cookie can be fake; the database cannot.

### `src/auth.ts`
**What:** Sign-in logic using Auth.js. When you submit email and password it: limits how fast you can try, looks you up, checks the password, counts failures (10 wrong in 15 minutes locks the account for 15 minutes), refuses deactivated users, and starts a 30-day session.
**Why:** Sign-in is the easiest place to make a security mistake, so a well-used library handles cookies and tokens.
**Instead:** Writing our own session system would be risky. Social sign-in (Google) was ruled out by the PRD. Passwords are never stored plainly (see `password.ts`).

### `src/app/api/auth/[...nextauth]/route.ts`
**What:** Hands the sign-in web addresses (`/api/auth/signin`, `/callback`, `/csrf`...) to Auth.js.
**Why:** Auth.js needs one catch-all route to work.

### `src/app/api/auth/signup/route.ts`
**What:** Creates an account: checks the email and password, refuses a repeat email, hashes the password, makes the user with Level 1 open, and guesses a display name from the email ("priya.nair@..." becomes "Priya Nair"). Then the browser signs in straight away.
**Why:** No email step, by your request.
**Instead:** Email verification (the PRD's original plan) proves the address is real but was removed on request.

### `src/lib/password.ts`
**What:** Turns a password into a scrambled "hash" (argon2id) and checks a typed password against it. Also does a fake check when an email does not exist, so a wrong email takes the same time as a wrong password.
**Why:** If the database ever leaks, hashes cannot be turned back into passwords. The timing trick stops people finding which emails have accounts.
**Instead:** bcrypt is older and fine; argon2id is the PRD's choice and the current recommendation. MD5 or plain storage would be unsafe.

### `src/lib/rate-limit.ts`
**What:** Counts attempts per person (by internet address or email) in memory, and says "too many" past a limit.
**Why:** Stops password guessing and spam sign-ups.
**Instead:** Storing counters in the database or Redis survives a restart and works across many servers. Memory is enough for one server and needs nothing extra. Move it if the app ever runs on several servers.

### `src/lib/dal.ts` ("data access layer")
**What:** The single place that answers "who is this user?". It reads the session, then loads the user from the **database every time** and refuses if the account is deactivated or the session version is old. Also provides `requireUser` (go to sign-in or onboarding if needed) and `requireRole`.
**Why:** This is why deactivating a user takes effect instantly and why a role change needs no re-login. It is the main security checkpoint.
**Instead:** Trusting the role stored in the cookie is faster but stays wrong for up to 30 days after you change it. (`getApiUserWithRole` in this file is currently unused. `admin-api.ts` does the same job.)

### `src/lib/api.ts`
**What:** Small helpers every API route uses: `json()` and `fail()` for replies, `readJson()` to read and validate the request body with Zod, and `sameOrigin()` which refuses requests coming from another website.
**Why:** Keeps 20 routes consistent and short; the origin check stops other sites making your browser act for you.
**Instead:** Each route could do this itself (copy and paste, easy to forget).

### `src/lib/admin-api.ts`
**What:** `guard()`: the standard opening for every admin or reviewer route. Checks origin, then signed in, then the right role. Also `numericId()` to read the `[id]` safely.
**Why:** One function means no admin route can forget the role check.

### `src/lib/client-api.ts`
**What:** A helper for the browser side of admin screens: sends a request and always returns `{ ok, data }`, even when the network fails.
**Why:** Admin forms would otherwise each repeat the same try/catch code.

---

# Part 5: Shared setup files in `src/app/`

### `src/app/layout.tsx`
**What:** The outer shell around every page: loads the Japanese font (Noto Sans JP), sets the page title format, the theme colour for light and dark, and places the toast (pop-up message) area.
**Why:** Everything shared lives here once.
**Instead:** Linking Google Fonts directly would make every visit call Google. `next/font` downloads the font once at build time and serves it from our own server (a PRD rule: no third-party calls while running).

### `src/app/globals.css`
**What:** The look of the whole app: colours (light and dark), button, card, tag, form and progress-bar styles, and the gentle fade-in. It is built on Tailwind.
**Why:** One place controls the design. The look is a blend: calm neutral colours and thin borders, with vermilion red as the only accent. Dark mode follows your computer's setting. Animations switch off for people who prefer reduced motion.
**Instead:** A ready-made UI kit (like shadcn or Material) is faster to start but looks generic and has more to fight. Plain CSS everywhere gets repetitive; Tailwind plus a few shared classes balances both.

### `src/app/actions.ts`
**What:** One tiny action: sign out.
**Why:** A form button can call it directly, with no API route needed.

---

# Part 6: The screens (`src/app/(...)/`)

Every `page.tsx` is one web page. They are server components: they read data, then draw the page.

## `(auth)` and onboarding

### `(auth)/signin/page.tsx`
**What:** The sign-in page. If you are already signed in it sends you home. Otherwise it shows the form.
**Why:** The form itself is in a component; the page only decides what to show.

### `onboarding/page.tsx`
**What:** The two-step welcome, shown once. Checks you are signed in and not already onboarded.
**Why:** Asks the two things the app needs (display name, romaji or kana only) before the first lesson.

## `(app)`: screens with the sidebar

### `(app)/layout.tsx`
**What:** Wraps these screens in the sidebar/tab bar, and refuses anyone who is not signed in or not onboarded.
**Why:** One check protects every screen in the group.

### `(app)/page.tsx` (Today)
**What:** Greeting, three stats (streak, points, level), the goal ring, the Continue button and the daily quiz card.
**Why:** The home screen. Everything it shows is read fresh from the database for you.
**Notes:** The ring is drawn as a small SVG circle (a chart, not an icon).

### `(app)/learn/page.tsx`
**What:** The five levels with progress bars, a lock on closed ones and "Unlock with a quiz".

### `(app)/learn/[level]/page.tsx`
**What:** One level: set tabs (Set 1 to 5, later ones locked), the five items of the chosen set, a Start/Continue/Practise button, and the level-quiz button.
**Notes:** The chosen set is in the web address (`?set=2`), so refresh and back-button work.
**Instead:** Storing the selected tab in the browser's memory would lose it on refresh.

### `(app)/progress/page.tsx`
**What:** Current and longest streak, points, a bar per level, and a month calendar (goal met, rest day, missed, today), plus "1 rest day free this week".

### `(app)/roleplay/page.tsx`
**What:** The 24 role-plays grouped Starter, Easy, Medium, Challenge, with Ready, Done or locked.

### `(app)/ranking/page.tsx`
**What:** The leaderboard: top 20, plus your own row if you are lower, and a note explaining how points are earned. It never shows emails.

### `(app)/settings/page.tsx`
**What:** Change display name and romaji setting, sign out, data request note, and (for staff) shortcuts to Review and Admin.

## `(focus)`: full-screen tasks

### `(focus)/layout.tsx`
**What:** A plain centred layout with no sidebar; checks you are signed in.
**Why:** Lessons and quizzes work better with nothing to distract you.

### `(focus)/learn/[level]/[set]/lesson/page.tsx`
**What:** Opens the lesson card for a set. Checks the level and set are really open for you (otherwise redirects), and works out which item to start on.
**Why:** The rule is enforced here and again in the API, so typing the address by hand does not skip ahead.

### `(focus)/quiz/daily/page.tsx`, `quiz/unlock/[level]/page.tsx`, `quiz/level/[level]/page.tsx`
**What:** Three small pages that check access and then show the same quiz component in three modes: daily (with `?set=1..5`), unlock (only for a locked level), level quiz (only for an open level).

### `(focus)/roleplay/[id]/page.tsx`
**What:** One conversation. Redirects to the list if it is still locked.

## `(manage)`: staff screens

### `(manage)/layout.tsx`
**What:** Same sidebar but wider, and sends learners away.
**Why:** Tables need more room.

### `(manage)/admin/page.tsx` (Dashboard)
**What:** Overall counts, two CSV download buttons and a table of every learner's participation.

### `(manage)/admin/users/page.tsx`
**What:** Search box and the users table (role, deactivate, delete).

### `(manage)/admin/content/page.tsx`
**What:** List of the 5 levels and 24 role-plays with a Publish/Unpublish switch and counts of items marked wrong.

### `(manage)/admin/content/level/[id]/page.tsx`
**What:** Edit one level: its details, each set's name, and every item (click a row to open its form). Shows the reviewer's reason on items marked wrong.

### `(manage)/admin/content/roleplay/[id]/page.tsx`
**What:** Edit one role-play: title, scene and each line.

### `(manage)/admin/audit/page.tsx`
**What:** The last 100 admin actions, with who and when (in IST).

### `(manage)/review/page.tsx` and `review/roleplays/page.tsx`
**What:** The reviewer's queues for items and for role-play lines, with filters, play buttons and Approved/Wrong controls. Open to reviewers and admins.

---

# Part 7: The doors (`src/app/api/`)

These all follow the same pattern: check origin, check who you are, validate the input with Zod, call a `lib` function, reply with JSON.
**Why REST-style routes:** the PRD lists them, they are easy to test with plain scripts, and the browser can call them from any component.
**Instead:** Next.js "server actions" let a button call a function directly with less code. They were used for sign-out only; routes were kept elsewhere because they are easier to test and to protect with explicit checks.

| File | What it does |
|---|---|
| `me/route.ts` | `GET` your profile; `PATCH` change name, romaji setting, or finish onboarding. |
| `items/[id]/learned/route.ts` | You tapped Next on an item. Runs the gating rules, awards set and level points, opens the next level, rebuilds today's quiz sets if a level just opened, and says if the daily goal was just met. |
| `events/route.ts` | Records that you completed Say it (for the dashboard's counts). |
| `quiz/start/route.ts` | Opens a quiz and returns the questions **without** saying which answer is right. |
| `quiz/answer/route.ts` | Saves one answer (only the first), moves that word's review date, and says right or wrong. |
| `quiz/complete/route.ts` | Scores the quiz from the saved answers, awards points if allowed, unlocks levels on a pass, updates the goal and streak. |
| `roleplays/[id]/complete/route.ts` | Marks a role-play complete; +30 points once; opens the next one. |
| `items/[id]/verdict/route.ts` and `roleplay-lines/[id]/verdict/route.ts` | Reviewer marks something Approved or Wrong (reason required). |
| `admin/users/[id]/route.ts` | Change role or status, or delete. Protects the last active admin and refuses self-changes. |
| `admin/items/[id]/route.ts` | Edit an item. Changed text goes back to Draft, raises the version, and flags audio for regeneration if the kana changed. |
| `admin/levels/[id]`, `sets/[id]`, `roleplays/[id]`, `roleplay-lines/[id]` | Edit those parts; each writes to the audit log. |
| `admin/metrics.csv/route.ts` | Downloads the CSV export (`?type=daily` or `summary`). |
| `internal/rollover/route.ts` | The nightly job; needs the secret from `.env`. Settles streaks and rest days for everyone. |
| `health/route.ts` | Says "ok" if the database answers. For an uptime monitor. |

**Why quizzes use three steps (start, answer, complete)** instead of one "submit everything" request: with one request, the browser would need to know the right answers in advance to show feedback after each question, so a user could read them. Three steps keep the right answer on the server until you have answered.

---

# Part 8: The rules and data (`src/lib/`)

The most important folder. Files marked **(pure)** have no database.

### `config.ts` (pure)
**What:** All the tunable numbers in one place: review steps (1, 3, 7, 14, 30 days), points, quiz length, unlock pass mark, goal size.
**Why:** The PRD says these must be easy to tune during the pilot.
**Instead:** Numbers hidden inside code are hard to find; storing them in the database lets admins change them but needs a new screen. A single file is the simplest.

### `time.ts` (pure) + `time.test.ts`
**What:** Converts any moment into an IST date, finds the Monday of a week, adds days, and builds the greeting and date text.
**Why:** The whole app's "today" must agree. The tests prove the midnight boundary is exactly right.
**Instead:** A date library (Luxon, date-fns-tz) is useful when time zones have daylight saving. India does not, so a fixed offset is enough and simpler.

### `db.ts`
**What:** Creates one database connection and reuses it.
**Why:** Opening a new connection per request would be slow. It uses a small connection pool (5).

### `curriculum.ts`
**What:** Loads all 125 items for a user with their progress laid on top: which are learned, which sets are finished or open, which level is unlocked. Also finds "the next thing to do" for the Continue button, and reads the "built from" parts.
**Why:** One function feeds Today, Learn, Level, Lesson and Progress so they never disagree.
**Instead:** Each page could query on its own, but 125 rows is tiny and one source of truth avoids mistakes.

### `learning.ts`
**What:** The learning rules. `markItemLearned` is the core: checks the level and set are open, saves "learned", updates today's count, and when a set is complete awards +10 once, and when a level is complete awards +50 once and opens the next. `totalPoints` sums the points list.
**Why:** The PRD's rules live in one place. Awards use a "ledger": a list of point entries where a repeat is blocked by a unique key, so you cannot earn the same award twice, even by double-tapping.
**Instead:** Keeping a single "points" number on the user is simpler but can drift or be tampered with and cannot explain where points came from. The ledger can always be recounted.

### `goal.ts` (pure) + `goal.test.ts`
**What:** The goal ring maths (learning counts 70%, quiz 30%) and "does today qualify?" (5 items and the quiz).

### `quiz-core.ts` (pure) + `quiz-core.test.ts`
**What:** The quiz brain:
- how a review date moves after a right or wrong answer,
- how 25 questions are dealt into 5 sets (3 new + 2 review each),
- how wrong answer options are picked: the most confusable ones, never an answer that would also be correct (like a longer version of the same phrase), and never two options with the same English meaning,
- how 5 items become 5 questions, alternating listen and read.
**Why:** This is the trickiest logic in the app, so it is pure and heavily tested.

### `quiz.ts`
**What:** The database side of quizzes: builds and stores the day's 5 sets, rebuilds unanswered sets when a level opens, starts a quiz, records each answer (once), and completes a quiz (score, points, unlock, goal).
**Why:** Sets are stored per learner per day so they are the same on every device and after a reload. Scoring is on the server.
**Instead:** Building questions in the browser (like the old prototype) is simplest but lets people edit scores and loses everything on reload.

### `streak-core.ts` (pure) + `streak-core.test.ts`
**What:** The streak rules: walks every day from the first goal day to today. A goal day adds one. A missed day is covered by that week's rest day (if the day before was a goal day and the rest day is unused); otherwise the streak resets. Two misses in a row always break it. Today is never counted as missed because it is still open. Also decides each calendar day's status.
**Why:** Always recomputed from the record of days, so it can never drift.
**Instead:** A running counter ("streak = streak + 1 each night") is simpler but breaks if the nightly job is late and cannot be repaired.

### `streak.ts`
**What:** Reads the streak (no writes, safe to use while drawing a page), refreshes it (writes the result and marks rest days), and the nightly "settle everyone" function.

### `roleplay-core.ts` (pure)
**What:** Which tier a role-play is in (six per tier), which are open (each opens when the one before is done), and the 4.5-second pause for your turn.

### `roleplay.ts`
**What:** Lists role-plays with your progress, loads one with its lines, and completes one (+30 once).

### `ranking-core.ts` (pure)
**What:** Sorts learners by points, breaks ties by who reached the score first, and picks the top 20 plus your own row.

### `ranking.ts`
**What:** Gathers every active learner's name, level and points and runs the sorting. Only these three facts leave this function, never emails.

### `admin.ts`
**What:** Admin helpers: write to the audit log, search users, build the participation table, and build the two CSV exports.

### `csv.ts` (pure)
**What:** Writes CSV safely: quotes commas and line breaks, and puts an apostrophe in front of any text starting with `=`, `+`, `-` or `@`.
**Why:** Display names are typed by learners. Without this, a name like `=HYPERLINK(...)` could run as a formula when an admin opens the file in Excel. This was tested.

### `content-edit-core.ts` (pure) + `content-edit-core.test.ts`
**What:** Helpers for the content editor: reads the "built from" box (one line per part, `kana | romaji | meaning`) and reports a clear error for a bad line; decides if a change means the audio must be regenerated.

### `speech.ts` (runs in the browser)
**What:** Plays Japanese audio. If an audio file is supplied it plays that; otherwise it uses the browser's built-in Japanese voice at normal or slow speed. Starting one sound stops the last.
**Why:** The real recordings do not exist yet, so this fallback keeps lessons working. It is already built to switch to files later.
**Instead:** Waiting for finished audio would block everything.

### `toast.ts` (runs in the browser)
**What:** Little pop-up messages. One can be shown now, or saved to show on the next page (so "Level 1, set 2 complete" appears after you return to the level page).

---

# Part 9: Building blocks (`src/components/`)

These are the pieces pages are built from. Most run in the browser because they react to taps.

## `auth/`

- **`AuthShell.tsx`**: the two-panel sign-in layout. On the left a brand panel with the kanji 改善 and a sample phrase, on the right the form. On phones only the form shows.
- **`SignInForm.tsx`**: the form with "Create account" and "Sign in" tabs. After creating an account it signs you in at once. Shows clear errors (wrong password, locked, deactivated).

## `app/`

- **`Shell.tsx`**: the frame: sidebar on desktop, top bar on phones, Manage links for staff, the main area.
- **`NavLinks.tsx`**: the five main links, as a sidebar and as the phone's bottom tab bar, highlighting the current page.
- **`OnboardingFlow.tsx`**: the two welcome steps.
- **`Lesson.tsx`**: the lesson card: item, listen/slow, "built from", note, dots, Previous, Say it, Next/Finish set. Tapping Next tells the server. If you tap Finish set with items still new, it jumps you to the first one.
- **`SayIt.tsx`**: listen, record up to 5 seconds, compare. Uses the browser's recorder, a live level meter, and clear messages if the microphone is blocked. Recordings stay in memory and are never uploaded.
- **`PlayButton.tsx`**: the round speaker button used everywhere.
- **`QuizRunner.tsx`**: runs all three quiz types: loads, shows each question, highlights right and wrong with an icon (not colour only), then the score screen for each type.
- **`RoleplayPlayer.tsx`**: chat bubbles, Listen to all, Practise my part (with the pause), Mark complete. Any new playback or leaving the page stops the current one.
- **`SettingsForm.tsx`**: the name and romaji form.
- **`ToastHost.tsx`**: shows the pop-up messages.
- **`ComingSoon.tsx`**: a placeholder card used when Role-play, Progress and Ranking were not built yet. **No longer used**; it is safe to delete.

## `manage/`

- **`AdminTabs.tsx`**: the Dashboard / Users / Content / Audit tabs and the Review tabs, plus the status colour tags.
- **`UsersTable.tsx`**: the users table with role dropdown, Deactivate and Delete (with a confirm).
- **`ContentForms.tsx`**: the publish switch, simple name forms, the item editor and the role-play line editor.
- **`VerdictControls.tsx`**: the Approved and Wrong buttons (Wrong asks for a reason).

**Why plain components instead of a UI library:** the project has its own small design (buttons, cards, tags). A library like shadcn/ui or Material would bring many files and a look to override. This approach is less code to understand.
**Icons:** Phosphor icons from a package, never hand-drawn.

---

# Part 10: What is not used or not built

- **Unused leftovers (safe to delete):** `components/app/ComingSoon.tsx`, the five `public/*.svg` files, the default favicon, `getApiUserWithRole` in `dal.ts`, `istToday` in `time.ts`, and the `email_tokens` table (kept so the schema matches the PRD).
- **Not built yet:** the installable app and offline audio, the real text-to-speech audio, the per-event analytics list, a saved history of edited text, adding or removing role-play lines.

---

# Part 11: Why these big choices

| Choice | Why | What else existed |
|---|---|---|
| **Next.js** (React framework) | Fixed by the PRD. One project holds pages and API. | Separate frontend and backend: more moving parts for a team this size. |
| **TypeScript** | Catches mistakes early. | Plain JavaScript. |
| **MySQL with Prisma** | MySQL is fixed by the PRD. Prisma gives safe, typed queries and migrations. | Raw SQL, Drizzle, TypeORM. |
| **Server decides everything** | Prevents cheating, same result on every device. | Logic in the browser (as the prototype did). |
| **Points ledger** | Can be audited and cannot double-count. | One number on the user. |
| **Streak recomputed from records** | Cannot drift if the nightly job is late. | A running counter. |
| **IST everywhere** | Everyone is in India; one clear rule. | Per-user time zones: more complexity for no benefit here. |
| **Browser voice for now** | Lessons work today. | Waiting for recorded audio. |
| **Same-origin checks and role checks on every request** | Admin screens are only hidden by design; the real protection is the server saying no. | Hiding buttons only (not secure). |
| **Unit tests for rules and end-to-end scripts for the whole** | Catches both logic and wiring mistakes. | Manual clicking only. |
