import { ArrowLeftIcon, ArrowUpRightIcon, InfoIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";
import type { PublicViewer } from "@/lib/viewers/public";
import { ShareButton } from "@/components/share-button";
import { VoteButton } from "@/components/vote-button";

export function ViewerDetail({ locale, dictionary, viewer }: { locale: Locale; dictionary: Dictionary; viewer: PublicViewer }) {
  const copy = dictionary.viewer;
  const links = [
    [copy.demo, viewer.demo_url],
    [copy.download, viewer.download_url],
    [copy.repo, viewer.repo_url],
    [copy.video, viewer.video_url],
    [copy.prompts, viewer.prompts_url],
  ] as const;

  const primary = viewer.demo_url ? [copy.demo, viewer.demo_url] as const : viewer.download_url ? [copy.download, viewer.download_url] as const : null;
  const secondary = links.filter(([, href]) => href && href !== primary?.[1]);
  const profile = viewer.author_profile ? (dictionary.submission.select[viewer.author_profile] ?? viewer.author_profile) : null;
  const byline = [viewer.organizer_project ? copy.organizerProject : null, viewer.author_name, profile, viewer.country].filter(Boolean).join(" · ");
  const [cover, ...rest] = viewer.screenshots.filter((screenshot) => screenshot.url);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-8 sm:py-12">
      <Button variant="ghost" size="sm" className="-ms-2.5 w-fit text-muted-foreground" render={<Link href={`/${locale}`} />}>
        <ArrowLeftIcon aria-hidden="true" />
        {copy.back}
      </Button>
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-3xl flex-col gap-3">
          <h1 className="text-display-sm text-balance sm:text-display-md">{viewer.name}</h1>
          {byline ? <p className="text-sm text-muted-foreground">{byline}</p> : null}
          {viewer.workflow_parts?.length ? <p className="text-sm">{viewer.workflow_parts.map((part) => dictionary.submission.part[part] ?? part).join(" · ")}</p> : null}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {primary ? (
            <Button size="lg" className="max-sm:w-full" render={<a href={primary[1]} target="_blank" rel="noreferrer" />}>
              {primary[0]}
              <ArrowUpRightIcon aria-hidden="true" />
            </Button>
          ) : null}
          <VoteButton locale={locale} submissionId={viewer.id} initialCount={viewer.total_votes} copy={dictionary.vote} showLabel className="items-start" />
          <ShareButton locale={locale} slug={viewer.slug} name={viewer.name} copy={dictionary.share} variant="outline" size="lg" />
        </div>
      </header>

      <ViewerAiStrip copy={copy} dictionary={dictionary} viewer={viewer} />

      {cover ? (
        <figure className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover.url ?? ""} width={1600} height={900} alt={`${copy.imageAlt} 1`} className="h-auto w-full rounded-2xl bg-surface object-cover" />
          {rest.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {rest.map((screenshot, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={screenshot.id} src={screenshot.url ?? ""} width={1600} height={900} alt={`${copy.imageAlt} ${index + 2}`} className="h-auto w-full rounded-lg bg-surface object-cover" />
              ))}
            </div>
          ) : null}
        </figure>
      ) : null}
      <section className="-mt-4 flex max-w-prose gap-3 text-sm" aria-labelledby="non-clinical-heading">
        <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <h2 id="non-clinical-heading" className="font-medium">{copy.nonClinicalTitle}</h2>
          <p className="text-muted-foreground">{copy.nonClinicalDescription}</p>
        </div>
      </section>

      <div className="grid gap-12 border-t border-border pt-10 lg:grid-cols-3">
        <div className="flex flex-col gap-10 lg:col-span-2">
          <section className="flex max-w-prose flex-col gap-4">
            <h2 className="text-title-lg">{copy.about}</h2>
            <p className="text-body-lg text-pretty">{viewer.tagline}</p>
            <p className="whitespace-pre-wrap leading-7 text-muted-foreground">{viewer.description}</p>
          </section>
          <section className="flex max-w-prose flex-col gap-3">
            <h2 className="text-title-md">{copy.differential}</h2>
            <p className="leading-7">{viewer.differential}</p>
          </section>
          {viewer.limitations ? (
            <section className="flex max-w-prose flex-col gap-3">
              <h2 className="text-title-md">{copy.limitations}</h2>
              <p className="leading-7 text-muted-foreground">{viewer.limitations}</p>
            </section>
          ) : null}
        </div>

        <ViewerAside copy={copy} dictionary={dictionary} links={secondary} viewer={viewer} />
      </div>
    </main>
  );
}

function ViewerAside({ copy, dictionary, links, viewer }: { copy: Dictionary["viewer"]; dictionary: Dictionary; links: readonly (readonly [string, string | null])[]; viewer: PublicViewer }) {
  return (
    <aside className="flex flex-col gap-10">
      {links.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-label-md">{copy.links}</h2>
          <ul className="flex flex-col">
            {links.map(([label, href]) => href ? (
              <li key={label} className="border-b border-border last:border-b-0">
                <a href={href} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-3 py-3 text-sm underline-offset-4 hover:underline">
                  {label}
                  <ArrowUpRightIcon aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </li>
            ) : null)}
          </ul>
        </section>
      ) : null}
      <ViewerFacts copy={copy} dictionary={dictionary} viewer={viewer} />
    </aside>
  );
}

function ViewerFacts({ copy, dictionary, viewer }: { copy: Dictionary["viewer"]; dictionary: Dictionary; viewer: PublicViewer }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-label-md">{copy.details}</h2>
      <dl className="flex flex-col text-sm">
        <ViewerCoreFacts copy={copy} dictionary={dictionary} viewer={viewer} />
        <ViewerTechnicalFacts copy={copy} dictionary={dictionary} viewer={viewer} />
      </dl>
    </section>
  );
}

function ViewerCoreFacts({ copy, dictionary, viewer }: { copy: Dictionary["viewer"]; dictionary: Dictionary; viewer: PublicViewer }) {
  const baseTech = dictionary.submission.select[viewer.base_tech] ?? viewer.base_tech;
  return (
    <>
      <Detail label={copy.platforms} value={viewer.platforms.map((platform) => dictionary.submission.select[platform] ?? platform).join(", ")} />
      <Detail label={copy.language} value={dictionary.submission.select[viewer.lang] ?? viewer.lang} />
      <Detail label={copy.baseTech} value={baseTech} />
      <Detail label={copy.license} value={viewer.license} />
      <Detail label={copy.dataSource} value={`${viewer.data_source}, ${viewer.data_license}`} />
    </>
  );
}

function ViewerTechnicalFacts({ copy, dictionary, viewer }: { copy: Dictionary["viewer"]; dictionary: Dictionary; viewer: PublicViewer }) {
  return (
    <>
      <ViewerUsageFacts copy={copy} viewer={viewer} />
      <ViewerCapabilityFacts copy={copy} dictionary={dictionary} viewer={viewer} />
      {viewer.stack ? <Detail label={copy.stack} value={viewer.stack} /> : null}
    </>
  );
}

function ViewerUsageFacts({ copy, viewer }: { copy: Dictionary["viewer"]; viewer: PublicViewer }) {
  return (
    <>
      <Detail label={copy.requiresInstall} value={viewer.requires_install ? copy.yes : copy.no} />
      <Detail label={copy.externalApi} value={viewer.external_api ? copy.yes : copy.no} />
      {viewer.external_api_detail ? <Detail label={copy.externalApiDetail} value={viewer.external_api_detail} /> : null}
    </>
  );
}

function ViewerAiStrip({ copy, dictionary, viewer }: { copy: Dictionary["viewer"]; dictionary: Dictionary; viewer: PublicViewer }) {
  const select = dictionary.submission.select;
  const facts = [
    [copy.aiTitle, viewer.ai_tools?.map((tool) => tool.name).join(", ")],
    [copy.aiCodeShare, viewer.ai_code_share ? (select[viewer.ai_code_share] ?? viewer.ai_code_share) : null],
    [copy.timeSpent, viewer.time_spent ? (select[viewer.time_spent] ?? viewer.time_spent) : null],
    [copy.cost, viewer.cost ? (select[viewer.cost] ?? viewer.cost) : null],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));
  if (facts.length === 0) return null;
  return (
    <section aria-label={copy.aiSection}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-5 lg:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-title-sm break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ViewerCapabilityFacts({ copy, dictionary, viewer }: { copy: Dictionary["viewer"]; dictionary: Dictionary; viewer: PublicViewer }) {
  const featureLabels = viewer.features?.map((feature) => dictionary.submission.feature[feature] ?? feature).join(", ");
  const modalityLabels = viewer.modalities?.map((modality) => dictionary.submission.modality[modality] ?? modality).join(", ");
  return (
    <>
      {featureLabels ? <Detail label={copy.features} value={featureLabels} /> : null}
      {modalityLabels ? <Detail label={copy.modalities} value={modalityLabels} /> : null}
      {viewer.dicomweb !== null ? <Detail label={copy.dicomweb} value={viewer.dicomweb ? copy.yes : copy.no} /> : null}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 border-b border-border py-2.5 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
