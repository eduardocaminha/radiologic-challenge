"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

// Home e /me já têm esta ação na página, e em /submit a pessoa já está no destino.
export function HeaderSubmit({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const href = `/${locale}/submit`;
  if ([`/${locale}`, href, `/${locale}/me`].includes(pathname)) return null;
  return <Button size="sm" className="max-sm:hidden" render={<Link href={href} />}>{label}</Button>;
}
