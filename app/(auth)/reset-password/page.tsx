"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthHeading,
  AuthLabel,
  AuthNotice,
  authInputClass,
  authPrimaryButtonClass,
  EnterHint,
} from "@/components/auth/auth-ui";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Supabase handles the token from the URL hash automatically
    // We just need to check if a session is established
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
      } else {
        // Listen for auth state changes (token exchange)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY") {
            setReady(true);
          }
        });
        return () => subscription.unsubscribe();
      }
    };
    checkSession();
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
        return;
      }

      // Sign out and return to sign-in
      await supabase.auth.signOut();
      router.push("/?notice=password_updated");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <AuthShell>
        <div className="flex flex-col gap-4">
          <AuthHeading
            eyebrow="PASSWORD RESET"
            title="Verifying your link"
            description="Please wait while we verify your password reset link."
          />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthHeading
          eyebrow="PASSWORD RESET"
          title="Set a new password"
          description="Use at least 6 characters."
        />

        {error && <AuthNotice tone="error">{error}</AuthNotice>}

        <div className="flex flex-col gap-1.5">
          <AuthLabel htmlFor="password">NEW PASSWORD</AuthLabel>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoFocus
            className={authInputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <AuthLabel htmlFor="confirmPassword">CONFIRM PASSWORD</AuthLabel>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            className={authInputClass}
          />
        </div>

        <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
          {loading ? "Updating…" : "Update password"}
          {!loading && <EnterHint />}
        </button>
      </form>
    </AuthShell>
  );
}
