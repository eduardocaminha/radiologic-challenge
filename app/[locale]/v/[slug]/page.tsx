import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewerDetail } from "@/components/viewer-detail";
import { getDictionary } from "@/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n";
import { getPublicViewer } from "@/lib/viewers/public";
import { JsonLd } from "@/components/json-ld";
import { pageMetadata, SITE_URL } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  if (!isLocale(localeParam)) notFound();
  const viewer = await getPublicViewer(slug);
  if (!viewer) notFound();
  const metadata = pageMetadata(localeParam, `/v/${slug}`, { title: viewer.name, description: viewer.tagline });
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [{ url: `/${localeParam}/v/${slug}/opengraph-image`, width: 1200, height: 630, type: "image/png", alt: `${viewer.name}: ${viewer.tagline}` }],
    },
  };
}

export default async function ViewerPage({ params }: PageProps) {
  const { locale: localeParam, slug } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam as Locale;
  const [dictionary, viewer] = await Promise.all([getDictionary(locale), getPublicViewer(slug)]);
  if (!viewer) notFound();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareSourceCode",
          name: viewer.name,
          description: viewer.tagline,
          url: `${SITE_URL}/${locale}/v/${viewer.slug}`,
          codeRepository: viewer.repo_url,
          license: `https://spdx.org/licenses/${viewer.license}.html`,
          ...(viewer.author_name ? { author: { "@type": "Person", name: viewer.author_name } } : {}),
        }}
      />
      <ViewerDetail locale={locale} dictionary={dictionary} viewer={viewer} />
    </>
  );
}
