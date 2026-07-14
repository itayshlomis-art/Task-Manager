-- =====================================================================
--  מודול חשבוניות — הרץ ב-Supabase → SQL Editor → Run
--  יוצר טבלת חשבוניות + bucket אחסון פרטי + הרשאות
-- =====================================================================

-- ---------- טבלת חשבוניות ----------
create table if not exists invoices (
  id           uuid primary key default gen_random_uuid(),
  month        text not null,                 -- 'YYYY-MM'
  description  text default '',               -- שם ספק / תיאור
  client_id    uuid references clients(id) on delete set null,
  amount       numeric,                       -- סכום החשבונית
  file_name    text default '',
  file_path    text default '',               -- נתיב הקובץ ב-Storage
  notes        text default '',
  uploaded_by  uuid references profiles(id) on delete set null,
  uploaded_at  timestamptz not null default now()
);

create index if not exists idx_invoices_month  on invoices(month);
create index if not exists idx_invoices_client on invoices(client_id);

alter table invoices enable row level security;
drop policy if exists "auth_all" on invoices;
create policy "auth_all" on invoices for all to authenticated using (true) with check (true);

grant all on invoices to anon, authenticated, service_role;

-- ---------- Bucket אחסון פרטי לחשבוניות ----------
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- ---------- הרשאות Storage (משתמש מחובר יכול להעלות/לצפות/למחוק) ----------
drop policy if exists "invoices_read"   on storage.objects;
drop policy if exists "invoices_insert" on storage.objects;
drop policy if exists "invoices_delete" on storage.objects;

create policy "invoices_read"   on storage.objects for select to authenticated using (bucket_id = 'invoices');
create policy "invoices_insert" on storage.objects for insert to authenticated with check (bucket_id = 'invoices');
create policy "invoices_delete" on storage.objects for delete to authenticated using (bucket_id = 'invoices');
