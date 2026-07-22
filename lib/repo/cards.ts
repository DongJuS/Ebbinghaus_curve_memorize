import { getDb } from "@/lib/db";
import type { Card, Difficulty } from "@/lib/types";

export function listCards(deckId: number): Card[] {
  return getDb()
    .prepare("SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at DESC")
    .all(deckId) as Card[];
}

export function getCard(id: number): Card | undefined {
  return getDb().prepare("SELECT * FROM cards WHERE id = ?").get(id) as
    | Card
    | undefined;
}

export interface NewCardInput {
  front: string;
  back?: string;
  note?: string;
  difficulty?: Difficulty;
  parent_id?: number | null;
}

export function createCard(deckId: number, input: NewCardInput): Card {
  const info = getDb()
    .prepare(
      `INSERT INTO cards (deck_id, parent_id, front, back, note, difficulty)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      deckId,
      input.parent_id ?? null,
      input.front,
      input.back ?? "",
      input.note ?? "",
      input.difficulty ?? "medium",
    );
  return getCard(Number(info.lastInsertRowid))!;
}

export interface UpdateCardInput {
  front?: string;
  back?: string;
  note?: string;
  difficulty?: Difficulty;
  parent_id?: number | null;
}

export function updateCard(
  id: number,
  input: UpdateCardInput,
): Card | undefined {
  const current = getCard(id);
  if (!current) return undefined;
  getDb()
    .prepare(
      `UPDATE cards
          SET front = ?, back = ?, note = ?, difficulty = ?, parent_id = ?
        WHERE id = ?`,
    )
    .run(
      input.front ?? current.front,
      input.back ?? current.back,
      input.note ?? current.note,
      input.difficulty ?? current.difficulty,
      input.parent_id !== undefined ? input.parent_id : current.parent_id,
      id,
    );
  return getCard(id);
}

export function deleteCard(id: number): void {
  getDb().prepare("DELETE FROM cards WHERE id = ?").run(id);
}
