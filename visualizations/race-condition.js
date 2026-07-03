/* Race conditions & locks — two threads run count++ (read, add, write).
   Interleaving decides whether an update is lost; a lock serializes it. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  // Each thread does: r = count; r = r + 1; count = r
  function build(mode) {
    const F = [];
    let count = 0;
    const laneCells = [[], []];
    const snap = (cursor, status, extra) => F.push(Object.assign({
      lanes: [{ name: 'Thread A', cells: laneCells[0].slice() }, { name: 'Thread B', cells: laneCells[1].slice() }],
      cursor, note: 'shared count = ' + count, status
    }, extra || {}));
    const pad = (lane) => { laneCells[lane].push({ label: '', state: 'idle' }); };
    const op = (lane, label, state, fn, status) => {
      laneCells[lane].push({ label, state });
      pad(1 - lane);
      if (fn) fn();
      snap(laneCells[lane].length - 1, 'Thread ' + (lane ? 'B' : 'A') + ': ' + status);
    };

    snap(null, mode === 'race'
      ? 'Both threads increment the SAME counter. count++ is secretly three steps…'
      : mode === 'lock' ? 'Same interleaving pressure — but a lock guards the three steps.' : 'Threads run one after the other.');

    let rA = 0, rB = 0;
    if (mode === 'seq') {
      op(0, 'read 0', 'run', () => { rA = count; }, 'reads count → 0');
      op(0, '+1', 'run', () => { rA++; }, 'computes 0+1 in its register');
      op(0, 'write 1', 'ok', () => { count = rA; }, 'writes 1 back');
      op(1, 'read 1', 'run', () => { rB = count; }, 'reads count → 1');
      op(1, '+1', 'run', () => { rB++; }, 'computes 1+1');
      op(1, 'write 2', 'ok', () => { count = rB; }, 'writes 2 ✓ correct');
      snap(null, 'Sequential result: count = 2 ✓');
    } else if (mode === 'race') {
      op(0, 'read 0', 'run', () => { rA = count; }, 'reads count → 0');
      op(1, 'read 0', 'bad', () => { rB = count; }, 'ALSO reads 0 — before A wrote back!');
      op(0, '+1', 'run', () => { rA++; }, 'computes 0+1');
      op(1, '+1', 'run', () => { rB++; }, 'computes 0+1 (from its stale read)');
      op(0, 'write 1', 'ok', () => { count = rA; }, 'writes 1');
      op(1, 'write 1', 'bad', () => { count = rB; }, 'writes 1 AGAIN — A\'s increment is destroyed');
      snap(null, '⚠ Lost update: two increments, but count = 1. This bug appears only under unlucky timing.');
    } else {
      op(0, 'lock 🔒', 'lock', null, 'acquires the lock');
      op(0, 'read 0', 'run', () => { rA = count; }, 'reads 0 safely');
      laneCells[1][laneCells[1].length - 1] = { label: 'wait…', state: 'wait' };
      op(0, '+1', 'run', () => { rA++; }, 'computes 1 — B is blocked at the lock');
      laneCells[1][laneCells[1].length - 1] = { label: 'wait…', state: 'wait' };
      op(0, 'write 1', 'run', () => { count = rA; }, 'writes 1');
      op(0, 'unlock', 'lock', null, 'releases the lock');
      op(1, 'lock 🔒', 'lock', null, 'B finally acquires it');
      op(1, 'read 1', 'run', () => { rB = count; }, 'reads the FRESH value 1');
      op(1, '+1', 'run', () => { rB++; }, 'computes 2');
      op(1, 'write 2', 'ok', () => { count = rB; }, 'writes 2 ✓');
      op(1, 'unlock', 'lock', null, 'releases');
      snap(null, 'Locked result: count = 2 ✓ — mutual exclusion made read-modify-write atomic (at the cost of waiting).');
    }
    return F;
  }
  window.__algos = window.__algos || {};
  window.__algos.race = { build };

  window.Registry.register({
    id: 'race-condition',
    title: 'Race Conditions & Locks',
    category: 'Runtime',
    blurb: 'count++ is three steps — interleave two threads and an update vanishes.',
    longDesc: 'count++ compiles to read → add → write. Run two threads and the result depends on how those ' +
      'steps interleave: one schedule gives 2, another silently gives 1. A mutex forces the three steps to ' +
      'happen atomically. Compare all three schedules.',
    create: function (container) {
      let mode = 'race';
      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 1000,
        render: function (stage, frame) {
          clear(stage);
          if (!frame) return;
          stage.appendChild(window.Widgets.lanes(frame));
        },
        legend: [
          { color: 'var(--accent)', label: 'Step runs' },
          { color: 'var(--danger)', label: 'The hazard' },
          { color: 'var(--warn)', label: 'Lock held' },
          { color: 'var(--good)', label: 'Write lands' }
        ],
        complexity: { 'Bug type': 'lost update', 'Fix': 'mutex / atomic op', 'Cost of fix': 'waiting (contention)' },
        controls: [
          { label: '✅ Sequential', onClick: function (a) { mode = 'seq'; load(a); } },
          { label: '💥 Racy interleaving', onClick: function (a) { mode = 'race'; load(a); } },
          { label: '🔒 With a lock', onClick: function (a) { mode = 'lock'; load(a); } }
        ],
        onReady: function (a) { load(a); }
      });
      function load(a) { const x = a || api; x.setFrames(build(mode)); x.setStatus('Schedule: ' + mode + ' — press play.'); }
      return api;
    }
  });
})();
