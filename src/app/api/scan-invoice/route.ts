import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

// סריקת חשבונית עם Claude — מחלץ ספק, סכום ותאריך מקובץ תמונה/PDF
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "חסר מפתח ANTHROPIC_API_KEY בהגדרות השרת. הוסף אותו ל-.env.local (וב-Vercel) כדי להפעיל סריקת AI." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const data = String(body.data ?? "");
  const mediaType = String(body.mediaType ?? "");
  if (!data || !mediaType) {
    return NextResponse.json({ error: "לא התקבל קובץ לסריקה" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const prompt =
    'זהי חשבונית. חלץ ממנה: שם הספק/העסק, סכום החשבונית הכולל (מספר בלבד), ותאריך החשבונית. ' +
    'החזר אך ורק JSON תקין במבנה: {"supplier": string, "amount": number|null, "date": "YYYY-MM-DD"|null}. ' +
    "ללא טקסט נוסף, ללא הסברים, ללא סימוני קוד.";

  const fileBlock =
    mediaType === "application/pdf"
      ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data } }
      : {
          type: "image" as const,
          source: { type: "base64" as const, media_type: mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp", data },
        };

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 512,
      messages: [{ role: "user", content: [fileBlock, { type: "text", text: prompt }] }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
    const jsonStr = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonStr) as { supplier?: string; amount?: number | null; date?: string | null };

    const date = typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null;
    const month = date ? date.slice(0, 7) : null;

    return NextResponse.json({
      ok: true,
      supplier: parsed.supplier ?? "",
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      date,
      month,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה בסריקת החשבונית" },
      { status: 500 }
    );
  }
}
