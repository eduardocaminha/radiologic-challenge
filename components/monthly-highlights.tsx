import Link from "next/link";
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
            <h2 id={monthId} className="text-title-lg capitalize">{formatMonth(month.month, locale)}</h2>
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
