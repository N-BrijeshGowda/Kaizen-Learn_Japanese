import Link from "next/link";

/** Holds the place of a screen that belongs to a later milestone (PRD section 18). */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid gap-6">
      <header className="rise">
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
      </header>
      <section className="card rise p-8" style={{ "--i": 1 } as React.CSSProperties}>
        <span className="tag tag-yellow">Next release</span>
        <p className="mt-4 max-w-[52ch] text-lg text-ink-2">{description}</p>
        <Link href="/learn" className="btn btn-primary mt-6">
          Go to Learn
        </Link>
      </section>
    </div>
  );
}
