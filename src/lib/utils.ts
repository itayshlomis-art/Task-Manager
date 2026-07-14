import { URGENCY } from "./constants";
import type { Task } from "./types";

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// האם המשימה באיחור (עברה דדליין ולא בוצעה)
export function isOverdue(task: Pick<Task, "due_date" | "status">): boolean {
  if (!task.due_date || task.status === "done") return false;
  return task.due_date < todayISO();
}

// מיון: משימות באיחור למעלה, אחר כך לפי דחיפות, אחר כך לפי דדליין
export function sortTasks<T extends Pick<Task, "due_date" | "status" | "urgency">>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const ao = isOverdue(a) ? 0 : 1;
    const bo = isOverdue(b) ? 0 : 1;
    if (ao !== bo) return ao - bo;

    const au = URGENCY[a.urgency].order;
    const bu = URGENCY[b.urgency].order;
    if (au !== bu) return au - bu;

    const ad = a.due_date ?? "9999-12-31";
    const bd = b.due_date ?? "9999-12-31";
    return ad.localeCompare(bd);
  });
}

const HE_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

// 'YYYY-MM' → 'יולי 2026'
export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const idx = parseInt(m) - 1;
  if (isNaN(idx) || !HE_MONTHS[idx]) return ym;
  return `${HE_MONTHS[idx]} ${y}`;
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function formatDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}
