import { NextResponse } from "next/server";
import { getDeck, updateDeck, deleteDeck } from "@/lib/repo/decks";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const deck = getDeck(Number(id));
  if (!deck) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(deck);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const updated = updateDeck(Number(id), {
    name: typeof body?.name === "string" ? body.name.trim() : undefined,
    description:
      typeof body?.description === "string" ? body.description : undefined,
  });
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  deleteDeck(Number(id));
  return NextResponse.json({ ok: true });
}
