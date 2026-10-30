import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "@/lib/auth/redirects";
import { defaultLocale, locales, type Locale } from "@/lib/i18n";
import { hasSupabaseConfig, supabaseCookieOptions } from "@/lib/supabase/config";

export const config = {
  matcher: [
    "/",
    "/(pt|en|es)/(submit|me)",
    "/admin",
  ],
};

export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return {
        tag: tag.trim().toLowerCase(),
        quality: Number.isFinite(quality) ? quality : 1,
      };
    })
    .filter((candidate) => candidate.tag.length > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const candidate of ranked) {
    const language = candidate.tag.split("-")[0];
    const match = locales.find((locale) => locale === language);
    if (match) return match;
  }

  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    const locale = negotiateLocale(request.headers.get("accept-language"));
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  if (!hasSupabaseConfig()) return NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookieOptions: supabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  // Aqui, e não na página: redirecionar durante a renderização deixa a tela sem conteúdo até o login carregar.
  const privateRoute = request.nextUrl.pathname.match(/^\/(pt|en|es)\/(submit|me)$/);
  if (privateRoute && !data?.claims) {
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(new URL(loginPath(privateRoute[1] as Locale, next), request.url));
  }

  return response;
}
