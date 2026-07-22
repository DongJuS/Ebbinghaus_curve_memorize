import { NextResponse } from "next/server";
import { getCard, updateCard, deleteCard } from "@/lib/repo/cards";
import type { Difficulty } from "@/lib/types";

export const runtime = "nodejs";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const card = getCard(Number(id));
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(card);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const updated = updateCard(Number(id), {
    front: typeof body?.front === "string" ? body.front.trim() : undefined,
    back: typeof body?.back === "string" ? body.back : undefined,
    note: typeof body?.note === "string" ? body.note : undefined,
    difficulty: DIFFICULTIES.includes(body?.difficulty)
      ? body.difficulty
      : undefined,
    parent_id:
      body?.parent_id === null || typeof body?.parent_id === "number"
        ? body.parent_id
        : undefined,
  });
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  deleteCard(Number(id));
  return NextResponse.json({ ok: true });
}
