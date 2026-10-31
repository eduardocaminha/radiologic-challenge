import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/dictionaries";
import { intlLocales, type Locale } from "@/lib/i18n";
import type { PublicHighlightMonth } from "@/lib/highlights/public";

function formatMonth(month: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${month}T12:00:00Z`));
}

function formatPosition(rank: number, locale: Locale, label: string) {
  if (locale !== "en") return `${rank}º ${label}`;
  const suffix = rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th";
  return `${rank}${suffix} ${label}`;
}

// Versão da home: só o último mês, em três colunas, no mesmo peso dos índices da galeria.
export function LatestHighlights({ locale, dictionary, month }: { locale: Locale; dictionary: Dictionary; month: PublicHighlightMonth }) {
  const copy = dictionary.highlights;
  return (
    <section className="flex flex-col gap-5 rounded-2xl bg-surface p-5 sm:p-7" aria-labelledby="latest-highlights-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="latest-highlights-heading" className="text-title-sm text-muted-foreground first-letter:uppercase">{copy.monthTitle.replace("{month}", formatMonth(month.month, locale))}</h2>
        <Button variant="ghost" size="sm" className="-me-2.5 text-muted-foreground" render={<Link href={`/${locale}/highlights`} />}>{copy.allMonths}</Button>
      </div>
      <ol className="grid gap-6 sm:grid-cols-3">
        {month.entries.map((highlight) => (
          <li key={highlight.rank} className="flex min-w-0 items-baseline gap-3">
            <span className="text-headline-md tabular-nums text-muted-foreground" aria-label={formatPosition(highlight.rank, locale, copy.position)}>{highlight.rank}</span>
            <div className="flex min-w-0 flex-col gap-0.5">
              {highlight.slug ? (
                <Link href={`/${locale}/v/${highlight.slug}`} className="truncate text-headline-md underline-offset-4 hover:underline">{highlight.name}</Link>
              ) : (
                <span className="truncate text-headline-md">{highlight.name}</span>
              )}
              <span className="text-sm tabular-nums text-muted-foreground">{highlight.votes} {copy.votes}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function MonthlyHighlights({
  locale,
  dictionary,
  months,
}: {
  locale: Locale;
  dictionary: Dictionary;
  months: PublicHighlightMonth[];
}) {
  return (
    <div className="flex flex-col gap-8">
      {months.map((month) => {
        const monthId = `highlights-${month.month}`;
        return (
          <section key={month.month} aria-labelledby={monthId} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id={monthId} className="text-title-lg first-letter:uppercase">{formatMonth(month.month, locale)}</h2>
              {month.voided > 0 ? <p className="text-sm tabular-nums text-muted-foreground">{dictionary.highlights.voided} {month.voided}</p> : null}
            </div>
            <ol className="flex flex-col">
              {month.entries.map((highlight) => (
                <li key={`${month.month}-${highlight.rank}`} className="flex items-center gap-4 border-b border-border py-4 first:border-t">
                  <span className="w-8 shrink-0 text-sm tabular-nums text-muted-foreground" aria-label={formatPosition(highlight.rank, locale, dictionary.highlights.position)}>{highlight.rank}</span>
                  <div className="min-w-0 flex-1">
                    {highlight.slug ? (
                      <Link href={`/${locale}/v/${highlight.slug}`} className="font-medium underline-offset-4 hover:underline">{highlight.name}</Link>
                    ) : (
                      <span className="font-medium">{highlight.name}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{highlight.votes} {dictionary.highlights.votes}</span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
