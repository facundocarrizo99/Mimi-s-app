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
    "Gathering today's questions\u2026",
    "Love takes a moment.",
    "Preparing something meaningful\u2026",
    "Your words are finding their way\u2026",
    "A quiet space is being made\u2026",
    "Wrapping today in warmth\u2026",
    "Something gentle is arriving\u2026",
    "Opening today's chapter\u2026",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getStreakMessage(count: number): string {
  if (count === 0) return "Start your streak today.";
  if (count === 1) return "You showed up for love today.";
  if (count < 7) return `${count} days of choosing each other.`;
  if (count < 14) return `${count} days in a row. Beautiful.`;
  if (count < 30) return `${count} days of showing up for love.`;
  if (count < 100) return `${count} days. This is something special.`;
  return `${count} days. You've built something rare.`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
