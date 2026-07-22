import { getDb } from "@/lib/db";
import type { Difficulty } from "@/lib/types";

export type QuestionSource = "ai" | "exam";

export interface Question {
  id: number;
  deck_id: number | null;
  card_id: number | null;
  question: string;
  answer: string;
  difficulty: Difficulty;
  source_type: QuestionSource;
  created_at: string;
}

export interface NewQuestion {
  deck_id?: number | null;
  card_id?: number | null;
  question: string;
  answer?: string;
  difficulty?: Difficulty;
  source_type?: QuestionSource;
}

export function listQuestions(opts: {
  deckId?: number;
  sourceType?: QuestionSource;
} = {}): Question[] {
  const clauses: string[] = [];
  const params: (number | string)[] = [];
  if (opts.deckId != null) {
    clauses.push("deck_id = ?");
    params.push(opts.deckId);
  }
  if (opts.sourceType) {
    clauses.push("source_type = ?");
    params.push(opts.sourceType);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(`SELECT * FROM questions ${where} ORDER BY created_at DESC`)
    .all(...params) as Question[];
}

export function createQuestions(items: NewQuestion[]): Question[] {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO questions (deck_id, card_id, question, answer, difficulty, source_type)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const ids: number[] = [];
  const tx = db.transaction((rows: NewQuestion[]) => {
    for (const q of rows) {
      const info = stmt.run(
        q.deck_id ?? null,
        q.card_id ?? null,
        q.question,
        q.answer ?? "",
        q.difficulty ?? "medium",
        q.source_type ?? "ai",
      );
      ids.push(Number(info.lastInsertRowid));
    }
  });
  tx(items);
  const placeholders = ids.map(() => "?").join(",");
  return getDb()
    .prepare(`SELECT * FROM questions WHERE id IN (${placeholders})`)
    .all(...ids) as Question[];
}

export function deleteQuestion(id: number): void {
  getDb().prepare("DELETE FROM questions WHERE id = ?").run(id);
}
