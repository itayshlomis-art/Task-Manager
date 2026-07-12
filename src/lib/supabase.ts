"use client";

import { createBrowserClient } from "@supabase/ssr";

// לקוח Supabase לצד הדפדפן (singleton)
let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "חסרים משתני סביבה של Supabase. הגדר NEXT_PUBLIC_SUPABASE_URL ו-NEXT_PUBLIC_SUPABASE_ANON_KEY בקובץ .env.local"
    );
  }
  client = createBrowserClient(url, key);
  return client;
}
