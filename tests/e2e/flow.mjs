// Full booking journey in sample-data mode. Start the app first: npm run build && npm start
import { chromium } from "playwright";
import assert from "node:assert/strict";
const BASE = process.env.BASE ?? "http://localhost:3000", OUT = process.env.OUT;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "light" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !/tile\.openstreetmap|ERR_/.test(m.text()) && errors.push(m.text()));
const shot = async (n) => {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(over <= 0, `${n}: page scrolls sideways by ${over}px`);
  if (OUT) { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${n}.png` }); }
};
const as = async (name) => {
  const out = page.getByRole("link", { name: "Switch person" });
  if (await out.count()) await out.click(); else await page.goto(BASE + "/login");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.waitForURL(/customer|worker|admin/); await page.locator(".dock").waitFor();
};
const slide = async (label) => { await page.getByRole("button", { name: label }).press("Enter"); await page.waitForTimeout(500); };
const click = (name) => page.getByRole("button", { name, exact: true }).click();
const status = async (t) => page.locator(".person .pill", { hasText: t }).waitFor({ timeout: 5000 });

await page.goto(BASE); await page.getByRole("heading", { level: 1 }).waitFor(); await shot("00-landing");
await page.getByRole("link", { name: "Book a worker" }).first().click(); await page.getByText("Nimali Perera").waitFor(); await shot("01-login");
await as("Nimali"); await shot("02-home");
await page.getByRole("link", { name: /Lights and fans/ }).click(); await page.getByText("Lights and fans to install").first().waitFor(); await shot("03-questions");
await click("Continue"); await click("See workers and prices"); await shot("04-workers");
await page.getByRole("button", { name: /^Choose, LKR/ }).first().click(); await shot("05-price");
await page.getByRole("radio", { name: /Card/ }).check({ force: true }); await shot("05b-payment");
await slide("Slide to book"); await page.waitForURL(/bookings$/);
const href = await page.locator(".ticket", { hasText: "Lights and fans" }).first().getAttribute("href");
const id = href.split("/").pop(); await shot("06-bookings");

await as("Kasun"); await shot("07-worker-home");
const job = async () => { await page.locator(`a[href="/worker/jobs/${id}"]`).first().click(); await page.locator(".person").waitFor(); };
const mine = async () => { await page.locator(".dock").getByRole("link", { name: "Bookings" }).click(); await page.locator(`a[href="/customer/bookings/${id}"]`).click(); await page.locator(".person").waitFor(); };
await job(); await shot("08-request");
await slide("Slide to accept"); await status("Agree a date");
await page.locator(".strip button").first().click(); await page.getByLabel("Time (Sri Lanka)").fill("23:59");
await click("Suggest this date"); await page.getByText(/You suggested/).waitFor();
await page.getByLabel("Message", { exact: true }).fill("See you tonight"); await click("Send"); await page.locator(".chat .mine").waitFor();

await as("Nimali"); await mine(); await shot("09-date"); await click("Accept date"); await status("Scheduled");
await as("Kasun"); await job(); await slide("Slide when you set off"); await status("On the way");
await click("Simulate movement"); await page.getByText(/km away/).waitFor(); await page.waitForTimeout(1200);
await as("Nimali"); await mine(); await page.locator(".pin.van").waitFor(); await shot("10-tracking");
await as("Kasun"); await job(); await slide("Slide when you arrive"); await status("Arrived");
await slide("Slide to mark completed"); await status("Check the work");
await as("Nimali"); await mine(); await slide("Slide to confirm"); await status("Completed");
await click("Pay LKR 2,408 (test)"); await page.getByText("Paid by card").waitFor(); await shot("10b-paid");
await click("5 stars"); await click("LKR 500"); await click("Save review"); await page.getByText("Review: 5 out of 5").waitFor(); await shot("11-reviewed");

await as("Kasun"); await page.locator(".dock").getByRole("link", { name: "Wallet" }).click(); await shot("11b-wallet");
await as("Tharushi"); await shot("12-admin");
await page.locator(".dock").getByRole("link", { name: "Payments" }).click(); await shot("12b-finance");
await click("Approve payment"); await page.getByText("No payments to check").waitFor();
await page.locator(".dock").getByRole("link", { name: "Workers" }).click(); await page.getByRole("button", { name: /Dinesh/ }).click(); await shot("12c-workers"); await click("Approve"); await page.getByText("No workers here").waitFor();
await page.locator(".dock").getByRole("link", { name: "Bookings" }).click(); await page.locator(".rowbtn").first().click(); await shot("13-disputes");
await page.getByLabel("Resolution note").fill("Agreed with both sides."); await click("Close as completed"); await page.getByText("Nothing in this list").waitFor();
await as("Dinesh"); await page.getByText("Earned this month").waitFor();

// Dark and desktop views
await page.emulateMedia({ colorScheme: "dark" });
await as("Nimali"); await shot("14-dark-home");
await page.locator(".dock").getByRole("link", { name: "Bookings" }).click(); await page.getByRole("button", { name: "History" }).click(); await shot("15-dark-bookings");
await as("Kasun"); await shot("16-dark-worker");
await page.setViewportSize({ width: 1440, height: 900 });
await shot("17-desktop-worker-dark");
await page.emulateMedia({ colorScheme: "light" });
await as("Tharushi"); await shot("18-desktop-admin");
for (const [tab, file] of [["Workers", "18b"], ["Customers", "18c"], ["Bookings", "18d"], ["Payments", "18e"], ["Staff", "18f"]]) {
  await page.locator(".dock").getByRole("link", { name: tab }).click(); await page.locator("h1", { hasText: tab }).waitFor();
  if (tab === "Workers") { await click("Approved (5)"); await page.locator(".rowbtn").first().click(); }
  await shot(`${file}-desktop-${tab.toLowerCase()}`);
}
await as("Nimali"); await shot("19-desktop-home");
await page.getByRole("link", { name: "Switch person" }).click(); await shot("20-desktop-login");
await page.goto(BASE); await shot("21-desktop-landing"); if (OUT) await page.screenshot({ path: `${OUT}/21-full.png`, fullPage: true });
await page.emulateMedia({ colorScheme: "dark" }); await shot("22-desktop-landing-dark"); await page.emulateMedia({ colorScheme: "light" });
const manifest = await (await page.request.get(BASE + "/manifest.webmanifest")).json();
assert.equal(manifest.display, "standalone");
for (const i of manifest.icons) assert.equal((await page.request.get(BASE + i.src)).status(), 200);
assert.equal((await page.request.get(BASE + "/.well-known/assetlinks.json")).status(), 200);
await page.waitForFunction(() => navigator.serviceWorker.controller || navigator.serviceWorker.ready.then(() => true));
await page.setViewportSize({ width: 320, height: 700 });
await shot("narrow-landing");
for (const n of ["Nimali", "Kasun", "Tharushi"]) { await as(n); await shot(`narrow-${n}`); }
// The cache must hold only public files, never pages or data
const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (k) => (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname)))).flat());
assert.ok(cached.length && cached.every((p) => /^\/(_next\/static|icons)\/|^\/offline\.html$/.test(p)), cached.join());
assert.deepEqual(errors, []);
console.log("END TO END PASSED");
await browser.close();
