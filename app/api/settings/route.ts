import { NextResponse } from "next/server";
import { getStatus } from "@/lib/gemini";

export const runtime = "nodejs";

/** Gemini(Code Assist OAuth) 로그인 상태를 반환. */
export function GET() {
  return NextResponse.json(getStatus());
}
