# מערכת ניהול משימות — רף גבוה

מערכת פנימית לניהול משימות בעברית מלאה (RTL), בנויה ב-Next.js + Supabase.
גרסה בסיסית (MVP ראשוני) מוכנה להעלאה ל-GitHub ולפריסה ב-Vercel.

## מה כלול בגרסה הזו
- 🔐 התחברות והרשמה (Supabase Auth)
- 📊 דשבורד ניהולי — משימות פתוחות / בוצעו / באיחור / להיום, פילוח לפי דחיפות וסטטוס
- ✅ לוח משימות — יצירה, עריכה, פילטרים, חיפוש, מיון אוטומטי (איחור → דחיפות → דדליין)
- 👥 ניהול לקוחות
- 🔁 תצוגת תהליכים ותבניות משימות
- 🎨 עיצוב RTL נקי, צבעים לפי דחיפות וסטטוס
- 🕓 היסטוריית שינויים ומבנה מוכן ל-Google Calendar (שדה `google_calendar_event_id`)

---

## הפעלה מקומית

```bash
npm install
cp .env.local.example .env.local   # ומלא את הערכים מ-Supabase
npm run dev
```

פתח http://localhost:3000

---

## שלב 1 — הקמת Supabase

1. היכנס ל-https://supabase.com והקם פרויקט חדש.
2. פתח **SQL Editor → New query**, הדבק את כל התוכן של הקובץ [`supabase/schema.sql`](supabase/schema.sql) ולחץ **Run**.
   פעולה זו יוצרת את כל הטבלאות, ההרשאות והתהליכים לדוגמה.
3. פתח **Project Settings → API** והעתק:
   - `Project URL`  →  `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public`  →  `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. הדבק את הערכים ב-`.env.local`.
5. (מומלץ) **Authentication → Providers → Email**: כבה זמנית את "Confirm email" כדי להתחבר מיד ללא אימות מייל.

> המשתמש הראשון שנרשם במערכת הופך אוטומטית ל**מנהל מערכת**.

---

## שלב 2 — העלאה ל-GitHub

```bash
git init
git add .
git commit -m "גרסה ראשונה - מערכת ניהול משימות"
git branch -M main
git remote add origin https://github.com/<USERNAME>/<REPO>.git
git push -u origin main
```

---

## שלב 3 — פריסה ב-Vercel

1. היכנס ל-https://vercel.com והתחבר עם GitHub.
2. **Add New → Project** ובחר את המאגר.
3. תחת **Environment Variables** הוסף את שני המשתנים:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. לחץ **Deploy**. Vercel מזהה Next.js אוטומטית — אין צורך בהגדרות נוספות.

---

## מבנה הפרויקט

```
src/
  app/
    login/            דף התחברות
    (app)/            אזור מחייב-התחברות
      layout.tsx      שמירת סשן + סרגל צד
      dashboard/      דשבורד ניהולי
      tasks/          לוח משימות
      clients/        לקוחות
      processes/      תהליכים
  components/         Sidebar, TaskDialog, Badges
  lib/                supabase, types, constants, utils
supabase/schema.sql   סכמת בסיס הנתונים המלאה
```

---

## מה נדחה לשלב הבא (כפי שסוכם)
דשבורד אישי לאיש צוות, תצוגה לפי יום/לקוח/צוות, יצירת משימות אוטומטית מתהליך,
התראות מלאות, ניהול משתמשים מתקדם, הרשאות RLS לפי תפקיד, ואינטגרציות
(Google Calendar / מייל / WhatsApp). מבנה הנתונים כבר מוכן לכולם.
