import { AuthShell } from "@/components/auth/auth-shell";
import { SignInPanel } from "@/components/auth/sign-in-panel";

const NOTICES = {
  auth_callback_error: { tone: "error", text: "Google sign-in didn't complete. Please try again." },
  password_updated: { tone: "success", text: "Password updated. Sign in with your new password." },
} as const;

type NoticeKey = keyof typeof NOTICES;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; error?: string; notice?: string }>;
}) {
  const { view, error, notice } = await searchParams;
  const key = error ?? notice;

  return (
    <AuthShell>
      <SignInPanel
        view={view === "forgot" ? "forgot" : "sign-in"}
        notice={key && key in NOTICES ? NOTICES[key as NoticeKey] : null}
      />
    </AuthShell>
  );
}
