/* B-Tree (2-3-4, min degree t=2) — the disk-friendly tree behind database
   indexes. Wide, shallow nodes; inserts split full nodes on the way down. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;
  const Util = window.Util;

  function node(leaf) { return { keys: [], kids: [], leaf: leaf }; }
  function cloneT(n) { return n ? { keys: n.keys.slice(), leaf: n.leaf, kids: n.kids.map(cloneT) } : null; }

  window.Registry.register({
    id: 'btree',
    title: 'B-Tree',
    category: 'Data & Storage',
    blurb: 'Wide, shallow, always balanced — the tree inside every database index.',
    longDesc: 'A B-tree node holds up to 3 keys (this is a 2-3-4 tree). Full nodes split on the way down, ' +
      'pushing their middle key up — so the tree only ever grows at the root and every leaf stays at the ' +
      'same depth. Wide nodes mean few levels: exactly why databases use B-trees for indexes on disk, where ' +
      'every level is a slow page read.',
    create: function (container, params) {
      let root = node(true);
      const MAXK = 3;

      function snap(mark, status) { return { tree: cloneT(root), mark: mark || {}, status: status }; }

      function splitChild(parent, i, frames) {
        const full = parent.kids[i];
        const mid = full.keys[1];
        const L = { keys: full.keys.slice(0, 1), leaf: full.leaf, kids: full.kids.slice(0, 2) };
        const R = { keys: full.keys.slice(2), leaf: full.leaf, kids: full.kids.slice(2) };
        parent.keys.splice(i, 0, mid);
        parent.kids.splice(i, 2 - 1, L, R);
        frames.push(snap({ hot: [mid] }, 'Node full → split: middle key <b>' + mid + '</b> moves up, halves stay at the same depth'));
      }

      function insert(v) {
        const frames = [snap({ hot: [v] }, 'Insert ' + v)];
        if (root.keys.length === MAXK) {
          const old = root;
          root = node(false); root.kids = [old];
          splitChild(root, 0, frames);
        }
        let cur = root;
        while (true) {
          if (cur.keys.indexOf(v) >= 0) { frames.push(snap({ node: cur.keys }, v + ' already present')); return frames; }
          let i = 0; while (i < cur.keys.length && v > cur.keys[i]) i++;
          frames.push(snap({ node: cur.keys.slice(), hot: [v] }, 'Descend: ' + (cur.leaf ? 'leaf reached' : 'choose child ' + i) +
            ' — node [' + cur.keys.join(' ') + ']'));
          if (cur.leaf) {
            cur.keys.splice(i, 0, v);
            frames.push(snap({ hot: [v] }, 'Placed <b>' + v + '</b> in the leaf ✓ (leaves all share one depth)'));
            return frames;
          }
          if (cur.kids[i].keys.length === MAXK) { splitChild(cur, i, frames); if (v > cur.keys[i]) i++; }
          cur = cur.kids[i];
        }
      }

      // layout: recursive subtree widths
      function render(stage, frame) {
        clear(stage);
        if (!frame || !frame.tree) return;
        const KW = 30, PADN = 8, ROWH = 76, R = 14, PAD = 20;
        function width(n) {
          const own = n.keys.length * KW + PADN * 2;
          if (n.leaf || !n.kids.length) return own;
          let w = 0; n.kids.forEach((k) => { w += width(k) + 12; });
          return Math.max(own, w - 12);
        }
        const totalW = Math.max(560, width(frame.tree) + PAD * 2);
        let maxD = 0;
        const boxes = [], links = [];
        (function place(n, x0, x1, d) {
          maxD = Math.max(maxD, d);
          const cx = (x0 + x1) / 2;
          const w = n.keys.length * KW + PADN * 2;
          const box = { n: n, x: cx - w / 2, y: PAD + d * ROWH, w: w };
          boxes.push(box);
          if (!n.leaf && n.kids.length) {
            let acc = x0;
            const widths = n.kids.map(width);
            const tot = widths.reduce((a, b) => a + b, 0) + 12 * (n.kids.length - 1);
            let cursor = cx - tot / 2;
            n.kids.forEach(function (k, i) {
              const kw = widths[i];
              links.push([cx, box.y + 34, cursor + kw / 2, PAD + (d + 1) * ROWH]);
              place(k, cursor, cursor + kw, d + 1);
              cursor += kw + 12;
            });
          }
        })(frame.tree, PAD, totalW - PAD, 0);
        const H = PAD * 2 + (maxD + 1) * ROWH - 30;
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + totalW + ' ' + H, width: totalW });
        links.forEach((l) => svg.appendChild(svgEl('line', { x1: l[0], y1: l[1], x2: l[2], y2: l[3], class: 'edge-line' })));
        const hot = new Set(frame.mark.hot || []);
        const focusKeys = (frame.mark.node || []).join(',');
        boxes.forEach(function (b) {
          const isFocus = b.n.keys.join(',') === focusKeys && focusKeys !== '';
          svg.appendChild(svgEl('rect', { x: b.x, y: b.y, width: b.w, height: 34, rx: 8,
            class: 'node-circle' + (isFocus ? ' is-active' : '') }));
          b.n.keys.forEach(function (k, i) {
            svg.appendChild(svgEl('text', { x: b.x + PADN + i * KW + KW / 2 - 3, y: b.y + 17,
              class: 'node-text' + (isFocus || hot.has(k) ? ' on-fill' : ''),
              style: hot.has(k) && !isFocus ? 'fill:var(--warn);font-weight:700' : '', text: String(k) }));
          });
        });
        stage.appendChild(svg);
      }

      const inp = el('input.field', { type: 'text', value: String(Util.randInt(1, 99)), style: { width: '76px' } });
      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 800,
        render: render,
        pseudocode: [
          'descend toward the leaf for v',
          'if a child on the path is full (3 keys):',
          '  split it — middle key moves up',
          'insert v into the (never-full) leaf',
          'all leaves remain at equal depth'
        ],
        complexity: { Height: 'O(log n)', 'Node reads (disk pages)': 'few & wide', Search: 'O(log n)' },
        legend: [
          { color: 'var(--warn)', label: 'Node on path / key moving' }
        ],
        topControls: [
          el('div.control-group', [el('label', 'value'), inp]),
          el('button.btn.btn--primary', { onclick: function () {
            const v = parseInt(inp.value, 10); if (isNaN(v)) return;
            api.setFrames(insert(v)); api.player.play();
            inp.value = String(Util.randInt(1, 99));
          } }, '➕ Insert'),
          el('button.btn', { onclick: function () {
            root = node(true);
            Util.distinctArray(10, 1, 99).forEach((v) => insert(v));
            api.setFrames([snap({}, 'Random tree of 10 keys — count the levels vs a BST of the same size')]);
          } }, '🎲 Random 10'),
          el('button.btn.btn--ghost', { onclick: function () { root = node(true); api.setFrames([snap({}, 'empty')]); } }, '🗑')
        ],
        onReady: function (a) {
          [40, 20, 60, 10, 30, 50, 70].forEach((v) => insert(v));
          a.setFrames([snap({}, 'Seeded 7 keys — note: only 2 levels. Insert into a full node to watch a split.')]);
        }
      });
      return api;
    }
  });
})();
