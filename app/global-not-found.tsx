import type { Metadata } from "next";
import Link from "next/link";
import { StatusScreen } from "@/components/status-screen";
import { Button } from "@/components/ui/button";
import { STATUS_COPY } from "@/lib/status-copy";
import "./globals.css";

export const metadata: Metadata = { title: "404, Radiologic Workstation" };

export default function GlobalNotFound() {
  const copy = STATUS_COPY.pt;
  return (
    <html lang="pt-BR">
      <body>
        <StatusScreen code="404" title={copy.notFound} nonClinical={copy.nonClinical}>
          <Button size="lg" render={<Link href="/" />}>{copy.back}</Button>
        </StatusScreen>
      </body>
    </html>
  );
}
