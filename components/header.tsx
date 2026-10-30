import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { AuthStatus } from "@/components/auth-status";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/dictionaries";

interface HeaderProps {
  locale: Locale;
  dictionary: Dictionary;
}

export function Header({ locale, dictionary }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link href={`/${locale}`} className="flex items-center gap-2">
        <Logo className="size-5" aria-hidden="true" />
      </Link>
      <div className="flex items-center gap-0.5 whitespace-nowrap sm:gap-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground max-sm:px-1.5" render={<Link href={`/${locale}/highlights`} />}>
          {dictionary.nav.highlights}
        </Button>
        <AuthStatus
          locale={locale}
          signedInLabel={dictionary.auth.me}
          signInLabel={dictionary.auth.signIn}
          signOutLabel={dictionary.auth.signOut}
        />
        <LocaleSwitcher locale={locale} label={dictionary.nav.languageLabel} />
      </div>
    </header>
  );
}
