import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "./types";

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  pt: () => import("./pt").then((module) => module.default),
  en: () => import("./en").then((module) => module.default),
  es: () => import("./es").then((module) => module.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}

export type { Dictionary };
