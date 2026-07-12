"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { LayoutDashboard, ListChecks, Users, Workflow, LogOut } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
  { href: "/tasks", label: "לוח משימות", icon: ListChecks },
  { href: "/clients", label: "לקוחות", icon: Users },
  { href: "/processes", label: "תהליכים", icon: Workflow },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await getSupabase().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-60 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <h1 className="text-xl font-bold text-slate-800">רף גבוה</h1>
        <p className="text-xs text-slate-500">ניהול משימות</p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <p className="mb-2 truncate px-2 text-xs text-slate-400" dir="ltr">{email}</p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={18} />
          התנתקות
        </button>
      </div>
    </aside>
  );
}
