"use client";

import { CheckIcon, ChevronDownIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useActionState, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { getSubmissionError } from "@/lib/submissions/errors";
import { RULES_VERSION, WORKFLOW_PARTS } from "@/lib/submissions/constants";
import { initialSubmissionActionState, type SubmissionActionState } from "@/lib/submissions/action-state";
import {
  REQUIRED_ON_SEND,
  submissionFormData,
  submissionSchema,
  type SubmissionFormValues,
} from "@/lib/submissions/schema";
import { saveSubmission, sendSubmission } from "@/app/[locale]/submit/actions";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";
import { ScreenshotManager, type ScreenshotRecord } from "@/components/screenshot-manager";
import { FormNav } from "@/components/form-nav";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface SubmissionRecord {
  id: string;
  status: "draft" | "pending" | "approved" | "rejected" | "removed";
  name: string | null;
  tagline: string | null;
  description: string | null;
  differential: string | null;
  lang: "pt" | "en" | "es" | null;
  platforms: Array<"web" | "desktop" | "mobile" | "xr"> | null;
  requires_install: boolean | null;
  repo_url: string | null;
  license: string | null;
  base_tech: SubmissionFormValues["base_tech"] | null;
  data_source: string | null;
  data_license: string | null;
  external_api: boolean | null;
  external_api_detail: string | null;
  demo_url: string | null;
  download_url: string | null;
  video_url: string | null;
  ai_tools: Array<{ name: string; version: string | null }> | null;
  ai_code_share: SubmissionFormValues["ai_code_share"] | null;
  prompts_url: string | null;
  time_spent: SubmissionFormValues["time_spent"] | null;
  cost: SubmissionFormValues["cost"] | null;
  features: SubmissionFormValues["features"] | null;
  workflow_parts: SubmissionFormValues["workflow_parts"] | null;
  modalities: SubmissionFormValues["modalities"] | null;
  dicomweb: boolean | null;
  stack: string | null;
  author_name: string | null;
  author_profile: SubmissionFormValues["author_profile"] | null;
  country: string | null;
  limitations: string | null;
  rules_version: string | null;
  screenshots?: ScreenshotRecord[];
}

interface SubmissionFormProps {
  locale: Locale;
  dictionary: Dictionary;
  idempotencyKey: string;
  submission?: SubmissionRecord;
}

const URL_FIELDS = new Set(["repo_url", "demo_url", "download_url", "video_url", "prompts_url"]);

// Campos fora de um input nativo (Select, Checkbox) avisam por aqui que o valor mudou.
const FormChanged = createContext<() => void>(() => undefined);
const RequiredLabel = createContext("");

function defaults(submission?: SubmissionRecord): Record<string, string | boolean> {
  return {
    name: submission?.name ?? "",
    tagline: submission?.tagline ?? "",
    description: submission?.description ?? "",
    differential: submission?.differential ?? "",
    lang: submission?.lang ?? "",
    repo_url: submission?.repo_url ?? "",
    license: submission?.license ?? "",
    base_tech: submission?.base_tech ?? "",
    data_source: submission?.data_source ?? "",
    data_license: submission?.data_license ?? "",
    external_api_detail: submission?.external_api_detail ?? "",
    demo_url: submission?.demo_url ?? "",
    download_url: submission?.download_url ?? "",
    video_url: submission?.video_url ?? "",
    ai_code_share: submission?.ai_code_share ?? "",
    prompts_url: submission?.prompts_url ?? "",
    time_spent: submission?.time_spent ?? "",
    cost: submission?.cost ?? "",
    stack: submission?.stack ?? "",
    author_name: submission?.author_name ?? "",
    author_profile: submission?.author_profile ?? "",
    country: submission?.country ?? "",
    limitations: submission?.limitations ?? "",
    requires_install: submission?.requires_install ?? false,
    external_api: submission?.external_api ?? false,
    dicomweb: submission?.dicomweb ?? false,
    rules_accepted: submission?.rules_version === RULES_VERSION,
  };
}

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={`${id}-error`} className="text-sm text-destructive-foreground" role="alert">
      {messages[0]}
    </p>
  );
}

function SubmitButton({ label, pendingLabel, intent, formAction, variant }: { label: string; pendingLabel: string; intent: "draft" | "submit" | "resubmit"; formAction: (formData: FormData) => void; variant?: "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" variant={variant} data-intent={intent} formAction={formAction} disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function SubmissionForm({ locale, dictionary, idempotencyKey, submission }: SubmissionFormProps) {
  const router = useRouter();
  const [saveState, saveAction, savePending] = useActionState(saveSubmission, initialSubmissionActionState);
  const [sendState, sendAction, sendPending] = useActionState(sendSubmission, initialSubmissionActionState);
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({});
  const submissionLocked = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = useRef(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [screenshotCount, setScreenshotCount] = useState(submission?.screenshots?.length ?? 0);
  const values = defaults(submission);
  const actionState: SubmissionActionState = sendState.ok || sendState.fieldErrors || sendState.errorCode || sendState.formError || sendState.submissionId ? sendState : saveState;
  const pending = savePending || sendPending;
  const currentSubmissionId = actionState.submissionId ?? submission?.id ?? "";

  useEffect(() => {
    if (actionState.ok) router.push(`/${locale}/me`);
    if (!pending && !actionState.ok) submissionLocked.current = false;
  }, [actionState.ok, actionState.submissionId, locale, pending, router]);

  const intent = submission?.status === "rejected" ? "resubmit" : "submit";

  const refreshMissing = useCallback(() => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    formData.set("intent", intent);
    const parsed = submissionSchema.safeParse(submissionFormData(formData));
    setMissing(parsed.success ? [] : Object.keys(parsed.error.flatten().fieldErrors));
  }, [intent]);

  const onFormChanged = useCallback(() => {
    dirty.current = true;
    requestAnimationFrame(refreshMissing);
  }, [refreshMissing]);

  useEffect(refreshMissing, [refreshMissing]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (dirty.current) event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  function errorFor(field: string) {
    const messages = clientErrors[field] ?? actionState.fieldErrors?.[field];
    if (!messages?.length) return undefined;
    if (messages[0] === "Required") return [dictionary.submission.errorRequired];
    return [URL_FIELDS.has(field) ? dictionary.submission.errorUrl : dictionary.submission.error.default];
  }

  // Valida o formato ao sair do campo. Campo vazio só é cobrado ao enviar.
  function validateField(event: React.FocusEvent<HTMLFormElement>) {
    const { name, value } = event.target as unknown as HTMLInputElement;
    if (!name || !formRef.current) return;
    const setFieldErrors = (messages?: string[]) => setClientErrors((current) => {
      const next = { ...current };
      delete next[name];
      return messages?.length ? { ...next, [name]: messages } : next;
    });
    if (!value?.trim()) {
      setFieldErrors();
      return;
    }
    const formData = new FormData(formRef.current);
    formData.set("intent", "draft");
    const parsed = submissionSchema.safeParse(submissionFormData(formData));
    setFieldErrors(parsed.success ? undefined : parsed.error.flatten().fieldErrors[name as keyof SubmissionFormValues]);
  }

  function controlProps(field: string) {
    const messages = errorFor(field);
    return {
      id: field,
      name: field,
      required: (REQUIRED_ON_SEND as readonly string[]).includes(field) || missing.includes(field),
      "aria-invalid": messages ? true : undefined,
      "aria-describedby": messages ? `${field}-error` : undefined,
    };
  }

  function validate(event: React.FormEvent<HTMLFormElement>) {
    if (submissionLocked.current) {
      event.preventDefault();
      return;
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const formData = new FormData(event.currentTarget);
    formData.set("intent", submitter?.dataset.intent ?? "draft");
    const parsed = submissionSchema.safeParse(submissionFormData(formData));
    if (!parsed.success) {
      event.preventDefault();
      const tree = parsed.error.flatten().fieldErrors;
      setClientErrors(Object.fromEntries(Object.entries(tree).map(([key, messages]) => [key, messages ?? []])));
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    submissionLocked.current = true;
    dirty.current = false;
    setClientErrors({});
  }

  const field = dictionary.submission.field;
  const select = dictionary.submission.select;
  const feature = dictionary.submission.feature;
  const modality = dictionary.submission.modality;
  const aiTools = submission?.ai_tools ?? [];
  const selectedFeatures = submission?.features ?? [];
  const selectedModalities = submission?.modalities ?? [];
  const error = actionState.errorCode
    ? getSubmissionError(dictionary, actionState.errorCode)
    : actionState.formError
      ? dictionary.submission.error.default
      : undefined;

  const sections = [
    ["identity", dictionary.submission.section.identity],
    ["technical", dictionary.submission.section.technical],
    ["demo", dictionary.submission.section.demo],
    ["author", dictionary.submission.section.author],
    ["process", dictionary.submission.section.process],
    ["screenshots", dictionary.submission.screenshot.title],
    ["rules", dictionary.submission.section.rules],
  ] as const;

  const missingLabels = [
    ...missing.map((key) => (field as Record<string, string>)[key] ?? key),
    ...(screenshotCount === 0 ? [dictionary.submission.screenshot.title] : []),
  ];

  return (
    <FormChanged.Provider value={onFormChanged}>
    <RequiredLabel.Provider value={dictionary.submission.requiredMark}>
    <form ref={formRef} action={saveAction} onSubmit={validate} onInput={onFormChanged} onBlur={validateField} className="flex flex-col gap-10 lg:flex-row lg:gap-16" noValidate>
      <input type="hidden" name="submission_id" value={currentSubmissionId} />
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="intent" value={submission?.status === "rejected" ? "resubmit" : "submit"} />

      <nav aria-label={submission ? dictionary.submission.editTitle : dictionary.submission.title} className="hidden lg:block lg:w-48 lg:shrink-0">
        <FormNav sections={sections} />
      </nav>

      <div className="flex min-w-0 max-w-2xl flex-1 flex-col gap-12">
        <h1 className="text-headline-lg sm:text-display-sm">
          {submission ? dictionary.submission.editTitle : dictionary.submission.title}
        </h1>

        {error ? <p role="alert" className="rounded-lg border border-destructive/36 bg-destructive/8 px-4 py-3 text-sm text-destructive-foreground">{error}</p> : null}

        <FormSection id="identity" title={dictionary.submission.section.identity}>
          <TextInput label={field.name} {...controlProps("name")} required defaultValue={values.name as string} error={errorFor("name")} />
          <TextInput label={field.tagline} {...controlProps("tagline")} defaultValue={values.tagline as string} error={errorFor("tagline")} />
          <TextArea label={field.description} {...controlProps("description")} defaultValue={values.description as string} error={errorFor("description")} />
          <TextArea label={field.differential} {...controlProps("differential")} defaultValue={values.differential as string} error={errorFor("differential")} />
          <TextArea label={field.limitations} {...controlProps("limitations")} defaultValue={values.limitations as string} error={errorFor("limitations")} />
          <SelectInput label={field.lang} options={[["pt", select.pt], ["en", select.en], ["es", select.es]]} {...controlProps("lang")} defaultValue={values.lang as string} error={errorFor("lang")} />
        </FormSection>

        <FormSection id="technical" title={dictionary.submission.section.technical}>
          <ChoiceGroup required label={field.workflow_parts} name="workflow_parts" options={WORKFLOW_PARTS.map((key) => [key, dictionary.submission.part[key]])} selected={submission?.workflow_parts ?? []} error={errorFor("workflow_parts")} />
          <ChoiceGroup required label={field.platforms} name="platforms" options={(["web", "desktop", "mobile", "xr"] as const).map((key) => [key, select[key]])} selected={submission?.platforms ?? []} error={errorFor("platforms")} />
          <CheckboxInput label={field.requires_install} name="requires_install" defaultChecked={values.requires_install as boolean} />
          <TextInput label={field.repo_url} type="url" {...controlProps("repo_url")} defaultValue={values.repo_url as string} error={errorFor("repo_url")} />
          <div className="grid gap-6 sm:grid-cols-2">
            <TextInput label={field.license} {...controlProps("license")} defaultValue={values.license as string} error={errorFor("license")} />
            <SelectInput label={field.base_tech} options={(["scratch", "ohif", "cornerstone3d", "vtkjs", "dwv", "niivue", "volview", "other"] as const).map((key) => [key, select[key]])} {...controlProps("base_tech")} defaultValue={values.base_tech as string} error={errorFor("base_tech")} />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <TextInput label={field.data_source} {...controlProps("data_source")} defaultValue={values.data_source as string} error={errorFor("data_source")} />
            <TextInput label={field.data_license} {...controlProps("data_license")} defaultValue={values.data_license as string} error={errorFor("data_license")} />
          </div>
          <CheckboxInput label={field.external_api} name="external_api" defaultChecked={values.external_api as boolean} />
          <TextInput label={field.external_api_detail} {...controlProps("external_api_detail")} defaultValue={values.external_api_detail as string} error={errorFor("external_api_detail")} />
        </FormSection>

        <FormSection id="demo" title={dictionary.submission.section.demo}>
          <TextInput label={field.demo_url} type="url" {...controlProps("demo_url")} defaultValue={values.demo_url as string} error={errorFor("demo_url")} />
          <TextInput label={field.download_url} type="url" {...controlProps("download_url")} defaultValue={values.download_url as string} error={errorFor("download_url")} />
          <TextInput label={field.video_url} type="url" {...controlProps("video_url")} defaultValue={values.video_url as string} error={errorFor("video_url")} />
        </FormSection>

        <FormSection id="author" title={dictionary.submission.section.author}>
          <div className="grid gap-6 sm:grid-cols-2">
            <TextInput label={field.author_name} autoComplete="name" {...controlProps("author_name")} defaultValue={values.author_name as string} error={errorFor("author_name")} />
            <SelectInput label={field.author_profile} options={(["radiologist", "resident", "physician", "developer", "student", "physicist", "team"] as const).map((key) => [key, select[key]])} {...controlProps("author_profile")} defaultValue={values.author_profile as string} error={errorFor("author_profile")} />
          </div>
          <TextInput label={field.country} autoComplete="country" maxLength={2} className="sm:max-w-40" {...controlProps("country")} defaultValue={values.country as string} error={errorFor("country")} />
        </FormSection>

        <FormSection id="process" title={dictionary.submission.section.process}>
          <TextInput label={field.stack} {...controlProps("stack")} defaultValue={values.stack as string} error={errorFor("stack")} />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-label-md">{field.ai_tools}</legend>
            <AiToolsInputs tools={aiTools} nameLabel={field.ai_tool_name} versionLabel={field.ai_tool_version} addLabel={dictionary.submission.addTool} hasError={Boolean(errorFor("ai_tools"))} />
            <FieldError id="ai_tools" messages={errorFor("ai_tools")} />
          </fieldset>
          <div className="grid gap-6 sm:grid-cols-3">
            <SelectInput label={field.ai_code_share} options={(["none", "lt25", "25to75", "gt75", "all"] as const).map((key) => [key, select[key]])} {...controlProps("ai_code_share")} defaultValue={values.ai_code_share as string} error={errorFor("ai_code_share")} />
            <SelectInput label={field.time_spent} options={(["lt1d", "1to7d", "1to4w", "gt1m"] as const).map((key) => [key, select[key]])} {...controlProps("time_spent")} defaultValue={values.time_spent as string} error={errorFor("time_spent")} />
            <SelectInput label={field.cost} options={(["lt10", "10to100", "100to1000", "gt1000"] as const).map((key) => [key, select[key]])} {...controlProps("cost")} defaultValue={values.cost as string} error={errorFor("cost")} />
          </div>
          <TextInput label={field.prompts_url} type="url" {...controlProps("prompts_url")} defaultValue={values.prompts_url as string} error={errorFor("prompts_url")} />
          <CheckboxInput label={field.dicomweb} name="dicomweb" defaultChecked={values.dicomweb as boolean} />
          <ChoiceDisclosure countLabel={dictionary.submission.selectedCount} label={field.features} name="features" options={(["2d", "3d", "mpr", "measurements", "annotations", "segmentation", "fusion", "cine", "hanging_protocols", "ai", "export", "comparison", "windowing", "collaboration", "other"] as const).map((key) => [key, feature[key]])} selected={selectedFeatures} error={errorFor("features")} />
          <ChoiceDisclosure countLabel={dictionary.submission.selectedCount} label={field.modalities} name="modalities" options={(["ct", "mr", "us", "xr", "nm", "pt", "mg", "cr", "dx", "rf", "xa", "sc", "ot", "other"] as const).map((key) => [key, modality[key]])} selected={selectedModalities} error={errorFor("modalities")} />
        </FormSection>

        <ScreenshotManager
          locale={locale}
          dictionary={dictionary}
          submissionId={currentSubmissionId || undefined}
          initialScreenshots={submission?.screenshots ?? []}
          onCountChange={setScreenshotCount}
        />

        <FormSection id="rules" title={dictionary.submission.section.rules}>
          <div className="flex flex-col gap-2">
            <Label className="items-start font-normal">
              <Checkbox name="rules_accepted" value="on" defaultChecked={values.rules_accepted as boolean} aria-describedby={errorFor("rules_accepted") ? "rules_accepted-error" : undefined} className="mt-0.5" />
              <span>{dictionary.submission.rules} <Link className="underline underline-offset-4" href={`/${locale}/rules`}>{dictionary.submission.rulesLink}</Link></span>
            </Label>
            <FieldError id="rules_accepted" messages={errorFor("rules_accepted")} />
          </div>
        </FormSection>

        <div className="flex flex-col gap-2 border-t border-border py-4 sm:sticky sm:bottom-0 sm:flex-row sm:items-center sm:bg-page-bg/92 sm:backdrop-blur-sm">
          {missingLabels.length === 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-success-foreground sm:order-last sm:ms-auto" role="status"><CheckIcon aria-hidden="true" className="size-4" />{dictionary.submission.ready}</p>
          ) : (
            <p title={missingLabels.join(", ")} className="text-sm text-muted-foreground sm:order-last sm:ms-auto" role="status">
              {missingLabels.length === 1 ? dictionary.submission.missingOne : dictionary.submission.missingMany.replace("{n}", String(missingLabels.length))}
            </p>
          )}
          <SubmitButton label={submission?.status === "rejected" ? dictionary.submission.resend : dictionary.submission.send} pendingLabel={dictionary.submission.saving} intent={submission?.status === "rejected" ? "resubmit" : "submit"} formAction={sendAction} />
          <SubmitButton variant="outline" label={dictionary.submission.saveDraft} pendingLabel={dictionary.submission.saving} intent="draft" formAction={saveAction} />
        </div>
        {pending ? <p className="sr-only" role="status">{dictionary.submission.saving}</p> : null}
      </div>
    </form>
    </RequiredLabel.Provider>
    </FormChanged.Provider>
  );
}

function FormSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="flex scroll-mt-6 flex-col gap-6" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="border-b border-border pb-3 text-title-sm">{title}</h2>
      {children}
    </section>
  );
}

function FieldLabel({ htmlFor, label, required }: { htmlFor?: string; label: string; required?: boolean }) {
  const requiredLabel = useContext(RequiredLabel);
  return (
    <Label htmlFor={htmlFor}>
      {label}
      {required ? (
        <>
          <span aria-hidden="true" className="text-muted-foreground">*</span>
          <span className="sr-only">{requiredLabel}</span>
        </>
      ) : null}
    </Label>
  );
}

function TextInput({ label, error, required, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string[]; required?: boolean }) {
  const describedBy = props["aria-describedby"] ?? (error ? `${props.id}-error` : undefined);
  const urlProps = props.type === "url" ? { spellCheck: false, autoCapitalize: "none", placeholder: "https://" } : {};
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <FieldLabel htmlFor={props.id} label={label} required={required} />
      <Input nativeInput {...urlProps} {...props} required={required} aria-describedby={describedBy} />
      <FieldError id={props.id ?? "field"} messages={error} />
    </div>
  );
}

function TextArea({ label, error, required, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string[] }) {
  const describedBy = props["aria-describedby"] ?? (error ? `${props.id}-error` : undefined);
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={props.id} label={label} required={required} />
      <Textarea {...props} required={required} rows={4} aria-describedby={describedBy} />
      <FieldError id={props.id ?? "field"} messages={error} />
    </div>
  );
}

function SelectInput({ label, error, options, id, name, defaultValue, required, ...props }: { label: string; error?: string[]; options: Array<[string, string]>; id: string; name: string; defaultValue?: string; required?: boolean; "aria-invalid"?: boolean; "aria-describedby"?: string }) {
  const onChanged = useContext(FormChanged);
  const describedBy = props["aria-describedby"] ?? (error ? `${id}-error` : undefined);
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <Select name={name} defaultValue={defaultValue || null} onValueChange={onChanged} items={options.map(([value, text]) => ({ value, label: text }))}>
        <SelectTrigger id={id} aria-invalid={props["aria-invalid"]} aria-describedby={describedBy}>
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {options.map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}
        </SelectPopup>
      </Select>
      <FieldError id={id} messages={error} />
    </div>
  );
}

function CheckboxInput({ label, name, defaultChecked }: { label: string; name: string; defaultChecked: boolean }) {
  const onChanged = useContext(FormChanged);
  return (
    <Label className="font-normal">
      <Checkbox name={name} value="on" defaultChecked={defaultChecked} onCheckedChange={onChanged} />
      {label}
    </Label>
  );
}

function ChoiceGrid({ name, options, selected, error, onToggle }: { name: string; options: Array<[string, string]>; selected: readonly string[]; error?: string[]; onToggle?: (checked: boolean) => void }) {
  const onChanged = useContext(FormChanged);
  const selectedValues = new Set(selected);
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {options.map(([value, text]) => (
        <Label key={value} className="font-normal">
          <Checkbox name={name} value={value} defaultChecked={selectedValues.has(value)} aria-describedby={error ? `${name}-error` : undefined} onCheckedChange={(checked) => { onToggle?.(checked); onChanged(); }} />
          {text}
        </Label>
      ))}
    </div>
  );
}

function ChoiceGroup({ label, name, options, selected, error, required }: { label: string; name: string; options: Array<[string, string]>; selected: readonly string[]; error?: string[]; required?: boolean }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3"><FieldLabel label={label} required={required} /></legend>
      <ChoiceGrid name={name} options={options} selected={selected} error={error} />
      <FieldError id={name} messages={error} />
    </fieldset>
  );
}

// Grade longa fica recolhida. Os checkboxes continuam no DOM, então seguem no envio.
function ChoiceDisclosure({ label, name, options, selected, error, countLabel }: { label: string; name: string; options: Array<[string, string]>; selected: readonly string[]; error?: string[]; countLabel: string }) {
  const [count, setCount] = useState(selected.length);
  return (
    <details className="group/details">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full py-1 text-label-md outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <ChevronDownIcon aria-hidden="true" className="size-4 text-muted-foreground transition-transform duration-150 group-open/details:rotate-180" />
        {label}
        {count > 0 ? <span className="font-normal tabular-nums text-muted-foreground">{countLabel.replace("{n}", String(count))}</span> : null}
      </summary>
      <div className="pt-3">
        <ChoiceGrid name={name} options={options} selected={selected} error={error} onToggle={(checked) => setCount((current) => current + (checked ? 1 : -1))} />
      </div>
      <FieldError id={name} messages={error} />
    </details>
  );
}

function AiToolsInputs({ tools, nameLabel, versionLabel, addLabel, hasError }: { tools: Array<{ name: string; version: string | null }>; nameLabel: string; versionLabel: string; addLabel: string; hasError: boolean }) {
  const [rows, setRows] = useState(() => Math.min(10, Math.max(1, tools.length)));
  const describedBy = hasError ? "ai_tools-error" : undefined;
  return (
    <>
      {Array.from({ length: rows }, (_, index) => {
        const tool = tools[index];
        return (
          <div key={index} className="grid gap-3 sm:grid-cols-3">
            <TextInput className="sm:col-span-2" label={`${nameLabel} ${index + 1}`} name={`ai_tool_name_${index}`} id={`ai_tool_name_${index}`} defaultValue={tool?.name ?? ""} aria-describedby={describedBy} />
            <TextInput label={`${versionLabel} ${index + 1}`} name={`ai_tool_version_${index}`} id={`ai_tool_version_${index}`} defaultValue={tool?.version ?? ""} aria-describedby={describedBy} />
          </div>
        );
      })}
      {rows < 10 ? (
        <Button variant="ghost" className="-ms-3 w-fit text-muted-foreground" onClick={() => setRows((current) => current + 1)}>
          <PlusIcon aria-hidden="true" />
          {addLabel}
        </Button>
      ) : null}
    </>
  );
}
