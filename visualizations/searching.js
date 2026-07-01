/* Searching — linear & binary search, labelled cells + pseudocode + counters. */
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
    if (frame.target != null) stage.appendChild(el('p.hint', 'Searching for target = ' + frame.target));
  }

  const LINEAR_PC = [
    'for i = 0 to n-1:',
    '  if a[i] == target:',
    '    return i',
    'return NOT_FOUND'
  ];
  const BINARY_PC = [
    'lo = 0; hi = n-1',
    'while lo <= hi:',
    '  mid = (lo+hi)/2',
    '  if a[mid] == target: return mid',
    '  else if a[mid] < target: lo = mid+1',
    '  else: hi = mid-1',
    'return NOT_FOUND'
  ];

  function linearFrames(arr, target) {
    let cc = 0;
    const F = [{ array: arr, target, line: 0, counters: { Comparisons: 0 }, status: 'Start linear search for ' + target }];
    for (let i = 0; i < arr.length; i++) {
      cc++;
      F.push({ array: arr, target, active: i, line: 1, counters: { Comparisons: cc }, status: 'Check index ' + i + ' (' + arr[i] + ')' });
      if (arr[i] === target) { F.push({ array: arr, target, hit: i, line: 2, counters: { Comparisons: cc }, status: '✓ Found ' + target + ' at index ' + i }); return F; }
    }
    F.push({ array: arr, target, line: 3, counters: { Comparisons: cc }, status: '✗ ' + target + ' not found' });
    return F;
  }

  function binaryFrames(arr, target) {
    const a = arr.slice().sort((x, y) => x - y);
    let lo = 0, hi = a.length - 1, cc = 0;
    const F = [{ array: a, target, lo, hi, line: 0, counters: { Comparisons: 0 }, status: 'Array sorted; search whole range' }];
    while (lo <= hi) {
      const mid = (lo + hi) >> 1; cc++;
      F.push({ array: a, target, lo, hi, active: mid, line: 2, counters: { Comparisons: cc }, status: 'mid = ' + mid + ' → ' + a[mid] });
      if (a[mid] === target) { F.push({ array: a, target, hit: mid, line: 3, counters: { Comparisons: cc }, status: '✓ Found ' + target + ' at index ' + mid }); return F; }
      if (a[mid] < target) { lo = mid + 1; F.push({ array: a, target, lo, hi, line: 4, counters: { Comparisons: cc }, status: a[mid] + ' < ' + target + ' → go right' }); }
      else { hi = mid - 1; F.push({ array: a, target, lo, hi, line: 5, counters: { Comparisons: cc }, status: a[mid] + ' > ' + target + ' → go left' }); }
    }
    F.push({ array: a, target, line: 6, counters: { Comparisons: cc }, status: '✗ ' + target + ' not found' });
    return F;
  }

  window.__algos = window.__algos || {};
  window.__algos.search = { linear: linearFrames, binary: binaryFrames };

  function makeViz(key, name, fn, sorted, pc, complexity) {
    return {
      id: 'search-' + key,
      title: name,
      category: 'Searching',
      blurb: complexity,
      longDesc: name + (sorted ? ' works on a sorted array, halving the search range each step.'
                               : ' scans left to right until the target is found.') +
        ' The pseudocode line and comparison count update as it runs.',
      create: function (container, params) {
        let data, target;
        if (params && params.data) {
          data = Util.parseList(params.data, null);
          if (sorted && data) data.sort((a, b) => a - b);
        }
        if (!data || !data.length) newData();
        target = params && params.target != null && params.target !== '' ? parseInt(params.target, 10) : data[Util.randInt(0, data.length - 1)];

        const api = window.Scaffold.createStepViz(container, {
          render: renderCells,
          pseudocode: pc,
          counters: ['Comparisons'],
          complexity: { Time: complexity, Space: 'O(1)' },
          legend: [
            { color: 'var(--warn)', label: 'Inspecting' },
            { color: 'var(--good)', label: 'Found' },
            sorted ? { color: 'var(--panel-2)', label: 'Discarded (faded)' } : null
          ].filter(Boolean),
          controls: [
            { label: '🎲 New array', onClick: function () { newData(); target = data[Util.randInt(0, data.length - 1)]; load(); } },
            { label: '🎯 Random target', onClick: function () { target = data[Util.randInt(0, data.length - 1)]; load(); } },
            { label: '🚫 Missing target', onClick: function () { target = 999; load(); } },
            { label: '🔗 Copy link', onClick: copyLink }
          ],
          onReady: function (a) { load(a); }
        });
        function newData() {
          data = sorted ? Util.distinctArray(15, 1, 60).sort((a, b) => a - b) : Util.distinctArray(15, 1, 99);
        }
        function load(a) { (a || api).setFrames(fn(data, target)); window.Router.setParams({ data: data.join(','), target: target }); }
        function copyLink() {
          const link = window.Router.absoluteLink('search-' + key, { data: data.join(','), target: target });
          navigator.clipboard && navigator.clipboard.writeText(link);
          api.setStatus('🔗 Link copied — array + target ' + target + ' saved in the URL.');
        }
        return api;
      }
    };
  }

  window.Registry.register(makeViz('linear', 'Linear Search', linearFrames, false, LINEAR_PC, 'O(n)'));
  window.Registry.register(makeViz('binary', 'Binary Search', binaryFrames, true, BINARY_PC, 'O(log n)'));
})();
