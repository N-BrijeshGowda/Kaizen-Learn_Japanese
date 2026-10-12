import Link from "next/link";

/** The Kaizen mark: a cobalt tile with the kanji 改 (change), then the wordmark. */
export function Brand({ href = "/", size = "md", inverted = false }: { href?: string | null; size?: "md" | "lg"; inverted?: boolean }) {
  const tile = size === "lg" ? "size-11 text-xl" : "size-9 text-lg";
  const word = size === "lg" ? "text-2xl" : "text-xl";
  const content = (
    <>
      <span
        className={`jp grid ${tile} place-items-center rounded-lg font-semibold ${inverted ? "bg-[var(--accent-ink)] text-[var(--accent)]" : "bg-accent text-[var(--accent-ink)]"}`}
        aria-hidden="true"
      >
        改
      </span>
      <span className={`${word} font-semibold tracking-tight ${inverted ? "text-[var(--accent-ink)]" : "text-ink"}`}>Kaizen</span>
    </>
  );
  return href ? (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="Kaizen, home">
      {content}
    </Link>
  ) : (
    <div className="inline-flex items-center gap-2.5">{content}</div>
  );
}
