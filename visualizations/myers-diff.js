/* Diff — how version control turns two texts into keep/delete/insert ops.
   (LCS backtrack = the practical twin of Edit Distance.) */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  const PRESETS = [
    { a: ['const x = 1', 'print(x)', 'return x'], b: ['const x = 1', 'const y = 2', 'print(x)', 'return y'] },
    { a: ['A', 'B', 'C', 'A', 'B', 'B', 'A'], b: ['C', 'B', 'A', 'B', 'A', 'C'] },
    { a: ['red', 'green', 'blue'], b: ['red', 'blue', 'yellow'] }
  ];

  function diffOps(A, B) {
    const m = A.length, n = B.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const ops = [];
    let i = 0, j = 0;
    while (i < m && j < n) {
      if (A[i] === B[j]) { ops.push({ t: ' ', line: A[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ t: '-', line: A[i] }); i++; }
      else { ops.push({ t: '+', line: B[j] }); j++; }
    }
    while (i < m) { ops.push({ t: '-', line: A[i++] }); }
    while (j < n) { ops.push({ t: '+', line: B[j++] }); }
    return ops;
  }
  window.__algos = window.__algos || {};
  window.__algos.diff = { diffOps };

  function build(A, B) {
    const ops = diffOps(A, B);
    const F = [{ A, B, shown: 0, ops, status: 'Old file left, new file right. The diff finds the longest run of unchanged lines and expresses everything else as − / +.' }];
    ops.forEach(function (op, k) {
      F.push({ A, B, shown: k + 1, ops,
        status: op.t === ' ' ? '"' + op.line + '" is in the common backbone — kept, not stored twice'
          : op.t === '-' ? '"' + op.line + '" only in the old file → deletion'
          : '"' + op.line + '" only in the new file → insertion' });
    });
    const dels = ops.filter((o) => o.t === '-').length, ins = ops.filter((o) => o.t === '+').length;
    F.push({ A, B, shown: ops.length, ops, status: 'Done: ' + dels + ' deletion(s), ' + ins + ' insertion(s). This is the hunk format every code review renders.' });
    return F;
  }

  window.Registry.register({
    id: 'myers-diff',
    title: 'Diff (How Git Compares Files)',
    category: 'Data & Storage',
    blurb: 'Two files in, keep/−/+ script out — Edit Distance\'s practical twin.',
    madeOf: ['edit-distance'],
    longDesc: 'A diff finds the longest common backbone between two files and expresses the rest as ' +
      'deletions and insertions. It\'s the same dynamic programming family as Edit Distance — but this is the ' +
      'version you read in every pull request.',
    create: function (container) {
      let pick = 0;
      let cur = PRESETS[0];

      function render(stage, frame) {
        clear(stage);
        if (!frame) return;
        const cols = el('div', { style: { display: 'flex', gap: '16px', flexWrap: 'wrap' } });
        const fileCol = (title, lines) => el('div', { style: { flex: '1 1 180px' } }, [
          el('div.kv__title', title),
          el('div', lines.map((l) => el('div.mono', { style: { padding: '2px 8px', fontSize: '13px', borderLeft: '2px solid var(--border)' } }, l)))
        ]);
        cols.appendChild(fileCol('OLD', frame.A));
        cols.appendChild(fileCol('NEW', frame.B));
        // diff column
        const dcol = el('div', { style: { flex: '1 1 220px' } });
        dcol.appendChild(el('div.kv__title', 'DIFF (' + frame.shown + ' / ' + frame.ops.length + ' ops)'));
        frame.ops.slice(0, frame.shown).forEach(function (op, k) {
          const last = k === frame.shown - 1;
          const color = op.t === '-' ? 'var(--danger)' : op.t === '+' ? 'var(--good)' : 'var(--text-dim)';
          dcol.appendChild(el('div.mono', { style: {
            padding: '2px 8px', fontSize: '13px',
            background: last ? 'color-mix(in srgb, ' + color + ' 18%, transparent)' : 'transparent',
            color: color, borderLeft: '2px solid ' + color
          } }, op.t + ' ' + op.line));
        });
        cols.appendChild(dcol);
        stage.appendChild(cols);
      }

      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 800,
        render: render,
        complexity: { 'Classic DP': 'O(m·n)', 'Myers refinement': 'O((m+n)·d) — fast when files are similar', 'd': '№ of differences' },
        controls: [
          { label: '🎲 Next example', onClick: function (a) { pick = (pick + 1) % PRESETS.length; cur = PRESETS[pick]; load(a); } }
        ],
        onReady: function (a) { load(a); }
      });
      function load(a) { const x = a || api; x.setFrames(build(cur.a, cur.b)); x.setStatus('Press play to build the diff line by line.'); }
      return api;
    }
  });
})();
