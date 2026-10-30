export interface SubmissionActionState {
  ok: boolean;
  actionId?: string;
  submissionId?: string;
  fieldErrors?: Record<string, string[]>;
  formError?: string;
  errorCode?: string;
}

export const initialSubmissionActionState: SubmissionActionState = { ok: false };
