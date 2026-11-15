/** Results take a moment to assemble; this keeps the layout stable meanwhile. */
export default function ResultsLoading() {
  return (
    <div className="container max-w-5xl space-y-8 py-10 md:py-14" aria-busy="true">
      <div className="h-8 w-64 animate-pulse rounded-md bg-secondary" />
      <div className="h-56 animate-pulse rounded-xl bg-secondary" />
      <div className="h-80 animate-pulse rounded-xl bg-secondary" />
      <div className="h-64 animate-pulse rounded-xl bg-secondary" />
      <span className="sr-only">Loading your results…</span>
    </div>
  );
}
