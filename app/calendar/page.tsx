import CalendarView from "@/components/calendar/CalendarView";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">캘린더</h1>
      <p className="mt-1 opacity-60">
        날짜별 학습 이력과 앞으로의 복습 예정을 확인하세요.
      </p>
      <div className="mt-6">
        <CalendarView />
      </div>
    </div>
  );
}
