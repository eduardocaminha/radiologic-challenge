import { notFound } from "next/navigation";
import { AdminQueue } from "@/components/admin-queue";
import { createScreenshotSignedUrls } from "@/lib/storage/server";
import type { AdminIntegrityReport, AdminQueue as AdminQueueData, AdminScreenshot, VoteIntegrityReport } from "@/lib/admin/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function withScreenshotUrls(queue: AdminQueueData, urls: ReadonlyMap<string | null, string | null>): AdminQueueData {
  const addUrls = (screenshots: AdminScreenshot[]): AdminScreenshot[] => screenshots.map((screenshot) => ({
    ...screenshot,
    url: urls.get(screenshot.path) ?? undefined,
    submission: screenshot.submission ? { ...screenshot.submission, screenshots: addUrls(screenshot.submission.screenshots) } : undefined,
  }));

  return {
    submissions: queue.submissions.map((submission) => ({ ...submission, screenshots: addUrls(submission.screenshots) })),
    screenshots: addUrls(queue.screenshots),
    published: queue.published.map((submission) => ({ ...submission, screenshots: addUrls(submission.screenshots) })),
  };
}

async function getIntegrityReports(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, queue: AdminQueueData): Promise<AdminIntegrityReport[]> {
  const reports = await Promise.all(queue.published.map(async (submission) => {
    const { data, error } = await supabase.rpc("vote_report", { p_submission_id: submission.id });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const raw = data[0] as Record<string, unknown>;
    const report: VoteIntegrityReport = {
      total_votes: Number(raw.total_votes ?? 0),
      suspicious_votes: Number(raw.suspicious_votes ?? 0),
      suspicious_fraction: Number(raw.suspicious_fraction ?? 0),
      hourly_votes: Array.isArray(raw.hourly_votes) ? raw.hourly_votes as VoteIntegrityReport["hourly_votes"] : [],
      suspicious_accounts: Array.isArray(raw.suspicious_accounts) ? raw.suspicious_accounts as VoteIntegrityReport["suspicious_accounts"] : [],
    };
    return { submission: { id: submission.id, name: submission.name, slug: submission.slug, status: submission.status }, report };
  }));
  return reports.filter((report): report is AdminIntegrityReport => report !== null);
}

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") notFound();

  const { data, error } = await supabase.rpc("admin_moderation_queue");
  if (error?.code === "SUB20" || error?.code === "SUB01") notFound();
  if (error || !data) {
    return <AdminQueue error="Não foi possível carregar a fila de moderação." queue={{ submissions: [], screenshots: [], published: [] }} />;
  }

  const queue = data as unknown as AdminQueueData;
  const integrityReports = await getIntegrityReports(supabase, queue);
  const paths = [
    ...queue.submissions.flatMap((submission) => submission.screenshots.map((screenshot) => screenshot.path)),
    ...queue.screenshots.flatMap((screenshot) => [screenshot.path, ...(screenshot.submission?.screenshots.map((nested) => nested.path) ?? [])]),
    ...queue.published.flatMap((submission) => submission.screenshots.map((screenshot) => screenshot.path)),
  ];
  const urls = paths.length > 0 ? await createScreenshotSignedUrls([...new Set(paths)]) : new Map<string, string>();

  return <AdminQueue queue={withScreenshotUrls(queue, urls)} integrityReports={integrityReports} />;
}
