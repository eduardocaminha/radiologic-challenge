"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale, type Locale } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSecretSupabaseClient } from "@/lib/supabase/secret";
import {
  createScreenshotSignedUrls,
  removeScreenshotObjects,
} from "@/lib/storage/server";
import { type SubmissionActionState } from "@/lib/submissions/action-state";
import {
  submissionChanges,
  submissionFormData,
  submissionSchema,
  type SubmissionFormValues,
} from "@/lib/submissions/schema";

const submissionIdSchema = z.uuid();
const idempotencyKeySchema = z.uuid();
const screenshotInputSchema = z.object({
  locale: z.string().refine(isLocale),
  submissionId: z.uuid(),
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$/),
  position: z.number().int().min(1).max(5),
});
const screenshotIdInputSchema = z.object({
  locale: z.string().refine(isLocale),
  screenshotId: z.uuid(),
});
const screenshotOrderInputSchema = z.object({
  locale: z.string().refine(isLocale),
  submissionId: z.uuid(),
  screenshotIds: z.array(z.uuid()).max(5),
});

function validationErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors;
}

function rpcError(error: { code?: string; message?: string }, submissionId?: string): SubmissionActionState {
  return { ok: false, submissionId, errorCode: error.code, formError: error.message };
}

async function saveValues(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  values: SubmissionFormValues,
  submissionId: string | undefined,
  idempotencyKey: string,
) {
  let id = submissionId;
  if (!id) {
    const created = await supabase.rpc("create_submission", { p_name: values.name, p_idempotency_key: idempotencyKey });
    if (created.error || !created.data) return { error: created.error ?? { message: "Creation failed" } };
    id = created.data as string;
  }

  const updated = await supabase.rpc("update_submission", {
    p_submission_id: id,
    p_changes: submissionChanges(values),
  });
  if (updated.error) return { id, error: updated.error };
  return { id };
}

function successState(): SubmissionActionState {
  return { ok: true, actionId: randomUUID() };
}

function parseIdempotencyKey(formData: FormData) {
  return idempotencyKeySchema.safeParse(formData.get("idempotency_key"));
}

function parseLocale(formData: FormData): Locale | null {
  const value = formData.get("locale");
  return typeof value === "string" && isLocale(value) ? value : null;
}

export async function saveSubmission(
  _previousState: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  const input = { ...submissionFormData(formData), intent: "draft" as const };
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: validationErrors(parsed.error) };
  }

  const rawId = formData.get("submission_id");
  const submissionId = typeof rawId === "string" && rawId.length > 0 ? submissionIdSchema.safeParse(rawId) : undefined;
  if (submissionId && !submissionId.success) return { ok: false, formError: "Invalid submission" };
  const idempotencyKey = parseIdempotencyKey(formData);
  if (!idempotencyKey.success) return { ok: false, formError: "Invalid submission request" };
  const locale = parseLocale(formData);
  if (!locale) return { ok: false, formError: "Invalid locale" };

  const supabase = await createServerSupabaseClient();
  const saved = await saveValues(supabase, parsed.data, submissionId?.data, idempotencyKey.data);
  if (saved.error) return rpcError(saved.error, saved.id);

  revalidatePath(`/${locale}/me`);
  redirect(`/${locale}/me`);
}

export async function sendSubmission(
  _previousState: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  const input = { ...submissionFormData(formData), intent: formData.get("intent") };
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: validationErrors(parsed.error) };
  }

  const rawId = formData.get("submission_id");
  const submissionId = typeof rawId === "string" && rawId.length > 0 ? submissionIdSchema.safeParse(rawId) : undefined;
  if (submissionId && !submissionId.success) return { ok: false, formError: "Invalid submission" };
  const idempotencyKey = parseIdempotencyKey(formData);
  if (!idempotencyKey.success) return { ok: false, formError: "Invalid submission request" };
  const locale = parseLocale(formData);
  if (!locale) return { ok: false, formError: "Invalid locale" };

  const supabase = await createServerSupabaseClient();
  const saved = await saveValues(supabase, parsed.data, submissionId?.data, idempotencyKey.data);
  if (saved.error || !saved.id) return rpcError(saved.error ?? { message: "Creation failed" }, saved.id);

  const submitted = await supabase.rpc(parsed.data.intent === "resubmit" ? "resubmit_submission" : "submit_submission", {
    p_submission_id: saved.id,
  });
  if (submitted.error) return rpcError(submitted.error, saved.id);

  revalidatePath(`/${locale}/me`);
  redirect(`/${locale}/me`);
}

export async function deleteSubmission(_previousState: SubmissionActionState, formData: FormData): Promise<SubmissionActionState> {
  const rawId = formData.get("submission_id");
  const parsedId = submissionIdSchema.safeParse(rawId);
  if (!parsedId.success) return { ok: false, formError: "Invalid submission" };
  const locale = parseLocale(formData);
  if (!locale) return { ok: false, formError: "Invalid locale" };

  const supabase = await createServerSupabaseClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims?.claims) return { ok: false, errorCode: "SUB01" };
  const ownerId = claims.claims.sub;
  if (typeof ownerId !== "string") return { ok: false, errorCode: "SUB01" };
  const screenshots = await supabase.rpc("my_screenshots", { p_submission_id: parsedId.data });
  if (screenshots.error) return rpcError(screenshots.error);
  const screenshotRows = (screenshots.data ?? []) as Array<{ path?: unknown }>;
  const paths = screenshotRows.map((screenshot) => screenshot.path).filter((path): path is string => typeof path === "string");
  const deleted = await createSecretSupabaseClient().rpc("delete_submission_for_owner", { p_submission_id: parsedId.data, p_owner_id: ownerId });
  if (deleted.error) return rpcError(deleted.error);
  await removeOrphanObjects(paths);

  revalidatePath(`/${locale}/me`);
  return successState();
}

export async function transitionSubmission(_previousState: SubmissionActionState, formData: FormData): Promise<SubmissionActionState> {
  const rawId = formData.get("submission_id");
  const parsedId = submissionIdSchema.safeParse(rawId);
  const intent = formData.get("intent");
  if (!parsedId.success || (intent !== "submit" && intent !== "resubmit")) {
    return { ok: false, formError: "Invalid submission" };
  }
  const locale = parseLocale(formData);
  if (!locale) return { ok: false, formError: "Invalid locale" };

  const supabase = await createServerSupabaseClient();
  const transitioned = await supabase.rpc(intent === "resubmit" ? "resubmit_submission" : "submit_submission", {
    p_submission_id: parsedId.data,
  });
  if (transitioned.error) return rpcError(transitioned.error);

  revalidatePath(`/${locale}/me`);
  return successState();
}

interface RegisteredScreenshot {
  id: string;
  submission_id: string;
  path: string;
  url: string;
  status: "pending" | "approved" | "rejected";
  position: number;
  created_at: string;
}

export type ScreenshotActionState = { ok: true; screenshot?: RegisteredScreenshot } | { ok: false; errorCode?: string; formError?: string };

async function removeScreenshotObject(path: string) {
  return removeScreenshotObjects([path]);
}

// O registro sai antes do arquivo: se a exclusão falhar, nenhum registro aponta para um arquivo que sumiu.
async function removeOrphanObjects(paths: string[]) {
  const removed = await removeScreenshotObjects(paths);
  if (removed) console.error("Falha ao apagar arquivos de imagem", paths, removed);
}

export async function registerScreenshot(input: unknown): Promise<ScreenshotActionState> {
  const parsed = screenshotInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "Invalid screenshot" };

  const supabase = await createServerSupabaseClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims?.claims) return { ok: false, errorCode: "SUB01" };
  const ownerId = claims.claims.sub;
  if (typeof ownerId !== "string") return { ok: false, errorCode: "SUB01" };
  if (!parsed.data.path.startsWith(`${ownerId}/${parsed.data.submissionId}/`)) {
    return { ok: false, formError: "Invalid screenshot" };
  }
  const registered = await supabase.rpc("register_screenshot", {
    p_submission_id: parsed.data.submissionId,
    p_path: parsed.data.path,
    p_position: parsed.data.position,
  });
  if (registered.error) {
    await removeScreenshotObject(parsed.data.path);
    return rpcError(registered.error) as ScreenshotActionState;
  }

  const screenshotData = Array.isArray(registered.data) ? registered.data[0] : registered.data;
  const signedUrls = await createScreenshotSignedUrls([parsed.data.path]);
  revalidatePath(`/${parsed.data.locale}/submit`);
  return { ok: true, screenshot: { ...(screenshotData as RegisteredScreenshot), url: signedUrls.get(parsed.data.path) ?? parsed.data.path } };
}

export async function deleteScreenshot(input: unknown): Promise<ScreenshotActionState> {
  const parsed = screenshotIdInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "Invalid screenshot" };

  const supabase = await createServerSupabaseClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims?.claims) return { ok: false, errorCode: "SUB01" };
  const ownerId = claims.claims.sub;
  if (typeof ownerId !== "string") return { ok: false, errorCode: "SUB01" };
  const current = await supabase.rpc("my_screenshot", { p_screenshot_id: parsed.data.screenshotId });
  const path = current.data?.[0]?.path;
  if (current.error || typeof path !== "string") return rpcError(current.error ?? { code: "SUB04" }) as ScreenshotActionState;
  const deleted = await createSecretSupabaseClient().rpc("delete_screenshot_for_owner", { p_screenshot_id: parsed.data.screenshotId, p_owner_id: ownerId });
  if (deleted.error) return rpcError(deleted.error) as ScreenshotActionState;
  await removeOrphanObjects([path]);

  revalidatePath(`/${parsed.data.locale}/submit`);
  return { ok: true };
}

export async function reorderScreenshots(input: unknown): Promise<ScreenshotActionState> {
  const parsed = screenshotOrderInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "Invalid screenshot order" };

  const supabase = await createServerSupabaseClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims?.claims) return { ok: false, errorCode: "SUB01" };
  const reordered = await supabase.rpc("reorder_screenshots", {
    p_submission_id: parsed.data.submissionId,
    p_screenshot_ids: parsed.data.screenshotIds,
  });
  if (reordered.error) return rpcError(reordered.error) as ScreenshotActionState;

  revalidatePath(`/${parsed.data.locale}/submit`);
  return { ok: true };
}
