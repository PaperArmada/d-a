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

## What's included (20 visualizations)

| Category | Visualizations |
| --- | --- |
| **Sorting** | Bubble, Selection, Insertion, Merge, Quick, Heap |
| **Searching** | Linear, Binary |
| **Data Structures** | Stack (LIFO), Queue (FIFO), Linked List |
| **Trees** | Binary Search Tree (insert / search / delete + in/pre/post-order & BFS traversals) |
| **Heaps** | Binary Min-Heap (sift-up / sift-down, tree + array views) |
| **Hashing** | Hash Table (separate chaining, live load factor) |
| **Graphs** | Breadth-First Search, Depth-First Search, Pathfinding grid (BFS / Dijkstra / A*) |
| **Recursion & DP** | Tower of Hanoi, Fibonacci recursion tree (naive vs. memoized), Longest Common Subsequence |

Each one supports stepping forward/back, play/pause, speed control, and custom inputs
(randomize, resize, draw walls, type strings, etc.).

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
  scaffold.js              # createStepViz(): standard controls + status + stage, wired to Player
  registry.js              # visualizations register themselves; provides grouped catalog
  app.js                   # sidebar, search, hash routing, mount/unmount
visualizations/
  sorting.js  searching.js  stack-queue.js  linked-list.js  bst.js
  heap.js  hash-table.js  graph-traversal.js  pathfinding.js
  recursion.js  dp-lcs.js
```

### Two module styles

1. **Frame-based** (algorithm animations: sorting, searching, traversals, Hanoi, Fibonacci, LCS).
   The algorithm produces an array of *frame* snapshots; `Scaffold.createStepViz` renders them
   with standard transport controls. You only supply `render(stage, frame)` and a frame generator.

2. **Interactive** (stack, queue, linked list, BST, heap, hash table, pathfinding).
   These build their own buttons and animate operations directly with short `setTimeout` sequences,
   because the user drives them (push/pop, insert/delete, draw walls).

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

## Design notes

- **No dependencies.** Nothing to install; works offline from `file://`.
- **SVG for structure, CSS for state.** Trees/lists/graphs are SVG; colors/animation come from
  CSS classes (`.is-active`, `.is-visit`, `.is-sorted`, …) defined once in `main.css`.
- **Single source of truth for playback.** `Player` handles all timing so modules never
  reimplement play/pause/step logic.

## License

MIT — use it freely for teaching or learning.
