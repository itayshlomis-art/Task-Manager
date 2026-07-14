// טיפוסי נתונים בסיסיים התואמים לסכמה ב-Supabase

import type { UrgencyKey, StatusKey, RoleKey } from "./constants";

export type Profile = {
  id: string;
  full_name: string;
  job_title: string | null;
  email: string;
  is_active: boolean;
  role: RoleKey;
  created_at: string;
};

export type Client = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  status: "active" | "inactive";
  account_manager_id: string | null;
  notes: string | null;
  created_at: string;
};

export type Process = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export type ProcessTemplateTask = {
  id: string;
  process_id: string;
  title: string;
  description: string | null;
  default_urgency: UrgencyKey;
  default_estimated_minutes: number | null;
  deadline_offset_days: number | null;
  order_index: number;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  process_id: string | null;
  client_process_id: string | null;
  owner_id: string | null;
  urgency: UrgencyKey;
  status: StatusKey;
  estimated_minutes: number | null;
  due_date: string | null;
  planned_time: string | null;
  notes: string | null;
  is_draft: boolean;
  status_note: string | null;
  next_due_date: string | null;
  waiting_for: string | null;
  waiting_missing: string | null;
  waiting_recheck_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  closing_note: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  google_calendar_event_id: string | null;
};

export type TaskWithRelations = Task & {
  client?: Pick<Client, "id" | "name"> | null;
  owner?: Pick<Profile, "id" | "full_name"> | null;
};

export type Invoice = {
  id: string;
  month: string; // 'YYYY-MM'
  description: string | null;
  client_id: string | null;
  amount: number | null;
  file_name: string | null;
  file_path: string | null;
  notes: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type TaskHistory = {
  id: string;
  task_id: string;
  changed_by: string | null;
  changed_at: string;
  action_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
};
