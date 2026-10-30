import type { Dictionary } from "@/dictionaries";

export function getSubmissionError(dictionary: Dictionary, code: string) {
  return dictionary.submission.error[code] ?? dictionary.submission.error.default;
}
