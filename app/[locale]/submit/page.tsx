import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { loginPath } from "@/lib/auth/redirects";
import { isLocale, type Locale } from "@/lib/i18n";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createScreenshotSignedUrls } from "@/lib/storage/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SubmissionForm, type SubmissionRecord } from "@/components/submission-form";
import type { ScreenshotRecord } from "@/components/screenshot-manager";
import { noIndex } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale);
  return { title: dictionary.submission.title, robots: noIndex };
}

export default async function Submit({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam as Locale;
  const destination = `/${locale}/submit`;
  if (!hasSupabaseConfig()) redirect(loginPath(locale, destination));

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect(loginPath(locale, destination));

  const dictionary = await getDictionary(locale);
  const { id } = await searchParams;
  let submission: SubmissionRecord | undefined;
  if (id) {
    const [result, screenshots] = await Promise.all([
      supabase.rpc("my_submission", { p_submission_id: id }),
      supabase.rpc("my_screenshots", { p_submission_id: id }),
    ]);
    if (result.error || !result.data?.[0]) notFound();
    const screenshotRows = (screenshots.data ?? []) as Array<Omit<ScreenshotRecord, "url">>;
    const signedUrls = await createScreenshotSignedUrls(screenshotRows.map((screenshot) => screenshot.path));
    submission = {
      ...(result.data[0] as SubmissionRecord),
      screenshots: screenshotRows.map((screenshot) => ({ ...screenshot, url: signedUrls.get(screenshot.path) ?? screenshot.path })),
    };
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 pt-10 sm:pt-14">
      <SubmissionForm locale={locale} dictionary={dictionary} idempotencyKey={randomUUID()} submission={submission} />
    </main>
  );
}
