import type { QuestionCategory } from "@/types/database";

/**
 * Daily question structure:
 *   Position 1: deep
 *   Position 2: deep
 *   Position 3: romantic
 *   Position 4: playful
 *   Position 5: future
 *   Position 6: memory
 *   Position 7: wildcard
 */
export const DAILY_STRUCTURE: QuestionCategory[] = [
  "deep",
  "deep",
  "romantic",
  "playful",
  "future",
  "memory",
  "wildcard",
];

export function getCategoryLabel(category: QuestionCategory): string {
  const labels: Record<QuestionCategory, string> = {
    deep: "Deep & Vulnerable",
    romantic: "Romantic",
    playful: "Playful",
    future: "Future Dreams",
    memory: "Memory Lane",
    wildcard: "Wildcard",
  };
  return labels[category];
}

export function getCategoryColor(category: QuestionCategory): string {
  const colors: Record<QuestionCategory, string> = {
    deep: "text-purple-700 bg-lavender",
    romantic: "text-rose-700 bg-rose/20",
    playful: "text-amber-700 bg-amber-50",
    future: "text-sky-700 bg-dusk/50",
    memory: "text-emerald-700 bg-emerald-50",
    wildcard: "text-violet-700 bg-violet-50",
  };
  return colors[category];
}
