// תוויות וצבעים בעברית לרמות דחיפות וסטטוסים

export const URGENCY = {
  urgent:    { label: "דחוף מאוד", order: 0, badge: "bg-red-100 text-red-800 border-red-300",     dot: "bg-red-500" },
  important: { label: "חשוב",      order: 1, badge: "bg-amber-100 text-amber-800 border-amber-300", dot: "bg-amber-500" },
  routine:   { label: "שוטף",      order: 2, badge: "bg-sky-100 text-sky-800 border-sky-300",       dot: "bg-sky-500" },
} as const;

export const STATUS = {
  not_started:      { label: "לא התחיל",             badge: "bg-slate-100 text-slate-700 border-slate-300" },
  in_progress:      { label: "בטיפול",               badge: "bg-blue-100 text-blue-800 border-blue-300" },
  waiting_external: { label: "ממתין לגורם חיצוני",   badge: "bg-purple-100 text-purple-800 border-purple-300" },
  done:             { label: "בוצע",                 badge: "bg-green-100 text-green-800 border-green-300" },
} as const;

export const ROLE = {
  admin:   "מנהל מערכת",
  manager: "מנהל תיק",
  member:  "איש צוות",
} as const;

export const CLIENT_STATUS = {
  active:   "פעיל",
  inactive: "לא פעיל",
} as const;

export type UrgencyKey = keyof typeof URGENCY;
export type StatusKey = keyof typeof STATUS;
export type RoleKey = keyof typeof ROLE;

export const URGENCY_OPTIONS = (Object.keys(URGENCY) as UrgencyKey[]);
export const STATUS_OPTIONS = (Object.keys(STATUS) as StatusKey[]);
export const ROLE_OPTIONS = (Object.keys(ROLE) as RoleKey[]);
