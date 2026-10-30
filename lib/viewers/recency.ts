const DAY = 24 * 60 * 60 * 1000;
const WINDOW = 14 * DAY;

export type ViewerRecency = "new" | "updated" | null;

// A aprovação grava `updated_at` junto com `approved_at`: só conta como atualização o que vem pelo menos um dia depois.
export function viewerRecency(approvedAt: string | null, updatedAt: string, now: number): ViewerRecency {
  const approved = approvedAt ? Date.parse(approvedAt) : Number.NaN;
  const updated = Date.parse(updatedAt);
  if (Number.isNaN(approved)) return null;
  if (now - approved <= WINDOW) return "new";
  return updated - approved >= DAY && now - updated <= WINDOW ? "updated" : null;
}
