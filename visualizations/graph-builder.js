/* Build-Your-Own Graph — draw a graph (add/move/connect/delete nodes and
   edges), then run BFS, DFS, or Dijkstra on it and watch it animate. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;

  window.Registry.register({
    id: 'graph-builder',
    title: 'Build-Your-Own Graph',
    category: 'Graphs',
    blurb: 'Draw nodes & edges, then run BFS / DFS / Dijkstra on your graph.',
    longDesc: 'Click empty space to add a node; click one node then another to connect them; drag to move. ' +
      'Switch to Delete to remove. Pick a start node and an algorithm, then Run to animate BFS, DFS, or ' +
      "Dijkstra on the graph you built. Weights are shown on edges (Dijkstra uses them; BFS/DFS don't).",
    create: function (container) {
      const W = 720, H = 420, R = 20;
      let nodes = [ { id: 0, x: 120, y: 210 }, { id: 1, x: 300, y: 110 }, { id: 2, x: 300, y: 310 },
                    { id: 3, x: 480, y: 110 }, { id: 4, x: 480, y: 310 }, { id: 5, x: 620, y: 210 } ];
      let edges = [ e(0, 1, 4), e(0, 2, 2), e(1, 3, 5), e(2, 4, 3), e(3, 5, 2), e(4, 5, 6), e(1, 2, 1) ];
      let nextId = 6;
      let mode = 'edit';         // 'edit' | 'delete'
      let startNode = 0;
      let selected = null;       // node id awaiting an edge partner
      let dragId = null, dragMoved = false, downPt = null;
      let timer = null, running = false;
      let marks = {};

      function e(a, b, w) { return { a, b, w }; }
      function nodeById(id) { return nodes.find((n) => n.id === id); }
      function adjacency() {
        const adj = {}; nodes.forEach((n) => (adj[n.id] = []));
        edges.forEach((ed) => { adj[ed.a].push([ed.b, ed.w]); adj[ed.b].push([ed.a, ed.w]); });
        for (const k in adj) adj[k].sort((x, y) => x[0] - y[0]);
        return adj;
      }
      function edgeBetween(a, b) { return edges.find((ed) => (ed.a === a && ed.b === b) || (ed.a === b && ed.b === a)); }

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage.svg-stage', { style: { minHeight: '440px', padding: '0' } });
      let svg;
      function setStatus(h) { status.innerHTML = h; }
      function stop() { running = false; if (timer) { clearTimeout(timer); timer = null; } }

      function render() {
        clear(stage);
        svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + W + ' ' + H, width: W, style: 'max-width:100%;cursor:' + (mode === 'delete' ? 'not-allowed' : 'crosshair') });
        // edges
        const activeKey = marks.activeEdge ? key(marks.activeEdge[0], marks.activeEdge[1]) : null;
        const treeSet = new Set((marks.tree || []).map((t) => key(t[0], t[1])));
        edges.forEach(function (ed) {
          const a = nodeById(ed.a), b = nodeById(ed.b);
          const k = key(ed.a, ed.b);
          let cls = 'edge-line';
          if (k === activeKey) cls += ' is-active';
          else if (treeSet.has(k)) cls += ' is-path';
          const line = svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: cls, style: 'cursor:pointer' });
          if (mode === 'delete') line.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); edges = edges.filter((x) => x !== ed); render(); });
          svg.appendChild(line);
          svg.appendChild(svgEl('text', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 5, class: 'edge-weight', text: String(ed.w) }));
        });
        // nodes
        const visited = new Set(marks.visited || []);
        const frontier = new Set(marks.frontier || []);
        nodes.forEach(function (n) {
          let cls = 'node-circle';
          if (n.id === marks.current) cls += ' is-active';
          else if (visited.has(n.id)) cls += (marks.dist ? ' is-done' : ' is-visit');
          else if (frontier.has(n.id)) cls += ' is-frontier';
          else if (n.id === selected) cls += ' is-active';
          else if (n.id === startNode) cls += ' is-visit';
          const c = svgEl('circle', { cx: n.x, cy: n.y, r: R, class: cls, style: 'cursor:' + (mode === 'delete' ? 'pointer' : 'grab') });
          c.addEventListener('pointerdown', (ev) => onNodeDown(ev, n));
          svg.appendChild(c);
          const filled = n.id === marks.current || visited.has(n.id) || frontier.has(n.id) || n.id === selected || n.id === startNode;
          const t = svgEl('text', { x: n.x, y: n.y, class: 'node-text' + (filled ? ' on-fill' : ''), text: String(n.id), style: 'pointer-events:none' });
          svg.appendChild(t);
          if (marks.dist && marks.dist[n.id] != null) {
            svg.appendChild(svgEl('text', { x: n.x, y: n.y + R + 13, class: 'edge-weight', style: 'fill:var(--accent-2);font-weight:700',
              text: marks.dist[n.id] === Infinity ? '∞' : String(marks.dist[n.id]) }));
          }
          if (n.id === startNode && !running) {
            svg.appendChild(svgEl('text', { x: n.x, y: n.y - R - 8, class: 'edge-weight', style: 'fill:var(--accent-2)', text: 'start' }));
          }
        });
        // background surface for adding nodes / clearing selection
        svg.addEventListener('pointerdown', onCanvasDown);
        stage.appendChild(svg);
      }
      function key(a, b) { return Math.min(a, b) + '-' + Math.max(a, b); }

      function svgPoint(ev) {
        const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        return { x: p.x, y: p.y };
      }

      function onCanvasDown(ev) {
        if (running) return;
        // Only fires when the target is the svg itself (empty space)
        if (ev.target.tagName !== 'svg') return;
        if (mode === 'delete') { selected = null; render(); return; }
        const p = svgPoint(ev);
        if (p.x < R || p.x > W - R || p.y < R || p.y > H - R) return;
        nodes.push({ id: nextId++, x: p.x, y: p.y });
        selected = null;
        render();
        setStatus('Added node ' + (nextId - 1) + '. Click two nodes to connect them.');
      }

      function onNodeDown(ev, n) {
        ev.stopPropagation();
        if (running) return;
        if (mode === 'delete') {
          nodes = nodes.filter((x) => x !== n);
          edges = edges.filter((ed) => ed.a !== n.id && ed.b !== n.id);
          if (startNode === n.id) startNode = nodes.length ? nodes[0].id : 0;
          selected = null; render(); setStatus('Deleted node ' + n.id); return;
        }
        dragId = n.id; dragMoved = false; downPt = svgPoint(ev);
      }

      function onCanvasMove(ev) {
        if (dragId == null || running) return;
        const p = svgPoint(ev);
        if (!dragMoved && Math.hypot(p.x - downPt.x, p.y - downPt.y) < 5) return;
        dragMoved = true;
        const n = nodeById(dragId);
        n.x = Math.max(R, Math.min(W - R, p.x));
        n.y = Math.max(R, Math.min(H - R, p.y));
        render();
      }

      function onUp(ev) {
        if (dragId == null) return;
        const releasedOn = dragId;
        if (!dragMoved) {
          // treat as a click for edge creation / start selection
          if (selected == null) { selected = releasedOn; setStatus('Selected node ' + releasedOn + ' — click another node to connect, or click it again to set as start.'); }
          else if (selected === releasedOn) { startNode = releasedOn; selected = null; setStatus('Node ' + releasedOn + ' is now the start node.'); }
          else {
            if (!edgeBetween(selected, releasedOn)) edges.push(e(selected, releasedOn, 1));
            setStatus('Connected ' + selected + ' ↔ ' + releasedOn + '.');
            selected = null;
          }
          render();
        }
        dragId = null; dragMoved = false;
      }

      // ---- Algorithms → frames ----
      function bfs() {
        const adj = adjacency(); const visited = new Set(); const q = [startNode]; const inQ = new Set([startNode]); const order = []; const F = [];
        F.push({ visited: [], frontier: [startNode], status: 'Enqueue start ' + startNode });
        while (q.length) {
          const u = q.shift(); inQ.delete(u); if (visited.has(u)) continue; visited.add(u); order.push(u);
          F.push({ visited: [...visited], frontier: [...inQ], current: u, status: 'Visit ' + u + ' — order [' + order.join(', ') + ']' });
          adj[u].forEach(([v]) => { if (!visited.has(v) && !inQ.has(v)) { q.push(v); inQ.add(v); } });
        }
        F.push({ visited: [...visited], frontier: [], status: 'BFS done: ' + order.join(' → ') });
        return F;
      }
      function dfs() {
        const adj = adjacency(); const visited = new Set(); const st = [startNode]; const order = []; const F = [];
        F.push({ visited: [], frontier: [startNode], status: 'Push start ' + startNode });
        while (st.length) {
          const u = st.pop(); if (visited.has(u)) continue; visited.add(u); order.push(u);
          F.push({ visited: [...visited], frontier: [...st], current: u, status: 'Visit ' + u + ' — order [' + order.join(', ') + ']' });
          adj[u].map(([v]) => v).filter((v) => !visited.has(v)).reverse().forEach((v) => st.push(v));
        }
        F.push({ visited: [...visited], frontier: [], status: 'DFS done: ' + order.join(' → ') });
        return F;
      }
      function dijkstra() {
        const adj = adjacency(); const dist = {}; const prev = {}; const visited = new Set(); const F = [];
        nodes.forEach((n) => (dist[n.id] = Infinity)); dist[startNode] = 0;
        F.push({ visited: [], dist: Object.assign({}, dist), status: 'dist[' + startNode + ']=0, others ∞' });
        while (visited.size < nodes.length) {
          let u = null, best = Infinity;
          nodes.forEach((n) => { if (!visited.has(n.id) && dist[n.id] < best) { best = dist[n.id]; u = n.id; } });
          if (u == null) break;
          visited.add(u);
          F.push({ visited: [...visited], current: u, dist: Object.assign({}, dist), status: 'Settle ' + u + ' (dist ' + dist[u] + ')' });
          adj[u].forEach(([v, w]) => {
            if (visited.has(v)) return;
            const nd = dist[u] + w;
            F.push({ visited: [...visited], current: u, activeEdge: [u, v], dist: Object.assign({}, dist),
              status: 'Relax ' + u + '→' + v + ': ' + dist[u] + '+' + w + (nd < dist[v] ? ' updates ' + v : ' keeps ' + fmt(dist[v])) });
            if (nd < dist[v]) { dist[v] = nd; prev[v] = u; }
          });
        }
        const tree = []; for (const v in prev) tree.push([prev[v], +v]);
        F.push({ visited: [...visited], dist: Object.assign({}, dist), tree, status: 'Dijkstra done — green edges are shortest paths from ' + startNode });
        return F;
      }
      function fmt(d) { return d === Infinity ? '∞' : d; }

      function run(kind) {
        if (!nodes.length) { setStatus('Add some nodes first.'); return; }
        stop();
        const F = kind === 'bfs' ? bfs() : kind === 'dfs' ? dfs() : dijkstra();
        running = true; selected = null;
        let i = 0;
        (function tick() {
          if (!running || i >= F.length) { running = false; return; }
          marks = F[i++]; render(); setStatus(marks.status);
          timer = setTimeout(tick, 650);
        })();
      }

      const algoSel = el('select');
      [['bfs', 'BFS'], ['dfs', 'DFS'], ['dijkstra', 'Dijkstra']].forEach((o) => algoSel.appendChild(el('option', { value: o[0] }, o[1])));

      const modeBtns = el('div.row', [
        mkMode('edit', '✏️ Edit'),
        mkMode('delete', '🗑 Delete')
      ]);
      function mkMode(m, label) {
        const b = el('button.btn' + (mode === m ? '.btn--primary' : ''), { onclick: function () { mode = m; selected = null; refreshModeBtns(); render(); } }, label);
        b.dataset.mode = m; return b;
      }
      function refreshModeBtns() {
        modeBtns.querySelectorAll('button').forEach((b) => b.classList.toggle('btn--primary', b.dataset.mode === mode));
      }

      const controls = el('div.controls', [
        modeBtns,
        el('span.spacer'),
        el('div.control-group', [el('label', 'Algorithm'), algoSel]),
        el('button.btn.btn--primary', { onclick: function () { marks = {}; run(algoSel.value); } }, '▶ Run'),
        el('button.btn', { onclick: function () { stop(); marks = {}; render(); setStatus('cleared run — graph kept'); } }, '↺ Reset run'),
        el('button.btn.btn--ghost', { onclick: function () { stop(); nodes = []; edges = []; nextId = 0; startNode = 0; marks = {}; selected = null; render(); setStatus('blank canvas — click to add nodes'); } }, '🗑 Clear all')
      ]);

      container.appendChild(controls);
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.legend', [
        el('span', [el('span.swatch', { style: { background: 'var(--accent-2)' } }), 'Start node']),
        el('span', [el('span.swatch', { style: { background: 'var(--warn)' } }), 'Current']),
        el('span', [el('span.swatch', { style: { background: '#c084fc' } }), 'Frontier']),
        el('span', [el('span.swatch', { style: { background: 'var(--accent)' } }), 'Visited']),
        el('span', [el('span.swatch', { style: { background: 'var(--accent-2)' } }), 'Shortest-path tree'])
      ]));
      container.appendChild(el('p.hint', 'Tip: click empty space to add a node · click one node then another to connect · click a selected node again to make it the start · drag to move.'));

      // Drag move / release are tracked on window so they work even when the
      // pointer leaves the current SVG (which is rebuilt on every render).
      window.addEventListener('pointermove', onCanvasMove);
      window.addEventListener('pointerup', onUp);

      render();
      setStatus('A starter graph is loaded. Edit it, or clear all and build your own, then Run an algorithm.');
      return { destroy: function () {
        stop();
        window.removeEventListener('pointermove', onCanvasMove);
        window.removeEventListener('pointerup', onUp);
      } };
    }
  });
})();
