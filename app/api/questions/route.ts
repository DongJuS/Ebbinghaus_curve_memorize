import { NextResponse } from "next/server";
import { listQuestions, type QuestionSource } from "@/lib/repo/questions";

export const runtime = "nodejs";

export function GET(req: Request) {
  const url = new URL(req.url);
  const deckParam = url.searchParams.get("deckId");
  const sourceParam = url.searchParams.get("source");
  const deckId = deckParam ? Number(deckParam) : undefined;
  const sourceType =
    sourceParam === "ai" || sourceParam === "exam"
      ? (sourceParam as QuestionSource)
      : undefined;
  return NextResponse.json(listQuestions({ deckId, sourceType }));
}
