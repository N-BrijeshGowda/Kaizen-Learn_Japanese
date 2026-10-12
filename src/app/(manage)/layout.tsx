import { redirect } from "next/navigation";
import { Shell } from "@/components/app/Shell";
import { getUser } from "@/lib/dal";

/** Admin and reviewer screens: same shell, wider for tables. Each page also checks its own role. */
export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/signin");
  if (user.role === "learner") redirect("/");
  return (
    <Shell userName={user.name} role={user.role} wide>
      {children}
    </Shell>
  );
}
