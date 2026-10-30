"use server";

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const voteRequestSchema = z.object({
  submissionId: z.uuid(),
  intent: z.enum(["cast", "revoke"]),
});

export type VoteActionResult = { ok: true } | { ok: false; errorCode?: string };

export async function changeVote(input: unknown): Promise<VoteActionResult> {
  const parsed = voteRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createServerSupabaseClient();
  const result = parsed.data.intent === "cast"
    ? await supabase.rpc("cast_vote", { p_submission_id: parsed.data.submissionId })
    : await supabase.rpc("revoke_vote", { p_submission_id: parsed.data.submissionId });

  if (result.error) return { ok: false, errorCode: result.error.code };
  return { ok: true };
}
