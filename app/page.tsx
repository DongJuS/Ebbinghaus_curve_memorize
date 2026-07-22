import Link from "next/link";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Counts = {
  decks: number;
  cards: number;
  dueToday: number;
  reviewsToday: number;
};

function getCounts(): Counts {
  const db = getDb();
  const decks = (db.prepare("SELECT COUNT(*) AS n FROM decks").get() as { n: number }).n;
  const cards = (db.prepare("SELECT COUNT(*) AS n FROM cards").get() as { n: number }).n;
  const dueToday = (
    db
      .prepare("SELECT COUNT(*) AS n FROM cards WHERE due_at <= datetime('now')")
      .get() as { n: number }
  ).n;
  const reviewsToday = (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM reviews WHERE date(reviewed_at) = date('now')",
      )
      .get() as { n: number }
  ).n;
  return { decks, cards, dueToday, reviewsToday };
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 p-5 dark:border-white/10">
      <div className="text-sm opacity-60">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

export default function Home() {
  const counts = getCounts();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">대시보드</h1>
      <p className="mt-1 opacity-60">
        망각곡선 기반으로 오늘 복습할 카드를 확인하세요.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="오늘 복습할 카드"
          value={counts.dueToday}
          accent="text-blue-600"
        />
        <StatCard label="오늘 복습 완료" value={counts.reviewsToday} accent="text-green-600" />
        <StatCard label="전체 덱" value={counts.decks} />
        <StatCard label="전체 카드" value={counts.cards} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/review"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          오늘의 복습 시작 →
        </Link>
        <Link
          href="/decks"
          className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          덱 관리
        </Link>
      </div>

      {counts.cards === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-black/15 p-6 text-sm opacity-70 dark:border-white/20">
          아직 카드가 없습니다.{" "}
          <Link href="/decks" className="text-blue-600 underline">
            덱을 만들고 카드를 추가
          </Link>
          하면 망각곡선 스케줄에 따라 복습 일정이 자동으로 잡힙니다.
        </div>
      )}
    </div>
  );
}
