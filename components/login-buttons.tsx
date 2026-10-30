"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/i18n";

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
    <div className="flex w-full max-w-xs flex-col gap-2">
      {error ? (
        <p role="alert" className="text-sm text-destructive-foreground">
          {errorMessage}
        </p>
      ) : null}
      <Button size="lg" variant="outline" className="w-full" onClick={() => void signIn("google")} disabled={pendingProvider !== null} loading={pendingProvider === "google"}>
        {googleLabel}
      </Button>
      <Button size="lg" variant="outline" className="w-full" onClick={() => void signIn("github")} disabled={pendingProvider !== null} loading={pendingProvider === "github"}>
        {githubLabel}
      </Button>
    </div>
  );
}
