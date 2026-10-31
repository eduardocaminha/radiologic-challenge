import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.fn();
vi.mock("@/lib/supabase/secret", () => ({
  createSecretSupabaseClient: () => ({ rpc }),
}));

import { GET } from "@/app/api/cron/digest/route";

function request() {
  return new Request("http://localhost/api/cron/digest", {
    headers: { authorization: "Bearer cron-secret" },
  });
}

const pendingDigest = {
  should_send: true,
  pending_key: "pending-key",
  submissions_count: 2,
  screenshots_count: 3,
  changes_count: 1,
  vote_alerts_count: 1,
};

describe("GET /api/cron/digest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    rpc.mockReset();
    process.env.CRON_SECRET = "cron-secret";
    process.env.RESEND_API_KEY = "resend-key";
    process.env.ADMIN_EMAIL = "admin@example.test";
    vi.stubGlobal("fetch", vi.fn());
  });

  it("exige o Bearer token do cron", async () => {
    const response = await GET(new Request("http://localhost/api/cron/digest"));

    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("consulta o banco e não envia quando não há pendências", async () => {
    rpc.mockResolvedValue({
      data: { ...pendingDigest, should_send: false },
      error: null,
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, sent: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("envia as contagens ao admin e registra o envio", async () => {
    rpc
      .mockResolvedValueOnce({ data: pendingDigest, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, sent: true });
    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("Submissões pending: 2"),
    }));
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0]?.[1]?.body as string);
    expect(body.to).toEqual(["admin@example.test"]);
    expect(body.text).toContain("Imagens pending: 3");
    expect(body.text).toContain("pico de votos de contas novas: 1");
    expect(body.html).toContain("/admin");
    expect(rpc).toHaveBeenNthCalledWith(2, "record_moderation_digest_send", expect.objectContaining({
      p_pending_key: "pending-key",
    }));
  });

  it("registra o pulo sem chave do Resend e não chama a API", async () => {
    delete process.env.RESEND_API_KEY;
    rpc.mockResolvedValue({ data: pendingDigest, error: null });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("responde 200 quando o Resend falha e não registra envio", async () => {
    rpc.mockResolvedValue({ data: pendingDigest, error: null });
    vi.mocked(fetch).mockResolvedValue(new Response("failed", { status: 500 }));

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, sent: false });
    expect(rpc).not.toHaveBeenCalledWith("record_moderation_digest_send", expect.anything());
  });

  it("não envia quando o banco já marcou a mesma fotografia do dia", async () => {
    rpc.mockResolvedValue({ data: { ...pendingDigest, should_send: false }, error: null });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("avisa o autor no idioma do projeto e limpa a fila", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "get_moderation_digest") return { data: { ...pendingDigest, should_send: false }, error: null };
      if (name === "pending_vote_void_notices") {
        return {
          data: [{ notice_ids: ["n1", "n2"], name: "Viewer", slug: "viewer", lang: "en", email: "autor@example.test", votes: 4, reasons: ["contas criadas em lote"] }],
          error: null,
        };
      }
      return { data: null, error: null };
    });
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    await GET(request());

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0]?.[1]?.body as string);
    expect(body.to).toEqual(["autor@example.test"]);
    expect(body.reply_to).toBe("caminha@radiologic.io");
    expect(body.subject).toBe("Votes voided on Viewer");
    expect(body.text).toContain("Voided votes: 4");
    expect(body.text).toContain("Reason: contas criadas em lote");
    expect(rpc).toHaveBeenCalledWith("clear_vote_void_notices", { p_notice_ids: ["n1", "n2"] });
  });

  it("mantém o aviso na fila quando o Resend falha", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "get_moderation_digest") return { data: { ...pendingDigest, should_send: false }, error: null };
      return {
        data: [{ notice_ids: ["n1"], name: "Viewer", slug: "viewer", lang: "pt", email: "autor@example.test", votes: 1, reasons: ["motivo"] }],
        error: null,
      };
    });
    vi.mocked(fetch).mockResolvedValue(new Response("erro", { status: 500 }));

    await GET(request());

    expect(rpc).not.toHaveBeenCalledWith("clear_vote_void_notices", expect.anything());
  });
});
