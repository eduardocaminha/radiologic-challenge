import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Locale } from "@/lib/i18n";

export const ogSize = { width: 1200, height: 630 } as const;
const ogFontBudget = 500 * 1024;

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/Inter-Medium.ttf")),
  readFile(join(process.cwd(), "assets/fonts/Inter-SemiBold.ttf")),
]).then(([medium, semiBold]) => {
  if (medium.byteLength + semiBold.byteLength >= ogFontBudget) {
    throw new Error("Open Graph fonts exceed the 500 KB bundle budget");
  }

  return [
    { name: "Inter", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Inter", data: semiBold, weight: 600 as const, style: "normal" as const },
  ];
});

export function getOgFonts() {
  return fonts;
}

export function BrandMark({ color = "#f7f7f4", size = 44 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M62.5 0C83.2107 0 100 16.7893 100 37.5C100 54.4227 88.7896 68.7241 73.3906 73.3906L100 100H0V0H62.5Z" fill={color} />
    </svg>
  );
}

export function DefaultOgImage({ locale }: { locale: Locale }) {
  const pt = locale === "pt";
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#191919", color: "#f7f7f4", padding: "64px 72px 56px", fontFamily: "Inter" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <BrandMark />
        <div style={{ display: "flex", flexDirection: "column", fontSize: 21, lineHeight: 1.05, letterSpacing: 2, fontWeight: 600 }}>
          <span>RADIOLOGIC</span>
          <span style={{ color: "#a9aaa5" }}>VIEWERS</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <span style={{ color: "#a9aaa5", fontSize: 25 }}>{pt ? "Showcase público" : "Public showcase"}</span>
        <span style={{ fontSize: 78, lineHeight: 1, fontWeight: 600, letterSpacing: -2 }}>Radiologic Viewers</span>
        <span style={{ maxWidth: 820, color: "#c7c8c3", fontSize: 31, lineHeight: 1.2 }}>{pt ? "Showcase de DICOM viewers submetidos pelo público." : "Showcase of DICOM viewers submitted by the public."}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 20, color: "#a9aaa5" }}>
        <span>Radiologic</span>
        <span>{pt ? "Criatividade para imagens médicas" : "Creativity for medical imaging"}</span>
      </div>
    </div>
  );
}

export function ViewerOgImage({ locale, name, tagline }: { locale: Locale; name: string; tagline: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#191919", color: "#f7f7f4", padding: "64px 72px 56px", fontFamily: "Inter" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <BrandMark />
        <div style={{ display: "flex", flexDirection: "column", fontSize: 21, lineHeight: 1.05, letterSpacing: 2, fontWeight: 600 }}>
          <span>RADIOLOGIC</span>
          <span style={{ color: "#a9aaa5" }}>VIEWERS</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1030 }}>
        <span style={{ color: "#a9aaa5", fontSize: 25 }}>{locale === "pt" ? "Viewer aprovado" : "Approved viewer"}</span>
        <span style={{ fontSize: 76, lineHeight: 1.02, fontWeight: 600, letterSpacing: -2 }}>{name}</span>
        <span style={{ color: "#c7c8c3", fontSize: 31, lineHeight: 1.18 }}>{tagline}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 20, color: "#a9aaa5" }}>
        <span>Radiologic</span>
        <span>{locale === "pt" ? "Showcase público" : "Public showcase"}</span>
      </div>
    </div>
  );
}
