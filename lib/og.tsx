import { readFile } from "node:fs/promises";
import { join } from "node:path";

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

function OgBrand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>
      <BrandMark />
      <span>Radiologic</span>
    </div>
  );
}

function OgFooter() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 24, color: "#a9aaa5" }}>
      <span>Radiologic Workstation</span>
      <span>challenge.radiologic.io</span>
    </div>
  );
}

export function DefaultOgImage() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0e0e0e", color: "#f7f7f4", padding: "72px", fontFamily: "Inter" }}>
      <BrandMark size={96} />
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 112, lineHeight: 1.02, fontWeight: 600, letterSpacing: -4 }}>
          <span>Radiologic</span>
          <span style={{ color: "#8f908b" }}>Workstation</span>
        </div>
        <span style={{ fontSize: 32, color: "#a9aaa5" }}>challenge.radiologic.io</span>
      </div>
    </div>
  );
}

export function ViewerOgImage({ name, tagline }: { name: string; tagline: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0e0e0e", color: "#f7f7f4", padding: "64px 72px 56px", fontFamily: "Inter" }}>
      <OgBrand />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1030 }}>
        <span style={{ fontSize: 76, lineHeight: 1.02, fontWeight: 600, letterSpacing: -2 }}>{name}</span>
        <span style={{ color: "#c7c8c3", fontSize: 31, lineHeight: 1.18 }}>{tagline}</span>
      </div>
      <OgFooter />
    </div>
  );
}
