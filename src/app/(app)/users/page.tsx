"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { ROLE } from "@/lib/constants";
import type { RoleKey } from "@/lib/constants";
import type { Profile } from "@/lib/types";

export default function UsersPage() {
  const router = useRouter();
  const { profile } = useApp();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ניהול משתמשים</h1>
        <p className="mt-1 text-sm text-slate-500">
          משתמשים חדשים נרשמים דרך מסך ההרשמה. כאן ניתן לעדכן תפקיד, הרשאה וסטטוס פעילות.
        </p>
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
    </div>
  );
}
