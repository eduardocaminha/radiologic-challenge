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
    title: getLegalDocument("rules", locale).title,
    description: dictionary.legal.rulesDescription,
    alternates: { languages: { pt: "/pt/rules", en: "/en/rules" } },
  };
}

export default async function RulesPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale);
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-20">
      <LegalDocument document={getLegalDocument("rules", locale)} versionLabel={dictionary.legal.versionLabel} />
    </main>
  );
}
