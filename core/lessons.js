/* Lessons — guided tours that sequence visualizations with prose between them.
   Each lesson registers as a normal Registry entry (category "Lessons") whose
   create() renders a stepper: prose + an embedded live visualization per step. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  const LESSONS = [
    {
      id: 'lesson-sorting',
      title: 'Sorting: O(n²) → O(n log n)',
      blurb: 'Why divide-and-conquer sorts leave the simple ones behind.',
      steps: [
        { title: 'The simple sorts', viz: { id: 'sort-bubble' },
          html: 'Bubble sort repeatedly swaps adjacent out-of-order pairs. It\'s easy to understand but does ' +
            'about n²/2 comparisons. Press <b>Play</b> and watch the comparison counter climb — that growth is the problem.' },
        { title: 'Insertion sort', viz: { id: 'sort-insertion' },
          html: 'Insertion sort grows a sorted prefix, sliding each new value into place. On <i>nearly sorted</i> ' +
            'data it\'s close to O(n) — but on random data it\'s still quadratic.' },
        { title: 'Divide and conquer: merge sort', viz: { id: 'sort-merge' },
          html: 'Merge sort splits the array in half, sorts each half, then merges them. The recursion is ' +
            'log n deep and each level does O(n) work → <b>O(n log n)</b>. Notice how few comparisons it needs versus bubble.' },
        { title: 'Quick sort', viz: { id: 'sort-quick' },
          html: 'Quick sort partitions around a pivot. Average case is O(n log n) with tiny constants, which is why ' +
            'it\'s so widely used — though a bad pivot can degrade to O(n²).' },
        { title: 'See them race', viz: { id: 'sort-race' },
          html: 'Run all six on the <i>same</i> array. The O(n log n) sorts finish in far fewer steps. Try the ' +
            '<b>Nearly sorted</b> button too — insertion sort suddenly wins, showing how input shape matters.' }
      ]
    },
    {
      id: 'lesson-graphs',
      title: 'Graph search & shortest paths',
      blurb: 'BFS, DFS, weights, and heuristics — from traversal to A*.',
      steps: [
        { title: 'Breadth-first search', viz: { id: 'graph-bfs' },
          html: 'BFS explores in layers using a queue, visiting all nodes at distance 1, then 2, and so on. ' +
            'On an unweighted graph, BFS finds shortest paths by hop count.' },
        { title: 'Depth-first search', viz: { id: 'graph-dfs' },
          html: 'DFS uses a stack (or recursion) to dive as deep as possible before backtracking. Same O(V+E) cost, ' +
            'very different order — great for cycle detection and topological sorts.' },
        { title: 'Weighted graphs: Dijkstra', viz: { id: 'dijkstra' },
          html: 'When edges have costs, hop count isn\'t enough. Dijkstra always settles the closest unsettled node, ' +
            'then relaxes its edges. The green numbers are tentative distances.' },
        { title: 'Heuristics: A* vs the rest', viz: { id: 'path-race' },
          html: 'On a grid, BFS and Dijkstra sweep outward uniformly. A* adds a heuristic that points toward the goal, ' +
            'so it usually explores far fewer cells. Watch the three race the same maze.' },
        { title: 'Now build your own', viz: { id: 'graph-builder' },
          html: 'Draw a graph — click to add nodes, connect them, drag to arrange — then run BFS, DFS, or Dijkstra on it. ' +
            'Experiment: what graph makes DFS and BFS visit in the same order?' }
      ]
    },
    {
      id: 'lesson-trees',
      title: 'Trees & balance',
      blurb: 'From ordered trees to self-balancing and heaps.',
      steps: [
        { title: 'Binary search trees', viz: { id: 'bst', params: { seq: '50,30,70,20,40,60,80' } },
          html: 'A BST keeps left < node < right, so search follows a single root-to-leaf path in O(h). ' +
            'Insert a few values, then run an <b>Inorder</b> traversal — it always comes out sorted.' },
        { title: 'When BSTs go wrong', viz: { id: 'bst', params: { seq: '10,20,30,40,50,60' } },
          html: 'Insert values in sorted order and the BST degenerates into a linked list — height n, search O(n). ' +
            'This is exactly what balancing fixes.' },
        { title: 'Self-balancing: AVL', viz: { id: 'avl' },
          html: 'An AVL tree rotates after inserts to keep every subtree balanced (heights differ by ≤ 1), ' +
            'guaranteeing O(log n). Insert 10, 20, 30 and watch the rotation trigger.' },
        { title: 'Heaps', viz: { id: 'heap' },
          html: 'A binary heap is a complete tree stored in an array where every parent ≤ its children. ' +
            'It gives O(log n) insert and extract-min — the backbone of priority queues and heap sort.' }
      ]
    },
    {
      id: 'lesson-dp',
      title: 'Dynamic programming',
      blurb: 'Overlapping subproblems, memoization, and DP tables.',
      steps: [
        { title: 'Why naive recursion explodes', viz: { id: 'fib-tree' },
          html: 'Naive fib(n) recomputes the same subproblems exponentially often. Play it, then hit ' +
            '<b>Toggle memo</b> and watch repeated calls collapse into instant cache hits — O(2ⁿ) → O(n).' },
        { title: 'Filling a table: LCS', viz: { id: 'lcs' },
          html: 'The longest common subsequence uses a 2-D table where each cell depends on its neighbors. ' +
            'This bottom-up fill is the essence of DP — solve small subproblems once, reuse them.' },
        { title: 'Edit distance', viz: { id: 'edit-distance' },
          html: 'The same table shape solves edit distance: the fewest insert/delete/replace edits between two strings. ' +
            'Backtracking through the table recovers the actual operations.' },
        { title: '0/1 Knapsack', viz: { id: 'knapsack' },
          html: 'Knapsack maximizes value under a weight limit. Each cell asks: is it better to skip this item or take it? ' +
            'That "skip vs take" choice, tabulated, is a classic DP.' }
      ]
    }
  ];

  function makeLesson(def) {
    return {
      id: def.id,
      title: def.title,
      category: 'Lessons',
      blurb: def.blurb,
      longDesc: def.blurb,
      create: function (container) {
        let idx = 0;
        let mounted = null;
        const total = def.steps.length;

        const prose = el('div.lesson-prose');
        const vizHost = el('div.lesson-viz');

        const prev = el('button.btn', { onclick: () => go(idx - 1) }, '← Prev');
        const next = el('button.btn.btn--primary', { onclick: () => go(idx + 1) }, 'Next →');
        const dots = el('div.lesson-dots');
        const counter = el('span.mono.dim');
        const nav = el('div.controls', [prev, next, el('span.spacer'), dots, counter]);

        container.appendChild(nav);
        container.appendChild(prose);
        container.appendChild(vizHost);

        function renderDots() {
          clear(dots);
          def.steps.forEach(function (s, i) {
            dots.appendChild(el('button.lesson-dot' + (i === idx ? '.active' : ''), {
              title: s.title, 'aria-label': 'Step ' + (i + 1), onclick: () => go(i)
            }));
          });
        }

        function go(i) {
          if (i < 0 || i >= total) return;
          idx = i;
          if (mounted && mounted.destroy) { try { mounted.destroy(); } catch (e) {} }
          mounted = null;
          const step = def.steps[idx];
          clear(prose);
          prose.appendChild(el('div.lesson-step-title', (idx + 1) + '. ' + step.title));
          prose.appendChild(el('div', { html: step.html }));
          clear(vizHost);
          if (step.viz) {
            const vdef = window.Registry.get(step.viz.id);
            if (vdef) {
              const inner = el('div');
              vizHost.appendChild(el('div.lesson-viz-label', ['Live: ', el('a', { href: '#/' + step.viz.id }, vdef.title), ' ↗']));
              vizHost.appendChild(inner);
              try { mounted = vdef.create(inner, step.viz.params || {}) || null; } catch (e) { inner.textContent = 'error: ' + e.message; }
            }
          }
          prev.disabled = idx === 0;
          next.disabled = idx === total - 1;
          counter.textContent = (idx + 1) + ' / ' + total;
          renderDots();
        }

        go(0);
        return { destroy: function () { if (mounted && mounted.destroy) { try { mounted.destroy(); } catch (e) {} } } };
      }
    };
  }

  LESSONS.forEach(function (l) { window.Registry.register(makeLesson(l)); });
})();
