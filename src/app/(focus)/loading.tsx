export default function Loading() {
  return (
    <div className="grid gap-5" role="status" aria-label="Loading">
      <div className="skeleton h-6 w-1/3" />
      <div className="skeleton h-72 rounded-xl" />
      <div className="skeleton h-12 w-40 !rounded-full" />
    </div>
  );
}
