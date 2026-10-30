import { FooterWordmark } from "@/components/footer-wordmark";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";

interface FooterProps {
  locale: Locale;
  dictionary: Dictionary;
}

export function Footer({ locale, dictionary }: FooterProps) {
  const now = new Date();
  const month = new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", { month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(now);

  return (
    <footer className="mx-auto w-full max-w-6xl px-6 pt-20">
      <FooterWordmark copyright={`© ${now.getFullYear()} Radiologic`} month={month} nonClinical={dictionary.footer.nonClinical} />
    </footer>
  );
}
