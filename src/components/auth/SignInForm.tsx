"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type Mode = "signin" | "signup";

const SIGN_IN_ERRORS: Record<string, string> = {
  deactivated: "This account has been deactivated. Ask the Kaizen admin if you think this is a mistake.",
  too_many_attempts: "Too many attempts. Please try again in 15 minutes.",
};

export function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Your password needs at least 8 characters.");

    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          return setError(data.error ?? "Something went wrong. Please try again.");
        }
      }

      // Both modes end the same way: sign in. For a new account this happens straight after it is created.
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        return setError(SIGN_IN_ERRORS[result?.code ?? ""] ?? "Email or password is incorrect");
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rise">
      <div role="tablist" aria-label="Account" className="mb-8 grid grid-cols-2 rounded-full border border-line bg-surface-2 p-1">
        {(["signup", "signin"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`min-h-10 rounded-full text-sm font-semibold transition-colors ${
              mode === m ? "border border-line bg-surface text-ink" : "border border-transparent text-muted hover:text-ink"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <h2 className="text-3xl">{mode === "signin" ? "Sign in" : "Create your account"}</h2>
      <p className="mb-6 mt-2 text-sm text-muted">
        {mode === "signin" ? "Welcome back. Use the email and password you signed up with." : "Pick an email and a password of at least 8 characters. You go straight in."}
      </p>

      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label className="mb-5 flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          Show password
        </label>

        {error && (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        )}

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? "One moment" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">Anyone can create an account. No invitation needed.</p>
    </div>
  );
}
