import { isConfigured } from "@/lib/gemini";
import ChatConsole from "@/components/chat/ChatConsole";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  const configured = isConfigured();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">AI 채팅</h1>
      <p className="mt-1 opacity-60">Gemini와 자유롭게 대화하세요.</p>
      <div className="mt-6">
        <ChatConsole configured={configured} />
      </div>
    </div>
  );
}
