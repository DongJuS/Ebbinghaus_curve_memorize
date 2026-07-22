import SettingsClient from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">설정</h1>
      <p className="mt-1 opacity-60">앱 설정을 관리합니다.</p>
      <div className="mt-6">
        <SettingsClient />
      </div>
    </div>
  );
}
