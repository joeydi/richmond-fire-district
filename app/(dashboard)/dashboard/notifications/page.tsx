import { getUserProfile, requireAuth } from "@/lib/auth/roles";
import {
  getNotificationPreferences,
  getDefaultPreferences,
} from "@/lib/actions/notifications";
import { NotificationsForm } from "./notifications-form";

export default async function NotificationsPage() {
  const user = await requireAuth();
  const profile = await getUserProfile();

  if (!profile) {
    return null;
  }

  const preferences = await getNotificationPreferences();
  const defaultPrefs = await getDefaultPreferences(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <NotificationsForm
        preferences={preferences}
        defaultPreferences={defaultPrefs}
        userEmail={profile.email}
      />
    </div>
  );
}
