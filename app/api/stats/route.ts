import { NextResponse } from "next/server";
import { getMonthStats, getDayDetail } from "@/lib/repo/stats";

export const runtime = "nodejs";

export function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(getDayDetail(date));
  }
  const month = url.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "month(YYYY-MM) 또는 date(YYYY-MM-DD)가 필요합니다." },
      { status: 400 },
    );
  }
  return NextResponse.json(getMonthStats(month));
}
