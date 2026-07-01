/* Pathfinding Race — BFS vs Dijkstra vs A* explore the SAME maze in lockstep.
   All edges are unit weight, so every algorithm finds an equally short path;
   the interesting difference is how many cells each explores to get there. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  const ROWS = 14, COLS = 22;
  const START = idx(7, 2), END = idx(7, 19);
  function idx(r, c) { return r * COLS + c; }
  function rc(i) { return [Math.floor(i / COLS), i % COLS]; }

  const ALGOS = [
    { key: 'bfs', name: 'BFS', h: false },
    { key: 'dijkstra', name: 'Dijkstra', h: false },
    { key: 'astar', name: 'A*', h: true }
  ];

  window.Registry.register({
    id: 'path-race',
    title: 'Pathfinding Race',
    category: 'Graphs',
    blurb: 'BFS vs Dijkstra vs A* on one maze — compare cells explored.',
    longDesc: 'The same maze, three algorithms, side by side. Because every move costs the same, all ' +
      'three find a shortest path — but A* is goal-directed (Manhattan heuristic) and usually explores ' +
      'far fewer cells than the uniform BFS/Dijkstra sweep. The winner is whoever reaches the goal ' +
      'after exploring the fewest cells.',
    create: function (container) {
      let walls = new Set();

      function neighbors(i) {
        const [r, c] = rc(i); const out = [];
        if (r > 0) out.push(idx(r - 1, c));
        if (r < ROWS - 1) out.push(idx(r + 1, c));
        if (c > 0) out.push(idx(r, c - 1));
        if (c < COLS - 1) out.push(idx(r, c + 1));
        return out.filter((n) => !walls.has(n));
      }
      function heur(a, b) { const [r1, c1] = rc(a), [r2, c2] = rc(b); return Math.abs(r1 - r2) + Math.abs(c1 - c2); }

      function search(useH) {
        const dist = {}; const prev = {}; const seen = new Set(); const order = [];
        const pq = [{ i: START, f: 0, g: 0 }]; dist[START] = 0;
        let found = false;
        while (pq.length) {
          let bi = 0; for (let k = 1; k < pq.length; k++) if (pq[k].f < pq[bi].f) bi = k;
          const cur = pq.splice(bi, 1)[0];
          if (seen.has(cur.i)) continue;
          seen.add(cur.i); order.push(cur.i);
          if (cur.i === END) { found = true; break; }
          neighbors(cur.i).forEach(function (n) {
            if (seen.has(n)) return;
            const ng = cur.g + 1;
            if (dist[n] == null || ng < dist[n]) { dist[n] = ng; prev[n] = cur.i; pq.push({ i: n, g: ng, f: ng + (useH ? heur(n, END) : 0) }); }
          });
        }
        const path = [];
        if (found) { let c = END; while (c != null && c !== START) { path.unshift(c); c = prev[c]; } }
        return { order, path, found };
      }

      function reachable() { return search(false).found; }

      function randomMaze() {
        let tries = 0;
        do {
          walls = new Set();
          for (let i = 0; i < ROWS * COLS; i++) if (i !== START && i !== END && Math.random() < 0.26) walls.add(i);
          tries++;
        } while (!reachable() && tries < 40);
      }
      randomMaze();

      let runs = [];
      function prepare() {
        runs = ALGOS.map(function (a) {
          const r = search(a.h);
          return { key: a.key, name: a.name, order: r.order, path: r.path, found: r.found, len: r.order.length };
        });
      }

      function render(stage, frame) {
        clear(stage);
        const step = frame ? frame.i : 0;
        const grid = el('div.race-grid', { style: { gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' } });
        const ranking = runs.slice().filter((r) => r.found).sort((a, b) => a.len - b.len);
        runs.forEach(function (r) {
          const done = step >= r.len - 1;
          const visN = Math.min(step + 1, r.len);
          const visSet = new Set(r.order.slice(0, visN));
          const showPath = done && r.found;
          const cell = el('div.race-cell' + (done ? '.done' : ''));
          const rank = ranking.findIndex((x) => x.key === r.key) + 1;
          cell.appendChild(el('h4', [
            el('span', r.name),
            el('span.mono.dim', done ? (r.found ? '#' + rank + ' · ' + r.len + ' cells' : 'no path') : (visN + ' cells'))
          ]));
          const g = el('div.grid', { style: { gridTemplateColumns: 'repeat(' + COLS + ', 1fr)', gap: '1px', width: '100%' } });
          const pathSet = new Set(showPath ? r.path : []);
          for (let i = 0; i < ROWS * COLS; i++) {
            const gc = el('div.grid-cell', { style: { width: 'auto', aspectRatio: '1 / 1' } });
            if (i === START) gc.classList.add('start');
            else if (i === END) gc.classList.add('end');
            else if (walls.has(i)) gc.classList.add('wall');
            else if (pathSet.has(i)) gc.classList.add('path');
            else if (visSet.has(i)) gc.classList.add('visited');
            g.appendChild(gc);
          }
          cell.appendChild(g);
          grid.appendChild(cell);
        });
        stage.appendChild(grid);
      }

      function buildFrames() {
        prepare();
        const n = Math.max.apply(null, runs.map((r) => r.len).concat([1]));
        const frames = [];
        for (let i = 0; i < n; i++) {
          const done = runs.filter((r) => i >= r.len - 1).length;
          frames.push({ i, status: 'Exploring… ' + done + ' / ' + runs.length + ' reached the goal' });
        }
        const winner = runs.filter((r) => r.found).sort((a, b) => a.len - b.len)[0];
        frames[frames.length - 1].status = winner
          ? '🏆 ' + winner.name + ' explored the fewest cells (' + winner.len + '). A* wins when its heuristic points at the goal.'
          : 'No path exists in this maze.';
        return frames;
      }

      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 60,
        render: render,
        legend: [
          { color: 'var(--good)', label: 'Start' },
          { color: 'var(--danger)', label: 'End' },
          { color: '#3a4062', label: 'Wall' },
          { color: 'var(--accent)', label: 'Explored' },
          { color: 'var(--warn)', label: 'Path' }
        ],
        complexity: { BFS: 'O(V+E)', Dijkstra: 'O((V+E)log V)', 'A*': 'O((V+E)log V), goal-directed' },
        controls: [
          { label: '🧱 New maze', onClick: function () { randomMaze(); load(); } }
        ],
        onReady: function (a) { load(a); }
      });
      function load(a) { const x = a || api; x.setFrames(buildFrames()); x.setStatus('Same maze, three algorithms. Press play to race.'); }
      return api;
    }
  });
})();
