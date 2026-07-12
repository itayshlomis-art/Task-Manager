"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { URGENCY, STATUS, URGENCY_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import type { UrgencyKey, StatusKey } from "@/lib/constants";
import type { Task, Client, Process, Profile } from "@/lib/types";
import { UrgencyBadge, StatusBadge, OverdueBadge } from "@/components/Badges";
import { isOverdue, sortTasks, formatDate } from "@/lib/utils";
import TaskDialog from "@/components/TaskDialog";
import { Plus } from "lucide-react";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  // פילטרים
  const [fClient, setFClient] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [fUrgency, setFUrgency] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [{ data: t }, { data: c }, { data: pr }, { data: pf }] = await Promise.all([
      supabase.from("tasks").select("*").eq("is_draft", false),
      supabase.from("clients").select("*").order("name"),
      supabase.from("processes").select("*").order("name"),
      supabase.from("profiles").select("*").order("full_name"),
    ]);
    setTasks((t as Task[]) ?? []);
    setClients((c as Client[]) ?? []);
    setProcesses((pr as Process[]) ?? []);
    setProfiles((pf as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""));
    load();
  }, [load]);

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? "—";
  const ownerName = (id: string | null) => {
    const p = profiles.find((x) => x.id === id);
    return p?.full_name || p?.email || "—";
  };

  const filtered = useMemo(() => {
    let list = tasks;
    if (fClient) list = list.filter((t) => t.client_id === fClient);
    if (fOwner) list = list.filter((t) => t.owner_id === fOwner);
    if (fUrgency) list = list.filter((t) => t.urgency === fUrgency);
    if (fStatus) list = list.filter((t) => t.status === fStatus);
    if (search.trim()) {
      const q = search.trim();
      list = list.filter((t) => t.title.includes(q) || (t.description ?? "").includes(q));
    }
    return sortTasks(list);
  }, [tasks, fClient, fOwner, fUrgency, fStatus, search]);

  function openNew() { setEditing(null); setDialogOpen(true); }
  function openEdit(t: Task) { setEditing(t); setDialogOpen(true); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">לוח משימות</h1>
        <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-blue-700">
          <Plus size={18} /> צור משימה חדשה
        </button>
      </div>

      {/* פילטרים */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input placeholder="חיפוש מהיר..." value={search} onChange={(e) => setSearch(e.target.value)} className={filterCls} />
        <select value={fClient} onChange={(e) => setFClient(e.target.value)} className={filterCls}>
          <option value="">כל הלקוחות</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={fOwner} onChange={(e) => setFOwner(e.target.value)} className={filterCls}>
          <option value="">כל אנשי הצוות</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
        </select>
        <select value={fUrgency} onChange={(e) => setFUrgency(e.target.value)} className={filterCls}>
          <option value="">כל רמות הדחיפות</option>
          {URGENCY_OPTIONS.map((u) => <option key={u} value={u}>{URGENCY[u].label}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={filterCls}>
          <option value="">כל הסטטוסים</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </select>
      </div>

      {/* טבלה */}
      {loading ? (
        <p className="text-slate-400">טוען...</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
          לא נמצאו משימות. לחצו על "צור משימה חדשה" כדי להתחיל.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3 font-medium">כותרת</th>
                <th className="p-3 font-medium">לקוח</th>
                <th className="p-3 font-medium">אחראי</th>
                <th className="p-3 font-medium">דחיפות</th>
                <th className="p-3 font-medium">סטטוס</th>
                <th className="p-3 font-medium">תאריך יעד</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => openEdit(t)}
                  className={`cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 ${isOverdue(t) ? "bg-red-50/60" : ""}`}
                >
                  <td className="p-3 font-medium text-slate-800">{t.title}</td>
                  <td className="p-3 text-slate-600">{clientName(t.client_id)}</td>
                  <td className="p-3 text-slate-600">{ownerName(t.owner_id)}</td>
                  <td className="p-3"><UrgencyBadge value={t.urgency as UrgencyKey} /></td>
                  <td className="p-3"><StatusBadge value={t.status as StatusKey} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">{formatDate(t.due_date)}</span>
                      {isOverdue(t) && <OverdueBadge />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          onSaved={() => { setDialogOpen(false); load(); }}
        />
      )}
    </div>
  );
}

const filterCls = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500";
