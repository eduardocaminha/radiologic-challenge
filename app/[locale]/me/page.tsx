import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { loginPath } from "@/lib/auth/redirects";
import { isLocale, type Locale } from "@/lib/i18n";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SubmissionList } from "@/components/submission-list";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-dynamic";

export default async function Me({ params }: PageProps) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam as Locale;
  const destination = `/${locale}/me`;
  if (!hasSupabaseConfig()) redirect(loginPath(locale, destination));

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect(loginPath(locale, destination));

  const [dictionary, submissions] = await Promise.all([
    getDictionary(locale),
    supabase.rpc("my_submissions"),
  ]);
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-headline-lg sm:text-display-sm">{dictionary.auth.meTitle}</h1>
        <Button render={<Link href={`/${locale}/submit`} />}>{dictionary.home.submit}</Button>
      </div>
      <SubmissionList locale={locale} dictionary={dictionary} submissions={submissions.data ?? []} />
    </main>
  );
}
