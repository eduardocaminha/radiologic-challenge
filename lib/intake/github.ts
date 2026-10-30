import { githubSubmissionSchema, type SubmissionFormValues } from "@/lib/submissions/schema";

type IntakeField = Exclude<keyof SubmissionFormValues, "intent">;

export interface GithubIntakeErrors {
  pt: string[];
  en: string[];
}

export interface GithubIssueFields {
  name?: string;
  tagline?: string;
  differential?: string;
  lang?: "pt" | "en" | "es";
  platforms?: Array<"web" | "desktop" | "mobile" | "xr">;
  workflow_parts?: SubmissionFormValues["workflow_parts"];
  requires_install?: boolean;
  repo_url?: string;
  license?: string;
  base_tech?: SubmissionFormValues["base_tech"];
  data_source?: string;
  data_license?: string;
  external_api?: boolean;
  external_api_detail?: string;
  demo_url?: string;
  download_url?: string;
  video_url?: string;
  author_name?: string;
  author_profile?: SubmissionFormValues["author_profile"];
  country?: string;
  dicomweb?: boolean;
  description?: string;
  limitations?: string;
  stack?: string;
  features?: SubmissionFormValues["features"];
  modalities?: SubmissionFormValues["modalities"];
  ai_tools?: SubmissionFormValues["ai_tools"];
  ai_code_share?: SubmissionFormValues["ai_code_share"];
  prompts_url?: string;
  time_spent?: SubmissionFormValues["time_spent"];
  cost?: SubmissionFormValues["cost"];
}

const fieldLabels: Record<IntakeField, { pt: string; en: string }> = {
  name: { pt: "Nome da workstation", en: "Workstation name" },
  tagline: { pt: "Frase de apresentação", en: "Tagline" },
  description: { pt: "Descrição", en: "Description" },
  differential: { pt: "Diferencial", en: "Differentiator" },
  lang: { pt: "Idioma do projeto", en: "Project language" },
  platforms: { pt: "Plataformas", en: "Platforms" },
  workflow_parts: { pt: "Partes da workstation", en: "Workstation parts" },
  requires_install: { pt: "Exige instalação", en: "Requires installation" },
  repo_url: { pt: "Repositório público", en: "Public repository" },
  license: { pt: "Licença SPDX", en: "SPDX license" },
  base_tech: { pt: "Tecnologia base", en: "Base technology" },
  data_source: { pt: "Fonte dos dados", en: "Data source" },
  data_license: { pt: "Licença dos dados", en: "Data license" },
  external_api: { pt: "Usa API externa", en: "Uses an external API" },
  external_api_detail: { pt: "Detalhes da API externa", en: "External API details" },
  demo_url: { pt: "URL da demonstração", en: "Demo URL" },
  download_url: { pt: "URL do download", en: "Download URL" },
  video_url: { pt: "URL do vídeo", en: "Video URL" },
  ai_tools: { pt: "Ferramentas de IA", en: "AI tools" },
  ai_code_share: { pt: "Participação de código de IA", en: "AI code share" },
  prompts_url: { pt: "URL dos prompts", en: "Prompts URL" },
  time_spent: { pt: "Tempo investido", en: "Time spent" },
  cost: { pt: "Custo", en: "Cost" },
  features: { pt: "Recursos", en: "Features" },
  modalities: { pt: "Modalidades", en: "Modalities" },
  dicomweb: { pt: "Usa DICOMweb", en: "Uses DICOMweb" },
  stack: { pt: "Stack", en: "Stack" },
  author_name: { pt: "Nome do autor", en: "Author name" },
  author_profile: { pt: "Perfil do autor", en: "Author profile" },
  country: { pt: "País", en: "Country" },
  limitations: { pt: "Limitações", en: "Limitations" },
  rules_accepted: { pt: "Aceite do regulamento", en: "Rules acceptance" },
};

const aliases: Record<string, IntakeField> = {
  "nome do viewer": "name",
  "nome da workstation": "name",
  "viewer name": "name",
  "frase de apresentacao": "tagline",
  tagline: "tagline",
  diferencial: "differential",
  differentiator: "differential",
  "idioma do projeto": "lang",
  "idioma do viewer": "lang",
  "partes da workstation": "workflow_parts",
  "workstation parts": "workflow_parts",
  "project language": "lang",
  "viewer language": "lang",
  plataformas: "platforms",
  platforms: "platforms",
  "exige instalacao": "requires_install",
  "requires installation": "requires_install",
  "repositorio publico": "repo_url",
  "public repository": "repo_url",
  "licenca spdx": "license",
  "spdx license": "license",
  "tecnologia base": "base_tech",
  "base technology": "base_tech",
  "fonte dos dados": "data_source",
  "data source": "data_source",
  "licenca dos dados": "data_license",
  "data license": "data_license",
  "usa api externa": "external_api",
  "uses an external api": "external_api",
  "detalhes da api externa": "external_api_detail",
  "external api details": "external_api_detail",
  "url da demonstracao": "demo_url",
  "demo url": "demo_url",
  "url do download": "download_url",
  "download url": "download_url",
  "url do video": "video_url",
  "video url": "video_url",
  "nome do autor": "author_name",
  "author name": "author_name",
  "perfil do autor": "author_profile",
  "author profile": "author_profile",
  pais: "country",
  country: "country",
  "usa dicomweb": "dicomweb",
  "uses dicomweb": "dicomweb",
  descricao: "description",
  description: "description",
  limitacoes: "limitations",
  limitations: "limitations",
  stack: "stack",
  recursos: "features",
  features: "features",
  modalidades: "modalities",
  modalities: "modalities",
  "ferramentas de ia": "ai_tools",
  "ai tools": "ai_tools",
  "participacao de codigo de ia": "ai_code_share",
  "ai code share": "ai_code_share",
  "url dos prompts": "prompts_url",
  "prompts url": "prompts_url",
  "tempo investido": "time_spent",
  "time spent": "time_spent",
  custo: "cost",
  cost: "cost",
};

const workflowPartValues: Record<string, NonNullable<SubmissionFormValues["workflow_parts"]>[number]> = {
  viewer: "viewer",
  pilha: "worklist",
  worklist: "worklist",
  ia: "ai",
  ai: "ai",
  agente: "agent",
  agent: "agent",
  laudo: "report",
  report: "report",
};

const platformValues: Record<string, "web" | "desktop" | "mobile" | "xr"> = {
  web: "web",
  navegador: "web",
  desktop: "desktop",
  mobile: "mobile",
  xr: "xr",
  "realidade estendida": "xr",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function fieldForLabel(label: string) {
  return aliases[normalize(label)] ?? (normalize(label) as IntakeField);
}

// Linha a linha de propósito: o corpo da issue vem de qualquer conta do GitHub, e regex com quantificadores encadeados trava com espaços repetidos.
function blocks(body: string) {
  const parsed = new Map<IntakeField, string>();
  let field: IntakeField | null = null;
  let content: string[] = [];

  function flush() {
    if (field && field in fieldLabels) parsed.set(field, content.join("\n").trim());
  }

  for (const line of body.split(/\r?\n/)) {
    const heading = line.startsWith("### ") ? line.slice(4).trim() : "";
    if (heading) {
      flush();
      field = fieldForLabel(heading);
      content = [];
    } else {
      content.push(line);
    }
  }
  flush();
  return parsed;
}

function firstLine(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("<!--") && line.toLowerCase() !== "_no response_")
    .at(0) ?? "";
}

function textValue(value: string) {
  const text = value.trim();
  return text.toLowerCase() === "_no response_" ? "" : text;
}

// Uma ferramenta por linha, no formato "nome, versão".
function aiTools(value: string) {
  const tools = textValue(value).split("\n").flatMap((line) => {
    const [name, ...version] = line.replace(/^\s*-\s/, "").split(",");
    return name?.trim() ? [{ name: name.trim(), version: version.join(",").trim() }] : [];
  });
  return tools.length > 0 ? tools : undefined;
}

function checkedValues(value: string) {
  return value.split(/\r?\n/).flatMap((line) => {
    const item = line.trim();
    const marker = item.slice(0, 5).toLowerCase();
    return marker === "- [x]" && /\s/.test(item.charAt(5)) && item.slice(5).trim() ? [item.slice(5).trim()] : [];
  });
}

function booleanValue(value: string) {
  const checked = checkedValues(value);
  if (checked.length > 0) return true;
  const selected = normalize(firstLine(value));
  if (["yes", "sim", "true", "x"].includes(selected)) return true;
  if (["no", "nao", "não", "false"].includes(selected)) return false;
  return undefined;
}

function optionValue(value: string) {
  const selected = normalize(firstLine(value));
  return selected ? selected.replace(/\s+/g, "_") : undefined;
}

function parseFields(body: string): Record<string, unknown> {
  const parsed = blocks(body);
  const result: Record<string, unknown> = { intent: "draft", rules_accepted: false };

  for (const [field, raw] of parsed) {
    const value = firstLine(raw);
    if (field === "platforms") {
      result[field] = checkedValues(raw).map((item) => platformValues[normalize(item)]).filter(Boolean);
    } else if (field === "workflow_parts") {
      result[field] = checkedValues(raw).map((item) => workflowPartValues[normalize(item)]).filter(Boolean);
    } else if (field === "features" || field === "modalities") {
      result[field] = checkedValues(raw).map((item) => normalize(item).replace(/\s+/g, "_"));
    } else if (field === "ai_tools") {
      result[field] = aiTools(raw);
    } else if (field === "description" || field === "limitations") {
      result[field] = textValue(raw);
    } else if (["requires_install", "external_api", "dicomweb"].includes(field)) {
      result[field] = booleanValue(raw);
    } else if (field === "lang") {
      const selected = normalize(value);
      result[field] = selected === "pt" || selected.startsWith("portugues") ? "pt" : selected === "en" || selected.startsWith("english") || selected.startsWith("ingles") ? "en" : selected === "es" || selected.startsWith("espanol") || selected.startsWith("espanhol") || selected.startsWith("spanish") ? "es" : value;
    } else if (["base_tech", "author_profile", "ai_code_share", "time_spent", "cost"].includes(field)) {
      result[field] = optionValue(value);
    } else {
      result[field] = value;
    }
  }

  return result;
}

function errorField(path: PropertyKey[]) {
  const field = path[0];
  return typeof field === "string" && field in fieldLabels ? field as IntakeField : null;
}

export function parseGithubIssueBody(body: string) {
  const values = parseFields(body);
  const parsed = githubSubmissionSchema.safeParse(values);
  if (parsed.success) {
    // O aceite do regulamento nunca vem da issue: quem escreve pode ser um agente, e quem aceita é a pessoa, no site.
    const { intent, rules_accepted, ...fields } = parsed.data;
    void intent;
    void rules_accepted;
    return { success: true as const, fields: fields as GithubIssueFields };
  }

  const fieldsWithErrors = new Set<IntakeField>();
  for (const issue of parsed.error.issues) {
    const field = errorField(issue.path);
    if (field) fieldsWithErrors.add(field);
  }
  const pt = [...fieldsWithErrors].map((field) => `${fieldLabels[field].pt}: campo obrigatório ou inválido.`);
  const en = [...fieldsWithErrors].map((field) => `${fieldLabels[field].en}: required or invalid.`);
  return { success: false as const, errors: { pt, en } satisfies GithubIntakeErrors };
}
