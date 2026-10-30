import { notFound } from "next/navigation";
import { LoginButtons } from "@/components/login-buttons";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { getDictionary } from "@/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[]; error?: string }>;
}

export const dynamic = "force-dynamic";

export default async function Login({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam as Locale;
  const query = await searchParams;
  const next = safeRedirectPath(typeof query.next === "string" ? query.next : null);
  const dictionary = await getDictionary(locale);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-headline-md text-balance">{dictionary.auth.loginTitle}</h1>
      <LoginButtons
        locale={locale}
        next={next}
        errorMessage={dictionary.auth.providerError}
        hasInitialError={query.error === "oauth"}
        googleLabel={dictionary.auth.google}
        githubLabel={dictionary.auth.github}
      />
    </main>
  );
}
