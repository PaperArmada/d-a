/* Binary Min-Heap — insert (sift-up) & extract-min (sift-down), tree + array. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;
  const Util = window.Util;

  window.Registry.register({
    id: 'heap',
    title: 'Binary Heap (Min)',
    category: 'Heaps',
    blurb: 'Complete tree in an array. insert / extract-min in O(log n).',
    longDesc: 'A binary min-heap keeps every parent ≤ its children, stored compactly in an array ' +
      '(children of i are 2i+1 and 2i+2). Insert bubbles up; extract-min swaps the root with the last ' +
      'element and sinks it down.',
    create: function (container, params) {
      let heap = (params && params.vals) ? window.Util.parseList(params.vals, null) : null;
      if (!heap || heap.length < 1) heap = [5, 12, 8, 20, 15, 22, 30];
      // heapify (idempotent on an already-valid heap, so shared links round-trip)
      for (let i = (heap.length >> 1) - 1; i >= 0; i--) {
        let x = i; while (true) { let s = x, l = 2 * x + 1, r = 2 * x + 2;
          if (l < heap.length && heap[l] < heap[s]) s = l; if (r < heap.length && heap[r] < heap[s]) s = r;
          if (s === x) break; [heap[x], heap[s]] = [heap[s], heap[x]]; x = s; } }
      let timer = null;
      function stop() { if (timer) { clearTimeout(timer); timer = null; } }

      const input = el('input.field', { type: 'text', value: String(Util.randInt(1, 99)), style: { width: '80px' } });
      const status = el('div.status', { html: '&nbsp;' });
      const treeStage = el('div.stage.svg-stage', { style: { minHeight: '250px' } });
      const arrWrap = el('div', { style: { marginTop: '14px' } });
      function setStatus(h) { status.innerHTML = h; }

      function positions(n) {
        const pos = [];
        for (let i = 0; i < n; i++) {
          const d = Math.floor(Math.log2(i + 1));
          const inLevel = i - (Math.pow(2, d) - 1);
          const levelCount = Math.pow(2, d);
          pos.push({ d: d, fx: (inLevel + 0.5) / levelCount });
        }
        return pos;
      }

      function render(mark) {
        mark = mark || {};
        clear(treeStage); clear(arrWrap);
        const n = heap.length;
        if (!n) { treeStage.appendChild(el('p.dim', 'empty heap')); return; }
        const pos = positions(n);
        const maxD = Math.max.apply(null, pos.map((p) => p.d));
        const R = 20, ROWH = 74, PAD = 24;
        const width = Math.max(560, Math.pow(2, maxD) * 66);
        const height = PAD * 2 + maxD * ROWH + R * 2;
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + width + ' ' + height, width: width });
        const X = (i) => PAD + pos[i].fx * (width - PAD * 2);
        const Y = (i) => PAD + R + pos[i].d * ROWH;
        // edges
        for (let i = 1; i < n; i++) {
          const p = (i - 1) >> 1;
          svg.appendChild(svgEl('line', { x1: X(p), y1: Y(p), x2: X(i), y2: Y(i), class: 'edge-line' }));
        }
        for (let i = 0; i < n; i++) {
          let cls = 'node-circle';
          if (mark.a === i || mark.b === i) cls += ' is-active';
          if (i === 0 && mark.root) cls += ' is-done';
          if (i === mark.isNew) cls += ' is-visit';
          svg.appendChild(svgEl('circle', { cx: X(i), cy: Y(i), r: R, class: cls }));
          const filled = /is-active|is-done|is-visit/.test(cls);
          svg.appendChild(svgEl('text', { x: X(i), y: Y(i), class: 'node-text' + (filled ? ' on-fill' : ''), text: String(heap[i]) }));
        }
        treeStage.appendChild(svg);

        // array view
        const cells = el('div.cells');
        heap.forEach(function (v, i) {
          const c = el('div.cell', [el('div.cell__idx', String(i)), String(v)]);
          if (mark.a === i || mark.b === i) c.classList.add('is-active');
          if (i === mark.isNew) c.classList.add('is-new');
          cells.appendChild(c);
        });
        arrWrap.appendChild(el('div.dim', { style: { fontSize: '12px', marginBottom: '6px' } }, 'array representation'));
        arrWrap.appendChild(cells);
      }

      function animate(steps, done) {
        stop();
        let i = 0;
        (function run() {
          if (i >= steps.length) { render(); if (done) done(); return; }
          const s = steps[i++];
          heap = s.heap.slice();
          render(s.mark);
          setStatus(s.status);
          timer = setTimeout(run, 600);
        })();
      }

      function insertSteps(v) {
        const h = heap.slice(); const steps = [];
        h.push(v); let i = h.length - 1;
        steps.push({ heap: h.slice(), mark: { isNew: i }, status: 'Append ' + v + ' at index ' + i });
        while (i > 0) {
          const p = (i - 1) >> 1;
          steps.push({ heap: h.slice(), mark: { a: i, b: p }, status: 'Compare ' + h[i] + ' with parent ' + h[p] });
          if (h[i] < h[p]) {
            [h[i], h[p]] = [h[p], h[i]];
            steps.push({ heap: h.slice(), mark: { a: p, b: i }, status: 'Child smaller → swap up' });
            i = p;
          } else { steps.push({ heap: h.slice(), mark: { a: i }, status: 'Heap property OK — stop' }); break; }
        }
        return steps;
      }

      function extractSteps() {
        const h = heap.slice(); const steps = [];
        if (!h.length) return steps;
        const min = h[0];
        steps.push({ heap: h.slice(), mark: { root: true }, status: 'Min = ' + min + ' at root' });
        const last = h.pop();
        if (h.length) {
          h[0] = last;
          steps.push({ heap: h.slice(), mark: { a: 0 }, status: 'Move last element ' + last + ' to root' });
          let i = 0; const n = h.length;
          while (true) {
            let s = i, l = 2 * i + 1, r = 2 * i + 2;
            if (l < n) { steps.push({ heap: h.slice(), mark: { a: s, b: l }, status: 'Compare with left child' }); if (h[l] < h[s]) s = l; }
            if (r < n) { steps.push({ heap: h.slice(), mark: { a: s, b: r }, status: 'Compare with right child' }); if (h[r] < h[s]) s = r; }
            if (s === i) { steps.push({ heap: h.slice(), mark: { a: i }, status: 'Heap property restored' }); break; }
            [h[i], h[s]] = [h[s], h[i]];
            steps.push({ heap: h.slice(), mark: { a: i, b: s }, status: 'Sink down' });
            i = s;
          }
        }
        steps.push({ heap: h.slice(), status: 'Extracted min = ' + min });
        return steps;
      }

      const controls = el('div.controls', [
        input,
        el('button.btn.btn--primary', { onclick: function () {
          const v = parseInt(input.value, 10); if (isNaN(v)) return;
          animate(insertSteps(v), function () { setStatus('inserted <b>' + v + '</b>'); });
          input.value = String(Util.randInt(1, 99));
        } }, '➕ Insert'),
        el('button.btn', { onclick: function () {
          if (!heap.length) { setStatus('heap empty'); return; }
          animate(extractSteps());
        } }, '⤓ Extract-min'),
        el('span.spacer'),
        el('button.btn', { onclick: function () {
          heap = Util.randomArray(Util.randInt(6, 12), 1, 99);
          // heapify
          for (let i = (heap.length >> 1) - 1; i >= 0; i--) {
            let x = i; while (true) { let s = x, l = 2 * x + 1, r = 2 * x + 2;
              if (l < heap.length && heap[l] < heap[s]) s = l; if (r < heap.length && heap[r] < heap[s]) s = r;
              if (s === x) break; [heap[x], heap[s]] = [heap[s], heap[x]]; x = s; } }
          render(); setStatus('random heap built');
        } }, '🎲 Random'),
        window.Share.button(function () { return { id: 'heap', params: { vals: heap.join(',') } }; },
          function () { setStatus('🔗 Link copied — reproduces this heap.'); }),
        el('button.btn.btn--ghost', { onclick: function () { stop(); heap = []; render(); setStatus('cleared'); } }, '🗑')
      ]);

      container.appendChild(controls);
      container.appendChild(status);
      container.appendChild(treeStage);
      container.appendChild(arrWrap);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Insert: '), 'O(log n)']),
        el('span.pill', [el('b', 'Extract-min: '), 'O(log n)']),
        el('span.pill', [el('b', 'Peek: '), 'O(1)']),
        el('span.pill', [el('b', 'Build heap: '), 'O(n)'])
      ]));
      render();
      setStatus('Min-heap: every parent ≤ its children. Root is always the minimum.');
      return { destroy: stop };
    }
  });
})();
