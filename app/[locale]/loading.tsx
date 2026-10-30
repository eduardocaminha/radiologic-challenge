"use client";

import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { isLocale } from "@/lib/i18n";
import { STATUS_COPY } from "@/lib/status-copy";

// Só aparece depois de 300ms: carga rápida não pisca nada na tela.
export default function Loading() {
  const { locale } = useParams<{ locale: string }>();
  const copy = STATUS_COPY[isLocale(locale) ? locale : "pt"];
  return (
    <main className="reveal-delayed mx-auto flex min-h-96 w-full max-w-6xl items-center justify-center gap-2 px-6 text-sm text-muted-foreground" role="status">
      <Spinner aria-hidden="true" />
      {copy.loading}
    </main>
  );
}
