"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { URGENCY, STATUS } from "@/lib/constants";
import type { UrgencyKey, StatusKey } from "@/lib/constants";
import { isOverdue, todayISO } from "@/lib/utils";
import type { Task } from "@/lib/types";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSupabase()
      .from("tasks")
      .select("*")
      .eq("is_draft", false)
      .then(({ data }) => {
        setTasks((data as Task[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-slate-400">טוען נתונים...</p>;

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");
  const overdue = tasks.filter((t) => isOverdue(t));
  const today = tasks.filter((t) => t.due_date === todayISO() && t.status !== "done");

  const byUrgency = (u: UrgencyKey) => open.filter((t) => t.urgency === u).length;
  const byStatus = (s: StatusKey) => tasks.filter((t) => t.status === s).length;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">דשבורד ניהולי</h1>

      {/* מספרים ראשיים */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="משימות פתוחות" value={open.length} href="/tasks?status=open" color="text-blue-600" />
        <StatCard label="בוצעו" value={done.length} href="/tasks?status=done" color="text-green-600" />
        <StatCard label="באיחור" value={overdue.length} href="/tasks?filter=overdue" color="text-red-600" />
        <StatCard label="להיום" value={today.length} href="/tasks?filter=today" color="text-amber-600" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* לפי דחיפות */}
        <Panel title="משימות פתוחות לפי דחיפות">
          {(Object.keys(URGENCY) as UrgencyKey[]).map((u) => (
            <Row key={u} label={URGENCY[u].label} value={byUrgency(u)} dot={URGENCY[u].dot} />
          ))}
        </Panel>

        {/* לפי סטטוס */}
        <Panel title="משימות לפי סטטוס">
          {(Object.keys(STATUS) as StatusKey[]).map((s) => (
            <Row key={s} label={STATUS[s].label} value={byStatus(s)} />
          ))}
        </Panel>
      </div>

      {open.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
          אין עדיין משימות. עברו ל<Link href="/tasks" className="text-blue-600 hover:underline">לוח המשימות</Link> כדי ליצור משימה ראשונה.
        </p>
      )}
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
      <h2 className="mb-4 font-semibold text-slate-700">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, dot }: { label: string; value: number; dot?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0">
      <span className="flex items-center gap-2 text-sm text-slate-600">
        {dot && <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
        {label}
      </span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}
