"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { FluidHoverHighlight } from "@/components/fluid-hover-highlight";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";
import { spring } from "@/lib/springs";
import type { PublicViewer } from "@/lib/viewers/public";
import { useFluidHover, useRegisterFluidHoverItem } from "@/hooks/use-fluid-hover";

type Sort = "total" | "month" | "recent";
type Facet = "platform" | "baseTech" | "modality" | "feature" | "country";
type Filters = Record<Facet, string>;

const ALL = "all";
const NO_FILTERS: Filters = { platform: ALL, baseTech: ALL, modality: ALL, feature: ALL, country: ALL };
const INDEX_SIZE = 5;
const BASE_TECH = ["scratch", "ohif", "cornerstone3d", "vtkjs", "dwv", "niivue", "volview", "other"];

function imageLoader({ src }: { src: string }) {
  return src;
}

function facetValues(viewer: PublicViewer, facet: Facet): string[] {
  const values =
    facet === "platform" ? viewer.platforms
      : facet === "baseTech" ? [viewer.base_tech]
        : facet === "modality" ? viewer.modalities
          : facet === "feature" ? viewer.features
            : [viewer.country];
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

export function ViewerGallery({
  locale,
  dictionary,
  viewers,
}: {
  locale: Locale;
  dictionary: Dictionary;
  viewers: PublicViewer[];
}) {
  const copy = dictionary.gallery;
  const select = dictionary.submission.select;
  const [sort, setSort] = useState<Sort>("total");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

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
      { facet: "baseTech" as const, title: copy.baseTech, options: column("baseTech", BASE_TECH, (value) => select[value] ?? value) },
      { facet: "modality" as const, title: dictionary.viewer.modalities, options: column("modality", Object.keys(dictionary.submission.modality), (value) => dictionary.submission.modality[value] ?? value) },
      { facet: "feature" as const, title: dictionary.viewer.features, options: column("feature", Object.keys(dictionary.submission.feature), (value) => dictionary.submission.feature[value] ?? value) },
      { facet: "country" as const, title: copy.country, options: column("country", [], (value) => value) },
    ].filter(({ options }) => options.length > 0);
  }, [copy, dictionary, select, viewers]);

  const platforms = useMemo(() => [...countBy(viewers, "platform").keys()].sort(), [viewers]);

  const filteredViewers = useMemo(() => {
    const filtered = viewers.filter((viewer) =>
      (Object.keys(filters) as Facet[]).every((facet) => filters[facet] === ALL || facetValues(viewer, facet).includes(filters[facet])),
    );
    return [...filtered].sort((a, b) => {
      if (sort === "month") return b.month_votes - a.month_votes || b.total_votes - a.total_votes;
      if (sort === "recent") return (b.approved_at ?? "").localeCompare(a.approved_at ?? "");
      return b.total_votes - a.total_votes || b.month_votes - a.month_votes;
    });
  }, [filters, sort, viewers]);

  const toggleFilter = (facet: Facet, value: string) => setFilters((current) => ({ ...current, [facet]: current[facet] === value ? ALL : value }));
  const filtered = (Object.keys(filters) as Facet[]).some((facet) => filters[facet] !== ALL);
  const sortOptions: [Sort, string][] = [["total", copy.sortTotal], ["month", copy.sortMonth], ["recent", copy.sortRecent]];

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="gallery-heading" className="flex flex-col gap-10">
        <h2 id="gallery-heading" className="sr-only">{copy.title} {viewers.length}</h2>

        <nav aria-label={copy.filtersLabel} className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {index.map(({ facet, title, options }) => (
            <IndexColumn key={facet} title={title} options={options} active={filters[facet]} onSelect={(value) => toggleFilter(facet, value)} />
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border">
          {platforms.length > 1 ? (
            <ToggleGroup aria-label={copy.platform} value={[filters.platform]} onValueChange={(value) => setFilters((current) => ({ ...current, platform: value[0] ?? ALL }))} className="mb-3 rounded-full bg-accent p-0.5">
              {[ALL, ...platforms].map((value) => (
                <ToggleGroupItem key={value} value={value} size="sm" className="relative font-normal text-muted-foreground hover:bg-transparent data-pressed:bg-transparent data-pressed:text-foreground">
                  {filters.platform === value ? <motion.span layoutId="platform-pill" transition={spring.moderate} className="absolute inset-0 rounded-full bg-input" /> : null}
                  <span className="relative">{value === ALL ? copy.allPlatforms : select[value] ?? value}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          ) : null}
          {viewers.length > 0 ? <SortTabs label={copy.sort} options={sortOptions} value={sort} onChange={setSort} /> : null}
          {filtered ? (
            <Button variant="ghost" className="mb-3 ms-auto text-muted-foreground" onClick={() => setFilters(NO_FILTERS)}>{copy.clearFilters}</Button>
          ) : null}
        </div>

        {viewers.length === 0 ? (
          <GalleryEmpty locale={locale} title={copy.emptyTitle} action={copy.submit} />
        ) : filteredViewers.length === 0 ? (
          <Empty className="rounded-2xl bg-surface">
            <EmptyHeader>
              <EmptyTitle>{copy.noResultsTitle}</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button size="lg" variant="outline" onClick={() => setFilters(NO_FILTERS)}>{copy.clearFilters}</Button>
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
                  rank={sort === "recent" ? null : position + 1}
                  votes={sort === "month" ? viewer.month_votes : viewer.total_votes}
                  copy={copy}
                  author={[viewer.author_name, viewer.country].filter(Boolean).join(", ")}
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

function SortTabs({ label, options, value, onChange }: { label: string; options: [Sort, string][]; value: Sort; onChange: (value: Sort) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const hover = useFluidHover(ref, { axis: "x", gapClick: false });
  return (
    <ToggleGroup ref={ref} aria-label={label} value={[value]} onValueChange={(next) => next[0] && onChange(next[0] as Sort)} className="relative -mx-2 max-w-full overflow-x-auto" {...hover.handlers}>
      <FluidHoverHighlight hover={hover} className="rounded-full" />
      {options.map(([option, text], index) => (
        <SortTab key={option} index={index} registerItem={hover.registerItem} value={option} active={value === option}>{text}</SortTab>
      ))}
    </ToggleGroup>
  );
}

function SortTab({ index, registerItem, value, active, children }: { index: number; registerItem: (index: number, element: HTMLElement | null) => void; value: Sort; active: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  useRegisterFluidHoverItem(registerItem, index, ref);
  return (
    <ToggleGroupItem ref={ref} value={value} className="relative mb-3 font-normal text-muted-foreground hover:bg-transparent data-pressed:bg-transparent data-pressed:text-foreground">
      {children}
      {active ? <motion.span layoutId="sort-underline" transition={spring.moderate} className="absolute inset-x-2 -bottom-3 h-0.5 rounded-full bg-foreground" /> : null}
    </ToggleGroupItem>
  );
}

function GalleryEmpty({ locale, title, action }: { locale: Locale; title: string; action: string }) {
  return (
    <Empty className="rounded-2xl bg-surface">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button size="lg" render={<Link href={`/${locale}/submit`} />}>{action}</Button>
      </EmptyContent>
    </Empty>
  );
}

function ViewerCard({ position, locale, viewer, rank, votes, copy, author }: { position: number; locale: Locale; viewer: PublicViewer; rank: number | null; votes: number; copy: Dictionary["gallery"]; author: string }) {
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
          {screenshot?.url ? <Image src={screenshot.url} loader={imageLoader} unoptimized fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" alt="" className="object-cover transition-transform duration-500 ease-(--ease-out-strong) group-hover:scale-102" /> : null}
        </span>
        <span className="flex items-start gap-3 px-2 pb-2">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate font-medium">
              {rank !== null ? <span className="me-2 tabular-nums text-muted-foreground">{rank}</span> : null}
              {viewer.name}
            </span>
            <span className="truncate text-sm text-muted-foreground">{viewer.tagline}</span>
            {author ? <span className="truncate text-sm text-muted-foreground">{author}</span> : null}
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
