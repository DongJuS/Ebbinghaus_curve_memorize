"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Card, Difficulty } from "@/lib/types";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_OPTIONS,
  DIFFICULTY_COLORS,
} from "@/lib/difficulty";

function fmtDue(due: string): string {
  const d = new Date(due.replace(" ", "T") + "Z");
  const now = Date.now();
  const diffMs = d.getTime() - now;
  if (diffMs <= 0) return "지금 복습";
  const hours = diffMs / 36e5;
  if (hours < 24) return `${Math.round(hours)}시간 후`;
  return `${Math.round(hours / 24)}일 후`;
}

export default function CardsClient({
  deckId,
  cards,
}: {
  deckId: number;
  cards: Card[];
}) {
  const router = useRouter();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [note, setNote] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/decks/${deckId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front, back, note, difficulty }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "카드 추가에 실패했습니다.");
      return;
    }
    setFront("");
    setBack("");
    setNote("");
    setDifficulty("medium");
    router.refresh();
  }

  async function removeCard(id: number) {
    if (!confirm("이 카드를 삭제할까요?")) return;
    await fetch(`/api/cards/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <form
        onSubmit={addCard}
        className="rounded-xl border border-black/10 p-4 dark:border-white/10"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs opacity-60">앞면 (질문)</label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={2}
              placeholder="외울 단어나 질문"
              className="w-full resize-y rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs opacity-60">뒷면 (정답)</label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={2}
              placeholder="뜻이나 정답"
              className="w-full resize-y rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs opacity-60">메모 (선택)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="추가 설명, 예문 등"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20"
          >
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            카드 추가
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      <div className="mt-6">
        <div className="mb-2 text-sm opacity-60">카드 {cards.length}개</div>
        {cards.length === 0 ? (
          <p className="text-sm opacity-60">아직 카드가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cards.map((card) =>
              editingId === card.id ? (
                <EditCardRow
                  key={card.id}
                  card={card}
                  onDone={() => {
                    setEditingId(null);
                    router.refresh();
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <li
                  key={card.id}
                  className="rounded-lg border border-black/10 p-3 dark:border-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{card.front}</div>
                      {card.back && (
                        <div className="mt-0.5 text-sm opacity-70">
                          {card.back}
                        </div>
                      )}
                      {card.note && (
                        <div className="mt-1 text-xs opacity-50">{card.note}</div>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span
                          className={`rounded px-1.5 py-0.5 ${DIFFICULTY_COLORS[card.difficulty]}`}
                        >
                          {DIFFICULTY_LABELS[card.difficulty]}
                        </span>
                        <span className="opacity-50">·</span>
                        <span className="opacity-60">{fmtDue(card.due_at)}</span>
                        {card.state === "new" && (
                          <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-blue-600">
                            신규
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setEditingId(card.id)}
                        className="rounded px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => removeCard(card.id)}
                        className="rounded px-2 py-1 text-xs hover:bg-red-500/10 hover:text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function EditCardRow({
  card,
  onDone,
  onCancel,
}: {
  card: Card;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [note, setNote] = useState(card.note);
  const [difficulty, setDifficulty] = useState<Difficulty>(card.difficulty);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front, back, note, difficulty }),
    });
    setBusy(false);
    onDone();
  }

  return (
    <li className="rounded-lg border border-blue-400 p-3">
      <input
        value={front}
        onChange={(e) => setFront(e.target.value)}
        className="w-full rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-blue-500 dark:border-white/20"
        placeholder="앞면"
      />
      <input
        value={back}
        onChange={(e) => setBack(e.target.value)}
        className="mt-2 w-full rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-blue-500 dark:border-white/20"
        placeholder="뒷면"
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mt-2 w-full rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-blue-500 dark:border-white/20"
        placeholder="메모"
      />
      <div className="mt-2 flex items-center gap-2">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-blue-500 dark:border-white/20"
        >
          {DIFFICULTY_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          저장
        </button>
        <button
          onClick={onCancel}
          className="rounded-md px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          취소
        </button>
      </div>
    </li>
  );
}
