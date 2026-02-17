import { chromium } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 }
];

const base = process.env.NOTEJOB_BASE_URL || "http://127.0.0.1:4321";

const browser = await chromium.launch({ headless: true });
for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.screenshot({ path: `./responsive-${vp.name}-home.png`, fullPage: true });
  await page.goto(`${base}/app`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `./responsive-${vp.name}-app.png`, fullPage: true });
  await context.close();
}
await browser.close();

console.log(`Responsive snapshots generated for ${base}`);
