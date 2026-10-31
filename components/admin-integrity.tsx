"use client";

import { useActionState } from "react";
import { banAdminVoter, voidAdminVotes, type AdminActionState } from "@/app/admin/actions";
import type { AdminIntegrityReport, VoteIntegrityAccount, VoteIntegrityReport } from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialActionState: AdminActionState = { ok: true };

function date(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Data inválida";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(parsed.getUTCDate())}/${pad(parsed.getUTCMonth() + 1)}/${parsed.getUTCFullYear()} ${pad(parsed.getUTCHours())}:${pad(parsed.getUTCMinutes())}`;
}

function IntegrityAction({ account, action }: { account: VoteIntegrityAccount; action: "void" | "ban" }) {
  const [state, formAction, pending] = useActionState(action === "void" ? voidAdminVotes : banAdminVoter, initialActionState);
  return (
    <form action={formAction} className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={account.user_id} />
      <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
        <span>Motivo</span>
        <Textarea name="reason" required maxLength={500} rows={2} placeholder="O autor do projeto recebe este texto por e-mail" />
      </label>
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Aplicando..." : action === "void" ? "Anular votos" : "Banir conta"}
      </Button>
      {state.message ? <p role={state.ok ? "status" : "alert"} className={`basis-full text-sm ${state.ok ? "text-muted-foreground" : "text-destructive"}`}>{state.message}</p> : null}
    </form>
  );
}

function Histogram({ values }: { values: VoteIntegrityReport["hourly_votes"] }) {
  const max = Math.max(1, ...values.map((item) => item.votes));
  return (
    <details className="group">
      <summary className="cursor-pointer text-label-md">Histograma de votos por hora, últimos 30 dias</summary>
      <div className="mt-4 flex h-28 items-end gap-px overflow-x-auto rounded-lg bg-muted p-2" aria-label="Histograma de votos por hora">
        {values.map((item) => (
          <span key={item.hour} title={`${date(item.hour)}, ${item.votes} votos`} className="h-(--bar) min-w-1 flex-1 bg-foreground" style={{ "--bar": `${Math.max(item.votes > 0 ? 6 : 1, (item.votes / max) * 100)}%` } as React.CSSProperties} />
        ))}
      </div>
    </details>
  );
}

function IntegrityCard({ item }: { item: AdminIntegrityReport }) {
  const percentage = (item.report.suspicious_fraction * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return (
    <article className="flex flex-col gap-5 rounded-2xl bg-surface p-5 sm:p-7">
      <div>
        <p className="text-sm text-muted-foreground">{item.submission.status === "removed" ? "Viewer removido" : "Viewer publicado"}</p>
        <h3 className="mt-1 text-title-lg">{item.submission.name ?? "Viewer sem nome"}</h3>
      </div>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div><dt className="text-xs text-muted-foreground">Total de votos</dt><dd className="mt-1 text-title-md">{item.report.total_votes}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Contas novas, só neste viewer</dt><dd className="mt-1 text-title-md">{percentage}%</dd></div>
        <div><dt className="text-xs text-muted-foreground">Contas sinalizadas</dt><dd className="mt-1 text-title-md">{item.report.suspicious_accounts.length}</dd></div>
      </dl>
      <Histogram values={item.report.hourly_votes} />
      <details className="group">
        <summary className="cursor-pointer text-label-md">Contas sinalizadas ({item.report.suspicious_accounts.length})</summary>
        {item.report.suspicious_accounts.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhuma conta encontrada.</p> : (
          <ol className="mt-3 flex flex-col gap-4">
            {item.report.suspicious_accounts.map((account) => (
              <li key={account.user_id} className="flex flex-col gap-3 rounded-lg bg-muted p-4">
                <div className="text-sm">
                  <p className="font-medium">{account.email_hint ?? "Conta sem e-mail"}</p>
                  <p className="text-muted-foreground">Conta criada em {date(account.created_at)}, voto em {date(account.voted_at)}</p>
                </div>
                <div className="flex flex-col gap-3 lg:flex-row">
                  <IntegrityAction account={account} action="void" />
                  <IntegrityAction account={account} action="ban" />
                </div>
              </li>
            ))}
          </ol>
        )}
      </details>
    </article>
  );
}

export function AdminIntegrity({ reports }: { reports: AdminIntegrityReport[] }) {
  return (
    <section className="flex flex-col gap-5" aria-labelledby="integrity-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 id="integrity-heading" className="text-title-md">Integridade do voto</h2>
          <p className="mt-1 text-sm text-muted-foreground">Padrões suspeitos por viewer. Toda decisão exige um motivo e fica registrada.</p>
        </div>
        <p className="text-sm text-muted-foreground">{reports.length} viewers</p>
      </div>
      {reports.length === 0 ? <p className="rounded-lg bg-surface p-5 text-sm text-muted-foreground">Não há viewers publicados para analisar.</p> : <div className="flex flex-col gap-5">{reports.map((item) => <IntegrityCard key={item.submission.id} item={item} />)}</div>}
    </section>
  );
}
