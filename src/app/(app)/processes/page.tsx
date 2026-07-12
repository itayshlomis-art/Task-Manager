"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { URGENCY } from "@/lib/constants";
import type { UrgencyKey } from "@/lib/constants";
import type { Process, ProcessTemplateTask } from "@/lib/types";
import { UrgencyBadge } from "@/components/Badges";

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [templates, setTemplates] = useState<ProcessTemplateTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    Promise.all([
      supabase.from("processes").select("*").order("name"),
      supabase.from("process_template_tasks").select("*").order("order_index"),
    ]).then(([{ data: p }, { data: t }]) => {
      setProcesses((p as Process[]) ?? []);
      setTemplates((t as ProcessTemplateTask[]) ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-slate-400">טוען...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">תהליכים ותבניות משימות</h1>
        <p className="mt-1 text-sm text-slate-500">
          כל תהליך מכיל תבנית משימות קבועה. בשלב הבא ניתן יהיה להצמיד תהליך ללקוח וליצור ממנו את כל המשימות אוטומטית.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {processes.map((p) => {
          const tasks = templates.filter((t) => t.process_id === p.id);
          return (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-800">{p.name}</h2>
              {p.description && <p className="mt-1 text-sm text-slate-500">{p.description}</p>}
              <ul className="mt-3 space-y-2">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                    <span className="text-sm text-slate-700">{t.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">+{t.deadline_offset_days} ימים</span>
                      <UrgencyBadge value={t.default_urgency as UrgencyKey} />
                    </div>
                  </li>
                ))}
                {tasks.length === 0 && <li className="text-sm text-slate-400">אין משימות בתבנית</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
