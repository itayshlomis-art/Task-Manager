"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function creds() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "חסרים משתני סביבה של Supabase. הגדר NEXT_PUBLIC_SUPABASE_URL ו-NEXT_PUBLIC_SUPABASE_ANON_KEY בקובץ .env.local"
    );
  }
  return { url, key };
}

// לקוח Supabase לצד הדפדפן (singleton)
let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (client) return client;
  const { url, key } = creds();
  client = createBrowserClient(url, key);
  return client;
}

// לקוח זמני שאינו שומר session — משמש להרשמת משתמש חדש בלי לנתק את המנהל המחובר
export function createSignupClient() {
  const { url, key } = creds();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
