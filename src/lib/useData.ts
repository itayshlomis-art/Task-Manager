"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import type { Task, Client, Process, Profile } from "./types";

// טעינת כל נתוני הבסיס הדרושים לתצוגות (משימות, לקוחות, תהליכים, אנשי צוות)
export function useData(opts: { includeDrafts?: boolean } = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    let taskQuery = supabase.from("tasks").select("*");
    if (!opts.includeDrafts) taskQuery = taskQuery.eq("is_draft", false);
    const [{ data: t }, { data: c }, { data: pr }, { data: pf }] = await Promise.all([
      taskQuery,
      supabase.from("clients").select("*").order("name"),
      supabase.from("processes").select("*").order("name"),
      supabase.from("profiles").select("*").order("full_name"),
    ]);
    setTasks((t as Task[]) ?? []);
    setClients((c as Client[]) ?? []);
    setProcesses((pr as Process[]) ?? []);
    setProfiles((pf as Profile[]) ?? []);
    setLoading(false);
  }, [opts.includeDrafts]);

  useEffect(() => { reload(); }, [reload]);

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? "—";
  const ownerName = (id: string | null) => {
    const p = profiles.find((x) => x.id === id);
    return p?.full_name || p?.email || "—";
  };

  return { tasks, clients, processes, profiles, loading, reload, clientName, ownerName };
}
