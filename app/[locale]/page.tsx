import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { MonthlyHighlights } from "@/components/monthly-highlights";
import { ViewerGallery, ViewerGalleryWithParams } from "@/components/viewer-gallery";
import { getDictionary } from "@/dictionaries";
import { getPublicHighlights } from "@/lib/highlights/public";
import { isLocale } from "@/lib/i18n";
import { getPublicViewers } from "@/lib/viewers/public";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale);

  return {
    title: dictionary.home.title,
    description: dictionary.home.tagline,
    alternates: {
      languages: {
        pt: "/pt",
        en: "/en",
      },
    },
  };
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dictionary, viewers, months] = await Promise.all([getDictionary(locale), getPublicViewers(), getPublicHighlights()]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-16 px-6 py-12 sm:gap-20 sm:py-16">
      <section className="flex flex-col gap-8">
        <h1 className="max-w-4xl text-display-sm text-balance sm:text-display-lg">{dictionary.home.headline}</h1>
        <nav aria-label={dictionary.home.title} className="flex flex-wrap items-center gap-2">
          <Button size="lg" render={<Link href={`/${locale}/submit`} />}>{dictionary.home.submit}</Button>
          <Button size="lg" variant="outline" render={<Link href={`/${locale}/rules`} />}>{dictionary.home.rules}</Button>
          <Button size="lg" variant="ghost" className="hidden text-muted-foreground sm:inline-flex" render={<Link href={`/${locale}/kit`} />}>{dictionary.home.kit}</Button>
        </nav>
      </section>
      {months[0] ? (
        <section className="flex flex-col gap-5" aria-labelledby="latest-highlights-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="latest-highlights-heading" className="text-title-lg">{dictionary.highlights.title}</h2>
            <Link href={`/${locale}/highlights`} className="text-sm underline-offset-4 hover:underline">{dictionary.nav.highlights}</Link>
          </div>
          <MonthlyHighlights locale={locale} dictionary={dictionary} months={[months[0]]} />
        </section>
      ) : null}
      <Suspense fallback={<ViewerGallery locale={locale} dictionary={dictionary} viewers={viewers} />}>
        <ViewerGalleryWithParams locale={locale} dictionary={dictionary} viewers={viewers} />
      </Suspense>
    </main>
  );
}
