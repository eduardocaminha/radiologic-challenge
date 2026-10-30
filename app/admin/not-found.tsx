import Link from "next/link";
import { StatusScreen } from "@/components/status-screen";
import { Button } from "@/components/ui/button";
import { STATUS_COPY } from "@/lib/status-copy";

export default function AdminNotFound() {
  const copy = STATUS_COPY.pt;
  return (
    <StatusScreen code="404" title={copy.notFound} nonClinical={copy.nonClinical}>
      <Button size="lg" render={<Link href="/" />}>{copy.back}</Button>
    </StatusScreen>
  );
}
