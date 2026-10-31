"use client";

import { LanguagesIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { locales, localeLabels, type Locale } from "@/lib/i18n";

interface LocaleSwitcherProps {
  locale: Locale;
  label: string;
}

function useChangeLocale() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (next: unknown) => {
    const rest = pathname.split("/").slice(2).join("/");
    const query = searchParams.toString();
    router.push(`/${next}${rest ? `/${rest}` : ""}${query ? `?${query}` : ""}`);
  };
}

// Versão do menu no celular: os três idiomas à vista, sem lista para abrir.
export function LocaleToggle({ locale, label }: LocaleSwitcherProps) {
  const change = useChangeLocale();
  return (
    <ToggleGroup variant="outline" aria-label={label} value={[locale]} onValueChange={(next) => next[0] && change(next[0])} className="w-full">
      {locales.map((value) => <ToggleGroupItem key={value} value={value} aria-label={localeLabels[value]} className="flex-1 uppercase">{value}</ToggleGroupItem>)}
    </ToggleGroup>
  );
}

export function LocaleSwitcher({ locale, label }: LocaleSwitcherProps) {
  const change = useChangeLocale();

  return (
    <Select value={locale} onValueChange={change} items={locales.map((value) => ({ value, label: localeLabels[value] }))}>
      <SelectTrigger size="sm" aria-label={label} className="w-auto min-w-0 border-transparent max-sm:hidden bg-transparent font-medium text-muted-foreground shadow-none hover:bg-accent hover:text-foreground dark:bg-transparent dark:hover:bg-accent">
        <LanguagesIcon aria-hidden="true" className="size-4 opacity-80" />
        <SelectValue className="uppercase">{(value: Locale) => value}</SelectValue>
      </SelectTrigger>
      <SelectPopup align="end" alignItemWithTrigger={false}>
        {locales.map((value) => <SelectItem key={value} value={value}>{localeLabels[value]}</SelectItem>)}
      </SelectPopup>
    </Select>
  );
}
