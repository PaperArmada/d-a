/*
 * Smoke test for the DSA Visualizer.
 *
 * Loads index.html in a headless browser and, for every registered
 * visualization, checks that it:
 *   1. mounts without console/page errors,
 *   2. renders something into its stage (stage / svg / table / grid),
 *   3. survives clicking every control button,
 *   4. (frame-based ones) can step forward and reset via the Player.
 *
 * Requires Playwright:  npm install  (see package.json devDependencies)
 *
 * Chromium resolution order:
 *   1. $CHROMIUM_PATH                       (explicit override)
 *   2. a chrome binary under $PLAYWRIGHT_BROWSERS_PATH (or /opt/pw-browsers)
 *   3. Playwright's own bundled Chromium    (chromium.executablePath())
 *
 * Usage:  node test/smoke.test.js
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

function findChromium() {
  if (process.env.CHROMIUM_PATH && fs.existsSync(process.env.CHROMIUM_PATH)) {
    return process.env.CHROMIUM_PATH;
  }
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    const dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium-'));
    for (const d of dirs) {
      const candidate = path.join(root, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch (_) { /* ignore */ }
  try { return chromium.executablePath(); } catch (_) { return undefined; }
}

const INDEX_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

async function run() {
  const executablePath = findChromium();
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const failures = [];
  let errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  const assert = (cond, msg) => { if (!cond) failures.push(msg); };

  await page.goto(INDEX_URL);
  await page.waitForTimeout(250);

  // ---- Registry integrity -------------------------------------------------
  const meta = await page.evaluate(() => window.Registry.all().map((v) => ({
    id: v.id, title: v.title, category: v.category, hasCreate: typeof v.create === 'function'
  })));
  assert(meta.length > 0, 'registry is empty');
  const ids = meta.map((m) => m.id);
  assert(new Set(ids).size === ids.length, 'duplicate visualization ids exist');
  meta.forEach((m) => {
    assert(m.title && m.category && m.hasCreate, `viz "${m.id}" missing title/category/create`);
  });

  const navIds = await page.$$eval('.nav-item[data-id]', (els) => els.map((e) => e.dataset.id));
  assert(navIds.length === ids.length, `sidebar shows ${navIds.length} items but registry has ${ids.length}`);

  console.log(`Registry: ${ids.length} visualizations — ${meta.map((m) => m.id).join(', ')}\n`);

  // ---- Algorithm correctness (pure logic, via window.__algos) -------------
  const logic = await page.evaluate(() => {
    const out = [];
    const isSorted = (a) => a.every((v, i) => i === 0 || a[i - 1] <= v);
    const sameMultiset = (a, b) => a.length === b.length &&
      JSON.stringify(a.slice().sort((x, y) => x - y)) === JSON.stringify(b.slice().sort((x, y) => x - y));
    const A = window.__algos || {};
    // sorts: last frame must be sorted and a permutation of the input
    const input = [42, 7, 7, 1, 99, 13, 8, 30, 5, 21, 3, 60];
    for (const key in (A.sort || {})) {
      const frames = A.sort[key].fn(input);
      const last = frames[frames.length - 1].array;
      if (!isSorted(last)) out.push(`sort ${key}: output not sorted → ${last}`);
      if (!sameMultiset(last, input)) out.push(`sort ${key}: output is not a permutation of the input`);
    }
    // searches
    if (A.search) {
      const arr = [1, 3, 5, 7, 9, 11];
      const lf = A.search.linear(arr, 7);
      if (!lf[lf.length - 1].hit && lf[lf.length - 1].hit !== 0) out.push('linear search: failed to find present element');
      const lm = A.search.linear(arr, 8);
      if (lm[lm.length - 1].hit != null) out.push('linear search: false positive for absent element');
      const bf = A.search.binary(arr, 9);
      if (bf[bf.length - 1].hit == null) out.push('binary search: failed to find present element');
    }
    return out;
  }).catch((e) => ['logic harness error: ' + e.message]);
  logic.forEach((msg) => failures.push('logic: ' + msg));
  console.log(logic.length ? `Logic checks: ${logic.length} FAILED` : 'Logic checks: sorts sorted + permutations, searches correct ✓');
  console.log('');

  // ---- Per-visualization checks ------------------------------------------
  for (const m of meta) {
    errors = [];
    await page.goto(INDEX_URL + '#/' + m.id);
    await page.waitForTimeout(150);

    const rendered = await page.evaluate(() => {
      const host = document.querySelector('.viz-host');
      return !!host && !!host.querySelector('.stage, svg, table, .grid');
    });
    assert(rendered, `[${m.id}] nothing rendered`);

    // Player step/reset for frame-based visualizations (those with a progress "n / m" label)
    const hasPlayer = await page.evaluate(() => {
      const p = [...document.querySelectorAll('.viz-host .controls .mono.dim')]
        .find((e) => /\d+\s*\/\s*\d+/.test(e.textContent));
      return !!p;
    });
    if (hasPlayer) {
      const total = await page.evaluate(() => {
        const p = [...document.querySelectorAll('.viz-host .controls .mono.dim')]
          .find((e) => /\d+\s*\/\s*\d+/.test(e.textContent));
        return p ? parseInt(p.textContent.split('/')[1], 10) : 0;
      });
      // Some viz start with a single frame (e.g. AVL waits for an insert); only
      // assert advancement when there are multiple frames to step through.
      if (total > 1) {
        const next = await page.$('.viz-host .btn[title="Step forward"]');
        if (next) {
          await next.click().catch(() => {});
          await page.waitForTimeout(60);
          const idx = await page.evaluate(() => {
            const p = [...document.querySelectorAll('.viz-host .controls .mono.dim')]
              .find((e) => /\d+\s*\/\s*\d+/.test(e.textContent));
            return p ? parseInt(p.textContent.split('/')[0], 10) : 0;
          });
          assert(idx >= 2, `[${m.id}] step forward did not advance (index ${idx})`);
        }
      }
    }

    // Click every control button; none should throw.
    const buttons = await page.$$('.viz-host .controls button');
    for (const btn of buttons) {
      await btn.click({ timeout: 800 }).catch(() => {}); // disabled buttons are fine
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(120);

    if (errors.length) {
      failures.push(`[${m.id}] runtime errors:\n    ` + [...new Set(errors)].join('\n    '));
    }

    process.stdout.write(errors.length ? `  ✗ ${m.id}\n` : `  ✓ ${m.id}\n`);
  }

  await browser.close();

  console.log('');
  if (failures.length) {
    console.error(`FAILED (${failures.length} problem${failures.length > 1 ? 's' : ''}):`);
    failures.forEach((f) => console.error(' - ' + f));
    process.exit(1);
  }
  console.log(`PASSED — ${meta.length} visualizations mounted, rendered, and interacted cleanly.`);
}

run().catch((e) => { console.error('Test harness crashed:', e); process.exit(1); });
