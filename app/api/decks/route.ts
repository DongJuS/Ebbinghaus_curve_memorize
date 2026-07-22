import { NextResponse } from "next/server";
import { listDecks, createDeck } from "@/lib/repo/decks";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(listDecks());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "덱 이름을 입력하세요." }, { status: 400 });
  }
  const description =
    typeof body?.description === "string" ? body.description : "";
  return NextResponse.json(createDeck(name, description), { status: 201 });
}
