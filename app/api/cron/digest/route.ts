import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSecretSupabaseClient } from "@/lib/supabase/secret";
import { voteVoidEmail } from "@/lib/viewers/void-notice";

export const dynamic = "force-dynamic";

const digestSchema = z.object({
  should_send: z.boolean(),
  pending_key: z.string().min(1),
  submissions_count: z.number().int().nonnegative(),
  screenshots_count: z.number().int().nonnegative(),
  changes_count: z.number().int().nonnegative(),
  vote_alerts_count: z.number().int().nonnegative(),
});

const voidNoticesSchema = z.array(z.object({
  notice_ids: z.array(z.string()),
  name: z.string().nullable(),
  slug: z.string().nullable(),
  lang: z.string().nullable(),
  email: z.string().nullable(),
  votes: z.number().int().positive(),
  reasons: z.array(z.string()),
}));

const digestDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function todayInSaoPaulo() {
  return digestDateFormatter.format(new Date());
}

function hasValidAuthorization(request: Request, secret: string | undefined) {
  const authorization = request.headers.get("authorization");
  const expected = `Bearer ${secret ?? ""}`;
  if (!secret || !authorization) return false;

  const authorizationBytes = Buffer.from(authorization);
  const expectedBytes = Buffer.from(expected);
  if (authorizationBytes.length !== expectedBytes.length) return false;

  return timingSafeEqual(authorizationBytes, expectedBytes);
}

function responseBody(count: number, screenshots: number, changes: number, voteAlerts: number) {
  const adminUrl = "https://challenge.radiologic.io/admin";
  return {
    text: [
      "Há pendências de moderação no Radiologic Workstation.",
      "",
      `Submissões pending: ${count}`,
      `Imagens pending: ${screenshots}`,
      `Projetos aprovados alterados: ${changes}`,
      `Projetos com pico de votos de contas novas: ${voteAlerts}`,
      "",
      `Acesse ${adminUrl}`,
    ].join("\n"),
    html: [
      "<p>Há pendências de moderação no Radiologic Workstation.</p>",
      `<p>Submissões pending: ${count}<br />Imagens pending: ${screenshots}<br />Projetos aprovados alterados: ${changes}<br />Projetos com pico de votos de contas novas: ${voteAlerts}</p>`,
      `<p><a href="${adminUrl}">Abrir a fila de moderação</a></p>`,
    ].join(""),
  };
}

// Aviso ao autor sobre votos anulados. O que falhar fica na fila para o próximo cron.
async function sendVoteVoidNotices(client: ReturnType<typeof createSecretSupabaseClient>) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;

  try {
    const result = await client.rpc("pending_vote_void_notices");
    if (result.error) {
      console.error("[cron digest] consulta dos avisos falhou", result.error.message);
      return;
    }
    const notices = voidNoticesSchema.parse(result.data);

    for (const notice of notices) {
      if (notice.email && notice.name && notice.slug) {
        const email = voteVoidEmail({ ...notice, name: notice.name, slug: notice.slug });
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Radiologic Workstation <noreply@radiologic.io>",
            to: [notice.email],
            reply_to: "caminha@radiologic.io",
            subject: email.subject,
            text: email.text,
          }),
        });
        if (!response.ok) {
          console.error("[cron digest] Resend falhou no aviso ao autor", response.status);
          continue;
        }
      }

      const cleared = await client.rpc("clear_vote_void_notices", { p_notice_ids: notice.notice_ids });
      if (cleared.error) console.error("[cron digest] limpeza do aviso falhou", cleared.error.message);
    }
  } catch (error) {
    console.error("[cron digest] erro nos avisos ao autor", error);
  }
}

export async function GET(request: Request) {
  if (!hasValidAuthorization(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createSecretSupabaseClient();
  const response = await sendModerationDigest(client);
  await sendVoteVoidNotices(client);
  return response;
}

async function sendModerationDigest(client: ReturnType<typeof createSecretSupabaseClient>) {
  const digestDate = todayInSaoPaulo();
  const digestResult = await client.rpc("get_moderation_digest", {
    p_digest_date: digestDate,
  });

  if (digestResult.error) {
    console.error("[cron digest] consulta das pendências falhou", digestResult.error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const digest = digestSchema.safeParse(digestResult.data);
  if (!digest.success) {
    console.error("[cron digest] resposta inválida do banco", digest.error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (!digest.data.should_send) {
    return NextResponse.json({ ok: true, sent: false });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!resendApiKey || !adminEmail) {
    console.info("[cron digest] envio pulado: RESEND_API_KEY ou ADMIN_EMAIL ausente");
    return NextResponse.json({ ok: true, sent: false });
  }

  const email = responseBody(digest.data.submissions_count, digest.data.screenshots_count, digest.data.changes_count, digest.data.vote_alerts_count);
  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Radiologic Workstation <noreply@radiologic.io>",
        to: [adminEmail],
        subject: "Pendências de moderação no Radiologic Workstation",
        text: email.text,
        html: email.html,
      }),
    });

    if (!resendResponse.ok) {
      console.error("[cron digest] Resend falhou", resendResponse.status, await resendResponse.text());
      return NextResponse.json({ ok: true, sent: false });
    }
  } catch (error) {
    console.error("[cron digest] erro ao chamar o Resend", error);
    return NextResponse.json({ ok: true, sent: false });
  }

  const recordResult = await client.rpc("record_moderation_digest_send", {
    p_digest_date: digestDate,
    p_pending_key: digest.data.pending_key,
    p_submissions_count: digest.data.submissions_count,
    p_screenshots_count: digest.data.screenshots_count,
  });
  if (recordResult.error) {
    console.error("[cron digest] registro do envio falhou", recordResult.error.message);
    return NextResponse.json({ ok: true, sent: true });
  }

  return NextResponse.json({ ok: true, sent: true });
}
