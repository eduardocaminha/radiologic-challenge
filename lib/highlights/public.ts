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

async function fetchHighlightRows(): Promise<HighlightRow[]> {
  if (!hasSupabaseConfig()) return [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const result = await supabase.rpc("get_highlights");
  if (result.error || !result.data) return [];

  return result.data as unknown as HighlightRow[];
}

const getCachedHighlightRows = unstable_cache(fetchHighlightRows, ["public-highlights"], {
  revalidate: 60,
});

export async function getPublicHighlights(): Promise<PublicHighlightMonth[]> {
  const rows = process.env.NODE_ENV === "development"
    ? await fetchHighlightRows()
    : await getCachedHighlightRows();

  const months = new Map<string, PublicHighlight[]>();
  for (const row of rows) {
    const entries = months.get(row.month) ?? [];
    entries.push({ rank: row.rank, name: row.name, votes: numberValue(row.votes), slug: row.slug });
    months.set(row.month, entries);
  }

  return [...months.entries()].map(([month, entries]) => ({ month, entries }));
}
