"use client";

import { StatusScreen } from "@/components/status-screen";
import { Button } from "@/components/ui/button";
import { STATUS_COPY } from "@/lib/status-copy";
import "./globals.css";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const copy = STATUS_COPY.pt;
  return (
    <html lang="pt-BR">
      <body>
        <StatusScreen code="500" title={copy.error} nonClinical={copy.nonClinical}>
          <Button size="lg" onClick={reset}>{copy.retry}</Button>
        </StatusScreen>
      </body>
    </html>
  );
}
