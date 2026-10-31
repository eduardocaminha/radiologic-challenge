"use client";

import { CheckIcon, CopyIcon, Share2Icon, ArrowUpRightIcon } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import type { Dictionary } from "@/dictionaries";
import { copyText } from "@/lib/clipboard";
import type { Locale } from "@/lib/i18n";
import { linkedinUrl, projectUrl, whatsappUrl } from "@/lib/viewers/share";

// Link do projeto com mensagem pronta pedindo voto. O regulamento permite pedir votos.
export function ShareButton({ locale, slug, name, copy, iconOnly = false, ...button }: { locale: Locale; slug: string; name: string; copy: Dictionary["share"]; iconOnly?: boolean } & Pick<ComponentProps<typeof Button>, "variant" | "size" | "className">) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const url = projectUrl(locale, slug);
  const message = copy.message.replace("{name}", name).replace("{url}", url);

  async function copyLink() {
    await copyText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: name, text: message.replace(url, "").trim(), url });
    } catch {
      // Fechar a folha de compartilhamento também rejeita a promessa.
    }
  }

  return (
    <Popover onOpenChange={(open) => { if (open) setCanShare(typeof navigator.share === "function"); }}>
      <PopoverTrigger render={<Button type="button" aria-label={iconOnly ? `${copy.label}: ${name}` : undefined} {...button} />}>
        <Share2Icon aria-hidden="true" />
        {iconOnly ? null : copy.label}
      </PopoverTrigger>
      <PopoverPopup align="end" sideOffset={8}>
        <div className="flex w-52 flex-col gap-2">
          <PopoverTitle className="text-title-sm">{copy.title}</PopoverTitle>
          <div className="-mx-2.5 flex flex-col">
            <Button type="button" variant="ghost" className="justify-between" onClick={() => void copyLink()}>
              {copied ? copy.copied : copy.copy}
              {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
            </Button>
            <Button variant="ghost" className="justify-between" render={<a href={whatsappUrl(message)} target="_blank" rel="noreferrer" />}>
              WhatsApp
              <ArrowUpRightIcon aria-hidden="true" />
            </Button>
            <Button variant="ghost" className="justify-between" render={<a href={linkedinUrl(url)} target="_blank" rel="noreferrer" />}>
              LinkedIn
              <ArrowUpRightIcon aria-hidden="true" />
            </Button>
            {canShare ? <Button type="button" variant="ghost" className="justify-start" onClick={() => void nativeShare()}>{copy.more}</Button> : null}
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
