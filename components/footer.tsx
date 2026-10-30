import Link from "next/link";
import { FooterWordmark } from "@/components/footer-wordmark";
import { GithubIcon } from "@/components/github-icon";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/dictionaries";
import { intlLocales, type Locale } from "@/lib/i18n";

const CONTACT_EMAIL = "caminha@radiologic.io";
const SOURCE_URL = "https://github.com/eduardocaminha/radiologic-viewers";

interface FooterProps {
  locale: Locale;
  dictionary: Dictionary;
}

export function Footer({ locale, dictionary }: FooterProps) {
  const now = new Date();
  const month = new Intl.DateTimeFormat(intlLocales[locale], { month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(now);

  return (
    <footer className="mx-auto w-full max-w-6xl px-6 pt-20">
      <FooterWordmark copyright={`© ${now.getFullYear()} Radiologic`} month={month} nonClinical={dictionary.footer.nonClinical} />
      <nav aria-label={dictionary.nav.footerLabel} className="-mx-2.5 flex flex-wrap items-center gap-0.5 py-4">
        <Button variant="ghost" size="sm" className="text-muted-foreground" render={<Link href={`/${locale}/privacy`} />}>{dictionary.footer.privacy}</Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" render={<a href={`mailto:${CONTACT_EMAIL}`} />}>{dictionary.footer.contact}</Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" render={<a href={SOURCE_URL} />}>
          <GithubIcon />
          {dictionary.footer.source}
        </Button>
      </nav>
    </footer>
  );
}
