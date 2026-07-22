import { NextResponse } from "next/server";
import { getDueCards, applyReview } from "@/lib/repo/review";
import type { Rating } from "@/lib/types";

export const runtime = "nodejs";

const RATINGS: Rating[] = ["again", "hard", "good", "easy"];

export function GET(req: Request) {
  const url = new URL(req.url);
  const deckParam = url.searchParams.get("deckId");
  const deckId = deckParam ? Number(deckParam) : undefined;
  return NextResponse.json(getDueCards({ deckId }));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const cardId = Number(body?.cardId);
  const rating = body?.rating as Rating;
  if (!cardId || !RATINGS.includes(rating)) {
    return NextResponse.json(
      { error: "cardId와 유효한 rating(again|hard|good|easy)이 필요합니다." },
      { status: 400 },
    );
  }
  const outcome = applyReview(cardId, rating);
  if (!outcome) {
    return NextResponse.json({ error: "카드를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(outcome);
}
