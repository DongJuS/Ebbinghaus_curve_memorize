import { NextResponse } from "next/server";
import { listExamSources, createExamSource } from "@/lib/repo/exams";

export const runtime = "nodejs";

export function GET(req: Request) {
  const url = new URL(req.url);
  const deckParam = url.searchParams.get("deckId");
  const deckId = deckParam ? Number(deckParam) : undefined;
  return NextResponse.json(listExamSources(deckId));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "기출 문제 내용을 입력하세요." }, { status: 400 });
  }
  const deckId = typeof body?.deckId === "number" ? body.deckId : null;
  return NextResponse.json(createExamSource(content, deckId), { status: 201 });
}
