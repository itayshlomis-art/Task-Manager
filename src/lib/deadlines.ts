import { getSupabase } from "./supabase";
import type { UrgencyKey } from "./constants";

// מועד דיווח (נשמר בטבלת deadline_definitions וניתן לעריכה)
export type DeadlineDef = {
  id: string;
  title: string;
  due_day: number;
  urgency: UrgencyKey;
  description: string | null;
  order_index: number;
  is_active: boolean;
};

// טעינת המועדים הפעילים
export async function loadDeadlines(): Promise<DeadlineDef[]> {
  const { data } = await getSupabase()
    .from("deadline_definitions")
    .select("*")
    .eq("is_active", true)
    .order("order_index");
  return (data as DeadlineDef[]) ?? [];
}

// חישוב תאריך היעד עבור חודש נתון ('YYYY-MM')
export function deadlineDate(month: string, dueDay: number): string {
  const [y, m] = month.split("-").map(Number);
  const day = String(dueDay).padStart(2, "0");
  return `${y}-${String(m).padStart(2, "0")}-${day}`;
}

// יצירת משימות למועדי הדיווח שנבחרו, עבור הלקוחות שנבחרו
export async function generateDeadlineTasks(opts: {
  month: string;
  clientIds: string[];
  deadlines: DeadlineDef[];
  ownerByClient: Record<string, string | null>;
  createdBy: string;
}) {
  const supabase = getSupabase();
  const { month, clientIds, deadlines, ownerByClient, createdBy } = opts;

  const { data: existing } = await supabase
    .from("tasks")
    .select("title,client_id,due_date")
    .in("client_id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]);
  const seen = new Set(
    ((existing as { title: string; client_id: string; due_date: string }[]) ?? []).map(
      (t) => `${t.client_id}|${t.title}|${t.due_date}`
    )
  );

  const rows: Record<string, unknown>[] = [];
  for (const clientId of clientIds) {
    for (const d of deadlines) {
      const due = deadlineDate(month, d.due_day);
      const title = `${d.title} – ${month.split("-")[1]}/${month.split("-")[0]}`;
      if (seen.has(`${clientId}|${title}|${due}`)) continue;
      rows.push({
        title,
        description: d.description ?? "",
        client_id: clientId,
        owner_id: ownerByClient[clientId] ?? null,
        urgency: d.urgency,
        status: "not_started",
        due_date: due,
        is_draft: false,
        created_by: createdBy,
        updated_by: createdBy,
      });
    }
  }

  if (rows.length === 0) return { created: 0 };
  const { data, error } = await supabase.from("tasks").insert(rows).select("id,owner_id,title");
  if (error) throw error;

  const created = (data as { id: string; owner_id: string | null; title: string }[]) ?? [];
  if (created.length) {
    await supabase.from("task_history").insert(
      created.map((r) => ({ task_id: r.id, changed_by: createdBy, action_type: "created", note: "נוצרה ממועדי דיווח" }))
    );
    const notifs = created
      .filter((r) => r.owner_id)
      .map((r) => ({ user_id: r.owner_id, task_id: r.id, type: "assigned", message: `הוקצתה לך משימת דיווח: ${r.title}` }));
    if (notifs.length) await supabase.from("notifications").insert(notifs);
  }

  return { created: rows.length };
}
