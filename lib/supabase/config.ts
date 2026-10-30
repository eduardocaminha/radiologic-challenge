export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

// Sessão só trafega em HTTPS. O Supabase local roda em HTTP.
export function supabaseCookieOptions() {
  return { secure: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://") ?? false };
}
