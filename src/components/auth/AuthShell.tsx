import { Brand } from "@/components/app/Brand";

/** Deterministic grass: a field of thin blades along a baseline, so the poster renders the same every time. */
function grassPath(seed: number, blades: number, minH: number, maxH: number) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const W = 1200;
  const base = 200;
  let d = `M0,${base} `;
  for (let i = 0; i < blades; i++) {
    const x = (i / blades) * W + rand() * 6;
    const h = minH + rand() * (maxH - minH);
    const lean = (rand() - 0.5) * 14;
    const w = 3 + rand() * 6;
    d += `L${x.toFixed(1)},${base} L${(x + lean).toFixed(1)},${(base - h).toFixed(1)} L${(x + w).toFixed(1)},${base} `;
  }
  return d + `L${W},${base} Z`;
}

const GRASS_BACK = grassPath(7, 110, 30, 85);
const GRASS_FRONT = grassPath(31, 140, 12, 50);

/**
 * Sign-in poster: a misty grey field, one vermilion sun, a bold Japanese line, an outlined kanji and a
 * dark strip of grass. The form sits in a quiet card on top. Colours follow the app tokens, light and dark.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-canvas p-3 sm:p-6">
      <div
        className="relative isolate flex min-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-xl border border-line sm:min-h-[calc(100dvh-3rem)]"
        style={{ background: "linear-gradient(180deg, var(--mist-top) 0%, var(--mist-bottom) 100%)" }}
      >
        {/* The sun */}
        <span
          aria-hidden="true"
          className="absolute -z-10 aspect-square rounded-full bg-accent opacity-80 left-[-4rem] top-[18rem] w-[16rem] sm:left-[6%] sm:top-[16%] sm:w-[22rem] lg:left-[12%] lg:top-[22%] lg:w-[26rem]"
        />
        {/* Outlined kanji */}
        <span
          aria-hidden="true"
          className="jp pointer-events-none absolute -z-10 select-none font-bold leading-none text-transparent right-[-2rem] top-[3rem] text-[12rem] lg:left-[37%] lg:right-auto lg:top-[6%] lg:text-[17rem]"
          style={{ WebkitTextStroke: "2px var(--line-strong)", opacity: 0.55 }}
        >
          改
        </span>
        {/* Mist and grass */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[38%]">
          <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="absolute inset-0 size-full">
            <path d={GRASS_BACK} fill="var(--grass)" opacity="0.35" />
            <path d={GRASS_FRONT} fill="var(--grass)" />
          </svg>
        </div>

        <div className="grid flex-1 items-center gap-10 px-6 py-8 sm:px-12 sm:py-10 lg:grid-cols-[1.25fr_1fr] lg:px-16">
          <div className="flex h-full flex-col justify-between gap-10 lg:py-4">
            <Brand href={null} />
            <div className="max-w-xl">
              <h1 className="jp text-4xl font-bold leading-[1.3] tracking-tight text-ink sm:text-5xl lg:text-6xl" lang="ja">
                毎日、少しずつ。
                <br />
                話せる自分へ。
              </h1>
              <p className="mt-6 max-w-[40ch] text-ink-2">
                Short, polite Japanese for the office. Start with single words, then build up to real sentences, a few minutes a day.
              </p>
            </div>
            <span className="hidden lg:block" />
          </div>

          <div className="relative z-10 w-full max-w-sm justify-self-center rounded-xl border border-line bg-surface p-7 sm:p-8 lg:justify-self-end">{children}</div>
        </div>
      </div>
    </main>
  );
}
