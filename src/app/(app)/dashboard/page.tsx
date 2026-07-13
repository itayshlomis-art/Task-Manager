"use client";

import Link from "next/link";
import { useData } from "@/lib/useData";
import { URGENCY, STATUS } from "@/lib/constants";
import type { UrgencyKey, StatusKey } from "@/lib/constants";
import { isOverdue, todayISO, sortTasks } from "@/lib/utils";
import TaskTable from "@/components/TaskTable";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { tasks, clients, profiles, loading, clientName, ownerName } = useData();

  if (loading) return <p className="text-slate-400">טוען נתונים...</p>;

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");
  const overdue = sortTasks(tasks.filter((t) => isOverdue(t)));
  const today = tasks.filter((t) => t.due_date === todayISO() && t.status !== "done");
  const urgentOpen = sortTasks(open.filter((t) => t.urgency === "urgent"));
  const waiting = tasks.filter((t) => t.status === "waiting_external");

  const byUrgency = (u: UrgencyKey) => open.filter((t) => t.urgency === u).length;
  const byStatus = (s: StatusKey) => tasks.filter((t) => t.status === s).length;

  const perTeam = profiles
    .map((p) => ({ p, count: open.filter((t) => t.owner_id === p.id).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const perClient = clients
    .map((c) => ({ c, count: open.filter((t) => t.client_id === c.id).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">דשבורד ניהולי</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="משימות פתוחות" value={open.length} href="/tasks?status=open" color="text-blue-600" />
        <StatCard label="בוצעו" value={done.length} href="/tasks?status=done" color="text-green-600" />
        <StatCard label="באיחור" value={overdue.length} href="/tasks?filter=overdue" color="text-red-600" />
        <StatCard label="להיום" value={today.length} href="/tasks?filter=today" color="text-amber-600" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="לפי דחיפות (פתוחות)">
          {(Object.keys(URGENCY) as UrgencyKey[]).map((u) => (
            <Row key={u} label={URGENCY[u].label} value={byUrgency(u)} dot={URGENCY[u].dot} onClick={() => router.push(`/tasks?status=open&urgency=${u}`)} />
          ))}
        </Panel>
        <Panel title="לפי סטטוס">
          {(Object.keys(STATUS) as StatusKey[]).map((s) => (
            <Row key={s} label={STATUS[s].label} value={byStatus(s)} onClick={() => router.push(`/tasks?status=${s}`)} />
          ))}
        </Panel>
        <Panel title="לפי איש צוות (פתוחות)">
          {perTeam.length === 0 ? <Empty /> : perTeam.map(({ p, count }) => (
            <Row key={p.id} label={p.full_name || p.email} value={count} onClick={() => router.push(`/tasks?owner=${p.id}&status=open`)} />
          ))}
        </Panel>
        <Panel title="לפי לקוח (פתוחות)">
          {perClient.length === 0 ? <Empty /> : perClient.map(({ c, count }) => (
            <Row key={c.id} label={c.name} value={count} onClick={() => router.push(`/tasks?client=${c.id}&status=open`)} />
          ))}
        </Panel>
      </div>

      <Section title="משימות דחופות מאוד שעדיין פתוחות">
        <TaskTable tasks={urgentOpen.slice(0, 8)} clientName={clientName} ownerName={ownerName} onRowClick={(t) => router.push(`/tasks?open=${t.id}`)} emptyText="אין משימות דחופות פתוחות" />
      </Section>
      <Section title="משימות באיחור">
        <TaskTable tasks={overdue.slice(0, 8)} clientName={clientName} ownerName={ownerName} onRowClick={(t) => router.push(`/tasks?open=${t.id}`)} emptyText="אין משימות באיחור 🎉" />
      </Section>
      <Section title="ממתינות לגורם חיצוני">
        <TaskTable tasks={waiting.slice(0, 8)} clientName={clientName} ownerName={ownerName} onRowClick={(t) => router.push(`/tasks?open=${t.id}`)} emptyText="אין משימות ממתינות" />
      </Section>
    </div>
  );
}

function StatCard({ label, value, href, color }: { label: string; value: number; href: string; color: string }) {
  return (
    <Link href={href} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </Link>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold text-slate-700">{title}</h2>
      <div className="max-h-64 space-y-1 overflow-auto">{children}</div>
    </div>
  );
}

function Row({ label, value, dot, onClick }: { label: string; value: number; dot?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-lg border-b border-slate-100 px-2 py-1.5 text-right transition last:border-0 hover:bg-slate-50">
      <span className="flex items-center gap-2 text-sm text-slate-600">
        {dot && <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
        {label}
      </span>
      <span className="font-semibold text-slate-800">{value}</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-slate-700">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="px-2 py-1.5 text-sm text-slate-400">אין נתונים</p>;
}
