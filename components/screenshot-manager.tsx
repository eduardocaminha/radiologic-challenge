"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, ImagePlusIcon } from "lucide-react";
import Image from "next/image";
import { ConfirmAction } from "@/components/confirm-action";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { deleteScreenshot, registerScreenshot, reorderScreenshots } from "@/app/[locale]/submit/actions";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";

export interface ScreenshotRecord {
  id: string;
  submission_id: string;
  path: string;
  url: string;
  status: "pending" | "approved" | "rejected";
  position: number;
  created_at: string;
}

const MAX_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function ScreenshotManager({
  locale,
  dictionary,
  submissionId,
  initialScreenshots,
  onCountChange,
}: {
  locale: Locale;
  dictionary: Dictionary;
  submissionId?: string;
  initialScreenshots: ScreenshotRecord[];
  onCountChange?: (count: number) => void;
}) {
  const copy = dictionary.submission.screenshot;
  const [screenshots, setScreenshots] = useState(initialScreenshots);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => onCountChange?.(screenshots.length), [onCountChange, screenshots.length]);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!submissionId || files.length === 0) return;
    if (screenshots.length >= 5) {
      setMessage(copy.max);
      return;
    }

    const client = createBrowserSupabaseClient();
    if (!client) {
      setMessage(copy.uploadError);
      return;
    }
    const user = await client.auth.getUser();
    if (user.error || !user.data.user) {
      setMessage(copy.uploadError);
      return;
    }

    setMessage(undefined);
    setUploading(true);
    let count = screenshots.length;
    try {
      for (const file of files.slice(0, 5 - screenshots.length)) {
        if (!ACCEPTED_TYPES.has(file.type)) {
          setMessage(copy.invalidType);
          continue;
        }
        if (file.size > MAX_SIZE) {
          setMessage(copy.invalidSize);
          continue;
        }
        const extension = file.type === "image/jpeg" ? "jpg" : file.type.slice("image/".length);
        const path = `${user.data.user.id}/${submissionId}/${crypto.randomUUID()}.${extension}`;
        const uploaded = await client.storage.from("screenshots").upload(path, file, {
          cacheControl: "60",
          contentType: file.type,
          upsert: false,
        });
        if (uploaded.error) {
          setMessage(copy.uploadError);
          continue;
        }

        setMessage(copy.uploading);
        const registered = await registerScreenshot({ locale, submissionId, path, position: count + 1 });
        if (!registered.ok) {
          setMessage(copy.uploadError);
          continue;
        }
        count += 1;
        if (registered.screenshot) setScreenshots((current) => [...current, registered.screenshot!]);
        setMessage(copy.uploaded);
      }
    } catch {
      setMessage(copy.uploadError);
    } finally {
      setUploading(false);
    }
  }

  function remove(screenshotId: string) {
    startTransition(async () => {
      const result = await deleteScreenshot({ locale, screenshotId });
      if (!result.ok) setMessage(copy.deleteError);
      else setScreenshots((current) => current.filter((screenshot) => screenshot.id !== screenshotId));
    });
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= screenshots.length || !submissionId) return;
    const previous = screenshots;
    const next = [...screenshots];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setScreenshots(next);
    startTransition(async () => {
      const result = await reorderScreenshots({ locale, submissionId, screenshotIds: next.map((item) => item.id) });
      if (!result.ok) {
        setScreenshots(previous);
        setMessage(copy.reorderError);
      }
    });
  }

  const disabled = !submissionId || uploading || isPending || screenshots.length >= 5;
  return (
    <section className="flex scroll-mt-6 flex-col gap-6" aria-labelledby="screenshots-heading">
      <h2 id="screenshots-heading" className="border-b border-border pb-3 text-title-sm">{copy.title}</h2>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button variant="outline" disabled={disabled} render={<label />} className="has-[:disabled]:pointer-events-none has-[:disabled]:opacity-64">
          <ImagePlusIcon aria-hidden="true" />
          {copy.choose}
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={disabled} onChange={upload} className="sr-only" />
        </Button>
        <p className="text-sm text-muted-foreground">{submissionId ? copy.description : copy.savedRequired}</p>
      </div>
      {uploading ? <p className="flex items-center gap-2 text-sm" role="status" aria-live="polite"><Spinner />{copy.uploading}</p> : null}
      {message && !uploading ? <p className="text-sm" role="status" aria-live="polite">{message}</p> : null}
      {screenshots.length > 0 ? (
        <ol className="flex flex-col">
          {screenshots.map((screenshot, index) => (
            <li key={screenshot.id} className="flex items-center gap-4 border-b border-border py-3 first:border-t">
              <Image src={screenshot.url} loader={({ src }) => src} unoptimized width={112} height={63} alt={`${copy.title} ${index + 1}`} className="aspect-video w-28 shrink-0 rounded-md bg-muted object-cover" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                <span className="tabular-nums text-muted-foreground">{index + 1} / 5</span>
                <span className={screenshot.status === "approved" ? "text-success-foreground" : screenshot.status === "rejected" ? "text-destructive-foreground" : "text-warning-foreground"}>{copy.status[screenshot.status]}</span>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button variant="ghost" size="icon-sm" aria-label={copy.moveUp} title={copy.moveUp} onClick={() => move(index, -1)} disabled={index === 0 || isPending}><ArrowUpIcon aria-hidden="true" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label={copy.moveDown} title={copy.moveDown} onClick={() => move(index, 1)} disabled={index === screenshots.length - 1 || isPending}><ArrowDownIcon aria-hidden="true" /></Button>
                <ConfirmAction label={copy.delete} question={copy.confirmDelete} confirmLabel={copy.delete} cancelLabel={dictionary.submission.cancel} disabled={isPending} onConfirm={() => remove(screenshot.id)} />
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
