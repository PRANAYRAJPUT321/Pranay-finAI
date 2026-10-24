# Deploying PD FinPrep

PD FinPrep is a Next.js 16 application backed by PostgreSQL (via Prisma). It
needs a database to run: accounts, progress, plans and the exam catalog all
live there.

## Vercel (recommended)

The repository already contains everything Vercel needs:

- `npm run vercel-build` (used automatically by Vercel) runs `prisma generate`,
  then — **when `DATABASE_URL` is set** — `prisma migrate deploy` (non-destructive)
  and the idempotent seed, then `next build`.
- Without a database the build still succeeds and pages show a friendly
  "We couldn't load this page" notice; `/api/health` reports `setup_required`.

### 1. Add a PostgreSQL database (about 2 minutes)

1. Open the project in the Vercel dashboard → **Storage** tab → **Create Database**.
2. Choose **Neon (Serverless Postgres)** → free plan → connect it to this project
   for **Production** and **Preview**.
3. Vercel adds `DATABASE_URL` (and `DATABASE_URL_UNPOOLED`) automatically. The
   build uses the unpooled URL for migrations when present.

Any PostgreSQL 14+ database works (Supabase, RDS, Railway…): add its connection
string as `DATABASE_URL` under **Settings → Environment Variables**.

### 2. Set environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (added by the Neon integration). |
| `APP_URL` | Yes | Public URL, e.g. `https://pranay-fin-ai.vercel.app` (used in emails). |
| `SEED_ADMIN_EMAIL` | Recommended | Email of the first administrator. |
| `SEED_ADMIN_PASSWORD` | Recommended | Strong password (12+ chars). In production no admin is created without it. |
| `SEED_DEMO_USERS` | Optional | `true` creates demo editor/student accounts with documented passwords — leave off for public sites. |
| `ANTHROPIC_API_KEY` | Optional | Enables the generative AI tutor (model: `ANTHROPIC_MODEL`, default `claude-opus-5-5`). |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` | Optional | Alternative OpenAI-compatible tutor provider. |
| `AI_PROVIDER` | Optional | Force `anthropic`, `openai` or `offline`. Default: first configured key, else offline. |
| `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` | Optional | Transactional email (verification, password reset). Without it, emails are not delivered in production. |
| `AI_TUTOR_HOURLY_LIMIT` | Optional | Tutor messages per user per hour (default 30). |
| `ENFORCE_ENTITLEMENTS` | Optional | Keep `false` — billing is not integrated. |

### 3. Redeploy

**Deployments → … → Redeploy** (or push a commit). Check
`https://<your-domain>/api/health` — it should return `{"status":"ok", ...}`.

## Other hosts / Docker

```bash
npm ci
DATABASE_URL=... npx prisma migrate deploy
DATABASE_URL=... npx tsx prisma/seed.ts     # idempotent
npm run build
DATABASE_URL=... npm start                   # PORT defaults to 3000
```

Run behind HTTPS (session cookies are `Secure` in production). The app is
stateless apart from PostgreSQL, so it scales horizontally; rate limits are
stored in the database and therefore shared across instances.

## Monitoring

- `GET /api/health` — database reachability, migration/seed status.
- Server errors are logged with a digest that matches the reference shown on
  the error page.
- The admin console shows aggregated usage, open content reports and the audit log.
