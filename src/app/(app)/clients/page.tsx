"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { CLIENT_STATUS } from "@/lib/constants";
import type { Client, Profile } from "@/lib/types";
import { Plus } from "lucide-react";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("clients").select("*").order("name"),
      supabase.from("profiles").select("*").order("full_name"),
    ]);
    setClients((c as Client[]) ?? []);
    setProfiles((p as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const managerName = (id: string | null) => {
    const p = profiles.find((x) => x.id === id);
    return p?.full_name || p?.email || "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">לקוחות</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-blue-700">
          <Plus size={18} /> לקוח חדש
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">טוען...</p>
      ) : clients.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
          אין עדיין לקוחות. הוסיפו לקוח ראשון.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3 font-medium">שם לקוח</th>
                <th className="p-3 font-medium">איש קשר</th>
                <th className="p-3 font-medium">טלפון</th>
                <th className="p-3 font-medium">מנהל תיק</th>
                <th className="p-3 font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="p-3 font-medium text-slate-800">{c.name}</td>
                  <td className="p-3 text-slate-600">{c.contact_name || "—"}</td>
                  <td className="p-3 text-slate-600" dir="ltr">{c.phone || "—"}</td>
                  <td className="p-3 text-slate-600">{managerName(c.account_manager_id)}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "active" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>
                      {CLIENT_STATUS[c.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <ClientDialog profiles={profiles} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function ClientDialog({ profiles, onClose, onSaved }: { profiles: Profile[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [manager, setManager] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return setError("יש להזין שם לקוח");
    setSaving(true);
    const { error } = await getSupabase().from("clients").insert({
      name: name.trim(), contact_name: contact, phone, email,
      account_manager_id: manager || null, notes, status: "active",
    });
    if (error) { setError(error.message); setSaving(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-800">לקוח חדש</h2>
        <div className="space-y-3">
          <input placeholder="שם לקוח / חברה *" value={name} onChange={(e) => setName(e.target.value)} className={cls} />
          <input placeholder="איש קשר" value={contact} onChange={(e) => setContact(e.target.value)} className={cls} />
          <input placeholder="טלפון" value={phone} onChange={(e) => setPhone(e.target.value)} className={cls} dir="ltr" />
          <input placeholder="אימייל" value={email} onChange={(e) => setEmail(e.target.value)} className={cls} dir="ltr" />
          <select value={manager} onChange={(e) => setManager(e.target.value)} className={cls}>
            <option value="">— מנהל תיק ראשי —</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
          </select>
          <textarea placeholder="הערות כלליות" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={cls} />
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
