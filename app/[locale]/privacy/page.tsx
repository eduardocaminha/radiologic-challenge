import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/legal-document";
import { getDictionary } from "@/dictionaries";
import { isLocale } from "@/lib/i18n";
import { getLegalDocument } from "@/lib/legal";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-static";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale);
  return {
    title: getLegalDocument("privacy", locale).title,
    description: dictionary.legal.privacyDescription,
    alternates: { languages: { pt: "/pt/privacy", en: "/en/privacy", es: "/es/privacy" } },
  };
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale);
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-20">
      <LegalDocument document={getLegalDocument("privacy", locale)} versionLabel={dictionary.legal.versionLabel} />
    </main>
  );
}
