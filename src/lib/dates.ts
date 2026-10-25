import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { t } from "../i18n/en";
import type { Task } from "../api/types";

/** Weeks start on Monday everywhere in the app. */
const WEEK = { weekStartsOn: 1 } as const;

/** A day as `YYYY-MM-DD` (the format stored in the database). */
export const toDayString = (date: Date) => format(date, "yyyy-MM-dd");
export const todayString = () => toDayString(new Date());

export interface TaskGroups {
  overdue: Task[];
  today: Task[];
  thisWeek: Task[];
  later: Task[];
  noDate: Task[];
}

/** Sorts tasks into the Today screen groups. "This week" means after today, until Sunday. */
export function groupTasksByDue(tasks: Task[], now: Date = new Date()): TaskGroups {
  const today = toDayString(now);
  const weekEnd = toDayString(endOfWeek(now, WEEK));
  const groups: TaskGroups = { overdue: [], today: [], thisWeek: [], later: [], noDate: [] };
  for (const task of tasks) {
    const due = task.dueDate;
    if (!due) groups.noDate.push(task);
    else if (due < today) groups.overdue.push(task);
    else if (due === today) groups.today.push(task);
    else if (due <= weekEnd) groups.thisWeek.push(task);
    else groups.later.push(task);
  }
  return groups;
}

/** Short human text for a deadline, for example "Tomorrow", "Fri 31 Oct", "2 days overdue". */
export function dueLabel(dueDate: string, now: Date = new Date()): string {
  const days = differenceInCalendarDays(parseISO(dueDate), now);
  if (days < 0) return t.due.overdue(-days);
  if (days === 0) return t.due.today;
  if (days === 1) return t.due.tomorrow;
  return format(parseISO(dueDate), days < 7 ? "EEE d MMM" : "d MMM yyyy");
}

export const isOverdue = (dueDate: string | null, now: Date = new Date()) =>
  dueDate !== null && dueDate < toDayString(now);

export interface MonthGrid {
  /** First and last day shown (they can be in the previous or next month). */
  from: string;
  to: string;
  /** 5 or 6 weeks of 7 days. */
  weeks: { day: string; inMonth: boolean }[][];
}

/** The days to show for a month view, Monday to Sunday. */
export function buildMonthGrid(month: Date): MonthGrid {
  const first = startOfWeek(startOfMonth(month), WEEK);
  const last = endOfWeek(endOfMonth(month), WEEK);
  const weeks: MonthGrid["weeks"] = [];
  for (let day = first; day <= last; day = addDays(day, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(day, i);
        return { day: toDayString(d), inMonth: d.getMonth() === month.getMonth() };
      }),
    );
  }
  return { from: toDayString(first), to: toDayString(last), weeks };
}

export const formatDay = (day: string, pattern = "EEE d MMM") => format(parseISO(day), pattern);
