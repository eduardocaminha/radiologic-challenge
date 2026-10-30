import Link from "next/link";
import { FooterWordmark } from "@/components/footer-wordmark";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";

export const CONTACT_EMAIL = "caminha@radiologic.io";
export const SOURCE_URL = "https://github.com/eduardocaminha/radiologic-viewers";

const LINK = "rounded-sm py-1.5 outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

interface FooterProps {
  locale: Locale;
  dictionary: Dictionary;
}

export function Footer({ locale, dictionary }: FooterProps) {
  const t = dictionary.footer;
  const links = [
    { href: `/${locale}/rules`, label: t.rules },
    { href: `/${locale}/privacy`, label: t.privacy },
    { href: `/${locale}/kit`, label: t.kit },
  ];

  const month = new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", { month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date());

  return (
    <footer className="mx-auto w-full max-w-6xl px-6 pt-20">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <nav aria-label={t.label} className="flex flex-wrap gap-x-5 text-sm text-muted-foreground">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={LINK}>{link.label}</Link>
          ))}
          <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{t.contact}</a>
          <a href={SOURCE_URL} className={LINK}>{t.source}</a>
        </nav>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Radiologic</p>
      </div>
      <div className="mt-16">
        <FooterWordmark siteName={t.siteName} month={month} nonClinical={t.nonClinical} />
      </div>
    </footer>
  );
}
