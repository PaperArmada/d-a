/* The Ascent — the site's primary structure: a dependency-ordered climb.
   Elements sit at base camp (Tier 0); every higher tier is built only from
   concepts below it. Tiers are COMPUTED, not hand-drawn: composition edges
   come from each entry's madeOf, and this file adds the conceptual
   prerequisites (the curriculum lives here, in one reviewable map).
   Construction rules are recorded in docs/ASCENT.md — the invariant:
   a concept is never presented before all of its ingredients.
   Ascent.order() is the single source of the canonical linear chain. */
(function (global) {
  'use strict';
  const { el, clear } = global.DOM;

  // Conceptual prerequisites (in addition to structural madeOf edges).
  const PREREQS = {
    // The Machine
    'float-rep': ['binary-rep'], 'utf8': ['binary-rep'],   // (bitwise declares binary-rep via madeOf)
    // Runtime
    'call-stack': ['stack'], 'race-condition': ['call-stack'],
    // ADS
    'search-binary': ['search-linear'],
    'sort-insertion': ['sort-bubble'], 'sort-selection': ['sort-bubble'],
    'sort-merge': ['sort-bubble', 'call-stack'], 'sort-quick': ['sort-bubble', 'call-stack'],
    'sort-heap': ['sort-bubble', 'heap'], 'sort-race': ['sort-merge', 'sort-quick'],
    'bst': ['linked-list'], 'avl': ['bst'], 'btree': ['bst'], 'trie': ['linked-list'],
    'heap': ['bst'], 'hash-table': ['linked-list'], 'union-find': ['linked-list'],
    'graph-bfs': ['queue'], 'graph-dfs': ['stack'],
    'dijkstra': ['graph-bfs', 'heap'], 'graph-builder': ['graph-bfs', 'graph-dfs'],
    'pathfinding': ['graph-bfs'], 'path-race': ['pathfinding', 'dijkstra'],
    'hanoi': ['call-stack'], 'fib-tree': ['call-stack'],
    'lcs': ['fib-tree'], 'edit-distance': ['lcs'], 'knapsack': ['lcs'],
    // Patterns & systems
    'observer': ['state-machine'], 'tcp': ['state-machine'], 'token-bucket': ['queue']
  };

  function catalog() {
    return global.Registry.all().filter((d) => d.category !== 'Lessons' && d.category !== 'Reference');
  }
  function depsOf(d, ids) {
    return (d.madeOf || []).concat(PREREQS[d.id] || []).filter((x, i, a) => ids.has(x) && a.indexOf(x) === i);
  }

  /* Longest-path layering: tier(x) = 0 if no deps, else 1 + max(tier(deps)). */
  function computeTiers() {
    const items = catalog();
    const ids = new Set(items.map((d) => d.id));
    const byId = {}; items.forEach((d) => { byId[d.id] = d; });
    const tier = {}; const visiting = new Set(); const problems = [];
    function t(id) {
      if (tier[id] != null) return tier[id];
      if (visiting.has(id)) { problems.push('cycle involving ' + id); return 0; }
      visiting.add(id);
      const ds = depsOf(byId[id], ids);
      tier[id] = ds.length ? 1 + Math.max.apply(null, ds.map(t)) : 0;
      visiting.delete(id);
      return tier[id];
    }
    items.forEach((d) => t(d.id));
    const maxT = Math.max.apply(null, Object.keys(tier).map((k) => tier[k]));
    const bands = [];
    for (let i = 0; i <= maxT; i++) {
      bands.push(items.filter((d) => tier[d.id] === i)
        .sort(function (a, b) {   // P4 tie-break: curriculum category order, then title
          const ra = global.Registry.categoryRank(a.category), rb = global.Registry.categoryRank(b.category);
          return ra !== rb ? ra - rb : a.title.localeCompare(b.title);
        }));
    }
    return { tier, bands, problems, depsOf: (d) => depsOf(d, ids), byId };
  }

  /* The canonical chain (docs/ASCENT.md P4): tier ascending, then curriculum
     category order, then title. Everything that walks the site linearly —
     pager, [ ] keys, "continue the climb" — must consume this, never a
     private copy of the sort. */
  let chainCache = null;
  function order() {
    if (!chainCache) {
      chainCache = [];
      computeTiers().bands.forEach((b) => b.forEach((d) => chainCache.push(d)));
    }
    return chainCache.slice();
  }
  function firstUnvisited() {
    const seen = visitedSet();
    return order().find((d) => !seen.has(d.id)) || null;
  }

  function verify() {
    const ct = computeTiers();
    const { tier, problems, depsOf } = ct;
    catalog().forEach(function (d) {
      depsOf(d).forEach(function (dep) {
        if (!(tier[dep] < tier[d.id])) problems.push('tier not monotonic: ' + d.id + ' (T' + tier[d.id] + ') dep ' + dep + ' (T' + tier[dep] + ')');
      });
    });
    Object.keys(PREREQS).forEach(function (id) {
      if (!global.Registry.get(id)) problems.push('prereq map: unknown entry ' + id);
      PREREQS[id].forEach(function (p) {
        if (!global.Registry.get(p)) problems.push('prereq map: unknown dep ' + p + ' for ' + id);
        // P1 — if the edge is structural (madeOf), don't also declare it here.
        const def = global.Registry.get(id);
        if (def && (def.madeOf || []).indexOf(p) >= 0) problems.push('duplicate edge: ' + id + ' → ' + p + ' is already in madeOf');
      });
    });
    // P4/P6.4 — the chain itself must be a valid topological order: every
    // ingredient strictly earlier than its dependent (THE invariant).
    const chain = order();
    const pos = {}; chain.forEach((d, i) => { pos[d.id] = i; });
    chain.forEach(function (d) {
      depsOf(d).forEach(function (dep) {
        if (!(pos[dep] < pos[d.id])) problems.push('chain broken: ' + dep + ' is presented after ' + d.id + ' which needs it');
      });
    });
    if (chain.length !== catalog().length) problems.push('chain does not cover the whole catalog');
    // P2/P6.5 — minimality: a conceptual prerequisite already implied by the
    // entry's other ingredients is noise and must be removed.
    function reaches(fromId, targetId) {
      const seen = new Set(); const st = [fromId];
      while (st.length) {
        const x = st.pop();
        if (x === targetId) return true;
        if (seen.has(x) || !ct.byId[x]) continue;
        seen.add(x);
        depsOf(ct.byId[x]).forEach((n) => st.push(n));
      }
      return false;
    }
    Object.keys(PREREQS).forEach(function (id) {
      if (!ct.byId[id]) return;
      const all = depsOf(ct.byId[id]);
      PREREQS[id].forEach(function (p) {
        if (all.filter((x) => x !== p).some((o) => reaches(o, p))) {
          problems.push('redundant prerequisite: ' + id + ' → ' + p + ' (already implied by another ingredient)');
        }
      });
    });
    return problems;
  }

  function visitedSet() {
    try { return new Set(JSON.parse(localStorage.getItem('sf-visited') || '[]')); } catch (e) { return new Set(); }
  }

  const TIER_NAMES = [
    'Base camp — the elements', 'First ascent — one idea on another', 'Compounds',
    'Higher compounds', 'The machinery', 'The summit'
  ];
  const TIER_BLURBS = [
    'Atomic concepts with no prerequisites. Everything above is built from these.',
    'Each of these leans on exactly one layer below.',
    'Real mechanisms assembled from the elements.',
    'Combinations of combinations — this is where software starts looking like software.',
    'Systems you use every day, now decomposable at a glance.',
    'The view from the top.'
  ];

  function tierName(i) { return TIER_NAMES[Math.min(i, TIER_NAMES.length - 1)]; }

  /* Shared climb renderer — used by the registered Ascent page AND the
     landing page (which leads with the climb). opts.cta toggles the inline
     "continue" button (the landing has its own hero CTA). */
  function renderClimb(container, opts) {
    opts = opts || {};
    const { bands, depsOf } = computeTiers();
    const seen = visitedSet();
    let total = 0, done = 0;
    bands.forEach((b) => b.forEach((d) => { total++; if (seen.has(d.id)) done++; }));

    const nxt = firstUnvisited();
    container.appendChild(el('div.ascent-progress', [
      el('div.ascent-progress__bar', [el('div.ascent-progress__fill', { style: { width: (total ? Math.round(done / total * 100) : 0) + '%' } })]),
      el('span.mono.dim', done + ' / ' + total + ' visited'),
      (opts.cta !== false && nxt)
        ? el('a.btn.btn--primary.ascent-cta', { href: '#/' + nxt.id }, (done ? '⛏ Continue the climb — ' : '⛏ Start the climb — ') + nxt.title)
        : null
    ]));

    bands.forEach(function (band, i) {
      if (!band.length) return;
      const bandEl = el('div.ascent-band', [
        el('div.ascent-band__head', [
          el('span.ascent-band__tier', 'Tier ' + i),
          el('span.ascent-band__name', tierName(i)),
          el('span.ascent-band__blurb', TIER_BLURBS[Math.min(i, TIER_BLURBS.length - 1)])
        ]),
        el('div.ascent-grid', band.map(function (d) {
          const ds = depsOf(d);
          return el('a.ascent-card' + (seen.has(d.id) ? '.visited' : ''), { href: '#/' + d.id }, [
            el('div.ascent-card__top', [
              el('span.card__tag', d.category),
              seen.has(d.id) ? el('span.ascent-card__tick', '✓') : null
            ]),
            el('div.ascent-card__title', d.title),
            ds.length ? el('div.ascent-card__deps', '⚗ ' + ds.map((x) => (global.Registry.get(x) || { title: x }).title).join(' + '))
                      : el('div.ascent-card__deps.ascent-card__deps--elem', 'element · no prerequisites')
          ]);
        }))
      ]);
      container.appendChild(bandEl);
    });
    container.appendChild(el('p.hint', 'Tiers are computed from declared ingredients and prerequisites — ' +
      'if a card sits above another, it genuinely uses it. Principles: docs/ASCENT.md.'));
  }

  global.Ascent = { computeTiers, verify, PREREQS, order, firstUnvisited, visitedSet, tierName, renderClimb };

  global.Registry.register({
    id: 'ascent',
    title: 'The Ascent',
    category: 'Reference',
    blurb: 'The whole site as one climb: elements first, then ever-higher compounds.',
    longDesc: 'A dependency-ordered path through everything here. Tier 0 holds the atomic elements; every ' +
      'higher tier uses only concepts from below it — the ordering is computed from each entry\'s declared ' +
      'ingredients, so the climb is honest. Pages you\'ve already opened are ticked. Start at base camp and ' +
      'work upward, or use it as a map to find your current altitude.',
    create: function (container) {
      renderClimb(container, { cta: true });
      return {};
    }
  });
})(window);
