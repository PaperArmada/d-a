/* Deadlock — two threads, two locks, opposite order → circular wait.
   The fix is embarrassingly simple: agree on a lock order. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  function build(mode) {
    const F = [];
    const cells = [[], []];
    const snap = (status, note) => F.push({
      lanes: [{ name: 'Thread 1', cells: cells[0].slice() }, { name: 'Thread 2', cells: cells[1].slice() }],
      cursor: null, note: note || '', status
    });
    const op = (lane, label, state, status, note) => {
      cells[lane].push({ label, state }); cells[1 - lane].push({ label: '', state: 'idle' });
      snap('Thread ' + (lane + 1) + ': ' + status, note);
    };
    if (mode === 'deadlock') {
      snap('T1 needs locks A then B; T2 needs B then A. Both orders feel locally reasonable…', '');
      op(0, 'lock A 🔒', 'lock', 'acquires lock A', 'A → T1');
      op(1, 'lock B 🔒', 'lock', 'acquires lock B', 'A → T1 · B → T2');
      op(0, 'want B…', 'wait', 'requests B — held by T2 → blocks', 'T1 waits for B (T2 has it)');
      op(1, 'want A…', 'bad', 'requests A — held by T1 → blocks. CIRCULAR WAIT.', 'T1 → waits for → T2 → waits for → T1  ⟲');
      snap('☠ DEADLOCK. Neither can proceed, neither will release. Forever. No error is thrown — the program just stops.',
        'wait-for graph has a cycle: T1 → T2 → T1');
    } else {
      snap('Same threads, same work — but a GLOBAL RULE: always lock A before B.', '');
      op(0, 'lock A 🔒', 'lock', 'acquires A (first in the agreed order)', 'A → T1');
      op(1, 'want A…', 'wait', 'also starts with A — blocks politely', 'T2 waits (no cycle: it holds nothing)');
      op(0, 'lock B 🔒', 'lock', 'acquires B — owns both, does its work', '');
      op(0, 'unlock A,B', 'ok', 'releases both', '');
      op(1, 'lock A 🔒', 'lock', 'now acquires A', '');
      op(1, 'lock B 🔒', 'lock', 'and B — proceeds', '');
      op(1, 'unlock ✓', 'ok', 'done. Slower sometimes, deadlocked never.', '');
      snap('Lock ordering makes a wait-for CYCLE impossible — a waiter never holds anything a lower-ordered thread needs.', '');
    }
    return F;
  }
  window.__algos = window.__algos || {};
  window.__algos.deadlock = { build };

  window.Registry.register({
    id: 'deadlock',
    title: 'Deadlock & Lock Ordering',
    category: 'Runtime',
    blurb: 'Two locks taken in opposite orders → a silent forever-freeze.',
    madeOf: ['race-condition'],
    longDesc: 'Deadlock needs four conditions; the easiest to break is circular wait. Watch two threads grab ' +
      'two locks in opposite orders and freeze forever — then rerun with one global lock order and see why ' +
      'the cycle becomes impossible.',
    create: function (container) {
      let mode = 'deadlock';
      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 1200,
        render: function (stage, frame) {
          clear(stage);
          if (!frame) return;
          stage.appendChild(window.Widgets.lanes(frame));
        },
        legend: [
          { color: 'var(--warn)', label: 'Lock held' },
          { color: 'var(--panel)', label: 'Blocked, waiting' },
          { color: 'var(--danger)', label: 'Circular wait' },
          { color: 'var(--good)', label: 'Completed' }
        ],
        complexity: { 'Needs all 4': 'mutual excl · hold&wait · no preempt · circular wait', 'Cheapest fix': 'global lock order' },
        controls: [
          { label: '☠ Opposite orders', onClick: function (a) { mode = 'deadlock'; load(a); } },
          { label: '✅ Agreed order (A→B)', onClick: function (a) { mode = 'ordered'; load(a); } }
        ],
        onReady: function (a) { load(a); }
      });
      function load(a) { const x = a || api; x.setFrames(build(mode)); x.setStatus('Press play.'); }
      return api;
    }
  });
})();
