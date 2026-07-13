"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { ROLE } from "@/lib/constants";
import {
  LayoutDashboard, User, ListChecks, CalendarDays, UsersRound,
  Building2, Workflow, Settings, LogOut,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "דשבורד ניהולי", icon: LayoutDashboard },
  { href: "/my", label: "הדשבורד שלי", icon: User },
  { href: "/tasks", label: "לוח משימות", icon: ListChecks },
  { href: "/day", label: "תצוגה יומית", icon: CalendarDays },
  { href: "/team", label: "לפי איש צוות", icon: UsersRound },
  { href: "/clients", label: "לקוחות", icon: Building2 },
  { href: "/processes", label: "תהליכים", icon: Workflow },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useApp();

  async function logout() {
    await getSupabase().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const nav = [...NAV];
  if (profile?.role === "admin") nav.push({ href: "/users", label: "ניהול משתמשים", icon: Settings });

  return (
    <aside className="flex w-60 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <h1 className="text-xl font-bold text-slate-800">רף גבוה</h1>
        <p className="text-xs text-slate-500">ניהול משימות</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-auto p-3">
        {nav.map(({ href, label, icon: Icon }) => {
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
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-medium text-slate-700">{profile?.full_name || "משתמש"}</p>
          <p className="text-xs text-slate-400">{profile ? ROLE[profile.role] : ""}</p>
        </div>
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
