import type { FocusSegment } from "../types";

export function startOfWeek(date: Date) {
  const start = new Date(date);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

export function weekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    return day;
  });
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function segmentsForDay(segments: FocusSegment[], day: Date) {
  return segments
    .filter((segment) => isSameDay(new Date(segment.startedAt), day))
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
}

export function formatWeekLabel(weekStart: Date, weekOffset: number) {
  if (weekOffset === 0) return "This week";
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmt = (date: Date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}
