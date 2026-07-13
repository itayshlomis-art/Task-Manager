"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { useData } from "@/lib/useData";
import { URGENCY, STATUS } from "@/lib/constants";
import type { UrgencyKey, StatusKey } from "@/lib/constants";
import type { Task } from "@/lib/types";
import { isOverdue, todayISO, sortTasks } from "@/lib/utils";
import TaskTable from "@/components/TaskTable";
import TaskDialog from "@/components/TaskDialog";

export default function MyDashboard() {
  const { userId, profile } = useApp();
  const { tasks, clients, processes, profiles, loading, reload, clientName, ownerName } = useData();
  const [participatingIds, setParticipatingIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getSupabase().from("task_participants").select("task_id").eq("user_id", userId).then(({ data }) => {
      setParticipatingIds(((data as { task_id: string }[]) ?? []).map((r) => r.task_id));
    });
  }, [userId]);

  if (loading) return <p className="text-slate-400">טוען...</p>;

  const mine = tasks.filter((t) => t.owner_id === userId);
  const myOpen = mine.filter((t) => t.status !== "done");
  const myToday = sortTasks(mine.filter((t) => t.due_date === todayISO() && t.status !== "done"));
  const myOverdue = sortTasks(mine.filter((t) => isOverdue(t)));
  const participating = tasks.filter((t) => participatingIds.includes(t.id) && t.owner_id !== userId);

  const rowClick = (t: Task) => { setEditing(t); setOpen(true); };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">שלום, {profile?.full_name || "משתמש"} 👋</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="המשימות שלי (פתוחות)" value={myOpen.length} color="text-blue-600" />
        <Stat label="להיום" value={myToday.length} color="text-amber-600" />
        <Stat label="באיחור" value={myOverdue.length} color="text-red-600" />
        <Stat label="משתתף בהן" value={participating.length} color="text-purple-600" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="לפי דחיפות">
          {(Object.keys(URGENCY) as UrgencyKey[]).map((u) => (
            <MiniRow key={u} label={URGENCY[u].label} dot={URGENCY[u].dot} value={myOpen.filter((t) => t.urgency === u).length} />
          ))}
        </Panel>
        <Panel title="לפי סטטוס">
          {(Object.keys(STATUS) as StatusKey[]).map((s) => (
            <MiniRow key={s} label={STATUS[s].label} value={mine.filter((t) => t.status === s).length} />
          ))}
        </Panel>
      </div>

      <Section title="המשימות שלי להיום">
        <TaskTable tasks={myToday} clientName={clientName} ownerName={ownerName} onRowClick={rowClick} hideOwner emptyText="אין משימות להיום 🎉" />
      </Section>
      <Section title="המשימות שלי באיחור">
        <TaskTable tasks={myOverdue} clientName={clientName} ownerName={ownerName} onRowClick={rowClick} hideOwner emptyText="אין משימות באיחור" />
      </Section>
      <Section title="משימות שאני משתתף בהן (לא אחראי ראשי)">
        <TaskTable tasks={sortTasks(participating)} clientName={clientName} ownerName={ownerName} onRowClick={rowClick} emptyText="אין משימות כאלה" />
      </Section>

      {open && (
        <TaskDialog task={editing} clients={clients} processes={processes} profiles={profiles} currentUserId={userId}
          onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-3 font-semibold text-slate-700">{title}</h2><div className="space-y-1">{children}</div></div>;
}
function MiniRow({ label, value, dot }: { label: string; value: number; dot?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0">
      <span className="flex items-center gap-2 text-sm text-slate-600">{dot && <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />}{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3"><h2 className="font-semibold text-slate-700">{title}</h2>{children}</div>;
}
