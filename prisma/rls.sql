-- Enable Row Level Security on all public tables.
--
-- The app never queries these tables through Supabase's PostgREST API — all
-- reads/writes go through Prisma (Server Actions) using DATABASE_URL, whose
-- role owns the tables and therefore bypasses RLS automatically. Without
-- this, the tables are readable/writable by anyone via the public REST API
-- using the anon key baked into client JS (NEXT_PUBLIC_SUPABASE_ANON_KEY).
-- No policies are added on purpose: RLS enabled + zero policies = deny all
-- to non-owner roles (anon/authenticated), which is exactly what we want.
alter table "User" enable row level security;
alter table "DailyCounter" enable row level security;
alter table "Complaint" enable row level security;
alter table "Attachment" enable row level security;
alter table "StatusEvent" enable row level security;
alter table "InternalNote" enable row level security;
