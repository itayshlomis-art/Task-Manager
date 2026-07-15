"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { useData } from "@/lib/useData";
import { loadDeadlines, deadlineDate, generateDeadlineTasks } from "@/lib/deadlines";
import type { DeadlineDef } from "@/lib/deadlines";
import { URGENCY, URGENCY_OPTIONS } from "@/lib/constants";
import type { UrgencyKey } from "@/lib/constants";
import { currentMonth, formatMonth, formatDate } from "@/lib/utils";
import { UrgencyBadge } from "@/components/Badges";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";

export default function DeadlinesPage() {
  const { userId } = useApp();
  const { clients, loading } = useData();
  const [deadlines, setDeadlines] = useState<DeadlineDef[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [selectedDeadlines, setSelectedDeadlines] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const reloadDeadlines = useCallback(async () => {
    const d = await loadDeadlines();
    setDeadlines(d);
    setSelectedDeadlines(d.map((x) => x.id));
  }, []);

  useEffect(() => { reloadDeadlines(); }, [reloadDeadlines]);

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
      const chosen = deadlines.filter((d) => selectedDeadlines.includes(d.id));
      const { created } = await generateDeadlineTasks({ month, clientIds: selectedClients, deadlines: chosen, ownerByClient, createdBy: userId });
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <CalendarClock size={24} /> מועדי דיווח
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            יצירה אוטומטית של משימות למועדי הדיווח הרגולטוריים לכל לקוח. ניתן לערוך את רשימת המועדים לפי הצורך.
          </p>
        </div>
        <button onClick={() => setEditOpen(true)} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          <Pencil size={16} /> עריכת מועדים
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-700">חודש</h2>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-700">מועדי דיווח</h2>
          <div className="space-y-2">
            {deadlines.length === 0 && <p className="text-sm text-slate-400">אין מועדים. לחצו על "עריכת מועדים" כדי להוסיף.</p>}
            {deadlines.map((d) => (
              <label key={d.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedDeadlines.includes(d.id)} onChange={() => toggle(selectedDeadlines, d.id, setSelectedDeadlines)} />
                  {d.title}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{formatDate(deadlineDate(month, d.due_day))}</span>
                  <UrgencyBadge value={d.urgency} />
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">לקוחות פעילים</h2>
            <button onClick={() => setSelectedClients(selectedClients.length === activeClients.length ? [] : activeClients.map((c) => c.id))} className="text-xs text-blue-600 hover:underline">
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

      {editOpen && <EditDeadlinesDialog deadlines={deadlines} onClose={() => setEditOpen(false)} onChanged={reloadDeadlines} />}
    </div>
  );
}

function EditDeadlinesDialog({ deadlines, onClose, onChanged }: { deadlines: DeadlineDef[]; onClose: () => void; onChanged: () => void }) {
  const [rows, setRows] = useState<DeadlineDef[]>(deadlines);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(id: string, patch: Partial<DeadlineDef>) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function addRow() {
    setRows((r) => [
      ...r,
      { id: `new-${crypto.randomUUID()}`, title: "", due_day: 15, urgency: "important", description: "", order_index: r.length + 1, is_active: true },
    ]);
  }
  function removeRow(id: string) {
    setRows((r) => r.filter((x) => x.id !== id));
  }

  async function save() {
    setError("");
    const supabase = getSupabase();
    try {
      // מחיקת מועדים שהוסרו
      const remainingIds = rows.filter((r) => !r.id.startsWith("new-")).map((r) => r.id);
      const removed = deadlines.filter((d) => !remainingIds.includes(d.id)).map((d) => d.id);
      if (removed.length) await supabase.from("deadline_definitions").delete().in("id", removed);

      setSaving(true);
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r.title.trim()) continue;
        const payload = { title: r.title.trim(), due_day: r.due_day, urgency: r.urgency, description: r.description ?? "", order_index: i + 1, is_active: true };
        if (r.id.startsWith("new-")) {
          await supabase.from("deadline_definitions").insert(payload);
        } else {
          await supabase.from("deadline_definitions").update(payload).eq("id", r.id);
        }
      }
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4">
      <div className="my-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-800">עריכת מועדי דיווח</h2>
        <div className="space-y-2">
          <div className="flex gap-2 px-1 text-xs font-medium text-slate-400">
            <span className="flex-1">שם המועד</span>
            <span className="w-24 text-center">יום בחודש</span>
            <span className="w-32 text-center">דחיפות</span>
            <span className="w-8" />
          </div>
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <input value={r.title} onChange={(e) => update(r.id, { title: e.target.value })} placeholder="שם המועד" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input type="number" min={1} max={31} value={r.due_day} onChange={(e) => update(r.id, { due_day: parseInt(e.target.value) || 1 })} className="w-24 rounded-lg border border-slate-300 px-2 py-2 text-center text-sm" />
              <select value={r.urgency} onChange={(e) => update(r.id, { urgency: e.target.value as UrgencyKey })} className="w-32 rounded-lg border border-slate-300 px-2 py-2 text-sm">
                {URGENCY_OPTIONS.map((u) => <option key={u} value={u}>{URGENCY[u].label}</option>)}
              </select>
              <button onClick={() => removeRow(r.id)} className="w-8 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>

        <button onClick={addRow} className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <Plus size={15} /> הוסף מועד
        </button>

        {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "שומר..." : "שמירה"}
          </button>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-600 hover:bg-slate-50">ביטול</button>
        </div>
      </div>
    </div>
  );
}
