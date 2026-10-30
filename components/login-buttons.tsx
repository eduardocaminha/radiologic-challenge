"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/i18n";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4.5">
      <path d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.77-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.27a12 12 0 0 0 0 10.76l4.01-3.1Z" />
      <path d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.53 11.53 0 0 0 12 0 12 12 0 0 0 1.27 6.62l4.01 3.1C6.23 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4.5">
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.31-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}

interface LoginButtonsProps {
  locale: Locale;
  next: string | null;
  errorMessage: string;
  hasInitialError: boolean;
  googleLabel: string;
  githubLabel: string;
}

export function LoginButtons({
  locale,
  next,
  errorMessage,
  hasInitialError,
  googleLabel,
  githubLabel,
}: LoginButtonsProps) {
  const [pendingProvider, setPendingProvider] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState(hasInitialError);

  async function signIn(provider: "google" | "github") {
    setPendingProvider(provider);
    setError(false);

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("locale", locale);
    if (next) callback.searchParams.set("next", next);

    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error("Supabase browser configuration is missing");

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callback.toString() },
      });

      if (signInError) throw signInError;
    } catch {
      setPendingProvider(null);
      setError(true);
    }
  }

  return (
    <div className="flex w-72 max-w-full flex-col gap-2">
      {error ? (
        <p role="alert" className="text-sm text-destructive-foreground">
          {errorMessage}
        </p>
      ) : null}
      <Button size="lg" variant="outline" className="w-full" onClick={() => void signIn("google")} disabled={pendingProvider !== null} loading={pendingProvider === "google"}>
        <GoogleIcon />
        {googleLabel}
      </Button>
      <Button size="lg" variant="outline" className="w-full" onClick={() => void signIn("github")} disabled={pendingProvider !== null} loading={pendingProvider === "github"}>
        <GithubIcon />
        {githubLabel}
      </Button>
    </div>
  );
}
