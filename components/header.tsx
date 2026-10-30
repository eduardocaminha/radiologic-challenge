import Link from "next/link";
import { Suspense } from "react";
import { FluidNav } from "@/components/fluid-nav";
import { HeaderSubmit } from "@/components/header-submit";
import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteMenu } from "@/components/site-menu";
import { AuthStatus } from "@/components/auth-status";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/dictionaries";

interface HeaderProps {
  locale: Locale;
  dictionary: Dictionary;
}

export function Header({ locale, dictionary }: HeaderProps) {
  const links = [
    { href: `/${locale}/highlights`, label: dictionary.nav.highlights },
    { href: `/${locale}/kit`, label: dictionary.footer.kit },
    { href: `/${locale}/rules`, label: dictionary.footer.rules },
  ];
  const submit = { href: `/${locale}/submit`, label: dictionary.home.submit };

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-4">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}`} aria-label={dictionary.home.title} className="-m-2 flex items-center gap-2 p-2">
          <Logo className="size-5" aria-hidden="true" />
        </Link>
        <FluidNav id="header" label={dictionary.nav.label} links={links} className="hidden lg:flex" />
      </div>
      <div className="flex items-center gap-1 whitespace-nowrap sm:gap-2">
        <SiteMenu label={dictionary.nav.menu} links={[...links, submit]} />
        <Suspense fallback={null}>
          <LocaleSwitcher locale={locale} label={dictionary.nav.languageLabel} />
        </Suspense>
        <AuthStatus
          locale={locale}
          signedInLabel={dictionary.auth.me}
          signInLabel={dictionary.auth.signIn}
          signOutLabel={dictionary.auth.signOut}
        />
        <HeaderSubmit locale={locale} label={submit.label} />
      </div>
    </header>
  );
}
