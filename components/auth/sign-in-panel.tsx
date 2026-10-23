"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  AuthHeading,
  AuthLabel,
  AuthNotice,
  authInputClass,
  authPrimaryButtonClass,
  EnterHint,
} from "./auth-ui";

export type SignInView = "sign-in" | "forgot";

interface SignInPanelProps {
  view: SignInView;
  notice?: { tone: "error" | "success"; text: string } | null;
}

export function SignInPanel({ view, notice }: SignInPanelProps) {
  return view === "forgot" ? <ForgotPasswordForm /> : <SignInForm notice={notice} />;
}

function SignInForm({ notice }: { notice?: SignInPanelProps["notice"] }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const shownNotice = error ? { tone: "error" as const, text: error } : notice;

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
      <AuthHeading
        eyebrow="OPERATOR SIGN-IN"
        title="Richmond Fire District"
        description="Water System Management App"
      />

      {shownNotice && <AuthNotice tone={shownNotice.tone}>{shownNotice.text}</AuthNotice>}

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="flex h-9 items-center justify-center gap-2 rounded-sm border bg-background px-3 font-medium transition-colors hover:bg-muted disabled:opacity-60"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="flex items-center gap-2.5">
        <div className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
          OR EMAIL
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-1.5">
        <AuthLabel htmlFor="email">EMAIL</AuthLabel>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className={authInputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline">
          <div className="flex-1">
            <AuthLabel htmlFor="password">PASSWORD</AuthLabel>
          </div>
          <Link
            href="/?view=forgot"
            className="font-mono text-[10px] tracking-[0.06em] text-zinc-600 hover:text-foreground"
          >
            FORGOT?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          className={authInputClass}
        />
      </div>

      <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
        {loading ? "Signing in…" : "Sign in"}
        {!loading && <EnterHint />}
      </button>
    </form>
  );
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSentTo(email);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AuthHeading
        eyebrow="PASSWORD RESET"
        title="Reset your password"
        description="We'll email you a link to set a new one."
      />

      {error && <AuthNotice tone="error">{error}</AuthNotice>}

      {sentTo ? (
        <AuthNotice tone="success">
          Check {sentTo} for a password reset link.
        </AuthNotice>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <AuthLabel htmlFor="reset-email">EMAIL</AuthLabel>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoFocus
              className={authInputClass}
            />
          </div>

          <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
            {loading ? "Sending…" : "Send reset link"}
            {!loading && <EnterHint />}
          </button>
        </>
      )}

      <Link
        href="/"
        className="self-start font-mono text-[10px] tracking-[0.06em] text-zinc-600 hover:text-foreground"
      >
        ← BACK TO SIGN IN
      </Link>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
