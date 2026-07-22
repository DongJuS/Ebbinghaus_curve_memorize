"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "대시보드", icon: "🏠" },
  { href: "/decks", label: "덱 / 카드", icon: "🗂️" },
  { href: "/review", label: "오늘의 복습", icon: "🔁" },
  { href: "/calendar", label: "캘린더", icon: "📅" },
  { href: "/mindmap", label: "마인드맵", icon: "🌳" },
  { href: "/generate", label: "AI 문제 생성", icon: "✨" },
  { href: "/exams", label: "기출 문제", icon: "📝" },
  { href: "/settings", label: "설정", icon: "⚙️" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mb-4 px-2 py-1">
        <div className="text-sm font-semibold">Ebbinghaus</div>
        <div className="text-xs opacity-60">망각곡선 복습</div>
      </div>
      {LINKS.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-blue-600 text-white"
                : "hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            <span aria-hidden>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
