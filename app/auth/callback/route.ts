import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { localeFromPath, loginPath, safeRedirectPath } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const next = safeRedirectPath(searchParams.get("next"));
  const localeParam = searchParams.get("locale");
  const locale = (localeParam && isLocale(localeParam) ? localeParam : null) ?? localeFromPath(next) ?? defaultLocale;
  const login = loginPath(locale, next, true);

  if (searchParams.get("error") || !searchParams.get("code")) {
    return NextResponse.redirect(new URL(login, origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(searchParams.get("code")!);

  if (error) return NextResponse.redirect(new URL(login, origin));

  await supabase.rpc("claim_github_submissions");

  return NextResponse.redirect(new URL(next ?? `/${locale}`, origin));
}
