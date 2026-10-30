"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/dictionaries";
import { copyText } from "@/lib/clipboard";
import type { Locale } from "@/lib/i18n";

export function BadgeMarkdown({ locale, dictionary, name, slug }: { locale: Locale; dictionary: Dictionary; name: string; slug: string }) {
  const copy = dictionary.submission;
  const markdownName = name.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
  const markdown = `[![${markdownName}](https://challenge.radiologic.io/badge-${locale}.svg)](https://challenge.radiologic.io/${locale}/v/${slug})`;
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    await copyText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button variant="ghost" size="sm" className="text-muted-foreground" title={markdown} onClick={() => void copyMarkdown()}>
      {copied ? <CheckIcon aria-hidden="true" className="text-success" /> : <CopyIcon aria-hidden="true" />}
      {copied ? copy.badgeCopied : copy.badgeCopy}
    </Button>
  );
}
