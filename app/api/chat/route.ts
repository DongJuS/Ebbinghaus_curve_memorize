import { NextResponse } from "next/server";
import { chatStream, GeminiNotConfiguredError, type ChatMessage } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM =
  "당신은 학습을 돕는 친절하고 유능한 AI 튜터입니다. 한국어로 간결하고 정확하게 답하고, 필요하면 예시를 들어 설명하세요.";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = Array.isArray(body?.messages) ? body.messages : [];
  const history: ChatMessage[] = raw
    .filter(
      (m: unknown): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        ((m as ChatMessage).role === "user" ||
          (m as ChatMessage).role === "model") &&
        typeof (m as ChatMessage).text === "string",
    )
    .map((m: ChatMessage) => ({ role: m.role, text: m.text }));

  if (history.length === 0) {
    return NextResponse.json({ error: "메시지가 필요합니다." }, { status: 400 });
  }

  try {
    const stream = await chatStream(history, SYSTEM);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json(
        { error: "Gemini 로그인이 필요합니다. (서버에서 gemini-oauth-setup 실행)" },
        { status: 400 },
      );
    }
    console.error("chat error", err);
    return NextResponse.json(
      { error: "응답 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
