/* Recursion & DP — Tower of Hanoi and Fibonacci recursion tree (+ memoization). */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;

  /* ------------------------------------------------------------------ *
   * Tower of Hanoi
   * ------------------------------------------------------------------ */
  window.Registry.register({
    id: 'hanoi',
    title: 'Tower of Hanoi',
    category: 'Recursion & DP',
    blurb: 'Classic recursion. Move n disks in 2ⁿ−1 moves.',
    longDesc: 'Move a stack of disks from the left peg to the right peg, never placing a larger disk on a ' +
      'smaller one. The recursive solution: move n−1 disks aside, move the biggest, then move n−1 back.',
    create: function (container) {
      let n = 4;

      function solve(nn) {
        const moves = [];
        (function h(k, from, to, via) {
          if (k === 0) return;
          h(k - 1, from, via, to);
          moves.push([from, to]);
          h(k - 1, via, to, from);
        })(nn, 0, 2, 1);
        return moves;
      }

      function framesFor(nn) {
        const pegs = [[], [], []];
        for (let d = nn; d >= 1; d--) pegs[0].push(d);
        const frames = [{ pegs: clonePegs(pegs), status: 'Start: ' + nn + ' disks on peg A. Goal: move all to peg C.' }];
        const moves = solve(nn);
        moves.forEach(function (m, i) {
          const disk = pegs[m[0]].pop();
          pegs[m[1]].push(disk);
          frames.push({ pegs: clonePegs(pegs), moving: disk, from: m[0], to: m[1],
            status: 'Move ' + (i + 1) + ' / ' + moves.length + ': disk ' + disk + ' — ' + peg(m[0]) + ' → ' + peg(m[1]) });
        });
        frames.push({ pegs: clonePegs(pegs), done: true,
          status: '✓ Solved in ' + moves.length + ' moves (2^' + nn + ' − 1 = ' + moves.length + ')' });
        return frames;
      }
      function clonePegs(p) { return [p[0].slice(), p[1].slice(), p[2].slice()]; }
      function peg(i) { return ['A', 'B', 'C'][i]; }

      function render(stage, frame) {
        clear(stage);
        if (!frame) return;
        const W = 640, H = 300, pegW = W / 3, baseY = H - 30, maxDiskW = pegW - 30, unit = maxDiskW / n;
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + W + ' ' + H, width: W, style: 'max-width:100%' });
        for (let p = 0; p < 3; p++) {
          const cx = pegW * p + pegW / 2;
          svg.appendChild(svgEl('rect', { x: cx - 3, y: 60, width: 6, height: baseY - 60, rx: 3, fill: 'var(--border)' }));
          svg.appendChild(svgEl('rect', { x: pegW * p + 15, y: baseY, width: pegW - 30, height: 10, rx: 4, fill: 'var(--border)' }));
          svg.appendChild(svgEl('text', { x: cx, y: baseY + 28, class: 'edge-weight', text: peg(p) }));
          frame.pegs[p].forEach(function (disk, level) {
            const w = 20 + disk * unit;
            const y = baseY - (level + 1) * 22;
            const moving = frame.moving === disk && frame.to === p;
            svg.appendChild(svgEl('rect', { x: cx - w / 2, y: y, width: w, height: 18, rx: 6,
              fill: moving ? 'var(--warn)' : 'var(--accent)', stroke: 'var(--bg)', 'stroke-width': 2 }));
            svg.appendChild(svgEl('text', { x: cx, y: y + 9, class: 'node-text on-fill', text: String(disk) }));
          });
        }
        stage.appendChild(svg);
      }

      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 550,
        render: render,
        complexity: { Moves: '2ⁿ − 1', Time: 'O(2ⁿ)', Space: 'O(n)' },
        controls: [
          { label: '➖', title: 'fewer disks', onClick: function (a) { n = Math.max(1, n - 1); reload(a); } },
          { label: '➕', title: 'more disks', onClick: function (a) { n = Math.min(8, n + 1); reload(a); } }
        ],
        onReady: function (a) { reload(a); }
      });
      function reload(a) { a.setFrames(framesFor(n)); a.setStatus(n + ' disks — ' + (Math.pow(2, n) - 1) + ' moves needed. Press play.'); }
      return api;
    }
  });

  /* ------------------------------------------------------------------ *
   * Fibonacci recursion tree (naive vs memoized)
   * ------------------------------------------------------------------ */
  window.Registry.register({
    id: 'fib-tree',
    title: 'Fibonacci Recursion',
    category: 'Recursion & DP',
    blurb: 'Recursion tree; see why memoization collapses O(2ⁿ) → O(n).',
    longDesc: 'fib(n) = fib(n−1) + fib(n−2). The naive recursion re-computes the same subproblems ' +
      'exponentially often. Toggle memoization to watch repeated calls become instant cache hits.',
    create: function (container) {
      let n = 6;
      let memoOn = false;

      // Build call tree + event frames.
      function build(nn, memo) {
        let nextId = 0;
        const root = null;
        const cache = {};
        const frames = [];
        const allNodes = [];

        function node(val, depth) { const o = { id: nextId++, val: val, children: [], depth: depth, state: 'call' }; allNodes.push(o); return o; }

        function snap(status) {
          frames.push({ nodes: allNodes.map((x) => ({ id: x.id, val: x.val, depth: x.depth, parent: x.parent, state: x.state })), status: status });
        }

        function fib(val, depth, parent) {
          const nd = node(val, depth); nd.parent = parent;
          snap('Call fib(' + val + ')');
          if (memo && cache[val] != null) {
            nd.state = 'memo';
            snap('fib(' + val + ') already computed → cache hit = ' + cache[val]);
            nd.result = cache[val];
            return cache[val];
          }
          if (val < 2) {
            nd.state = 'base'; nd.result = val;
            snap('Base case fib(' + val + ') = ' + val);
            if (memo) cache[val] = val;
            return val;
          }
          const a = fib(val - 1, depth + 1, nd.id);
          const b = fib(val - 2, depth + 1, nd.id);
          nd.state = 'done'; nd.result = a + b;
          if (memo) cache[val] = a + b;
          snap('Return fib(' + val + ') = ' + a + ' + ' + b + ' = ' + nd.result);
          return a + b;
        }
        fib(nn, 0, null);
        // annotate results into frames' final node states is complex; keep labels as values.
        // count calls
        frames.callCount = allNodes.length;
        return frames;
      }

      // layered layout: assign x by DFS leaf order over nodes present in frame
      function render(stage, frame) {
        clear(stage);
        if (!frame) return;
        const nodes = frame.nodes;
        if (!nodes.length) return;
        // compute x positions: order of appearance = pre-order; use index among same nothing. Simpler: BFS columns by an in-order sweep.
        // Build children map
        const byId = {}; nodes.forEach((n) => { byId[n.id] = Object.assign({}, n, { children: [] }); });
        let rootNode = null;
        nodes.forEach((n) => { if (n.parent == null) rootNode = byId[n.id]; else if (byId[n.parent]) byId[n.parent].children.push(byId[n.id]); });
        let leaf = 0; let maxDepth = 0;
        (function assign(nd) {
          maxDepth = Math.max(maxDepth, nd.depth);
          if (!nd.children.length) { nd._x = leaf++; return; }
          nd.children.forEach(assign);
          nd._x = (nd.children[0]._x + nd.children[nd.children.length - 1]._x) / 2;
        })(rootNode);
        const cols = Math.max(1, leaf);
        const COLW = Math.max(46, Math.min(70, 760 / cols));
        const ROWH = 64, R = 18, PAD = 24;
        const width = Math.max(400, PAD * 2 + (cols) * COLW);
        const height = PAD * 2 + maxDepth * ROWH + R * 2;
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + width + ' ' + height, width: width, style: 'max-width:100%' });
        const X = (nd) => PAD + R + nd._x * COLW;
        const Y = (nd) => PAD + R + nd.depth * ROWH;
        // edges
        Object.values(byId).forEach(function (nd) {
          nd.children.forEach(function (ch) {
            svg.appendChild(svgEl('line', { x1: X(nd), y1: Y(nd), x2: X(ch), y2: Y(ch), class: 'edge-line' }));
          });
        });
        Object.values(byId).forEach(function (nd) {
          let cls = 'node-circle';
          if (nd.state === 'memo') cls += ' is-path';
          else if (nd.state === 'base') cls += ' is-frontier';
          else if (nd.state === 'done') cls += ' is-done';
          else cls += ' is-active';
          svg.appendChild(svgEl('circle', { cx: X(nd), cy: Y(nd), r: R, class: cls }));
          svg.appendChild(svgEl('text', { x: X(nd), y: Y(nd), class: 'node-text on-fill', text: String(nd.val) }));
        });
        stage.appendChild(svg);
      }

      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 450,
        render: render,
        legend: [
          { color: 'var(--warn)', label: 'Calling' },
          { color: '#c084fc', label: 'Base case' },
          { color: 'var(--good)', label: 'Returned' },
          { color: 'var(--accent-2)', label: 'Cache hit (memo)' }
        ],
        complexity: { Naive: 'O(2ⁿ)', Memoized: 'O(n)', Space: 'O(n)' },
        controls: [
          { label: '➖ n', onClick: function (a) { n = Math.max(1, n - 1); reload(a); } },
          { label: '➕ n', onClick: function (a) { n = Math.min(9, n + 1); reload(a); } },
          { label: '🧠 Toggle memo', onClick: function (a) { memoOn = !memoOn; reload(a); } }
        ],
        onReady: function (a) { reload(a); }
      });
      function reload(a) {
        const frames = build(n, memoOn);
        a.setFrames(frames);
        a.setStatus('fib(' + n + ')' + (memoOn ? ' with memoization' : ' (naive)') + ' — ' + frames.callCount + ' total calls. Press play.');
      }
      return api;
    }
  });
})();
