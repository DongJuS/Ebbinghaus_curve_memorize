import { NextResponse } from "next/server";
import { deleteExamSource } from "@/lib/repo/exams";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  deleteExamSource(Number(id));
  return NextResponse.json({ ok: true });
}
