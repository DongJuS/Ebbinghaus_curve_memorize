"use client";

import { useEffect, useState } from "react";
import type { DeckWithStats } from "@/lib/types";
import type { Question } from "@/lib/repo/questions";
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from "@/lib/difficulty";

export default function GenerateClient({ decks }: { decks: DeckWithStats[] }) {
  const [deckId, setDeckId] = useState<number | "">("");
  const [source, setSource] = useState("");
  const [perDifficulty, setPerDifficulty] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  // 덱을 고르면 그 덱의 기존 AI 문제를 불러온다.
  useEffect(() => {
    if (deckId === "") return;
    let active = true;
    fetch(`/api/questions?source=ai&deckId=${deckId}`)
      .then((r) => r.json())
      .then((d: Question[]) => active && setQuestions(d))
      .catch(() => active && setQuestions([]));
    return () => {
      active = false;
    };
  }, [deckId]);

  function changeDeck(value: number | "") {
    if (value === "") setQuestions([]);
    setDeckId(value);
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!source.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        perDifficulty,
        deckId: deckId === "" ? null : deckId,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error ?? "생성에 실패했습니다.");
      return;
    }
    setQuestions((prev) => [...(d.questions as Question[]), ...prev]);
  }

  async function remove(id: number) {
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  return (
    <div>
      <form
        onSubmit={generate}
        className="rounded-xl border border-black/10 p-4 dark:border-white/10"
      >
        <label className="mb-1 block text-xs opacity-60">
          학습 내용 (단어, 개념, 노트)
        </label>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          rows={5}
          placeholder="예: 광합성의 명반응과 암반응 과정, 각 단계에서 일어나는 반응과 생성물..."
          className="w-full resize-y rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={deckId}
            onChange={(e) =>
              changeDeck(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20"
          >
            <option value="">덱에 저장 안 함</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}에 저장
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            난이도별
            <input
              type="number"
              min={1}
              max={5}
              value={perDifficulty}
              onChange={(e) => setPerDifficulty(Number(e.target.value))}
              className="w-16 rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-blue-500 dark:border-white/20"
            />
            개씩
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "생성 중…" : "✨ 문제 생성"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      {busy && (
        <p className="mt-4 text-sm opacity-60">
          AI가 난이도별 문제를 만들고 있습니다. 잠시만 기다려 주세요…
        </p>
      )}

      {questions.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="text-sm opacity-60">생성된 문제 {questions.length}개</div>
          <ul className="flex flex-col gap-2">
            {questions.map((q) => (
              <li
                key={q.id}
                className="rounded-lg border border-black/10 p-3 dark:border-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${DIFFICULTY_COLORS[q.difficulty]}`}
                      >
                        {DIFFICULTY_LABELS[q.difficulty]}
                      </span>
                    </div>
                    <div className="mt-1.5 font-medium whitespace-pre-wrap">
                      {q.question}
                    </div>
                    <div className="mt-1 text-sm opacity-70 whitespace-pre-wrap">
                      정답: {q.answer}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(q.id)}
                    className="rounded px-2 py-1 text-xs hover:bg-red-500/10 hover:text-red-600"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
