/** Shown instantly while the next page loads, so a click always gets an answer. Matches the page header plus a card grid. */
export function PageSkeleton() {
  return (
    <div className="grid gap-8" role="status" aria-label="Loading">
      <div className="grid gap-3">
        <div className="skeleton h-12 w-2/5" />
        <div className="skeleton h-5 w-3/5" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="skeleton h-56 rounded-xl lg:col-span-2" />
        <div className="skeleton h-56 rounded-xl" />
        <div className="skeleton h-40 rounded-xl" />
        <div className="skeleton h-40 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}
