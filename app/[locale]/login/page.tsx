import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoginButtons } from "@/components/login-buttons";
import { StatusScreen } from "@/components/status-screen";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { getDictionary } from "@/dictionaries";
import { intlLocales, isLocale, type Locale } from "@/lib/i18n";
import { noIndex } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[]; error?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale);
  return { title: { absolute: dictionary.auth.loginTitle }, robots: noIndex };
}

export default async function Login({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam as Locale;
  const query = await searchParams;
  const next = safeRedirectPath(typeof query.next === "string" ? query.next : null);
  const dictionary = await getDictionary(locale);
  const month = new Intl.DateTimeFormat(intlLocales[locale], { month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date());

  return (
    <StatusScreen code={month} title={dictionary.auth.loginTitle} nonClinical={dictionary.footer.nonClinical}>
      <LoginButtons
        locale={locale}
        next={next}
        errorMessage={dictionary.auth.providerError}
        hasInitialError={query.error === "oauth"}
        googleLabel={dictionary.auth.google}
        githubLabel={dictionary.auth.github}
      />
    </StatusScreen>
  );
}
