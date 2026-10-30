"use client";

import { useActionState } from "react";
import { recomputeMonthlyHighlights, type AdminActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const initialActionState: AdminActionState = { ok: true };

export function AdminHighlights() {
  const [state, formAction, pending] = useActionState(recomputeMonthlyHighlights, initialActionState);

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-surface p-5 sm:p-7" aria-labelledby="recompute-highlights-heading">
      <div className="flex flex-col gap-2">
        <h2 id="recompute-highlights-heading" className="text-title-md">Recalcular destaques mensais</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">Recalcule o snapshot de um mês encerrado depois de uma correção de integridade. O recálculo substitui as linhas daquele mês e registra um evento.</p>
      </div>
      <form action={formAction} className="flex flex-col gap-4 sm:max-w-xl">
        <label className="flex flex-col gap-1 text-sm">
          <span>Mês encerrado</span>
          <Input nativeInput type="month" name="month" required className="w-fit" />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox name="confirm" value="confirmed" required className="mt-0.5" />
          <span>Confirmo que quero substituir o snapshot deste mês.</span>
        </label>
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Recalculando..." : "Recalcular snapshot"}
        </Button>
        {state.message ? <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-muted-foreground" : "text-destructive"}`}>{state.message}</p> : null}
      </form>
    </section>
  );
}
