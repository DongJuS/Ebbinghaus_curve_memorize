"use client";

import type { Question } from "@/lib/repo/questions";
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from "@/lib/difficulty";

export default function QuestionList({
  questions,
  onDelete,
}: {
  questions: Question[];
  onDelete: (id: number) => void;
}) {
  if (questions.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {questions.map((q) => (
        <li
          key={q.id}
          className="rounded-lg border border-black/10 p-3 dark:border-white/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${DIFFICULTY_COLORS[q.difficulty]}`}
              >
                {DIFFICULTY_LABELS[q.difficulty]}
              </span>
              <div className="mt-1.5 font-medium whitespace-pre-wrap">
                {q.question}
              </div>
              <div className="mt-1 text-sm opacity-70 whitespace-pre-wrap">
                정답: {q.answer}
              </div>
            </div>
            <button
              onClick={() => onDelete(q.id)}
              className="rounded px-2 py-1 text-xs hover:bg-red-500/10 hover:text-red-600"
            >
              삭제
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
