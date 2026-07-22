import { listDecks } from "@/lib/repo/decks";
import { listExamSources } from "@/lib/repo/exams";
import { isConfigured } from "@/lib/ai";
import ExamsClient from "@/components/exams/ExamsClient";

export const dynamic = "force-dynamic";

export default function ExamsPage() {
  const decks = listDecks();
  const exams = listExamSources();
  const configured = isConfigured();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">기출 문제</h1>
      <p className="mt-1 opacity-60">
        기출 문제를 저장하면 같은 유형·난이도의 유사 문제를 자동으로 만듭니다.
      </p>
      <div className="mt-6">
        <ExamsClient decks={decks} initialExams={exams} configured={configured} />
      </div>
    </div>
  );
}
