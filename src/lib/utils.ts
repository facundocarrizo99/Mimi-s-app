import { format, isToday, isYesterday, parseISO } from "date-fns";

export function formatDate(dateString: string): string {
  const date = parseISO(dateString);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

export function formatDateShort(dateString: string): string {
  return format(parseISO(dateString), "MMM d");
}

export function getTodayDate(timezone: string = "America/New_York"): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export function getPoeticsLoadingMessage(): string {
  const messages = [
    "Loading\u2026",
    "One sec\u2026",
    "Getting things ready\u2026",
    "Almost there\u2026",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getStreakMessage(count: number): string {
  if (count === 0) return "Start your streak today.";
  if (count === 1) return "Day one. Nice.";
  if (count < 7) return `${count} days in a row.`;
  if (count < 14) return `${count} day streak!`;
  if (count < 30) return `${count} days and counting.`;
  if (count < 100) return `${count} days. Not bad at all.`;
  return `${count} days. Impressive.`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
