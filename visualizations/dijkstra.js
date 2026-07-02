/* Dijkstra's algorithm on a weighted undirected graph (node view).
   Shows tentative distances, the settled set, and edge relaxations. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;

  function presetGraph() {
    const nodes = [
      { id: 0, x: 80, y: 180 }, { id: 1, x: 220, y: 70 }, { id: 2, x: 220, y: 290 },
      { id: 3, x: 380, y: 70 }, { id: 4, x: 380, y: 290 }, { id: 5, x: 520, y: 180 },
      { id: 6, x: 640, y: 90 }, { id: 7, x: 640, y: 270 }
    ];
    const edges = [
      [0, 1, 4], [0, 2, 3], [1, 2, 1], [1, 3, 2], [2, 4, 5], [3, 4, 8],
      [3, 5, 6], [4, 5, 2], [5, 6, 3], [5, 7, 4], [6, 7, 2], [4, 7, 7]
    ];
    return { nodes, edges };
  }

  function adjacency(g) {
    const adj = g.nodes.map(() => []);
    g.edges.forEach((e) => { adj[e[0]].push([e[1], e[2]]); adj[e[1]].push([e[0], e[2]]); });
    return adj;
  }

  function dijkstraFrames(g, start) {
    const adj = adjacency(g); const n = g.nodes.length;
    const dist = {}; const prev = {}; const visited = new Set();
    g.nodes.forEach((nd) => (dist[nd.id] = Infinity));
    dist[start] = 0;
    const F = []; let popped = 0;
    const snap = (x) => Object.assign({ g, dist: Object.assign({}, dist), visited: [...visited], counters: { Settled: popped } }, x);
    F.push(snap({ line: 0, status: 'Set dist[start]=0, all others ∞' }));
    while (visited.size < n) {
      // pick unvisited min dist
      let u = -1, best = Infinity;
      for (let i = 0; i < n; i++) if (!visited.has(i) && dist[i] < best) { best = dist[i]; u = i; }
      if (u < 0) break;
      visited.add(u); popped++;
      F.push(snap({ current: u, line: 2, status: 'Settle node ' + u + ' (dist ' + dist[u] + ') — now final' }));
      adj[u].forEach(function (pair) {
        const v = pair[0], w = pair[1];
        if (visited.has(v)) return;
        const nd = dist[u] + w;
        const better = nd < dist[v];
        F.push(snap({ current: u, activeEdge: [u, v], line: 4,
          status: 'Relax edge ' + u + '→' + v + ' (w=' + w + '): ' + dist[u] + '+' + w + '=' + nd +
            (better ? ' < ' + fmt(dist[v]) + ' ✓ update' : ' ≥ ' + fmt(dist[v]) + ' — keep') }));
        if (better) { dist[v] = nd; prev[v] = u; }
      });
    }
    // shortest-path tree edges
    const tree = [];
    for (const v in prev) tree.push([prev[v], +v]);
    F.push(snap({ tree, line: 6, status: 'All nodes settled. Distances are final; tree shows shortest paths from ' + start + '.' }));
    return F;
  }
  function fmt(d) { return d === Infinity ? '∞' : d; }

  function render(stage, frame) {
    clear(stage);
    if (!frame) return;
    const g = frame.g;
    const visited = new Set(frame.visited || []);
    const activeKey = frame.activeEdge ? frame.activeEdge.slice().sort((a, b) => a - b).join('-') : null;
    const treeSet = new Set((frame.tree || []).map((e) => e.slice().sort((a, b) => a - b).join('-')));
    const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 720 360', width: 720, style: 'max-width:100%' });
    g.edges.forEach(function (e) {
      const key = [e[0], e[1]].sort((a, b) => a - b).join('-');
      const a = g.nodes[e[0]], b = g.nodes[e[1]];
      let cls = 'edge-line';
      if (key === activeKey) cls += ' is-active';
      else if (treeSet.has(key)) cls += ' is-path';
      svg.appendChild(svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: cls }));
      svg.appendChild(svgEl('text', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 4, class: 'edge-weight', text: String(e[2]) }));
    });
    g.nodes.forEach(function (nd) {
      let cls = 'node-circle';
      if (nd.id === frame.current) cls += ' is-active';
      else if (visited.has(nd.id)) cls += ' is-done';
      svg.appendChild(svgEl('circle', { cx: nd.x, cy: nd.y, r: 20, class: cls }));
      const filled = nd.id === frame.current || visited.has(nd.id);
      svg.appendChild(svgEl('text', { x: nd.x, y: nd.y, class: 'node-text' + (filled ? ' on-fill' : ''), text: String(nd.id) }));
      const d = frame.dist[nd.id];
      svg.appendChild(svgEl('text', { x: nd.x, y: nd.y + 33, class: 'edge-weight',
        style: 'fill:var(--accent-2);font-weight:700', text: d === Infinity ? '∞' : String(d) }));
    });
    stage.appendChild(svg);

    // The state that drives Dijkstra: tentative distance for every node.
    // Settled (green) = final; the node being relaxed against is highlighted.
    if (frame.dist) {
      const rows = g.nodes.map(function (nd) {
        return { key: nd.id, val: frame.dist[nd.id] === Infinity ? null : frame.dist[nd.id],
          state: nd.id === frame.current ? 'active' : (visited.has(nd.id) ? 'settled' : '') };
      });
      stage.appendChild(window.Widgets.keyVal('Tentative distance from source (green = settled / final)', rows));
    }
  }

  window.Registry.register({
    id: 'dijkstra',
    title: "Dijkstra's Shortest Path",
    category: 'Graphs',
    blurb: 'Weighted shortest paths via a greedy settle-and-relax loop.',
    longDesc: "Dijkstra's algorithm finds shortest paths from a source in a graph with non-negative " +
      'edge weights. It repeatedly settles the closest unsettled node, then relaxes its edges. ' +
      'Green numbers under each node are tentative distances; the green tree is the final shortest-path tree.',
    create: function (container) {
      let g = presetGraph();
      let start = 0;
      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 750,
        render: render,
        pseudocode: [
          'dist[start] = 0, others = ∞',
          'while unsettled nodes remain:',
          '  u = closest unsettled node; settle it',
          '  for each edge (u, v, w):',
          '    if dist[u]+w < dist[v]: dist[v] = dist[u]+w',
          'done',
          'shortest-path tree from prev[]'
        ],
        counters: ['Settled'],
        legend: [
          { color: 'var(--warn)', label: 'Settling now' },
          { color: 'var(--good)', label: 'Settled (final)' },
          { color: 'var(--accent-2)', label: 'Shortest-path tree' }
        ],
        complexity: { Time: 'O((V+E) log V)', Space: 'O(V)' },
        controls: [
          { label: '🎯 Source node', onClick: function () { start = (start + 1) % g.nodes.length; load(); } }
        ],
        onReady: load
      });
      function load(a) { const x = a || api; x.setFrames(dijkstraFrames(g, start)); x.setStatus('Source = ' + start + '. Press play to compute shortest paths.'); }
      return api;
    }
  });
})();
