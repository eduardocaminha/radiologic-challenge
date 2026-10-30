"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/i18n";

interface AuthStatusProps {
  locale: Locale;
  signedInLabel: string;
  signInLabel: string;
  signOutLabel: string;
}

export function AuthStatus({ locale, signedInLabel, signInLabel, signOutLabel }: AuthStatusProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(() => !hasSupabaseConfig());

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSignedIn(Boolean(data.session));
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSignedIn(Boolean(session));
        setReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    await supabase.auth.signOut();
    router.push(`/${locale}`);
  }

  if (!ready || !signedIn) {
    if (pathname === `/${locale}/login`) return null;
    return (
      <Button variant="outline" size="sm" render={<Link href={`/${locale}/login`} />}>
        {signInLabel}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <Button variant="outline" size="sm" render={<Link href={`/${locale}/me`} />}>
        {signedInLabel}
      </Button>
      <Button variant="ghost" size="sm" className="text-muted-foreground max-sm:px-1.5" onClick={signOut}>
        {signOutLabel}
      </Button>
    </div>
  );
}
