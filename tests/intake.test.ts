import { beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
import { POST } from "@/app/api/intake/github/route";

describe("POST /api/intake/github", () => {
  beforeEach(() => {
    delete process.env.GITHUB_INTAKE_SECRET;
  });

  it("rejeita requisições sem autenticação sem revelar o motivo", async () => {
    const response = await POST(new Request("http://localhost/api/intake/github", {
      method: "POST",
      body: JSON.stringify({ issue_number: 1, github_user_id: "123", body: "" }),
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("responde 422 com erros localizados para um corpo inválido", async () => {
    process.env.GITHUB_INTAKE_SECRET = "test-secret";
    const body = JSON.stringify({ issue_number: 1, github_user_id: "123", body: "### Nome do viewer\n" });
    const signature = createHmac("sha256", process.env.GITHUB_INTAKE_SECRET).update(body).digest("hex");
    const response = await POST(new Request("http://localhost/api/intake/github", {
      method: "POST",
      headers: {
        "x-github-event-timestamp": String(Math.floor(Date.now() / 1000)),
        "x-hub-signature-256": `sha256=${signature}`,
      },
      body,
    }));

    expect(response.status).toBe(422);
    const result = await response.json();
    expect(result.errors.pt).toEqual(expect.arrayContaining([expect.stringContaining("Frase de apresentação")]));
    expect(result.errors.en).toEqual(expect.arrayContaining([expect.stringContaining("Tagline")]));
  });
});
