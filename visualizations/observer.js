/* Observer / pub-sub — a subject notifies its subscribers; fan-out animates. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;

  window.Registry.register({
    id: 'observer',
    title: 'Observer (Pub/Sub)',
    category: 'Design Patterns',
    blurb: 'One subject, many listeners — change flows outward, not by polling.',
    longDesc: 'The subject keeps a list of subscribers and calls each when its state changes. The subject ' +
      'never knows who is listening — that inversion is what decouples UI from data, emitters from handlers. ' +
      'Toggle subscribers, then publish an event and watch the fan-out (and who gets skipped).',
    create: function (container) {
      const OBS = [
        { id: 'Logger', x: 560, y: 60, on: true },
        { id: 'Chart', x: 610, y: 180, on: true },
        { id: 'Cache', x: 560, y: 300, on: true },
        { id: 'Mailer', x: 440, y: 350, on: false }
      ];
      const SUBJ = { x: 190, y: 190 };
      let stateN = 0, timer = null, phase = -1; // phase = index being notified

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage.svg-stage');
      const setStatus = (h) => { status.innerHTML = h; };
      function stop() { if (timer) { clearTimeout(timer); timer = null; } }

      function render() {
        clear(stage);
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 720 400', width: 720, style: 'max-width:100%' });
        OBS.forEach(function (o, i) {
          const active = phase === i && o.on;
          svg.appendChild(svgEl('line', { x1: SUBJ.x, y1: SUBJ.y, x2: o.x, y2: o.y,
            class: 'edge-line' + (active ? ' is-active' : ''),
            'stroke-dasharray': o.on ? '' : '4 5', style: o.on ? '' : 'opacity:.35' }));
        });
        svg.appendChild(svgEl('circle', { cx: SUBJ.x, cy: SUBJ.y, r: 34, class: 'node-circle' + (phase === -2 ? ' is-active' : ' is-visit') }));
        svg.appendChild(svgEl('text', { x: SUBJ.x, y: SUBJ.y - 8, class: 'node-text on-fill', text: 'Subject' }));
        svg.appendChild(svgEl('text', { x: SUBJ.x, y: SUBJ.y + 10, class: 'node-text on-fill', text: 'state=' + stateN }));
        OBS.forEach(function (o, i) {
          const notified = o.on && phase >= i;
          const cls = 'node-circle' + (phase === i && o.on ? ' is-active' : notified ? ' is-done' : o.on ? '' : '');
          const c = svgEl('circle', { cx: o.x, cy: o.y, r: 26, class: cls, style: (o.on ? '' : 'opacity:.35;') + 'cursor:pointer' });
          c.addEventListener('pointerdown', function () {
            o.on = !o.on; stop(); phase = -1; render();
            setStatus(o.id + (o.on ? ' subscribed — it will receive future notifications.' : ' unsubscribed — the subject forgets it entirely.'));
          });
          svg.appendChild(c);
          svg.appendChild(svgEl('text', { x: o.x, y: o.y, class: 'node-text' + (notified || (phase === i && o.on) ? ' on-fill' : ''), text: o.id }));
        });
        stage.appendChild(svg);
        stage.appendChild(el('p.hint', 'Click an observer to (un)subscribe. Dashed line = not subscribed.'));
      }

      function publish() {
        stop(); stateN++; phase = -2; render();
        setStatus('subject.setState(' + stateN + ') — now it walks its subscriber list…');
        let i = -1;
        (function next() {
          i++;
          while (i < OBS.length && !OBS[i].on) {
            setStatus(OBS[i].id + ' is not subscribed — skipped without the subject caring.');
            i++;
          }
          if (i >= OBS.length) { phase = OBS.length; render(); setStatus('All subscribers notified with state=' + stateN + '. The subject never knew their types — only that they implement update().'); return; }
          phase = i; render();
          setStatus('notify → <b>' + OBS[i].id + '</b>.update(state=' + stateN + ')');
          timer = setTimeout(next, 850);
        })();
      }

      container.appendChild(el('div.controls', [
        el('button.btn.btn--primary', { onclick: publish }, '📣 setState / publish'),
        el('span.spacer'),
        el('button.btn.btn--ghost', { onclick: function () { stop(); phase = -1; stateN = 0; render(); setStatus('reset'); } }, '↺')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Notify: '), 'O(subscribers)']),
        el('span.pill', [el('b', 'Coupling: '), 'subject knows an interface, not the listeners']),
        el('span.pill', [el('b', 'In the wild: '), 'DOM events · signals · message buses'])
      ]));
      render();
      setStatus('Three subscribers active, one detached. Publish to see the fan-out.');
      return { destroy: stop };
    }
  });
})();
