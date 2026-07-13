"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { ROLE, ROLE_OPTIONS } from "@/lib/constants";
import type { RoleKey } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { Plus } from "lucide-react";

export default function UsersPage() {
  const router = useRouter();
  const { profile } = useApp();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getSupabase().from("profiles").select("*").order("full_name");
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // הגנה: רק מנהל מערכת
  useEffect(() => {
    if (profile && profile.role !== "admin") router.replace("/dashboard");
  }, [profile, router]);

  async function updateUser(id: string, patch: Partial<Profile>) {
    await getSupabase().from("profiles").update(patch).eq("id", id);
    load();
  }

  if (loading) return <p className="text-slate-400">טוען...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ניהול משתמשים</h1>
          <p className="mt-1 text-sm text-slate-500">
            ניתן להוסיף משתמש חדש עם הרשאה ותפקיד, או לעדכן משתמשים קיימים.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-blue-700">
          <Plus size={18} /> הוסף משתמש
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="p-3 font-medium">שם מלא</th>
              <th className="p-3 font-medium">אימייל</th>
              <th className="p-3 font-medium">תפקיד</th>
              <th className="p-3 font-medium">הרשאה</th>
              <th className="p-3 font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="p-3 font-medium text-slate-800">{u.full_name || "—"}</td>
                <td className="p-3 text-slate-600" dir="ltr">{u.email}</td>
                <td className="p-3">
                  <input
                    defaultValue={u.job_title ?? ""}
                    onBlur={(e) => { if (e.target.value !== (u.job_title ?? "")) updateUser(u.id, { job_title: e.target.value }); }}
                    placeholder="תפקיד"
                    className="w-32 rounded border border-slate-200 px-2 py-1 text-sm"
                  />
                </td>
                <td className="p-3">
                  <select value={u.role} onChange={(e) => updateUser(u.id, { role: e.target.value as RoleKey })} className="rounded border border-slate-300 px-2 py-1 text-sm">
                    {(Object.keys(ROLE) as RoleKey[]).map((r) => <option key={r} value={r}>{ROLE[r]}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${u.is_active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}
                  >
                    {u.is_active ? "פעיל" : "לא פעיל"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <AddUserDialog onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function AddUserDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<RoleKey>("member");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setError("");
    if (!fullName.trim()) return setError("יש להזין שם מלא");
    if (!email.trim()) return setError("יש להזין אימייל");
    if (password.length < 6) return setError("הסיסמה חייבת להכיל לפחות 6 תווים");
    setSaving(true);
    try {
      const { data: sess } = await getSupabase().auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: fullName.trim(), email: email.trim(), password, role, job_title: jobTitle.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "שגיאה");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת המשתמש");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4">
      <div className="my-16 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-800">הוספת משתמש חדש</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">שם מלא *</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">אימייל *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={cls} dir="ltr" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">סיסמה ראשונית * (לפחות 6 תווים)</label>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={cls} dir="ltr" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">תפקיד</label>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="לדוגמה: רואה חשבון" className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">הרשאה</label>
            <select value={role} onChange={(e) => setRole(e.target.value as RoleKey)} className={cls}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE[r]}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "יוצר..." : "צור משתמש"}
          </button>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-600 hover:bg-slate-50">ביטול</button>
        </div>
      </div>
    </div>
  );
}

const cls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500";
