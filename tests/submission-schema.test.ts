import { describe, expect, it } from "vitest";
import { submissionChanges, submissionFormData, submissionSchema } from "@/lib/submissions/schema";

const completeWebSubmission = {
  intent: "submit" as const,
  name: "Viewer Ágil",
  tagline: "Uma leitura rápida",
  description: "Descrição do viewer.",
  differential: "Funciona no navegador.",
  lang: "pt" as const,
  platforms: ["web" as const],
  workflow_parts: ["agent" as const],
  requires_install: false,
  repo_url: "https://example.test/repo",
  license: "MIT",
  base_tech: "scratch" as const,
  data_source: "Dados sintéticos",
  data_license: "CC0",
  external_api: false,
  demo_url: "https://example.test/demo",
  rules_accepted: true,
};

describe("submission-schema", () => {
  it("allows incomplete drafts but requires the name", () => {
    expect(submissionSchema.safeParse({ intent: "draft", name: "Draft", rules_accepted: false }).success).toBe(true);
    expect(submissionSchema.safeParse({ intent: "draft", name: "", rules_accepted: false }).success).toBe(false);
  });

  it("validates the complete web submission and conditional demo", () => {
    expect(submissionSchema.safeParse(completeWebSubmission).success).toBe(true);
    expect(submissionSchema.safeParse({ ...completeWebSubmission, demo_url: "http://example.test/demo" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...completeWebSubmission, demo_url: undefined }).success).toBe(false);
  });

  it("requires external API details and rules acceptance when sending", () => {
    expect(submissionSchema.safeParse({ ...completeWebSubmission, external_api: true }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...completeWebSubmission, rules_accepted: false }).success).toBe(false);
  });

  it("normalizes browser form controls for the same schema", () => {
    const form = new FormData();
    form.set("intent", "submit");
    form.set("name", "Viewer");
    form.set("lang", "pt");
    form.append("platforms", "web");
    form.append("workflow_parts", "agent");
    form.set("external_api", "on");
    form.set("external_api_detail", "Acesso a dados sintéticos");
    form.set("repo_url", "https://example.test/repo");
    form.set("demo_url", "https://example.test/demo");
    form.set("ai_tool_name_0", "Tool A");
    form.set("ai_tool_version_0", "1.0");
    form.append("features", "3d");
    form.append("modalities", "ct");
    form.set("rules_accepted", "on");

    const parsed = submissionSchema.safeParse(submissionFormData(form));
    expect(parsed.success).toBe(false);
    expect(submissionFormData(form).external_api).toBe(true);
    expect(submissionFormData(form).platforms).toEqual(["web"]);
    expect(submissionFormData(form).ai_tools).toEqual([{ name: "Tool A", version: "1.0" }]);
    expect(submissionFormData(form).features).toEqual(["3d"]);
    expect(submissionFormData(form).modalities).toEqual(["ct"]);
  });

  it("serializes empty optional fields as null so edits can clear stored values", () => {
    const values = submissionSchema.parse({ intent: "draft", name: "Viewer", rules_accepted: false });
    const changes = submissionChanges(values);

    expect(changes.tagline).toBeNull();
    expect(changes.repo_url).toBeNull();
    expect(changes.ai_tools).toBeNull();
    expect(changes.features).toBeNull();
    expect(changes.modalities).toBeNull();
    expect(changes.rules_accepted).toBe(false);
    expect(changes).not.toHaveProperty("rules_version");
    expect(changes).not.toHaveProperty("rules_accepted_at");
  });
});
