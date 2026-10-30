"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { locales, localeLabels, type Locale } from "@/lib/i18n";

interface LocaleSwitcherProps {
  locale: Locale;
  label: string;
}

export function LocaleSwitcher({ locale, label }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const rest = pathname.split("/").slice(2).join("/");

  return (
    <nav aria-label={label} className="flex items-center gap-0.5 sm:gap-1">
      {locales.map((candidate) => {
        const href = rest ? `/${candidate}/${rest}` : `/${candidate}`;
        const active = candidate === locale;

        return (
          <Link
            key={candidate}
            href={href}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-full px-2 text-sm sm:px-3 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none sm:h-7",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <span aria-hidden="true" className="uppercase sm:hidden">{candidate}</span>
            <span className="sr-only sm:not-sr-only">{localeLabels[candidate]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
