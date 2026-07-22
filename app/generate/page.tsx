import Link from "next/link";
import { listDecks } from "@/lib/repo/decks";
import { isConfigured } from "@/lib/ai";
import GenerateClient from "@/components/generate/GenerateClient";

export const dynamic = "force-dynamic";

export default function GeneratePage() {
  const decks = listDecks();
  const configured = isConfigured();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">AI 문제 생성</h1>
      <p className="mt-1 opacity-60">
        노트나 단어를 입력하면 쉬움/보통/어려움 난이도의 문제를 자동으로 만듭니다.
      </p>

      {!configured ? (
        <div className="mt-6 rounded-xl border border-dashed border-black/15 p-6 text-sm dark:border-white/20">
          AI 기능을 쓰려면 먼저{" "}
          <Link href="/settings" className="text-blue-600 underline">
            설정에서 Anthropic API 키
          </Link>
          를 등록하세요.
        </div>
      ) : (
        <div className="mt-6">
          <GenerateClient decks={decks} />
        </div>
      )}
    </div>
  );
}
