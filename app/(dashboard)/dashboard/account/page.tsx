import { getUserProfile, requireAuth } from "@/lib/auth/roles";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  await requireAuth();
  const user = await getUserProfile();

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AccountForm user={user} />
    </div>
  );
}
