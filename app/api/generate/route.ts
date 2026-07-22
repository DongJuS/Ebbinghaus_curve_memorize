import { NextResponse } from "next/server";
import { generateQuestions, AiNotConfiguredError } from "@/lib/ai";
import { createQuestions } from "@/lib/repo/questions";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const source = typeof body?.source === "string" ? body.source.trim() : "";
  if (!source) {
    return NextResponse.json(
      { error: "학습 내용(단어/노트)을 입력하세요." },
      { status: 400 },
    );
  }
  const deckId = typeof body?.deckId === "number" ? body.deckId : null;
  const perDifficulty =
    typeof body?.perDifficulty === "number"
      ? Math.min(Math.max(body.perDifficulty, 1), 5)
      : 2;

  try {
    const generated = await generateQuestions({ source, perDifficulty });
    const saved = createQuestions(
      generated.map((q) => ({
        deck_id: deckId,
        question: q.question,
        answer: q.answer,
        difficulty: q.difficulty,
        source_type: "ai",
      })),
    );
    return NextResponse.json({ questions: saved });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json(
        { error: "설정에서 Anthropic API 키를 먼저 등록하세요." },
        { status: 400 },
      );
    }
    console.error("generate error", err);
    return NextResponse.json(
      { error: "문제 생성에 실패했습니다. 잠시 후 다시 시도하세요." },
      { status: 500 },
    );
  }
}
