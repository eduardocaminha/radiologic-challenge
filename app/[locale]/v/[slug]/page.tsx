import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewerDetail } from "@/components/viewer-detail";
import { getDictionary } from "@/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n";
import { getPublicViewer } from "@/lib/viewers/public";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  if (!isLocale(localeParam)) notFound();
  const viewer = await getPublicViewer(slug);
  if (!viewer) notFound();
  return {
    title: viewer.name,
    description: viewer.tagline,
    openGraph: {
      images: [{ url: `/${localeParam}/v/${slug}/opengraph-image`, width: 1200, height: 630, type: "image/png", alt: `${viewer.name}: ${viewer.tagline}` }],
    },
    alternates: { languages: { pt: `/pt/v/${slug}`, en: `/en/v/${slug}`, es: `/es/v/${slug}` } },
  };
}

export default async function ViewerPage({ params }: PageProps) {
  const { locale: localeParam, slug } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam as Locale;
  const [dictionary, viewer] = await Promise.all([getDictionary(locale), getPublicViewer(slug)]);
  if (!viewer) notFound();
  return <ViewerDetail locale={locale} dictionary={dictionary} viewer={viewer} />;
}
