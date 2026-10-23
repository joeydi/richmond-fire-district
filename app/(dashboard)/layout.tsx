import { getUserProfile } from "@/lib/auth/roles";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserProfile();

  return (
    <DashboardShell isAdmin={user?.role === "admin"} user={user}>
      {children}
    </DashboardShell>
  );
}
