/* Finite State Machine — the master element. Feed inputs to preset machines
   and watch state move along transitions. Reused by regex, circuit breaker… */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  const MACHINES = {
    turnstile: {
      name: 'Turnstile', start: 'Locked',
      states: [{ id: 'Locked', x: 180, y: 140 }, { id: 'Open', x: 460, y: 140 }],
      transitions: [
        { from: 'Locked', to: 'Open', label: 'coin' },
        { from: 'Open', to: 'Locked', label: 'push' },
        { from: 'Locked', to: 'Locked', label: 'push' },
        { from: 'Open', to: 'Open', label: 'coin' }
      ],
      inputs: ['coin', 'push'],
      blurb: 'The classic: a coin unlocks it, pushing through locks it again. Note the self-loops — inputs that change nothing are still defined.'
    },
    traffic: {
      name: 'Traffic light', start: 'Red',
      states: [{ id: 'Red', x: 130, y: 140 }, { id: 'Green', x: 320, y: 140 }, { id: 'Yellow', x: 510, y: 140 }],
      transitions: [
        { from: 'Red', to: 'Green', label: 'tick' },
        { from: 'Green', to: 'Yellow', label: 'tick' },
        { from: 'Yellow', to: 'Red', label: 'tick' }
      ],
      inputs: ['tick'],
      blurb: 'One input, a fixed cycle. Timers in real controllers are just "tick" generators.'
    },
    door: {
      name: 'Door with lock', start: 'Closed',
      states: [{ id: 'Open', x: 140, y: 110 }, { id: 'Closed', x: 330, y: 190 }, { id: 'Locked', x: 520, y: 110 }],
      transitions: [
        { from: 'Open', to: 'Closed', label: 'close' },
        { from: 'Closed', to: 'Open', label: 'open' },
        { from: 'Closed', to: 'Locked', label: 'lock' },
        { from: 'Locked', to: 'Closed', label: 'unlock' }
      ],
      inputs: ['open', 'close', 'lock', 'unlock'],
      blurb: 'Some inputs are only valid in some states — try "open" while Locked: the machine rejects it. Invalid actions become impossible, not buggy.'
    }
  };

  // Pure engine (exposed for tests).
  function step(machine, state, input) {
    const t = machine.transitions.find((x) => x.from === state && x.label === input);
    return t ? { state: t.to, ok: true, edge: [t.from, t.to, t.label] } : { state: state, ok: false, edge: null };
  }
  window.__algos = window.__algos || {};
  window.__algos.fsm = { machines: MACHINES, step: step };

  window.Registry.register({
    id: 'state-machine',
    title: 'State Machines (FSM)',
    category: 'Design Patterns',
    blurb: 'States + transitions: the pattern that makes invalid actions impossible.',
    longDesc: 'A finite state machine is in exactly one state; inputs either follow a defined transition or are ' +
      'rejected. This one idea powers UI flows, protocol handling, regex engines, circuit breakers, and game AI. ' +
      'Pick a machine, press its inputs, and watch — then try an input the current state doesn\'t accept.',
    create: function (container, params) {
      let key = (params && params.m && MACHINES[params.m]) ? params.m : 'turnstile';
      let m = MACHINES[key];
      let state = m.start;
      let lastEdge = null;
      let log = [];

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage.svg-stage');
      const inputRow = el('div.row');
      const setStatus = (h) => { status.innerHTML = h; };

      function render() {
        clear(stage);
        stage.appendChild(window.Widgets.fsm({
          states: m.states, transitions: m.transitions, current: state, lastEdge: lastEdge, height: 260
        }));
        stage.appendChild(el('p.hint', m.blurb));
        if (log.length) {
          stage.appendChild(el('div.row', log.slice(-10).map((s) =>
            el('span.pill' + (s.ok ? '' : ''), { style: s.ok ? '' : 'color:var(--danger)' }, s.txt))));
        }
      }

      function buildInputs() {
        clear(inputRow);
        m.inputs.forEach(function (inp) {
          inputRow.appendChild(el('button.btn.btn--primary', { onclick: function () {
            const r = step(m, state, inp);
            lastEdge = r.edge;
            if (r.ok) {
              log.push({ ok: true, txt: state + ' —' + inp + '→ ' + r.state });
              setStatus('<b>' + inp + '</b>: ' + state + ' → <b>' + r.state + '</b>');
              state = r.state;
            } else {
              log.push({ ok: false, txt: state + ' ✗ ' + inp });
              setStatus('<b>' + inp + '</b> is not defined in state <b>' + state + '</b> — input rejected, state unchanged.');
            }
            render();
          } }, '▶ ' + inp));
        });
      }

      const sel = el('select');
      Object.keys(MACHINES).forEach((k) => sel.appendChild(el('option', { value: k, selected: k === key }, MACHINES[k].name)));
      sel.addEventListener('change', function () {
        key = sel.value; m = MACHINES[key]; state = m.start; lastEdge = null; log = [];
        buildInputs(); render(); setStatus('Machine: ' + m.name + '. Start state: ' + state + '.');
        window.Router.setParams({ m: key });
      });

      container.appendChild(el('div.controls', [
        el('div.control-group', [el('label', 'Machine'), sel]),
        inputRow,
        el('span.spacer'),
        el('button.btn.btn--ghost', { onclick: function () { state = m.start; lastEdge = null; log = []; render(); setStatus('reset to ' + state); } }, '↺ Reset')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Transition cost: '), 'O(1) — one lookup in the table']),
        el('span.pill', [el('b', 'Invariant: '), 'exactly one current state']),
        el('span.pill', [el('b', 'In the wild: '), 'UI flows · game AI · protocol handshakes'])
      ]));
      buildInputs(); render();
      setStatus('Machine: ' + m.name + '. Current state highlighted — press an input.');
      return {};
    }
  });
})();
