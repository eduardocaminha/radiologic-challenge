import Link from "next/link";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";

export const CONTACT_EMAIL = "caminha@radiologic.io";
export const SOURCE_URL = "https://github.com/eduardocaminha/radiologic-viewers";

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

  return (
    <footer className="mx-auto w-full max-w-6xl px-6 pb-10 pt-6">
      <nav aria-label={t.label} className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-foreground">{link.label}</Link>
        ))}
        <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground">{t.contact}</a>
        <a href={SOURCE_URL} className="hover:text-foreground">{t.source}</a>
      </nav>
    </footer>
  );
}
