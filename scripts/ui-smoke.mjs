// Headless-Chrome smoke test of the admin console against a running backend (dev profile data).
//   npm run build && npm run preview -- --port 4173      (in one terminal)
//   node scripts/ui-smoke.mjs                             (in another)
// Signs in as the dev admin, visits every page, fails on console errors / failed API calls and saves screenshots.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.env.UI_URL ?? "http://localhost:4173";
const OUT = process.env.SHOT_DIR ?? path.resolve("screenshots");
const CHROME =
  process.env.CHROME_PATH ??
  ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome"].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error("Set CHROME_PATH to a Chrome/Edge executable");
fs.mkdirSync(OUT, { recursive: true });

const problems = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource/.test(m.text())) problems.push(`console: ${m.text()}`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("response", (r) => {
  if (r.url().includes("/api/") && r.status() >= 400 && !r.url().includes("/auth/login")) problems.push(`${r.status()} ${r.request().method()} ${r.url()}`);
});

const shot = async (name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
const settle = () => new Promise((r) => setTimeout(r, 900));

await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
await shot("00-login");
await page.type("#phone", "0900000000");
await page.type("#password", "Admin@12345");
await page.click("button[type=submit]");
try {
  await page.waitForSelector("nav[aria-label=Main]", { timeout: 8000 });
} catch {
  const alert = await page.$eval("[role=alert]", (el) => el.textContent).catch(() => "no alert shown");
  await shot("00-login-failed");
  throw new Error(`Sign-in did not reach the console (${page.url()}): ${alert}; ${problems.join(" | ")}`);
}
await settle();

const routes = [
  ["01-overview", "/"], ["02-verification", "/verification"], ["03-users", "/users"], ["04-orders", "/orders"],
  ["05-deliveries", "/deliveries"], ["06-payments", "/payments"], ["07-disputes", "/disputes"], ["08-listings", "/listings"],
  ["09-catalogue", "/listings?tab=catalogue"], ["10-notifications", "/notifications"], ["11-reports", "/reports"], ["12-settings", "/settings"],
];
for (const [name, route] of routes) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
  await settle();
  await shot(name);
  const text = await page.evaluate(() => document.body.innerText);
  if (/Could not load this/.test(text)) problems.push(`${route}: shows an error state`);
}

// Drill into the first order, the first dispute and the first pending verification (DOM clicks: row handlers).
async function drill(listRoute, expectedPrefix, shotName) {
  await page.goto(`${BASE}${listRoute}`, { waitUntil: "networkidle0" });
  await settle();
  const clicked = await page.evaluate(() => {
    const target = document.querySelector("table.ds-table tbody tr.clickable") ?? document.querySelector("button[aria-current]");
    if (!target) return false;
    (target.querySelector("b") ?? target).click();
    return true;
  });
  if (!clicked) return problems.push(`${listRoute}: nothing to open (seed the demo orders first)`);
  await settle();
  if (expectedPrefix && !page.url().includes(expectedPrefix)) problems.push(`${listRoute}: click did not open ${expectedPrefix} (at ${page.url()})`);
  await page.waitForNetworkIdle().catch(() => undefined);
  await shot(shotName);
}
await drill("/orders", "/orders/", "13-order-detail");
await drill("/disputes", "/disputes/", "14-dispute-detail");
await drill("/verification", null, "15-verification-detail");
await browser.close();

if (problems.length) {
  console.error("UI smoke test found problems:\n- " + [...new Set(problems)].join("\n- "));
  process.exit(1);
}
console.log(`UI smoke test passed. Screenshots in ${OUT}`);
