import "server-only";

import { createSecretSupabaseClient } from "@/lib/supabase/secret";

export async function removeScreenshotObjects(paths: string[]) {
  if (paths.length === 0) return null;
  const supabase = createSecretSupabaseClient();
  const result = await supabase.storage.from("screenshots").remove(paths);
  return result.error;
}

export async function createScreenshotSignedUrls(paths: string[]) {
  if (paths.length === 0) return new Map<string, string>();
  const supabase = createSecretSupabaseClient();
  const result = await supabase.storage.from("screenshots").createSignedUrls(paths, 3600);
  if (result.error) throw result.error;
  return new Map(result.data.map(({ path, signedUrl }) => [path, signedUrl]));
}
