import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  if (!serviceKey) {
    return NextResponse.json(
      { error: "חסר מפתח SUPABASE_SERVICE_ROLE_KEY בהגדרות השרת. הוסף אותו ל-.env.local (וב-Vercel) כדי לאפשר הוספת משתמשים." },
      { status: 500 }
    );
  }

  // 1. אימות המבקש — חייב להיות מחובר ומנהל מערכת
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const anon = createClient(url, anonKey);
  const { data: userData, error: userErr } = await anon.auth.getUser(token);
  if (userErr || !userData.user) return NextResponse.json({ error: "הרשאה נדחתה" }, { status: 401 });

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: caller } = await admin.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  if (caller?.role !== "admin") {
    return NextResponse.json({ error: "רק מנהל מערכת יכול להוסיף משתמשים" }, { status: 403 });
  }

  // 2. קריאת הנתונים
  const body = await req.json().catch(() => ({}));
  const full_name = String(body.full_name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const role = ["admin", "manager", "member"].includes(body.role) ? body.role : "member";
  const job_title = String(body.job_title ?? "").trim();

  if (!email) return NextResponse.json({ error: "יש להזין אימייל" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "הסיסמה חייבת להכיל לפחות 6 תווים" }, { status: 400 });

  // 3. יצירת המשתמש (מאושר מיד — יכול להתחבר ללא אימות מייל)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message ?? "שגיאה ביצירת המשתמש" }, { status: 400 });
  }

  // 4. עדכון הפרופיל עם התפקיד וההרשאה (upsert לביטחון מול הטריגר)
  const { error: profErr } = await admin.from("profiles").upsert({
    id: created.user.id,
    email,
    full_name,
    job_title,
    role,
    is_active: true,
  });
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, id: created.user.id });
}
