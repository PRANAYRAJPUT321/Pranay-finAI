# PD FinPrep

An AI-assisted preparation platform for professional finance, accounting,
investment, taxation and risk certifications (CFA, FRM, CAIA, CPA, ACCA, CMA,
CA India, EA, NISM, CFP, CTA and more).

It guides a learner through **diagnostic → personalised plan → lessons →
practice → spaced revision → mock exams → analytics → targeted remediation →
readiness review**, using transparent, rule-based engines and deterministic,
decimal-safe financial calculations.

> PD FinPrep is an unofficial preparation tool. It is not affiliated with or
> endorsed by any examination body, uses only original or properly licensed
> questions, and never promises a pass.

## Quick start (local)

Requirements: Node.js 20.9+, PostgreSQL 14+.

```bash
cp .env.example .env            # set DATABASE_URL
npm install                     # also runs prisma generate
npx prisma migrate deploy       # create tables
npm run db:seed                 # catalog, 43 lessons, 194 verified questions, 30 formulas
npm run dev                     # http://localhost:3000
```

Development accounts created by the seed (never created in production):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@finprep.local` (or `SEED_ADMIN_EMAIL`) | `ChangeMe!Admin123` (or `SEED_ADMIN_PASSWORD`) |
| Content manager | `editor@finprep.local` | `ChangeMe!Editor123` |
| Student | `student@finprep.local` | `ChangeMe!Student123` |

Deployment: see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
Architecture: see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js development, production build, production server |
| `npm run lint` / `typecheck` | ESLint, TypeScript |
| `npm test` | Unit tests (finance library, grading, selection, timing, SRS, proficiency, planner, readiness, AI tools) |
| `npm run test:integration` | Integration tests against a dedicated Postgres database (`TEST_DATABASE_URL`, must contain "test"). Setup is non-destructive: `migrate deploy` + idempotent seed. |
| `npm run test:e2e` | Playwright journeys (run `npm run build` first; uses the test database) |
| `npm run db:seed` | Idempotent demo seed; aborts if any numerical answer key disagrees with the calculators |

## Implemented features

- **Accounts & security** — registration, login, DB-backed sessions (hashed tokens, sliding expiry), email verification, password reset, password change, data export, account deletion, role-based access (student / content manager / admin) enforced server-side, Postgres-backed rate limiting, same-origin checks on JSON APIs, security headers.
- **Configurable exam catalog** — programs, levels, versioned syllabi (status, effective dates, verification status and date, source links), topic weightings, prerequisites, learning outcomes, exam structure (sections, timing, formats, scoring notes, calculator policy). All seeded structures are marked *unverified* until an admin checks them.
- **Onboarding** — multiple certifications per learner, exam date or window, availability, background, preferred format, self-assessed confident/difficult topics, diagnostic test.
- **Study plan** — day-by-day schedule from time remaining, weights, difficulty, proficiency and prerequisites; spaced reviews at +1/+7/+21 days; reserved final revision with mocks; daily/weekly/monthly views; mark done with logged time, skip, reschedule, missed-session recovery, workload warnings.
- **Lessons** — 43 structured lessons across 11 exam levels (objectives, prerequisites, three explanation levels, formal definition, worked examples, formulas, applications, exam patterns, misconceptions, summary, knowledge check, references, tables, journal entries, interactive calculators), bookmarks, notes, revision notebook.
- **Question bank & assessment engine** — MCQ, multiple-select, numeric, written (indicative rubric), item sets; seeded randomisation, weight-proportional selection, no duplicates, item sets kept together, per-question option shuffling; timed/untimed, immediate or end feedback, flagging, confidence, autosave, pause/resume, server-authoritative timers, sectioned mocks with closed sections and auto-submit; detailed explanations with distractor rationales; similar-question practice; error categorisation.
- **Deterministic finance library** — TVM, NPV/IRR, bonds (price, YTM, durations, convexity), Gordon growth, CAPM, WACC, ratios, portfolio risk, Sharpe, statistics, parametric VaR, forwards, put-call parity, depreciation, progressive tax (caller-supplied brackets) — used for answer-key verification, formula calculators and AI tools.
- **Adaptive engine** — transparent proficiency heuristic, mastery requiring minimum evidence, recommendations in the documented priority order, SM-2-style spaced repetition for flashcards and questions.
- **Mock exam center** — full, half, sectional, custom; scaled honestly when the bank is smaller than the real exam; history and comparison.
- **Flashcards** — system, formula, definition, user and automatic mistake cards; due queue, honest ratings with interval previews, weak-topic sessions, suggestions that require verification, revision stats.
- **Analytics & readiness** — coverage vs mastery, accuracy/hours/retention trends, mock history, recurring mistakes, plan and revision compliance, readiness category with components and explicit limitations (no pass probabilities).
- **AI tutor** — Teach Me / Test My Thinking / Find My Mistake; provider abstraction (Anthropic SDK, OpenAI-compatible, offline); grounding with citations; calculator tools; per-user rate limits; graceful fallback to an offline, material-only tutor.
- **Formula library** — search, filters, variables, conventions, assumptions, worked examples, calculators, recall drill, linked practice.
- **Past papers** — links to official past papers and samples (never re-hosted), PD FinPrep original mocks, admin-managed licensed resources.
- **Gamification (optional)** — streaks, milestones for meaningful activity, weekly targets, opt-in study groups/accountability pairs without public leaderboards; all switchable off.
- **Exam guide** — every level of every program with upcoming windows and live countdowns, registration deadlines, fee tables, published pass rates (marked official/reported), an editorial difficulty rating, format, passing standard, official and registration links and cited sources, all dated "as of" and flagged unverified until an admin checks them. Public at `/exam-guide`, in-app at `/guide`.
- **Study materials (PDF)** — downloadable lesson notes, topic packs, complete syllabus study packs, formula sheets and exam fact sheets, rendered server-side with pdfkit and bundled DejaVu fonts (Unicode symbols such as σ, ×, ₹ print correctly).
- **Video lessons** — every published lesson becomes a short animated explainer (big idea, key formula, worked example, exam trap, summary) with narration from the device's text-to-speech, captions, chapters, speed control, keyboard shortcuts and full screen. Scenes are generated deterministically from reviewed lesson content; nothing is invented beyond it.
- **Notifications** — header bell with live polling, browser notifications, optional web push (VAPID) to installed devices; reminders for today's plan, due flashcards, exam countdown (60/30/14/7/3/1 days) and registration deadlines, each created once and switchable off.
- **Installable app (PWA)** — manifest, service worker with offline fallback, install button and QR code on `/get-app`, iOS/Android/desktop instructions.
- **Navigation** — grouped sidebar, Ctrl/⌘+K quick search, phone bottom tab bar with a full-screen menu; editorial green/black/white/red design.
- **Daily challenge** — one exam-style question per day, chosen from questions the learner has not seen, answered once, with a daily streak and a 14-day history; shown on the dashboard.
- **Rapid Fire** — a 60-second game-style sprint of short questions, graded server-side (answers never reach the browser before you answer), +10/−3 scoring, private best scores, review of misses.
- **Focus timer** — Pomodoro sessions (25/5, 50/10, 15/3) with a progress ring, chime and notifications; completed sessions are logged as study time.
- **Glossary** — 149 plain-English terms with formulas, filterable by exam and category, A–Z jump links and one-tap "add to flashcards".
- **Calendar export** — `/api/calendar` downloads an .ics file with upcoming plan tasks, target exam dates, exam windows and registration deadlines.
- **Admin console** — question CRUD with versioning and review workflow, publishing gated by schema + answer-key checks, answer-key correction with automatic re-grading, CSV/JSON import with row-level validation, lesson editing, syllabus verification/cloning/versioning, topic weights, past-paper resources, content reports, user roles and manual tier grants, audit log, aggregated analytics.

## Integrations requiring credentials

| Integration | Variables | Without it |
|---|---|---|
| PostgreSQL | `DATABASE_URL` | Required. |
| AI tutor | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | Offline tutor assembles cited course material (clearly labelled). |
| Email | `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` | Development logs links to the console; production does not send emails. |
| Web push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`npx web-push generate-vapid-keys`) | In-app notifications plus browser alerts while the app is open. |
| Billing | not integrated | Tiers are shown; upgrades are labelled unavailable; admins can grant tiers manually (audited). |

## Known limitations and next steps

- Content depth: CFA Level I (61 questions, 11 lessons); FRM Part I (29, 5); CPA FAR (14, 4) and AUD (8, 2); NISM V-A (16, 3); ACCA FR (11, 3); CMA Part 1 (11, 3) and Part 2 (8, 2); CA Foundation (13, 4); CFP (12, 3); CAIA Level I (11, 3). CFA Levels II/III, FRM Part II, CPA REG and EA are structure-only.
- Seeded exam structures and weights are unverified until checked by an administrator against official sources.
- Written-response grading is keyword-based and indicative only.
- Proficiency, readiness bands and SRS intervals are rule-based heuristics that have not been statistically validated.
- Exam dates, fees and pass rates were researched on 24 Oct 2026 and are unverified until an administrator confirms them; they change every cycle.
- Video narration depends on the device's speech voices (quality varies; captions always available). Videos are animated explainers, not recorded footage.
- Email reminders, payment integration and question-level psychometrics (IRT) are not implemented yet.
- The AI tutor uses keyword retrieval; embedding-based retrieval would improve grounding.
