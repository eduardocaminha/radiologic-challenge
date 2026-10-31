import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export interface PublicHighlight {
  rank: number;
  name: string;
  votes: number;
  slug: string | null;
}

export interface PublicHighlightMonth {
  month: string;
  entries: PublicHighlight[];
  voided: number;
}

interface HighlightRow {
  month: string;
  rank: number;
  name: string;
  votes: number | string;
  slug: string | null;
}

function numberValue(value: number | string | null | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

interface VoidedRow {
  month: string;
  votes: number | string;
}

interface HighlightData {
  rows: HighlightRow[];
  voided: VoidedRow[];
}

async function fetchHighlightRows(): Promise<HighlightData> {
  const empty: HighlightData = { rows: [], voided: [] };
  if (!hasSupabaseConfig()) return empty;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return empty;

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const [result, voided] = await Promise.all([supabase.rpc("get_highlights"), supabase.rpc("voided_votes_by_month")]);
  if (result.error || !result.data) return empty;

  return {
    rows: result.data as unknown as HighlightRow[],
    voided: (voided.data ?? []) as unknown as VoidedRow[],
  };
}

const getCachedHighlightRows = unstable_cache(fetchHighlightRows, ["public-highlights"], {
  revalidate: 60,
});

export async function getPublicHighlights(): Promise<PublicHighlightMonth[]> {
  const { rows, voided } = process.env.NODE_ENV === "development"
    ? await fetchHighlightRows()
    : await getCachedHighlightRows();

  const months = new Map<string, PublicHighlight[]>();
  for (const row of rows) {
    const entries = months.get(row.month) ?? [];
    entries.push({ rank: row.rank, name: row.name, votes: numberValue(row.votes), slug: row.slug });
    months.set(row.month, entries);
  }

  const voidedByMonth = new Map(voided.map((row) => [row.month, numberValue(row.votes)]));
  return [...months.entries()].map(([month, entries]) => ({ month, entries, voided: voidedByMonth.get(month) ?? 0 }));
}
