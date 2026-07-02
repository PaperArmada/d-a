/* Graph traversal — BFS & DFS on an undirected graph, SVG + step player. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;
  const Util = window.Util;

  // preset layout (positions in a 640x360 viewBox)
  function presetGraph() {
    const nodes = [
      { id: 0, x: 90, y: 60 }, { id: 1, x: 250, y: 50 }, { id: 2, x: 410, y: 60 },
      { id: 3, x: 560, y: 120 }, { id: 4, x: 120, y: 200 }, { id: 5, x: 300, y: 180 },
      { id: 6, x: 470, y: 210 }, { id: 7, x: 200, y: 320 }, { id: 8, x: 400, y: 320 }
    ];
    const edges = [[0, 1], [0, 4], [1, 2], [1, 5], [2, 3], [2, 6], [4, 5], [4, 7], [5, 6], [5, 8], [6, 3], [7, 8], [8, 6]];
    return { nodes, edges };
  }

  function adjacency(g) {
    const adj = g.nodes.map(() => []);
    g.edges.forEach(function (e) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });
    adj.forEach((l) => l.sort((a, b) => a - b));
    return adj;
  }

  function bfsFrames(g, start) {
    const adj = adjacency(g); const frames = [];
    const visited = new Set(); const queue = [start]; const inQ = new Set([start]);
    const order = [];
    const ct = () => ({ Visited: order.length });
    const base = () => ({ g, kind: 'queue', container: queue.slice(), counters: ct() });
    frames.push(Object.assign(base(), { visited: [], frontier: [start], current: null, line: 0, status: 'Enqueue start node ' + start }));
    while (queue.length) {
      const u = queue.shift(); inQ.delete(u);
      if (visited.has(u)) continue;
      visited.add(u); order.push(u);
      frames.push(Object.assign(base(), { visited: order.slice(), frontier: [...inQ], current: u, popped: u, line: 4,
        status: 'Dequeue ' + u + ' (front) → visit. Order: [' + order.join(', ') + ']' }));
      const added = [];
      adj[u].forEach(function (v) { if (!visited.has(v) && !inQ.has(v)) { queue.push(v); inQ.add(v); added.push(v); } });
      frames.push(Object.assign(base(), { visited: order.slice(), frontier: [...inQ], current: u, added: added.slice(),
        activeEdges: added.map((v) => [u, v]), line: 5,
        status: 'Enqueue unvisited neighbors of ' + u + ' at the back: [' + added.join(', ') + ']' }));
    }
    frames.push(Object.assign(base(), { visited: order.slice(), frontier: [], current: null, done: true, line: 1, status: 'BFS complete: ' + order.join(' → ') }));
    return frames;
  }

  function dfsFrames(g, start) {
    const adj = adjacency(g); const frames = [];
    const visited = new Set(); const order = []; const stack = [start];
    const ct = () => ({ Visited: order.length });
    const base = () => ({ g, kind: 'stack', container: stack.slice(), counters: ct() });
    frames.push(Object.assign(base(), { visited: [], frontier: [start], current: null, line: 0, status: 'Push start node ' + start }));
    while (stack.length) {
      const u = stack.pop();
      if (visited.has(u)) continue;
      visited.add(u); order.push(u);
      frames.push(Object.assign(base(), { visited: order.slice(), frontier: [...stack], current: u, popped: u, line: 4,
        status: 'Pop ' + u + ' (top) → visit. Order: [' + order.join(', ') + ']' }));
      const toPush = adj[u].filter((v) => !visited.has(v)).reverse();
      toPush.forEach((v) => stack.push(v));
      frames.push(Object.assign(base(), { visited: order.slice(), frontier: [...stack], current: u, added: toPush.slice(),
        activeEdges: toPush.map((v) => [u, v]), line: 5, status: 'Push unvisited neighbors of ' + u + ' on top' }));
    }
    frames.push(Object.assign(base(), { visited: order.slice(), frontier: [], current: null, done: true, line: 1, status: 'DFS complete: ' + order.join(' → ') }));
    return frames;
  }

  function render(stage, frame) {
    clear(stage);
    if (!frame) return;
    const g = frame.g;
    const visited = new Set(frame.visited || []);
    const frontier = new Set(frame.frontier || []);
    const activeEdges = new Set((frame.activeEdges || []).map((e) => e.slice().sort((a, b) => a - b).join('-')));
    const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 640 380', width: 640, style: 'max-width:100%' });
    g.edges.forEach(function (e) {
      const key = e.slice().sort((a, b) => a - b).join('-');
      const a = g.nodes[e[0]], b = g.nodes[e[1]];
      svg.appendChild(svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'edge-line' + (activeEdges.has(key) ? ' is-active' : '') }));
    });
    g.nodes.forEach(function (n) {
      let cls = 'node-circle';
      if (n.id === frame.current) cls += ' is-active';
      else if (visited.has(n.id)) cls += ' is-visit';
      else if (frontier.has(n.id)) cls += ' is-frontier';
      svg.appendChild(svgEl('circle', { cx: n.x, cy: n.y, r: 20, class: cls }));
      const filled = n.id === frame.current || visited.has(n.id) || frontier.has(n.id);
      svg.appendChild(svgEl('text', { x: n.x, y: n.y, class: 'node-text' + (filled ? ' on-fill' : ''), text: String(n.id) }));
    });
    stage.appendChild(svg);

    // The data structure that drives the order — the heart of the mechanism.
    if (frame.container) {
      const isQueue = frame.kind === 'queue';
      stage.appendChild(window.Widgets.dsStrip({
        title: isQueue ? 'Queue' : 'Stack',
        subtitle: isQueue ? 'dequeue from the front, enqueue at the back'
                          : 'push and pop from the top',
        items: frame.container,
        nextOutIndex: frame.container.length ? (isQueue ? 0 : frame.container.length - 1) : null,
        enterCount: (frame.added || []).length,
        endLabels: isQueue ? { left: 'front', right: 'back' } : { left: 'bottom', right: 'top' },
        chipClass: 'is-frontier'
      }));
    }
  }

  const BFS_PC = [
    'queue = [start]',
    'while queue not empty:',
    '  u = queue.dequeue()',
    '  if u already visited: skip',
    '  mark u visited',
    '  enqueue u\'s unvisited neighbors'
  ];
  const DFS_PC = [
    'stack = [start]',
    'while stack not empty:',
    '  u = stack.pop()',
    '  if u already visited: skip',
    '  mark u visited',
    '  push u\'s unvisited neighbors'
  ];

  function makeViz(key, name, framesFn, desc) {
    return {
      id: 'graph-' + key,
      title: name,
      category: 'Graphs',
      blurb: desc,
      longDesc: name + ' explores a graph from a start node, with the executing pseudocode line ' +
        'highlighted and a live visited count. ' +
        (key === 'bfs' ? 'BFS uses a queue and visits nodes in layers of increasing distance.'
                       : 'DFS uses a stack (or recursion) and dives deep before backtracking.'),
      create: function (container) {
        let g = presetGraph();
        let start = 0;
        const api = window.Scaffold.createStepViz(container, {
          baseDelay: 700,
          render: render,
          pseudocode: key === 'bfs' ? BFS_PC : DFS_PC,
          counters: ['Visited'],
          legend: [
            { color: 'var(--warn)', label: 'Current' },
            { color: '#c084fc', label: key === 'bfs' ? 'In queue' : 'On stack' },
            { color: 'var(--accent)', label: 'Visited' }
          ],
          complexity: { Time: 'O(V + E)', Space: 'O(V)' },
          controls: [
            { label: '🎯 Start node', onClick: function () { start = (start + 1) % g.nodes.length; load(); } }
          ],
          onReady: load
        });
        function load(a) { const x = a || api; x.setFrames(framesFn(g, start)); x.setStatus('Start node = ' + start + '. Press play.'); }
        return api;
      }
    };
  }

  window.Registry.register(makeViz('bfs', 'Breadth-First Search', bfsFrames, 'Layer-by-layer via a queue. O(V+E).'));
  window.Registry.register(makeViz('dfs', 'Depth-First Search', dfsFrames, 'Dive deep via a stack. O(V+E).'));
})();
