# DSA Visualizer

A comprehensive, **modular, dependency-free** collection of interactive data structure and
algorithm visualizations. No build step, no frameworks, no `npm install` — just open
`index.html`. Everything renders with plain HTML, CSS, SVG, and vanilla JavaScript.

## Run it

```bash
# just open the file
open index.html            # macOS
xdg-open index.html        # Linux

# …or serve it (any static server works)
python3 -m http.server 8000   # then visit http://localhost:8000
```

## What's included (27 visualizations)

| Category | Visualizations |
| --- | --- |
| **Sorting** | Bubble, Selection, Insertion, Merge, Quick, Heap, **Sorting Race** (all six side-by-side) |
| **Searching** | Linear, Binary |
| **Data Structures** | Stack (LIFO), Queue (FIFO), Linked List, **Trie** |
| **Trees** | Binary Search Tree (+ in/pre/post-order & BFS traversals), **AVL Tree** (self-balancing with LL/LR/RL/RR rotations) |
| **Heaps** | Binary Min-Heap (sift-up / sift-down, tree + array views) |
| **Hashing** | Hash Table (separate chaining, live load factor) |
| **Graphs** | BFS, DFS, **Dijkstra** (weighted shortest paths), **Union-Find** (DSU with path compression), Pathfinding grid (BFS / Dijkstra / A*) |
| **Recursion & DP** | Tower of Hanoi, Fibonacci recursion tree (naive vs. memoized), Longest Common Subsequence, **0/1 Knapsack**, **Edit Distance** |

### Features

- **Synced pseudocode** — the executing line is highlighted as the animation plays (sorting, searching, traversals, AVL, Dijkstra, DP tables).
- **Live operation counters** — comparisons / swaps / nodes settled, updated per step.
- **Full playback** — play/pause, step forward & back, speed control, reset.
- **Keyboard shortcuts** — `Space` play/pause, `←`/`→` step, `Home` reset, `/` focus search.
- **Deep links** — sorting/searching/edit-distance expose a *Copy link* that encodes the exact input in the URL.
- **Light & dark themes** (persisted) and `prefers-reduced-motion` support.
- **Custom inputs** — randomize, resize, draw grid walls, type strings, etc.

## Architecture

The project is deliberately small and layered so a new visualization is usually a single
self-contained file.

```
index.html                 # loads core + every visualization module, then boots the app
styles/main.css            # design tokens + all shared visual primitives (bars, cells, nodes…)
core/
  dom.js                   # el() / svgEl() / clear() — tiny DOM builder, no framework
  util.js                  # random arrays, list parsing, small helpers
  player.js                # Player: drives an array of "frames" (play/pause/step/seek/speed)
  scaffold.js              # createStepViz(): controls + status + pseudocode + counters, wired to Player
  registry.js              # visualizations register themselves; provides grouped catalog
  app.js                   # sidebar, search, hash routing (#/id?params), theme, mount/unmount
visualizations/
  sorting.js  sort-race.js  searching.js  stack-queue.js  linked-list.js
  bst.js  avl.js  trie.js  heap.js  hash-table.js
  graph-traversal.js  dijkstra.js  union-find.js  pathfinding.js
  recursion.js  dp-lcs.js  knapsack.js  edit-distance.js
test/
  smoke.test.js            # headless-browser smoke + algorithm-correctness tests
```

### Two module styles

1. **Frame-based** (sorting, race, searching, traversals, AVL, Dijkstra, Hanoi, Fibonacci,
   LCS, Knapsack, Edit Distance). The algorithm produces an array of *frame* snapshots;
   `Scaffold.createStepViz` renders them with transport controls, synced pseudocode, and
   counters. You supply `render(stage, frame)` and a frame generator; each frame may carry
   `{ status, line, counters }`.

2. **Interactive** (stack, queue, linked list, BST, heap, hash table, trie, union-find,
   pathfinding). These build their own buttons and animate operations directly with short
   `setTimeout` sequences, because the user drives them (push/pop, insert/delete, draw walls).

Both styles share the same CSS primitives and DOM helpers, so they look consistent.

## Adding a new visualization

Create `visualizations/my-thing.js` and register it:

```js
(function () {
  const { el } = window.DOM;

  window.Registry.register({
    id: 'my-thing',                 // used in the URL hash (#/my-thing)
    title: 'My Thing',
    category: 'Sorting',            // groups it in the sidebar
    blurb: 'One-line summary.',
    longDesc: 'Shown as the page subtitle.',
    create: function (container) {
      // Option A — frame-based:
      const api = window.Scaffold.createStepViz(container, {
        render: (stage, frame) => { /* draw frame */ },
        complexity: { Time: 'O(n)', Space: 'O(1)' },
        controls: [{ label: '🎲 Random', onClick: (api) => api.setFrames(buildFrames()) }],
        onReady: (api) => api.setFrames(buildFrames())
      });
      return api;                   // returned object may expose destroy()

      // Option B — fully custom: build your own DOM in `container` and return { destroy() }.
    }
  });
})();
```

Then add one `<script>` line to `index.html`. That's it — the sidebar, search, routing,
and landing-page card are generated automatically from the registry.

## Testing

A headless-browser test loads every registered visualization and checks that it mounts
without errors, renders, steps through frames, and survives clicking all controls. It also
runs **algorithm-correctness checks** on the pure frame generators (every sort produces a
sorted permutation of its input; searches hit present values and miss absent ones).

```bash
npm install     # installs Playwright (only dependency, dev-only)
npm test        # runs test/smoke.test.js against index.html
```

The app itself stays dependency-free — Playwright is a **dev-only** dependency used purely
for the test. The harness auto-detects Chromium (`$CHROMIUM_PATH`, then a browser under
`$PLAYWRIGHT_BROWSERS_PATH`, then Playwright's bundled build).

**CI:** `.github/workflows/ci.yml` runs `npm test` (with a fresh Chromium) on every push and
pull request, so new visualizations can't silently break the collection.

## Design notes

- **No dependencies.** Nothing to install; works offline from `file://`.
- **SVG for structure, CSS for state.** Trees/lists/graphs are SVG; colors/animation come from
  CSS classes (`.is-active`, `.is-visit`, `.is-sorted`, …) defined once in `main.css`.
- **Single source of truth for playback.** `Player` handles all timing so modules never
  reimplement play/pause/step logic.

## License

MIT — use it freely for teaching or learning.
