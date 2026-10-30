"use client";

import { LanguagesIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { locales, localeLabels, type Locale } from "@/lib/i18n";

interface LocaleSwitcherProps {
  locale: Locale;
  label: string;
}

export function LocaleSwitcher({ locale, label }: LocaleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function change(next: unknown) {
    const rest = pathname.split("/").slice(2).join("/");
    const query = searchParams.toString();
    router.push(`/${next}${rest ? `/${rest}` : ""}${query ? `?${query}` : ""}`);
  }

  return (
    <Select value={locale} onValueChange={change} items={locales.map((value) => ({ value, label: localeLabels[value] }))}>
      <SelectTrigger size="sm" aria-label={label} className="w-auto min-w-0 border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-accent hover:text-foreground">
        <LanguagesIcon aria-hidden="true" className="size-4 opacity-80" />
        <SelectValue className="uppercase">{(value: Locale) => value}</SelectValue>
      </SelectTrigger>
      <SelectPopup align="end" alignItemWithTrigger={false}>
        {locales.map((value) => <SelectItem key={value} value={value}>{localeLabels[value]}</SelectItem>)}
      </SelectPopup>
    </Select>
  );
}
