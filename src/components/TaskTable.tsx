"use client";

import type { Task } from "@/lib/types";
import type { UrgencyKey, StatusKey } from "@/lib/constants";
import { UrgencyBadge, StatusBadge, OverdueBadge } from "./Badges";
import { isOverdue, formatDate } from "@/lib/utils";

type Props = {
  tasks: Task[];
  clientName: (id: string | null) => string;
  ownerName: (id: string | null) => string;
  onRowClick?: (t: Task) => void;
  emptyText?: string;
  hideClient?: boolean;
  hideOwner?: boolean;
};

export default function TaskTable({ tasks, clientName, ownerName, onRowClick, emptyText, hideClient, hideOwner }: Props) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
        {emptyText ?? "אין משימות להצגה"}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-right text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            <th className="p-3 font-medium">כותרת</th>
            {!hideClient && <th className="p-3 font-medium">לקוח</th>}
            {!hideOwner && <th className="p-3 font-medium">אחראי</th>}
            <th className="p-3 font-medium">דחיפות</th>
            <th className="p-3 font-medium">סטטוס</th>
            <th className="p-3 font-medium">תאריך יעד</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr
              key={t.id}
              onClick={() => onRowClick?.(t)}
              className={`border-b border-slate-100 transition ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""} ${isOverdue(t) ? "bg-red-50/60" : ""}`}
            >
              <td className="p-3 font-medium text-slate-800">{t.title}</td>
              {!hideClient && <td className="p-3 text-slate-600">{clientName(t.client_id)}</td>}
              {!hideOwner && <td className="p-3 text-slate-600">{ownerName(t.owner_id)}</td>}
              <td className="p-3"><UrgencyBadge value={t.urgency as UrgencyKey} /></td>
              <td className="p-3"><StatusBadge value={t.status as StatusKey} /></td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">{formatDate(t.due_date)}</span>
                  {isOverdue(t) && <OverdueBadge />}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
