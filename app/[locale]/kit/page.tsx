import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { isLocale } from "@/lib/i18n";
import { KIT } from "@/lib/kit";
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
    title: dictionary.kit.title,
    description: dictionary.kit.description,
    alternates: { languages: { pt: "/pt/kit", en: "/en/kit", es: "/es/kit" } },
  };
}

function Command({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl bg-surface px-4 py-3 font-sans text-label-md">
      <code className="font-sans">{children}</code>
    </pre>
  );
}

export default async function KitPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale);
  const t = dictionary.kit;
  const dataSection = getLegalDocument("rules", locale).blocks.find(
    (block) => block.type === "heading" && block.text.startsWith("4."),
  );
  const rulesHref = `/${locale}/rules${dataSection?.type === "heading" ? `#${dataSection.id}` : ""}`;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12 sm:gap-16 sm:py-20">
      <header className="flex max-w-3xl flex-col gap-4">
        <h1 className="text-headline-lg sm:text-display-sm">{t.title}</h1>
      </header>

      <section className="flex max-w-3xl flex-col gap-4" aria-labelledby="kit-rules-heading">
        <h2 id="kit-rules-heading" className="text-title-lg">{t.dataRulesTitle}</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 leading-7 text-muted-foreground">
          {t.dataRules.map((rule) => <li key={rule}>{rule}</li>)}
        </ul>
        <Link href={rulesHref} className="w-fit py-1 text-sm underline underline-offset-4">{t.rulesLink}</Link>
      </section>

      <section className="flex min-w-0 max-w-3xl flex-col gap-4" aria-labelledby="kit-install-heading">
        <h2 id="kit-install-heading" className="text-title-lg">{t.installTitle}</h2>
        <p className="leading-7 text-muted-foreground">{t.installDescription}</p>
        <Command>{KIT.install}</Command>
      </section>

      <section className="flex min-w-0 flex-col gap-6" aria-labelledby="kit-studies-heading">
        <h2 id="kit-studies-heading" className="text-title-lg">{t.studiesTitle}</h2>
        <ol className="flex flex-col divide-y divide-border">
          {KIT.studies.map((study) => (
            <li key={study.study_instance_uid} className="flex min-w-0 flex-col gap-4 py-6" data-testid="kit-study">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h3 className="text-title-md">{study.collection}</h3>
                <p className="text-sm text-muted-foreground">
                  {study.modality.join(", ")} · {study.body_part} · {study.size_mb} MB · {study.license}
                </p>
              </div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                <dt className="text-muted-foreground">{t.uid}</dt>
                <dd className="break-all sm:col-span-3">{study.study_instance_uid}</dd>
                <dt className="text-muted-foreground">{t.citation}</dt>
                <dd className="flex max-w-prose flex-col gap-2 text-muted-foreground wrap-anywhere sm:col-span-3">
                  {study.citation.map((citation) => <p key={citation}>{citation}</p>)}
                </dd>
              </dl>
              <Command>{study.download}</Command>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex max-w-3xl flex-col gap-2" aria-labelledby="kit-idc-heading">
        <h2 id="kit-idc-heading" className="text-title-sm">{t.idcCitationTitle}</h2>
        <p className="max-w-prose text-sm leading-6 text-muted-foreground">{KIT.idc_citation}</p>
      </section>
    </main>
  );
}
