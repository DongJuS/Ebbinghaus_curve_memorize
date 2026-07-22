import { listDecks } from "@/lib/repo/decks";
import DecksClient from "@/components/decks/DecksClient";

export const dynamic = "force-dynamic";

export default function DecksPage() {
  const decks = listDecks();
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">덱 / 카드</h1>
      <p className="mt-1 opacity-60">덱을 만들고 외울 카드를 추가하세요.</p>
      <div className="mt-6">
        <DecksClient decks={decks} />
      </div>
    </div>
  );
}
