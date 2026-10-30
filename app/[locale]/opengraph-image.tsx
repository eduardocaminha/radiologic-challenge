import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { DefaultOgImage, getOgFonts, ogSize } from "@/lib/og";
import { isLocale } from "@/lib/i18n";

export const contentType = "image/png";
export const size = ogSize;

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();

  return new ImageResponse(<DefaultOgImage locale={localeParam} />, {
    ...size,
    fonts: await getOgFonts(),
  });
}
