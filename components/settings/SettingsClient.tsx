"use client";

import { useEffect, useState } from "react";

export default function SettingsClient() {
  const [apiKey, setApiKey] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [fromEnv, setFromEnv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setConfigured(d.configured);
        setFromEnv(d.fromEnv);
      })
      .catch(() => active && setConfigured(false));
    return () => {
      active = false;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    setConfigured(d.configured);
    setFromEnv(false);
    setApiKey("");
    setSaved(true);
  }

  return (
    <div className="rounded-xl border border-black/10 p-6 dark:border-white/10">
      <h2 className="font-semibold">Anthropic API 키</h2>
      <p className="mt-1 text-sm opacity-60">
        AI 자동 문제 생성 기능에 사용됩니다. 키는 로컬 데이터베이스에만 저장됩니다.
      </p>

      <div className="mt-3 text-sm">
        상태:{" "}
        {configured === null ? (
          <span className="opacity-50">확인 중…</span>
        ) : configured ? (
          <span className="text-green-600">
            설정됨{fromEnv ? " (환경변수)" : ""}
          </span>
        ) : (
          <span className="text-red-600">미설정</span>
        )}
      </div>

      <form onSubmit={save} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          저장
        </button>
      </form>
      {saved && <p className="mt-2 text-sm text-green-600">저장되었습니다.</p>}
      <p className="mt-3 text-xs opacity-50">
        빈 값으로 저장하면 키가 삭제됩니다. 환경변수 ANTHROPIC_API_KEY로도 설정할 수 있습니다.
      </p>
    </div>
  );
}
