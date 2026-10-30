import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("Content-Security-Policy", () => {
  it("envia frame-ancestors 'none' em todas as rotas", async () => {
    const rules = await nextConfig.headers!();

    expect(rules).toContainEqual({
      source: "/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: "frame-ancestors 'none'",
        },
      ],
    });
  });
});
