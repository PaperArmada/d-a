/* Token bucket rate limiting — steady refill, bursts allowed, floods rejected. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  window.Registry.register({
    id: 'token-bucket',
    title: 'Rate Limiting (Token Bucket)',
    category: 'Systems',
    blurb: 'A bucket of tokens: bursts OK while they last, floods bounced.',
    longDesc: 'Every request must take a token; the bucket refills at a steady rate up to a cap. Bursts are ' +
      'fine while saved-up tokens last, but sustained load beyond the refill rate gets rejected (429). This ' +
      'is the limiter behind most public APIs — and why "burst" and "sustained" limits differ.',
    create: function (container) {
      const CAP = 5, REFILL = 1;
      let tokens = CAP;
      let allowed = 0, rejected = 0;
      let log = [];

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage', { style: { minHeight: '220px' } });
      const setStatus = (h) => { status.innerHTML = h; };

      function render(mark) {
        clear(stage);
        const items = [];
        for (let i = 0; i < CAP; i++) items.push(i < tokens ? '●' : '');
        stage.appendChild(window.Widgets.dsStrip({
          title: 'Bucket (' + tokens + ' / ' + CAP + ' tokens)',
          subtitle: 'refills +' + REFILL + ' per tick, capped at ' + CAP,
          items: items.map((x, i) => x || '·'),
          nextOutIndex: tokens > 0 ? tokens - 1 : null,
          chipClass: '', endLabels: null,
          format: (v) => v
        }));
        // paint chips: filled vs empty
        const chips = stage.querySelectorAll('.ds-chip');
        chips.forEach(function (c, i) {
          if (i < tokens) { c.style.background = 'var(--accent-2)'; c.style.borderColor = 'var(--accent-2)'; c.style.color = '#0b0e1a'; }
          else { c.style.opacity = .3; }
        });
        stage.appendChild(el('div.stats', [
          el('span.stat', ['Allowed: ', el('b', String(allowed))]),
          el('span.stat', ['Rejected (429): ', el('b', { style: { color: rejected ? 'var(--danger)' : '' } }, String(rejected))])
        ]));
        if (log.length) stage.appendChild(el('div.row', log.slice(-10).map((s) =>
          el('span.pill', { style: s.ok ? '' : 'color:var(--danger)' }, s.t))));
      }

      function request() {
        if (tokens > 0) { tokens--; allowed++; log.push({ ok: true, t: '✓ 200' }); render();
          setStatus('Request took a token → <b>allowed</b>. ' + tokens + ' left.');
        } else { rejected++; log.push({ ok: false, t: '✗ 429' }); render();
          setStatus('Bucket empty → <b>429 Too Many Requests</b>. Wait for refill (or slow down).');
        }
      }
      function burst(n) { for (let i = 0; i < n; i++) request(); setStatus('Burst of ' + n + ': saved-up tokens absorbed part of it; the rest bounced.'); }
      function tick() {
        const before = tokens;
        tokens = Math.min(CAP, tokens + REFILL); render();
        setStatus(before === tokens ? 'Tick — bucket already full (unused capacity doesn\'t accumulate past the cap).'
          : 'Tick — refilled to ' + tokens + '.');
      }

      container.appendChild(el('div.controls', [
        el('button.btn.btn--primary', { onclick: request }, '📨 Request'),
        el('button.btn', { onclick: () => burst(4) }, '💥 Burst ×4'),
        el('button.btn', { onclick: tick }, '⏱ Tick (refill +' + REFILL + ')'),
        el('span.spacer'),
        el('button.btn.btn--ghost', { onclick: function () { tokens = CAP; allowed = rejected = 0; log = []; render(); setStatus('reset, bucket full'); } }, '↺')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Decision: '), 'O(1)']),
        el('span.pill', [el('b', 'Burst capacity: '), 'bucket size']),
        el('span.pill', [el('b', 'Sustained rate: '), 'refill rate'])
      ]));
      render();
      setStatus('Full bucket = burst allowance. Fire a burst, then keep requesting without ticking.');
      return {};
    }
  });
})();
