import { listDecks } from "@/lib/repo/decks";
import MindmapView from "@/components/mindmap/MindmapView";

export const dynamic = "force-dynamic";

export default function MindmapPage() {
  const decks = listDecks();
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold">마인드맵</h1>
      <p className="mt-1 opacity-60">
        카드를 트리 구조로 연결해 개념 간 관계를 시각화하세요.
      </p>
      <div className="mt-6">
        <MindmapView decks={decks} />
      </div>
    </div>
  );
}
