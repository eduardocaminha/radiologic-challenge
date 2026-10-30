"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { StatusScreen } from "@/components/status-screen";
import { Button } from "@/components/ui/button";
import { isLocale } from "@/lib/i18n";
import { STATUS_COPY } from "@/lib/status-copy";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { locale } = useParams<{ locale: string }>();
  const current = isLocale(locale) ? locale : "pt";
  const copy = STATUS_COPY[current];
  return (
    <StatusScreen code="500" title={copy.error} nonClinical={copy.nonClinical}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="lg" onClick={reset}>{copy.retry}</Button>
        <Button size="lg" variant="ghost" className="text-muted-foreground" render={<Link href={`/${current}`} />}>{copy.back}</Button>
      </div>
    </StatusScreen>
  );
}
