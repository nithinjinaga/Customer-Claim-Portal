# Premier Energies — Customer Service Portal

Complaint/ticket portal for Premier Energies solar module customers: raise
defect complaints (technical fault / transit breakage) through a multi-step
wizard with photo/video evidence — no account required — track status publicly
by Complaint ID + email/phone, and manage everything from a staff admin panel.

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

- `/` landing (hero) · `/complaint/new` anonymous complaint wizard
- `/track?id=PE…` public status tracker (unlock full detail with ID + email/phone)
- `/admin/login` staff login · `/admin` metrics/list · `/admin/complaint/[id]` manage
- `/forgot-password`, `/reset-password` staff password reset
- `/api/admin/export` CSV · `/api/admin/zip/[id]` evidence ZIP

Customers have no accounts. Staff (ADMIN/AGENT) are created via
`node scripts/seed-admin.mjs <email> <password> "Name" ADMIN` and sign in at `/admin/login`.

## Complaint IDs

`PE` + `DDMMYYYY` + per-day sequence (IST), e.g. 11th complaint on 17-07-2026 →
`PE1707202611`. Generated race-free in `src/lib/complaint-id.ts` via the
`DailyCounter` table.

## Complaint wizard — redesign notes

The wizard (`src/app/(public)/complaint/new/wizard.tsx` + `uploads.tsx`) was
redesigned against the ui-ux-pro-max **Soft UI** direction while keeping Premier
Energies brand tokens. What it does that the reference long-scroll form does not:

- **Real step gating** — five one-at-a-time steps, each Zod-validated (`onTouched`,
  so errors surface inline on blur, not as a wall on submit) before you can advance;
  the step rail lets you jump back to any completed step.
- **Autosave** — progress is written to `localStorage` (`pe-complaint-draft`) on
  every change and restored on reload; cleared on successful submit.
- **Real uploads** — drag-and-drop, client-side image compression + thumbnail
  generation (`browser-image-compression`), signed-URL direct upload with progress,
  live **image previews** (`URL.createObjectURL`, revoked on remove/unmount), camera
  capture on mobile. All emoji were replaced with an inline SVG icon set
  (`src/components/icons.tsx`) — no icon dependency added.
- **Radio-cards** for the primary Defect Type choice; accessible segmented pills for
  the smaller enum choices (real `<input type=radio>` under the hood).
- **Confirmation screen** — ticket ID, plain-language "what happens next" timeline,
  and a **Download a copy** button (client-side text summary; the confirmation email
  is already sent server-side).

Accessibility: visible labels, error text tied to each field, keyboard-operable
step rail with `aria-label`/`aria-current`, visible focus rings, and a global
`prefers-reduced-motion` guard in `globals.css`.

**Deliberately not built** (they don't fit this portal's model — say so if you want
them anyway): serial-number **OCR/barcode scan** (serials here are free-text, min 3
chars — not a validated 16-digit format), **pincode → state/district/city autofill**
(the wizard collects a free-text site address, not structured location fields), and a
**font swap** to Plus Jakarta Sans (kept the wired `next/font` families, no CSP/CDN risk).
The submission
payload contract to `submitComplaint` is unchanged.

## Tests

```bash
npm run dev                              # in one terminal
node --env-file=.env scripts/e2e.mjs     # in another — 20+ HTTP/DB smoke checks
```
