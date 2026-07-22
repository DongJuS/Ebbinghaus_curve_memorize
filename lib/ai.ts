import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "@/lib/repo/settings";
import type { Difficulty } from "@/lib/types";

/**
 * Anthropic 연동 — 노트/단어를 입력하면 난이도별 퀴즈를 자동 생성한다.
 * API 키는 settings 테이블(anthropic_api_key) 또는 환경변수에서 로드하며,
 * 키가 없으면 기능만 비활성화되고 앱의 나머지는 정상 동작한다.
 */

const MODEL = "claude-opus-4-8";

export const API_KEY_SETTING = "anthropic_api_key";

export function getApiKey(): string | undefined {
  return getSetting(API_KEY_SETTING) ?? process.env.ANTHROPIC_API_KEY ?? undefined;
}

export function isConfigured(): boolean {
  return !!getApiKey();
}

export interface GeneratedQuestion {
  question: string;
  answer: string;
  difficulty: Difficulty;
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          difficulty: { type: "string", enum: DIFFICULTIES },
        },
        required: ["question", "answer", "difficulty"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

export interface GenerateOptions {
  /** 외울 대상: 단어/개념/노트 등 자유 텍스트. */
  source: string;
  /** 난이도별로 몇 개씩 만들지 (기본 각 2개). */
  perDifficulty?: number;
  /** 기출 스타일 참고 원문 (있으면 유사 문제 생성). */
  examReference?: string;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("Anthropic API 키가 설정되지 않았습니다.");
    this.name = "AiNotConfiguredError";
  }
}

export async function generateQuestions(
  opts: GenerateOptions,
): Promise<GeneratedQuestion[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new AiNotConfiguredError();

  const perDifficulty = opts.perDifficulty ?? 2;
  const client = new Anthropic({ apiKey });

  const styleNote = opts.examReference
    ? `\n\n다음 기출 문제의 형식과 난이도, 출제 스타일을 참고하여 유사한 스타일로 만들어라:\n"""${opts.examReference}"""`
    : "";

  const prompt =
    `너는 학습용 퀴즈 출제 전문가다. 아래 학습 내용을 바탕으로 복습용 문제를 만들어라.\n` +
    `난이도별(쉬움=easy, 보통=medium, 어려움=hard)로 각각 정확히 ${perDifficulty}개씩 만들어라.\n` +
    `각 문제는 명확한 질문(question)과 간결한 정답(answer)을 포함해야 한다. 한국어로 작성한다.` +
    styleNote +
    `\n\n학습 내용:\n"""${opts.source}"""`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    output_config: {
      format: { type: "json_schema", schema: RESPONSE_SCHEMA },
    },
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI 응답을 파싱하지 못했습니다.");
  }
  const parsed = JSON.parse(textBlock.text) as { questions: GeneratedQuestion[] };
  return (parsed.questions ?? []).filter(
    (q) => q.question && DIFFICULTIES.includes(q.difficulty),
  );
}
