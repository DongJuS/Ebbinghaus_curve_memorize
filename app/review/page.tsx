import ReviewSession from "@/components/review/ReviewSession";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">오늘의 복습</h1>
      <p className="mt-1 opacity-60">
        망각곡선 스케줄에 따라 지금 복습할 카드입니다.
      </p>
      <div className="mt-6">
        <ReviewSession />
      </div>
    </div>
  );
}
