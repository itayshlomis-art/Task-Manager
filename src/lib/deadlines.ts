import { getSupabase } from "./supabase";
import type { UrgencyKey } from "./constants";

// מועדי דיווח רגולטוריים חודשיים בישראל (יום היעד בחודש)
export type DeadlineDef = {
  key: string;
  title: string;
  dueDay: number;        // היום בחודש שבו הדדליין
  urgency: UrgencyKey;
  description: string;
};

export const DEADLINES: DeadlineDef[] = [
  { key: "vat",        title: "דיווח ותשלום מע\"מ",        dueDay: 15, urgency: "urgent",    description: "דיווח תקופתי למע\"מ" },
  { key: "advances",   title: "מקדמות מס הכנסה",           dueDay: 15, urgency: "important", description: "תשלום מקדמות מס הכנסה" },
  { key: "withholding",title: "ניכויים – טופס 102",        dueDay: 15, urgency: "important", description: "דיווח ניכויים ממשכורות" },
  { key: "bituach",    title: "ביטוח לאומי",               dueDay: 15, urgency: "important", description: "תשלום דמי ביטוח לאומי" },
];

// חישוב תאריך היעד עבור חודש נתון ('YYYY-MM')
export function deadlineDate(month: string, dueDay: number): string {
  const [y, m] = month.split("-").map(Number);
  const day = String(dueDay).padStart(2, "0");
  return `${y}-${String(m).padStart(2, "0")}-${day}`;
}

// יצירת משימות למועדי הדיווח שנבחרו, עבור הלקוחות שנבחרו
// מדלג על משימות שכבר קיימות (אותו לקוח + אותה כותרת + אותו תאריך יעד)
export async function generateDeadlineTasks(opts: {
  month: string;
  clientIds: string[];
  deadlineKeys: string[];
  ownerByClient: Record<string, string | null>;
  createdBy: string;
}) {
  const supabase = getSupabase();
  const { month, clientIds, deadlineKeys, ownerByClient, createdBy } = opts;
  const defs = DEADLINES.filter((d) => deadlineKeys.includes(d.key));

  // משימות קיימות באותו תאריך יעד כדי למנוע כפילויות
  const { data: existing } = await supabase
    .from("tasks")
    .select("title,client_id,due_date")
    .in("client_id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]);
  const seen = new Set(((existing as { title: string; client_id: string; due_date: string }[]) ?? []).map((t) => `${t.client_id}|${t.title}|${t.due_date}`));

  const rows: Record<string, unknown>[] = [];
  for (const clientId of clientIds) {
    for (const d of defs) {
      const due = deadlineDate(month, d.dueDay);
      const title = `${d.title} – ${month.split("-")[1]}/${month.split("-")[0]}`;
      if (seen.has(`${clientId}|${title}|${due}`)) continue;
      rows.push({
        title,
        description: d.description,
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
    const notifs = created.filter((r) => r.owner_id).map((r) => ({
      user_id: r.owner_id, task_id: r.id, type: "assigned", message: `הוקצתה לך משימת דיווח: ${r.title}`,
    }));
    if (notifs.length) await supabase.from("notifications").insert(notifs);
  }

  return { created: rows.length };
}
