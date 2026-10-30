"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useMemo } from "react";
import { LineTabs } from "@/components/line-tabs";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewportFrame } from "@/components/viewport-frame";
import type { Dictionary } from "@/dictionaries";
import { intlLocales, type Locale } from "@/lib/i18n";
import type { WorklistRow } from "@/lib/kit";
import { spring } from "@/lib/springs";
import { WORKFLOW_PARTS } from "@/lib/submissions/constants";
import type { PublicViewer } from "@/lib/viewers/public";

type Sort = "total" | "month" | "recent";
type Facet = "part" | "platform" | "baseTech" | "modality";

const ALL = "all";
const FACET_PARAM: Record<Facet, string> = { part: "part", platform: "plat", baseTech: "base", modality: "mod" };
const FACETS = Object.keys(FACET_PARAM) as Facet[];
const INDEX_SIZE = 5;
const INDEX_MIN_VIEWERS = 6;
const BASE_TECH = ["scratch", "ohif", "cornerstone3d", "vtkjs", "dwv", "niivue", "volview", "other"];

function imageLoader({ src }: { src: string }) {
  return src;
}

function facetValues(viewer: PublicViewer, facet: Facet): string[] {
  const values =
    facet === "part" ? viewer.workflow_parts
      : facet === "platform" ? viewer.platforms
      : facet === "baseTech" ? [viewer.base_tech]
        : viewer.modalities;
  return (values ?? []).filter((value): value is string => Boolean(value));
}

function countBy(viewers: PublicViewer[], facet: Facet) {
  const counts = new Map<string, number>();
  for (const viewer of viewers) for (const value of facetValues(viewer, facet)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

interface IndexOption {
  value: string;
  label: string;
  count: number;
}

interface GalleryProps {
  locale: Locale;
  dictionary: Dictionary;
  viewers: PublicViewer[];
  worklist: WorklistRow[];
}

// Filtros e ordenação vivem na URL: sobrevivem ao voltar da ficha e podem ser compartilhados.
export function ViewerGalleryWithParams(props: GalleryProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function update(next: Record<string, string | null>) {
    const query = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) query.set(key, value);
      else query.delete(key);
    }
    const search = query.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  return <ViewerGallery {...props} params={Object.fromEntries(searchParams)} onParamsChange={update} />;
}

export function ViewerGallery({
  locale,
  dictionary,
  viewers,
  worklist,
  params = {},
  onParamsChange,
}: GalleryProps & {
  params?: Record<string, string>;
  onParamsChange?: (next: Record<string, string | null>) => void;
}) {
  const copy = dictionary.gallery;
  const select = dictionary.submission.select;
  const sort: Sort = params.sort === "month" || params.sort === "recent" ? params.sort : "total";
  const filterOf = (facet: Facet) => params[FACET_PARAM[facet]] ?? ALL;
  const setFilter = (facet: Facet, value: string) => onParamsChange?.({ [FACET_PARAM[facet]]: value === ALL ? null : value });

  const index = useMemo(() => {
    // Valores de cada coluna, os com mais viewers primeiro. Sem viewers, a coluna mostra os
    // primeiros valores do vocabulário, apagados.
    const column = (facet: Facet, vocabulary: string[], label: (value: string) => string): IndexOption[] => {
      const counts = countBy(viewers, facet);
      const values = [...new Set([...counts.keys(), ...vocabulary])];
      return values
        .map((value) => ({ value, label: label(value), count: counts.get(value) ?? 0 }))
        .sort((a, b) => b.count - a.count || values.indexOf(a.value) - values.indexOf(b.value))
        .slice(0, INDEX_SIZE);
    };
    return [
      { facet: "part" as const, title: copy.parts, options: column("part", [...WORKFLOW_PARTS], (value) => dictionary.submission.part[value] ?? value) },
      { facet: "modality" as const, title: dictionary.viewer.modalities, options: column("modality", Object.keys(dictionary.submission.modality), (value) => dictionary.submission.modality[value] ?? value) },
      { facet: "baseTech" as const, title: copy.baseTech, options: column("baseTech", BASE_TECH, (value) => select[value] ?? value) },
    ].filter(({ options }) => options.length > 0);
  }, [copy, dictionary, select, viewers]);

  const platforms = useMemo(() => [...countBy(viewers, "platform").keys()].sort(), [viewers]);

  const filteredViewers = useMemo(() => {
    const filtered = viewers.filter((viewer) => FACETS.every((facet) => {
      const value = params[FACET_PARAM[facet]];
      return !value || facetValues(viewer, facet).includes(value);
    }));
    return [...filtered].sort((a, b) => {
      if (sort === "month") return b.month_votes - a.month_votes || b.total_votes - a.total_votes;
      if (sort === "recent") return (b.approved_at ?? "").localeCompare(a.approved_at ?? "");
      return b.total_votes - a.total_votes || b.month_votes - a.month_votes;
    });
  }, [params, sort, viewers]);

  const toggleFilter = (facet: Facet, value: string) => setFilter(facet, filterOf(facet) === value ? ALL : value);
  const clearFilters = () => onParamsChange?.(Object.fromEntries(FACETS.map((facet) => [FACET_PARAM[facet], null])));
  const filtered = FACETS.some((facet) => filterOf(facet) !== ALL);
  const sortOptions: [Sort, string][] = [["total", copy.sortTotal], ["month", copy.sortMonth], ["recent", copy.sortRecent]];

  if (viewers.length === 0) {
    return <GalleryEmpty locale={locale} dictionary={dictionary} worklist={worklist} />;
  }

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="gallery-heading" className="flex flex-col gap-8 sm:gap-10">
        <h2 id="gallery-heading" className="sr-only">{copy.title} {viewers.length}</h2>

        {viewers.length >= INDEX_MIN_VIEWERS ? (
          <>
            <nav aria-label={copy.filtersLabel} className="hidden gap-x-6 sm:grid sm:grid-cols-3">
              {index.map(({ facet, title, options }) => (
                <IndexColumn key={facet} title={title} options={options} active={filterOf(facet)} onSelect={(value) => toggleFilter(facet, value)} />
              ))}
            </nav>
            <div role="group" aria-label={copy.filtersLabel} className="flex flex-wrap gap-2 sm:hidden">
              {index.map(({ facet, title, options }) => (
                <Select key={facet} value={filterOf(facet)} onValueChange={(value) => setFilter(facet, String(value ?? ALL))} items={[{ value: ALL, label: title }, ...options.map(({ value, label }) => ({ value, label }))]}>
                  <SelectTrigger size="sm" aria-label={title} className="w-auto min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectItem value={ALL}>{copy.all}</SelectItem>
                    {options.filter((option) => option.count > 0).map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectPopup>
                </Select>
              ))}
            </div>
          </>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:border-b sm:border-border">
          <div className="flex items-end justify-between gap-4 max-sm:border-b max-sm:border-border">
            <LineTabs id="sort" label={copy.sort} options={sortOptions} value={sort} onChange={(value) => onParamsChange?.({ sort: value === "total" ? null : value })} />
            {filtered ? <Button variant="ghost" size="sm" className="mb-2 text-muted-foreground" onClick={clearFilters}>{copy.clearFilters}</Button> : null}
          </div>
          {platforms.length > 1 ? (
            <LineTabs id="platform" label={copy.platform} className="max-sm:border-b max-sm:border-border" options={[[ALL, copy.allPlatforms], ...platforms.map((value): [string, string] => [value, select[value] ?? value])]} value={filterOf("platform")} onChange={(value) => setFilter("platform", value)} />
          ) : null}
        </div>

        {filteredViewers.length === 0 ? (
          <Empty className="rounded-2xl bg-surface">
            <EmptyHeader>
              <EmptyTitle>{copy.noResultsTitle}</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button size="lg" variant="outline" onClick={clearFilters}>{copy.clearFilters}</Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {filteredViewers.map((viewer, position) => (
                <ViewerCard
                  key={viewer.id}
                  position={position}
                  locale={locale}
                  viewer={viewer}
                  rank={sort === "recent" || (sort === "month" ? viewer.month_votes : viewer.total_votes) === 0 ? null : position + 1}
                  votes={sort === "month" ? viewer.month_votes : viewer.total_votes}
                  copy={copy}
                  meta={[viewer.workflow_parts?.map((value) => dictionary.submission.part[value] ?? value).join(", "), viewer.modalities?.slice(0, 2).map((value) => dictionary.submission.modality[value] ?? value).join(", "), viewer.ai_code_share ? copy.aiShare[viewer.ai_code_share] : null, viewer.country].filter(Boolean).join(" · ")}
                />
              ))}
            </AnimatePresence>
          </ol>
        )}
      </section>
    </MotionConfig>
  );
}

function IndexColumn({ title, options, active, onSelect }: { title: string; options: IndexOption[]; active: string; onSelect: (value: string) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h3 className="text-sm text-muted-foreground">{title}</h3>
      <ul className="group/index flex flex-col items-start">
        {options.map((option) => (
          <IndexItem key={option.value} option={option} pressed={active === option.value} dimmed={active !== ALL && active !== option.value} onSelect={() => onSelect(option.value)} />
        ))}
      </ul>
    </div>
  );
}

// Hover por cor: o item sob o cursor fica em foreground e os vizinhos recuam. Item sem
// viewer não reage, porque o clique nele não faz nada.
function IndexItem({ option, pressed, dimmed, onSelect }: { option: IndexOption; pressed: boolean; dimmed: boolean; onSelect: () => void }) {
  const empty = option.count === 0;
  const tone = empty
    ? "text-muted-foreground/40"
    : dimmed
      ? "text-muted-foreground hover:text-foreground"
      : "text-foreground group-has-[button:enabled:hover]/index:text-muted-foreground hover:text-foreground!";
  return (
    <li className="max-w-full">
      <button
        type="button"
        aria-pressed={pressed}
        disabled={empty}
        onClick={onSelect}
        className={`flex max-w-full items-baseline gap-2 rounded-sm py-0.5 text-left text-title-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default sm:text-title-lg ${tone}`}
      >
        <span className="truncate">{option.label}</span>
        {!empty ? <span className="text-sm font-normal tabular-nums text-muted-foreground">{option.count}</span> : null}
      </button>
    </li>
  );
}

function GalleryEmpty({ locale, dictionary, worklist }: { locale: Locale; dictionary: Dictionary; worklist: WorklistRow[] }) {
  const copy = dictionary.gallery;
  const month = new Intl.DateTimeFormat(intlLocales[locale], { month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date());
  return (
    <section aria-labelledby="gallery-heading">
      <ViewportFrame
        topLeft={dictionary.home.title}
        topRight={month}
        bottomLeft={`0 ${copy.viewerCount}`}
        bottomRight={dictionary.footer.nonClinical}
        className="flex min-h-96 items-center justify-center overflow-hidden rounded-2xl border border-border px-6 py-16 sm:aspect-video sm:min-h-0"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-foreground/8" />
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-foreground/8" />
        <ol aria-hidden="true" className="absolute left-3 top-12 hidden flex-col gap-1.5 text-xs tabular-nums text-muted-foreground lg:flex">
          {worklist.map((row) => <li key={row.uid}>{row.modality} {row.bodyPart} {row.collection}</li>)}
        </ol>
        <div className="relative flex flex-col items-center gap-6 bg-page-bg px-6 py-4 text-center">
          <h2 id="gallery-heading" className="max-w-md text-title-lg text-balance">{copy.emptyTitle}</h2>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button size="lg" render={<Link href={`/${locale}/submit`} />}>{copy.submit}</Button>
            <Button size="lg" variant="ghost" className="text-muted-foreground" render={<Link href={`/${locale}/kit`} />}>{copy.kit}</Button>
          </div>
        </div>
      </ViewportFrame>
    </section>
  );
}

function ViewerCard({ position, locale, viewer, rank, votes, copy, meta }: { position: number; locale: Locale; viewer: PublicViewer; rank: number | null; votes: number; copy: Dictionary["gallery"]; meta: string }) {
  const screenshot = viewer.screenshots[0];
  return (
    <motion.li
      layout="position"
      exit={{ opacity: 0, transition: spring.moderate.exit }}
      transition={spring.slow}
      style={{ "--i": position } as React.CSSProperties}
      className="reveal-item min-w-0"
    >
      <Link href={`/${locale}/v/${viewer.slug}`} className="group flex h-full flex-col gap-4 rounded-2xl bg-surface p-2 outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
        <span className="relative aspect-card overflow-hidden rounded-lg bg-page-bg">
          {screenshot?.url ? <Image src={screenshot.url} loader={imageLoader} unoptimized fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" alt="" className="object-cover transition-transform duration-500 ease-(--ease-out-strong) group-hover:scale-102" /> : (
            <>
              <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-foreground/8" />
              <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-foreground/8" />
            </>
          )}
        </span>
        <span className="flex items-start gap-3 px-2 pb-2">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate font-medium">
              {rank !== null ? <span className="me-2 tabular-nums text-muted-foreground">{rank}</span> : null}
              {viewer.name}
            </span>
            <span title={viewer.tagline} className="truncate text-sm text-muted-foreground">{viewer.tagline}</span>
            {meta ? <span title={meta} className="truncate text-sm text-muted-foreground">{meta}</span> : null}
          </span>
          <span className="shrink-0 text-right">
            <span className="block font-medium tabular-nums leading-6">{votes}</span>
            <span className="block text-xs text-muted-foreground">{copy.votes}</span>
          </span>
        </span>
      </Link>
    </motion.li>
  );
}
