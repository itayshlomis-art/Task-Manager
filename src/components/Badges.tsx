import { URGENCY, STATUS } from "@/lib/constants";
import type { UrgencyKey, StatusKey } from "@/lib/constants";

export function UrgencyBadge({ value }: { value: UrgencyKey }) {
  const u = URGENCY[value];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${u.badge}`}>
      <span className={`h-2 w-2 rounded-full ${u.dot}`} />
      {u.label}
    </span>
  );
}

export function StatusBadge({ value }: { value: StatusKey }) {
  const s = STATUS[value];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${s.badge}`}>
      {s.label}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-red-400 bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
      באיחור
    </span>
  );
}
