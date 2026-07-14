"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import type { Invoice, Client } from "@/lib/types";
import { formatMonth, currentMonth, formatDate } from "@/lib/utils";
import { Plus, Download, Trash2, FileText } from "lucide-react";

export default function InvoicesPage() {
  const { userId } = useApp();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [{ data: inv, error: invErr }, { data: cl }] = await Promise.all([
      supabase.from("invoices").select("*").order("month", { ascending: false }).order("uploaded_at", { ascending: false }),
      supabase.from("clients").select("*").order("name"),
    ]);
    if (invErr) setError(invErr.message);
    setInvoices((inv as Invoice[]) ?? []);
    setClients((cl as Client[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? "—";

  // קיבוץ לפי חודש
  const byMonth = useMemo(() => {
    const groups: Record<string, Invoice[]> = {};
    for (const inv of invoices) {
      (groups[inv.month] ??= []).push(inv);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [invoices]);

  async function download(inv: Invoice) {
    if (!inv.file_path) return;
    const { data, error } = await getSupabase().storage.from("invoices").createSignedUrl(inv.file_path, 60);
    if (error) { alert("שגיאה בהורדת הקובץ: " + error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function remove(inv: Invoice) {
    if (!confirm(`למחוק את החשבונית "${inv.description || inv.file_name}"?`)) return;
    const supabase = getSupabase();
    if (inv.file_path) await supabase.storage.from("invoices").remove([inv.file_path]);
    await supabase.from("invoices").delete().eq("id", inv.id);
    load();
  }

  const money = (n: number | null) => (n == null ? "—" : "₪" + n.toLocaleString("he-IL"));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">חשבוניות</h1>
          <p className="mt-1 text-sm text-slate-500">איסוף חשבוניות לפי חודש. לחצו על "העלה חשבונית" כדי לצרף קובץ.</p>
        </div>
        <button onClick={() => setUploadOpen(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-blue-700">
          <Plus size={18} /> העלה חשבונית
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {error} — ודא שהרצת את הקובץ <code>supabase/invoices.sql</code> ב-Supabase.
        </p>
      )}

      {loading ? (
        <p className="text-slate-400">טוען...</p>
      ) : byMonth.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
          עדיין אין חשבוניות. לחצו על "העלה חשבונית" כדי להתחיל.
        </p>
      ) : (
        <div className="space-y-6">
          {byMonth.map(([month, list]) => {
            const total = list.reduce((s, i) => s + (i.amount ?? 0), 0);
            return (
              <div key={month} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                  <h2 className="font-semibold text-slate-800">{formatMonth(month)}</h2>
                  <div className="flex gap-4 text-sm text-slate-500">
                    <span>{list.length} חשבוניות</span>
                    <span className="font-semibold text-slate-700">סה"כ {money(total)}</span>
                  </div>
                </div>
                <table className="w-full text-right text-sm">
                  <thead className="border-b border-slate-100 text-slate-400">
                    <tr>
                      <th className="p-3 font-medium">תיאור / ספק</th>
                      <th className="p-3 font-medium">לקוח</th>
                      <th className="p-3 font-medium">סכום</th>
                      <th className="p-3 font-medium">הועלה</th>
                      <th className="p-3 font-medium">קובץ</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-50 last:border-0">
                        <td className="p-3 font-medium text-slate-800">{inv.description || "—"}</td>
                        <td className="p-3 text-slate-600">{clientName(inv.client_id)}</td>
                        <td className="p-3 text-slate-600">{money(inv.amount)}</td>
                        <td className="p-3 text-slate-500">{formatDate(inv.uploaded_at.slice(0, 10))}</td>
                        <td className="p-3">
                          {inv.file_path ? (
                            <button onClick={() => download(inv)} className="flex items-center gap-1 text-blue-600 hover:underline">
                              <Download size={15} /> הורדה
                            </button>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="p-3">
                          <button onClick={() => remove(inv)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {uploadOpen && (
        <UploadDialog clients={clients} currentUserId={userId} onClose={() => setUploadOpen(false)} onDone={() => { setUploadOpen(false); load(); }} />
      )}
    </div>
  );
}

function UploadDialog({ clients, currentUserId, onClose, onDone }: {
  clients: Client[]; currentUserId: string; onClose: () => void; onDone: () => void;
}) {
  const [month, setMonth] = useState(currentMonth());
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError("");
    if (!month) return setError("יש לבחור חודש");
    if (!file) return setError("יש לבחור קובץ חשבונית");
    setSaving(true);
    const supabase = getSupabase();
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${month}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("invoices").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("invoices").insert({
        month, description: description.trim(), client_id: clientId || null,
        amount: amount ? parseFloat(amount) : null,
        file_name: file.name, file_path: path, notes: notes.trim(),
        uploaded_by: currentUserId,
      });
      if (insErr) throw insErr;
      onDone();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה בהעלאה";
      setError(msg.includes("Bucket not found") ? "ה-bucket 'invoices' לא קיים — הרץ את supabase/invoices.sql ב-Supabase." : msg);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4">
      <div className="my-16 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-800">העלאת חשבונית</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">חודש *</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">תיאור / שם ספק</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="לדוגמה: חשבונית חשמל" className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">לקוח (אופציונלי)</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={cls}>
              <option value="">— ללא —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">סכום (₪)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">קובץ חשבונית * (PDF / תמונה)</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600 hover:bg-slate-50">
              <FileText size={18} className="text-slate-400" />
              {file ? file.name : "בחר קובץ..."}
              <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
            </label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">הערות</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={cls} />
          </div>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button onClick={submit} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "מעלה..." : "העלה"}
          </button>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-600 hover:bg-slate-50">ביטול</button>
        </div>
      </div>
    </div>
  );
}

const cls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500";
