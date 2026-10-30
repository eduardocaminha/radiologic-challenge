"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
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
          <Button
            key={candidate}
            variant="ghost"
            size="sm"
            render={<Link href={href} aria-current={active ? "true" : undefined} />}
            className={cn("max-sm:px-1.5", active ? "bg-accent" : "text-muted-foreground")}
          >
            <span aria-hidden="true" className="uppercase sm:hidden">{candidate}</span>
            <span className="sr-only sm:not-sr-only">{localeLabels[candidate]}</span>
          </Button>
        );
      })}
    </nav>
  );
}
