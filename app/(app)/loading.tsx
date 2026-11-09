// Shown the moment a sidebar link is clicked, while the next page's queries run.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="mb-5 h-[120px] rounded-[22px] bg-[var(--surface-2)]" />
      <div className="mb-4 flex gap-3">
        <div className="h-10 w-40 rounded-xl bg-[var(--surface-2)]" />
        <div className="h-10 w-32 rounded-xl bg-[var(--surface-2)]" />
        <div className="h-10 w-32 rounded-xl bg-[var(--surface-2)]" />
      </div>
      <div className="card space-y-3 p-6">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-8 rounded-lg bg-[var(--surface-2)]" />
        ))}
      </div>
    </div>
  );
}
