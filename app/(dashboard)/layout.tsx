import { getUserProfile } from "@/lib/auth/roles";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getUserProfile();
  const isAdmin = profile?.role === "admin";

  return <DashboardShell isAdmin={isAdmin}>{children}</DashboardShell>;
}
