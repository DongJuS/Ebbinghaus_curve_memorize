"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Card, Rating } from "@/lib/types";
import { previewIntervals } from "@/lib/srs";
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from "@/lib/difficulty";

const RATING_META: { rating: Rating; label: string; className: string }[] = [
  { rating: "again", label: "다시", className: "bg-red-600 hover:bg-red-700" },
  { rating: "hard", label: "어려움", className: "bg-orange-500 hover:bg-orange-600" },
  { rating: "good", label: "보통", className: "bg-green-600 hover:bg-green-700" },
  { rating: "easy", label: "쉬움", className: "bg-blue-600 hover:bg-blue-700" },
];

export default function ReviewSession() {
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/review")
      .then((r) => r.json())
      .then((cards: Card[]) => setQueue(cards))
      .catch(() => setQueue([]));
  }, []);

  const current = queue?.[index];

  const previews = useMemo(
    () => (current ? previewIntervals(current) : null),
    [current],
  );

  async function rate(rating: Rating) {
    if (!current || busy) return;
    setBusy(true);
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: current.id, rating }),
    }).catch(() => {});
    setBusy(false);
    setDone((d) => d + 1);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  // 키보드: Space=뒤집기, 1~4=평가
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      if (e.code === "Space") {
        e.preventDefault();
        setRevealed((v) => !v);
      } else if (revealed && e.key >= "1" && e.key <= "4") {
        rate(RATING_META[Number(e.key) - 1].rating);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, revealed, busy]);

  if (queue === null) {
    return <p className="opacity-60">불러오는 중…</p>;
  }

  if (!current) {
    return (
      <div className="rounded-xl border border-black/10 p-8 text-center dark:border-white/10">
        {done > 0 ? (
          <>
            <div className="text-4xl">🎉</div>
            <p className="mt-3 font-semibold">오늘 복습을 마쳤습니다!</p>
            <p className="mt-1 text-sm opacity-60">{done}개 카드를 복습했어요.</p>
          </>
        ) : (
          <>
            <p className="font-semibold">지금 복습할 카드가 없습니다.</p>
            <p className="mt-1 text-sm opacity-60">
              망각곡선 스케줄에 따라 시간이 지나면 카드가 나타납니다.
            </p>
          </>
        )}
        <div className="mt-5 flex justify-center gap-3">
          <Link
            href="/decks"
            className="rounded-md border border-black/15 px-4 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            덱 관리
          </Link>
          <Link
            href="/"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            대시보드
          </Link>
        </div>
      </div>
    );
  }

  const remaining = queue.length - index;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm opacity-60">
        <span>남은 카드 {remaining}개</span>
        <span>완료 {done}개</span>
      </div>

      <div className="rounded-2xl border border-black/10 p-8 dark:border-white/10">
        <div className="flex items-center justify-between text-xs">
          <span className="opacity-50">{"deck_name" in current ? (current as { deck_name?: string }).deck_name : ""}</span>
          <span className={`rounded px-1.5 py-0.5 ${DIFFICULTY_COLORS[current.difficulty]}`}>
            {DIFFICULTY_LABELS[current.difficulty]}
          </span>
        </div>

        <div className="mt-6 min-h-24 text-center">
          <div className="text-xl font-semibold whitespace-pre-wrap">{current.front}</div>
          {revealed && (
            <div className="mt-5 border-t border-black/10 pt-5 dark:border-white/10">
              <div className="text-lg whitespace-pre-wrap">{current.back || "—"}</div>
              {current.note && (
                <div className="mt-2 text-sm opacity-60 whitespace-pre-wrap">{current.note}</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full rounded-xl bg-black/80 py-3 font-medium text-white hover:bg-black dark:bg-white/90 dark:text-black"
          >
            정답 보기 <span className="opacity-60">(Space)</span>
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {RATING_META.map((m, i) => (
              <button
                key={m.rating}
                onClick={() => rate(m.rating)}
                disabled={busy}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-3 text-white disabled:opacity-50 ${m.className}`}
              >
                <span className="text-sm font-medium">{m.label}</span>
                <span className="text-xs opacity-80">{previews?.[m.rating]}</span>
                <span className="text-[10px] opacity-50">{i + 1}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
