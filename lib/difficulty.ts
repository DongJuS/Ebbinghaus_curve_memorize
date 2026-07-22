import type { Difficulty } from "@/lib/types";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
};

export const DIFFICULTY_OPTIONS: Difficulty[] = ["easy", "medium", "hard"];

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "bg-green-500/15 text-green-700 dark:text-green-400",
  medium: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  hard: "bg-red-500/15 text-red-700 dark:text-red-400",
};
