export type Difficulty = "easy" | "medium" | "hard";
export type CardState = "new" | "learning" | "review";
export type Rating = "again" | "hard" | "good" | "easy";

export interface Deck {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface DeckWithStats extends Deck {
  card_count: number;
  due_count: number;
}

export interface Card {
  id: number;
  deck_id: number;
  parent_id: number | null;
  front: string;
  back: string;
  note: string;
  difficulty: Difficulty;
  state: CardState;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  learning_step: number;
  due_at: string;
  last_reviewed_at: string | null;
  created_at: string;
}
