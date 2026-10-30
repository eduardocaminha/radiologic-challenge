import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getOgFonts, ogSize, ViewerOgImage } from "@/lib/og";
import { isLocale } from "@/lib/i18n";
import { getPublicViewerForOg } from "@/lib/viewers/og";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: localeParam, slug } = await params;
  if (!isLocale(localeParam)) notFound();

  const viewer = await getPublicViewerForOg(slug);
  if (!viewer) notFound();

  return new ImageResponse(<ViewerOgImage locale={localeParam} name={viewer.name} tagline={viewer.tagline} />, {
    ...ogSize,
    fonts: await getOgFonts(),
  });
}
