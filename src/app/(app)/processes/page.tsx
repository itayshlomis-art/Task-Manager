"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { URGENCY, URGENCY_OPTIONS } from "@/lib/constants";
import type { UrgencyKey } from "@/lib/constants";
import type { Process, ProcessTemplateTask } from "@/lib/types";
import { UrgencyBadge } from "@/components/Badges";
import { Plus, Trash2 } from "lucide-react";

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [templates, setTemplates] = useState<ProcessTemplateTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProcess, setNewProcess] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from("processes").select("*").order("name"),
      supabase.from("process_template_tasks").select("*").order("order_index"),
    ]);
    setProcesses((p as Process[]) ?? []);
    setTemplates((t as ProcessTemplateTask[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-slate-400">טוען...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">תהליכים ותבניות משימות</h1>
          <p className="mt-1 text-sm text-slate-500">כל תהליך מכיל תבנית משימות. הצמדת תהליך ללקוח נעשית מתוך עמוד הלקוח.</p>
        </div>
        <button onClick={() => setNewProcess(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
          <Plus size={18} /> תהליך חדש
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {processes.map((p) => (
          <ProcessCard key={p.id} process={p} tasks={templates.filter((t) => t.process_id === p.id)} onChange={load} />
        ))}
      </div>

      {newProcess && <NewProcessDialog onClose={() => setNewProcess(false)} onDone={() => { setNewProcess(false); load(); }} />}
    </div>
  );
}

function ProcessCard({ process, tasks, onChange }: { process: Process; tasks: ProcessTemplateTask[]; onChange: () => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [urgency, setUrgency] = useState<UrgencyKey>("routine");
  const [offset, setOffset] = useState("0");

  async function addTask() {
    if (!title.trim()) return;
    await getSupabase().from("process_template_tasks").insert({
      process_id: process.id, title: title.trim(), default_urgency: urgency,
      deadline_offset_days: parseInt(offset) || 0, order_index: tasks.length + 1,
    });
    setTitle(""); setOffset("0"); setUrgency("routine"); setAdding(false); onChange();
  }
  async function removeTask(id: string) {
    if (!confirm("למחוק משימה מהתבנית?")) return;
    await getSupabase().from("process_template_tasks").delete().eq("id", id);
    onChange();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-800">{process.name}</h2>
      {process.description && <p className="mt-1 text-sm text-slate-500">{process.description}</p>}
      <ul className="mt-3 space-y-2">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
            <span className="text-sm text-slate-700">{t.title}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">+{t.deadline_offset_days} ימים</span>
              <UrgencyBadge value={t.default_urgency as UrgencyKey} />
              <button onClick={() => removeTask(t.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
            </div>
          </li>
        ))}
        {tasks.length === 0 && <li className="text-sm text-slate-400">אין משימות בתבנית</li>}
      </ul>

      {adding ? (
        <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
          <input placeholder="כותרת משימה" value={title} onChange={(e) => setTitle(e.target.value)} className={cls} />
          <div className="flex gap-2">
            <select value={urgency} onChange={(e) => setUrgency(e.target.value as UrgencyKey)} className={cls}>
              {URGENCY_OPTIONS.map((u) => <option key={u} value={u}>{URGENCY[u].label}</option>)}
            </select>
            <input type="number" placeholder="ימים לדדליין" value={offset} onChange={(e) => setOffset(e.target.value)} className={cls} />
          </div>
          <div className="flex gap-2">
            <button onClick={addTask} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">הוסף</button>
            <button onClick={() => setAdding(false)} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600">ביטול</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <Plus size={15} /> הוסף משימה לתבנית
        </button>
      )}
    </div>
  );
}

function NewProcessDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return setError("יש להזין שם תהליך");
    setSaving(true);
    const { error } = await getSupabase().from("processes").insert({ name: name.trim(), description });
    if (error) { setError(error.message); setSaving(false); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4">
      <div className="my-16 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-800">תהליך חדש</h2>
        <div className="space-y-3">
          <input placeholder="שם התהליך *" value={name} onChange={(e) => setName(e.target.value)} className={cls} />
          <textarea placeholder="תיאור" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={cls} />
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "שומר..." : "שמירה"}
          </button>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-600 hover:bg-slate-50">ביטול</button>
        </div>
      </div>
    </div>
  );
}

const cls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500";
