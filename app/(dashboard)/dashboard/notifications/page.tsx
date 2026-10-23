import { getUserProfile, requireAuth } from "@/lib/auth/roles";
import {
  getNotificationPreferences,
  getDefaultPreferences,
} from "@/lib/actions/notifications";
import { SettingsNav } from "@/components/settings/settings-nav";
import { NotificationsForm } from "./notifications-form";

export default async function NotificationsPage() {
  const user = await requireAuth();
  const profile = await getUserProfile();

  if (!profile) {
    return null;
  }

  const [preferences, defaultPrefs] = await Promise.all([
    getNotificationPreferences(),
    getDefaultPreferences(user.id),
  ]);

  return (
    <div data-flush className="flex min-h-full flex-col">
      <SettingsNav />
      <NotificationsForm
        preferences={preferences}
        defaultPreferences={defaultPrefs}
        userEmail={profile.email}
      />
    </div>
  );
}
