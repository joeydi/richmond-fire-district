import { isAdmin } from "@/lib/auth/roles";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userIsAdmin = await isAdmin();

  return <DashboardShell isAdmin={userIsAdmin}>{children}</DashboardShell>;
}
