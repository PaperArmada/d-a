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

  // Categories view: expand all (persisted pref) to check sidebar parity.
  await page.evaluate(() => {
    localStorage.setItem('sf-nav-view', 'cats');
    localStorage.setItem('sf-expanded', JSON.stringify(window.Registry.grouped().map((g) => g.category)));
  });
  await page.reload();
  await page.waitForTimeout(250);
  const navIds = await page.$$eval('.nav-item[data-id]', (els) => els.map((e) => e.dataset.id));
  // Every non-Reference entry must be reachable from the sidebar (Reference
  // pages — glossary, ascent, feedback inbox — use pinned/widget links).
  const missingNav = meta.filter((m) => m.category !== 'Reference' && navIds.indexOf(m.id) < 0).map((m) => m.id);
  assert(!missingNav.length, `sidebar missing entries: ${missingNav.join(', ')}`);
  // Climb view: expanding every tier shows lessons + the whole catalog.
  const climbCount = await page.evaluate(() => {
    localStorage.setItem('sf-nav-view', 'climb');
    const tiers = window.Ascent.computeTiers().bands.map((_, i) => 'tier:' + i);
    localStorage.setItem('sf-expanded', JSON.stringify(['Lessons'].concat(tiers)));
    return window.Ascent.order().length;
  });
  await page.reload();
  await page.waitForTimeout(250);
  const climbIds = await page.$$eval('.cat .nav-item[data-id]', (els) => els.map((e) => e.dataset.id));
  const lessonsTotal = await page.evaluate(() =>
    (window.Registry.grouped().find((g) => g.category === 'Lessons') || { items: [] }).items.length);
  assert(climbIds.length === climbCount + lessonsTotal,
    `climb sidebar shows ${climbIds.length} items, expected ${climbCount} chain + ${lessonsTotal} lessons`);
  // Collapsed-by-default: fresh profile (climb view) shows group headers,
  // the view tabs, and no item links.
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(INDEX_URL);
  await p2.waitForTimeout(250);
  const fresh = await p2.evaluate(() => ({
    groups: document.querySelectorAll('.cat__title--btn').length,
    items: document.querySelectorAll('.cat .nav-item').length,
    tabs: document.querySelectorAll('.nav-tabs .nav-tab').length
  }));
  assert(fresh.groups >= 5, `fresh sidebar shows only ${fresh.groups} group headers`);
  assert(fresh.items === 0, `fresh sidebar should start collapsed but shows ${fresh.items} items`);
  assert(fresh.tabs === 2, `expected 2 nav view tabs, found ${fresh.tabs}`);
  // Navigating opens the active page's group (its tier, in climb view).
  await p2.goto(INDEX_URL + '#/bst');
  await p2.waitForTimeout(300);
  const autoOpened = await p2.evaluate(() => !!document.querySelector('.cat .nav-item.active'));
  assert(autoOpened, 'active group did not auto-expand for the current page');
  // Ticks must sync live: paging "climb on" within an already-expanded tier
  // must tick the new page without a sidebar rebuild.
  await p2.click('.pager__next');
  await p2.waitForTimeout(250);
  const liveTick = await p2.evaluate(() => ({
    activeTicked: !!document.querySelector('.cat .nav-item.active .nav-item__tick'),
    prevTicked: !!document.querySelector('.cat .nav-item[data-id="bst"] .nav-item__tick')
  }));
  assert(liveTick.activeTicked, 'pager navigation did not tick the new page in the sidebar');
  assert(liveTick.prevTicked, 'previously visited page lost its sidebar tick');
  // Visited marks are the user's: the header toggle clears and restores them.
  const toggled = await p2.evaluate(() => {
    const btn = document.querySelector('.visit-toggle');
    if (!btn) return { ok: false, why: 'toggle missing' };
    const id = location.hash.replace(/^#\//, '');
    btn.click();
    const cleared = !JSON.parse(localStorage.getItem('sf-visited') || '[]').includes(id) &&
      /not visited/i.test(btn.textContent) && /mark/i.test(btn.textContent) &&
      !document.querySelector('.cat .nav-item.active .nav-item__tick');
    btn.click();
    const restored = JSON.parse(localStorage.getItem('sf-visited') || '[]').includes(id);
    return { ok: cleared && restored, why: cleared ? 'did not restore' : 'did not clear' };
  });
  assert(toggled.ok, `visit toggle failed: ${toggled.why}`);
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

  // The chain (docs/ASCENT.md): Ascent.order() must present every ingredient
  // strictly before its dependents, cover the catalog, and drive the pager.
  const chainProblems = await page.evaluate(() => {
    const out = [];
    const chain = window.Ascent.order();
    const pos = {}; chain.forEach((d, i) => { pos[d.id] = i; });
    const ct = window.Ascent.computeTiers();
    chain.forEach((d) => ct.depsOf(d).forEach((dep) => {
      if (!(pos[dep] < pos[d.id])) out.push(`${d.id} presented before its ingredient ${dep}`);
    }));
    const catalog = window.Registry.all().filter((d) => d.category !== 'Lessons' && d.category !== 'Reference');
    if (chain.length !== catalog.length) out.push(`chain has ${chain.length} entries, catalog has ${catalog.length}`);
    if (ct.depsOf(chain[0]).length) out.push('chain does not start with an element');
    return out;
  }).catch((e) => ['chain harness error: ' + e.message]);
  chainProblems.forEach((p) => failures.push('chain: ' + p));
  console.log(chainProblems.length ? 'Chain: FAILED' : 'Chain: topological order verified — no concept before its ingredients ✓');

  // Pager follows the chain: on a mid-chain page, prev/next must be the
  // chain neighbours, and the position label must show climb progress.
  const pagerChain = await page.evaluate(() => {
    const chain = window.Ascent.order();
    const i = chain.findIndex((d) => d.id === 'lru-cache');
    return { prev: '#/' + chain[i - 1].id, next: '#/' + chain[i + 1].id };
  });
  await page.goto(INDEX_URL + '#/lru-cache');
  await page.waitForTimeout(200);
  const pagerDom = await page.evaluate(() => ({
    prev: document.querySelector('.pager__prev') && document.querySelector('.pager__prev').getAttribute('href'),
    next: document.querySelector('.pager__next') && document.querySelector('.pager__next').getAttribute('href'),
    label: (document.querySelector('.pager__hint') || {}).textContent || ''
  }));
  assert(pagerDom.prev === pagerChain.prev, `pager prev is ${pagerDom.prev}, chain says ${pagerChain.prev}`);
  assert(pagerDom.next === pagerChain.next, `pager next is ${pagerDom.next}, chain says ${pagerChain.next}`);
  assert(/on the climb/.test(pagerDom.label), 'pager does not show climb position');

  // Landing leads with the climb; #/index holds the category grid.
  await page.goto(INDEX_URL + '#/');
  await page.waitForTimeout(250);
  const landing = await page.evaluate(() => ({
    bands: document.querySelectorAll('.ascent-band').length,
    cta: !!document.querySelector('.hero-cta')
  }));
  assert(landing.bands >= 4, `landing shows only ${landing.bands} ascent bands — should lead with the climb`);
  assert(landing.cta, 'landing hero CTA missing');
  await page.goto(INDEX_URL + '#/index');
  await page.waitForTimeout(250);
  const indexCards = await page.$$eval('.landing__grid .card', (e) => e.length).catch(() => 0);
  assert(indexCards >= 50, `category index shows only ${indexCards} cards`);
  console.log('Climb-first: landing bands + pager chain + category index ✓');

  // ---- Feedback widget + inbox --------------------------------------------
  await page.goto(INDEX_URL + '#/bst');
  await page.waitForTimeout(200);
  await page.click('.fab');
  await page.waitForTimeout(100);
  const fb1 = await page.evaluate(() => ({
    panelOpen: !!document.querySelector('.fb-panel.open'),
    onPage: (document.querySelector('.fb-panel__page') || {}).textContent || '',
    honest: !!document.querySelector('.fb-panel__lock'),
    saveLabel: (document.querySelector('.fb-panel__save') || {}).textContent || ''
  }));
  assert(fb1.panelOpen, 'feedback panel did not open');
  assert(/Binary Search Tree|BST/i.test(fb1.onPage), `feedback panel mislabels page: "${fb1.onPage}"`);
  assert(fb1.honest, 'feedback panel missing the "stays in this browser" disclaimer');
  assert(/save note/i.test(fb1.saveLabel), `no endpoint configured, yet button says "${fb1.saveLabel}"`);
  await page.fill('.fb-panel__text', 'Test note: the rotation step was unclear.');
  await page.click('.fb-panel__save');
  await page.waitForTimeout(100);
  const fb2 = await page.evaluate(() => ({
    stored: JSON.parse(localStorage.getItem('sf-feedback') || '[]'),
    badge: (document.querySelector('.fab__count') || {}).textContent || ''
  }));
  assert(fb2.stored.length === 1, `expected 1 stored note, found ${fb2.stored.length}`);
  assert(fb2.stored[0] && fb2.stored[0].path === '#/bst', `note tagged with wrong path: ${fb2.stored[0] && fb2.stored[0].path}`);
  assert(fb2.badge === '1', `FAB badge shows "${fb2.badge}", expected "1"`);
  // Typing in the textarea must not trigger global shortcuts ([ ] and /).
  await page.click('.fab');
  await page.waitForTimeout(80);
  await page.focus('.fb-panel__text');
  await page.keyboard.type('[]/');
  await page.waitForTimeout(120);
  const stillOnBst = await page.evaluate(() => location.hash === '#/bst');
  assert(stillOnBst, 'global shortcuts fired while typing in the feedback textarea');
  // Inbox lists the note (FAB hides there); per-note delete empties it.
  await page.goto(INDEX_URL + '#/feedback');
  await page.waitForTimeout(200);
  const inbox = await page.evaluate(() => ({
    notes: document.querySelectorAll('.fb-note').length,
    fabHidden: (document.querySelector('.fb-root') || {}).style.display === 'none',
    actions: document.querySelectorAll('.fb-inbox__actions .btn, .fb-inbox__actions a').length
  }));
  assert(inbox.notes === 1, `inbox shows ${inbox.notes} notes, expected 1`);
  assert(inbox.fabHidden, 'FAB should hide on the inbox page');
  assert(inbox.actions >= 4, `inbox actions missing (found ${inbox.actions})`);
  await page.click('.fb-note__del');
  await page.waitForTimeout(100);
  const emptied = await page.evaluate(() =>
    document.querySelectorAll('.fb-note').length === 0 && !!document.querySelector('.fb-inbox__empty'));
  assert(emptied, 'deleting the note did not empty the inbox');
  console.log('Feedback: honest widget + tagged note + live badge + inbox CRUD ✓');

  await page.goto(INDEX_URL + '#/lru-cache');
  await page.waitForTimeout(200);
  const nav = await page.evaluate(() => ({
    crumbs: !!document.querySelector('.crumbs'),
    pager: document.querySelectorAll('.pager__link').length,
    related: !!document.querySelector('.related'),
    headerGloss: document.querySelectorAll('.main__header .gloss').length
  }));
  assert(nav.crumbs, 'breadcrumbs missing on demo page');
  assert(nav.pager >= 1, 'pager missing on demo page');
  assert(nav.related, 'related (built on / leads to) panel missing on lru-cache');
  assert(nav.headerGloss >= 1, 'demo description has no glossary links');

  // Relations come from the FULL graph: insertion sort has only a conceptual
  // edge (PREREQS → bubble sort), which must still produce a "built on" panel
  // with a readable rationale.
  await page.goto(INDEX_URL + '#/sort-insertion');
  await page.waitForTimeout(200);
  const rel = await page.evaluate(() => ({
    builtOn: [...document.querySelectorAll('.related__group')].map((g) => g.textContent).join(' | '),
    whyItems: document.querySelectorAll('.related__why li').length,
    everyIngredientHasWhy: window.Registry.all()
      .filter((d) => d.category !== 'Lessons' && d.category !== 'Reference')
      .every((d) => window.Ascent.ingredientsOf(d.id).every((r) => r.why && r.why.length > 5))
  }));
  assert(/built on/.test(rel.builtOn) && /Bubble Sort/.test(rel.builtOn),
    `insertion sort missing conceptual "built on" chip (got: ${rel.builtOn})`);
  assert(rel.whyItems >= 1, 'insertion sort has no "why these ingredients" rationale list');
  assert(rel.everyIngredientHasWhy, 'some edge is missing a readable rationale');
  console.log((glossProblems.length ? 'Glossary: FAILED' : 'Glossary: definitions verified, linkify OK, page + strips + pager + crumbs present ✓'));
  console.log('');

  // ---- Per-visualization checks ------------------------------------------
  for (const m of meta) {
    errors = [];
    await page.goto(INDEX_URL + '#/' + m.id);
    await page.waitForTimeout(150);

    const rendered = await page.evaluate(() => {
      const host = document.querySelector('.viz-host');
      return !!host && !!host.querySelector('.stage, svg, table, .grid, .gloss-entry, .ascent-band, .fb-inbox');
    });
    assert(rendered, `[${m.id}] nothing rendered`);

    // Style-guide conformance (docs/DEMOS.md) for catalog demos:
    // a narrating status line exists, and no pill hand-declares atlas
    // relationships ("Used by:") — that's the relations layer's job.
    if (m.category !== 'Lessons' && m.category !== 'Reference') {
      const anatomy = await page.evaluate(() => ({
        status: !!document.querySelector('.viz-host .status'),
        badPills: [...document.querySelectorAll('.viz-host .pill')]
          .map((p) => p.textContent.trim()).filter((t) => /^used by/i.test(t))
      }));
      assert(anatomy.status, `[${m.id}] missing status line (docs/DEMOS.md anatomy)`);
      assert(!anatomy.badPills.length, `[${m.id}] relationship pill belongs in the relations layer: "${anatomy.badPills[0]}"`);
    }

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
