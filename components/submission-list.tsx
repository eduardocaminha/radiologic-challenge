"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { deleteSubmission, transitionSubmission } from "@/app/[locale]/submit/actions";
import { initialSubmissionActionState } from "@/lib/submissions/action-state";
import { getSubmissionError } from "@/lib/submissions/errors";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";
import { BadgeMarkdown } from "@/components/badge-markdown";
import { ConfirmAction } from "@/components/confirm-action";
import { ShareButton } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<SubmissionSummary["status"], string> = {
  draft: "text-muted-foreground",
  pending: "text-warning-foreground",
  approved: "text-success-foreground",
  rejected: "text-destructive-foreground",
  removed: "text-muted-foreground",
};

interface SubmissionSummary {
  id: string;
  slug: string | null;
  status: "draft" | "pending" | "approved" | "rejected" | "removed";
  rejection_reason: string | null;
  name: string | null;
}

export function SubmissionList({ locale, dictionary, submissions }: { locale: Locale; dictionary: Dictionary; submissions: SubmissionSummary[] }) {
  const router = useRouter();
  const [transitionState, transitionAction, transitionPending] = useActionState(transitionSubmission, initialSubmissionActionState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteSubmission, initialSubmissionActionState);
  const actionState = deleteState.errorCode || deleteState.formError
    ? deleteState
    : transitionState.errorCode || transitionState.formError
      ? transitionState
      : initialSubmissionActionState;

  useEffect(() => {
    if (transitionState.actionId || deleteState.actionId) router.refresh();
  }, [deleteState.actionId, router, transitionState.actionId]);

  return (
    <div className="flex flex-col">
      {actionState.errorCode ? <p role="alert" className="mb-4 text-sm text-destructive-foreground">{getSubmissionError(dictionary, actionState.errorCode)}</p> : null}
      {actionState.formError ? <p role="alert" className="mb-4 text-sm text-destructive-foreground">{dictionary.submission.error.default}</p> : null}
      {submissions.length === 0 ? (
        <Empty className="rounded-2xl bg-surface">
          <EmptyHeader>
            <EmptyTitle>{dictionary.submission.noSubmissions}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button size="lg" render={<Link href={`/${locale}/submit`} />}>{dictionary.home.submit}</Button>
          </EmptyContent>
        </Empty>
      ) : null}
      {submissions.map((submission) => (
        <SubmissionItem key={submission.id} locale={locale} dictionary={dictionary} submission={submission} transitionAction={transitionAction} deleteAction={deleteAction} disabled={transitionPending || deletePending} />
      ))}
    </div>
  );
}

function SubmissionItem({ locale, dictionary, submission, transitionAction, deleteAction, disabled }: { locale: Locale; dictionary: Dictionary; submission: SubmissionSummary; transitionAction: (formData: FormData) => void; deleteAction: (formData: FormData) => void; disabled: boolean }) {
  const deleteForm = useRef<HTMLFormElement>(null);
  return (
    <article className="flex flex-col gap-3 border-b border-border py-5 first:border-t">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-medium">{submission.name ?? dictionary.submission.title}</h2>
          <p className={cn("text-label-md", STATUS_TONE[submission.status])}>{dictionary.submission.status[submission.status]}</p>
          {submission.status === "draft" ? <p className="text-sm text-muted-foreground">{dictionary.submission.incomplete}</p> : null}
        </div>
        <div className={cn("flex flex-wrap items-center gap-1", submission.status !== "draft" && submission.status !== "rejected" && "max-sm:-ms-2.5")}>
          {submission.status === "draft" ? <TransitionForm locale={locale} id={submission.id} intent="submit" label={dictionary.submission.send} action={transitionAction} disabled={disabled} /> : null}
          {submission.status === "rejected" ? <TransitionForm locale={locale} id={submission.id} intent="resubmit" label={dictionary.submission.resend} action={transitionAction} disabled={disabled} /> : null}
          {submission.status === "approved" && submission.slug ? <BadgeMarkdown locale={locale} dictionary={dictionary} name={submission.name ?? dictionary.submission.title} slug={submission.slug} /> : null}
          {submission.status === "approved" && submission.slug ? <ShareButton locale={locale} slug={submission.slug} name={submission.name ?? dictionary.submission.title} copy={dictionary.share} variant="ghost" size="sm" className="text-muted-foreground" /> : null}
          {submission.status === "removed" ? null : <Button variant="ghost" size="sm" className="text-muted-foreground" render={<Link href={`/${locale}/submit?id=${submission.id}`} />}>{dictionary.submission.editTitle}</Button>}
          <form ref={deleteForm} action={deleteAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="submission_id" value={submission.id} />
          </form>
          <ConfirmAction label={dictionary.submission.delete} question={dictionary.submission.confirmDelete} confirmLabel={dictionary.submission.delete} cancelLabel={dictionary.submission.cancel} disabled={disabled} onConfirm={() => deleteForm.current?.requestSubmit()} />
        </div>
      </div>
      {submission.rejection_reason ? <p className="text-sm"><span className="font-medium">{dictionary.submission.rejected}:</span> {submission.rejection_reason}</p> : null}
    </article>
  );
}

function TransitionForm({ locale, id, intent, label, action, disabled }: { locale: Locale; id: string; intent: "submit" | "resubmit"; label: string; action: (formData: FormData) => void; disabled: boolean }) {
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="submission_id" value={id} />
      <input type="hidden" name="intent" value={intent} />
      <Button type="submit" size="sm" disabled={disabled}>{label}</Button>
    </form>
  );
}
