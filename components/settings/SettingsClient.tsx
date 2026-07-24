"use client";

import { useEffect, useState } from "react";

interface Status {
  configured: boolean;
  project?: string;
  tier?: string;
  model: string;
  savedAt?: string;
}

export default function SettingsClient() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => active && setStatus(d))
      .catch(() => active && setStatus({ configured: false, model: "-" }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="rounded-xl border border-black/10 p-6 dark:border-white/10">
      <h2 className="font-semibold">Gemini (Google 계정 연동)</h2>
      <p className="mt-1 text-sm opacity-60">
        AI 문제 생성과 채팅에 사용됩니다. Google 계정 OAuth(Code Assist)로
        인증하며, refresh token은 서버 로컬에만 저장되고 자동 갱신됩니다.
      </p>

      {status === null ? (
        <p className="mt-4 text-sm opacity-50">확인 중…</p>
      ) : (
        <div className="mt-4 space-y-1.5 text-sm">
          <div>
            상태:{" "}
            {status.configured ? (
              <span className="text-green-600">연결됨</span>
            ) : (
              <span className="text-red-600">미연결</span>
            )}
          </div>
          {status.configured && (
            <>
              <div className="opacity-70">티어: {status.tier ?? "-"}</div>
              <div className="opacity-70">모델: {status.model}</div>
              <div className="opacity-50 text-xs">프로젝트: {status.project ?? "-"}</div>
            </>
          )}
        </div>
      )}

      {status && !status.configured && (
        <div className="mt-4 rounded-md border border-dashed border-black/15 p-4 text-xs opacity-70 dark:border-white/20">
          연결되어 있지 않습니다. 서버(앱이 실행되는 PC)에서 아래를 1회 실행해
          Google 로그인하세요:
          <pre className="mt-2 overflow-x-auto rounded bg-black/5 p-2 dark:bg-white/10">
            node scripts/gemini-oauth-setup.js
          </pre>
        </div>
      )}
    </div>
  );
}
