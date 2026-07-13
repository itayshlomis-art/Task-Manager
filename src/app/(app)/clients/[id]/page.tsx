"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { CLIENT_STATUS } from "@/lib/constants";
import type { Client, Process, Profile, Task } from "@/lib/types";
import { isOverdue, sortTasks } from "@/lib/utils";
import { addProcessToClient } from "@/lib/processes";
import TaskTable from "@/components/TaskTable";
import TaskDialog from "@/components/TaskDialog";
import { Plus, ArrowRight } from "lucide-react";

type ClientProcess = { id: string; process_name: string; status: string; created_at: string };

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useApp();

  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clientProcesses, setClientProcesses] = useState<ClientProcess[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddProcess, setShowAddProcess] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [{ data: c }, { data: t }, { data: cp }, { data: pr }, { data: pf }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
      supabase.from("tasks").select("*").eq("client_id", id).eq("is_draft", false),
      supabase.from("client_processes").select("id,process_name,status,created_at").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("processes").select("*").order("name"),
      supabase.from("profiles").select("*").order("full_name"),
    ]);
    setClient((c as Client) ?? null);
    setTasks((t as Task[]) ?? []);
    setClientProcesses((cp as ClientProcess[]) ?? []);
    setProcesses((pr as Process[]) ?? []);
    setProfiles((pf as Profile[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-slate-400">טוען...</p>;
  if (!client) return <p className="text-slate-400">לקוח לא נמצא</p>;

  const clientName = () => client.name;
  const ownerName = (oid: string | null) => {
    const p = profiles.find((x) => x.id === oid);
    return p?.full_name || p?.email || "—";
  };
  const managerName = profiles.find((p) => p.id === client.account_manager_id)?.full_name || "—";

  const openTasks = sortTasks(tasks.filter((t) => t.status !== "done"));
  const doneTasks = tasks.filter((t) => t.status === "done");
  const overdue = sortTasks(tasks.filter((t) => isOverdue(t)));
  const rowClick = (t: Task) => { setEditing(t); setDialogOpen(true); };

  return (
    <div className="space-y-8">
      <button onClick={() => router.push("/clients")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowRight size={16} /> חזרה ללקוחות
      </button>

      {/* כותרת לקוח */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{client.name}</h1>
            <p className="mt-1 text-sm text-slate-500">מנהל תיק: {managerName}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${client.status === "active" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>
            {CLIENT_STATUS[client.status]}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <Info label="איש קשר" value={client.contact_name || "—"} />
          <Info label="טלפון" value={client.phone || "—"} />
          <Info label="אימייל" value={client.email || "—"} />
          <Info label="משימות פתוחות" value={String(openTasks.length)} />
        </div>
        {client.notes && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <span className="font-medium">הערות: </span>{client.notes}
          </div>
        )}
      </div>

      {/* תהליכים */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">תהליכים פעילים</h2>
          <button onClick={() => setShowAddProcess(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={16} /> הוסף תהליך
          </button>
        </div>
        {clientProcesses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">אין תהליכים פעילים</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {clientProcesses.map((cp) => (
              <span key={cp.id} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                {cp.process_name}
              </span>
            ))}
          </div>
        )}
      </section>

      <Section title="משימות פתוחות"><TaskTable tasks={openTasks} clientName={clientName} ownerName={ownerName} onRowClick={rowClick} hideClient emptyText="אין משימות פתוחות" /></Section>
      {overdue.length > 0 && <Section title="משימות באיחור"><TaskTable tasks={overdue} clientName={clientName} ownerName={ownerName} onRowClick={rowClick} hideClient /></Section>}
      <Section title="משימות שבוצעו"><TaskTable tasks={doneTasks} clientName={clientName} ownerName={ownerName} onRowClick={rowClick} hideClient emptyText="אין משימות שבוצעו" /></Section>

      {showAddProcess && (
        <AddProcessDialog
          clientId={client.id}
          defaultOwner={client.account_manager_id}
          processes={processes}
          profiles={profiles}
          currentUserId={userId}
          onClose={() => setShowAddProcess(false)}
          onDone={() => { setShowAddProcess(false); load(); }}
        />
      )}
      {dialogOpen && (
        <TaskDialog task={editing} clients={[client]} processes={processes} profiles={profiles} currentUserId={userId}
          defaultClientId={client.id} onClose={() => setDialogOpen(false)} onSaved={() => { setDialogOpen(false); load(); }} />
      )}
    </div>
  );
}

function AddProcessDialog({ clientId, defaultOwner, processes, profiles, currentUserId, onClose, onDone }: {
  clientId: string; defaultOwner: string | null; processes: Process[]; profiles: Profile[]; currentUserId: string; onClose: () => void; onDone: () => void;
}) {
  const [processId, setProcessId] = useState("");
  const [ownerId, setOwnerId] = useState(defaultOwner ?? "");
  const [mode, setMode] = useState<"active" | "draft">("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    const process = processes.find((p) => p.id === processId);
    if (!process) return setError("יש לבחור תהליך");
    setSaving(true);
    try {
      const { count } = await addProcessToClient({ clientId, process, ownerId: ownerId || null, createdBy: currentUserId, isDraft: mode === "draft" });
      alert(`נוצרו ${count} משימות מהתהליך "${process.name}"${mode === "draft" ? " (כטיוטות)" : ""}`);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4">
      <div className="my-16 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-800">הוספת תהליך ללקוח</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">תהליך</label>
            <select value={processId} onChange={(e) => setProcessId(e.target.value)} className={cls}>
              <option value="">— בחר תהליך —</option>
              {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">אחראי ראשי למשימות</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={cls}>
              <option value="">— לא משויך —</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">אופן היצירה</label>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                <input type="radio" checked={mode === "active"} onChange={() => setMode("active")} />
                יצירה כמשימות פעילות
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                <input type="radio" checked={mode === "draft"} onChange={() => setMode("draft")} />
                יצירה כטיוטות לבדיקה ואישור
              </label>
            </div>
          </div>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button onClick={submit} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "יוצר..." : "צור משימות"}
          </button>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-600 hover:bg-slate-50">ביטול</button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-400">{label}</p><p className="text-slate-700">{value}</p></div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3"><h2 className="font-semibold text-slate-700">{title}</h2>{children}</div>;
}

const cls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500";
