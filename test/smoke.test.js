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

  // Categories start collapsed; expand all (persisted pref) to check parity.
  await page.evaluate(() => {
    localStorage.setItem('sf-expanded', JSON.stringify(window.Registry.grouped().map((g) => g.category)));
  });
  await page.reload();
  await page.waitForTimeout(250);
  const navIds = await page.$$eval('.nav-item[data-id]', (els) => els.map((e) => e.dataset.id));
  // +1: the pinned Ascent link duplicates the ascent entry (glossary is pinned-only).
  assert(navIds.length >= ids.length, `sidebar shows ${navIds.length} items but registry has ${ids.length}`);
  // Collapsed-by-default: fresh profile shows category headers but no item links.
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(INDEX_URL);
  await p2.waitForTimeout(250);
  const fresh = await p2.evaluate(() => ({
    cats: document.querySelectorAll('.cat__title--btn').length,
    items: document.querySelectorAll('.cat .nav-item').length
  }));
  assert(fresh.cats >= 10, `fresh sidebar shows only ${fresh.cats} category headers`);
  assert(fresh.items === 0, `fresh sidebar should start collapsed but shows ${fresh.items} items`);
  // Navigating opens the active page's category automatically.
  await p2.goto(INDEX_URL + '#/bst');
  await p2.waitForTimeout(300);
  const autoOpened = await p2.evaluate(() => !!document.querySelector('.cat .nav-item.active'));
  assert(autoOpened, 'active category did not auto-expand for the current page');
  await ctx2.close();

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

  // ---- Glossary & navigation QoL checks -----------------------------------
  const glossProblems = await page.evaluate(() => {
    const out = window.Glossary.verify();
    // linkify produces spans and every produced term resolves
    const html = window.Glossary.linkify('The call stack uses recursion and a queue with big-O costs.');
    if ((html.match(/class="gloss"/g) || []).length < 3) out.push('linkify produced too few terms');
    (html.match(/data-term="([^"]+)"/g) || []).forEach((m) => {
      const t = m.slice(11, -1);
      if (!window.Glossary.TERMS[t]) out.push('linkify produced unknown term: ' + t);
    });
    return out;
  }).catch((e) => ['glossary harness error: ' + e.message]);
  glossProblems.forEach((p) => failures.push('glossary: ' + p));

  // Glossary page renders entries; lesson pages get term strips + gloss spans;
  // viz pages get breadcrumbs and a pager.
  await page.goto(INDEX_URL + '#/glossary');
  await page.waitForTimeout(200);
  const gcount = await page.$$eval('.gloss-entry', (e) => e.length).catch(() => 0);
  assert(gcount >= 40, `glossary page shows only ${gcount} entries`);

  await page.goto(INDEX_URL + '#/lesson-systems');
  await page.waitForTimeout(300);
  const lessonQoL = await page.evaluate(() => ({
    strip: document.querySelectorAll('.lesson-terms .gloss').length,
    inline: document.querySelectorAll('.lesson-prose .gloss').length,
    badTerms: [...document.querySelectorAll('.gloss')].map((g) => g.dataset.term)
      .filter((t) => !window.Glossary.TERMS[t])
  }));
  assert(lessonQoL.strip >= 5, `lesson term strip has only ${lessonQoL.strip} chips`);
  assert(lessonQoL.inline >= 2, `lesson prose has only ${lessonQoL.inline} inline gloss links`);
  assert(!lessonQoL.badTerms.length, `lesson uses unknown glossary terms: ${lessonQoL.badTerms.join(', ')}`);

  // Ascent: ordering must be acyclic and tier-monotonic; page must render bands.
  const ascentProblems = await page.evaluate(() => window.Ascent.verify())
    .catch((e) => ['ascent harness error: ' + e.message]);
  ascentProblems.forEach((p) => failures.push('ascent: ' + p));
  await page.goto(INDEX_URL + '#/ascent');
  await page.waitForTimeout(250);
  const asc = await page.evaluate(() => ({
    bands: document.querySelectorAll('.ascent-band').length,
    cards: document.querySelectorAll('.ascent-card').length,
    elements: document.querySelectorAll('.ascent-card__deps--elem').length
  }));
  assert(asc.bands >= 4, `ascent has only ${asc.bands} tiers`);
  assert(asc.cards >= 50, `ascent shows only ${asc.cards} cards`);
  assert(asc.elements >= 5, `ascent base camp has only ${asc.elements} elements`);
  console.log(ascentProblems.length ? 'Ascent: FAILED' : `Ascent: ${asc.bands} tiers over ${asc.cards} entries, ordering verified ✓`);

  await page.goto(INDEX_URL + '#/lru-cache');
  await page.waitForTimeout(200);
  const nav = await page.evaluate(() => ({
    crumbs: !!document.querySelector('.crumbs'),
    pager: document.querySelectorAll('.pager__link').length,
    related: !!document.querySelector('.related'),
    headerGloss: document.querySelectorAll('.main__header .gloss').length
  }));
  assert(nav.crumbs, 'breadcrumbs missing on viz page');
  assert(nav.pager >= 1, 'pager missing on viz page');
  assert(nav.related, 'related (built from / used by) panel missing on lru-cache');
  assert(nav.headerGloss >= 1, 'viz description has no glossary links');
  console.log((glossProblems.length ? 'Glossary: FAILED' : 'Glossary: definitions verified, linkify OK, page + strips + pager + crumbs present ✓'));
  console.log('');

  // ---- Per-visualization checks ------------------------------------------
  for (const m of meta) {
    errors = [];
    await page.goto(INDEX_URL + '#/' + m.id);
    await page.waitForTimeout(150);

    const rendered = await page.evaluate(() => {
      const host = document.querySelector('.viz-host');
      return !!host && !!host.querySelector('.stage, svg, table, .grid, .gloss-entry, .ascent-band');
    });
    assert(rendered, `[${m.id}] nothing rendered`);

    // Player step: click the Step-forward button and confirm the progress
    // label *in its own .controls* advances. Scoping to the same controls
    // avoids confusion on lesson pages, which show both a lesson step counter
    // and the embedded visualization's own player.
    const next = await page.$('.viz-host .btn[title="Step forward"]');
    if (next) {
      const readIdx = (b) => b.evaluate((btn) => {
        const c = btn.closest('.controls');
        const p = [...c.querySelectorAll('.mono.dim')].find((e) => /\d+\s*\/\s*\d+/.test(e.textContent));
        return p ? { i: parseInt(p.textContent.split('/')[0], 10), n: parseInt(p.textContent.split('/')[1], 10) } : null;
      });
      const before = await readIdx(next);
      // Some viz start with a single frame (e.g. AVL waits for an insert).
      if (before && before.n > 1) {
        await next.click().catch(() => {});
        await page.waitForTimeout(60);
        const after = await readIdx(next);
        assert(after && after.i >= 2, `[${m.id}] step forward did not advance (index ${after && after.i})`);
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
