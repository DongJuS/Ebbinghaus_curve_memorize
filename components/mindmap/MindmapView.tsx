"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Card, DeckWithStats } from "@/lib/types";
import { layoutTree, wouldCreateCycle } from "@/lib/tree";

const DIFF_BORDER: Record<string, string> = {
  easy: "#22c55e",
  medium: "#eab308",
  hard: "#ef4444",
};

export default function MindmapView({ decks }: { decks: DeckWithStats[] }) {
  const [deckId, setDeckId] = useState<number | null>(decks[0]?.id ?? null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCards = useCallback((id: number) => {
    setLoading(true);
    return fetch(`/api/decks/${id}/cards`)
      .then((r) => r.json())
      .then((data: Card[]) => setCards(data))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (deckId == null) return;
    let active = true;
    fetch(`/api/decks/${deckId}/cards`)
      .then((r) => r.json())
      .then((data: Card[]) => active && setCards(data))
      .catch(() => active && setCards([]));
    return () => {
      active = false;
    };
  }, [deckId]);

  const { nodes, edges } = useMemo(() => buildGraph(cards), [cards]);

  // 그래프 구조가 바뀌면 ReactFlow를 리마운트해 새 트리를 반영.
  const graphKey = useMemo(
    () => cards.map((c) => `${c.id}:${c.parent_id ?? "-"}`).join("|"),
    [cards],
  );

  const onConnect = useCallback(
    async (conn: Connection) => {
      if (deckId == null || !conn.source || !conn.target) return;
      const parentId = Number(conn.source);
      const childId = Number(conn.target);
      if (wouldCreateCycle(cards, childId, parentId)) {
        alert("순환 관계는 만들 수 없습니다.");
        return;
      }
      await fetch(`/api/cards/${childId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_id: parentId }),
      });
      await loadCards(deckId);
    },
    [cards, deckId, loadCards],
  );

  const onEdgesDelete = useCallback(
    async (removed: Edge[]) => {
      if (deckId == null) return;
      for (const e of removed) {
        await fetch(`/api/cards/${Number(e.target)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parent_id: null }),
        });
      }
      await loadCards(deckId);
    },
    [deckId, loadCards],
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <select
          value={deckId ?? ""}
          onChange={(e) => setDeckId(Number(e.target.value))}
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20"
        >
          {decks.length === 0 && <option value="">덱 없음</option>}
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.card_count})
            </option>
          ))}
        </select>
        <span className="text-xs opacity-50">
          부모 노드 아래 손잡이 → 자식 노드 위 손잡이로 드래그하면 관계가 생깁니다. 연결선을
          선택 후 Delete로 해제.
        </span>
      </div>

      <div className="h-[70vh] rounded-xl border border-black/10 dark:border-white/10">
        {decks.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm opacity-60">
            먼저 덱과 카드를 만들어 주세요.
          </div>
        ) : cards.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm opacity-60">
            {loading ? "불러오는 중…" : "이 덱에는 카드가 없습니다."}
          </div>
        ) : (
          <ReactFlow
            key={graphKey}
            defaultNodes={nodes}
            defaultEdges={edges}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

function buildGraph(cards: Card[]): { nodes: Node[]; edges: Edge[] } {
  const pos = layoutTree(cards);
  const ids = new Set(cards.map((c) => c.id));

  const nodes: Node[] = cards.map((c) => ({
    id: String(c.id),
    position: pos[c.id] ?? { x: 0, y: 0 },
    data: { label: c.front },
    style: {
      borderColor: DIFF_BORDER[c.difficulty] ?? "#999",
      borderWidth: 2,
      borderRadius: 8,
      fontSize: 12,
      maxWidth: 160,
    },
  }));

  const edges: Edge[] = cards
    .filter((c) => c.parent_id != null && ids.has(c.parent_id))
    .map((c) => ({
      id: `e${c.parent_id}-${c.id}`,
      source: String(c.parent_id),
      target: String(c.id),
    }));

  return { nodes, edges };
}
