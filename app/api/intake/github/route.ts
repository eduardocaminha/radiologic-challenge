import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { parseGithubIssueBody } from "@/lib/intake/github";
import { createSecretSupabaseClient } from "@/lib/supabase/secret";
import { z } from "zod";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  issue_number: z.number().int().positive(),
  github_user_id: z.union([z.string(), z.number()]).transform(String).pipe(z.string().min(1).max(100)),
  body: z.string().max(20_000),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validSignature(body: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const supplied = signature.startsWith("sha256=") ? signature.slice("sha256=".length) : signature;
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
}

function validTimestamp(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return false;
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && Math.abs(Date.now() / 1000 - timestamp) <= 5 * 60;
}

export async function POST(request: Request) {
  const secret = process.env.GITHUB_INTAKE_SECRET;
  const signature = request.headers.get("x-hub-signature-256")
    ?? request.headers.get("x-github-signature-256")
    ?? request.headers.get("x-intake-signature");
  const timestamp = request.headers.get("x-github-event-timestamp")
    ?? request.headers.get("x-intake-timestamp");
  const body = await request.text();

  if (!secret || !validTimestamp(timestamp) || !validSignature(body, signature, secret)) return unauthorized();

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const payload = payloadSchema.safeParse(rawPayload);
  if (!payload.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const parsed = parseGithubIssueBody(payload.data.body);
  if (!parsed.success) return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 422 });

  const result = await createSecretSupabaseClient().rpc("intake_github_issue", {
    p_issue_number: payload.data.issue_number,
    p_github_user_id: payload.data.github_user_id,
    p_fields: parsed.fields,
  });
  if (result.error || typeof result.data !== "string") {
    return NextResponse.json({ error: "Intake failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, submission_id: result.data });
}
