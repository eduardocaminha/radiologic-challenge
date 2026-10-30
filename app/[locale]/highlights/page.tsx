import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MonthlyHighlights } from "@/components/monthly-highlights";
import { getDictionary } from "@/dictionaries";
import { getPublicHighlights } from "@/lib/highlights/public";
import { isLocale } from "@/lib/i18n";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale);
  return {
    title: dictionary.highlights.title,
    description: dictionary.highlights.description,
    alternates: { languages: { pt: "/pt/highlights", en: "/en/highlights" } },
  };
}

export default async function HighlightsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dictionary, months] = await Promise.all([getDictionary(locale), getPublicHighlights()]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-12 sm:gap-16 sm:py-20">
      <h1 className="text-headline-lg sm:text-display-sm">{dictionary.highlights.title}</h1>
      {months.length === 0 ? (
        <section className="flex max-w-2xl flex-col gap-3 rounded-2xl bg-surface p-6" aria-labelledby="highlights-empty-heading">
          <h2 id="highlights-empty-heading" className="text-title-lg">{dictionary.highlights.emptyTitle}</h2>
          <p className="text-muted-foreground">{dictionary.highlights.emptyDescription}</p>
        </section>
      ) : <MonthlyHighlights locale={locale} dictionary={dictionary} months={months} />}
    </main>
  );
}
