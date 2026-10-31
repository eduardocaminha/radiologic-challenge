import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LoginButtons } from "@/components/login-buttons";
import { CtViewport } from "@/components/ct-viewport";
import { Logo } from "@/components/logo";
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
    <main data-bare-page className="h-dvh p-3 sm:p-4">
      <CtViewport
        study="abdomen"
        title={dictionary.home.title}
        month={month}
        sweepOnPhone
        className="flex size-full flex-col lg:flex-row"
        canvasClassName="relative mb-8 min-h-0 flex-1 lg:my-10 lg:me-4"
      >
        <div className="relative flex shrink-0 flex-col gap-6 px-6 pb-6 pt-14 lg:w-1/2 lg:justify-center lg:px-16 lg:py-0">
          <div className="mx-auto flex w-72 max-w-full flex-col gap-6 sm:contents">
            <Link href={`/${locale}`} aria-label={dictionary.home.title} className="w-fit">
              <Logo className="size-6" aria-hidden="true" />
            </Link>
            <h1 className="max-w-xs text-display-sm sm:text-display-md">{dictionary.auth.loginTitle}</h1>
            <LoginButtons
              locale={locale}
              next={next}
              errorMessage={dictionary.auth.providerError}
              hasInitialError={query.error === "oauth"}
              googleLabel={dictionary.auth.google}
              githubLabel={dictionary.auth.github}
            />
          </div>
        </div>
      </CtViewport>
    </main>
  );
}
