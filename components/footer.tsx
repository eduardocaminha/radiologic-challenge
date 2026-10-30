import Link from "next/link";
import { FooterWordmark } from "@/components/footer-wordmark";
import { GithubIcon } from "@/components/github-icon";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";

const CONTACT_EMAIL = "caminha@radiologic.io";
const SOURCE_URL = "https://github.com/eduardocaminha/radiologic-viewers";

interface FooterProps {
  locale: Locale;
  dictionary: Dictionary;
}

export function Footer({ locale, dictionary }: FooterProps) {
  return (
    <footer className="mx-auto w-full max-w-6xl px-6 pt-20">
      <FooterWordmark />
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 text-sm text-muted-foreground sm:grid-cols-3">
        <div className="flex flex-col gap-3">
          <Link href={`/${locale}`} aria-label={dictionary.home.title} className="w-fit text-foreground">
            <Logo className="size-5" aria-hidden="true" />
          </Link>
          <span>© {new Date().getFullYear()} Radiologic</span>
        </div>
        <nav aria-label={dictionary.nav.footerLabel} className="-ms-2.5 flex flex-col items-start gap-0.5">
          <Button variant="ghost" size="sm" className="text-muted-foreground" render={<Link href={`/${locale}/privacy`} />}>{dictionary.footer.privacy}</Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" render={<a href={`mailto:${CONTACT_EMAIL}`} />}>{dictionary.footer.contact}</Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" render={<a href={SOURCE_URL} />}>
            <GithubIcon />
            {dictionary.footer.source}
          </Button>
        </nav>
        <span className="max-sm:col-span-2 sm:text-end">{dictionary.footer.nonClinical}</span>
      </div>
    </footer>
  );
}
