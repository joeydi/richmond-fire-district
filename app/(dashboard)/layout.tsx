import { isAdmin, getUserProfile } from "@/lib/auth/roles";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userIsAdmin, user] = await Promise.all([isAdmin(), getUserProfile()]);

  return (
    <DashboardShell isAdmin={userIsAdmin} user={user}>
      {children}
    </DashboardShell>
  );
}
