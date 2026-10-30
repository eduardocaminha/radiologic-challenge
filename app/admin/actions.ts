"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { locales } from "@/lib/i18n";
import { removeScreenshotObjects } from "@/lib/storage/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AdminActionState {
  ok: boolean;
  message?: string;
}

const moderationSchema = z.object({
  kind: z.enum(["submission", "screenshot"]),
  itemId: z.string().uuid(),
  action: z.enum(["approve", "reject", "remove", "restore"]),
  expectedStatus: z.enum(["pending", "approved", "rejected", "removed"]),
  reason: z.string().max(500).optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  expectedUpdatedAt: z.string().max(40).optional(),
});

const withdrawSchema = z.object({
  screenshotId: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).nullish(),
});

const recomputeSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  confirm: z.literal("confirmed"),
});

const voterIntegritySchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(1).max(500),
});

function revalidateLocales(path = "") {
  for (const locale of locales) revalidatePath(`/${locale}${path}`);
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function functionErrorMessage(code?: string) {
  switch (code) {
    case "SUB01":
      return "Entre na sua conta para continuar.";
    case "SUB20":
      return "Acesso negado. Esta área é restrita a administradores.";
    case "SUB22":
      return "Informe um motivo de rejeição com até 500 caracteres.";
    case "SUB24":
      return "A submissão precisa ter ao menos uma imagem aprovada.";
    case "SUB25":
      return "A submissão mudou durante a revisão. Atualize a fila e revise de novo.";
    case "SUB46":
      return "A ação para esta imagem não é válida.";
    case "SUB47":
      return "Esta imagem já foi moderada.";
    case "SUB23":
      return "Esta transição de status não é permitida.";
    case "SUB04":
      return "O item não foi encontrado. A fila pode ter sido atualizada em outra aba.";
    default:
      return "Não foi possível concluir a moderação. Atualize a fila e tente novamente.";
  }
}

function integrityErrorMessage(code?: string) {
  switch (code) {
    case "VOT01":
      return "Entre na sua conta para continuar.";
    case "VOT20":
      return "Acesso negado. Esta área é restrita a administradores.";
    case "VOT21":
      return "Informe um motivo com até 500 caracteres.";
    case "VOT08":
      return "A conta não foi encontrada.";
    default:
      return "Não foi possível concluir a ação de integridade. Atualize o relatório e tente novamente.";
  }
}

async function runVoterIntegrityAction(
  formData: FormData,
  action: "void" | "ban",
): Promise<AdminActionState> {
  const parsed = voterIntegritySchema.safeParse({
    userId: formValue(formData, "userId"),
    reason: formValue(formData, "reason"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Informe uma conta e um motivo com até 500 caracteres." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") {
    return { ok: false, message: "Entre na sua conta para continuar." };
  }

  const result = action === "void"
    ? await supabase.rpc("void_votes", { p_user_id: parsed.data.userId, p_reason: parsed.data.reason })
    : await supabase.rpc("ban_voter", { p_user_id: parsed.data.userId, p_reason: parsed.data.reason });
  if (result.error) {
    return { ok: false, message: integrityErrorMessage(result.error.code) };
  }

  revalidatePath("/admin");
  revalidateLocales();
  return { ok: true, message: action === "void" ? "Votos anulados. A galeria foi atualizada." : "Conta banida. A galeria foi atualizada." };
}

export async function voidAdminVotes(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  return runVoterIntegrityAction(formData, "void");
}

export async function banAdminVoter(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  return runVoterIntegrityAction(formData, "ban");
}

export async function moderateAdminItem(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = moderationSchema.safeParse({
    kind: formValue(formData, "kind"),
    itemId: formValue(formData, "itemId"),
    action: formValue(formData, "action"),
    expectedStatus: formValue(formData, "expectedStatus"),
    reason: formValue(formData, "reason") || undefined,
    slug: formValue(formData, "slug") || undefined,
    expectedUpdatedAt: formValue(formData, "expectedUpdatedAt") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: "Revise os dados da ação e tente novamente." };
  }

  if (parsed.data.kind === "screenshot" && !["approve", "reject"].includes(parsed.data.action)) {
    return { ok: false, message: "Ação inválida para uma imagem." };
  }
  if (parsed.data.kind === "submission" && parsed.data.action === "reject" && !parsed.data.reason?.trim()) {
    return { ok: false, message: "Informe um motivo de rejeição com até 500 caracteres." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") {
    return { ok: false, message: "Entre na sua conta para continuar." };
  }

  const result = parsed.data.kind === "submission"
    ? await supabase.rpc("moderate_submission", {
        p_submission_id: parsed.data.itemId,
        p_action: parsed.data.action,
        p_expected_status: parsed.data.expectedStatus,
        p_reason: parsed.data.reason?.trim() || null,
        p_expected_updated_at: parsed.data.expectedUpdatedAt ?? null,
      })
    : await supabase.rpc("moderate_screenshot", {
        p_screenshot_id: parsed.data.itemId,
        p_action: parsed.data.action,
      });

  if (result.error) {
    return { ok: false, message: functionErrorMessage(result.error.code) };
  }

  revalidatePath("/admin");
  revalidateLocales();
  if (parsed.data.slug) revalidateLocales(`/v/${parsed.data.slug}`);

  return { ok: true, message: "Ação aplicada. A fila foi atualizada." };
}

export async function withdrawAdminScreenshot(input: unknown): Promise<AdminActionState> {
  const parsed = withdrawSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revise os dados da ação e tente novamente." };

  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") {
    return { ok: false, message: "Entre na sua conta para continuar." };
  }

  const result = await supabase.rpc("withdraw_screenshot", { p_screenshot_id: parsed.data.screenshotId });
  if (result.error || typeof result.data !== "string") {
    return { ok: false, message: functionErrorMessage(result.error?.code) };
  }

  const removed = await removeScreenshotObjects([result.data]);

  revalidatePath("/admin");
  revalidateLocales();
  if (parsed.data.slug) revalidateLocales(`/v/${parsed.data.slug}`);

  if (removed) return { ok: false, message: "A imagem saiu do site, mas o arquivo não foi apagado. Tente de novo." };
  return { ok: true, message: "Imagem retirada e arquivo apagado." };
}

export async function recomputeMonthlyHighlights(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = recomputeSchema.safeParse({
    month: formValue(formData, "month"),
    confirm: formValue(formData, "confirm"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Informe um mês encerrado e confirme o recálculo." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") {
    return { ok: false, message: "Entre na sua conta para continuar." };
  }

  const month = `${parsed.data.month}-01`;
  const result = await supabase.rpc("recompute_month", { p_month: month });
  if (result.error) {
    switch (result.error.code) {
      case "SUB20":
        return { ok: false, message: "Acesso negado. Esta área é restrita a administradores." };
      case "VOT06":
        return { ok: false, message: "Informe o primeiro dia de um mês válido." };
      case "VOT07":
        return { ok: false, message: "O mês corrente ainda não está encerrado." };
      default:
        return { ok: false, message: "Não foi possível recalcular os destaques. Tente novamente." };
    }
  }

  revalidatePath("/admin");
  revalidateLocales();
  revalidateLocales("/highlights");
  return { ok: true, message: `Destaques de ${parsed.data.month} recalculados.` };
}
