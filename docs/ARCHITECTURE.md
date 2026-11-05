# Architecture

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript** — server components for pages, server actions for forms, route handlers for JSON APIs (attempt runner, tutor, reports, export, health).
- **PostgreSQL + Prisma 6** — schema in `prisma/schema.prisma`, migrations in `prisma/migrations`, idempotent seed in `prisma/seed.ts` + `prisma/seed/*`.
- **Tailwind CSS 4** — design tokens (`navy` = midnight indigo, `gold` = violet, `mint` = cyan; Sora display type, Inter body, JetBrains Mono) and the motion layer live in `src/app/globals.css`. The dark Nebula theme is applied by remapping tokens under `body.theme-dark` (light-scale colours such as `slate-*`, `navy-50..300` and tints are inverted); regions designed dark (`.bg-ink`, `.scope-dark`) restore the original meaning, and `.scope-themed` re-applies the dark mapping inside them.
- **three.js + @react-three/fiber + drei** — WebGL scenes (landing hero, readiness orb, briefing warp, Concept Galaxy, Formula Labs), loaded with `next/dynamic` (no SSR) behind `SceneGate`, which checks WebGL support, reduced motion and visibility and renders a CSS fallback otherwise.
- **Web Speech and Web Audio APIs** — narration with word boundaries for karaoke captions, speech recognition for the voice drill, and generated soundtracks/soundscapes (no audio files are shipped).
- **Recharts** for charts, **decimal.js** for money-safe arithmetic, **zod** for validation, **bcryptjs** for password hashing, **@anthropic-ai/sdk** for the optional AI tutor.
- **Vitest** (unit + integration) and **Playwright** (end-to-end).

## Layout

```
src/
  app/                 routes: (public) marketing & catalog, (auth), (app) learner area, admin/, api/
  app/actions/         server actions (auth, learning, content, account, tutor, admin)
  components/          UI primitives (ui.tsx, motion.tsx), feature components (attempt runner, charts, forms)
  lib/finance/         deterministic calculators (core.ts) + registry used everywhere
  server/
    auth/              sessions, passwords, guards, rate limiting, account lifecycle
    catalog/           exam structure schema, catalog queries
    assessment/        question schemas, grading, selection, timing, summary, attempt lifecycle
    adaptive/          proficiency heuristic, recommendations, spaced repetition, DB glue
    planner/           plan generator (pure) + persistence (rebalance, task status)
    analytics/         readiness assessment (pure) + analytics aggregation
    learning/          enrollment, flashcards, notes/bookmarks, gamification
    ai/                provider abstraction, tools, grounding, offline tutor, tutor service
    admin/             content administration, audit log
    notifications/     email abstraction, reminder rules (pure), notify() + web push
    engagement/        daily challenge, rapid fire, iCalendar export (pure writer + service)
    materials/         PDF toolkit (pdfkit + bundled fonts in assets/fonts) and document builders
  components/three/    WebGL scenes + SceneGate (progressive enhancement)
  lib/video/           lesson → explainer script, daily briefing script, narrator, spoken-answer parser (pure parts unit tested)
  lib/audio/           Web Audio soundtrack and focus soundscapes
  content/             static reference content (glossary, Resource Hub list, curated talks)
```

Business logic sits in `src/server/**` (framework-agnostic and covered by tests);
pages and components only render and call services.

## Key design decisions

- **Configurable exams, not hard-coded pages.** Each `SyllabusVersion` stores its own structure (sections, timing, formats, scoring notes, calculator policy) validated by `examStructureSchema`. Versions are cloned and promoted; attempts keep their original version so history stays interpretable.
- **Numbers are never left to a language model.** Answer keys carry an optional `calcSpec`; publishing (and the seed) recompute the answer with `src/lib/finance` and refuse mismatches. The AI tutor receives the same calculators as tools.
- **Server-authoritative assessments.** Timing is computed from stored elapsed time and `resumedAt`; every request applies the clock (advance section / auto-submit). Payloads sent to the browser are redacted until answers may be revealed.
- **Transparent heuristics.** Proficiency, mastery thresholds, recommendation priorities, SRS intervals and readiness bands are documented in code and shown to learners with their limitations.
- **Security.** Hashed session tokens in httpOnly SameSite cookies, bcrypt password hashes, Postgres-backed rate limits, role checks in every action/handler (`assertRole`), same-origin checks for JSON writes, audit log for content/role changes, data export and deletion.
- **Exam facts are data, not copy.** `ExamLevel.info` holds dated, sourced facts validated by `examInfoSchema`; the UI always shows the "as of" date, sources and verification state, and reminders read registration deadlines from `ExamWindow`.
- **Generated media stays grounded.** PDFs and video explainers are rendered from the same reviewed lesson/formula records; the video script adds no new claims and narration runs in the browser.
- **3D is progressive enhancement.** Every scene has a CSS fallback, is lazy-loaded, stops rendering when off screen and respects `prefers-reduced-motion`; no page depends on WebGL to work.
- **Personal media from personal data.** The briefing film is built by a pure function (`buildBriefing`) from the learner's plan, progress and countdown; copy is encouraging but never predicts results. Checkpoint questions are drawn from published questions linked to the lesson, with answer keys stripped before reaching the browser.
- **Third-party content stays third-party.** Resource Hub entries are links with a short original description; talks are embedded from youtube-nocookie.com only after the learner presses play.
- **Graceful degradation.** No AI key → offline tutor; provider failure → offline fallback; no email provider → console in development; no database → friendly error page and `/api/health` diagnostics.

## Data model (summary)

Users, sessions, auth tokens, rate limits, audit logs, entitlements · exam programs, levels, syllabus versions, exam windows, topics (tree), prerequisites, learning outcomes, content sources · lessons, formulas · daily challenges, rapid-fire runs · questions, question versions, item sets · enrollments, attempts, attempt items · topic proficiency, lesson progress · study plans, study tasks, study logs · flashcards, card states, review logs, question review states · bookmarks, notes · tutor sessions and messages · content reports, notifications, achievements, study groups · past papers.
