import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { languageAlternates, localizedPath, SITE_URL } from "@/lib/seo";
import { getPublicViewers } from "@/lib/viewers/public";

export const revalidate = 3600;

const STATIC_PATHS = ["", "/highlights", "/kit", "/rules", "/privacy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const viewers = await getPublicViewers();
  const entries = [
    ...STATIC_PATHS.map((path) => ({ path, lastModified: undefined as Date | undefined })),
    ...viewers.map((viewer) => ({
      path: `/v/${viewer.slug}`,
      lastModified: viewer.approved_at ? new Date(viewer.approved_at) : undefined,
    })),
  ];

  return entries.flatMap(({ path, lastModified }) => locales.map((locale) => ({
    url: `${SITE_URL}${localizedPath(locale, path)}`,
    lastModified,
    alternates: { languages: languageAlternates(path, true) },
  })));
}
