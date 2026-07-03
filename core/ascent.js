/* The Ascent — a dependency-ordered path through the whole site.
   Elements sit at base camp (Tier 0); every higher tier is built only from
   concepts below it. Tiers are COMPUTED, not hand-drawn: composition edges
   come from each entry's madeOf, and this file adds the conceptual
   prerequisites (the curriculum lives here, in one reviewable map). */
(function (global) {
  'use strict';
  const { el, clear } = global.DOM;

  // Conceptual prerequisites (in addition to structural madeOf edges).
  const PREREQS = {
    // The Machine
    'bitwise': ['binary-rep'], 'float-rep': ['binary-rep'], 'utf8': ['binary-rep'],
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
        .sort((a, b) => a.category === b.category ? a.title.localeCompare(b.title) : a.category.localeCompare(b.category)));
    }
    return { tier, bands, problems, depsOf: (d) => depsOf(d, ids), byId };
  }

  function verify() {
    const { tier, problems, depsOf } = computeTiers();
    catalog().forEach(function (d) {
      depsOf(d).forEach(function (dep) {
        if (!(tier[dep] < tier[d.id])) problems.push('tier not monotonic: ' + d.id + ' (T' + tier[d.id] + ') dep ' + dep + ' (T' + tier[dep] + ')');
      });
    });
    Object.keys(PREREQS).forEach(function (id) {
      if (!global.Registry.get(id)) problems.push('prereq map: unknown entry ' + id);
      PREREQS[id].forEach((p) => { if (!global.Registry.get(p)) problems.push('prereq map: unknown dep ' + p + ' for ' + id); });
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

  global.Ascent = { computeTiers, verify, PREREQS };

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
      const { bands, depsOf } = computeTiers();
      const seen = visitedSet();
      let total = 0, done = 0;
      bands.forEach((b) => b.forEach((d) => { total++; if (seen.has(d.id)) done++; }));

      container.appendChild(el('div.ascent-progress', [
        el('div.ascent-progress__bar', [el('div.ascent-progress__fill', { style: { width: (total ? Math.round(done / total * 100) : 0) + '%' } })]),
        el('span.mono.dim', done + ' / ' + total + ' visited')
      ]));

      bands.forEach(function (band, i) {
        if (!band.length) return;
        const bandEl = el('div.ascent-band', [
          el('div.ascent-band__head', [
            el('span.ascent-band__tier', 'Tier ' + i),
            el('span.ascent-band__name', TIER_NAMES[Math.min(i, TIER_NAMES.length - 1)]),
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
        'if a card sits above another, it genuinely uses it.'));
      return {};
    }
  });
})(window);
