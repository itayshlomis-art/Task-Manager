"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { URGENCY_OPTIONS, STATUS_OPTIONS, URGENCY, STATUS } from "@/lib/constants";
import type { UrgencyKey, StatusKey } from "@/lib/constants";
import type { Task, Client, Process, Profile, TaskHistory } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

type Props = {
  task: Task | null;
  clients: Client[];
  processes: Process[];
  profiles: Profile[];
  currentUserId: string;
  defaultClientId?: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function TaskDialog({ task, clients, processes, profiles, currentUserId, defaultClientId, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [clientId, setClientId] = useState(task?.client_id ?? defaultClientId ?? "");
  const [processId, setProcessId] = useState(task?.process_id ?? "");
  const [ownerId, setOwnerId] = useState(task?.owner_id ?? currentUserId);
  const [participants, setParticipants] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<UrgencyKey>(task?.urgency ?? "routine");
  const [status, setStatus] = useState<StatusKey>(task?.status ?? "not_started");
  const [estimated, setEstimated] = useState(task?.estimated_minutes?.toString() ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [plannedTime, setPlannedTime] = useState(task?.planned_time?.slice(0, 5) ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");

  const [statusNote, setStatusNote] = useState(task?.status_note ?? "");
  const [nextDueDate, setNextDueDate] = useState(task?.next_due_date ?? "");
  const [waitingFor, setWaitingFor] = useState(task?.waiting_for ?? "");
  const [waitingMissing, setWaitingMissing] = useState(task?.waiting_missing ?? "");
  const [waitingRecheck, setWaitingRecheck] = useState(task?.waiting_recheck_date ?? "");
  const [closingNote, setClosingNote] = useState(task?.closing_note ?? "");

  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    if (!task) return;
    const supabase = getSupabase();
    supabase.from("task_participants").select("user_id").eq("task_id", task.id).then(({ data }) => {
      setParticipants(((data as { user_id: string }[]) ?? []).map((r) => r.user_id));
    });
    supabase.from("task_history").select("*").eq("task_id", task.id).order("changed_at", { ascending: false }).then(({ data }) => {
      setHistory((data as TaskHistory[]) ?? []);
    });
  }, [task]);

  function toggleParticipant(id: string) {
    setParticipants((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function save() {
    setError("");
    if (!title.trim()) return setError("יש להזין כותרת למשימה");
    if (status === "in_progress" && (!statusNote.trim() || !nextDueDate))
      return setError("במעבר לסטטוס 'בטיפול' חובה להזין הערת טיפול ותאריך יעד הבא");
    if (status === "waiting_external" && (!waitingFor.trim() || !waitingMissing.trim() || !waitingRecheck))
      return setError("במעבר ל'ממתין לגורם חיצוני' חובה להזין: למי ממתינים, מה חסר, ומתי לבדוק שוב");
    if (status === "done" && task && task.owner_id && task.owner_id !== currentUserId)
      return setError("רק האחראי הראשי על המשימה יכול לסמן אותה כבוצעה");

    setSaving(true);
    const supabase = getSupabase();

    const payload: Record<string, unknown> = {
      title: title.trim(), description,
      client_id: clientId || null, process_id: processId || null,
      owner_id: ownerId || null, urgency, status,
      estimated_minutes: estimated ? parseInt(estimated) : null,
      due_date: dueDate || null, planned_time: plannedTime || null, notes,
      status_note: statusNote, next_due_date: nextDueDate || null,
      waiting_for: waitingFor, waiting_missing: waitingMissing,
      waiting_recheck_date: waitingRecheck || null, closing_note: closingNote,
      updated_by: currentUserId, updated_at: new Date().toISOString(),
    };
    if (status === "done") {
      payload.completed_at = task?.completed_at ?? new Date().toISOString();
      payload.completed_by = currentUserId;
    }

    try {
      let taskId: string;
      if (task) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
        if (error) throw error;
        taskId = task.id;
        if (status === "done" && task.status !== "done") {
          await supabase.from("task_history").insert({ task_id: taskId, changed_by: currentUserId, action_type: "completed", note: "המשימה סומנה כבוצעה" });
        }
      } else {
        payload.created_by = currentUserId;
        const { data, error } = await supabase.from("tasks").insert(payload).select("id").single();
        if (error) throw error;
        taskId = (data as { id: string }).id;
        await supabase.from("task_history").insert({ task_id: taskId, changed_by: currentUserId, action_type: "created", note: "המשימה נוצרה" });
        if (ownerId) {
          await supabase.from("notifications").insert({ user_id: ownerId, task_id: taskId, type: "assigned", message: `הוקצתה לך משימה חדשה: ${title.trim()}` });
        }
      }

      // סנכרון משתתפים
      await supabase.from("task_participants").delete().eq("task_id", taskId);
      const parts = participants.filter((p) => p !== ownerId);
      if (parts.length) {
        await supabase.from("task_participants").insert(parts.map((user_id) => ({ task_id: taskId, user_id })));
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
      setSaving(false);
    }
  }

  async function remove() {
    if (!task) return;
    if (!confirm(`למחוק את המשימה "${task.title}"? הפעולה אינה הפיכה — כולל ההיסטוריה של המשימה.`)) return;
    setSaving(true);
    setError("");
    const { error } = await getSupabase().from("tasks").delete().eq("id", task.id);
    if (error) { setError(error.message); setSaving(false); return; }
    onSaved();
  }

  const nameOf = (id: string | null) => {
    const p = profiles.find((x) => x.id === id);
    return p?.full_name || p?.email || "—";
  };

  function historyLabel(h: TaskHistory): string {
    const tr = (v: string | null) =>
      v && v in STATUS ? STATUS[v as StatusKey].label : v && v in URGENCY ? URGENCY[v as UrgencyKey].label : v || "—";
    switch (h.action_type) {
      case "created": return "המשימה נוצרה";
      case "completed": return "סומנה כבוצעה";
      case "status_change": return `שינוי סטטוס: ${tr(h.old_value)} ← ${tr(h.new_value)}`;
      case "deadline_change": return `שינוי דדליין: ${formatDate(h.old_value)} ← ${formatDate(h.new_value)}`;
      case "owner_change": return `שינוי אחראי: ${nameOf(h.old_value)} ← ${nameOf(h.new_value)}`;
      case "note_added": return `הערה: ${h.note}`;
      default: return h.note || h.action_type;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-800">{task ? "עריכת משימה" : "משימה חדשה"}</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="כותרת המשימה *" className="md:col-span-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </Field>
          <Field label="תיאור" className="md:col-span-2">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} />
          </Field>

          <Field label="לקוח">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
              <option value="">— ללא (משימה פנימית) —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="תהליך">
            <select value={processId} onChange={(e) => setProcessId(e.target.value)} className={inputCls}>
              <option value="">— ללא —</option>
              {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          <Field label="אחראי ראשי">
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
              <option value="">— לא משויך —</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
          </Field>
          <Field label="רמת דחיפות">
            <select value={urgency} onChange={(e) => setUrgency(e.target.value as UrgencyKey)} className={inputCls}>
              {URGENCY_OPTIONS.map((u) => <option key={u} value={u}>{URGENCY[u].label}</option>)}
            </select>
          </Field>

          <Field label="זמן ביצוע משוער (דקות)">
            <input type="number" value={estimated} onChange={(e) => setEstimated(e.target.value)} className={inputCls} />
          </Field>
          <Field label="סטטוס">
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusKey)} className={inputCls}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
            </select>
          </Field>

          <Field label="תאריך יעד">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="שעה מתוכננת">
            <input type="time" value={plannedTime} onChange={(e) => setPlannedTime(e.target.value)} className={inputCls} />
          </Field>

          <Field label="משתתפים נוספים" className="md:col-span-2">
            <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-2">
              {profiles.filter((p) => p.id !== ownerId).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => toggleParticipant(p.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    participants.includes(p.id) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p.full_name || p.email}
                </button>
              ))}
              {profiles.filter((p) => p.id !== ownerId).length === 0 && (
                <span className="text-xs text-slate-400">אין אנשי צוות נוספים</span>
              )}
            </div>
          </Field>

          <Field label="הערות" className="md:col-span-2">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
          </Field>

          {status === "in_progress" && (
            <>
              <Field label="הערת טיפול — מה קורה עכשיו *" className="md:col-span-2">
                <input value={statusNote} onChange={(e) => setStatusNote(e.target.value)} className={inputCls} />
              </Field>
              <Field label="תאריך יעד הבא *">
                <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} className={inputCls} />
              </Field>
            </>
          )}
          {status === "waiting_external" && (
            <>
              <Field label="למי ממתינים *"><input value={waitingFor} onChange={(e) => setWaitingFor(e.target.value)} className={inputCls} /></Field>
              <Field label="מתי לבדוק שוב *"><input type="date" value={waitingRecheck} onChange={(e) => setWaitingRecheck(e.target.value)} className={inputCls} /></Field>
              <Field label="מה חסר *" className="md:col-span-2"><input value={waitingMissing} onChange={(e) => setWaitingMissing(e.target.value)} className={inputCls} /></Field>
            </>
          )}
          {status === "done" && (
            <Field label="הערת סגירה (אופציונלי)" className="md:col-span-2">
              <input value={closingNote} onChange={(e) => setClosingNote(e.target.value)} className={inputCls} />
            </Field>
          )}
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? "שומר..." : "שמירה"}
            </button>
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-600 hover:bg-slate-50">ביטול</button>
          </div>
          {task && (
            <button onClick={remove} disabled={saving} className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50">
              <Trash2 size={16} /> מחק משימה
            </button>
          )}
        </div>

        {task && history.length > 0 && (
          <div className="mt-8 border-t border-slate-200 pt-4">
            <h3 className="mb-3 font-semibold text-slate-700">היסטוריית שינויים</h3>
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                  <div>
                    <p className="text-slate-700">{historyLabel(h)}</p>
                    <p className="text-xs text-slate-400">
                      {nameOf(h.changed_by)} · {new Date(h.changed_at).toLocaleString("he-IL")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
