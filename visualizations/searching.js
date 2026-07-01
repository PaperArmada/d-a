/* Searching — linear & binary search, rendered as labelled cells. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;
  const Util = window.Util;

  function renderCells(stage, frame) {
    clear(stage);
    if (!frame) return;
    const wrap = el('div.cells');
    frame.array.forEach(function (v, i) {
      const cell = el('div.cell', [el('div.cell__idx', String(i)), String(v)]);
      if (frame.lo != null && frame.hi != null && (i < frame.lo || i > frame.hi)) cell.classList.add('is-ghost');
      if (i === frame.active) cell.classList.add('is-active');
      if (i === frame.hit) cell.classList.add('is-hit');
      wrap.appendChild(cell);
    });
    stage.appendChild(wrap);
    if (frame.target != null) {
      stage.appendChild(el('p.hint', 'Searching for target = ' + frame.target));
    }
  }

  function linearFrames(arr, target) {
    const frames = [{ array: arr, target: target, status: 'Start linear search for ' + target }];
    for (let i = 0; i < arr.length; i++) {
      frames.push({ array: arr, target: target, active: i, status: 'Check index ' + i + ' (' + arr[i] + ')' });
      if (arr[i] === target) {
        frames.push({ array: arr, target: target, hit: i, status: '✓ Found ' + target + ' at index ' + i });
        return frames;
      }
    }
    frames.push({ array: arr, target: target, status: '✗ ' + target + ' not found' });
    return frames;
  }

  function binaryFrames(arr, target) {
    const a = arr.slice().sort(function (x, y) { return x - y; });
    let lo = 0, hi = a.length - 1;
    const frames = [{ array: a, target: target, lo: lo, hi: hi, status: 'Array sorted; search whole range' }];
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      frames.push({ array: a, target: target, lo: lo, hi: hi, active: mid,
        status: 'mid = ' + mid + ' → ' + a[mid] });
      if (a[mid] === target) {
        frames.push({ array: a, target: target, hit: mid, status: '✓ Found ' + target + ' at index ' + mid });
        return frames;
      }
      if (a[mid] < target) {
        lo = mid + 1;
        frames.push({ array: a, target: target, lo: lo, hi: hi, status: a[mid] + ' < ' + target + ' → go right' });
      } else {
        hi = mid - 1;
        frames.push({ array: a, target: target, lo: lo, hi: hi, status: a[mid] + ' > ' + target + ' → go left' });
      }
    }
    frames.push({ array: a, target: target, status: '✗ ' + target + ' not found' });
    return frames;
  }

  function makeViz(key, name, fn, sorted, complexity) {
    return {
      id: 'search-' + key,
      title: name,
      category: 'Searching',
      blurb: complexity,
      longDesc: name + (sorted ? ' works on a sorted array, halving the search range each step.'
                               : ' scans left to right until the target is found.'),
      create: function (container) {
        let data = sorted ? Util.distinctArray(15, 1, 60).sort((a, b) => a - b) : Util.distinctArray(15, 1, 99);
        let target = data[Util.randInt(0, data.length - 1)];
        const api = window.Scaffold.createStepViz(container, {
          render: renderCells,
          complexity: { Time: complexity, Space: 'O(1)' },
          legend: [
            { color: 'var(--warn)', label: 'Inspecting' },
            { color: 'var(--good)', label: 'Found' },
            sorted ? { color: 'var(--panel-2)', label: 'Discarded (faded)' } : null
          ].filter(Boolean),
          controls: [
            { label: '🎲 New array', onClick: function (a) { newData(); load(); } },
            { label: '🎯 Random target', onClick: function () { target = data[Util.randInt(0, data.length - 1)]; load(); } },
            { label: '🚫 Missing target', onClick: function () { target = 999; load(); } }
          ],
          onReady: function (a) { load(a); }
        });
        function newData() {
          data = sorted ? Util.distinctArray(15, 1, 60).sort((a, b) => a - b) : Util.distinctArray(15, 1, 99);
          target = data[Util.randInt(0, data.length - 1)];
        }
        function load(a) { (a || api).setFrames(fn(data, target)); }
        return api;
      }
    };
  }

  window.Registry.register(makeViz('linear', 'Linear Search', linearFrames, false, 'O(n)'));
  window.Registry.register(makeViz('binary', 'Binary Search', binaryFrames, true, 'O(log n)'));
})();
