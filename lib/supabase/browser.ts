"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient | undefined;

export function createBrowserSupabaseClient(): SupabaseClient | null {
  if (!browserClient) {
    if (!hasSupabaseConfig()) return null;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

    browserClient = createBrowserClient(url, key);
  }

  return browserClient;
}
