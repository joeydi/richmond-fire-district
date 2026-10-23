import { getUserProfile, requireAuth } from "@/lib/auth/roles";
import { SettingsNav } from "@/components/settings/settings-nav";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  await requireAuth();
  const user = await getUserProfile();

  if (!user) {
    return null;
  }

  return (
    <div data-flush className="flex min-h-full flex-col">
      <SettingsNav />
      <AccountForm user={user} />
    </div>
  );
}
