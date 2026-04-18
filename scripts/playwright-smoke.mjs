import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOGIN_EMAIL = process.env.LOGIN_EMAIL || 'dev@local';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || 'devpassword';
const PHASE = process.env.PHASE || 'adhoc';

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const PAGES = [
  { path: '/admin/login', needsAuth: false, heading: /sign in|log in/i },
  { path: '/admin',               needsAuth: true, heading: /dashboard/i },
  { path: '/admin/collection',    needsAuth: true, heading: /collection/i },
  { path: '/admin/targets',       needsAuth: true, heading: /targets/i },
  { path: '/admin/trade-binder',  needsAuth: true, heading: /trade binder/i },
  { path: '/admin/add-cards',     needsAuth: true, heading: /add cards/i },
  { path: '/admin/ledger',        needsAuth: true, heading: /ledger/i },
  { path: '/admin/users',         needsAuth: true, heading: /team|users/i },
  { path: '/admin/settings',      needsAuth: true, heading: /settings/i },
];

const ERROR_PATTERN = /\b(error|exception|cannot|undefined|NaN)\b/i;

async function runViewport(name, viewport) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const screenshotDir = path.join('docs/superpowers/screenshots', `phase-${PHASE}`);
  await mkdir(screenshotDir, { recursive: true });

  const results = [];

  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type=email], input[name=email]', LOGIN_EMAIL);
  await page.fill('input[type=password], input[name=password]', LOGIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/admin/, { timeout: 10_000 }).catch(() => {});

  for (const spec of PAGES) {
    consoleErrors.length = 0;
    pageErrors.length = 0;
    const result = { path: spec.path, viewport: name, ok: true, reasons: [] };
    try {
      const response = await page.goto(`${BASE_URL}${spec.path}`, { waitUntil: 'networkidle', timeout: 15_000 });
      if (!response) { result.ok = false; result.reasons.push('no response'); }
      else if (response.status() >= 400) { result.ok = false; result.reasons.push(`HTTP ${response.status()}`); }

      const headingText = await page.locator('h1, h2').first().innerText().catch(() => '');
      if (!spec.heading.test(headingText)) {
        result.ok = false;
        result.reasons.push(`heading mismatch: got "${headingText}"`);
      }

      if (consoleErrors.length > 0) { result.ok = false; result.reasons.push(`${consoleErrors.length} console errors`); }
      if (pageErrors.length > 0) { result.ok = false; result.reasons.push(`${pageErrors.length} page errors`); }

      const bodyText = await page.locator('body').innerText();
      const placeholderPattern = /placeholder|aria-placeholder/i;
      const nonPlaceholderBody = bodyText.split('\n').filter(l => !placeholderPattern.test(l)).join('\n');
      if (ERROR_PATTERN.test(nonPlaceholderBody)) {
        result.ok = false;
        result.reasons.push('error text visible in body');
      }

      const focusable = await page.locator('button, a, input, select, textarea, [tabindex]').count();
      if (focusable === 0) { result.ok = false; result.reasons.push('no focusable elements'); }

      if (name === 'mobile') {
        const bodyOverflow = await page.evaluate(() => {
          const b = document.body;
          return b.scrollWidth - b.clientWidth;
        });
        if (bodyOverflow > 1) { result.ok = false; result.reasons.push(`body horizontal overflow ${bodyOverflow}px`); }
      }

      const safeName = spec.path.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'root';
      await page.screenshot({ path: path.join(screenshotDir, `${safeName}.${name}.png`), fullPage: true });
    } catch (err) {
      result.ok = false;
      result.reasons.push(`exception: ${err.message}`);
    }
    results.push(result);
  }

  await browser.close();
  return results;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const runDesktop = !args.has('--mobile-only');
  const runMobile = !args.has('--desktop-only');

  const all = [];
  if (runDesktop) all.push(...await runViewport('desktop', VIEWPORTS.desktop));
  if (runMobile) all.push(...await runViewport('mobile', VIEWPORTS.mobile));

  const failed = all.filter(r => !r.ok);
  for (const r of all) {
    const marker = r.ok ? '[OK]' : '[FAIL]';
    console.log(`${marker} ${r.viewport.padEnd(7)} ${r.path}${r.ok ? '' : '  ' + r.reasons.join('; ')}`);
  }
  console.log(`\n${all.length - failed.length}/${all.length} smoke checks passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
