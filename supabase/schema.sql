-- =====================================================================
--  מערכת ניהול משימות - רף גבוה
--  Supabase / PostgreSQL schema
--  הרץ את כל הקובץ הזה ב-Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type user_role   as enum ('admin', 'manager', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type client_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type urgency_level as enum ('urgent', 'important', 'routine');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('not_started', 'in_progress', 'waiting_external', 'done');
exception when duplicate_object then null; end $$;

-- =====================================================================
--  Tables
-- =====================================================================

-- ---------- אנשי צוות (מחובר ל-Supabase Auth) ----------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  job_title   text default '',
  email       text not null,
  is_active   boolean not null default true,
  role        user_role not null default 'member',
  created_at  timestamptz not null default now()
);

-- ---------- לקוחות ----------
create table if not exists clients (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  contact_name        text default '',
  phone               text default '',
  email               text default '',
  status              client_status not null default 'active',
  account_manager_id  uuid references profiles(id) on delete set null,
  notes               text default '',
  created_at          timestamptz not null default now()
);

-- ---------- תבניות תהליכים ----------
create table if not exists processes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- משימות קבועות בכל תבנית ----------
create table if not exists process_template_tasks (
  id                      uuid primary key default gen_random_uuid(),
  process_id              uuid not null references processes(id) on delete cascade,
  title                   text not null,
  description             text default '',
  default_urgency         urgency_level not null default 'routine',
  default_estimated_minutes integer default 60,
  deadline_offset_days    integer default 0,   -- כמה ימים מהיום להצמדת דדליין
  order_index             integer not null default 0
);

-- ---------- מופע של תהליך שהוצמד ללקוח ----------
create table if not exists client_processes (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  process_id  uuid references processes(id) on delete set null,
  process_name text not null default '',   -- שם מוקפא לשמירה היסטורית
  status      text not null default 'active',
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------- משימות (הטבלה המרכזית) ----------
create table if not exists tasks (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text default '',

  client_id           uuid references clients(id) on delete set null,
  process_id          uuid references processes(id) on delete set null,
  client_process_id   uuid references client_processes(id) on delete set null,

  owner_id            uuid references profiles(id) on delete set null,   -- אחראי ראשי

  urgency             urgency_level not null default 'routine',
  status              task_status not null default 'not_started',

  estimated_minutes   integer,
  due_date            date,
  planned_time        time,
  notes               text default '',

  is_draft            boolean not null default false,

  -- שדות סטטוס "בטיפול"
  status_note         text default '',
  next_due_date       date,

  -- שדות סטטוס "ממתין לגורם חיצוני"
  waiting_for         text default '',
  waiting_missing     text default '',
  waiting_recheck_date date,

  -- שדות סטטוס "בוצע"
  completed_at        timestamptz,
  completed_by        uuid references profiles(id) on delete set null,
  closing_note        text default '',

  -- מטא
  created_at          timestamptz not null default now(),
  created_by          uuid references profiles(id) on delete set null,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references profiles(id) on delete set null,

  -- הכנה עתידית ל-Google Calendar (ריק בשלב 1)
  google_calendar_event_id text
);

-- ---------- משתתפים נוספים במשימה ----------
create table if not exists task_participants (
  task_id   uuid not null references tasks(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

-- ---------- היסטוריית שינויים מלאה ----------
create table if not exists task_history (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  changed_by   uuid references profiles(id) on delete set null,
  changed_at   timestamptz not null default now(),
  action_type  text not null,          -- created | status_change | deadline_change | owner_change | note_added | completed | updated
  field_name   text default '',
  old_value    text default '',
  new_value    text default '',
  note         text default ''
);

-- ---------- התראות פנימיות ----------
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  task_id     uuid references tasks(id) on delete cascade,
  type        text not null default 'assigned',   -- assigned | overdue | status
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- =====================================================================
--  Indexes
-- =====================================================================
create index if not exists idx_tasks_owner   on tasks(owner_id);
create index if not exists idx_tasks_client  on tasks(client_id);
create index if not exists idx_tasks_status  on tasks(status);
create index if not exists idx_tasks_due      on tasks(due_date);
create index if not exists idx_tasks_urgency  on tasks(urgency);
create index if not exists idx_history_task    on task_history(task_id);
create index if not exists idx_notif_user      on notifications(user_id);
create index if not exists idx_ptt_process     on process_template_tasks(process_id);

-- =====================================================================
--  Trigger: יצירת פרופיל אוטומטית כשמשתמש חדש נרשם ב-Auth
-- =====================================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''), '@', 1)),
    -- המשתמש הראשון במערכת הופך אוטומטית למנהל מערכת
    case when (select count(*) from public.profiles) = 0 then 'admin'::user_role
         else 'member'::user_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
--  Trigger: תיעוד אוטומטי של שינויים משמעותיים בהיסטוריה
--  (רשת ביטחון - נרשם גם מצד האפליקציה, אבל כאן מובטח שלא יאבד מידע)
-- =====================================================================
create or replace function log_task_changes()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  if new.status is distinct from old.status then
    insert into task_history(task_id, changed_by, action_type, field_name, old_value, new_value)
    values (new.id, new.updated_by, 'status_change', 'status', old.status::text, new.status::text);
  end if;

  if new.due_date is distinct from old.due_date then
    insert into task_history(task_id, changed_by, action_type, field_name, old_value, new_value)
    values (new.id, new.updated_by, 'deadline_change', 'due_date',
            coalesce(old.due_date::text,''), coalesce(new.due_date::text,''));
  end if;

  if new.owner_id is distinct from old.owner_id then
    insert into task_history(task_id, changed_by, action_type, field_name, old_value, new_value)
    values (new.id, new.updated_by, 'owner_change', 'owner_id',
            coalesce(old.owner_id::text,''), coalesce(new.owner_id::text,''));
  end if;

  return new;
end;
$$;

drop trigger if exists on_task_updated on tasks;
create trigger on_task_updated
  before update on tasks
  for each row execute function log_task_changes();

-- =====================================================================
--  RLS (הרשאות בסיסיות ל-MVP: כל משתמש מחובר יכול לקרוא/לכתוב)
--  הידוק ברמת תפקידים ייעשה בשלב 2.
-- =====================================================================
alter table profiles               enable row level security;
alter table clients                enable row level security;
alter table processes              enable row level security;
alter table process_template_tasks enable row level security;
alter table client_processes       enable row level security;
alter table tasks                  enable row level security;
alter table task_participants      enable row level security;
alter table task_history           enable row level security;
alter table notifications          enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','clients','processes','process_template_tasks',
    'client_processes','tasks','task_participants','task_history','notifications'
  ] loop
    execute format('drop policy if exists "auth_all" on %I;', t);
    execute format(
      'create policy "auth_all" on %I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- =====================================================================
--  Seed: תבניות תהליכים קבועות + משימות ברירת מחדל
-- =====================================================================
insert into processes (id, name, description) values
  ('11111111-1111-1111-1111-111111111111', 'הקמת לקוח חדש', 'תהליך קליטה מלא של לקוח חדש'),
  ('22222222-2222-2222-2222-222222222222', 'ניהול כספים חודשי', 'סגירת חודש שוטפת'),
  ('33333333-3333-3333-3333-333333333333', 'הכנה לדוח פיננסי', 'איסוף והכנת נתונים לדוח'),
  ('44444444-4444-4444-4444-444444444444', 'תהליך גבייה', 'מעקב וגבייה מלקוחות'),
  ('55555555-5555-5555-5555-555555555555', 'בניית תחזית', 'הכנת תחזית פיננסית'),
  ('66666666-6666-6666-6666-666666666666', 'פגישת סיכום חודש', 'הכנה וקיום פגישת סיכום'),
  ('77777777-7777-7777-7777-777777777777', 'תהליך פנימי של החברה', 'משימות פנים-ארגוניות')
on conflict (id) do nothing;

insert into process_template_tasks (process_id, title, default_urgency, deadline_offset_days, order_index) values
  ('11111111-1111-1111-1111-111111111111', 'איסוף מסמכי התאגדות', 'important', 2, 1),
  ('11111111-1111-1111-1111-111111111111', 'פתיחת כרטיס לקוח במערכת', 'important', 1, 2),
  ('11111111-1111-1111-1111-111111111111', 'חתימה על הסכם התקשרות', 'urgent', 3, 3),
  ('11111111-1111-1111-1111-111111111111', 'פגישת היכרות ראשונית', 'routine', 5, 4),

  ('22222222-2222-2222-2222-222222222222', 'קליטת חשבוניות החודש', 'important', 5, 1),
  ('22222222-2222-2222-2222-222222222222', 'התאמת בנקים', 'important', 7, 2),
  ('22222222-2222-2222-2222-222222222222', 'הפקת דוח הנהח"ש', 'routine', 10, 3),

  ('33333333-3333-3333-3333-333333333333', 'איסוף נתונים פיננסיים', 'important', 3, 1),
  ('33333333-3333-3333-3333-333333333333', 'בדיקת נתונים ואימות', 'important', 5, 2),
  ('33333333-3333-3333-3333-333333333333', 'הפקת הדוח הפיננסי', 'urgent', 7, 3),

  ('44444444-4444-4444-4444-444444444444', 'הפקת דוח חובות פתוחים', 'important', 1, 1),
  ('44444444-4444-4444-4444-444444444444', 'שליחת תזכורת ללקוחות', 'important', 2, 2),
  ('44444444-4444-4444-4444-444444444444', 'שיחת גבייה טלפונית', 'urgent', 4, 3),

  ('55555555-5555-5555-5555-555555555555', 'איסוף הנחות יסוד', 'routine', 3, 1),
  ('55555555-5555-5555-5555-555555555555', 'בניית מודל תחזית', 'important', 7, 2),

  ('66666666-6666-6666-6666-666666666666', 'הכנת מצגת סיכום', 'important', 2, 1),
  ('66666666-6666-6666-6666-666666666666', 'תיאום מועד פגישה', 'routine', 1, 2),
  ('66666666-6666-6666-6666-666666666666', 'קיום הפגישה', 'urgent', 5, 3),

  ('77777777-7777-7777-7777-777777777777', 'משימה פנימית לדוגמה', 'routine', 3, 1)
on conflict do nothing;

-- הרשאות סכמה ל-Supabase roles
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
