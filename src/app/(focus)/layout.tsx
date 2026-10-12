import { requireUser } from "@/lib/dal";

/** Full-focus screens (the lesson card): no sidebar or tab bar, just the task. */
export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <main className="mx-auto w-full max-w-2xl px-5 pb-6 pt-3 sm:pt-5">{children}</main>;
}
