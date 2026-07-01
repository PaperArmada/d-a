/* Sorting algorithms — bubble, selection, insertion, merge, quick, heap.
   Each algorithm is a generator of frames. A frame:
     { array:[...], compare:[i,j], swap:[i,j], sorted:[...idx], pivot:i, cursor:i, status:'...' }
   Rendered as bars.
*/
(function () {
  'use strict';
  const { el, clear } = window.DOM;
  const Util = window.Util;

  // ---- Frame renderer (bars) ----
  function renderBars(stage, frame) {
    clear(stage);
    if (!frame) return;
    const wrap = el('div.bars');
    const max = Math.max.apply(null, frame.array.concat([1]));
    const sorted = new Set(frame.sorted || []);
    const compare = new Set(frame.compare || []);
    const swap = new Set(frame.swap || []);
    frame.array.forEach(function (v, i) {
      const bar = el('div.bar', { style: { height: (v / max * 100) + '%' } },
        frame.array.length <= 25 ? [el('div.bar__label', String(v))] : []);
      if (sorted.has(i)) bar.classList.add('is-sorted');
      if (i === frame.pivot) bar.classList.add('is-pivot');
      if (i === frame.cursor) bar.classList.add('is-cursor');
      if (compare.has(i)) bar.classList.add('is-compare');
      if (swap.has(i)) bar.classList.add('is-swap');
      wrap.appendChild(bar);
    });
    stage.appendChild(wrap);
  }

  // ---- Algorithms → frames ----
  function snapshot(arr, extra) {
    return Object.assign({ array: arr.slice() }, extra || {});
  }

  function bubble(a) {
    a = a.slice(); const frames = []; const n = a.length; const sorted = [];
    frames.push(snapshot(a, { status: 'Start bubble sort' }));
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - 1 - i; j++) {
        frames.push(snapshot(a, { compare: [j, j + 1], sorted: sorted.slice(),
          status: 'Compare ' + a[j] + ' and ' + a[j + 1] }));
        if (a[j] > a[j + 1]) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          frames.push(snapshot(a, { swap: [j, j + 1], sorted: sorted.slice(),
            status: 'Swap → ' + a[j] + ', ' + a[j + 1] }));
        }
      }
      sorted.unshift(n - 1 - i);
    }
    sorted.unshift(0);
    frames.push(snapshot(a, { sorted: allIdx(n), status: 'Sorted ✓' }));
    return frames;
  }

  function selection(a) {
    a = a.slice(); const frames = []; const n = a.length; const sorted = [];
    frames.push(snapshot(a, { status: 'Start selection sort' }));
    for (let i = 0; i < n - 1; i++) {
      let min = i;
      frames.push(snapshot(a, { cursor: i, sorted: sorted.slice(), status: 'Find min from index ' + i }));
      for (let j = i + 1; j < n; j++) {
        frames.push(snapshot(a, { compare: [min, j], cursor: i, sorted: sorted.slice(),
          status: 'Is ' + a[j] + ' < current min ' + a[min] + '?' }));
        if (a[j] < a[min]) min = j;
      }
      if (min !== i) {
        [a[i], a[min]] = [a[min], a[i]];
        frames.push(snapshot(a, { swap: [i, min], sorted: sorted.slice(), status: 'Swap min into place' }));
      }
      sorted.push(i);
    }
    frames.push(snapshot(a, { sorted: allIdx(n), status: 'Sorted ✓' }));
    return frames;
  }

  function insertion(a) {
    a = a.slice(); const frames = []; const n = a.length;
    frames.push(snapshot(a, { status: 'Start insertion sort' }));
    for (let i = 1; i < n; i++) {
      const key = a[i];
      frames.push(snapshot(a, { cursor: i, sorted: rangeIdx(0, i - 1), status: 'Insert ' + key }));
      let j = i - 1;
      while (j >= 0 && a[j] > key) {
        frames.push(snapshot(a, { compare: [j, j + 1], sorted: rangeIdx(0, i - 1),
          status: a[j] + ' > ' + key + ' → shift right' }));
        a[j + 1] = a[j];
        j--;
        frames.push(snapshot(a, { cursor: j + 1, sorted: rangeIdx(0, i - 1), status: 'Shifted' }));
      }
      a[j + 1] = key;
      frames.push(snapshot(a, { swap: [j + 1], sorted: rangeIdx(0, i), status: 'Placed ' + key }));
    }
    frames.push(snapshot(a, { sorted: allIdx(n), status: 'Sorted ✓' }));
    return frames;
  }

  function merge(a) {
    a = a.slice(); const frames = [];
    frames.push(snapshot(a, { status: 'Start merge sort' }));
    function ms(lo, hi) {
      if (lo >= hi) return;
      const mid = (lo + hi) >> 1;
      ms(lo, mid); ms(mid + 1, hi);
      // merge
      const tmp = [];
      let i = lo, j = mid + 1;
      frames.push(snapshot(a, { sorted: rangeIdx(lo, hi), status: 'Merge [' + lo + '…' + hi + ']' }));
      while (i <= mid && j <= hi) {
        frames.push(snapshot(a, { compare: [i, j], status: 'Compare ' + a[i] + ' & ' + a[j] }));
        tmp.push(a[i] <= a[j] ? a[i++] : a[j++]);
      }
      while (i <= mid) tmp.push(a[i++]);
      while (j <= hi) tmp.push(a[j++]);
      for (let k = 0; k < tmp.length; k++) {
        a[lo + k] = tmp[k];
        frames.push(snapshot(a, { swap: [lo + k], status: 'Write back ' + tmp[k] }));
      }
    }
    ms(0, a.length - 1);
    frames.push(snapshot(a, { sorted: allIdx(a.length), status: 'Sorted ✓' }));
    return frames;
  }

  function quick(a) {
    a = a.slice(); const frames = []; const done = [];
    frames.push(snapshot(a, { status: 'Start quick sort (Lomuto partition)' }));
    function qs(lo, hi) {
      if (lo > hi) return;
      if (lo === hi) { done.push(lo); return; }
      const pivot = a[hi];
      frames.push(snapshot(a, { pivot: hi, sorted: done.slice(), status: 'Pivot = ' + pivot }));
      let i = lo;
      for (let j = lo; j < hi; j++) {
        frames.push(snapshot(a, { pivot: hi, compare: [j, hi], sorted: done.slice(),
          status: 'Is ' + a[j] + ' < pivot ' + pivot + '?' }));
        if (a[j] < pivot) {
          if (i !== j) {
            [a[i], a[j]] = [a[j], a[i]];
            frames.push(snapshot(a, { pivot: hi, swap: [i, j], sorted: done.slice(), status: 'Swap smaller left' }));
          }
          i++;
        }
      }
      [a[i], a[hi]] = [a[hi], a[i]];
      frames.push(snapshot(a, { swap: [i, hi], sorted: done.slice(), status: 'Place pivot at ' + i }));
      done.push(i);
      qs(lo, i - 1); qs(i + 1, hi);
    }
    qs(0, a.length - 1);
    frames.push(snapshot(a, { sorted: allIdx(a.length), status: 'Sorted ✓' }));
    return frames;
  }

  function heapSort(a) {
    a = a.slice(); const frames = []; const n = a.length; const done = [];
    frames.push(snapshot(a, { status: 'Build max-heap' }));
    function siftDown(root, size) {
      while (true) {
        let largest = root, l = 2 * root + 1, r = 2 * root + 2;
        if (l < size) {
          frames.push(snapshot(a, { compare: [largest, l], sorted: done.slice(), status: 'Compare with left child' }));
          if (a[l] > a[largest]) largest = l;
        }
        if (r < size) {
          frames.push(snapshot(a, { compare: [largest, r], sorted: done.slice(), status: 'Compare with right child' }));
          if (a[r] > a[largest]) largest = r;
        }
        if (largest === root) break;
        [a[root], a[largest]] = [a[largest], a[root]];
        frames.push(snapshot(a, { swap: [root, largest], sorted: done.slice(), status: 'Sift down' }));
        root = largest;
      }
    }
    for (let i = (n >> 1) - 1; i >= 0; i--) siftDown(i, n);
    frames.push(snapshot(a, { status: 'Heap built — extract max repeatedly' }));
    for (let end = n - 1; end > 0; end--) {
      [a[0], a[end]] = [a[end], a[0]];
      done.unshift(end);
      frames.push(snapshot(a, { swap: [0, end], sorted: done.slice(), status: 'Move max to end' }));
      siftDown(0, end);
    }
    done.unshift(0);
    frames.push(snapshot(a, { sorted: allIdx(n), status: 'Sorted ✓' }));
    return frames;
  }

  function allIdx(n) { const r = []; for (let i = 0; i < n; i++) r.push(i); return r; }
  function rangeIdx(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }

  const ALGOS = {
    bubble:    { name: 'Bubble Sort',    fn: bubble,    time: 'O(n²)', best: 'O(n)',      space: 'O(1)', stable: 'yes' },
    selection: { name: 'Selection Sort', fn: selection, time: 'O(n²)', best: 'O(n²)',     space: 'O(1)', stable: 'no' },
    insertion: { name: 'Insertion Sort', fn: insertion, time: 'O(n²)', best: 'O(n)',      space: 'O(1)', stable: 'yes' },
    merge:     { name: 'Merge Sort',     fn: merge,     time: 'O(n log n)', best: 'O(n log n)', space: 'O(n)', stable: 'yes' },
    quick:     { name: 'Quick Sort',     fn: quick,     time: 'O(n²)', best: 'O(n log n)', space: 'O(log n)', stable: 'no' },
    heap:      { name: 'Heap Sort',      fn: heapSort,  time: 'O(n log n)', best: 'O(n log n)', space: 'O(1)', stable: 'no' }
  };

  function makeViz(key) {
    const meta = ALGOS[key];
    return {
      id: 'sort-' + key,
      title: meta.name,
      category: 'Sorting',
      blurb: 'Time ' + meta.time + ', space ' + meta.space + '.',
      longDesc: 'Watch ' + meta.name + ' rearrange a bar chart step by step. ' +
        'Yellow = comparing, red = swapping/writing, green = in final position.',
      create: function (container) {
        let data = Util.randomArray(20, 8, 99);
        const api = window.Scaffold.createStepViz(container, {
          render: renderBars,
          legend: [
            { color: 'var(--accent)', label: 'Unsorted' },
            { color: 'var(--warn)', label: 'Comparing' },
            { color: 'var(--danger)', label: 'Swap / write' },
            { color: 'var(--accent-2)', label: 'Pivot' },
            { color: 'var(--good)', label: 'Sorted' }
          ],
          complexity: { Time: meta.time, Best: meta.best, Space: meta.space, Stable: meta.stable },
          controls: [
            { label: '🎲 Random', onClick: rebuild },
            { label: '➕ Bigger', onClick: function (a) { data = Util.randomArray(Math.min(data.length + 10, 60), 5, 99); load(a); } },
            { label: '➖ Smaller', onClick: function (a) { data = Util.randomArray(Math.max(data.length - 10, 6), 8, 99); load(a); } }
          ],
          onReady: function (a) { load(a); }
        });
        function load(a) { (a || api).setFrames(meta.fn(data)); }
        function rebuild() { data = Util.randomArray(data.length, 8, 99); load(); }
        return api;
      }
    };
  }

  Object.keys(ALGOS).forEach(function (k) { window.Registry.register(makeViz(k)); });
})();
