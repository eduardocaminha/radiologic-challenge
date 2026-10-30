import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import "../globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getDictionary } from "@/dictionaries";
import { isLocale, locales } from "@/lib/i18n";

export const dynamicParams = false;

export const metadata: Metadata = {
  metadataBase: new URL("https://challenge.radiologic.io"),
  openGraph: {
    siteName: "Radiologic Workstation",
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
      <body>
        <Header locale={locale} dictionary={dictionary} />
        {children}
        <Footer locale={locale} dictionary={dictionary} />
      </body>
    </html>
  );
}
