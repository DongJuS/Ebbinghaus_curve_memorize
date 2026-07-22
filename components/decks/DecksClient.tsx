"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DeckWithStats } from "@/lib/types";

export default function DecksClient({ decks }: { decks: DeckWithStats[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "덱 생성에 실패했습니다.");
      return;
    }
    setName("");
    setDescription("");
    router.refresh();
  }

  async function deleteDeck(id: number, deckName: string) {
    if (!confirm(`'${deckName}' 덱과 모든 카드를 삭제할까요?`)) return;
    await fetch(`/api/decks/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <form
        onSubmit={createDeck}
        className="flex flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs opacity-60">덱 이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 영단어, 자료구조"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs opacity-60">설명 (선택)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="덱 설명"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          덱 추가
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {decks.length === 0 ? (
        <p className="mt-8 text-sm opacity-60">
          아직 덱이 없습니다. 위에서 첫 덱을 만들어 보세요.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {decks.map((deck) => (
            <li
              key={deck.id}
              className="group rounded-xl border border-black/10 p-4 transition-colors hover:border-blue-400 dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-2">
                <Link href={`/decks/${deck.id}`} className="flex-1">
                  <div className="font-semibold">{deck.name}</div>
                  {deck.description && (
                    <div className="mt-0.5 text-sm opacity-60">
                      {deck.description}
                    </div>
                  )}
                </Link>
                <button
                  onClick={() => deleteDeck(deck.id, deck.name)}
                  className="rounded px-2 py-1 text-xs opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100"
                >
                  삭제
                </button>
              </div>
              <div className="mt-3 flex gap-4 text-xs opacity-70">
                <span>카드 {deck.card_count}개</span>
                <span className="text-blue-600">복습 예정 {deck.due_count}개</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
