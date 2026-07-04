/* Retry, backoff & circuit breaker — a live FSM guarding a flaky dependency. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  const STATES = [
    { id: 'Closed', x: 140, y: 150 },
    { id: 'Open', x: 400, y: 150 },
    { id: 'HalfOpen', label: 'Half-Open', x: 620, y: 150 }
  ];
  const TRANS = [
    { from: 'Closed', to: 'Open', label: '3 failures' },
    { from: 'Closed', to: 'Closed', label: 'success' },
    { from: 'Open', to: 'HalfOpen', label: 'cooldown over' },
    { from: 'Open', to: 'Open', label: 'request → fast-fail' },
    { from: 'HalfOpen', to: 'Closed', label: 'probe succeeds' },
    { from: 'HalfOpen', to: 'Open', label: 'probe fails' }
  ];

  window.Registry.register({
    id: 'circuit-breaker',
    title: 'Circuit Breaker & Backoff',
    category: 'Systems',
    blurb: 'Stop hammering a dying service — a state machine that fails fast, then probes.',
    madeOf: ['state-machine'],
    longDesc: 'When a dependency starts failing, naive retries make the outage worse. A circuit breaker is ' +
      'a small state machine: Closed (normal) trips Open after repeated failures; Open fails instantly without ' +
      'calling the service (protecting it); after a cooldown, Half-Open lets one probe through to decide. ' +
      'Drive it with the buttons — including the cooldown clock.',
    create: function (container) {
      let state = 'Closed', fails = 0, cooldown = 0, lastEdge = null;
      const COOLDOWN = 3;
      let log = [];

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage.svg-stage');
      const setStatus = (h) => { status.innerHTML = h; };

      function render() {
        clear(stage);
        stage.appendChild(window.Widgets.fsm({ states: STATES, transitions: TRANS, current: state, lastEdge, width: 760, height: 250 }));
        stage.appendChild(window.Widgets.keyVal('Breaker internals', [
          { key: 'failures', val: fails + ' / 3', state: fails >= 2 ? 'active' : '' },
          { key: 'cooldown', val: state === 'Open' ? cooldown + ' ticks' : '—', state: state === 'Open' ? 'active' : '' },
          { key: 'calls hit service', val: state === 'Open' ? 'NO (fast-fail)' : 'yes', state: state === 'Open' ? 'settled' : '' }
        ]));
        if (log.length) stage.appendChild(el('div.row', log.slice(-8).map((s) => el('span.pill', { style: s.bad ? 'color:var(--danger)' : '' }, s.t))));
      }

      function request(success) {
        if (state === 'Open') {
          lastEdge = ['Open', 'Open', 'request → fast-fail'];
          log.push({ t: 'request ⚡ fast-failed', bad: true });
          render();
          setStatus('Breaker is <b>Open</b>: the request fails in microseconds WITHOUT touching the sick service. That\'s the protection.');
          return;
        }
        if (success) {
          if (state === 'HalfOpen') { state = 'Closed'; lastEdge = ['HalfOpen', 'Closed', 'probe succeeds']; fails = 0;
            log.push({ t: 'probe ✓ → Closed' });
            setStatus('Probe succeeded — service looks healthy again. Breaker <b>Closed</b>, traffic restored.');
          } else { lastEdge = ['Closed', 'Closed', 'success']; fails = 0; log.push({ t: 'request ✓' });
            setStatus('Success — failure counter resets.');
          }
        } else {
          if (state === 'HalfOpen') { state = 'Open'; cooldown = COOLDOWN; lastEdge = ['HalfOpen', 'Open', 'probe fails'];
            log.push({ t: 'probe ✗ → Open', bad: true });
            setStatus('The probe failed — service still sick. Back to <b>Open</b> for another cooldown (this is exponential backoff\'s cousin).');
          } else {
            fails++; log.push({ t: 'request ✗ (' + fails + '/3)', bad: true });
            if (fails >= 3) { state = 'Open'; cooldown = COOLDOWN; lastEdge = ['Closed', 'Open', '3 failures'];
              setStatus('Third failure → breaker <b>trips Open</b>. All calls now fail fast; the service gets room to recover.');
            } else {
              lastEdge = null;
              setStatus('Failure ' + fails + ' of 3. A blip is tolerated; a pattern trips the breaker.');
            }
          }
        }
        render();
      }
      function tick() {
        if (state !== 'Open') { setStatus('The clock only matters while Open.'); return; }
        cooldown--;
        if (cooldown <= 0) { state = 'HalfOpen'; lastEdge = ['Open', 'HalfOpen', 'cooldown over'];
          log.push({ t: 'cooldown over → Half-Open' });
          setStatus('Cooldown elapsed → <b>Half-Open</b>: exactly one real request may pass as a probe.');
        } else setStatus('Cooling down… ' + cooldown + ' tick(s) left. Requests still fast-fail.');
        render();
      }

      container.appendChild(el('div.controls', [
        el('button.btn.btn--primary', { onclick: () => request(true) }, '✓ Request (service OK)'),
        el('button.btn', { onclick: () => request(false) }, '✗ Request (service fails)'),
        el('button.btn', { onclick: tick }, '⏱ Tick clock'),
        el('span.spacer'),
        el('button.btn.btn--ghost', { onclick: function () { state = 'Closed'; fails = 0; cooldown = 0; lastEdge = null; log = []; render(); setStatus('reset'); } }, '↺')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Open state cost: '), 'O(1) fast-fail, zero load on the dependency']),
        el('span.pill', [el('b', 'In the wild: '), 'service meshes · payment gateways · API clients'])
      ]));
      container.appendChild(el('p.hint',
        'In production the breaker works alongside retries, exponential backoff and jitter — retries are ' +
        'what cause the thundering herd; the breaker is the thing that finally says "stop calling, let it heal."'));
      render();
      setStatus('Fail three requests to trip it, tick the clock, then probe.');
      return {};
    }
  });
})();
