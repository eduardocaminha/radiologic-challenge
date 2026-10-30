"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";

export function BadgeMarkdown({ locale, dictionary, name, slug }: { locale: Locale; dictionary: Dictionary; name: string; slug: string }) {
  const copy = dictionary.submission;
  const markdownName = name.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
  const markdown = `[![${markdownName}](https://challenge.radiologic.io/badge-${locale}.svg)](https://challenge.radiologic.io/${locale}/v/${slug})`;
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = markdown;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button variant="ghost" size="sm" title={markdown} onClick={() => void copyMarkdown()}>
      {copied ? <CheckIcon aria-hidden="true" className="text-success" /> : <CopyIcon aria-hidden="true" />}
      {copied ? copy.badgeCopied : copy.badgeCopy}
    </Button>
  );
}
