import type { Metadata } from "next";
import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { isLocale } from "@/lib/i18n";
import { daysSincePrior, KIT, KIT_TOTAL_MB, primaryModality } from "@/lib/kit";
import { getLegalDocument } from "@/lib/legal";
import { JsonLd } from "@/components/json-ld";
import { pageMetadata, SITE_URL } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-static";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale);
  return pageMetadata(locale, "/kit", { title: dictionary.kit.title, description: dictionary.kit.description });
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
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: t.title,
          description: t.description,
          url: `${SITE_URL}/${locale}/kit`,
          inLanguage: locale,
          isAccessibleForFree: true,
          license: ["https://creativecommons.org/licenses/by/3.0/", "https://creativecommons.org/licenses/by/4.0/"],
          creator: { "@type": "Organization", name: "NCI Imaging Data Commons", url: "https://imaging.datacommons.cancer.gov" },
        }}
      />
      <header className="flex max-w-3xl flex-col gap-4">
        <h1 className="text-headline-lg sm:text-display-sm">{t.title}</h1>
      </header>

      <section className="flex max-w-3xl flex-col gap-4" aria-labelledby="kit-rules-heading">
        <h2 id="kit-rules-heading" className="text-title-lg">{t.dataRulesTitle}</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 leading-7 text-muted-foreground">
          {t.dataRules.map((rule) => <li key={rule}>{rule}</li>)}
        </ul>
        <Button variant="ghost" size="sm" className="-ms-2.5 w-fit text-muted-foreground" render={<Link href={rulesHref} />}>{t.rulesLink}</Button>
      </section>

      <section className="flex min-w-0 max-w-3xl flex-col gap-4" aria-labelledby="kit-install-heading">
        <h2 id="kit-install-heading" className="text-title-lg">{t.installTitle}</h2>
        <p className="leading-7 text-muted-foreground">{t.installDescription}</p>
        <Command>{KIT.install}</Command>
      </section>

      <section className="flex min-w-0 flex-col gap-6" aria-labelledby="kit-studies-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="kit-studies-heading" className="text-title-lg">{t.studiesTitle}</h2>
          <p className="text-sm tabular-nums text-muted-foreground">{t.totals.replace("{n}", String(KIT.studies.length)).replace("{mb}", String(KIT_TOTAL_MB))}</p>
        </div>
        <details className="group/all rounded-2xl bg-surface p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-label-md outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <ChevronDownIcon aria-hidden="true" className="size-4 text-muted-foreground transition-transform duration-150 group-open/all:rotate-180" />
            {t.allTitle}
          </summary>
          <div className="pt-3"><Command>{KIT.download_all}</Command></div>
        </details>
        <div>
          <div aria-hidden="true" className="hidden grid-cols-6 gap-4 border-b border-border px-1 pb-2 text-xs text-muted-foreground sm:grid">
            <span>{t.modality}</span>
            <span>{t.bodyPart}</span>
            <span className="col-span-2">{t.collection}</span>
            <span>{t.comparison}</span>
            <span className="text-right">{t.size}</span>
          </div>
          <ol className="flex flex-col divide-y divide-border border-b border-border">
            {KIT.studies.map((study) => {
              const days = daysSincePrior(study);
              return (
                <li key={study.study_instance_uid} className="min-w-0" data-testid="kit-study">
                  <details className="group/row">
                    <summary className="grid cursor-pointer list-none grid-cols-2 gap-x-4 gap-y-1 rounded-sm px-1 py-3 text-sm outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-6 [&::-webkit-details-marker]:hidden">
                      <span className="font-medium">{primaryModality(study)}</span>
                      <span className="text-muted-foreground">{study.body_part}</span>
                      <span className="truncate sm:col-span-2">{study.collection}</span>
                      <span className="text-muted-foreground">{days === null ? null : t.daysAfter.replace("{n}", String(days))}</span>
                      <span className="text-muted-foreground tabular-nums sm:text-right">{study.size_mb} MB</span>
                    </summary>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 px-1 pb-4 pt-2 text-sm sm:grid-cols-6">
                      <dt className="text-muted-foreground">{t.uid}</dt>
                      <dd className="break-all sm:col-span-5">{study.study_instance_uid}</dd>
                      <dt className="text-muted-foreground">{t.license}</dt>
                      <dd className="sm:col-span-5">{study.license}</dd>
                      <dt className="text-muted-foreground">{t.citation}</dt>
                      <dd className="flex max-w-prose flex-col gap-2 text-muted-foreground wrap-anywhere sm:col-span-5">
                        {study.citation.map((citation) => <p key={citation}>{citation}</p>)}
                      </dd>
                      <dd className="min-w-0 sm:col-span-6"><Command>{study.download}</Command></dd>
                    </dl>
                  </details>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="flex max-w-3xl flex-col gap-2" aria-labelledby="kit-idc-heading">
        <h2 id="kit-idc-heading" className="text-title-sm">{t.idcCitationTitle}</h2>
        <p className="max-w-prose text-sm leading-6 text-muted-foreground">{KIT.idc_citation}</p>
      </section>
    </main>
  );
}
