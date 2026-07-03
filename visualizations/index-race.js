/* Index vs full scan — the same query, with and without a B-tree index. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;
  const Util = window.Util;

  window.Registry.register({
    id: 'index-race',
    title: 'Database Index vs Full Scan',
    category: 'Data & Storage',
    blurb: 'WHERE id = 87 — row-by-row scan vs three hops down a B-tree.',
    madeOf: ['btree', 'search-linear'],
    longDesc: 'Without an index, a query reads every row until it finds a match — O(n) disk pages. An index ' +
      'is a B-tree over the column: the same query descends a few levels and jumps straight to the row. ' +
      'Race them on the same table.',
    create: function (container) {
      const N = 24;
      let rows, target;
      function newTable() {
        rows = Util.distinctArray(N, 1, 99).sort((a, b) => a - b);
        target = rows[Util.randInt(Math.floor(N * 0.55), N - 1)]; // deep enough to hurt the scan
      }
      newTable();

      function build() {
        // index path: root(mid) → subtree mid → leaf (3 reads, roughly binary)
        const path = [];
        let lo = 0, hi = N - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          path.push(mid);
          if (rows[mid] === target) break;
          if (rows[mid] < target) lo = mid + 1; else hi = mid - 1;
        }
        const scanSteps = rows.indexOf(target) + 1;
        const total = Math.max(scanSteps, path.length);
        const F = [];
        for (let t = 0; t < total; t++) {
          F.push({
            scanAt: Math.min(t, scanSteps - 1), scanDone: t >= scanSteps - 1,
            idxAt: Math.min(t, path.length - 1), idxPath: path, idxDone: t >= path.length - 1,
            counters: { 'Scan reads': Math.min(t + 1, scanSteps), 'Index reads': Math.min(t + 1, path.length) },
            status: t === 0 ? 'Both start. Scan reads row 0; index reads the root page.'
              : (t === path.length - 1 ? 'Index is DONE in ' + path.length + ' reads — scan still grinding…'
                : (t === total - 1 ? 'Scan finally found it: ' + scanSteps + ' reads vs ' + path.length + '.' : 'Reading…'))
          });
        }
        return F;
      }

      function render(stage, frame) {
        clear(stage);
        if (!frame) return;
        const mk = (title, sub) => el('div', { style: { marginBottom: '14px' } }, [
          el('div.kv__title', title + ' — ' + sub)]);
        // scan side
        stage.appendChild(mk('FULL SCAN', 'read every row until match'));
        const scan = el('div.cells');
        rows.forEach(function (v, i) {
          const c = el('div.cell', { style: { minWidth: '36px', height: '36px', fontSize: '12px' } }, String(v));
          if (i < frame.scanAt) c.classList.add('is-ghost');
          if (i === frame.scanAt) c.classList.add(frame.scanDone && rows[i] === target ? 'is-hit' : 'is-active');
          scan.appendChild(c);
        });
        stage.appendChild(scan);
        // index side
        stage.appendChild(el('div', { style: { height: '14px' } }));
        stage.appendChild(mk('B-TREE INDEX', 'binary descent over the same column'));
        const idx = el('div.cells');
        frame.idxPath.forEach(function (ri, k) {
          const active = k === frame.idxAt;
          const done = frame.idxDone && k === frame.idxPath.length - 1;
          const c = el('div.cell' + (done && rows[ri] === target ? '.is-hit' : active ? '.is-active' : k < frame.idxAt ? '.is-ghost' : ''),
            { style: { minWidth: '68px' } }, [el('div.cell__idx', 'level ' + k), String(rows[ri])]);
          idx.appendChild(c);
        });
        stage.appendChild(idx);
        stage.appendChild(el('p.hint', 'Query: WHERE id = ' + target + ' · every cell ≈ one page read (the slow unit that matters)'));
      }

      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 450,
        render: render,
        counters: ['Scan reads', 'Index reads'],
        complexity: { 'Scan': 'O(n) pages', 'Index': 'O(log n) pages', 'Index cost': 'extra writes + storage' },
        controls: [
          { label: '🎲 New table & target', onClick: function (a) { newTable(); load(a); } }
        ],
        onReady: function (a) { load(a); }
      });
      function load(a) { const x = a || api; x.setFrames(build()); x.setStatus('WHERE id = ' + target + ' — press play to race.'); }
      return api;
    }
  });
})();
