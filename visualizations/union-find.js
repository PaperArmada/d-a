/* Union-Find (Disjoint Set Union) — union by rank + path compression. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;
  const Util = window.Util;

  window.Registry.register({
    id: 'union-find',
    title: 'Union-Find (DSU)',
    category: 'Graphs',
    blurb: 'Disjoint sets with union by rank + path compression. ~O(α(n)).',
    longDesc: 'Union-Find tracks a partition of elements into disjoint sets. find(x) returns a set\'s ' +
      'representative (root); union(a,b) merges two sets. With union-by-rank and path compression, ' +
      'operations run in near-constant amortized time — the inverse-Ackermann function α(n).',
    create: function (container) {
      const N = 10;
      let parent = [], rank = [];
      function reset() { parent = []; rank = []; for (let i = 0; i < N; i++) { parent[i] = i; rank[i] = 0; } }
      reset();

      let timer = null;
      function stop() { if (timer) { clearTimeout(timer); timer = null; } }

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage.svg-stage', { style: { minHeight: '280px' } });
      const inA = el('input', { type: 'number', min: '0', max: String(N - 1), value: '0', style: { width: '60px' } });
      const inB = el('input', { type: 'number', min: '0', max: String(N - 1), value: '1', style: { width: '60px' } });
      function setStatus(h) { status.innerHTML = h; }

      function childrenOf(i) { const c = []; for (let j = 0; j < N; j++) if (j !== i && parent[j] === i) c.push(j); return c; }

      function layout() {
        const roots = []; for (let i = 0; i < N; i++) if (parent[i] === i) roots.push(i);
        const pos = {}; let leaf = 0; let maxD = 0;
        roots.forEach(function (r) {
          const start = leaf;
          (function walk(i, d) {
            maxD = Math.max(maxD, d);
            const ch = childrenOf(i);
            if (!ch.length) { pos[i] = { x: leaf++, d }; return; }
            ch.forEach((c) => walk(c, d + 1));
            pos[i] = { x: (pos[ch[0]].x + pos[ch[ch.length - 1]].x) / 2, d };
          })(r, 0);
          leaf = Math.max(leaf, start + 1) + 0.6; // gap between trees
        });
        return { pos, leaf: Math.max(1, leaf), maxD };
      }

      function render(mark) {
        clear(stage); mark = mark || {};
        const { pos, leaf, maxD } = layout();
        const COLW = Math.max(46, Math.min(80, 760 / leaf)), ROWH = 70, R = 18, PAD = 26;
        const width = Math.max(500, PAD * 2 + leaf * COLW), height = PAD * 2 + maxD * ROWH + R * 2;
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + width + ' ' + height, width });
        const X = (i) => PAD + R + pos[i].x * COLW, Y = (i) => PAD + R + pos[i].d * ROWH;
        const hot = new Set(mark.path || []);
        for (let i = 0; i < N; i++) if (parent[i] !== i) {
          svg.appendChild(svgEl('line', { x1: X(i), y1: Y(i), x2: X(parent[i]), y2: Y(parent[i]),
            class: 'edge-line' + (hot.has(i) ? ' is-active' : '') }));
        }
        for (let i = 0; i < N; i++) {
          let cls = 'node-circle';
          if (mark.root === i) cls += ' is-done';
          else if (hot.has(i)) cls += ' is-active';
          else if (parent[i] === i) cls += ' is-visit';
          svg.appendChild(svgEl('circle', { cx: X(i), cy: Y(i), r: R, class: cls }));
          const filled = mark.root === i || hot.has(i) || parent[i] === i;
          svg.appendChild(svgEl('text', { x: X(i), y: Y(i), class: 'node-text' + (filled ? ' on-fill' : ''), text: String(i) }));
        }
        stage.appendChild(svg);
      }

      function findPath(x) { const path = [x]; while (parent[x] !== x) { x = parent[x]; path.push(x); } return path; }

      function animateFind(x, done) {
        stop();
        const path = findPath(x); const root = path[path.length - 1];
        let i = 0;
        (function step() {
          if (i >= path.length) {
            // path compression
            path.forEach((n) => { parent[n] = root; });
            render({ root, path });
            setStatus('find(' + x + ') = <b>' + root + '</b> — path compressed (all point straight to root)');
            done && done(root);
            return;
          }
          render({ path: path.slice(0, i + 1), root: i === path.length - 1 ? root : undefined });
          setStatus('find(' + x + '): at ' + path[i] + (parent[path[i]] === path[i] ? ' (root)' : ' → parent ' + parent[path[i]]));
          i++;
          timer = setTimeout(step, 500);
        })();
      }

      const controls = el('div.controls', [
        el('div.control-group', [el('label', 'union('), inA, el('label', ','), inB, el('label', ')')]),
        el('button.btn.btn--primary', { onclick: function () {
          const a = clampIdx(inA.value), b = clampIdx(inB.value);
          const ra = findPath(a).pop(), rb = findPath(b).pop();
          if (ra === rb) { render({ root: ra }); setStatus(a + ' and ' + b + ' are already in the same set (root ' + ra + ')'); return; }
          let hi = ra, lo = rb;
          if (rank[ra] < rank[rb]) { hi = rb; lo = ra; }
          parent[lo] = hi;
          if (rank[ra] === rank[rb]) rank[hi]++;
          render({ root: hi, path: [lo] });
          setStatus('union(' + a + ', ' + b + '): attach set ' + lo + ' under higher-rank root ' + hi);
        } }, '🔗 Union'),
        el('div.control-group', [el('label', 'find(x): use first box')]),
        el('button.btn', { onclick: function () { animateFind(clampIdx(inA.value)); } }, '🔍 Find + compress'),
        el('span.spacer'),
        el('button.btn', { onclick: function () {
          reset();
          const pairs = 5;
          for (let k = 0; k < pairs; k++) {
            const a = Util.randInt(0, N - 1), b = Util.randInt(0, N - 1);
            const ra = findPath(a).pop(), rb = findPath(b).pop();
            if (ra === rb) continue;
            let hi = ra, lo = rb; if (rank[ra] < rank[rb]) { hi = rb; lo = ra; }
            parent[lo] = hi; if (rank[ra] === rank[rb]) rank[hi]++;
          }
          render(); setStatus('random unions applied');
        } }, '🎲 Random'),
        el('button.btn.btn--ghost', { onclick: function () { stop(); reset(); render(); setStatus('reset to ' + N + ' singletons'); } }, '↺ Reset')
      ]);
      function clampIdx(v) { return Math.max(0, Math.min(N - 1, parseInt(v, 10) || 0)); }

      container.appendChild(controls);
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.legend', [
        el('span', [el('span.swatch', { style: { background: 'var(--accent)' } }), 'Set root']),
        el('span', [el('span.swatch', { style: { background: 'var(--warn)' } }), 'find path']),
        el('span', [el('span.swatch', { style: { background: 'var(--good)' } }), 'Resolved root'])
      ]));
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Find / Union: '), 'O(α(n)) amortized']),
        el('span.pill', [el('b', 'Space: '), 'O(n)'])
      ]));
      render();
      setStatus('10 singleton sets. Union some, then Find to see path compression flatten the tree.');
      return { destroy: stop };
    }
  });
})();
