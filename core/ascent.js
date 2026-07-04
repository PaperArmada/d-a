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

  /* Edge rationales — WHY each edge exists, in one reviewable map (key:
     'entry|ingredient'). Every edge (structural madeOf AND conceptual
     prerequisite) must have one; verify() fails otherwise. These power the
     "built on" panel on every page. Keep each to one plain-English line. */
  const EDGE_WHY = {
    // The Machine
    'bitwise|binary-rep': 'You can\'t mask or shift bits until you can read a number as bits.',
    'float-rep|binary-rep': 'A float is just bits given three jobs — sign, exponent, fraction.',
    'utf8|binary-rep': 'UTF-8 packs code points into bytes using recognizable bit patterns.',
    'stack-heap|call-stack': 'The stack side of memory is exactly where call frames live.',
    // Runtime
    'call-stack|stack': 'Function calls push frames and returns pop them — a stack, literally.',
    'race-condition|call-stack': 'You need to see interleaved calls before two threads can collide.',
    'event-loop|call-stack': 'The loop only runs a callback when the call stack is empty.',
    'event-loop|queue': 'Pending callbacks wait their turn in a FIFO task queue.',
    'gc-mark-sweep|graph-bfs': 'Mark phase is a graph traversal from the roots through references.',
    'deadlock|race-condition': 'Locks fix races — deadlock is what happens when locks wait on each other.',
    // Design Patterns
    'observer|state-machine': 'The subject is a little state machine; observers react to its transitions.',
    'strategy|sort-bubble': 'A slow sort makes the case for swapping algorithms behind one interface.',
    'strategy|sort-merge': 'A fast sort is the alternative strategy you swap in.',
    'command-undo|stack': 'Undo pops the most recent command — history is a stack.',
    // Data & Storage
    'regex-nfa|state-machine': 'A regex compiles to a state machine that consumes one character per step.',
    'btree|bst': 'A B-tree is a search tree with fat nodes tuned for disk pages.',
    'transactions|race-condition': 'Transactions exist to make concurrent writes safe.',
    'index-race|btree': 'The index being raced is a B-tree.',
    'index-race|search-linear': 'The full-table scan it races against is linear search.',
    'myers-diff|edit-distance': 'Diff is edit distance restricted to insert/delete, found greedily.',
    // Systems
    'tcp|state-machine': 'A connection is a state machine: closed → syn-sent → established…',
    'http-lifecycle|tcp': 'Every HTTP exchange rides on an established TCP connection.',
    'circuit-breaker|state-machine': 'Closed / open / half-open — the breaker is a three-state machine.',
    'token-bucket|queue': 'Requests that can\'t get a token wait in (or are shed from) a queue.',
    'consistent-hashing|hash-table': 'It fixes what naive hashing breaks when the server count changes.',
    'git-dag|graph-bfs': 'History walks (log, merge-base) are graph traversals over commits.',
    'git-dag|hash-table': 'Commits are addressed by hash — the object store is a hash table.',
    'lru-cache|hash-table': 'The hash table gives O(1) lookup of any cached key.',
    'lru-cache|linked-list': 'The linked list keeps recency order with O(1) moves to the front.',
    'idempotency|tcp': 'Retries come from timeouts and lost replies — TCP shows why they happen.',
    'idempotency|hash-table': 'Deduplication by request key is a hash-table membership check.',
    // Craft
    'coupling|graph-bfs': 'Ripple effects are reachability in the dependency graph.',
    'invariants|bst': 'The BST ordering rule is the canonical always-true property to protect.',
    'complexity-plot|sort-bubble': 'The n² curve needs a real n² algorithm to draw it.',
    'complexity-plot|sort-merge': 'The n·log n curve comes from a real divide-and-conquer sort.',
    // Sorting & searching
    'sort-insertion|sort-bubble': 'Same compare-and-move idea, but it grows a sorted prefix smarter.',
    'sort-selection|sort-bubble': 'Same O(n²) family; it just commits to one swap per pass.',
    'sort-merge|sort-bubble': 'The baseline it beats — feel n² before n·log n.',
    'sort-merge|call-stack': 'Divide-and-conquer recursion rides the call stack.',
    'sort-quick|sort-bubble': 'The baseline it beats — feel n² before n·log n.',
    'sort-quick|call-stack': 'Partition-then-recurse rides the call stack.',
    'sort-heap|sort-bubble': 'The baseline it beats with a smarter structure.',
    'sort-heap|heap': 'It IS repeated extract-max from a heap.',
    'sort-race|sort-merge': 'One of the contenders in the race.',
    'sort-race|sort-quick': 'The other contender in the race.',
    'search-binary|search-linear': 'Halving only makes sense against the one-by-one baseline.',
    // Data structures
    'bst|linked-list': 'Nodes-and-pointers thinking, now with two children instead of one next.',
    'avl|bst': 'An AVL tree is a BST that rebalances itself after inserts.',
    'heap|bst': 'Another binary tree, but ordered by priority instead of left/right.',
    'trie|linked-list': 'Follow-the-pointer chains, one link per character.',
    'hash-table|linked-list': 'Colliding keys chain into little linked lists per bucket.',
    'union-find|linked-list': 'Parent pointers are the same node-and-pointer idea, pointing up.',
    // Graphs
    'graph-bfs|queue': 'The frontier is a FIFO queue — that\'s what makes it breadth-first.',
    'graph-dfs|stack': 'The frontier is a stack — that\'s what makes it depth-first.',
    'dijkstra|graph-bfs': 'BFS with weights: same wavefront idea, smarter frontier.',
    'dijkstra|heap': 'The frontier becomes a priority queue keyed by distance.',
    'graph-builder|graph-bfs': 'One of the traversals you can run on your own graph.',
    'graph-builder|graph-dfs': 'The other traversal you can run on your own graph.',
    'pathfinding|graph-bfs': 'The grid is a graph; the wavefront is BFS in disguise.',
    'path-race|pathfinding': 'The arena the algorithms race in.',
    'path-race|dijkstra': 'The weighted contender in the race.',
    // Recursion & DP
    'hanoi|call-stack': 'Each recursive move sits on the call stack until its subtower resolves.',
    'fib-tree|call-stack': 'The exploding call tree is the call stack branching.',
    'lcs|fib-tree': 'Overlapping subproblems, seen in fib, are why memoizing a table works.',
    'edit-distance|lcs': 'Same table recurrence as LCS, plus a substitution move.',
    'knapsack|lcs': 'Same fill-the-table thinking, with a weight budget as one axis.'
  };

  function catalog() {
    return global.Registry.all().filter((d) => d.category !== 'Lessons' && d.category !== 'Reference');
  }
  function whyEdge(id, dep) { return EDGE_WHY[id + '|' + dep] || ''; }

  /* Full relations for one entry, from the combined graph (madeOf ∪ PREREQS):
     what it's built on, and what builds on it — each with kind + rationale. */
  function ingredientsOf(id) {
    const def = global.Registry.get(id);
    if (!def) return [];
    const structural = def.madeOf || [];
    const all = structural.concat(PREREQS[id] || []).filter((x, i, a) => a.indexOf(x) === i);
    return all.map((dep) => ({
      def: global.Registry.get(dep),
      kind: structural.indexOf(dep) >= 0 ? 'structural' : 'conceptual',
      why: whyEdge(id, dep)
    })).filter((r) => r.def);
  }
  function dependentsOf(id) {
    return catalog().filter((d) =>
      (d.madeOf || []).indexOf(id) >= 0 || (PREREQS[d.id] || []).indexOf(id) >= 0
    ).map((d) => ({
      def: d,
      kind: (d.madeOf || []).indexOf(id) >= 0 ? 'structural' : 'conceptual',
      why: whyEdge(d.id, id)
    }));
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
    // P1b/P6.6 — explained edges: every edge carries a one-line rationale,
    // and every rationale corresponds to a real edge (no stale entries).
    const edgeKeys = new Set();
    catalog().forEach(function (d) {
      depsOf(d).forEach(function (dep) {
        edgeKeys.add(d.id + '|' + dep);
        if (!EDGE_WHY[d.id + '|' + dep]) problems.push('edge missing rationale: ' + d.id + ' → ' + dep);
      });
    });
    Object.keys(EDGE_WHY).forEach(function (k) {
      if (!edgeKeys.has(k)) problems.push('stale rationale (no such edge): ' + k);
    });
    return problems;
  }

  function visitedSet() {
    try { return new Set(JSON.parse(localStorage.getItem('sf-visited') || '[]')); } catch (e) { return new Set(); }
  }
  // Visited marks belong to the user: pages auto-mark on open, but any mark
  // can be cleared ("I clicked through without really digesting it").
  function setVisited(id, on) {
    try {
      const seen = visitedSet();
      if (on) seen.add(id); else seen.delete(id);
      localStorage.setItem('sf-visited', JSON.stringify([...seen]));
    } catch (e) {}
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
    const root = el('div.climb');
    container.appendChild(root);

    function draw() {
      clear(root);
      const { bands, depsOf } = computeTiers();
      const seen = visitedSet();
      let total = 0, done = 0;
      bands.forEach((b) => b.forEach((d) => { total++; if (seen.has(d.id)) done++; }));

      const nxt = firstUnvisited();
      root.appendChild(el('div.ascent-progress', [
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
            let tick = null;
            if (seen.has(d.id)) {
              // Glyph comes from CSS (✓ at rest, ✕ on hover/focus) so the
              // mark visibly reads as removable.
              tick = el('span.ascent-card__tick', {
                role: 'button', tabindex: '0',
                title: 'Visited — click to clear the mark', 'aria-label': 'Visited — clear the mark'
              });
              const clearMark = function (ev) {
                ev.preventDefault(); ev.stopPropagation();
                setVisited(d.id, false);
                draw();
              };
              tick.addEventListener('click', clearMark);
              tick.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter' || ev.key === ' ') clearMark(ev);
              });
            }
            return el('a.ascent-card' + (seen.has(d.id) ? '.visited' : ''), { href: '#/' + d.id }, [
              el('div.ascent-card__top', [el('span.card__tag', d.category), tick]),
              el('div.ascent-card__title', d.title),
              ds.length ? el('div.ascent-card__deps', '⚗ ' + ds.map((x) => (global.Registry.get(x) || { title: x }).title).join(' + '))
                        : el('div.ascent-card__deps.ascent-card__deps--elem', 'element · no prerequisites')
            ]);
          }))
        ]);
        root.appendChild(bandEl);
      });
      root.appendChild(el('p.hint', 'Tiers are computed from declared ingredients and prerequisites — ' +
        'if a card sits above another, it genuinely uses it. ✓ marks are yours: click one to clear it. ' +
        'Principles: docs/ASCENT.md.'));
    }
    draw();
  }

  global.Ascent = { computeTiers, verify, PREREQS, EDGE_WHY, order, firstUnvisited, visitedSet, setVisited,
    tierName, renderClimb, ingredientsOf, dependentsOf };

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
