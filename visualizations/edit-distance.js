/* Edit Distance (Levenshtein) — 2-D DP table fill + backtrack of operations. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  const PRESETS = [['kitten', 'sitting'], ['sunday', 'saturday'], ['flaw', 'lawn'], ['intention', 'execution']];

  window.Registry.register({
    id: 'edit-distance',
    title: 'Edit Distance (Levenshtein)',
    category: 'Recursion & DP',
    blurb: 'Min insert/delete/replace edits between two strings. O(m·n).',
    longDesc: 'The edit (Levenshtein) distance is the minimum number of single-character insertions, ' +
      'deletions, or substitutions to turn one string into another. dp[i][j] is the distance between the ' +
      'first i characters of A and first j of B; backtracking reconstructs the actual edits.',
    create: function (container, params) {
      let A = 'kitten', B = 'sitting', pick = 0;
      if (params && params.a) A = clean(params.a);
      if (params && params.b) B = clean(params.b);

      const inA = el('input.field', { type: 'text', value: A, style: { width: '130px' }, maxlength: '9' });
      const inB = el('input.field', { type: 'text', value: B, style: { width: '130px' }, maxlength: '9' });

      function build(a, b) {
        const m = a.length, n = b.length;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        const frames = [];
        const snap = (mark) => frames.push({ a, b, dp: dp.map((r) => r.slice()), mark: mark || {} });
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        snap({ status: 'Base row/column = distance to the empty string (all inserts/deletes)' });
        for (let i = 1; i <= m; i++) {
          for (let j = 1; j <= n; j++) {
            const match = a[i - 1] === b[j - 1];
            if (match) {
              dp[i][j] = dp[i - 1][j - 1];
              snap({ cell: [i, j], from: [[i - 1, j - 1]], status: a[i - 1] + ' = ' + b[j - 1] + ' → free, copy diagonal = ' + dp[i][j] });
            } else {
              const best = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
              dp[i][j] = best + 1;
              const from = [];
              if (dp[i - 1][j - 1] === best) from.push([i - 1, j - 1]);
              if (dp[i - 1][j] === best) from.push([i - 1, j]);
              if (dp[i][j - 1] === best) from.push([i, j - 1]);
              snap({ cell: [i, j], from, status: a[i - 1] + ' ≠ ' + b[j - 1] + ' → 1 + min(replace, delete, insert) = ' + dp[i][j] });
            }
          }
        }
        // backtrack
        let i = m, j = n; const path = []; const ops = [];
        while (i > 0 || j > 0) {
          path.push([i, j]);
          if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) { i--; j--; }
          else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { ops.unshift('replace ' + a[i - 1] + '→' + b[j - 1]); i--; j--; }
          else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { ops.unshift('delete ' + a[i - 1]); i--; }
          else { ops.unshift('insert ' + b[j - 1]); j--; }
        }
        path.push([0, 0]);
        for (let k = 0; k <= path.length; k++) snap({ path: path.slice(0, k), status: 'Backtrack along the choices that produced each cell.' });
        frames.push({ a, b, dp: dp.map((r) => r.slice()), mark: { path: path.slice(), done: true,
          status: '✓ Distance = ' + dp[m][n] + '. Edits: ' + (ops.join('; ') || 'none') } });
        return frames;
      }

      function render(stage, frame) {
        clear(stage);
        if (!frame) return;
        const { a, b, dp, mark } = frame;
        const pathSet = new Set((mark.path || []).map((p) => p.join(',')));
        const fromSet = new Set((mark.from || []).map((p) => p.join(',')));
        const cell = (txt, bg) => el('td', { style: {
          border: '1px solid var(--border)', width: '32px', height: '32px', textAlign: 'center',
          background: bg || 'transparent', color: bg ? '#0b0e1a' : 'var(--text)'
        } }, txt == null ? '' : String(txt));
        const table = el('table', { style: { borderCollapse: 'collapse', fontFamily: 'var(--mono)', margin: '0 auto' } });
        const head = el('tr', [cell(''), cell('∅', 'var(--panel-2)')]);
        for (let j = 0; j < b.length; j++) head.appendChild(cell(b[j], 'var(--panel-2)'));
        table.appendChild(head);
        for (let i = 0; i <= a.length; i++) {
          const tr = el('tr', [cell(i === 0 ? '∅' : a[i - 1], 'var(--panel-2)')]);
          for (let j = 0; j <= b.length; j++) {
            let bg = null; const key = i + ',' + j;
            if (mark.cell && mark.cell[0] === i && mark.cell[1] === j) bg = 'var(--warn)';
            else if (pathSet.has(key)) bg = 'var(--good)';
            else if (fromSet.has(key)) bg = 'var(--accent)';
            tr.appendChild(cell(dp[i][j], bg));
          }
          table.appendChild(tr);
        }
        stage.appendChild(el('div', { style: { overflowX: 'auto' } }, [table]));
      }

      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 320,
        render: render,
        pseudocode: [
          'dp[i][0]=i, dp[0][j]=j',
          'for i,j:',
          '  if A[i]==B[j]: dp[i][j]=dp[i-1][j-1]',
          '  else: dp[i][j]=1+min(',
          '     dp[i-1][j-1], // replace',
          '     dp[i-1][j],   // delete',
          '     dp[i][j-1])   // insert'
        ],
        legend: [
          { color: 'var(--warn)', label: 'Filling' },
          { color: 'var(--accent)', label: 'Candidate sources' },
          { color: 'var(--good)', label: 'Edit path' }
        ],
        complexity: { Time: 'O(m·n)', Space: 'O(m·n)' },
        topControls: [
          el('div.control-group', [el('label', 'A'), inA]),
          el('div.control-group', [el('label', 'B'), inB]),
          el('button.btn.btn--primary', { onclick: function () { A = clean(inA.value) || 'a'; B = clean(inB.value) || 'b'; inA.value = A; inB.value = B; load(); } }, 'Use inputs'),
          el('button.btn', { onclick: function () { const p = PRESETS[(pick++) % PRESETS.length]; A = p[0]; B = p[1]; inA.value = A; inB.value = B; load(); } }, '🎲 Preset')
        ],
        onReady: function (a) { load(a); }
      });
      function clean(s) { return (s || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 9); }
      function load(a) { (a || api).setFrames(build(A, B)); (a || api).setStatus('Edit distance of "' + A + '" → "' + B + '". Press play.'); window.Router.setParams({ a: A, b: B }); }
      return api;
    }
  });
})();
