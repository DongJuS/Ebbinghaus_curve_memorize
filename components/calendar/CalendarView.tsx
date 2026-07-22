"use client";

import { useEffect, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { MonthStats, DayDetail } from "@/lib/repo/stats";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const RATING_LABELS: Record<string, string> = {
  again: "다시",
  hard: "어려움",
  good: "보통",
  easy: "쉬움",
};

function heatClass(count: number): string {
  if (!count) return "";
  if (count >= 10) return "bg-green-600 text-white";
  if (count >= 5) return "bg-green-500/70 text-white";
  if (count >= 2) return "bg-green-500/40";
  return "bg-green-500/20";
}

export default function CalendarView() {
  const [cursor, setCursor] = useState(() => new Date());
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<DayDetail | null>(null);

  const monthKey = format(cursor, "yyyy-MM");

  useEffect(() => {
    let active = true;
    fetch(`/api/stats?month=${monthKey}`)
      .then((r) => r.json())
      .then((d) => active && setStats(d))
      .catch(() => active && setStats({ reviews: {}, due: {} }));
    return () => {
      active = false;
    };
  }, [monthKey]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    fetch(`/api/stats?date=${selected}`)
      .then((r) => r.json())
      .then((d) => active && setDetail(d))
      .catch(() => active && setDetail({ reviewed: [], due: [] }));
    return () => {
      active = false;
    };
  }, [selected]);

  function selectDay(key: string) {
    setDetail(null);
    setSelected(key);
  }

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor)),
    end: endOfWeek(endOfMonth(cursor)),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setCursor((c) => addMonths(c, -1))}
            className="rounded-md px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            ← 이전
          </button>
          <div className="font-semibold">{format(cursor, "yyyy년 M월")}</div>
          <button
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="rounded-md px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            다음 →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs opacity-50">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const reviews = stats?.reviews[key] ?? 0;
            const due = stats?.due[key] ?? 0;
            const inMonth = isSameMonth(day, cursor);
            return (
              <button
                key={key}
                onClick={() => selectDay(key)}
                className={`flex aspect-square flex-col items-start rounded-md border p-1 text-left text-xs transition-colors ${
                  selected === key
                    ? "border-blue-500"
                    : "border-black/10 dark:border-white/10"
                } ${inMonth ? "" : "opacity-30"} ${heatClass(reviews)}`}
              >
                <span
                  className={`font-medium ${
                    isToday(day) ? "text-blue-600 dark:text-blue-400" : ""
                  }`}
                >
                  {format(day, "d")}
                </span>
                <span className="mt-auto flex flex-col gap-0.5">
                  {reviews > 0 && <span>✓{reviews}</span>}
                  {due > 0 && (
                    <span className="text-blue-600 dark:text-blue-300">
                      ●{due}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-4 text-xs opacity-60">
          <span>✓ 복습 완료</span>
          <span className="text-blue-600">● 복습 예정</span>
        </div>
      </div>

      <aside className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        {!selected ? (
          <p className="text-sm opacity-60">
            날짜를 클릭하면 그날의 학습/예정 카드를 볼 수 있습니다.
          </p>
        ) : (
          <div>
            <div className="font-semibold">{selected}</div>
            {!detail ? (
              <p className="mt-3 text-sm opacity-60">불러오는 중…</p>
            ) : (
              <div className="mt-3 space-y-4 text-sm">
                <section>
                  <div className="mb-1 font-medium">
                    복습 완료 {detail.reviewed.length}개
                  </div>
                  {detail.reviewed.length === 0 ? (
                    <p className="opacity-50">없음</p>
                  ) : (
                    <ul className="space-y-1">
                      {detail.reviewed.map((r, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="truncate">{r.front}</span>
                          <span className="shrink-0 opacity-60">
                            {RATING_LABELS[r.rating] ?? r.rating}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <section>
                  <div className="mb-1 font-medium text-blue-600">
                    복습 예정 {detail.due.length}개
                  </div>
                  {detail.due.length === 0 ? (
                    <p className="opacity-50">없음</p>
                  ) : (
                    <ul className="space-y-1">
                      {detail.due.map((d, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="truncate">{d.front}</span>
                          <span className="shrink-0 opacity-40">{d.deck_name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
