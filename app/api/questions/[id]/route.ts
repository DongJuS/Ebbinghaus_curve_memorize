import { NextResponse } from "next/server";
import { deleteQuestion } from "@/lib/repo/questions";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  deleteQuestion(Number(id));
  return NextResponse.json({ ok: true });
}
