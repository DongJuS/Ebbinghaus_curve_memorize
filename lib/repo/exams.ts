import { getDb } from "@/lib/db";

export interface ExamSource {
  id: number;
  deck_id: number | null;
  content: string;
  created_at: string;
}

export function listExamSources(deckId?: number): ExamSource[] {
  if (deckId != null) {
    return getDb()
      .prepare(
        "SELECT * FROM exam_sources WHERE deck_id = ? ORDER BY created_at DESC",
      )
      .all(deckId) as ExamSource[];
  }
  return getDb()
    .prepare("SELECT * FROM exam_sources ORDER BY created_at DESC")
    .all() as ExamSource[];
}

export function getExamSource(id: number): ExamSource | undefined {
  return getDb().prepare("SELECT * FROM exam_sources WHERE id = ?").get(id) as
    | ExamSource
    | undefined;
}

export function createExamSource(
  content: string,
  deckId: number | null = null,
): ExamSource {
  const info = getDb()
    .prepare("INSERT INTO exam_sources (deck_id, content) VALUES (?, ?)")
    .run(deckId, content);
  return getExamSource(Number(info.lastInsertRowid))!;
}

export function deleteExamSource(id: number): void {
  getDb().prepare("DELETE FROM exam_sources WHERE id = ?").run(id);
}
