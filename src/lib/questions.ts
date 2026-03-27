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
    deep: "Deep",
    romantic: "Romantic",
    playful: "Playful",
    future: "Future",
    memory: "Memory",
    wildcard: "Wildcard",
  };
  return labels[category];
}

export function getCategoryColor(category: QuestionCategory): string {
  const colors: Record<QuestionCategory, string> = {
    deep: "text-[var(--status-info)] bg-[var(--status-info-container)]",
    romantic: "text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)]",
    playful: "text-[var(--status-warning)] bg-[var(--status-warning-container)]",
    future: "text-[var(--md-sys-color-secondary)] bg-[var(--md-sys-color-secondary-container)]",
    memory: "text-[var(--status-success)] bg-[var(--status-success-container)]",
    wildcard: "text-[#7b5f58] bg-[#f3e8e2]",
  };
  return colors[category];
}
