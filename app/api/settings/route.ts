import { NextResponse } from "next/server";
import { getSetting, setSetting, deleteSetting } from "@/lib/repo/settings";
import { API_KEY_SETTING } from "@/lib/ai";

export const runtime = "nodejs";

/** API 키 자체는 노출하지 않고 설정 여부만 반환. */
export function GET() {
  const key = getSetting(API_KEY_SETTING) ?? process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({ configured: !!key, fromEnv: !getSetting(API_KEY_SETTING) && !!process.env.ANTHROPIC_API_KEY });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey) {
    deleteSetting(API_KEY_SETTING);
    return NextResponse.json({ configured: false });
  }
  setSetting(API_KEY_SETTING, apiKey);
  return NextResponse.json({ configured: true });
}
