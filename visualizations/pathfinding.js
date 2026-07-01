/* Pathfinding on a grid — BFS, Dijkstra, A*. Draw walls, then watch it search. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  const ROWS = 16, COLS = 30;

  window.Registry.register({
    id: 'pathfinding',
    title: 'Pathfinding (Grid)',
    category: 'Graphs',
    blurb: 'BFS / Dijkstra / A* on a grid. Draw walls and search.',
    longDesc: 'Find the shortest path from start (green) to end (red). Click-drag on the grid to draw or erase ' +
      'walls, choose an algorithm, then run. Purple = frontier, blue = visited, yellow = final path.',
    create: function (container) {
      let walls = new Set();
      let start = idx(8, 3), end = idx(8, 26);
      let frames = [];
      let fi = 0;
      let playing = false, timer = null;
      let algo = 'astar';
      let drag = null; // 'wall' | 'erase' | 'start' | 'end'

      function idx(r, c) { return r * COLS + c; }
      function rc(i) { return [Math.floor(i / COLS), i % COLS]; }

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage', { style: { minHeight: '0', display: 'flex', justifyContent: 'center' } });
      const grid = el('div.grid', { style: { gridTemplateColumns: 'repeat(' + COLS + ', 24px)', touchAction: 'none' } });
      const cellEls = [];
      function setStatus(h) { status.innerHTML = h; }

      for (let i = 0; i < ROWS * COLS; i++) {
        const c = el('div.grid-cell', { dataset: { i: i } });
        cellEls.push(c);
        grid.appendChild(c);
      }
      // Pointer events unify mouse + touch + pen. During a drag we resolve the
      // cell under the pointer via elementFromPoint so touch-drag works too.
      grid.addEventListener('pointerdown', function (e) {
        const i = cellIndexFrom(e.target);
        if (i < 0) return;
        e.preventDefault();
        if (e.pointerId != null && grid.setPointerCapture) { try { grid.releasePointerCapture(e.pointerId); } catch (_) {} }
        onDown(i);
      });
      grid.addEventListener('pointermove', function (e) {
        if (!drag) return;
        e.preventDefault();
        const el2 = document.elementFromPoint(e.clientX, e.clientY);
        const i = cellIndexFrom(el2);
        if (i >= 0) onEnter(i);
      });
      window.addEventListener('pointerup', function () { drag = null; });
      window.addEventListener('pointercancel', function () { drag = null; });
      function cellIndexFrom(node) {
        if (!node || !node.dataset || node.dataset.i == null) return -1;
        return parseInt(node.dataset.i, 10);
      }
      stage.appendChild(grid);

      function onDown(i) {
        if (playing) return;
        if (i === start) drag = 'start';
        else if (i === end) drag = 'end';
        else { drag = walls.has(i) ? 'erase' : 'wall'; applyDrag(i); }
        clearSearch(); paint();
      }
      function onEnter(i) { applyDrag(i); paint(); }
      function applyDrag(i) {
        if (drag === 'wall' && i !== start && i !== end) walls.add(i);
        else if (drag === 'erase') walls.delete(i);
        else if (drag === 'start' && i !== end && !walls.has(i)) start = i;
        else if (drag === 'end' && i !== start && !walls.has(i)) end = i;
      }

      function clearSearch() { frames = []; fi = 0; stop(); }
      function stop() { playing = false; if (timer) { clearTimeout(timer); timer = null; } }

      function paint(frame) {
        for (let i = 0; i < cellEls.length; i++) {
          const c = cellEls[i];
          c.className = 'grid-cell';
          if (walls.has(i)) c.classList.add('wall');
        }
        if (frame) {
          (frame.visited || []).forEach((i) => { if (i !== start && i !== end) cellEls[i].classList.add('visited'); });
          (frame.frontier || []).forEach((i) => { if (i !== start && i !== end) cellEls[i].classList.add('frontier'); });
          (frame.path || []).forEach((i) => { if (i !== start && i !== end) cellEls[i].classList.add('path'); });
        }
        cellEls[start].classList.add('start');
        cellEls[end].classList.add('end');
      }

      function neighbors(i) {
        const [r, c] = rc(i); const out = [];
        if (r > 0) out.push(idx(r - 1, c));
        if (r < ROWS - 1) out.push(idx(r + 1, c));
        if (c > 0) out.push(idx(r, c - 1));
        if (c < COLS - 1) out.push(idx(r, c + 1));
        return out.filter((n) => !walls.has(n));
      }
      function heuristic(a, b) { const [r1, c1] = rc(a), [r2, c2] = rc(b); return Math.abs(r1 - r2) + Math.abs(c1 - c2); }

      // Generate search frames. BFS/Dijkstra behave the same on a unit grid; A* uses heuristic.
      function build() {
        const dist = {}; const prev = {}; const visitedOrder = [];
        const pq = [{ i: start, f: 0, g: 0 }];
        dist[start] = 0;
        const seen = new Set();
        const frontierSnap = [];
        let found = false;
        while (pq.length) {
          // pop lowest f
          let bi = 0; for (let k = 1; k < pq.length; k++) if (pq[k].f < pq[bi].f) bi = k;
          const cur = pq.splice(bi, 1)[0];
          if (seen.has(cur.i)) continue;
          seen.add(cur.i);
          visitedOrder.push(cur.i);
          frontierSnap.push(pq.map((x) => x.i));
          if (cur.i === end) { found = true; break; }
          neighbors(cur.i).forEach(function (n) {
            if (seen.has(n)) return;
            const ng = cur.g + 1;
            if (dist[n] == null || ng < dist[n]) {
              dist[n] = ng; prev[n] = cur.i;
              const h = algo === 'astar' ? heuristic(n, end) : 0;
              pq.push({ i: n, g: ng, f: ng + h });
            }
          });
        }
        // frames: reveal visited incrementally
        frames = [];
        const vis = [];
        for (let k = 0; k < visitedOrder.length; k++) {
          vis.push(visitedOrder[k]);
          frames.push({ visited: vis.slice(), frontier: frontierSnap[k],
            status: 'Explored ' + vis.length + ' cells… (' + algoName() + ')' });
        }
        // path
        if (found) {
          const path = []; let cur = end;
          while (cur != null && cur !== start) { path.unshift(cur); cur = prev[cur]; }
          for (let k = 0; k <= path.length; k++) {
            frames.push({ visited: visitedOrder.slice(), path: path.slice(0, k),
              status: '✓ Path found — length ' + path.length + ' steps, ' + visitedOrder.length + ' cells explored' });
          }
        } else {
          frames.push({ visited: visitedOrder.slice(), status: '✗ No path — start is walled off from end' });
        }
        fi = 0;
      }
      function algoName() { return algo === 'astar' ? 'A* (Manhattan)' : algo === 'dijkstra' ? 'Dijkstra' : 'BFS'; }

      function run() {
        stop(); clearSearch(); build();
        playing = true;
        (function tick() {
          if (!playing || fi >= frames.length) { playing = false; updateBtn(); return; }
          const f = frames[fi++];
          paint(f); setStatus(f.status);
          timer = setTimeout(tick, 18);
        })();
        updateBtn();
      }

      const btnRun = el('button.btn.btn--primary', { onclick: function () { if (playing) { stop(); updateBtn(); } else run(); } }, '▶ Run');
      function updateBtn() { btnRun.innerHTML = playing ? '⏸ Stop' : '▶ Run'; }

      const algoSel = el('select', { onchange: function (e) { algo = e.target.value; clearSearch(); paint(); setStatus('Algorithm: ' + algoName()); } });
      [['astar', 'A*'], ['dijkstra', 'Dijkstra'], ['bfs', 'BFS']].forEach((o) =>
        algoSel.appendChild(el('option', { value: o[0], selected: o[0] === algo }, o[1])));

      function mazeRandom() {
        clearSearch(); walls = new Set();
        for (let i = 0; i < ROWS * COLS; i++) { if (i !== start && i !== end && Math.random() < 0.28) walls.add(i); }
        paint(); setStatus('random walls generated');
      }

      const controls = el('div.controls', [
        btnRun,
        el('div.control-group', [el('label', 'Algorithm'), algoSel]),
        el('span.spacer'),
        el('button.btn', { onclick: mazeRandom }, '🧱 Random walls'),
        el('button.btn.btn--ghost', { onclick: function () { clearSearch(); walls = new Set(); paint(); setStatus('cleared'); } }, '🗑 Clear walls')
      ]);

      container.appendChild(controls);
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.legend', [
        el('span', [el('span.swatch', { style: { background: 'var(--good)' } }), 'Start']),
        el('span', [el('span.swatch', { style: { background: 'var(--danger)' } }), 'End']),
        el('span', [el('span.swatch', { style: { background: '#3a4062' } }), 'Wall']),
        el('span', [el('span.swatch', { style: { background: '#c084fc' } }), 'Frontier']),
        el('span', [el('span.swatch', { style: { background: 'var(--accent)' } }), 'Visited']),
        el('span', [el('span.swatch', { style: { background: 'var(--warn)' } }), 'Path'])
      ]));
      container.appendChild(el('p.hint', 'Tip: click-drag to draw walls; drag the green/red squares to move start & end. ' +
        'A* is goal-directed (fewer cells explored); BFS/Dijkstra explore uniformly.'));

      paint();
      setStatus('Draw some walls, then press Run. A* uses the Manhattan-distance heuristic.');
      return { destroy: stop };
    }
  });
})();
