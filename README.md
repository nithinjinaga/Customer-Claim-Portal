# Premier Energies — Customer Service Portal

Complaint/ticket portal for Premier Energies solar module customers: register,
raise defect complaints (technical fault / transit breakage) through a 5-step
wizard with photo/video evidence, track status publicly by Complaint ID, and
manage everything from a staff admin panel.

## Stack

Next.js (App Router) · TypeScript · Tailwind v4 · Prisma 6 + Supabase Postgres ·
Supabase Storage (direct client uploads via signed URLs) · Resend email · Vercel.

## Getting started

```bash
npm install
cp .env.example .env       # fill in values (see below)
npx prisma db push         # create tables
node scripts/seed-admin.mjs admin@premierenergies.com 'StrongPass1' "After-Sales Admin" ADMIN
npm run dev
```

Local development without Supabase: `npx prisma dev -d` starts a local Postgres;
put its URL in `DATABASE_URL`/`DIRECT_URL` **with `&pgbouncer=true` appended**.
With no `SUPABASE_SERVICE_ROLE_KEY`, file uploads are disabled (the wizard says
so and still submits); with no `RESEND_API_KEY`, emails print to the console.

## Environment variables

Documented in [.env.example](.env.example). Summary:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Supabase Postgres (pooled / direct) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Storage (create a private bucket named `complaints`) |
| `JWT_SECRET` | Session signing |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email (verify premierenergies.com in Resend to send from the company address) |
| `AFTER_SALES_EMAIL` | Internal inbox notified of each new complaint |
| `NEXT_PUBLIC_APP_URL` | Absolute URL used in emails |

## Key routes

- `/` landing + public status tracker (`/track?id=PE…`)
- `/register`, `/login`, `/forgot-password`, `/reset-password`
- `/dashboard` customer dashboard · `/dashboard/new-complaint` wizard · `/dashboard/complaint/[id]`
- `/admin/login` staff login · `/admin` metrics/list · `/admin/complaint/[id]` manage
- `/api/admin/export` CSV · `/api/admin/zip/[id]` evidence ZIP

## Complaint IDs

`PE` + `DDMMYYYY` + per-day sequence (IST), e.g. 11th complaint on 17-07-2026 →
`PE1707202611`. Generated race-free in `src/lib/complaint-id.ts` via the
`DailyCounter` table.

## Tests

```bash
npm run dev                              # in one terminal
node --env-file=.env scripts/e2e.mjs     # in another — 20+ HTTP/DB smoke checks
```
