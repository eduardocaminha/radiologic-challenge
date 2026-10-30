import { z } from "zod";
import { WORKFLOW_PARTS } from "@/lib/submissions/constants";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .url()
    .refine((value) => value.startsWith("https://"), "URL must use https")
    .max(300)
    .optional(),
);

const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const REQUIRED_ON_SEND = [
  "workflow_parts",
  "tagline",
  "description",
  "differential",
  "lang",
  "platforms",
  "requires_install",
  "repo_url",
  "license",
  "base_tech",
  "data_source",
  "data_license",
  "external_api",
] as const;

const fields = {
  name: requiredText(60),
  tagline: optionalText(120),
  description: optionalText(2000),
  differential: optionalText(280),
  lang: z.enum(["pt", "en", "es"]).optional(),
  platforms: z.array(z.enum(["web", "desktop", "mobile", "xr"])).optional(),
  requires_install: z.boolean().optional(),
  repo_url: optionalUrl,
  license: optionalText(120),
  base_tech: z
    .enum(["scratch", "ohif", "cornerstone3d", "vtkjs", "dwv", "niivue", "volview", "other"])
    .optional(),
  data_source: optionalText(200),
  data_license: optionalText(60),
  external_api: z.boolean().optional(),
  external_api_detail: optionalText(280),
  demo_url: optionalUrl,
  download_url: optionalUrl,
  video_url: optionalUrl,
  ai_tools: z
    .array(z.object({ name: requiredText(80), version: optionalText(40) }))
    .max(10)
    .optional(),
  ai_code_share: z.enum(["none", "lt25", "25to75", "gt75", "all"]).optional(),
  prompts_url: optionalUrl,
  time_spent: z.enum(["lt1d", "1to7d", "1to4w", "gt1m"]).optional(),
  cost: z.enum(["lt10", "10to100", "100to1000", "gt1000"]).optional(),
  workflow_parts: z.array(z.enum(WORKFLOW_PARTS)).optional(),
  features: z
    .array(
      z.enum([
        "2d",
        "3d",
        "mpr",
        "measurements",
        "annotations",
        "segmentation",
        "fusion",
        "cine",
        "hanging_protocols",
        "ai",
        "export",
        "comparison",
        "windowing",
        "collaboration",
        "other",
      ]),
    )
    .max(20)
    .optional(),
  modalities: z
    .array(z.enum(["ct", "mr", "us", "xr", "nm", "pt", "mg", "cr", "dx", "rf", "xa", "sc", "ot", "other"]))
    .max(20)
    .optional(),
  dicomweb: z.boolean().optional(),
  stack: optionalText(200),
  author_name: optionalText(80),
  author_profile: z
    .enum(["radiologist", "resident", "physician", "developer", "student", "physicist", "team"])
    .optional(),
  country: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().regex(/^[A-Z]{2}$/).optional(),
  ),
  limitations: optionalText(500),
  rules_accepted: z.boolean(),
};

export const submissionSchema = z
  .object({
    intent: z.enum(["draft", "submit", "resubmit"]),
    ...fields,
  })
  .superRefine((submission, context) => {

    if (submission.intent !== "draft") {
      for (const field of REQUIRED_ON_SEND) {
        if (submission[field] === undefined || ((field === "platforms" || field === "workflow_parts") && submission[field]?.length === 0)) {
          context.addIssue({ code: "custom", path: [field], message: "Required" });
        }
      }
      if (!submission.rules_accepted) {
        context.addIssue({ code: "custom", path: ["rules_accepted"], message: "Required" });
      }
      if (submission.external_api && submission.external_api_detail === undefined) {
        context.addIssue({ code: "custom", path: ["external_api_detail"], message: "Required" });
      }
      if (submission.platforms?.includes("web") && submission.demo_url === undefined) {
        context.addIssue({ code: "custom", path: ["demo_url"], message: "Required" });
      }
      if (
        submission.platforms &&
        !submission.platforms.includes("web") &&
        (submission.download_url === undefined || submission.video_url === undefined)
      ) {
        if (submission.download_url === undefined) {
          context.addIssue({ code: "custom", path: ["download_url"], message: "Required" });
        }
        if (submission.video_url === undefined) {
          context.addIssue({ code: "custom", path: ["video_url"], message: "Required" });
        }
      }
    }
  });

const githubRequiredFields = [
  "tagline",
  "lang",
  "workflow_parts",
  "platforms",
  "requires_install",
  "repo_url",
  "license",
  "base_tech",
  "data_source",
  "data_license",
  "external_api",
] as const;

export const githubSubmissionSchema = submissionSchema.superRefine((submission, context) => {
  for (const field of githubRequiredFields) {
    const value = submission[field];
    if (
      value === undefined
      || ((field === "platforms" || field === "workflow_parts") && (!Array.isArray(value) || value.length === 0))
    ) {
      context.addIssue({ code: "custom", path: [field], message: "Required" });
    }
  }
});

export type SubmissionFormValues = z.infer<typeof submissionSchema>;

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function formAiTools(formData: FormData) {
  return Array.from({ length: 10 }, (_, index) => ({
    name: formString(formData, `ai_tool_name_${index}`),
    version: formString(formData, `ai_tool_version_${index}`),
  })).filter((tool) => tool.name.trim() !== "");
}

export function submissionFormData(formData: FormData): SubmissionFormValues {
  return {
    intent: formString(formData, "intent") as SubmissionFormValues["intent"],
    name: formString(formData, "name"),
    tagline: formString(formData, "tagline"),
    description: formString(formData, "description"),
    differential: formString(formData, "differential"),
    lang: (formString(formData, "lang") || undefined) as SubmissionFormValues["lang"],
    platforms: formData.getAll("platforms").filter((value): value is string => typeof value === "string") as SubmissionFormValues["platforms"],
    requires_install: formBoolean(formData, "requires_install"),
    repo_url: formString(formData, "repo_url"),
    license: formString(formData, "license"),
    base_tech: (formString(formData, "base_tech") || undefined) as SubmissionFormValues["base_tech"],
    data_source: formString(formData, "data_source"),
    data_license: formString(formData, "data_license"),
    external_api: formBoolean(formData, "external_api"),
    external_api_detail: formString(formData, "external_api_detail"),
    demo_url: formString(formData, "demo_url"),
    download_url: formString(formData, "download_url"),
    video_url: formString(formData, "video_url"),
    ai_tools: formAiTools(formData),
    ai_code_share: (formString(formData, "ai_code_share") || undefined) as SubmissionFormValues["ai_code_share"],
    prompts_url: formString(formData, "prompts_url"),
    time_spent: (formString(formData, "time_spent") || undefined) as SubmissionFormValues["time_spent"],
    cost: (formString(formData, "cost") || undefined) as SubmissionFormValues["cost"],
    workflow_parts: formData.getAll("workflow_parts").filter((value): value is string => typeof value === "string") as SubmissionFormValues["workflow_parts"],
    features: formData.getAll("features").filter((value): value is string => typeof value === "string") as SubmissionFormValues["features"],
    modalities: formData.getAll("modalities").filter((value): value is string => typeof value === "string") as SubmissionFormValues["modalities"],
    dicomweb: formBoolean(formData, "dicomweb"),
    stack: formString(formData, "stack"),
    author_name: formString(formData, "author_name"),
    author_profile: (formString(formData, "author_profile") || undefined) as SubmissionFormValues["author_profile"],
    country: formString(formData, "country"),
    limitations: formString(formData, "limitations"),
    rules_accepted: formBoolean(formData, "rules_accepted"),
  };
}

export function submissionChanges(values: SubmissionFormValues) {
  return {
    name: values.name,
    tagline: values.tagline ?? null,
    description: values.description ?? null,
    differential: values.differential ?? null,
    lang: values.lang ?? null,
    platforms: values.platforms ?? null,
    requires_install: values.requires_install ?? null,
    repo_url: values.repo_url ?? null,
    license: values.license ?? null,
    base_tech: values.base_tech ?? null,
    data_source: values.data_source ?? null,
    data_license: values.data_license ?? null,
    external_api: values.external_api ?? null,
    external_api_detail: values.external_api_detail ?? null,
    demo_url: values.demo_url ?? null,
    download_url: values.download_url ?? null,
    video_url: values.video_url ?? null,
    ai_tools: values.ai_tools ?? null,
    ai_code_share: values.ai_code_share ?? null,
    prompts_url: values.prompts_url ?? null,
    time_spent: values.time_spent ?? null,
    cost: values.cost ?? null,
    features: values.features ?? null,
    workflow_parts: values.workflow_parts ?? null,
    modalities: values.modalities ?? null,
    dicomweb: values.dicomweb ?? null,
    stack: values.stack ?? null,
    author_name: values.author_name ?? null,
    author_profile: values.author_profile ?? null,
    country: values.country ?? null,
    limitations: values.limitations ?? null,
    rules_accepted: values.rules_accepted === true,
  };
}
