"use client";

import Image from "next/image";
import { useActionState } from "react";
import { moderateAdminItem, type AdminActionState } from "@/app/admin/actions";
import { AdminHighlights } from "@/components/admin-highlights";
import { AdminIntegrity } from "@/components/admin-integrity";
import type { AdminEvent, AdminIntegrityReport, AdminQueue as AdminQueueData, AdminScreenshot, AdminSubmission } from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialActionState: AdminActionState = { ok: true };
const issueBaseUrl = "https://github.com/eduardocaminha/dicom-viewer-challenge/issues";

function date(value: string | null) {
  if (!value) return "Não informado";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Data inválida";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(parsed.getUTCDate())}/${pad(parsed.getUTCMonth() + 1)}/${parsed.getUTCFullYear()} ${pad(parsed.getUTCHours())}:${pad(parsed.getUTCMinutes())}`;
}

function value(value: unknown) {
  if (value === null || value === undefined || value === "") return "Não informado";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "Nenhum";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ActionForm({
  kind,
  itemId,
  slug,
  expectedStatus,
  action,
  label,
  reason,
}: {
  kind: "submission" | "screenshot";
  itemId: string;
  slug?: string | null;
  expectedStatus: AdminSubmission["status"] | AdminScreenshot["status"];
  action: "approve" | "reject" | "remove" | "restore";
  label: string;
  reason?: boolean;
}) {
  const [state, formAction, pending] = useActionState(moderateAdminItem, initialActionState);

  return (
    <form action={formAction} className="flex min-w-0 flex-wrap items-end gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="expectedStatus" value={expectedStatus} />
      {slug ? <input type="hidden" name="slug" value={slug} /> : null}
      {reason ? (
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
          <span>Motivo da rejeição</span>
          <Textarea name="reason" required maxLength={500} rows={2} placeholder="Explique o que precisa ser ajustado" />
        </label>
      ) : null}
      <Button type="submit" name="action" value={action} disabled={pending}>
        {pending ? "Aplicando..." : label}
      </Button>
      {state.message ? <p role={state.ok ? "status" : "alert"} className={`basis-full text-sm ${state.ok ? "text-muted-foreground" : "text-destructive"}`}>{state.message}</p> : null}
    </form>
  );
}

function SubmissionActions({ submission }: { submission: AdminSubmission }) {
  if (submission.status === "rejected") return null;

  if (submission.status === "pending") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <ActionForm kind="submission" itemId={submission.id} slug={submission.slug} expectedStatus={submission.status} action="approve" label="Aprovar" />
        </div>
        <ActionForm kind="submission" itemId={submission.id} slug={submission.slug} expectedStatus={submission.status} action="reject" label="Rejeitar" reason />
      </div>
    );
  }

  return (
    <ActionForm
      kind="submission"
      itemId={submission.id}
      slug={submission.slug}
      expectedStatus={submission.status}
      action={submission.status === "approved" ? "remove" : "restore"}
      label={submission.status === "approved" ? "Remover da galeria" : "Restaurar na galeria"}
    />
  );
}

function ScreenshotItem({ screenshot, slug }: { screenshot: AdminScreenshot; slug?: string | null }) {
  return (
    <li className="flex flex-col gap-3 rounded-lg bg-muted p-3 sm:p-4">
      {screenshot.url ? (
        <Image src={screenshot.url} loader={({ src }) => src} unoptimized width={1200} height={675} alt={`Captura ${screenshot.position}`} className="h-auto max-h-128 w-full rounded-md object-contain object-left" />
      ) : (
        <div className="flex min-h-48 items-center justify-center rounded-md bg-background text-sm text-muted-foreground">Imagem indisponível</div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>Imagem {screenshot.position}, {screenshot.status === "pending" ? "pendente" : screenshot.status === "approved" ? "aprovada" : "rejeitada"}</span>
        {screenshot.status === "pending" ? (
          <div className="flex flex-wrap gap-2">
            <ActionForm kind="screenshot" itemId={screenshot.id} slug={slug} expectedStatus={screenshot.status} action="approve" label="Aprovar imagem" />
            <ActionForm kind="screenshot" itemId={screenshot.id} slug={slug} expectedStatus={screenshot.status} action="reject" label="Rejeitar imagem" />
          </div>
        ) : null}
      </div>
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm">{children}</dd></div>;
}

function LinkField({ label, href }: { label: string; href: string | null }) {
  return <Field label={label}>{href ? <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-4">{href}</a> : "Não informado"}</Field>;
}

function History({ events }: { events: AdminEvent[] }) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-label-md">Histórico de eventos ({events.length})</summary>
      <ol className="mt-3 flex flex-col gap-2 border-l border-border pl-4">
        {events.length === 0 ? <li className="text-sm text-muted-foreground">Nenhum evento registrado.</li> : events.map((event) => (
          <li key={event.id} className="text-sm">
            <p>{event.kind}</p>
            <p className="text-muted-foreground">{date(event.created_at)} · {value(event.detail)}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}

function SubmissionRecord({ submission }: { submission: AdminSubmission }) {
  const issueUrl = submission.github_issue_number ? `${issueBaseUrl}/${submission.github_issue_number}` : null;
  return (
    <article className="flex flex-col gap-6 rounded-2xl bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{submission.status === "pending" ? "Submissão pendente" : submission.status === "approved" ? "Viewer publicado" : submission.status === "rejected" ? "Viewer rejeitado" : "Viewer removido"}</p>
          <h2 className="mt-1 text-title-lg">{submission.name ?? "Viewer sem nome"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Recebida em {date(submission.created_at)}</p>
        </div>
        <SubmissionActions submission={submission} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-label-md">Imagens</h3>
        {submission.screenshots.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma imagem cadastrada.</p> : <ol className="grid gap-4 lg:grid-cols-2">{submission.screenshots.map((screenshot) => <ScreenshotItem key={screenshot.id} screenshot={screenshot} slug={submission.slug} />)}</ol>}
      </div>

      <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Nome">{value(submission.name)}</Field>
        <Field label="Frase de apresentação">{value(submission.tagline)}</Field>
        <Field label="Idioma">{value(submission.lang)}</Field>
        <Field label="Plataformas">{value(submission.platforms)}</Field>
        <Field label="Exige instalação">{value(submission.requires_install)}</Field>
        <Field label="Tecnologia base">{value(submission.base_tech)}</Field>
        <Field label="Licença">{value(submission.license)}</Field>
        <Field label="Fonte dos dados">{value(submission.data_source)}</Field>
        <Field label="Licença dos dados">{value(submission.data_license)}</Field>
        <Field label="Usa API externa">{value(submission.external_api)}</Field>
        <Field label="Detalhes da API">{value(submission.external_api_detail)}</Field>
        <Field label="Recursos">{value(submission.features)}</Field>
        <Field label="Modalidades">{value(submission.modalities)}</Field>
        <Field label="Usa DICOMweb">{value(submission.dicomweb)}</Field>
        <Field label="Stack">{value(submission.stack)}</Field>
        <Field label="Nome do autor">{value(submission.author_name)}</Field>
        <Field label="Perfil do autor">{value(submission.author_profile)}</Field>
        <Field label="País">{value(submission.country)}</Field>
        <Field label="Ferramentas de IA">{value(submission.ai_tools)}</Field>
        <Field label="Participação de código de IA">{value(submission.ai_code_share)}</Field>
        <Field label="Tempo investido">{value(submission.time_spent)}</Field>
        <Field label="Custo">{value(submission.cost)}</Field>
        <Field label="Limitações">{value(submission.limitations)}</Field>
        <Field label="Aceite do regulamento">{value(submission.rules_accepted_at ? date(submission.rules_accepted_at) : null)}</Field>
        <LinkField label="Demonstração" href={submission.demo_url} />
        <LinkField label="Download" href={submission.download_url} />
        <LinkField label="Repositório" href={submission.repo_url} />
        <LinkField label="Vídeo" href={submission.video_url} />
        <LinkField label="Prompts" href={submission.prompts_url} />
        <LinkField label="Issue" href={issueUrl} />
        <Field label="Descrição">{value(submission.description)}</Field>
        <Field label="Diferencial">{value(submission.differential)}</Field>
      </dl>

      {submission.rejection_reason ? <p className="text-sm"><span className="font-medium">Motivo da rejeição:</span> {submission.rejection_reason}</p> : null}
      <History events={submission.events} />
    </article>
  );
}

function PendingScreenshotQueue({ screenshots, listedSubmissionIds }: { screenshots: AdminScreenshot[]; listedSubmissionIds: ReadonlySet<string> }) {
  return (
    <section className="flex flex-col gap-5" aria-labelledby="pending-images-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="pending-images-heading" className="text-title-md">Imagens pendentes</h2>
        <p className="text-sm text-muted-foreground">{screenshots.length} imagens</p>
      </div>
      {screenshots.length === 0 ? <p className="rounded-lg bg-surface p-5 text-sm text-muted-foreground">Não há imagens pendentes.</p> : (
        <ol className="grid gap-5 lg:grid-cols-2">
          {screenshots.map((screenshot) => (
            <li key={screenshot.id}>
              {screenshot.submission && !listedSubmissionIds.has(screenshot.submission.id) ? <SubmissionRecord submission={screenshot.submission} /> : (
                <div className="rounded-2xl bg-surface p-5 sm:p-7">
                  <p className="text-sm text-muted-foreground">Imagem pendente</p>
                  <h3 className="mt-1 text-title-sm">{screenshot.submission_name ?? "Viewer sem nome"}</h3>
                  <ol className="mt-4"><ScreenshotItem screenshot={screenshot} slug={screenshot.submission_slug} /></ol>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function AdminQueue({ queue, error, integrityReports = [] }: { queue: AdminQueueData; error?: string; integrityReports?: AdminIntegrityReport[] }) {
  const pendingImageCount = queue.screenshots.length;
  const listedSubmissionIds = new Set([...queue.submissions, ...queue.published].map((submission) => submission.id));
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-6 py-10 sm:px-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Radiologic Viewers</p>
        <h1 className="text-headline-lg">Fila de moderação</h1>
        <p className="max-w-2xl text-muted-foreground">Revise a ficha completa, as imagens e o histórico antes de publicar um viewer.</p>
      </header>
      {error ? <p role="alert" className="rounded-lg bg-muted p-4 text-sm text-destructive">{error}</p> : null}
      <AdminIntegrity reports={integrityReports} />
      <AdminHighlights />
      <section className="flex flex-col gap-5" aria-labelledby="pending-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="pending-heading" className="text-title-md">Pendências</h2>
          <p className="text-sm text-muted-foreground">{queue.submissions.length} submissões, {pendingImageCount} imagens</p>
        </div>
        {queue.submissions.length === 0 ? <p className="rounded-lg bg-surface p-5 text-sm text-muted-foreground">Não há submissões pendentes.</p> : <div className="flex flex-col gap-5">{queue.submissions.map((submission) => <SubmissionRecord key={submission.id} submission={submission} />)}</div>}
      </section>
      <PendingScreenshotQueue screenshots={queue.screenshots} listedSubmissionIds={listedSubmissionIds} />
      {queue.published.length > 0 ? (
        <section className="flex flex-col gap-5" aria-labelledby="published-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="published-heading" className="text-title-md">Publicados e removidos</h2>
            <p className="text-sm text-muted-foreground">{queue.published.length} viewers</p>
          </div>
          <div className="flex flex-col gap-5">{queue.published.map((submission) => <SubmissionRecord key={submission.id} submission={submission} />)}</div>
        </section>
      ) : null}
    </main>
  );
}
