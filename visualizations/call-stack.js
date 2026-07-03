/* The Call Stack — frames push on call, pop on return. Watch factorial run. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  function buildFrames(n) {
    const F = [];
    const stack = [];
    const snap = (line, status) => F.push({
      stack: stack.map((f) => ({ label: f.label, note: f.note })), line, status,
      counters: { 'Max depth': F.reduce((m, x) => Math.max(m, x.stack.length), stack.length) }
    });
    snap(0, 'main() calls fact(' + n + ')');
    function fact(k, depth) {
      stack.push({ label: 'fact(' + k + ')', note: 'n = ' + k });
      snap(1, 'PUSH frame fact(' + k + ') — locals live here (depth ' + stack.length + ')');
      let result;
      if (k <= 1) {
        snap(2, 'Base case: fact(' + k + ') returns 1 — recursion must bottom out');
        result = 1;
      } else {
        snap(3, 'fact(' + k + ') needs fact(' + (k - 1) + ') — pause this frame, call down');
        result = k * fact(k - 1, depth + 1);
        stack[stack.length - 1].note = 'n = ' + k + ' · got ' + (result / k) + ' back';
        snap(4, 'Resume fact(' + k + '): ' + k + ' × ' + (result / k) + ' = ' + result);
      }
      const fr = stack.pop();
      snap(5, 'POP ' + fr.label + ' → return ' + result + ' to the caller');
      return result;
    }
    const r = fact(n, 1);
    snap(6, 'Done: fact(' + n + ') = ' + r + '. Every push was matched by a pop.');
    return F;
  }
  window.__algos = window.__algos || {};
  window.__algos.callstack = { buildFrames };

  function render(stage, frame) {
    clear(stage);
    if (!frame) return;
    const col = el('div', { style: { display: 'flex', flexDirection: 'column-reverse', gap: '6px', alignItems: 'center', minHeight: '220px', justifyContent: 'flex-end' } });
    col.appendChild(el('div.cell.is-ghost', { style: { minWidth: '220px' } }, 'main()'));
    frame.stack.forEach(function (f, i) {
      const top = i === frame.stack.length - 1;
      col.appendChild(el('div.cell' + (top ? '.is-active' : ''), { style: { minWidth: '220px' } }, [
        el('span', f.label + '   '), el('span', { style: { fontSize: '11px', opacity: .75 } }, f.note || '')
      ]));
    });
    stage.appendChild(col);
    stage.appendChild(el('p.hint', frame.stack.length
      ? 'Top of stack = the only frame that can run. Depth ' + frame.stack.length + '.'
      : 'Stack empty — main() has its answer.'));
  }

  window.Registry.register({
    id: 'call-stack',
    title: 'The Call Stack',
    category: 'Runtime',
    blurb: 'Function calls push frames; returns pop them. Recursion = stack depth.',
    longDesc: 'Every function call pushes a frame holding its locals and where to resume; returning pops it. ' +
      'This one mechanism explains recursion, why infinite recursion "overflows the stack", and what a stack ' +
      'trace actually is: the frames alive at the moment of the crash.',
    create: function (container, params) {
      let n = 4;
      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 900,
        render: render,
        counters: ['Max depth'],
        pseudocode: [
          'main: call fact(n)',
          'fact(k): push frame {k}',
          '  if k <= 1: return 1',
          '  call fact(k-1)      // this frame waits',
          '  resume: k * result',
          'pop frame, return to caller',
          'main resumes with the answer'
        ],
        legend: [{ color: 'var(--warn)', label: 'Running frame (top)' }],
        complexity: { 'Stack space': 'O(depth)', 'Overflow': 'depth > limit', 'Stack trace': 'the live frames' },
        controls: [
          { label: '➖ n', onClick: function (a) { n = Math.max(1, n - 1); load(a); } },
          { label: '➕ n', onClick: function (a) { n = Math.min(7, n + 1); load(a); } }
        ],
        onReady: function (a) { load(a); }
      });
      function load(a) { const x = a || api; x.setFrames(buildFrames(n)); x.setStatus('fact(' + n + ') — press play and watch frames push and pop.'); }
      return api;
    }
  });
})();
