import { NextResponse } from "next/server";
import { getDeck } from "@/lib/repo/decks";
import { listCards, createCard } from "@/lib/repo/cards";
import type { Difficulty } from "@/lib/types";

export const runtime = "nodejs";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return NextResponse.json(listCards(Number(id)));
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const deckId = Number(id);
  if (!getDeck(deckId)) {
    return NextResponse.json({ error: "덱을 찾을 수 없습니다." }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const front = typeof body?.front === "string" ? body.front.trim() : "";
  if (!front) {
    return NextResponse.json({ error: "앞면(질문)을 입력하세요." }, { status: 400 });
  }
  const difficulty: Difficulty = DIFFICULTIES.includes(body?.difficulty)
    ? body.difficulty
    : "medium";
  const card = createCard(deckId, {
    front,
    back: typeof body?.back === "string" ? body.back : "",
    note: typeof body?.note === "string" ? body.note : "",
    difficulty,
    parent_id:
      typeof body?.parent_id === "number" ? body.parent_id : null,
  });
  return NextResponse.json(card, { status: 201 });
}
