import { getDb } from "@/lib/db";

/** 날짜(YYYY-MM-DD, 로컬) → 개수 매핑. */
export type DateCounts = Record<string, number>;

export interface MonthStats {
  /** 해당 날짜에 실제로 복습한 카드 수. */
  reviews: DateCounts;
  /** 해당 날짜로 복습이 예정된 카드 수. */
  due: DateCounts;
}

/** month: 'YYYY-MM' (로컬 기준). */
export function getMonthStats(month: string): MonthStats {
  const db = getDb();
  const reviewRows = db
    .prepare(
      `SELECT date(reviewed_at, 'localtime') AS d, COUNT(*) AS n
         FROM reviews
        WHERE strftime('%Y-%m', reviewed_at, 'localtime') = ?
        GROUP BY d`,
    )
    .all(month) as { d: string; n: number }[];
  const dueRows = db
    .prepare(
      `SELECT date(due_at, 'localtime') AS d, COUNT(*) AS n
         FROM cards
        WHERE strftime('%Y-%m', due_at, 'localtime') = ?
        GROUP BY d`,
    )
    .all(month) as { d: string; n: number }[];

  const reviews: DateCounts = {};
  for (const r of reviewRows) reviews[r.d] = r.n;
  const due: DateCounts = {};
  for (const r of dueRows) due[r.d] = r.n;
  return { reviews, due };
}

export interface ReviewedItem {
  front: string;
  rating: string;
  next_interval: number;
  deck_name: string;
}

export interface DueItem {
  front: string;
  deck_name: string;
  due_at: string;
}

export interface DayDetail {
  reviewed: ReviewedItem[];
  due: DueItem[];
}

/** date: 'YYYY-MM-DD' (로컬 기준). */
export function getDayDetail(date: string): DayDetail {
  const db = getDb();
  const reviewed = db
    .prepare(
      `SELECT c.front AS front, r.rating AS rating, r.next_interval AS next_interval,
              d.name AS deck_name
         FROM reviews r
         JOIN cards c ON c.id = r.card_id
         JOIN decks d ON d.id = c.deck_id
        WHERE date(r.reviewed_at, 'localtime') = ?
        ORDER BY r.reviewed_at`,
    )
    .all(date) as ReviewedItem[];
  const due = db
    .prepare(
      `SELECT c.front AS front, c.due_at AS due_at, d.name AS deck_name
         FROM cards c
         JOIN decks d ON d.id = c.deck_id
        WHERE date(c.due_at, 'localtime') = ?
        ORDER BY c.due_at`,
    )
    .all(date) as DueItem[];
  return { reviewed, due };
}
