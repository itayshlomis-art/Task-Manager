"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useData } from "@/lib/useData";
import { useApp } from "@/lib/app-context";
import { URGENCY, STATUS, URGENCY_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import type { Task } from "@/lib/types";
import { isOverdue, sortTasks, todayISO } from "@/lib/utils";
import TaskTable from "@/components/TaskTable";
import TaskDialog from "@/components/TaskDialog";
import { Plus } from "lucide-react";

type SortKey = "smart" | "due" | "created" | "urgency";

function TasksInner() {
  const sp = useSearchParams();
  const { userId } = useApp();
  const { tasks, clients, processes, profiles, loading, reload, clientName, ownerName } = useData();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const [fClient, setFClient] = useState(sp.get("client") ?? "");
  const [fOwner, setFOwner] = useState(sp.get("owner") ?? "");
  const [fUrgency, setFUrgency] = useState(sp.get("urgency") ?? "");
  const [fStatus, setFStatus] = useState(sp.get("status") && !["open", "done"].includes(sp.get("status")!) ? sp.get("status")! : "");
  const [special, setSpecial] = useState(sp.get("filter") ?? (sp.get("status") === "open" ? "open" : sp.get("status") === "done" ? "done" : ""));
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("smart");

  // פתיחת משימה ספציפית מתוך קישור ?open=<id>
  useEffect(() => {
    const openId = sp.get("open");
    if (openId && tasks.length) {
      const t = tasks.find((x) => x.id === openId);
      if (t) { setEditing(t); setDialogOpen(true); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (fClient) list = list.filter((t) => t.client_id === fClient);
    if (fOwner) list = list.filter((t) => t.owner_id === fOwner);
    if (fUrgency) list = list.filter((t) => t.urgency === fUrgency);
    if (fStatus) list = list.filter((t) => t.status === fStatus);
    if (special === "open") list = list.filter((t) => t.status !== "done");
    if (special === "done") list = list.filter((t) => t.status === "done");
    if (special === "overdue") list = list.filter((t) => isOverdue(t));
    if (special === "today") list = list.filter((t) => t.due_date === todayISO() && t.status !== "done");
    if (search.trim()) {
      const q = search.trim();
      list = list.filter((t) => t.title.includes(q) || (t.description ?? "").includes(q));
    }

    if (sort === "smart") return sortTasks(list);
    if (sort === "due") return [...list].sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
    if (sort === "created") return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === "urgency") return [...list].sort((a, b) => URGENCY[a.urgency].order - URGENCY[b.urgency].order);
    return list;
  }, [tasks, fClient, fOwner, fUrgency, fStatus, special, search, sort]);

  function openNew() { setEditing(null); setDialogOpen(true); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">לוח משימות</h1>
        <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-blue-700">
          <Plus size={18} /> צור משימה חדשה
        </button>
      </div>

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
        <select value={special} onChange={(e) => setSpecial(e.target.value)} className={filterCls}>
          <option value="">הכל</option>
          <option value="open">פתוחות</option>
          <option value="today">להיום</option>
          <option value="overdue">באיחור</option>
          <option value="done">בוצעו</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={filterCls}>
          <option value="smart">מיון חכם (איחור→דחיפות→יעד)</option>
          <option value="due">תאריך יעד</option>
          <option value="urgency">דחיפות</option>
          <option value="created">תאריך יצירה</option>
        </select>
      </div>

      {loading ? (
        <p className="text-slate-400">טוען...</p>
      ) : (
        <>
          <p className="text-sm text-slate-500">{filtered.length} משימות</p>
          <TaskTable
            tasks={filtered}
            clientName={clientName}
            ownerName={ownerName}
            onRowClick={(t) => { setEditing(t); setDialogOpen(true); }}
            emptyText='לא נמצאו משימות. לחצו על "צור משימה חדשה".'
          />
        </>
      )}

      {dialogOpen && (
        <TaskDialog
          task={editing}
          clients={clients}
          processes={processes}
          profiles={profiles}
          currentUserId={userId}
          onClose={() => setDialogOpen(false)}
          onSaved={() => { setDialogOpen(false); reload(); }}
        />
      )}
    </div>
  );
}

const filterCls = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500";

export default function TasksPage() {
  return (
    <Suspense fallback={<p className="text-slate-400">טוען...</p>}>
      <TasksInner />
    </Suspense>
  );
}
