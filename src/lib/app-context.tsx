"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import type { Profile } from "./types";

type AppCtx = {
  userId: string;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AppCtx>({ userId: "", profile: null, refreshProfile: async () => {} });

export function AppProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);

  async function refreshProfile() {
    const { data } = await getSupabase().from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile((data as Profile) ?? null);
  }

  useEffect(() => {
    if (userId) refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return <Ctx.Provider value={{ userId, profile, refreshProfile }}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
