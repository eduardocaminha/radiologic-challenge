import { createClient } from "@supabase/supabase-js";
import { createScreenshotSignedUrls } from "@/lib/storage/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export interface PublicViewerScreenshot {
  id: string;
  path: string;
  position: number;
  url: string | null;
}

export interface PublicViewer {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  differential: string;
  lang: "pt" | "en";
  platforms: string[];
  requires_install: boolean;
  repo_url: string;
  license: string;
  base_tech: string;
  data_source: string;
  data_license: string;
  external_api: boolean;
  external_api_detail: string | null;
  demo_url: string | null;
  download_url: string | null;
  video_url: string | null;
  ai_tools: Array<{ name: string; version: string }> | null;
  ai_code_share: string | null;
  prompts_url: string | null;
  time_spent: string | null;
  cost: string | null;
  features: string[] | null;
  workflow_parts: string[] | null;
  modalities: string[] | null;
  dicomweb: boolean | null;
  stack: string | null;
  author_name: string | null;
  author_profile: string | null;
  country: string | null;
  limitations: string | null;
  approved_at: string | null;
  total_votes: number;
  month_votes: number;
  screenshots: PublicViewerScreenshot[];
}

interface RankingRow {
  slug: string;
  total_votes: number | string;
  month_votes: number | string;
}

interface SubmissionRow extends Omit<PublicViewer, "total_votes" | "month_votes" | "screenshots" | "ai_tools"> {
  ai_tools: unknown;
}

interface ScreenshotRow {
  id: string;
  path: string;
  position: number;
}

function numberValue(value: number | string | null | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function aiTools(value: unknown): PublicViewer["ai_tools"] {
  if (!Array.isArray(value)) return null;
  const tools = value.filter((tool): tool is { name: string; version: string } => {
    if (!tool || typeof tool !== "object") return false;
    const candidate = tool as Record<string, unknown>;
    return typeof candidate.name === "string" && typeof candidate.version === "string";
  });
  return tools.length > 0 ? tools : null;
}

export async function getPublicViewers(): Promise<PublicViewer[]> {
  if (!hasSupabaseConfig()) return [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const rankingResult = await supabase.rpc("ranking");
  if (rankingResult.error || !rankingResult.data) return [];

  const ranked = rankingResult.data as unknown as RankingRow[];
  const rows = await Promise.all(ranked.map(async (rank) => {
    const [submissionResult, screenshotResult] = await Promise.all([
      supabase.rpc("get_submission", { p_slug: rank.slug }),
      supabase.rpc("get_public_screenshots", { p_slug: rank.slug }),
    ]);
    const submission = submissionResult.data?.[0] as SubmissionRow | undefined;
    if (submissionResult.error || !submission || screenshotResult.error) return null;
    return {
      submission,
      rank,
      screenshots: (screenshotResult.data ?? []) as ScreenshotRow[],
    };
  }));

  const validRows = rows.filter((row): row is NonNullable<typeof row> => row !== null);
  const paths = validRows.flatMap((row) => row.screenshots.map((screenshot) => screenshot.path));
  let signedUrls: ReadonlyMap<string | null, string | null> = new Map();
  try {
    signedUrls = await createScreenshotSignedUrls(paths);
  } catch {
    // A missing secret key should not make the public text-only page unavailable.
  }

  return validRows.map(({ submission, rank, screenshots }) => ({
    ...submission,
    ai_tools: aiTools(submission.ai_tools),
    total_votes: numberValue(rank.total_votes),
    month_votes: numberValue(rank.month_votes),
    screenshots: screenshots.map((screenshot) => ({
      ...screenshot,
      url: signedUrls.get(screenshot.path) ?? null,
    })),
  }));
}

export async function getPublicViewer(slug: string): Promise<PublicViewer | null> {
  const viewers = await getPublicViewers();
  return viewers.find((viewer) => viewer.slug === slug) ?? null;
}
