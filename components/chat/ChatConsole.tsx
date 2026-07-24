"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Msg {
  role: "user" | "model";
  text: string;
}

export default function ChatConsole({ configured }: { configured: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");

    const history = [...messages, { role: "user" as const, text }];
    setMessages([...history, { role: "model", text: "" }]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "응답 실패");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "model", text: acc };
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
      setMessages((prev) => prev.slice(0, -1)); // 실패한 빈 응답 제거
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 p-6 text-sm dark:border-white/20">
        Gemini에 연결되어 있지 않습니다.{" "}
        <Link href="/settings" className="text-blue-600 underline">
          설정
        </Link>
        에서 상태를 확인하세요.
      </div>
    );
  }

  return (
    <div className="flex h-[72vh] flex-col rounded-xl border border-black/10 dark:border-white/10">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm opacity-50">
            Gemini와 대화를 시작하세요. 무엇이든 물어보세요.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-black/5 dark:bg-white/10"
              }`}
            >
              {m.text || (busy && i === messages.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="border-t border-black/10 px-4 py-2 text-sm text-red-600 dark:border-white/10">
          {error}
        </div>
      )}

      <form
        onSubmit={send}
        className="flex items-end gap-2 border-t border-black/10 p-3 dark:border-white/10"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e);
            }
          }}
          rows={1}
          placeholder="메시지를 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
          className="max-h-32 flex-1 resize-none rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </div>
  );
}
