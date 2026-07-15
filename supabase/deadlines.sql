-- =====================================================================
--  מועדי דיווח ניתנים לעריכה — הרץ ב-Supabase → SQL Editor → Run
-- =====================================================================

create table if not exists deadline_definitions (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  due_day      integer not null default 15,      -- היום בחודש
  urgency      urgency_level not null default 'important',
  description  text default '',
  order_index  integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table deadline_definitions enable row level security;
drop policy if exists "auth_all" on deadline_definitions;
create policy "auth_all" on deadline_definitions for all to authenticated using (true) with check (true);
grant all on deadline_definitions to anon, authenticated, service_role;

-- מועדי ברירת מחדל (רק אם הטבלה ריקה)
insert into deadline_definitions (title, due_day, urgency, description, order_index)
select * from (values
  ('דיווח ותשלום מע"מ', 15, 'urgent'::urgency_level,    'דיווח תקופתי למע"מ',        1),
  ('מקדמות מס הכנסה',   15, 'important'::urgency_level, 'תשלום מקדמות מס הכנסה',     2),
  ('ניכויים – טופס 102', 15, 'important'::urgency_level, 'דיווח ניכויים ממשכורות',   3),
  ('ביטוח לאומי',        15, 'important'::urgency_level, 'תשלום דמי ביטוח לאומי',    4)
) as v(title, due_day, urgency, description, order_index)
where not exists (select 1 from deadline_definitions);
