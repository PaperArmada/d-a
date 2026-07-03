/* Idempotency — retries are inevitable; double-charging is optional. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  function build(mode) {
    const M = []; const F = [];
    let balance = 100, charges = 0;
    const push = (m, status) => { M.push(m); F.push({ msgs: M.slice(), status, note: 'balance = $' + balance + ' · charges recorded: ' + charges }); };
    push({ from: 0, to: 1, label: 'POST /charge $10' + (mode === 'idem' ? '  (id=abc123)' : '') },
      mode === 'idem' ? 'The request carries an idempotency KEY — a unique id for this logical operation.'
        : 'Client asks to charge $10. No identity attached — just "do it".');
    balance -= 10; charges = 1;
    push({ from: 1, to: 1, label: 'charge #1 → balance $90', state: 'timer' }, 'Server charges the card…');
    push({ from: 1, to: 0, label: '200 OK', state: 'drop' }, '…but the RESPONSE is lost. The client cannot tell "server never got it" from "reply got lost". This ambiguity is fundamental.');
    push({ from: 0, to: 0, label: 'timeout — retry', state: 'timer' }, 'So the client does the only sane thing: retry.');
    if (mode === 'naive') {
      push({ from: 0, to: 1, label: 'POST /charge $10 (retry)' }, 'Same request again…');
      balance -= 10; charges = 2;
      push({ from: 1, to: 1, label: 'charge #2 → balance $80', state: 'timer' }, '⚠ The naive server sees a fresh request and charges AGAIN.');
      push({ from: 1, to: 0, label: '200 OK' }, 'Customer charged twice: $20 for a $10 purchase. The retry that was supposed to add safety created the bug.');
    } else {
      push({ from: 0, to: 1, label: 'POST /charge $10 (id=abc123)' }, 'Retry carries the SAME key abc123…');
      push({ from: 1, to: 1, label: 'seen abc123? YES', state: 'timer' }, 'Server checks its ledger: abc123 already processed → do NOT charge again.');
      push({ from: 1, to: 0, label: '200 OK (replayed result)' }, 'It replays the stored response. Balance still $90, exactly one charge. Retry-safe = idempotent.');
    }
    return F;
  }
  window.__algos = window.__algos || {};
  window.__algos.idem = { build };

  window.Registry.register({
    id: 'idempotency',
    title: 'Idempotency & Retries',
    category: 'Craft',
    blurb: 'Lost responses force retries — idempotency keys make retries safe.',
    madeOf: ['tcp', 'hash-table'],
    longDesc: 'Networks lose responses, so clients must retry — but a retried charge is a double charge ' +
      'unless the operation is idempotent (running it twice = running it once). The standard fix: the client ' +
      'names each logical operation with a key; the server keeps a ledger and replays instead of re-executing. ' +
      'Compare the two servers under the identical failure.',
    create: function (container) {
      let mode = 'naive';
      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 1400,
        render: function (stage, frame) {
          clear(stage);
          if (!frame) return;
          stage.appendChild(window.Widgets.sequence({ actors: ['Client', 'Payment API'], messages: frame.msgs, height: 420 }));
          stage.appendChild(el('div.lane__note.mono', frame.note));
        },
        complexity: { 'Idempotent by nature': 'PUT · DELETE · set x=5', 'Needs keys': 'POST · increment · charge', 'Ledger lookup': 'O(1) — a hash table again' },
        controls: [
          { label: '💥 Naive server', onClick: function (a) { mode = 'naive'; load(a); } },
          { label: '🔑 Idempotency key', onClick: function (a) { mode = 'idem'; load(a); } }
        ],
        onReady: function (a) { load(a); }
      });
      function load(a) { const x = a || api; x.setFrames(build(mode)); x.setStatus('Server: ' + mode + ' — press play. The network failure is identical in both runs.'); }
      return api;
    }
  });
})();
