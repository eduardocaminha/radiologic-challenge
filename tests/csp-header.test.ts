import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("headers de segurança", () => {
  it("valem para todas as rotas", async () => {
    const rules = await nextConfig.headers!();
    const rule = rules.find(({ source }) => source === "/:path*");
    const headers = new Map(rule?.headers.map(({ key, value }) => [key, value]));
    const csp = headers.get("Content-Security-Policy") ?? "";

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
