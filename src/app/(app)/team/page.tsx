"use client";

import { useState } from "react";
import { useData } from "@/lib/useData";
import { useApp } from "@/lib/app-context";
import { ROLE } from "@/lib/constants";
import type { Task } from "@/lib/types";
import { isOverdue, sortTasks } from "@/lib/utils";
import TaskTable from "@/components/TaskTable";
import TaskDialog from "@/components/TaskDialog";

export default function TeamView() {
  const { userId } = useApp();
  const { tasks, clients, processes, profiles, loading, reload, clientName, ownerName } = useData();
  const [selected, setSelected] = useState<string>("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  if (loading) return <p className="text-slate-400">טוען...</p>;

  const rowClick = (t: Task) => { setEditing(t); setOpen(true); };
  const memberTasks = selected ? sortTasks(tasks.filter((t) => t.owner_id === selected)) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">תצוגה לפי איש צוות</h1>

      {/* כרטיסי צוות */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {profiles.map((p) => {
          const t = tasks.filter((x) => x.owner_id === p.id);
          const openCount = t.filter((x) => x.status !== "done").length;
          const overdueCount = t.filter((x) => isOverdue(x)).length;
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p.id === selected ? "" : p.id)}
              className={`rounded-xl border p-4 text-right transition ${selected === p.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:shadow-md"}`}
            >
              <p className="font-semibold text-slate-800">{p.full_name || p.email}</p>
              <p className="text-xs text-slate-400">{ROLE[p.role]}</p>
              <div className="mt-3 flex gap-4 text-sm">
                <span className="text-blue-600">{openCount} פתוחות</span>
                {overdueCount > 0 && <span className="text-red-600">{overdueCount} באיחור</span>}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-700">
            המשימות של {profiles.find((p) => p.id === selected)?.full_name}
          </h2>
          <TaskTable tasks={memberTasks} clientName={clientName} ownerName={ownerName} onRowClick={rowClick} hideOwner emptyText="אין משימות" />
        </section>
      )}

      {open && (
        <TaskDialog task={editing} clients={clients} processes={processes} profiles={profiles} currentUserId={userId}
          onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />
      )}
    </div>
  );
}
