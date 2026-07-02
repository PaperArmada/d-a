/* Dynamic programming — Longest Common Subsequence, table-fill animation. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  const PRESETS = [['AGCAT', 'GAC'], ['ABCBDAB', 'BDCAB'], ['XMJYAUZ', 'MZJAWXU'], ['STONE', 'LONGEST']];

  window.Registry.register({
    id: 'lcs',
    title: 'Longest Common Subsequence',
    category: 'Recursion & DP',
    blurb: 'Classic 2-D DP. Fill a table in O(m·n), then backtrack.',
    longDesc: 'The LCS of two strings is the longest subsequence appearing in both (not necessarily contiguous). ' +
      'We fill a table where dp[i][j] = LCS length of the first i and first j characters, then backtrack for the actual subsequence.',
    create: function (container, params) {
      const clean0 = (s) => (s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 9);
      let A = (params && params.a && clean0(params.a)) || 'AGCAT';
      let B = (params && params.b && clean0(params.b)) || 'GAC';

      const inA = el('input.field', { type: 'text', value: A, style: { width: '130px' }, maxlength: '9' });
      const inB = el('input.field', { type: 'text', value: B, style: { width: '130px' }, maxlength: '9' });

      function buildFrames(a, b) {
        const m = a.length, n = b.length;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        const frames = [];
        function snap(mark) { frames.push({ a, b, dp: dp.map((r) => r.slice()), mark: mark || {} }); }
        snap({ status: 'Initialize borders to 0 (empty string ⇒ LCS 0)' });
        for (let i = 1; i <= m; i++) {
          for (let j = 1; j <= n; j++) {
            const match = a[i - 1] === b[j - 1];
            if (match) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            snap({ cell: [i, j], from: match ? [[i - 1, j - 1]] : (dp[i - 1][j] >= dp[i][j - 1] ? [[i - 1, j]] : [[i, j - 1]]),
              status: match
                ? a[i - 1] + ' = ' + b[j - 1] + ' → dp = diagonal + 1 = ' + dp[i][j]
                : a[i - 1] + ' ≠ ' + b[j - 1] + ' → dp = max(up, left) = ' + dp[i][j] });
          }
        }
        // backtrack
        let i = m, j = n; const path = []; const chars = [];
        while (i > 0 && j > 0) {
          if (a[i - 1] === b[j - 1]) { path.push([i, j]); chars.unshift(a[i - 1]); i--; j--; }
          else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
        }
        for (let k = 0; k <= path.length; k++) {
          snap({ path: path.slice(0, k), status: 'Backtrack from bottom-right along matches — LCS = "' + chars.slice(chars.length - k).join('') + '" (length ' + dp[m][n] + ')' });
        }
        frames.push({ a, b, dp: dp.map((r) => r.slice()), mark: { path: path.slice(), done: true, status: '✓ LCS = "' + chars.join('') + '", length ' + dp[m][n] } });
        return frames;
      }

      function render(stage, frame) {
        clear(stage);
        if (!frame) return;
        const { a, b, dp, mark } = frame;
        const pathSet = new Set((mark.path || []).map((p) => p.join(',')));
        const fromSet = new Set((mark.from || []).map((p) => p.join(',')));
        const table = el('table', { style: { borderCollapse: 'collapse', fontFamily: 'var(--mono)', margin: '0 auto' } });
        const mkCell = (txt, cls, hl) => el('td', { style: {
          border: '1px solid var(--border)', width: '34px', height: '34px', textAlign: 'center',
          background: hl || 'transparent', color: hl ? '#0b0e1a' : 'var(--text)'
        } }, txt == null ? '' : String(txt));

        // header row
        const head = el('tr', [mkCell('', ''), mkCell('∅', '', 'var(--panel-2)')]);
        for (let j = 0; j < b.length; j++) head.appendChild(mkCell(b[j], '', 'var(--panel-2)'));
        table.appendChild(head);

        for (let i = 0; i <= a.length; i++) {
          const tr = el('tr');
          tr.appendChild(mkCell(i === 0 ? '∅' : a[i - 1], '', 'var(--panel-2)'));
          for (let j = 0; j <= b.length; j++) {
            let hl = null;
            const key = i + ',' + j;
            if (mark.cell && mark.cell[0] === i && mark.cell[1] === j) hl = 'var(--warn)';
            else if (pathSet.has(key)) hl = 'var(--good)';
            else if (fromSet.has(key)) hl = 'var(--accent)';
            const td = mkCell(dp[i][j], '', hl);
            if (hl === 'var(--warn)') {
              const g = window.Widgets.dpArrow(mark.cell, mark.from);
              if (g) { td.style.position = 'relative'; td.appendChild(el('span.dp-arrow', g)); }
            }
            tr.appendChild(td);
          }
          table.appendChild(tr);
        }
        const wrap = el('div', { style: { overflowX: 'auto' } }, [table]);
        stage.appendChild(wrap);
      }

      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 450,
        render: render,
        legend: [
          { color: 'var(--warn)', label: 'Filling' },
          { color: 'var(--accent)', label: 'Source cell' },
          { color: 'var(--good)', label: 'LCS path' }
        ],
        complexity: { Time: 'O(m·n)', Space: 'O(m·n)' },
        controls: [
          { label: 'Use inputs', primary: true, onClick: function (a) {
            A = clean(inA.value) || 'A'; B = clean(inB.value) || 'B'; inA.value = A; inB.value = B; reload(a);
          } },
          { label: '🎲 Preset', onClick: function (a) {
            const next = PRESETS[(pick++) % PRESETS.length];
            A = next[0]; B = next[1]; inA.value = A; inB.value = B; reload(a);
          } }
        ],
        onReady: function (a) { reload(a); }
      });
      let pick = 0;
      function clean(s) { return (s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 9); }
      function reload(a) { a.setFrames(buildFrames(A, B)); a.setStatus('LCS of "' + A + '" and "' + B + '". Press play to fill the table.'); }

      // put the string inputs at the top of the controls area
      container.insertBefore(el('div.controls', [
        el('div.control-group', [el('label', 'String A'), inA]),
        el('div.control-group', [el('label', 'String B'), inB])
      ]), container.firstChild);

      return api;
    }
  });
})();
