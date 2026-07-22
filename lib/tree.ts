import type { Card } from "@/lib/types";

export interface TreeNodePos {
  x: number;
  y: number;
}

const X_GAP = 190;
const Y_GAP = 120;

/**
 * 카드들의 parent_id 관계로 트리 레이아웃 좌표를 계산한다.
 * 리프는 순서대로 가로 배치하고, 부모는 자식들의 평균 x에 위치시킨다(tidy tree).
 * 덱 밖의 부모를 가리키거나 parent_id가 없는 카드는 루트로 취급한다.
 */
export function layoutTree(cards: Card[]): Record<number, TreeNodePos> {
  const byId = new Map<number, Card>(cards.map((c) => [c.id, c]));
  const children = new Map<number, Card[]>();
  const roots: Card[] = [];

  for (const c of cards) {
    if (c.parent_id != null && byId.has(c.parent_id)) {
      const arr = children.get(c.parent_id) ?? [];
      arr.push(c);
      children.set(c.parent_id, arr);
    } else {
      roots.push(c);
    }
  }

  const pos: Record<number, TreeNodePos> = {};
  let nextLeafX = 0;
  const visiting = new Set<number>();

  function place(card: Card, depth: number): number {
    if (visiting.has(card.id)) {
      // 방어적 순환 차단.
      const x = nextLeafX++ * X_GAP;
      pos[card.id] = { x, y: depth * Y_GAP };
      return x;
    }
    visiting.add(card.id);
    const kids = children.get(card.id) ?? [];
    let x: number;
    if (kids.length === 0) {
      x = nextLeafX++ * X_GAP;
    } else {
      const xs = kids.map((k) => place(k, depth + 1));
      x = xs.reduce((a, b) => a + b, 0) / xs.length;
    }
    pos[card.id] = { x, y: depth * Y_GAP };
    visiting.delete(card.id);
    return x;
  }

  for (const r of roots) place(r, 0);
  return pos;
}

/**
 * childId의 부모를 parentId로 지정할 때 순환이 생기는지 검사한다.
 * parentId가 childId 자신이거나, childId의 자손이면 순환.
 */
export function wouldCreateCycle(
  cards: Card[],
  childId: number,
  parentId: number,
): boolean {
  if (childId === parentId) return true;
  const byId = new Map<number, Card>(cards.map((c) => [c.id, c]));
  // parentId에서 위로 올라가며 childId를 만나면 순환.
  let cursor: number | null = parentId;
  const seen = new Set<number>();
  while (cursor != null) {
    if (cursor === childId) return true;
    if (seen.has(cursor)) break;
    seen.add(cursor);
    cursor = byId.get(cursor)?.parent_id ?? null;
  }
  return false;
}
