"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { URGENCY_OPTIONS, STATUS_OPTIONS, URGENCY, STATUS } from "@/lib/constants";
import type { UrgencyKey, StatusKey } from "@/lib/constants";
import type { Task, Client, Process, Profile } from "@/lib/types";
import { todayISO } from "@/lib/utils";

type Props = {
  task: Task | null; // null = יצירה חדשה
  clients: Client[];
  processes: Process[];
  profiles: Profile[];
  currentUserId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function TaskDialog({ task, clients, processes, profiles, currentUserId, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [clientId, setClientId] = useState(task?.client_id ?? "");
  const [processId, setProcessId] = useState(task?.process_id ?? "");
  const [ownerId, setOwnerId] = useState(task?.owner_id ?? currentUserId);
  const [urgency, setUrgency] = useState<UrgencyKey>(task?.urgency ?? "routine");
  const [status, setStatus] = useState<StatusKey>(task?.status ?? "not_started");
  const [estimated, setEstimated] = useState(task?.estimated_minutes?.toString() ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [plannedTime, setPlannedTime] = useState(task?.planned_time?.slice(0, 5) ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");

  // שדות תלויי-סטטוס
  const [statusNote, setStatusNote] = useState(task?.status_note ?? "");
  const [nextDueDate, setNextDueDate] = useState(task?.next_due_date ?? "");
  const [waitingFor, setWaitingFor] = useState(task?.waiting_for ?? "");
  const [waitingMissing, setWaitingMissing] = useState(task?.waiting_missing ?? "");
  const [waitingRecheck, setWaitingRecheck] = useState(task?.waiting_recheck_date ?? "");
  const [closingNote, setClosingNote] = useState(task?.closing_note ?? "");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function save() {
    setError("");
    if (!title.trim()) return setError("יש להזין כותרת למשימה");

    // ולידציה לפי סטטוס
    if (status === "in_progress" && (!statusNote.trim() || !nextDueDate))
      return setError("במעבר לסטטוס 'בטיפול' חובה להזין הערת טיפול ותאריך יעד הבא");
    if (status === "waiting_external" && (!waitingFor.trim() || !waitingMissing.trim() || !waitingRecheck))
      return setError("במעבר ל'ממתין לגורם חיצוני' חובה להזין: למי ממתינים, מה חסר, ומתי לבדוק שוב");

    // רק האחראי הראשי יכול לסמן כבוצע
    if (status === "done" && task && task.owner_id && task.owner_id !== currentUserId)
      return setError("רק האחראי הראשי על המשימה יכול לסמן אותה כבוצעה");

    setSaving(true);
    const supabase = getSupabase();

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description,
      client_id: clientId || null,
      process_id: processId || null,
      owner_id: ownerId || null,
      urgency,
      status,
      estimated_minutes: estimated ? parseInt(estimated) : null,
      due_date: dueDate || null,
      planned_time: plannedTime || null,
      notes,
      status_note: statusNote,
      next_due_date: nextDueDate || null,
      waiting_for: waitingFor,
      waiting_missing: waitingMissing,
      waiting_recheck_date: waitingRecheck || null,
      closing_note: closingNote,
      updated_by: currentUserId,
      updated_at: new Date().toISOString(),
    };

    if (status === "done") {
      payload.completed_at = task?.completed_at ?? new Date().toISOString();
      payload.completed_by = currentUserId;
    }

    try {
      if (task) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
        if (error) throw error;
      } else {
        payload.created_by = currentUserId;
        const { data, error } = await supabase.from("tasks").insert(payload).select("id").single();
        if (error) throw error;
        // תיעוד יצירה בהיסטוריה + התראה לאחראי
        const newId = (data as { id: string }).id;
        await supabase.from("task_history").insert({
          task_id: newId, changed_by: currentUserId, action_type: "created", note: "המשימה נוצרה",
        });
        if (ownerId) {
          await supabase.from("notifications").insert({
            user_id: ownerId, task_id: newId, type: "assigned",
            message: `הוקצתה לך משימה חדשה: ${title.trim()}`,
          });
        }
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-800">
          {task ? "עריכת משימה" : "משימה חדשה"}
        </h2>

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

          <Field label="תאריך יעד">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </Field>

          <Field label="שעה מתוכננת">
            <input type="time" value={plannedTime} onChange={(e) => setPlannedTime(e.target.value)} className={inputCls} />
          </Field>

          <Field label="סטטוס">
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusKey)} className={inputCls}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
            </select>
          </Field>

          <Field label="הערות" className="md:col-span-2">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
          </Field>

          {/* שדות תלויי-סטטוס */}
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

        <div className="mt-6 flex justify-start gap-3">
          <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "שומר..." : "שמירה"}
          </button>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-600 hover:bg-slate-50">
            ביטול
          </button>
        </div>
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
