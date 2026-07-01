/* 0/1 Knapsack — classic 2-D DP table fill + backtrack for chosen items. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;
  const Util = window.Util;

  window.Registry.register({
    id: 'knapsack',
    title: '0/1 Knapsack',
    category: 'Recursion & DP',
    blurb: 'Maximize value under a weight limit. O(n·W) table.',
    longDesc: 'Given items with weights and values and a capacity W, choose a subset (each item 0 or 1 ' +
      'times) maximizing total value. dp[i][w] = best value using the first i items within capacity w; ' +
      'each item is either skipped or taken. Backtrack to recover which items were chosen.',
    create: function (container, params) {
      let items = defaultItems();
      let W = 10;

      function defaultItems() {
        return [ { w: 2, v: 3 }, { w: 3, v: 4 }, { w: 4, v: 5 }, { w: 5, v: 8 } ];
      }

      function build() {
        const n = items.length;
        const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));
        const frames = [];
        const snap = (mark) => frames.push({ dp: dp.map((r) => r.slice()), mark: mark || {} });
        snap({ status: 'Row 0 / column 0 = 0 (no items or no capacity ⇒ value 0)' });
        for (let i = 1; i <= n; i++) {
          for (let w = 0; w <= W; w++) {
            const it = items[i - 1];
            if (it.w > w) {
              dp[i][w] = dp[i - 1][w];
              snap({ cell: [i, w], from: [[i - 1, w]],
                status: 'Item ' + i + ' (wt ' + it.w + ') too heavy for cap ' + w + ' → skip → ' + dp[i][w] });
            } else {
              const skip = dp[i - 1][w];
              const take = dp[i - 1][w - it.w] + it.v;
              dp[i][w] = Math.max(skip, take);
              snap({ cell: [i, w], from: take >= skip ? [[i - 1, w - it.w], [i - 1, w]] : [[i - 1, w]],
                status: 'Item ' + i + ' @cap ' + w + ': max(skip ' + skip + ', take ' + it.v + '+' + dp[i - 1][w - it.w] + '=' + take + ') = ' + dp[i][w] });
            }
          }
        }
        // backtrack
        let w = W; const chosen = []; const path = [];
        for (let i = n; i > 0; i--) {
          path.push([i, w]);
          if (dp[i][w] !== dp[i - 1][w]) { chosen.unshift(i); w -= items[i - 1].w; }
        }
        for (let k = 0; k <= path.length; k++) {
          snap({ path: path.slice(0, k), status: 'Backtrack: an item is chosen when its row value differs from the row above.' });
        }
        frames.push({ dp: dp.map((r) => r.slice()), mark: { path: path.slice(), done: true,
          status: '✓ Best value = ' + dp[n][W] + ' using items { ' + chosen.join(', ') + ' } (1-indexed)' } });
        return frames;
      }

      function render(stage, frame) {
        clear(stage);
        if (!frame) return;
        const dp = frame.dp, mark = frame.mark;
        const n = items.length;
        const pathSet = new Set((mark.path || []).map((p) => p.join(',')));
        const fromSet = new Set((mark.from || []).map((p) => p.join(',')));
        const cell = (txt, bg, dim) => el('td', { style: {
          border: '1px solid var(--border)', minWidth: '30px', height: '30px', textAlign: 'center',
          padding: '0 4px', background: bg || 'transparent', color: bg ? '#0b0e1a' : (dim ? 'var(--text-dim)' : 'var(--text)')
        } }, txt == null ? '' : String(txt));

        const table = el('table', { style: { borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: '13px', margin: '0 auto' } });
        const head = el('tr', [cell('item \\ cap', null, true)]);
        for (let w = 0; w <= W; w++) head.appendChild(cell(w, 'var(--panel-2)'));
        table.appendChild(head);
        for (let i = 0; i <= n; i++) {
          const label = i === 0 ? '∅' : ('#' + i + ' (w' + items[i - 1].w + ',v' + items[i - 1].v + ')');
          const tr = el('tr', [cell(label, 'var(--panel-2)')]);
          for (let w = 0; w <= W; w++) {
            let bg = null; const key = i + ',' + w;
            if (mark.cell && mark.cell[0] === i && mark.cell[1] === w) bg = 'var(--warn)';
            else if (pathSet.has(key)) bg = 'var(--good)';
            else if (fromSet.has(key)) bg = 'var(--accent)';
            tr.appendChild(cell(dp[i][w], bg));
          }
          table.appendChild(tr);
        }
        stage.appendChild(el('div', { style: { overflowX: 'auto' } }, [table]));
      }

      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 260,
        render: render,
        pseudocode: [
          'for i = 1..n, for w = 0..W:',
          '  if weight[i] > w:',
          '    dp[i][w] = dp[i-1][w]        // skip',
          '  else:',
          '    dp[i][w] = max(dp[i-1][w],   // skip',
          '                   dp[i-1][w-wt]+val)  // take'
        ],
        legend: [
          { color: 'var(--warn)', label: 'Filling' },
          { color: 'var(--accent)', label: 'Source cells' },
          { color: 'var(--good)', label: 'Backtrack path' }
        ],
        complexity: { Time: 'O(n·W)', Space: 'O(n·W)' },
        controls: [
          { label: '🎲 Random items', onClick: function () {
            const k = Util.randInt(4, 5); items = [];
            for (let i = 0; i < k; i++) items.push({ w: Util.randInt(1, 6), v: Util.randInt(1, 9) });
            W = Util.randInt(8, 12); load();
          } }
        ],
        onReady: function (a) { load(a); }
      });
      function load(a) { (a || api).setFrames(build()); (a || api).setStatus('Capacity W = ' + W + ', ' + items.length + ' items. Press play to fill the table.'); }
      return api;
    }
  });
})();
