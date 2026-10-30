import { createClient } from "@supabase/supabase-js";
import { hasSupabaseConfig } from "@/lib/supabase/config";

interface OgViewerRow {
  name: string;
  tagline: string;
}

export async function getPublicViewerForOg(slug: string): Promise<OgViewerRow | null> {
  if (!hasSupabaseConfig()) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const result = await supabase.rpc("get_submission", { p_slug: slug });
  const viewer = result.data?.[0] as OgViewerRow | undefined;
  if (result.error || !viewer || typeof viewer.name !== "string" || typeof viewer.tagline !== "string") return null;
  return viewer;
}
