import { createClient } from "@supabase/supabase-js";
import { createScreenshotSignedUrls } from "@/lib/storage/server";

export const revalidate = 60;

interface PublicScreenshot {
  id: string;
  path: string;
  position: number;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ error: "Supabase configuration is missing" }, { status: 500 });

  const { slug } = await params;
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const result = await supabase.rpc("get_public_screenshots", { p_slug: slug });
  if (result.error) return Response.json({ error: "Screenshots not found" }, { status: 404 });

  const screenshots = (result.data ?? []) as PublicScreenshot[];
  const signedUrls = await createScreenshotSignedUrls(screenshots.map((screenshot) => screenshot.path));
  return Response.json({
    screenshots: screenshots.map((screenshot) => ({
      ...screenshot,
      url: signedUrls.get(screenshot.path),
    })),
  });
}
