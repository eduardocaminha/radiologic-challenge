export interface AdminScreenshot {
  id: string;
  submission_id: string;
  path: string;
  status: "pending" | "approved" | "rejected";
  position: number;
  created_at: string;
  url?: string;
  submission_name?: string | null;
  submission_slug?: string | null;
  submission?: AdminSubmission;
}

export interface AdminEvent {
  id: string;
  submission_id: string | null;
  actor_id: string | null;
  kind: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface AdminSubmission {
  id: string;
  slug: string | null;
  status: "pending" | "approved" | "rejected" | "removed";
  rejection_reason: string | null;
  owner_id: string | null;
  source: "form" | "github";
  github_issue_number: number | null;
  github_user_id: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  name: string | null;
  tagline: string | null;
  description: string | null;
  differential: string | null;
  lang: "pt" | "en" | null;
  platforms: string[] | null;
  requires_install: boolean | null;
  repo_url: string | null;
  license: string | null;
  base_tech: string | null;
  data_source: string | null;
  data_license: string | null;
  external_api: boolean | null;
  external_api_detail: string | null;
  demo_url: string | null;
  download_url: string | null;
  video_url: string | null;
  ai_tools: unknown;
  ai_code_share: string | null;
  prompts_url: string | null;
  time_spent: string | null;
  cost: string | null;
  features: string[] | null;
  workflow_parts: string[] | null;
  modalities: string[] | null;
  dicomweb: boolean | null;
  stack: string | null;
  author_name: string | null;
  author_profile: string | null;
  country: string | null;
  limitations: string | null;
  rules_version: string | null;
  rules_accepted_at: string | null;
  screenshots: AdminScreenshot[];
  events: AdminEvent[];
}

export interface AdminQueue {
  submissions: AdminSubmission[];
  screenshots: AdminScreenshot[];
  published: AdminSubmission[];
}

export interface VoteIntegrityAccount {
  user_id: string;
  email_hint: string | null;
  created_at: string;
  voted_at: string;
}

export interface VoteIntegrityHour {
  hour: string;
  votes: number;
}

export interface VoteIntegrityReport {
  total_votes: number;
  suspicious_votes: number;
  suspicious_fraction: number;
  hourly_votes: VoteIntegrityHour[];
  suspicious_accounts: VoteIntegrityAccount[];
}

export interface AdminIntegrityReport {
  submission: Pick<AdminSubmission, "id" | "name" | "slug" | "status">;
  report: VoteIntegrityReport;
}
