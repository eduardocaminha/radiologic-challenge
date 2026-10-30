"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuLinkItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/i18n";

interface AuthStatusProps {
  locale: Locale;
  accountLabel: string;
  submissionsLabel: string;
  signInLabel: string;
  signOutLabel: string;
}

const PROVIDERS: Record<string, string> = { google: "Google", github: "GitHub" };

// Só para exibir: autorização nunca lê estes campos.
function accountName(user: User) {
  const name: unknown = user.user_metadata.full_name ?? user.user_metadata.name;
  return typeof name === "string" && name.trim() ? name.trim() : (user.email ?? "");
}

export function AuthStatus({ locale, accountLabel, submissionsLabel, signInLabel, signOutLabel }: AuthStatusProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(() => !hasSupabaseConfig());

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setUser(data.session?.user ?? null);
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
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

  if (!ready || !user) {
    if (pathname === `/${locale}/login`) return null;
    return (
      <Button variant="outline" size="sm" render={<Link href={`/${locale}/login`} />}>
        {signInLabel}
      </Button>
    );
  }

  const name = accountName(user);
  const provider = PROVIDERS[user.app_metadata.provider ?? ""];

  return (
    <Menu>
      <MenuTrigger render={<Button variant="outline" size="icon-sm" aria-label={accountLabel} className="uppercase" />}>
        {name.charAt(0)}
      </MenuTrigger>
      <MenuPopup align="end">
        <div className="flex max-w-64 flex-col gap-0.5 px-2 py-1.5 text-sm">
          <span className="truncate font-medium">{name}</span>
          {user.email && user.email !== name ? <span className="truncate text-muted-foreground">{user.email}</span> : null}
          {provider ? <span className="text-muted-foreground">{provider}</span> : null}
        </div>
        <MenuSeparator />
        <MenuLinkItem render={<Link href={`/${locale}/me`} />}>{submissionsLabel}</MenuLinkItem>
        <MenuItem onClick={signOut}>{signOutLabel}</MenuItem>
      </MenuPopup>
    </Menu>
  );
}
