import { getSupabase } from "./supabase";
import type { Process, ProcessTemplateTask } from "./types";

// יצירת מופע תהליך ללקוח + כל המשימות מהתבנית
// isDraft=true יוצר את המשימות כטיוטות לאישור; אחרת כמשימות פעילות
export async function addProcessToClient(opts: {
  clientId: string;
  process: Process;
  ownerId: string | null;
  createdBy: string;
  isDraft: boolean;
}) {
  const supabase = getSupabase();
  const { clientId, process, ownerId, createdBy, isDraft } = opts;

  // 1. יצירת מופע התהליך
  const { data: cp, error: cpErr } = await supabase
    .from("client_processes")
    .insert({
      client_id: clientId,
      process_id: process.id,
      process_name: process.name,
      status: "active",
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (cpErr) throw cpErr;
  const clientProcessId = (cp as { id: string }).id;

  // 2. שליפת משימות התבנית
  const { data: templates } = await supabase
    .from("process_template_tasks")
    .select("*")
    .eq("process_id", process.id)
    .order("order_index");
  const tmpl = (templates as ProcessTemplateTask[]) ?? [];

  // 3. יצירת המשימות
  const today = new Date();
  const rows = tmpl.map((t) => {
    const due = new Date(today);
    due.setDate(due.getDate() + (t.deadline_offset_days ?? 0));
    return {
      title: t.title,
      description: t.description ?? "",
      client_id: clientId,
      process_id: process.id,
      client_process_id: clientProcessId,
      owner_id: ownerId,
      urgency: t.default_urgency,
      status: "not_started",
      estimated_minutes: t.default_estimated_minutes,
      due_date: due.toISOString().slice(0, 10),
      is_draft: isDraft,
      created_by: createdBy,
      updated_by: createdBy,
    };
  });

  if (rows.length > 0) {
    const { data: created, error: tErr } = await supabase.from("tasks").insert(rows).select("id");
    if (tErr) throw tErr;

    // 4. היסטוריה + התראה לאחראי (רק אם פעיל)
    const ids = (created as { id: string }[]) ?? [];
    if (ids.length) {
      await supabase.from("task_history").insert(
        ids.map((r) => ({
          task_id: r.id, changed_by: createdBy, action_type: "created",
          note: `נוצרה מתהליך: ${process.name}${isDraft ? " (טיוטה)" : ""}`,
        }))
      );
      if (ownerId && !isDraft) {
        await supabase.from("notifications").insert(
          ids.map((r) => ({
            user_id: ownerId, task_id: r.id, type: "assigned",
            message: `הוקצתה לך משימה מתהליך "${process.name}"`,
          }))
        );
      }
    }
  }

  return { clientProcessId, count: rows.length };
}
