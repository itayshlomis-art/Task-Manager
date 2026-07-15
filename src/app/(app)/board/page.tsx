"use client";

import { useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { useData } from "@/lib/useData";
import { STATUS, STATUS_OPTIONS } from "@/lib/constants";
import type { StatusKey, UrgencyKey } from "@/lib/constants";
import type { Task } from "@/lib/types";
import { isOverdue, sortTasks, formatDate } from "@/lib/utils";
import { UrgencyBadge, OverdueBadge } from "@/components/Badges";
import TaskDialog from "@/components/TaskDialog";
import { Plus } from "lucide-react";

const COLUMN_TINT: Record<StatusKey, string> = {
  not_started: "border-t-slate-400",
  in_progress: "border-t-blue-400",
  waiting_external: "border-t-purple-400",
  done: "border-t-green-400",
};

export default function BoardPage() {
  const { userId } = useApp();
  const { tasks, clients, processes, profiles, loading, reload, clientName, ownerName } = useData();
  const [editing, setEditing] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [fClient, setFClient] = useState("");
  const [fOwner, setFOwner] = useState("");

  const filtered = useMemo(() => {
    let list = tasks;
    if (fClient) list = list.filter((t) => t.client_id === fClient);
    if (fOwner) list = list.filter((t) => t.owner_id === fOwner);
    return list;
  }, [tasks, fClient, fOwner]);

  const byStatus = (s: StatusKey) => sortTasks(filtered.filter((t) => t.status === s));

  async function moveTo(taskId: string, target: StatusKey) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === target) return;

    // סטטוסים שדורשים שדות חובה → נפתח את חלון המשימה עם הסטטוס החדש
    if (target === "in_progress" || target === "waiting_external") {
      setEditing({ ...task, status: target });
      setDialogOpen(true);
      return;
    }

    // בוצע — רק האחראי הראשי
    if (target === "done" && task.owner_id && task.owner_id !== userId) {
      alert("רק האחראי הראשי על המשימה יכול לסמן אותה כבוצעה");
      return;
    }

    const patch: Record<string, unknown> = { status: target, updated_by: userId, updated_at: new Date().toISOString() };
    if (target === "done") { patch.completed_at = new Date().toISOString(); patch.completed_by = userId; }
    await getSupabase().from("tasks").update(patch).eq("id", taskId);
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">לוח קנבן</h1>
        <button onClick={() => { setEditing(null); setDialogOpen(true); }} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-blue-700">
          <Plus size={18} /> צור משימה חדשה
        </button>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <select value={fClient} onChange={(e) => setFClient(e.target.value)} className={filterCls}>
          <option value="">כל הלקוחות</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={fOwner} onChange={(e) => setFOwner(e.target.value)} className={filterCls}>
          <option value="">כל אנשי הצוות</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-400">טוען...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUS_OPTIONS.map((s) => {
            const list = byStatus(s);
            return (
              <div
                key={s}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragId) moveTo(dragId, s); setDragId(null); }}
                className={`flex min-h-[60vh] flex-col rounded-xl border border-t-4 border-slate-200 bg-slate-50 ${COLUMN_TINT[s]}`}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <h2 className="font-semibold text-slate-700">{STATUS[s].label}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">{list.length}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-auto px-3 pb-3">
                  {list.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => { setEditing(t); setDialogOpen(true); }}
                      className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md ${isOverdue(t) ? "border-red-300" : "border-slate-200"}`}
                    >
                      <p className="mb-2 text-sm font-medium text-slate-800">{t.title}</p>
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        <UrgencyBadge value={t.urgency as UrgencyKey} />
                        {isOverdue(t) && <OverdueBadge />}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{clientName(t.client_id)}</span>
                        <span>{formatDate(t.due_date)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{ownerName(t.owner_id)}</p>
                    </div>
                  ))}
                  {list.length === 0 && <p className="px-1 py-6 text-center text-xs text-slate-300">גררו לכאן משימות</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dialogOpen && (
        <TaskDialog
          task={editing}
          clients={clients}
          processes={processes}
          profiles={profiles}
          currentUserId={userId}
          onClose={() => setDialogOpen(false)}
          onSaved={() => { setDialogOpen(false); reload(); }}
        />
      )}
    </div>
  );
}

const filterCls = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500";
