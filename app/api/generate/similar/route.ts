import { NextResponse } from "next/server";
import { generateQuestions, GeminiNotConfiguredError } from "@/lib/gemini";
import { createQuestions } from "@/lib/repo/questions";
import { getExamSource } from "@/lib/repo/exams";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const examSourceId = Number(body?.examSourceId);
  const exam = examSourceId ? getExamSource(examSourceId) : undefined;
  if (!exam) {
    return NextResponse.json({ error: "기출 문제를 찾을 수 없습니다." }, { status: 404 });
  }
  const perDifficulty =
    typeof body?.perDifficulty === "number"
      ? Math.min(Math.max(body.perDifficulty, 1), 5)
      : 2;

  try {
    const generated = await generateQuestions({
      source: exam.content,
      examReference: exam.content,
      perDifficulty,
    });
    const saved = createQuestions(
      generated.map((q) => ({
        deck_id: exam.deck_id,
        question: q.question,
        answer: q.answer,
        difficulty: q.difficulty,
        source_type: "exam",
      })),
    );
    return NextResponse.json({ questions: saved });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json(
        { error: "Gemini 로그인이 필요합니다. (서버에서 gemini-oauth-setup 실행)" },
        { status: 400 },
      );
    }
    console.error("similar generate error", err);
    return NextResponse.json(
      { error: "유사 문제 생성에 실패했습니다. 잠시 후 다시 시도하세요." },
      { status: 500 },
    );
  }
}
