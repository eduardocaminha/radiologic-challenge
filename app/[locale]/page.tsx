import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AgentSubmit } from "@/components/agent-submit";
import { Button } from "@/components/ui/button";
import { LatestHighlights } from "@/components/monthly-highlights";
import { ViewerGallery, ViewerGalleryWithParams } from "@/components/viewer-gallery";
import { getDictionary } from "@/dictionaries";
import { getPublicHighlights } from "@/lib/highlights/public";
import { isLocale } from "@/lib/i18n";
import { getPublicViewers } from "@/lib/viewers/public";
import { rotationDay } from "@/lib/viewers/rotation";
import { JsonLd } from "@/components/json-ld";
import { pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale);

  return pageMetadata(locale, "", { title: dictionary.home.metaTitle, description: dictionary.home.metaDescription, absoluteTitle: true });
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dictionary, viewers, months] = await Promise.all([getDictionary(locale), getPublicViewers(), getPublicHighlights()]);
  const day = rotationDay();

  return (
    <main data-sticky-header className="mx-auto flex min-h-screen max-w-6xl flex-col gap-20 px-6 py-12 sm:gap-32 sm:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: `${SITE_URL}/${locale}`,
          description: dictionary.home.metaDescription,
          inLanguage: locale,
          publisher: { "@type": "Organization", name: "Radiologic", url: "https://radiologic.io", logo: `${SITE_URL}/icon-512.png` },
        }}
      />
      <section className="flex flex-col gap-8">
        <h1 className="max-w-4xl text-display-sm text-balance sm:text-display-lg">{dictionary.home.headline} <span className="text-muted-foreground">{dictionary.home.headlineNote}</span></h1>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" render={<Link href={`/${locale}/submit`} />}>{dictionary.home.submit}</Button>
          <AgentSubmit copy={dictionary.home.agent} variant="outline" size="lg" />
        </div>
      </section>
      {months[0] ? <LatestHighlights locale={locale} dictionary={dictionary} month={months[0]} /> : null}
      <Suspense fallback={<ViewerGallery locale={locale} dictionary={dictionary} viewers={viewers} rotationDay={day} />}>
        <ViewerGalleryWithParams locale={locale} dictionary={dictionary} viewers={viewers} rotationDay={day} />
      </Suspense>
    </main>
  );
}
