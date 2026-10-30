"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { StatusScreen } from "@/components/status-screen";
import { Button } from "@/components/ui/button";
import { isLocale } from "@/lib/i18n";
import { STATUS_COPY } from "@/lib/status-copy";

export default function NotFound() {
  const { locale } = useParams<{ locale: string }>();
  const current = isLocale(locale) ? locale : "pt";
  const copy = STATUS_COPY[current];
  return (
    <StatusScreen code="404" title={copy.notFound}>
      <Button size="lg" render={<Link href={`/${current}`} />}>{copy.back}</Button>
    </StatusScreen>
  );
}
