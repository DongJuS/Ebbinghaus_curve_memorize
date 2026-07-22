import { getDb } from "@/lib/db";
import { getCard } from "@/lib/repo/cards";
import { schedule } from "@/lib/srs";
import type { Card, Rating } from "@/lib/types";

export interface DueCard extends Card {
  deck_name: string;
}

/** 지금 복습해야 하는 카드(due_at <= now)를 due_at 오름차순으로 반환. */
export function getDueCards(opts: { deckId?: number; limit?: number } = {}): DueCard[] {
  const { deckId, limit } = opts;
  const clauses = ["c.due_at <= datetime('now')"];
  const params: (number | string)[] = [];
  if (deckId != null) {
    clauses.push("c.deck_id = ?");
    params.push(deckId);
  }
  let sql = `SELECT c.*, d.name AS deck_name
               FROM cards c
               JOIN decks d ON d.id = c.deck_id
              WHERE ${clauses.join(" AND ")}
              ORDER BY c.due_at ASC`;
  if (limit != null) {
    sql += " LIMIT ?";
    params.push(limit);
  }
  return getDb().prepare(sql).all(...params) as DueCard[];
}

export function countDueCards(deckId?: number): number {
  const sql =
    "SELECT COUNT(*) AS n FROM cards WHERE due_at <= datetime('now')" +
    (deckId != null ? " AND deck_id = ?" : "");
  const row = (
    deckId != null
      ? getDb().prepare(sql).get(deckId)
      : getDb().prepare(sql).get()
  ) as { n: number };
  return row.n;
}

export interface ReviewOutcome {
  card: Card;
  next_interval: number;
  due_at: string;
}

/** 카드에 평가를 적용해 스케줄을 갱신하고 복습 이력을 기록한다. */
export function applyReview(
  cardId: number,
  rating: Rating,
  now: Date = new Date(),
): ReviewOutcome | undefined {
  const card = getCard(cardId);
  if (!card) return undefined;

  const result = schedule(card, rating, now);
  const db = getDb();

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE cards
          SET state = ?, ease_factor = ?, interval_days = ?, repetitions = ?,
              learning_step = ?, due_at = ?, last_reviewed_at = datetime('now')
        WHERE id = ?`,
    ).run(
      result.state,
      result.ease_factor,
      result.interval_days,
      result.repetitions,
      result.learning_step,
      result.due_at,
      cardId,
    );
    db.prepare(
      `INSERT INTO reviews (card_id, rating, prev_interval, next_interval)
       VALUES (?, ?, ?, ?)`,
    ).run(cardId, rating, result.prev_interval, result.next_interval);
  });
  tx();

  return {
    card: getCard(cardId)!,
    next_interval: result.next_interval,
    due_at: result.due_at,
  };
}
