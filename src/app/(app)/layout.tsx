import { Shell } from "@/components/app/Shell";
import { requireUser } from "@/lib/dal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <Shell userName={user.name} role={user.role}>{children}</Shell>;
}
