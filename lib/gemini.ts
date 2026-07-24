import fs from "node:fs";
import path from "node:path";
import type { Difficulty } from "@/lib/types";

/**
 * Gemini 연동 — Gemini Code Assist(OAuth) 방식.
 *
 * gemini-cli와 동일한 OAuth 클라이언트로 발급한 refresh token(data/google-oauth.json)을
 * 사용해 액세스 토큰을 갱신하고, cloudcode-pa(Code Assist) 엔드포인트로 Gemini를 호출한다.
 * API 키/결제 없이 구독(또는 무료) 티어로 동작하며, refresh token 자동 갱신으로 영구 유지된다.
 *
 * 최초 셋업: `node scripts/gemini-oauth-setup.js` (1회 브라우저 로그인).
 */

const CA_BASE = "https://cloudcode-pa.googleapis.com/v1internal";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const CRED_FILE =
  process.env.GOOGLE_OAUTH_FILE ??
  path.join(process.cwd(), "data", "google-oauth.json");

interface Creds {
  refresh_token: string;
  client_id: string;
  client_secret: string;
  project: string;
}

export class GeminiNotConfiguredError extends Error {
  constructor(msg = "Gemini OAuth가 설정되지 않았습니다. (scripts/gemini-oauth-setup.js 실행 필요)") {
    super(msg);
    this.name = "GeminiNotConfiguredError";
  }
}

function loadCreds(): Creds {
  try {
    const raw = fs.readFileSync(CRED_FILE, "utf8");
    const j = JSON.parse(raw);
    if (!j.refresh_token || !j.client_id || !j.client_secret) {
      throw new Error("불완전한 자격증명");
    }
    return j as Creds;
  } catch {
    throw new GeminiNotConfiguredError();
  }
}

export function isConfigured(): boolean {
  try {
    loadCreds();
    return true;
  } catch {
    return false;
  }
}

export interface GeminiStatus {
  configured: boolean;
  project?: string;
  tier?: string;
  model: string;
  savedAt?: string;
}

export function getStatus(): GeminiStatus {
  try {
    const raw = fs.readFileSync(CRED_FILE, "utf8");
    const j = JSON.parse(raw);
    return {
      configured: !!(j.refresh_token && j.client_id),
      project: j.project,
      tier: j.tier,
      model: GEMINI_MODEL,
      savedAt: j.saved_at,
    };
  } catch {
    return { configured: false, model: GEMINI_MODEL };
  }
}

// 액세스 토큰 캐시(만료 60초 전까지 재사용)
let _token: { value: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (_token && _token.exp - 60_000 > Date.now()) return _token.value;
  const creds = loadCreds();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: creds.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`토큰 갱신 실패 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const j = await res.json();
  _token = {
    value: j.access_token,
    exp: Date.now() + (j.expires_in ?? 3600) * 1000,
  };
  return _token.value;
}

interface GenPart {
  role?: "user" | "model";
  parts: { text: string }[];
}

interface CaRequest {
  contents: GenPart[];
  systemInstruction?: { parts: { text: string }[] };
  generationConfig?: Record<string, unknown>;
}

/** Code Assist generateContent (비스트리밍). 응답 텍스트를 반환. */
async function caGenerate(request: CaRequest): Promise<string> {
  const token = await getAccessToken();
  const { project } = loadCreds();
  const res = await fetch(`${CA_BASE}:generateContent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: GEMINI_MODEL, project, request }),
  });
  if (!res.ok) {
    throw new Error(`Gemini 오류 ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string | undefined =
    data?.response?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("") ?? data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text == null) throw new Error("Gemini 응답을 파싱하지 못했습니다.");
  return text;
}

// ---------------------------------------------------------------------------
// 문제 생성 (구조화 JSON)
// ---------------------------------------------------------------------------

export interface GeneratedQuestion {
  question: string;
  answer: string;
  difficulty: Difficulty;
}

export interface GenerateOptions {
  source: string;
  perDifficulty?: number;
  examReference?: string;
}

const QUESTION_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      question: { type: "STRING" },
      answer: { type: "STRING" },
      difficulty: { type: "STRING", enum: ["easy", "medium", "hard"] },
    },
    required: ["question", "answer", "difficulty"],
  },
};

function extractJson(text: string): string {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text;
}

export async function generateQuestions(
  opts: GenerateOptions,
): Promise<GeneratedQuestion[]> {
  const perDifficulty = opts.perDifficulty ?? 2;
  const styleNote = opts.examReference
    ? `\n\n다음 기출 문제의 형식·난이도·출제 스타일을 참고해 유사하게 만들어라:\n"""${opts.examReference}"""`
    : "";
  const prompt =
    `너는 학습용 퀴즈 출제 전문가다. 아래 학습 내용을 바탕으로 복습용 문제를 만들어라.\n` +
    `난이도별(easy/medium/hard)로 각각 정확히 ${perDifficulty}개씩. 한국어로, 명확한 question과 간결한 answer 포함.` +
    styleNote +
    `\n\n학습 내용:\n"""${opts.source}"""`;

  const text = await caGenerate({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: QUESTION_SCHEMA,
    },
  });
  const diffs = ["easy", "medium", "hard"];
  const parsed = JSON.parse(extractJson(text)) as GeneratedQuestion[];
  return (parsed ?? []).filter(
    (q) => q?.question && diffs.includes(q.difficulty),
  );
}

// ---------------------------------------------------------------------------
// 채팅 (스트리밍)
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

/** 채팅 히스토리 → Gemini 응답 텍스트 청크 스트림. */
export async function chatStream(
  history: ChatMessage[],
  systemPrompt?: string,
): Promise<ReadableStream<Uint8Array>> {
  const token = await getAccessToken();
  const { project } = loadCreds();
  const request: CaRequest = {
    contents: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
  };
  if (systemPrompt) request.systemInstruction = { parts: [{ text: systemPrompt }] };

  const upstream = await fetch(`${CA_BASE}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: GEMINI_MODEL, project, request }),
  });
  if (!upstream.ok || !upstream.body) {
    throw new Error(
      `Gemini 오류 ${upstream.status}: ${(await upstream.text().catch(() => "")).slice(0, 300)}`,
    );
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const json = t.slice(5).trim();
        if (!json || json === "[DONE]") continue;
        try {
          const obj = JSON.parse(json);
          const text: string | undefined =
            obj?.response?.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text ?? "")
              .join("");
          if (text) controller.enqueue(encoder.encode(text));
        } catch {
          // 부분 JSON 무시
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}
