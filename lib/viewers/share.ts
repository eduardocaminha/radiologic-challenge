import { SITE_URL } from "@/lib/seo";
import type { Locale } from "@/lib/i18n";

export function projectUrl(locale: Locale, slug: string) {
  return `${SITE_URL}/${locale}/v/${slug}`;
}

export function whatsappUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function linkedinUrl(url: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}
