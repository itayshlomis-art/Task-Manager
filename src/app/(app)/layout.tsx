"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { AppProvider } from "@/lib/app-context";
import Sidebar from "@/components/Sidebar";
import NotificationsBell from "@/components/NotificationsBell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
      } else {
        setUserId(data.session.user.id);
        setChecking(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (checking || !userId) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">טוען...</div>;
  }

  return (
    <AppProvider userId={userId}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-3">
            <div />
            <NotificationsBell />
          </header>
          <main className="flex-1 overflow-auto p-8">{children}</main>
        </div>
      </div>
    </AppProvider>
  );
}
