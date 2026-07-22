import { getDb } from "@/lib/db";
import type { Deck, DeckWithStats } from "@/lib/types";

export function listDecks(): DeckWithStats[] {
  return getDb()
    .prepare(
      `SELECT d.*,
              (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) AS card_count,
              (SELECT COUNT(*) FROM cards c
                 WHERE c.deck_id = d.id AND c.due_at <= datetime('now')) AS due_count
         FROM decks d
        ORDER BY d.created_at DESC`,
    )
    .all() as DeckWithStats[];
}

export function getDeck(id: number): Deck | undefined {
  return getDb().prepare("SELECT * FROM decks WHERE id = ?").get(id) as
    | Deck
    | undefined;
}

export function createDeck(name: string, description = ""): Deck {
  const info = getDb()
    .prepare("INSERT INTO decks (name, description) VALUES (?, ?)")
    .run(name, description);
  return getDeck(Number(info.lastInsertRowid))!;
}

export function updateDeck(
  id: number,
  fields: { name?: string; description?: string },
): Deck | undefined {
  const current = getDeck(id);
  if (!current) return undefined;
  const name = fields.name ?? current.name;
  const description = fields.description ?? current.description;
  getDb()
    .prepare("UPDATE decks SET name = ?, description = ? WHERE id = ?")
    .run(name, description, id);
  return getDeck(id);
}

export function deleteDeck(id: number): void {
  getDb().prepare("DELETE FROM decks WHERE id = ?").run(id);
}
