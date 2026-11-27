// Draws the logo and writes every icon from it. Run: node scripts/gen-icons.mjs (needs Playwright)
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

// A tick whose long arm ends in a spanner jaw: the job, done.
export const MARK = `<mask id="jaw" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="#fff"/><path d="M45.5 18.5 L47 14.5 L57 2 L64 9 L51.5 19 L47.500 20.500 Z" fill="#000"/></mask>`;
const mark = (c) => `<g mask="url(#jaw)" fill="${c}" stroke="${c}"><path d="M13 34 L25 46 L45 22" fill="none" stroke-width="10.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="46" cy="19.500" r="11.500" stroke="none"/></g>`;
const svg = (scale, radius) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${MARK}<rect width="64" height="64" rx="${radius}" fill="#5b45c8"/><g transform="translate(32 32) scale(${scale}) translate(-32.500 -30)">${mark("#c6f432")}</g></svg>`;

mkdirSync("public/icons", { recursive: true });
writeFileSync("app/icon.svg", svg(0.92, 18));
const b = await chromium.launch(), p = await b.newPage();
for (const [file, size, scale, radius] of [["public/icons/icon-192.png", 192, 0.92, 18], ["public/icons/icon-512.png", 512, 0.92, 18], ["public/icons/maskable-512.png", 512, 0.74, 0], ["app/apple-icon.png", 180, 0.86, 0]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg(scale, radius)}`);
  await p.screenshot({ path: file, omitBackground: true });
}
await b.close();
