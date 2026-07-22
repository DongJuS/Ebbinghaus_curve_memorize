export default function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-black/15 p-8 text-sm opacity-70 dark:border-white/20">
        <p>{description}</p>
        <p className="mt-2">🚧 이 기능은 곧 제공됩니다.</p>
      </div>
    </div>
  );
}
