"use client";

import { useState } from "react";
import type { DeckWithStats } from "@/lib/types";
import type { ExamSource } from "@/lib/repo/exams";
import type { Question } from "@/lib/repo/questions";
import QuestionList from "@/components/questions/QuestionList";

export default function ExamsClient({
  decks,
  initialExams,
  configured,
}: {
  decks: DeckWithStats[];
  initialExams: ExamSource[];
  configured: boolean;
}) {
  const [exams, setExams] = useState<ExamSource[]>(initialExams);
  const [content, setContent] = useState("");
  const [deckId, setDeckId] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // examSourceId -> generated questions
  const [generated, setGenerated] = useState<Record<number, Question[]>>({});
  const [genBusy, setGenBusy] = useState<number | null>(null);

  async function addExam(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, deckId: deckId === "" ? null : deckId }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error ?? "저장에 실패했습니다.");
      return;
    }
    setExams((prev) => [d as ExamSource, ...prev]);
    setContent("");
  }

  async function removeExam(id: number) {
    if (!confirm("이 기출 문제를 삭제할까요?")) return;
    await fetch(`/api/exams/${id}`, { method: "DELETE" });
    setExams((prev) => prev.filter((e) => e.id !== id));
    setGenerated((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function generateSimilar(examId: number) {
    setGenBusy(examId);
    setError(null);
    const res = await fetch("/api/generate/similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examSourceId: examId, perDifficulty: 2 }),
    });
    const d = await res.json().catch(() => ({}));
    setGenBusy(null);
    if (!res.ok) {
      setError(d.error ?? "생성에 실패했습니다.");
      return;
    }
    setGenerated((prev) => ({
      ...prev,
      [examId]: [...(d.questions as Question[]), ...(prev[examId] ?? [])],
    }));
  }

  async function removeQuestion(examId: number, qid: number) {
    await fetch(`/api/questions/${qid}`, { method: "DELETE" });
    setGenerated((prev) => ({
      ...prev,
      [examId]: (prev[examId] ?? []).filter((q) => q.id !== qid),
    }));
  }

  return (
    <div>
      <form
        onSubmit={addExam}
        className="rounded-xl border border-black/10 p-4 dark:border-white/10"
      >
        <label className="mb-1 block text-xs opacity-60">기출 문제 원문</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="기출 문제를 붙여넣으세요. 이 형식과 난이도를 참고해 유사 문제를 생성합니다."
          className="w-full resize-y rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={deckId}
            onChange={(e) =>
              setDeckId(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20"
          >
            <option value="">덱 지정 안 함</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            기출 저장
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      {!configured && (
        <p className="mt-3 text-sm opacity-60">
          유사 문제 생성을 쓰려면 설정에서 Anthropic API 키를 등록하세요.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {exams.length === 0 ? (
          <p className="text-sm opacity-60">저장된 기출 문제가 없습니다.</p>
        ) : (
          exams.map((exam) => (
            <div
              key={exam.id}
              className="rounded-xl border border-black/10 p-4 dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm whitespace-pre-wrap">
                  {exam.content}
                </p>
                <button
                  onClick={() => removeExam(exam.id)}
                  className="shrink-0 rounded px-2 py-1 text-xs hover:bg-red-500/10 hover:text-red-600"
                >
                  삭제
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => generateSimilar(exam.id)}
                  disabled={!configured || genBusy === exam.id}
                  className="rounded-md bg-black/80 px-3 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-40 dark:bg-white/90 dark:text-black"
                >
                  {genBusy === exam.id ? "생성 중…" : "✨ 유사 문제 생성"}
                </button>
              </div>
              {generated[exam.id]?.length > 0 && (
                <div className="mt-3">
                  <QuestionList
                    questions={generated[exam.id]}
                    onDelete={(qid) => removeQuestion(exam.id, qid)}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
