# Design.md — Premier Energies Customer Service Portal

UI/UX reference for the three public-facing pages: **Landing (`/`)**, **Raise a
complaint (`/complaint/new`)**, and **Track (`/track`)**. Everything here reflects
what is actually in the code — tokens live in `src/app/globals.css` (`@theme`),
shared primitives in `src/components/ui.tsx`, icons in `src/components/icons.tsx`.

Design direction: **Editorial flat** on the Premier Energies brand — a white canvas,
hairline-bordered rounded cards with **no** shadows, **Bebas Neue** condensed all-caps
display headings over **Montserrat** body text, fully rounded **pill** controls, and
brand **green as the single action color**. Line-icons (no emoji), mobile-first,
WCAG 2.2 AA. (Imported from the Claude Design "Portal – Redesign"; the landing hero
comes from the "solar-hero" design.)

---

## 1. Foundations (design tokens)

### 1.1 Color palette

All colors are CSS variables under `@theme`, exposed as Tailwind utilities
(`text-pe-blue`, `bg-pe-green`, `border-line`, …).

**Brand**
| Token | Hex | Usage |
|---|---|---|
| `pe-blue` | `#2461ac` | Links, focus rings, icon circles, "next"/info accents |
| `pe-blue-dark` | `#1c5187` | (reserved) |
| `pe-green` | `#65bc46` | **All primary actions/CTAs**, "done" states, accents |
| `pe-green-dark` | `#4e9e35` | Green button hover, resolved status |
| `pe-navy` | `#154074` | All headings (h1–h3), ticket IDs, section titles |

**Neutrals**
| Token | Hex | Usage |
|---|---|---|
| `ink` | `#16232e` | Body text, input text |
| `muted` | `#5b6b7b` | Secondary text, hints, placeholders (`/60`) |
| `surface` | `#f5f5f5` | Inset sub-panels, dropzones, rail track, disabled inputs |
| `card` | `#ffffff` | Card surfaces, header bar |
| `line` | `#e5e5e5` | Card borders, dividers, hairlines |
| `input` | `#c4c4c4` | Input/segmented/ghost-button borders (darker than `line`) |

> The **page background is white** (`body { background:#fff }`), set directly — not via
> `surface`. Cards are white too, so separation comes from the `line` border, never a
> shadow. `surface` (`#f5f5f5`) is now only for *inset* fills.
> **Exception — `/complaint/new`:** a light-blue **sky** (`#dbe9f6`) with two layers of
> slow-drifting white **clouds** — CSS radial-gradient puffs on
> `body:has(.complaint-page)::before/::after`, animated with `transform: translate3d`
> (GPU-composited, oversized fixed layers) so it never repaints. Scoped to that page only.

**Status** (each paired with a tinted bg + `/30` border on the badge)
| Token | Hex | Status |
|---|---|---|
| `status-submitted` | `#2461ac` | Submitted (blue) |
| `status-review` | `#b45309` | Under Review (amber) |
| `status-progress` | `#6d28d9` | In Progress (violet) |
| `status-resolved` | `#4e9e35` | Resolved (green) |
| `status-rejected` | `#dc2626` | Rejected, all error text, required `*` |

### 1.2 Gradients

No system-wide brand bar anymore (the old header accent line is gone). The **only**
gradient is the **landing hero scrim** (`.hero__scrim` in `globals.css`): a horizontal
navy wash over the photo,
`linear-gradient(100deg, rgba(13,36,64,.92) → 0)`, keeping the left copy legible and
letting the panels show through on the right. On mobile it swaps to a vertical
`180deg` wash. Everything else is flat.

### 1.3 Typography

- **Display** (`--font-display` → **Bebas Neue**, `--font-bebas`, weight 400): applied
  globally to `h1,h2,h3`. Bebas is a **caps-only** face, so every heading renders
  uppercase automatically — global rule adds `letter-spacing:1.5px`, `line-height:1`,
  `color:pe-navy`, `text-wrap:balance`.
- **Body** (`--font-sans` → **Montserrat**, `--font-montserrat`): all UI text, inputs,
  buttons, labels. Fallback: `ui-sans-serif, system-ui, sans-serif`.
- **Mono** (`--font-mono` → Geist Mono) unchanged. All fonts via `next/font` (no
  external request), declared in `src/app/layout.tsx`.
- **Tabular numerals:** `.tnum` on every Complaint ID, serial, capacity, count, and
  step number so digits align.

**Type scale in use**
| Role | Classes |
|---|---|
| Hero title | `.hero__title` — Bebas, 56px desktop / 44px mobile, white |
| Page title (form/track) | `text-2xl sm:text-3xl` (Bebas) |
| Section title (form) | `text-2xl text-pe-navy` (Bebas) |
| Card sub-heading | `text-xl text-pe-navy` (Bebas) |
| Eyebrow / "Step N" / label caps | `text-[11px] font-semibold uppercase tracking-widest` |
| Body | `text-sm` / `text-base leading-relaxed` |
| Field label | `text-sm font-semibold text-ink` |
| Hint & meta | `text-xs text-muted` |
| Ticket ID (success) | `text-2xl tnum text-pe-navy` |

### 1.4 Radius, shadow, spacing, motion

- **Radius:** `--radius-card: 8px` (→ `rounded-card`) for **inputs and small controls**.
  Cards use `rounded-[28px]`; inset sub-panels use `rounded-2xl` (16px); all buttons,
  segmented options, and badges are `rounded-full` **pills**.
- **Shadow:** cards are **flat** (border only), with two deliberate exceptions —
  `shadow-soft-lg` lifts the landing hero banner, and `shadow-soft` lifts the big
  container card on `/complaint/new`.
- **Spacing rhythm:** page gutter `px-4`; widths `max-w-6xl` (shell) / `max-w-4xl`
  (complaint form) / `max-w-2xl` (track). Vertical page padding `py-10`. Card padding
  `p-7`. Section stacking `gap-5`; field grids `gap-4`.
- **Motion:** `transition`/`transition-colors` on interactive elements; buttons press
  with `active:translate-y-px`. The landing hero has a pointer/idle **parallax**
  (`hero.tsx`); `/complaint/new` has the **cloud drift** (§1.1). A global
  `prefers-reduced-motion: reduce` block collapses all animation/transition/scroll to
  ~0ms (freezing the clouds; the hero parallax also opts out).

### 1.5 Shared components

| Component | Anatomy |
|---|---|
| `btnPrimary` | **Green pill** — `bg-pe-green`, white, `rounded-full`, `px-7 py-3.5`, `text-xs uppercase tracking-wider font-semibold`, hover→`pe-green-dark`, ring `pe-green/40`. The primary CTA everywhere. |
| `btnGreen` | Alias of `btnPrimary`. |
| `btnGhost` | **Outline pill** — transparent, `border-input`, `text-pe-navy`, same pill shape + caps; hover→`border-pe-navy`. Secondary actions (Unlock, Download). |
| `inputCls` | Full-width, `border-input`, `rounded-card` (8px), `px-3.5 py-2.5`, focus `border-pe-blue` + ring `pe-blue/20`, disabled→`bg-surface` |
| `Card` | White, `border-line`, `rounded-[28px]`, `p-7`, **no shadow**. Optional `id` (used for scroll targets). |
| `Field` | Label `text-sm font-semibold` (+ red `*` if required) → control → hint (`muted`) **or** error (`status-rejected`), swapped |
| `Alert` | `error` (red-50), `success` (green-50), `info` (blue-50); tinted bg + `/30` border |
| `StatusBadge` | `rounded-full` pill, **leading status-colored dot**, uppercase, status-tinted bg + border + text |
| Icons | Line-icons, `viewBox 24`, `stroke currentColor`, `strokeWidth 1.75` — color/size via className |

---

## 2. Shell (applies to all public pages)

`(public)/layout.tsx` wraps every public page:

- **SiteHeader** — **sticky** (`top-0 z-40`), white bar, `h-14`, `max-w-6xl`. Left:
  `logo.png` (148×40) + a `border-l` divider + "**CUSTOMER SERVICE PORTAL · SOLAR
  MODULES**" (uppercase `text-base font-semibold`; the suffix in `pe-green`; hidden on
  mobile). Right: a single borderless **HOME** link (`text-sm` caps, hover→`pe-green`) →
  `/`, **hidden on the landing page itself** (`body:has(.hero) .header-home`). No other nav.
- **No customer accounts** (removed 2026-07-22): no Register / Login / customer Dashboard.
  Staff sign in separately at `/admin/login`; nothing in the public shell links to auth.
- **Main:** `max-w-6xl w-full flex-1 px-4 py-10` (goes full-bleed on the landing hero via
  `has-[.hero]`).
- **SiteFooter** below — copyright + after-sales line, `text-xs text-muted`; **hidden on
  the landing page**, which overlays its own copyright on the hero.

---

## 3. Landing — `/`

**Purpose:** one full-screen hero that routes visitors to file or track, no account
needed. Source: `src/app/(public)/page.tsx` renders only `SolarHero`
(`src/app/(public)/hero.tsx`, client, for the parallax).

**Full-bleed hero** (`.hero` in `globals.css`) — fills the whole viewport between the
header and the overlaid footer (flexbox: `main` `flex-1` → `.hero` `flex:1`), navy base
`#0d2440`, **no radius/shadow** (edge-to-edge):
- A **photo-parallax** background (`/solar-hero.webp`, `inset:-120px`) + the navy scrim
  (§1.2). Two depth layers (`data-depth` bg 90 / copy 18) drift subtly with the pointer
  and, at rest, on a gentle idle sine loop; disabled under reduced-motion.
- Copy (left ~46%): eyebrow "Premier Energies · Solar Modules" (`#7fd15f`), Bebas H1
  "SOLAR MODULE SUPPORT" (white, 56/44px), a lede, then **stacked** buttons **Raise a
  complaint** (green pill → `/complaint/new`) + **Track a complaint** (white ghost pill →
  `/track`).
- **Overlaid footer** pinned to the hero bottom: `© … Premier Energies …` + "After-sales
  support for solar PV modules." in translucent white — replaces the shared white footer
  here.

The old check-status card and three-up feature row were removed — landing is hero-only.

**Responsive:** hero copy goes full-width and the scrim turns vertical.

---

## 4. Raise a complaint — `/complaint/new`

**Purpose:** one-page, low-friction, **always-anonymous** complaint capture (no login).
Source: `wizard.tsx` (client) + `uploads.tsx`.

**Page background:** light-blue **sky** (`#dbe9f6`) with two layers of slow-drifting
white **clouds** (§1.1) behind everything.

**Container:** `mx-auto max-w-4xl`. Centered header **outside** the card: Bebas H1
"FILL IN THE DETAILS BELOW TO RAISE A COMPLAINT." + a `text-sm text-muted` line
"Fields marked * are mandatory." (the `*` in `status-rejected`).

**Big container card:** one white box (`rounded-[28px]`, `border-line`, **`shadow-soft`**,
`p-5 sm:p-7`) wraps the rail + all sections + confirm + submit. The white section cards
sit on it; the form content is inset `sm:px-6`.

**Progress rail** (top of the big card, **not sticky** — a header strip with `border-b`):
five numbered nodes **Customer details → Site → Module → Defect → Evidence** joined by
connectors. `railDotCls`: **done** = green with `IconCheck`; **lit** = white with a
`pe-blue` ring + navy number; **idle** = `bg-surface` + `border-input`. **Exactly one node
is lit** — `hovered ?? active`, where `active` is the scroll-spy section and mouse
`hovered` overrides it; hovering also **pops** the node (`group-hover:scale-110`). Clicking
smooth-scrolls to that section. (The old green % progress bar was removed.)

**Structure — five stacked section Cards** (one scrolling page). Each `<Section>` is a
white `Card` (`scroll-mt-36`) with a header: a **48px green icon circle**
(`bg-pe-green/10 text-pe-green`, all sections) + a **"STEP N"** eyebrow + Bebas title
(`text-2xl`), divided by `border-b pb-4`. (No right-aligned subtitle text.)

| # | Section | Icon | Contents |
|---|---|---|---|
| 1 | **Customer details** | `IconUser` | Full name*, Email*, Mobile*, Alternate |
| 2 | **Site details** | `IconMapPin` | Site address* (textarea), Invoice #*, Capacity, Grid type (segmented), Commissioned date, Invoice upload |
| 3 | **Module details** | `IconGrid` | Serial numbers* (repeatable rows), Model, Wp rating, Defective qty |
| 4 | **Defect report** | `IconAlert` | Defect type* (radio-cards) → toggled sub-panel (Technical vs Transit) → Description* |
| 5 | **Evidence** | `IconCamera` | Drag-drop dropzone + camera capture + thumbnail grid |

(*) = required (red `*`). Balanced required set: name + email + mobile, site address, ≥1
serial, invoice #, defect type, description (≥50 chars), ≥1 evidence image. Optional
fields carry **no** "Optional" tag (those labels were removed).

**Signature interaction patterns** (unchanged): segmented **pills** (native radios
`peer sr-only` → `peer-checked:border-pe-green peer-checked:bg-pe-green/10`), **defect
radio-cards** (`rounded-2xl`, `peer-checked:bg-pe-green/5`), **serial rows** (numbered
`tnum` badge, live `IconCheck` at ≥3 chars, round trash button, dashed "＋ Add" pill),
the inset `bg-surface rounded-2xl` **sub-panel**, `mode:"onTouched"` inline validation,
and silent `localStorage` **autosave** (cleared on success).

**Submit:** an accuracy-confirmation checkbox on `bg-surface rounded-2xl`, then a
**content-width, centered** green pill **Submit complaint** (`btnGreen self-center`, no
icon) with a green drop shadow (`shadow-pe-green/30`); on hover it **raises**
(`-translate-y-1.5`, larger shadow) while staying the same green (dark-green hover
suppressed via `hover:!bg-pe-green`). Disabled until confirmed.

**Success state** (replaces the form in place — no redirect): centered Card with a
`bg-pe-green/10` check-circle, Bebas "COMPLAINT REGISTERED", the **Complaint ID** big and
navy (`text-2xl tnum`), a "save this ID + unlock with email/phone" note, a 3-step
**"What happens next"** timeline, then **Download a copy** (`btnGhost`, client-side
`.txt`) + **Track this complaint** (`btnGreen` → `/track?id=`).

**Uploads:** dropzone is a `border-2 border-dashed` box that turns
`border-pe-green bg-green-50` on drag-over; a mobile-only camera button; image thumbnails
render, videos/files show a line-icon; each tile has a remove button. If storage is
unconfigured, an `info` Alert lets the user submit without attachments.

**Responsive:** field grids `sm:grid-cols-2`; rail labels hide below `sm`; serial rows,
dropzone, and thumbnail grid reflow.

---

## 5. Track — `/track`

**Purpose:** public status lookup by Complaint ID, with a privacy gate (email/phone
second factor) that unlocks full details for anonymous filers. Source:
`src/app/(public)/track/page.tsx` + `ComplaintDetail.tsx`.

**Container:** `mx-auto max-w-2xl`. Bebas H1 + lookup form (uppercase `tnum` input +
**Track** `btnPrimary`, GET to `/track`).

**States:**
1. **Unknown ID** → `error` Alert ("No complaint found with ID …").
2. **Locked** (ID valid, no/invalid second factor) — a Card showing:
   - Header: Complaint ID (`tnum text-lg text-pe-navy`) + `StatusBadge`.
   - A 2-col `dl`: Raised on · Defect type.
   - **Horizontal step tracker** — four nodes Submitted → Under Review → In Progress →
     Resolved: **reached** = green 34px circle with `IconCheck`; the **next** step = white
     with a `pe-blue` ring + number; **future** = `bg-surface border-input` number;
     connectors fill `pe-green` up to the current step. Rejected complaints instead show a
     red Alert with the reason.
   - **Unlock sub-section** (`border-t`): "See full details & evidence" + privacy hint; a
     generic `error` Alert on a failed attempt (no enumeration); and an **email or mobile**
     input (`?k=`) + **Unlock** (`btnGhost`).
3. **Unlocked** (second factor matches snapshot contact or linked account) → the full
   **`ComplaintDetail`** view.

**`ComplaintDetail` layout** (`flex flex-col gap-5`, reused by dashboard & admin):
- Header Card: Complaint ID + raised date + `StatusBadge`.
- **Status timeline** Card — vertical rail, each event a dot (last `pe-green`, or
  `status-rejected`) + label + timestamp + optional note.
- **Site / Module / Defect** Cards — two-column `dl` rows; optional fields not provided
  render as "—".
- **Evidence** Card — a responsive gallery of signed-URL thumbnails (image / video /
  file); invoice copy shown under Site details.

**Responsive:** single-column, centered at `max-w-2xl`; tracker labels shrink; detail
`dl`s go single-column on phones.

---

## 6. Accessibility notes (WCAG 2.2 AA)

- All form controls use real `<label>`/`<input>`; icon-only buttons carry `aria-label`
  (rail jump, remove-serial, remove-file, camera).
- Custom radios (segmented pills, defect-cards) are **native radios** visually hidden
  with `sr-only`; selection and focus show via `peer-checked`/`peer-focus-visible` — never
  color alone (border + background + text all change).
- Focus is always visible — `focus:ring-2` in brand color on inputs, buttons, and the
  hero pills (`focus-visible`).
- Error text is `text-xs` in `status-rejected` **and** announced inline next to its
  field; the required marker is a red `*` plus `required`.
- Color contrast: `ink`/`muted` on white and white on `pe-green`/navy meet AA; status
  text sits on its tinted background at AA. (Bebas caps headings are large-text weight.)
- `prefers-reduced-motion` disables all transitions/animations globally and the hero
  parallax.
- Headings are ordered (single H1 per page, H2 sections).

---

## 7. File map

| Concern | File |
|---|---|
| Tokens (color/type/radius/shadow/hero CSS/motion) | `src/app/globals.css` |
| Font loading (Montserrat / Bebas Neue / Geist Mono) | `src/app/layout.tsx` |
| Buttons, inputs, Card, Field, Alert, StatusBadge | `src/components/ui.tsx` |
| Line-icon set | `src/components/icons.tsx` |
| Sticky header | `src/components/SiteHeader.tsx` |
| Landing | `src/app/(public)/page.tsx` |
| Landing hero (parallax, client) | `src/app/(public)/hero.tsx` |
| Raise a complaint (form + rail + success) | `src/app/(public)/complaint/new/wizard.tsx` |
| Upload widgets | `src/app/(public)/complaint/new/uploads.tsx` |
| Track + unlock | `src/app/(public)/track/page.tsx` |
| Full detail view (shared) | `src/components/ComplaintDetail.tsx` |
