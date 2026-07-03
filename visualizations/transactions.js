/* Transactions & isolation — interleaved reads see impossible states unless
   isolation makes each transaction all-or-nothing AND invisible in flight. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  function build(mode) {
    const F = [];
    let A = 100, B = 0;
    const cells = [[], []];
    const snap = (status) => F.push({
      lanes: [{ name: 'T1 transfer', cells: cells[0].slice() }, { name: 'T2 audit', cells: cells[1].slice() }],
      cursor: null, note: 'A = ' + A + '   B = ' + B + '   (true total should stay 100)', status
    });
    const op = (lane, label, state, fn, status) => {
      cells[lane].push({ label, state }); cells[1 - lane].push({ label: '', state: 'idle' });
      if (fn) fn(); snap('T' + (lane + 1) + ': ' + status);
    };
    snap(mode === 'iso'
      ? 'Same schedule pressure — but T2 must wait for T1\'s lock. Isolation restores sanity.'
      : 'T1 moves 50 from A to B. T2 audits the total mid-flight. Accounts start A=100, B=0.');

    if (mode === 'dirty') {
      op(0, 'A −= 50', 'run', () => { A -= 50; }, 'debits A (A=50) — transaction NOT committed yet');
      op(1, 'read A=50', 'bad', null, 'reads uncommitted A = 50 — a DIRTY READ');
      op(1, 'read B=0', 'bad', null, 'reads B = 0');
      op(1, 'sum = 50 ⚠', 'bad', null, 'reports total 50 — money "vanished" that never really left');
      op(0, 'B += 50', 'run', () => { B += 50; }, 'credits B (B=50)');
      op(0, 'COMMIT', 'ok', null, 'commits — final state is fine, but T2 already reported nonsense');
      snap('⚠ The database was never wrong at rest — T2 just observed the middle of a transaction.');
    } else if (mode === 'rollback') {
      op(0, 'A −= 50', 'run', () => { A -= 50; }, 'debits A (A=50)');
      op(1, 'read A=50', 'bad', null, 'reads uncommitted A = 50');
      op(0, 'ROLLBACK', 'bad', () => { A += 50; }, 'fails and rolls back — A restored to 100');
      op(1, 'acts on 50…', 'bad', null, 'is now acting on data that OFFICIALLY NEVER EXISTED');
      snap('⚠ Worse than a stale read: T2 consumed a value from a timeline that was erased.');
    } else {
      op(0, 'LOCK A,B', 'lock', null, 'takes locks on both accounts');
      op(0, 'A −= 50', 'run', () => { A -= 50; }, 'debits A (A=50)');
      cells[1][cells[1].length - 1] = { label: 'wait…', state: 'wait' };
      op(0, 'B += 50', 'run', () => { B += 50; }, 'credits B (B=50) — T2 still waiting at the lock');
      cells[1][cells[1].length - 1] = { label: 'wait…', state: 'wait' };
      op(0, 'COMMIT 🔓', 'ok', null, 'commits and releases locks');
      op(1, 'read A=50', 'run', null, 'now reads the COMMITTED A = 50');
      op(1, 'read B=50', 'run', null, 'reads B = 50');
      op(1, 'sum = 100 ✓', 'ok', null, 'reports 100 — it saw either before or after, never during');
      snap('Isolation ✓ — transactions appear atomic to each other. The cost: T2 waited.');
    }
    return F;
  }
  window.__algos = window.__algos || {};
  window.__algos.tx = { build };

  window.Registry.register({
    id: 'transactions',
    title: 'Transactions & Isolation',
    category: 'Data & Storage',
    blurb: 'Why audits see money vanish mid-transfer — and what isolation costs.',
    madeOf: ['race-condition'],
    longDesc: 'A transfer is two writes that must act as one. Without isolation, a concurrent reader can ' +
      'observe the half-done middle (dirty read) — or worse, act on data that gets rolled back. Locking ' +
      'restores the all-or-nothing illusion, at the price of waiting. Compare the three schedules.',
    create: function (container) {
      let mode = 'dirty';
      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 1100,
        render: function (stage, frame) {
          clear(stage);
          if (!frame) return;
          stage.appendChild(window.Widgets.lanes(frame));
        },
        legend: [
          { color: 'var(--accent)', label: 'Step runs' },
          { color: 'var(--danger)', label: 'Anomaly' },
          { color: 'var(--warn)', label: 'Lock held' },
          { color: 'var(--good)', label: 'Commit / correct' }
        ],
        complexity: { 'A in ACID': 'all-or-nothing', 'I in ACID': 'as if serial', 'Cost': 'locks → waiting (or MVCC snapshots)' },
        controls: [
          { label: '💥 Dirty read', onClick: function (a) { mode = 'dirty'; load(a); } },
          { label: '🕳 Rollback anomaly', onClick: function (a) { mode = 'rollback'; load(a); } },
          { label: '🔒 Isolated', onClick: function (a) { mode = 'iso'; load(a); } }
        ],
        onReady: function (a) { load(a); }
      });
      function load(a) { const x = a || api; x.setFrames(build(mode)); x.setStatus('Schedule: ' + mode + ' — press play.'); }
      return api;
    }
  });
})();
