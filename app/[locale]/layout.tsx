import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import "../globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getDictionary } from "@/dictionaries";
import { isLocale, locales } from "@/lib/i18n";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamicParams = false;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#0e0e0e", colorScheme: "dark" };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale}>
      <head>
        <link rel="preload" href="/fonts/InterVariable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <Header locale={locale} dictionary={dictionary} />
        {children}
        <Footer locale={locale} dictionary={dictionary} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
