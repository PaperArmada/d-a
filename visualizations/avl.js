/* AVL Tree — self-balancing BST. Insert values and watch the LL/LR/RL/RR
   rotations that keep the tree height-balanced. Frame-based playback. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;
  const Util = window.Util;

  const h = (n) => (n ? n.h : 0);
  const upd = (n) => { n.h = 1 + Math.max(h(n.left), h(n.right)); };
  const bf = (n) => (n ? h(n.left) - h(n.right) : 0);
  function rotR(y) { const x = y.left; y.left = x.right; x.right = y; upd(y); upd(x); return x; }
  function rotL(x) { const y = x.right; x.right = y.left; y.left = x; upd(x); upd(y); return y; }

  // in-order x, depth y
  function layout(root) {
    const nodes = []; let i = 0;
    (function walk(n, d) { if (!n) return; walk(n.left, d + 1); n._x = i++; n._d = d; nodes.push(n); walk(n.right, d + 1); })(root, 0);
    const edges = [];
    nodes.forEach((n) => { if (n.left) edges.push([n, n.left]); if (n.right) edges.push([n, n.right]); });
    return { nodes, edges, count: i };
  }

  function cloneTree(root) {
    if (!root) return null;
    return { v: root.v, h: root.h, left: cloneTree(root.left), right: cloneTree(root.right) };
  }

  window.Registry.register({
    id: 'avl',
    title: 'AVL Tree (Self-Balancing)',
    category: 'Trees',
    blurb: 'BST that rotates to stay balanced — guaranteed O(log n).',
    longDesc: 'An AVL tree keeps every node\'s balance factor (left height − right height) in {−1,0,1}. ' +
      'After an insert it walks back up and, if a node becomes unbalanced, performs a single or double ' +
      'rotation (LL, RR, LR, RL). Each node shows its balance factor; watch rotations restore balance.',
    create: function (container, params) {
      let root = null;
      const seed = (params && params.seq) ? Util.parseList(params.seq, null) : [30, 20, 10, 25, 40, 50, 5];
      (seed || []).forEach((v) => { root = plainInsertAndBalance(root, v).root; });

      function snap(tree, mark, status, line) {
        return { tree: cloneTree(tree), mark: mark || {}, status: status, line: line };
      }

      function plainInsertAndBalance(r, v) {
        // Non-animated insert used for seeding.
        function ins(node) {
          if (!node) return { v, h: 1, left: null, right: null };
          if (v < node.v) node.left = ins(node.left);
          else if (v > node.v) node.right = ins(node.right);
          else return node;
          upd(node);
          const b = bf(node);
          if (b > 1 && bf(node.left) >= 0) return rotR(node);
          if (b > 1) { node.left = rotL(node.left); return rotR(node); }
          if (b < -1 && bf(node.right) <= 0) return rotL(node);
          if (b < -1) { node.right = rotR(node.right); return rotL(node); }
          return node;
        }
        return { root: ins(r) };
      }

      function buildInsert(v) {
        const frames = [];
        if (!root) { root = { v, h: 1, left: null, right: null }; frames.push(snap(root, { isNew: v }, 'Insert ' + v + ' as root', 0)); return frames; }
        // 1. BST insert, recording path
        const path = [];
        let cur = root;
        while (true) {
          path.push(cur);
          if (v < cur.v) { if (cur.left) cur = cur.left; else { cur.left = { v, h: 1, left: null, right: null }; break; } }
          else if (v > cur.v) { if (cur.right) cur = cur.right; else { cur.right = { v, h: 1, left: null, right: null }; break; } }
          else { frames.push(snap(root, { active: v }, v + ' already present — no change', 0)); return frames; }
        }
        frames.push(snap(root, { isNew: v }, 'BST insert ' + v + ' (before rebalancing)', 1));
        // 2. walk up, update heights, rebalance at first unbalanced ancestor
        for (let i = path.length - 1; i >= 0; i--) {
          const node = path[i];
          upd(node);
          const b = bf(node);
          if (Math.abs(b) <= 1) continue;
          const parent = i > 0 ? path[i - 1] : null;
          let sub, kind;
          if (b > 1 && v < node.left.v) { kind = 'LL'; sub = rotR(node); }
          else if (b > 1) { kind = 'LR'; node.left = rotL(node.left); sub = rotR(node); }
          else if (b < -1 && v > node.right.v) { kind = 'RR'; sub = rotL(node); }
          else { kind = 'RL'; node.right = rotR(node.right); sub = rotL(node); }
          if (!parent) root = sub;
          else if (parent.left === node) parent.left = sub;
          else parent.right = sub;
          frames.push(snap(root, { active: sub.v }, 'Unbalanced at ' + node.v + ' (bf=' + b + ') → <b>' + kind + '</b> rotation', 2));
          break;
        }
        frames.push(snap(root, {}, 'Balanced ✓ — all balance factors in {−1,0,1}', 3));
        return frames;
      }

      function render(stage, frame) {
        clear(stage);
        if (!frame) return;
        const t = frame.tree; const mark = frame.mark || {};
        const { nodes, edges, count } = layout(t);
        if (!count) { stage.appendChild(el('p.dim', 'empty tree — insert a value')); return; }
        const COLW = 56, ROWH = 74, R = 20, PAD = 30;
        const maxD = Math.max.apply(null, nodes.map((n) => n._d));
        const width = Math.max(560, PAD * 2 + (count - 1) * COLW + R * 2);
        const height = PAD * 2 + maxD * ROWH + R * 2 + 10;
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + width + ' ' + height, width });
        const X = (n) => PAD + R + n._x * COLW, Y = (n) => PAD + R + n._d * ROWH;
        edges.forEach((e) => svg.appendChild(svgEl('line', { x1: X(e[0]), y1: Y(e[0]), x2: X(e[1]), y2: Y(e[1]), class: 'edge-line' })));
        nodes.forEach(function (n) {
          let cls = 'node-circle';
          if (mark.active === n.v) cls += ' is-active';
          if (mark.isNew === n.v) cls += ' is-visit';
          svg.appendChild(svgEl('circle', { cx: X(n), cy: Y(n), r: R, class: cls }));
          const filled = mark.active === n.v || mark.isNew === n.v;
          svg.appendChild(svgEl('text', { x: X(n), y: Y(n), class: 'node-text' + (filled ? ' on-fill' : ''), text: String(n.v) }));
          const b = h(n.left) - h(n.right);
          svg.appendChild(svgEl('text', { x: X(n) + R - 2, y: Y(n) - R + 2, class: 'edge-weight',
            style: 'fill:' + (Math.abs(b) > 1 ? 'var(--danger)' : 'var(--text-dim)'), text: (b > 0 ? '+' : '') + b }));
        });
        stage.appendChild(svg);
      }

      const inp = el('input.field', { type: 'text', value: String(Util.randInt(1, 99)), style: { width: '80px' } });

      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 800,
        render: render,
        pseudocode: [
          'insert value (BST rule)',
          'walk back up to the root',
          'if |balance factor| > 1: rotate (LL/LR/RL/RR)',
          'update heights → balanced'
        ],
        legend: [
          { color: 'var(--warn)', label: 'Rotated node' },
          { color: 'var(--accent)', label: 'New node' },
          { color: 'var(--danger)', label: 'bf out of range' }
        ],
        complexity: { Search: 'O(log n)', Insert: 'O(log n)', Height: '≤ 1.44·log n' },
        topControls: [
          el('div.control-group', [el('label', 'value'), inp]),
          el('button.btn.btn--primary', { onclick: function () {
            const v = parseInt(inp.value, 10); if (isNaN(v)) return;
            api.setFrames(buildInsert(v)); api.player.play();
            inp.value = String(Util.randInt(1, 99));
          } }, '➕ Insert & balance'),
          el('button.btn', { onclick: function () {
            root = null; const s = Util.distinctArray(8, 1, 99);
            s.forEach((v) => { root = plainInsertAndBalance(root, v).root; });
            api.setFrames([snap(root, {}, 'Built a random balanced AVL from ' + s.join(', '), 3)]);
          } }, '🎲 Random tree'),
          el('button.btn.btn--ghost', { onclick: function () { root = null; api.setFrames([snap(root, {}, 'cleared', 0)]); } }, '🗑 Clear')
        ],
        onReady: function (a) { a.setFrames([snap(root, {}, 'AVL tree seeded. Insert a value to watch it rebalance.', 3)]); }
      });
      return api;
    }
  });
})();
