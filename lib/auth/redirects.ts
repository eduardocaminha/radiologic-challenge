import { isLocale, type Locale } from "@/lib/i18n";

const REDIRECT_ORIGIN = "https://radiologic-viewers.invalid";

export function safeRedirectPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\") || /%2f|%5c/i.test(value)) return null;
  if ([...value].some((character) => character.charCodeAt(0) < 0x20)) return null;

  try {
    const target = new URL(value, REDIRECT_ORIGIN);
    if (target.origin !== REDIRECT_ORIGIN) return null;
  } catch {
    return null;
  }

  return value;
}

export function localeFromPath(value: string | null): Locale | null {
  const path = safeRedirectPath(value);
  if (!path) return null;

  const locale = path.split("/", 3)[1];
  return locale && isLocale(locale) ? locale : null;
}

export function loginPath(locale: Locale, next: string | null, error = false): string {
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (error) params.set("error", "oauth");

  const query = params.toString();
  return `/${locale}/login${query ? `?${query}` : ""}`;
}
