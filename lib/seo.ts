import type { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "@/lib/i18n";

export const SITE_URL = "https://challenge.radiologic.io";
export const SITE_NAME = "Radiologic Workstation";

const OG_LOCALES: Record<Locale, string> = { pt: "pt_BR", en: "en_US", es: "es_ES" };

export function localizedPath(locale: Locale, path: string) {
  return `/${locale}${path}`;
}

export function languageAlternates(path: string, absolute = false) {
  const prefix = absolute ? SITE_URL : "";
  return {
    ...Object.fromEntries(locales.map((locale) => [locale, `${prefix}${localizedPath(locale, path)}`])),
    "x-default": `${prefix}${localizedPath(defaultLocale, path)}`,
  };
}

export function pageMetadata(locale: Locale, path: string, { title, description, absoluteTitle = false }: { title: string; description: string; absoluteTitle?: boolean }): Metadata {
  const url = localizedPath(locale, path);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      siteName: SITE_NAME,
      type: "website",
      locale: OG_LOCALES[locale],
      url,
      images: [{ url: `/${locale}/opengraph-image`, width: 1200, height: 630, type: "image/png", alt: SITE_NAME }],
    },
  };
}

export const noIndex: Metadata["robots"] = { index: false, follow: false };
