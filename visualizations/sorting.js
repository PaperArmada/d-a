/* Sorting algorithms — bubble, selection, insertion, merge, quick, heap.
   Each algorithm generates frames. A frame:
     { array:[...], compare:[i,j], swap:[i,j], sorted:[...idx], pivot, cursor,
       line, counters:{Comparisons, Swaps}, status }
   Rendered as bars, with a synced pseudocode panel + live counters.
*/
(function () {
  'use strict';
  const { el, clear } = window.DOM;
  const Util = window.Util;

  // ---- Frame renderer (bars) ----
  // Reuse bar elements across frames so CSS transitions animate the height /
  // colour changes smoothly instead of snapping on a full rebuild.
  function renderBars(stage, frame) {
    if (!frame) return;
    const n = frame.array.length;
    const max = Math.max.apply(null, frame.array.concat([1]));
    const showLabels = n <= 25;
    let wrap = stage.querySelector('.bars');
    if (!wrap || wrap.childElementCount !== n) {
      clear(stage);
      wrap = el('div.bars');
      for (let i = 0; i < n; i++) wrap.appendChild(el('div.bar', showLabels ? [el('div.bar__label')] : []));
      stage.appendChild(wrap);
    }
    const sorted = new Set(frame.sorted || []);
    const compare = new Set(frame.compare || []);
    const swap = new Set(frame.swap || []);
    const bars = wrap.children;
    for (let i = 0; i < n; i++) {
      const bar = bars[i];
      bar.style.height = (frame.array[i] / max * 100) + '%';
      bar.className = 'bar' +
        (sorted.has(i) ? ' is-sorted' : '') +
        (i === frame.pivot ? ' is-pivot' : '') +
        (i === frame.min ? ' is-min' : '') +
        (i === frame.cursor ? ' is-cursor' : '') +
        (compare.has(i) ? ' is-compare' : '') +
        (swap.has(i) ? ' is-swap' : '');
      if (showLabels) { const lbl = bar.firstChild; if (lbl) lbl.textContent = String(frame.array[i]); }
    }
  }

  function allIdx(n) { const r = []; for (let i = 0; i < n; i++) r.push(i); return r; }
  function rangeIdx(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }

  // Each algorithm: { name, pseudocode:[...], fn:(arr)->frames } with counters/line.
  const ALGOS = {
    bubble: {
      name: 'Bubble Sort', time: 'O(n²)', best: 'O(n)', space: 'O(1)', stable: 'yes',
      pseudocode: [
        'for i = 0 to n-1:',
        '  for j = 0 to n-i-2:',
        '    if a[j] > a[j+1]:',
        '      swap(a[j], a[j+1])',
        'return a'
      ],
      fn: function (a) {
        a = a.slice(); const n = a.length; const sorted = []; const c = { c: 0, s: 0 }; const F = [];
        const mk = (line, x) => Object.assign({ array: a.slice(), line, counters: { Comparisons: c.c, Swaps: c.s } }, x);
        F.push(mk(0, { status: 'Start bubble sort' }));
        for (let i = 0; i < n - 1; i++) {
          for (let j = 0; j < n - 1 - i; j++) {
            c.c++;
            F.push(mk(2, { compare: [j, j + 1], sorted: sorted.slice(), status: 'Compare ' + a[j] + ' and ' + a[j + 1] }));
            if (a[j] > a[j + 1]) {
              [a[j], a[j + 1]] = [a[j + 1], a[j]]; c.s++;
              F.push(mk(3, { swap: [j, j + 1], sorted: sorted.slice(), status: 'Swap → ' + a[j] + ', ' + a[j + 1] }));
            }
          }
          sorted.unshift(n - 1 - i);
        }
        sorted.unshift(0);
        F.push(mk(4, { sorted: allIdx(n), status: 'Sorted ✓' }));
        return F;
      }
    },
    selection: {
      name: 'Selection Sort', time: 'O(n²)', best: 'O(n²)', space: 'O(1)', stable: 'no',
      pseudocode: [
        'for i = 0 to n-1:',
        '  min = i',
        '  for j = i+1 to n-1:',
        '    if a[j] < a[min]: min = j',
        '  swap(a[i], a[min])',
        'return a'
      ],
      fn: function (a) {
        a = a.slice(); const n = a.length; const sorted = []; const c = { c: 0, s: 0 }; const F = [];
        const mk = (line, x) => Object.assign({ array: a.slice(), line, counters: { Comparisons: c.c, Swaps: c.s } }, x);
        F.push(mk(0, { status: 'Start selection sort' }));
        for (let i = 0; i < n - 1; i++) {
          let min = i;
          F.push(mk(1, { cursor: i, min: min, sorted: sorted.slice(), status: 'Find the minimum from index ' + i }));
          for (let j = i + 1; j < n; j++) {
            c.c++;
            F.push(mk(3, { compare: [j], min: min, cursor: i, sorted: sorted.slice(), status: 'Is ' + a[j] + ' < current min ' + a[min] + '?' }));
            if (a[j] < a[min]) {
              min = j;
              F.push(mk(3, { min: min, cursor: i, sorted: sorted.slice(), status: 'New minimum: ' + a[min] }));
            }
          }
          if (min !== i) { [a[i], a[min]] = [a[min], a[i]]; c.s++;
            F.push(mk(4, { swap: [i, min], sorted: sorted.slice(), status: 'Swap min into place' })); }
          sorted.push(i);
        }
        F.push(mk(5, { sorted: allIdx(n), status: 'Sorted ✓' }));
        return F;
      }
    },
    insertion: {
      name: 'Insertion Sort', time: 'O(n²)', best: 'O(n)', space: 'O(1)', stable: 'yes',
      pseudocode: [
        'for i = 1 to n-1:',
        '  key = a[i]; j = i-1',
        '  while j >= 0 and a[j] > key:',
        '    a[j+1] = a[j]; j--',
        '  a[j+1] = key',
        'return a'
      ],
      fn: function (a) {
        a = a.slice(); const n = a.length; const c = { c: 0, s: 0 }; const F = [];
        const mk = (line, x) => Object.assign({ array: a.slice(), line, counters: { Comparisons: c.c, Swaps: c.s } }, x);
        F.push(mk(0, { status: 'Start insertion sort' }));
        for (let i = 1; i < n; i++) {
          const key = a[i];
          F.push(mk(1, { cursor: i, sorted: rangeIdx(0, i - 1), status: 'Insert ' + key }));
          let j = i - 1;
          while (j >= 0 && a[j] > key) {
            c.c++;
            F.push(mk(2, { compare: [j, j + 1], sorted: rangeIdx(0, i - 1), status: a[j] + ' > ' + key + ' → shift right' }));
            a[j + 1] = a[j]; j--; c.s++;
            F.push(mk(3, { cursor: j + 1, sorted: rangeIdx(0, i - 1), status: 'Shifted' }));
          }
          if (j >= 0) c.c++; // final failed comparison
          a[j + 1] = key;
          F.push(mk(4, { swap: [j + 1], sorted: rangeIdx(0, i), status: 'Placed ' + key }));
        }
        F.push(mk(5, { sorted: allIdx(n), status: 'Sorted ✓' }));
        return F;
      }
    },
    merge: {
      name: 'Merge Sort', time: 'O(n log n)', best: 'O(n log n)', space: 'O(n)', stable: 'yes',
      pseudocode: [
        'mergeSort(lo, hi):',
        '  if lo >= hi: return',
        '  mid = (lo+hi)/2',
        '  mergeSort(lo, mid); mergeSort(mid+1, hi)',
        '  merge two halves into order',
        '  copy merged values back'
      ],
      fn: function (a) {
        a = a.slice(); const c = { c: 0, s: 0 }; const F = [];
        const mk = (line, x) => Object.assign({ array: a.slice(), line, counters: { Comparisons: c.c, Swaps: c.s } }, x);
        F.push(mk(0, { status: 'Start merge sort' }));
        (function ms(lo, hi) {
          if (lo >= hi) return;
          const mid = (lo + hi) >> 1;
          ms(lo, mid); ms(mid + 1, hi);
          const tmp = []; let i = lo, j = mid + 1;
          F.push(mk(4, { sorted: rangeIdx(lo, hi), status: 'Merge [' + lo + '…' + hi + ']' }));
          while (i <= mid && j <= hi) {
            c.c++;
            F.push(mk(4, { compare: [i, j], status: 'Compare ' + a[i] + ' & ' + a[j] }));
            tmp.push(a[i] <= a[j] ? a[i++] : a[j++]);
          }
          while (i <= mid) tmp.push(a[i++]);
          while (j <= hi) tmp.push(a[j++]);
          for (let k = 0; k < tmp.length; k++) { a[lo + k] = tmp[k]; c.s++;
            F.push(mk(5, { swap: [lo + k], status: 'Write back ' + tmp[k] })); }
        })(0, a.length - 1);
        F.push(mk(1, { sorted: allIdx(a.length), status: 'Sorted ✓' }));
        return F;
      }
    },
    quick: {
      name: 'Quick Sort', time: 'O(n²)', best: 'O(n log n)', space: 'O(log n)', stable: 'no',
      pseudocode: [
        'quickSort(lo, hi):',
        '  pivot = a[hi]; i = lo',
        '  for j = lo to hi-1:',
        '    if a[j] < pivot: swap(a[i++], a[j])',
        '  swap(a[i], a[hi])   // place pivot',
        '  recurse left & right of i'
      ],
      fn: function (a) {
        a = a.slice(); const done = []; const c = { c: 0, s: 0 }; const F = [];
        const mk = (line, x) => Object.assign({ array: a.slice(), line, counters: { Comparisons: c.c, Swaps: c.s } }, x);
        F.push(mk(0, { status: 'Start quick sort (Lomuto partition)' }));
        (function qs(lo, hi) {
          if (lo > hi) return;
          if (lo === hi) { done.push(lo); return; }
          const pivot = a[hi];
          F.push(mk(1, { pivot: hi, sorted: done.slice(), status: 'Pivot = ' + pivot }));
          let i = lo;
          for (let j = lo; j < hi; j++) {
            c.c++;
            F.push(mk(3, { pivot: hi, compare: [j, hi], sorted: done.slice(), status: 'Is ' + a[j] + ' < pivot ' + pivot + '?' }));
            if (a[j] < pivot) { if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; c.s++;
              F.push(mk(3, { pivot: hi, swap: [i, j], sorted: done.slice(), status: 'Swap smaller left' })); } i++; }
          }
          [a[i], a[hi]] = [a[hi], a[i]]; c.s++;
          F.push(mk(4, { swap: [i, hi], sorted: done.slice(), status: 'Place pivot at ' + i }));
          done.push(i);
          qs(lo, i - 1); qs(i + 1, hi);
        })(0, a.length - 1);
        F.push(mk(5, { sorted: allIdx(a.length), status: 'Sorted ✓' }));
        return F;
      }
    },
    heap: {
      name: 'Heap Sort', time: 'O(n log n)', best: 'O(n log n)', space: 'O(1)', stable: 'no',
      pseudocode: [
        'build max-heap from array',
        'for end = n-1 down to 1:',
        '  swap(a[0], a[end])   // max to end',
        '  siftDown(0, end)',
        'return a'
      ],
      fn: function (a) {
        a = a.slice(); const n = a.length; const done = []; const c = { c: 0, s: 0 }; const F = [];
        const mk = (line, x) => Object.assign({ array: a.slice(), line, counters: { Comparisons: c.c, Swaps: c.s } }, x);
        F.push(mk(0, { status: 'Build max-heap' }));
        function siftDown(root, size, line) {
          while (true) {
            let largest = root, l = 2 * root + 1, r = 2 * root + 2;
            if (l < size) { c.c++; F.push(mk(line, { compare: [largest, l], sorted: done.slice(), status: 'Compare with left child' })); if (a[l] > a[largest]) largest = l; }
            if (r < size) { c.c++; F.push(mk(line, { compare: [largest, r], sorted: done.slice(), status: 'Compare with right child' })); if (a[r] > a[largest]) largest = r; }
            if (largest === root) break;
            [a[root], a[largest]] = [a[largest], a[root]]; c.s++;
            F.push(mk(line, { swap: [root, largest], sorted: done.slice(), status: 'Sift down' }));
            root = largest;
          }
        }
        for (let i = (n >> 1) - 1; i >= 0; i--) siftDown(i, n, 0);
        F.push(mk(1, { status: 'Heap built — extract max repeatedly' }));
        for (let end = n - 1; end > 0; end--) {
          [a[0], a[end]] = [a[end], a[0]]; c.s++; done.unshift(end);
          F.push(mk(2, { swap: [0, end], sorted: done.slice(), status: 'Move max to end' }));
          siftDown(0, end, 3);
        }
        done.unshift(0);
        F.push(mk(4, { sorted: allIdx(n), status: 'Sorted ✓' }));
        return F;
      }
    }
  };

  // Expose pure generators for testing.
  window.__algos = window.__algos || {};
  window.__algos.sort = ALGOS;

  function makeViz(key) {
    const meta = ALGOS[key];
    return {
      id: 'sort-' + key,
      title: meta.name,
      category: 'Sorting',
      blurb: 'Time ' + meta.time + ', space ' + meta.space + '.',
      longDesc: 'Watch ' + meta.name + ' rearrange a bar chart step by step, with the executing ' +
        'pseudocode line highlighted and live comparison / swap counts. ' +
        'Yellow = comparing, red = swapping/writing, green = in final position' +
        (key === 'selection' ? ', violet = current minimum.' : key === 'quick' ? ', violet = pivot.' : '.'),
      create: function (container, params) {
        let data = (params && params.data) ? Util.parseList(params.data, null) : null;
        if (!data || data.length < 2) data = Util.randomArray(20, 8, 99);

        const legend = [
          { color: 'var(--accent)', label: 'Unsorted' },
          { color: 'var(--warn)', label: 'Comparing' },
          { color: 'var(--danger)', label: 'Swap / write' },
          { color: 'var(--good)', label: 'Sorted' }
        ];
        if (key === 'selection') legend.splice(3, 0, { color: 'var(--focus)', label: 'Current minimum' });
        if (key === 'quick') legend.splice(3, 0, { color: 'var(--focus)', label: 'Pivot' });

        const api = window.Scaffold.createStepViz(container, {
          render: renderBars,
          pseudocode: meta.pseudocode,
          counters: ['Comparisons', 'Swaps'],
          legend: legend,
          complexity: { Time: meta.time, Best: meta.best, Space: meta.space, Stable: meta.stable },
          controls: [
            { label: '🎲 Random', onClick: function () { data = Util.randomArray(data.length, 8, 99); load(); } },
            { label: '➕ Bigger', onClick: function () { data = Util.randomArray(Math.min(data.length + 10, 60), 5, 99); load(); } },
            { label: '➖ Smaller', onClick: function () { data = Util.randomArray(Math.max(data.length - 10, 6), 8, 99); load(); } },
            { label: '🔗 Copy link', title: 'Copy a shareable link to this exact array', onClick: copyLink }
          ],
          onReady: function (a) { load(a); }
        });
        function load(a) { (a || api).setFrames(meta.fn(data)); window.Router.setParams({ data: data.join(',') }); }
        function copyLink() {
          const link = window.Router.absoluteLink('sort-' + key, { data: data.join(',') });
          navigator.clipboard && navigator.clipboard.writeText(link);
          api.setStatus('🔗 Link copied — reproduces this array: <span class="mono">[' + data.join(', ') + ']</span>');
        }
        return api;
      }
    };
  }

  Object.keys(ALGOS).forEach(function (k) { window.Registry.register(makeViz(k)); });
})();
