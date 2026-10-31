import Link from "next/link";
import { AsciiWake } from "@/components/ascii-wake";
import { FluidNav } from "@/components/fluid-nav";
import { GithubIcon } from "@/components/github-icon";
import { Logo } from "@/components/logo";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";

const CONTACT_EMAIL = "caminha@radiologic.io";
const SOURCE_URL = "https://github.com/eduardocaminha/radiologic-challenge";

interface FooterProps {
  locale: Locale;
  dictionary: Dictionary;
}

export function Footer({ locale, dictionary }: FooterProps) {
  return (
    <footer className="mx-auto w-full max-w-6xl px-6 pt-20">
      <AsciiWake />
      <div className="grid grid-cols-2 gap-x-6 py-10 text-sm text-muted-foreground">
        <div className="flex flex-col gap-3">
          <Link href={`/${locale}`} aria-label={dictionary.home.title} className="-m-2 w-fit p-2 text-foreground">
            <Logo className="size-5" aria-hidden="true" />
          </Link>
          <div className="flex flex-col gap-0.5">
            <span>© {new Date().getFullYear()} Radiologic</span>
            <span>{dictionary.footer.nonClinical}</span>
          </div>
        </div>
        <FluidNav
          id="footer"
          label={dictionary.nav.footerLabel}
          className="-me-2.5 flex-col items-end justify-self-end"
          links={[
            { href: `/${locale}/privacy`, label: dictionary.footer.privacy },
            { href: `mailto:${CONTACT_EMAIL}`, label: dictionary.footer.contact },
            { href: SOURCE_URL, label: dictionary.footer.source, icon: <GithubIcon /> },
          ]}
        />
      </div>
    </footer>
  );
}
