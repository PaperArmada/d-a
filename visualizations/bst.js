/* Binary Search Tree — insert / delete / search + traversals, SVG rendered. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;
  const Util = window.Util;

  function Node(v) { return { v: v, left: null, right: null }; }

  function insert(root, v) {
    if (!root) return Node(v);
    if (v < root.v) root.left = insert(root.left, v);
    else if (v > root.v) root.right = insert(root.right, v);
    return root;
  }
  function removeNode(root, v) {
    if (!root) return null;
    if (v < root.v) root.left = removeNode(root.left, v);
    else if (v > root.v) root.right = removeNode(root.right, v);
    else {
      if (!root.left) return root.right;
      if (!root.right) return root.left;
      let s = root.right; while (s.left) s = s.left;
      root.v = s.v; root.right = removeNode(root.right, s.v);
    }
    return root;
  }

  // assign x by in-order index, y by depth
  function layout(root) {
    const nodes = []; const edges = []; let i = 0;
    (function walk(n, depth) {
      if (!n) return;
      walk(n.left, depth + 1);
      n._x = i++; n._d = depth;
      nodes.push(n);
      walk(n.right, depth + 1);
    })(root, 0);
    nodes.forEach(function (n) {
      if (n.left) edges.push([n, n.left]);
      if (n.right) edges.push([n, n.right]);
    });
    return { nodes, edges, count: i };
  }

  window.Registry.register({
    id: 'bst',
    title: 'Binary Search Tree',
    category: 'Trees',
    blurb: 'Ordered tree. insert / search / delete in O(h); traversals.',
    longDesc: 'A BST keeps every left subtree smaller and every right subtree larger than the node. ' +
      'That ordering makes search, insert and delete run in O(h) — O(log n) when balanced.',
    create: function (container) {
      let root = null;
      [50, 30, 70, 20, 40, 60, 80, 35].forEach(function (v) { root = insert(root, v); });

      const input = el('input.field', { type: 'text', value: String(Util.randInt(1, 99)), style: { width: '80px' } });
      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage.svg-stage', { style: { minHeight: '300px' } });
      let timer = null;
      function stop() { if (timer) { clearTimeout(timer); timer = null; } }
      function setStatus(h) { status.innerHTML = h; }

      function render(mark) {
        clear(stage);
        mark = mark || {};
        const { nodes, edges, count } = layout(root);
        if (!count) { stage.appendChild(el('p.dim', 'empty tree — insert a value')); return; }
        const COLW = 54, ROWH = 72, R = 20, PAD = 30;
        const maxD = Math.max.apply(null, nodes.map((n) => n._d));
        const width = Math.max(560, PAD * 2 + (count - 1) * COLW + R * 2);
        const height = PAD * 2 + maxD * ROWH + R * 2;
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + width + ' ' + height, width: width });
        const X = (n) => PAD + R + n._x * COLW;
        const Y = (n) => PAD + R + n._d * ROWH;
        edges.forEach(function (e) {
          svg.appendChild(svgEl('line', { x1: X(e[0]), y1: Y(e[0]), x2: X(e[1]), y2: Y(e[1]), class: 'edge-line' }));
        });
        nodes.forEach(function (n) {
          let cls = 'node-circle';
          if (mark.active === n.v) cls += ' is-active';
          if (mark.hit === n.v) cls += ' is-done';
          if (mark.visited && mark.visited.indexOf(n.v) >= 0) cls += ' is-visit';
          if (mark.isNew === n.v) cls += ' is-visit';
          svg.appendChild(svgEl('circle', { cx: X(n), cy: Y(n), r: R, class: cls }));
          const filled = /is-active|is-done|is-visit/.test(cls);
          svg.appendChild(svgEl('text', { x: X(n), y: Y(n), class: 'node-text' + (filled ? ' on-fill' : ''), text: String(n.v) }));
        });
        stage.appendChild(svg);
      }

      // Animated search path
      function searchPath(v, onEnd) {
        stop();
        const path = [];
        let cur = root;
        while (cur) { path.push(cur.v); if (v === cur.v) break; cur = v < cur.v ? cur.left : cur.right; }
        let i = 0;
        (function step() {
          if (i >= path.length) { onEnd(cur != null, path); return; }
          const isHit = cur != null && path[i] === v && i === path.length - 1;
          render(isHit ? { hit: v, visited: path.slice(0, i) } : { active: path[i], visited: path.slice(0, i) });
          setStatus('Compare with ' + path[i] + (v < path[i] ? ' → go left' : v > path[i] ? ' → go right' : ' → match!'));
          i++;
          timer = setTimeout(step, 550);
        })();
      }

      function traverse(kind) {
        stop();
        const order = [];
        (function walk(n) {
          if (!n) return;
          if (kind === 'pre') order.push(n.v);
          walk(n.left);
          if (kind === 'in') order.push(n.v);
          walk(n.right);
          if (kind === 'post') order.push(n.v);
        })(root);
        if (kind === 'bfs') {
          order.length = 0; const q = root ? [root] : [];
          while (q.length) { const n = q.shift(); order.push(n.v); if (n.left) q.push(n.left); if (n.right) q.push(n.right); }
        }
        let i = 0; const visited = [];
        (function step() {
          if (i >= order.length) { setStatus(kind.toUpperCase() + ' traversal: <b>' + order.join(' → ') + '</b>'); return; }
          visited.push(order[i]);
          render({ active: order[i], visited: visited.slice(0, -1) });
          setStatus(kind.toUpperCase() + ': visiting ' + order[i] + ' — [' + visited.join(', ') + ']');
          i++;
          timer = setTimeout(step, 500);
        })();
      }

      const controls = el('div.controls', [
        input,
        el('button.btn.btn--primary', { onclick: function () {
          const v = parseInt(input.value, 10); if (isNaN(v)) return;
          root = insert(root, v); render({ isNew: v }); setStatus('insert(<b>' + v + '</b>)');
          input.value = String(Util.randInt(1, 99));
        } }, '➕ Insert'),
        el('button.btn', { onclick: function () {
          const v = parseInt(input.value, 10); if (isNaN(v)) return;
          searchPath(v, function (found) { setStatus(found ? '✓ Found ' + v : '✗ ' + v + ' not in tree'); });
        } }, '🔍 Search'),
        el('button.btn', { onclick: function () {
          const v = parseInt(input.value, 10); if (isNaN(v)) return;
          searchPath(v, function (found) {
            if (!found) { setStatus('✗ ' + v + ' not found'); return; }
            root = removeNode(root, v); setTimeout(function () { render(); setStatus('Deleted <b>' + v + '</b>'); }, 400);
          });
        } }, '❌ Delete'),
        el('span.spacer'),
        el('button.btn', { onclick: () => traverse('in') }, 'Inorder'),
        el('button.btn', { onclick: () => traverse('pre') }, 'Preorder'),
        el('button.btn', { onclick: () => traverse('post') }, 'Postorder'),
        el('button.btn', { onclick: () => traverse('bfs') }, 'BFS'),
        el('button.btn.btn--ghost', { onclick: function () { stop(); root = null; render(); setStatus('cleared'); } }, '🗑')
      ]);

      container.appendChild(controls);
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.legend', [
        el('span', [el('span.swatch', { style: { background: 'var(--warn)' } }), 'Current']),
        el('span', [el('span.swatch', { style: { background: 'var(--accent)' } }), 'Visited']),
        el('span', [el('span.swatch', { style: { background: 'var(--good)' } }), 'Found'])
      ]));
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Search/Insert/Delete: '), 'O(h)']),
        el('span.pill', [el('b', 'Balanced: '), 'O(log n)']),
        el('span.pill', [el('b', 'Worst (skewed): '), 'O(n)'])
      ]));
      render();
      setStatus('BST with 8 nodes. Inorder traversal yields sorted order.');
      return { destroy: stop };
    }
  });
})();
