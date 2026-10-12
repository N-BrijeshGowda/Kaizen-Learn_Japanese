"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { TOAST_EVENT, showToast, takeQueuedToast } from "@/lib/toast";

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  function show(text: string) {
    setMessage(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 4200);
  }

  useEffect(() => {
    const onToast = (event: Event) => show((event as CustomEvent<string>).detail);
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // A toast queued by the previous page appears once the next page is showing.
  useEffect(() => {
    const queued = takeQueuedToast();
    if (queued) showToast(queued);
  }, [pathname]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[var(--z-toast)] flex justify-center px-4 min-[900px]:bottom-8" aria-live="polite" role="status">
      {message && (
        <div className="rise pointer-events-auto max-w-md rounded-full bg-ink px-5 py-3 text-sm font-semibold text-canvas">
          {message}
        </div>
      )}
    </div>
  );
}
