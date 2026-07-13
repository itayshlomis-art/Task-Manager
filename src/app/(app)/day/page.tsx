"use client";

import { useState } from "react";
import { useData } from "@/lib/useData";
import { useApp } from "@/lib/app-context";
import type { Task } from "@/lib/types";
import { isOverdue, sortTasks, todayISO } from "@/lib/utils";
import TaskTable from "@/components/TaskTable";
import TaskDialog from "@/components/TaskDialog";

export default function DayView() {
  const { userId } = useApp();
  const { tasks, clients, processes, profiles, loading, reload, clientName, ownerName } = useData();
  const [date, setDate] = useState(todayISO());
  const [editing, setEditing] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  if (loading) return <p className="text-slate-400">טוען...</p>;

  const forDay = sortTasks(tasks.filter((t) => t.due_date === date && t.status !== "done"));
  const overdue = sortTasks(tasks.filter((t) => isOverdue(t)));

  // קיבוץ לפי שעה מתוכננת
  const withTime = forDay.filter((t) => t.planned_time).sort((a, b) => (a.planned_time ?? "").localeCompare(b.planned_time ?? ""));
  const noTime = forDay.filter((t) => !t.planned_time);

  const rowClick = (t: Task) => { setEditing(t); setOpen(true); };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">תצוגה יומית</h1>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>

      {withTime.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-700">לפי שעות</h2>
          <div className="space-y-2">
            {withTime.map((t) => (
              <button key={t.id} onClick={() => rowClick(t)} className="flex w-full items-center gap-4 rounded-lg border border-slate-200 bg-white p-3 text-right transition hover:bg-slate-50">
                <span className="w-14 font-mono text-sm font-semibold text-blue-600">{t.planned_time?.slice(0, 5)}</span>
                <span className="flex-1 text-slate-800">{t.title}</span>
                <span className="text-sm text-slate-500">{clientName(t.client_id)}</span>
                <span className="text-sm text-slate-500">{ownerName(t.owner_id)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-700">משימות לביצוע ליום זה {withTime.length > 0 ? "(ללא שעה)" : ""}</h2>
        <TaskTable tasks={noTime} clientName={clientName} ownerName={ownerName} onRowClick={rowClick} emptyText="אין משימות ליום זה" />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-700">משימות באיחור שעדיין לא בוצעו</h2>
        <TaskTable tasks={overdue} clientName={clientName} ownerName={ownerName} onRowClick={rowClick} emptyText="אין משימות באיחור 🎉" />
      </section>

      {open && (
        <TaskDialog task={editing} clients={clients} processes={processes} profiles={profiles} currentUserId={userId}
          onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />
      )}
    </div>
  );
}
