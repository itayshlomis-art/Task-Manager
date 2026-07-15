"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { useData } from "@/lib/useData";
import { DEADLINES, deadlineDate, generateDeadlineTasks } from "@/lib/deadlines";
import { currentMonth, formatMonth, formatDate } from "@/lib/utils";
import { UrgencyBadge } from "@/components/Badges";
import { CalendarClock } from "lucide-react";

export default function DeadlinesPage() {
  const { userId } = useApp();
  const { clients, loading } = useData();
  const [month, setMonth] = useState(currentMonth());
  const [selectedDeadlines, setSelectedDeadlines] = useState<string[]>(DEADLINES.map((d) => d.key));
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);

  const activeClients = clients.filter((c) => c.status === "active");

  function toggle<T>(arr: T[], v: T, set: (x: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  async function generate() {
    setResult("");
    if (selectedClients.length === 0) return setResult("יש לבחור לפחות לקוח אחד");
    if (selectedDeadlines.length === 0) return setResult("יש לבחור לפחות מועד דיווח אחד");
    setSaving(true);
    try {
      const ownerByClient: Record<string, string | null> = {};
      for (const c of clients) ownerByClient[c.id] = c.account_manager_id;
      const { created } = await generateDeadlineTasks({
        month, clientIds: selectedClients, deadlineKeys: selectedDeadlines, ownerByClient, createdBy: userId,
      });
      setResult(created === 0 ? "כל המשימות כבר קיימות — לא נוצרו חדשות" : `נוצרו ${created} משימות דיווח ל${formatMonth(month)} 🎉`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400">טוען...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <CalendarClock size={24} /> מועדי דיווח
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          יצירה אוטומטית של משימות למועדי הדיווח הרגולטוריים לכל לקוח. בחרו חודש, מועדים ולקוחות — והמערכת תיצור את המשימות עם תאריכי היעד הנכונים.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* חודש */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-700">חודש</h2>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        {/* מועדי דיווח */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-700">מועדי דיווח</h2>
          <div className="space-y-2">
            {DEADLINES.map((d) => (
              <label key={d.key} className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedDeadlines.includes(d.key)} onChange={() => toggle(selectedDeadlines, d.key, setSelectedDeadlines)} />
                  {d.title}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{formatDate(deadlineDate(month, d.dueDay))}</span>
                  <UrgencyBadge value={d.urgency} />
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* לקוחות */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">לקוחות פעילים</h2>
            <button
              onClick={() => setSelectedClients(selectedClients.length === activeClients.length ? [] : activeClients.map((c) => c.id))}
              className="text-xs text-blue-600 hover:underline"
            >
              {selectedClients.length === activeClients.length ? "נקה הכל" : "בחר הכל"}
            </button>
          </div>
          <div className="max-h-56 space-y-1 overflow-auto">
            {activeClients.length === 0 && <p className="text-sm text-slate-400">אין לקוחות פעילים</p>}
            {activeClients.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={selectedClients.includes(c.id)} onChange={() => toggle(selectedClients, c.id, setSelectedClients)} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={generate} disabled={saving} className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
          {saving ? "יוצר משימות..." : "צור משימות למועדי הדיווח"}
        </button>
        {result && <p className="text-sm font-medium text-slate-700">{result}</p>}
      </div>
    </div>
  );
}
