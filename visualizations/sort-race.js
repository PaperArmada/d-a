/* Sorting Race — run several sorts on the SAME array in lockstep and watch
   which finishes first, with live comparison/swap counts per algorithm.
   Reuses the frame generators exposed on window.__algos.sort. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;
  const Util = window.Util;

  const ORDER = ['bubble', 'selection', 'insertion', 'merge', 'quick', 'heap'];

  window.Registry.register({
    id: 'sort-race',
    title: 'Sorting Race',
    category: 'Sorting',
    blurb: 'Run all six sorts on one array — see who finishes first.',
    longDesc: 'Every algorithm sorts the identical array in lockstep, one operation per step. ' +
      'The step count is a proxy for total work, so the algorithm that finishes first did the least ' +
      'work on this input. Watch how O(n log n) sorts pull ahead as the array grows.',
    create: function (container, params) {
      const ALGOS = (window.__algos && window.__algos.sort) || {};
      let data = (params && params.data) ? Util.parseList(params.data, null) : null;
      if (!data || data.length < 2) data = Util.randomArray(24, 5, 99);

      let runs = [];      // [{key, name, frames, len}]
      let finishOrder = [];

      function prepare() {
        runs = ORDER.filter((k) => ALGOS[k]).map(function (k) {
          const frames = ALGOS[k].fn(data);
          return { key: k, name: ALGOS[k].name, frames: frames, len: frames.length };
        });
        finishOrder = [];
      }

      function maxLen() { return runs.reduce((m, r) => Math.max(m, r.len), 1); }

      function render(stage, frame) {
        clear(stage);
        const step = frame ? frame.i : 0;
        const grid = el('div.race-grid');
        // recompute finish order deterministically for this step
        finishOrder = runs.map((r) => ({ key: r.key, name: r.name, len: r.len }))
          .sort((a, b) => a.len - b.len);

        runs.forEach(function (r) {
          const idx = Math.min(step, r.len - 1);
          const sub = r.frames[idx];
          const done = step >= r.len - 1;
          const cell = el('div.race-cell' + (done ? '.done' : ''));
          const rank = finishOrder.findIndex((f) => f.key === r.key) + 1;
          cell.appendChild(el('h4', [
            el('span', r.name),
            el('span.mono.dim', done ? ('#' + rank + ' ✓') : (idx + '/' + (r.len - 1)))
          ]));
          // bars
          const bars = el('div.race-bars');
          const max = Math.max.apply(null, sub.array.concat([1]));
          const compare = new Set(sub.compare || []);
          const swap = new Set(sub.swap || []);
          sub.array.forEach(function (v, i) {
            const bar = el('div.bar', { style: { height: (v / max * 100) + '%' } });
            if (done) bar.classList.add('is-sorted');
            else if (swap.has(i)) bar.classList.add('is-swap');
            else if (compare.has(i)) bar.classList.add('is-compare');
            bars.appendChild(bar);
          });
          cell.appendChild(bars);
          const c = sub.counters || {};
          cell.appendChild(el('div.race-meta', [
            el('span', 'cmp ' + (c.Comparisons || 0)),
            el('span', 'swap ' + (c.Swaps || 0))
          ]));
          grid.appendChild(cell);
        });
        stage.appendChild(grid);
      }

      function buildFrames() {
        prepare();
        const n = maxLen();
        const frames = [];
        for (let i = 0; i < n; i++) {
          const finished = runs.filter((r) => i >= r.len - 1).length;
          frames.push({ i: i, status: 'Step ' + (i + 1) + ' / ' + n + ' — ' + finished + ' / ' + runs.length + ' finished' });
        }
        // final frame: announce winner
        const winner = runs.slice().sort((a, b) => a.len - b.len)[0];
        frames[frames.length - 1].status = '🏆 Winner: <b>' + winner.name + '</b> (' + winner.len +
          ' steps). Fewest operations on this array of ' + data.length + '.';
        return frames;
      }

      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 120,
        render: render,
        legend: [
          { color: 'var(--warn)', label: 'Comparing' },
          { color: 'var(--danger)', label: 'Swap / write' },
          { color: 'var(--good)', label: 'Finished' }
        ],
        controls: [
          { label: '🎲 Random', onClick: function () { data = Util.randomArray(data.length, 5, 99); load(); } },
          { label: '➕ Bigger', onClick: function () { data = Util.randomArray(Math.min(data.length + 12, 60), 5, 99); load(); } },
          { label: '➖ Smaller', onClick: function () { data = Util.randomArray(Math.max(data.length - 12, 8), 5, 99); load(); } },
          { label: '↕ Nearly sorted', title: 'Best case for insertion/bubble', onClick: function () {
            data = Util.randomArray(data.length, 5, 99).sort((a, b) => a - b);
            // small perturbation
            for (let k = 0; k < Math.max(1, data.length / 8); k++) {
              const i = Util.randInt(0, data.length - 1), j = Util.randInt(0, data.length - 1);
              [data[i], data[j]] = [data[j], data[i]];
            }
            load();
          } }
        ],
        onReady: function (a) { load(a); }
      });
      function load(a) {
        const x = a || api;
        x.setFrames(buildFrames());
        x.setStatus('Racing ' + runs.length + ' sorts on the same ' + data.length + '-element array. Press play.');
      }
      return api;
    }
  });
})();
