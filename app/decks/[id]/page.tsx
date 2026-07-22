import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeck } from "@/lib/repo/decks";
import { listCards } from "@/lib/repo/cards";
import CardsClient from "@/components/cards/CardsClient";

export const dynamic = "force-dynamic";

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deckId = Number(id);
  const deck = getDeck(deckId);
  if (!deck) notFound();

  const cards = listCards(deckId);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/decks" className="text-sm text-blue-600 hover:underline">
        ← 덱 목록
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{deck.name}</h1>
      {deck.description && (
        <p className="mt-1 opacity-60">{deck.description}</p>
      )}
      <div className="mt-6">
        <CardsClient deckId={deckId} cards={cards} />
      </div>
    </div>
  );
}
