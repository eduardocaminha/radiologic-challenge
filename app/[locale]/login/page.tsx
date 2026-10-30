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
        className="size-full"
        canvasClassName="inset-x-0 top-1/2 bottom-8 lg:inset-y-10 lg:left-1/2 lg:right-4"
      >
        <div className="relative flex h-1/2 w-full flex-col justify-center gap-6 px-6 pt-8 lg:h-full lg:w-1/2 lg:items-start lg:px-16 lg:pt-0">
          <Link href={`/${locale}`} aria-label={dictionary.home.title} className="w-fit">
            <Logo className="size-6" aria-hidden="true" />
          </Link>
          <h1 className="max-w-sm text-headline-md text-balance">{dictionary.auth.loginTitle}</h1>
          <LoginButtons
            locale={locale}
            next={next}
            errorMessage={dictionary.auth.providerError}
            hasInitialError={query.error === "oauth"}
            googleLabel={dictionary.auth.google}
            githubLabel={dictionary.auth.github}
          />
        </div>
      </CtViewport>
    </main>
  );
}
