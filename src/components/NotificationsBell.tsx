"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { Bell } from "lucide-react";

type Notif = { id: string; message: string; is_read: boolean; created_at: string; task_id: string | null };

export default function NotificationsBell() {
  const { userId } = useApp();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    if (!userId) return;
    const { data } = await getSupabase()
      .from("notifications")
      .select("id,message,is_read,created_at,task_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Notif[]) ?? []);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = items.filter((i) => !i.is_read).length;

  async function markAllRead() {
    await getSupabase().from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open && unread) markAllRead(); }}
        className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-3 font-semibold text-slate-700">התראות</div>
          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400">אין התראות</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`border-b border-slate-50 p-3 text-sm ${n.is_read ? "text-slate-500" : "bg-blue-50/50 text-slate-800"}`}>
                  {n.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
