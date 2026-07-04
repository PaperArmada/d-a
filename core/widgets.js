/* Widgets — small, reusable teaching UI primitives shared across
   visualizations. Keeping these in one module means every "queue / stack /
   priority queue" reads identically no matter which algorithm renders it.

   All builders return a detached DOM node; a viz render() just appends it.
*/
(function (global) {
  'use strict';
  const { el } = global.DOM;

  /* dsStrip — a horizontal view of an ordered container (queue / stack / array
     / priority queue), the "engine" that drives an algorithm's order.

     opts = {
       title:        'Queue',                 // what the structure is
       subtitle:     'dequeue from front…',   // one-line semantics (optional)
       items:        [3, 8, 1],               // values in container order
       nextOutIndex: 0 | items.length-1 | null,   // which element leaves next
       enterCount:   1,                       // how many trailing items are new
       endLabels:    { left: 'front', right: 'back' },  // captions under the ends
       chipClass:    'is-frontier',           // ties chips to node colour
       format:       v => String(v)           // optional label formatter
     }
  */
  function dsStrip(opts) {
    opts = opts || {};
    const items = opts.items || [];
    const fmt = opts.format || String;
    const nextOut = opts.nextOutIndex;
    const enterFrom = items.length - (opts.enterCount || 0);

    const chips = items.map(function (v, i) {
      const chip = el('div.ds-chip' + (opts.chipClass ? '.' + opts.chipClass : ''),
        { 'aria-label': fmt(v) }, fmt(v));
      if (i === nextOut) chip.classList.add('next');
      if (opts.enterCount && i >= enterFrom) chip.classList.add('enter');
      return chip;
    });

    const track = el('div.ds-track', chips.length ? chips : [el('div.ds-empty', 'empty')]);

    // End captions (front/back, top/bottom, …) sit under the track.
    let ends = null;
    if (opts.endLabels && items.length) {
      ends = el('div.ds-ends', [
        el('span.ds-end', [caret('◀'), opts.endLabels.left]),
        el('span.spacer'),
        el('span.ds-end', [opts.endLabels.right, caret('▶')])
      ]);
    }

    return el('div.ds-strip', [
      el('div.ds-strip__head', [
        el('span.ds-strip__title', opts.title || ''),
        opts.subtitle ? el('span.ds-strip__sub', opts.subtitle) : null
      ]),
      track,
      ends
    ]);
  }
  function caret(ch) { return el('span.ds-caret', ch); }

  /* keyVal — a compact key→value / label→number row (e.g. distance table,
     rank map). rows = [{ key, val, state }]. */
  function keyVal(title, rows, opts) {
    opts = opts || {};
    return el('div.kv', [
      title ? el('div.kv__title', title) : null,
      el('div.kv__grid', rows.map(function (r) {
        return el('div.kv__cell' + (r.state ? '.' + r.state : ''), [
          el('span.kv__k', String(r.key)),
          el('span.kv__v', r.val == null ? '∞' : String(r.val))
        ]);
      }))
    ]);
  }

  /* dpArrow — the glyph pointing from a DP cell toward the neighbour it was
     derived from (↖ diagonal, ↑ up, ← left). Makes the recurrence legible. */
  function dpArrow(cur, fromList) {
    if (!cur || !fromList || !fromList.length) return '';
    const i = cur[0], j = cur[1], si = fromList[0][0], sj = fromList[0][1];
    const di = i - si, dj = j - sj;
    if (di > 0 && dj > 0) return '↖';
    if (di > 0) return '↑';
    if (dj > 0) return '←';
    return '';
  }

  /* fsm — a state-machine diagram. Reused by the FSM viz, regex engine,
     circuit breaker, observer subject, token bucket…
     opts = {
       states: [{ id, label?, x, y, accept? }],
       transitions: [{ from, to, label }],       // self-loops supported
       current: 'stateId', lastEdge: [from,to,label?],  // highlights
       width, height
     } */
  function fsm(opts) {
    const { svgEl } = global.DOM;
    const W = opts.width || 640, H = opts.height || 280, R = 26;
    const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + W + ' ' + H, width: W, style: 'max-width:100%' });
    svg.appendChild(svgEl('defs', {}, [
      svgEl('marker', { id: 'fsm-arr', markerWidth: '10', markerHeight: '10', refX: '9', refY: '3', orient: 'auto' },
        [svgEl('path', { d: 'M0,0 L0,6 L9,3 z', fill: 'var(--text-dim)' })]),
      svgEl('marker', { id: 'fsm-arr-hot', markerWidth: '10', markerHeight: '10', refX: '9', refY: '3', orient: 'auto' },
        [svgEl('path', { d: 'M0,0 L0,6 L9,3 z', fill: 'var(--warn)' })])
    ]));
    const byId = {}; (opts.states || []).forEach((s) => { byId[s.id] = s; });
    const hotKey = opts.lastEdge ? opts.lastEdge[0] + '→' + opts.lastEdge[1] + (opts.lastEdge[2] != null ? '|' + opts.lastEdge[2] : '') : null;
    // group parallel transitions to offset labels
    (opts.transitions || []).forEach(function (t) {
      const a = byId[t.from], b = byId[t.to]; if (!a || !b) return;
      const hot = hotKey && (t.from + '→' + t.to + (opts.lastEdge[2] != null ? '|' + t.label : '')) === hotKey;
      const cls = 'edge-line' + (hot ? ' is-active' : '');
      const marker = hot ? 'url(#fsm-arr-hot)' : 'url(#fsm-arr)';
      if (t.from === t.to) {           // self-loop above the state
        const d = 'M ' + (a.x - 12) + ' ' + (a.y - R + 4) +
          ' C ' + (a.x - 34) + ' ' + (a.y - R - 34) + ', ' + (a.x + 34) + ' ' + (a.y - R - 34) + ', ' + (a.x + 12) + ' ' + (a.y - R + 4);
        svg.appendChild(svgEl('path', { d: d, class: cls, fill: 'none', 'marker-end': marker }));
        svg.appendChild(svgEl('text', { x: a.x, y: a.y - R - 30, class: 'edge-weight', text: t.label || '' }));
      } else {
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        // detect reverse pair → curve
        const hasReverse = (opts.transitions || []).some((o) => o.from === t.to && o.to === t.from);
        const sx = a.x + ux * R, sy = a.y + uy * R, ex = b.x - ux * R, ey = b.y - uy * R;
        if (hasReverse) {
          const nx = -uy, ny = ux, off = 18;
          const mx = (sx + ex) / 2 + nx * off, my = (sy + ey) / 2 + ny * off;
          svg.appendChild(svgEl('path', { d: 'M ' + sx + ' ' + sy + ' Q ' + mx + ' ' + my + ' ' + ex + ' ' + ey,
            class: cls, fill: 'none', 'marker-end': marker }));
          svg.appendChild(svgEl('text', { x: mx, y: my - 4, class: 'edge-weight', text: t.label || '' }));
        } else {
          svg.appendChild(svgEl('line', { x1: sx, y1: sy, x2: ex, y2: ey, class: cls, 'marker-end': marker }));
          svg.appendChild(svgEl('text', { x: (sx + ex) / 2 + (-uy * 12), y: (sy + ey) / 2 + (ux * 12), class: 'edge-weight', text: t.label || '' }));
        }
      }
    });
    (opts.states || []).forEach(function (s) {
      const cur = s.id === opts.current;
      svg.appendChild(svgEl('circle', { cx: s.x, cy: s.y, r: R, class: 'node-circle' + (cur ? ' is-active' : '') }));
      if (s.accept) svg.appendChild(svgEl('circle', { cx: s.x, cy: s.y, r: R - 5, class: 'node-circle', style: 'fill:none' }));
      svg.appendChild(svgEl('text', { x: s.x, y: s.y, class: 'node-text' + (cur ? ' on-fill' : ''), text: s.label || String(s.id) }));
    });
    return svg;
  }

  /* lanes — N horizontal actors (threads, tx, queues) over discrete time.
     opts = {
       lanes: [{ name, cells: [{ label, state }] }],   // state: run|wait|lock|bad|ok|idle
       cursor: 3,                    // current time column
       note: 'shared: count = 1'     // optional footer
     } */
  function lanes(opts) {
    const wrap = el('div.lanes');
    const T = Math.max.apply(null, (opts.lanes || []).map((l) => l.cells.length).concat([1]));
    (opts.lanes || []).forEach(function (l) {
      const row = el('div.lane', [el('div.lane__name', l.name)]);
      for (let t = 0; t < T; t++) {
        const c = l.cells[t] || { label: '', state: 'idle' };
        row.appendChild(el('div.lane__cell.' + (c.state || 'idle') + (t === opts.cursor ? '.cursor' : ''),
          { title: c.label || '' }, c.label || ''));
      }
      wrap.appendChild(row);
    });
    if (opts.note != null) wrap.appendChild(el('div.lane__note.mono', opts.note));
    return wrap;
  }

  /* sequence — message diagram between parties (TCP, HTTP, idempotency).
     opts = {
       actors: ['Client', 'Server'],
       messages: [{ from:0, to:1, label:'SYN', state:'ok'|'drop'|'timer'|'pending' }],
       upTo: 4,        // render messages [0..upTo]
       height
     } */
  function sequence(opts) {
    const { svgEl } = global.DOM;
    const actors = opts.actors || [];
    const msgs = (opts.messages || []).slice(0, (opts.upTo == null ? (opts.messages || []).length : opts.upTo + 1));
    const W = 640, rowH = 44, top = 46;
    const H = opts.height || (top + ((opts.messages || []).length) * rowH + 20);
    const X = (i) => 90 + i * ((W - 180) / Math.max(1, actors.length - 1));
    const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + W + ' ' + H, width: W, style: 'max-width:100%' });
    // One marker per line colour, so arrowheads always match their shaft
    // (a mismatched head reads as "a triangle stuck on a line").
    svg.appendChild(svgEl('defs', {}, [
      svgEl('marker', { id: 'seq-arr', markerWidth: '9', markerHeight: '8', refX: '7.5', refY: '3', orient: 'auto' },
        [svgEl('path', { d: 'M0,0 L0,6 L7.5,3 z', fill: 'var(--accent)' })]),
      svgEl('marker', { id: 'seq-arr-hot', markerWidth: '9', markerHeight: '8', refX: '7.5', refY: '3', orient: 'auto' },
        [svgEl('path', { d: 'M0,0 L0,6 L7.5,3 z', fill: 'var(--warn)' })])
    ]));
    actors.forEach(function (a, i) {
      svg.appendChild(svgEl('rect', { x: X(i) - 46, y: 8, width: 92, height: 26, rx: 7, class: 'node-circle' }));
      svg.appendChild(svgEl('text', { x: X(i), y: 21, class: 'node-text', text: a }));
      svg.appendChild(svgEl('line', { x1: X(i), y1: 36, x2: X(i), y2: H - 8, class: 'edge-line', 'stroke-dasharray': '3 4' }));
    });
    msgs.forEach(function (m, k) {
      const y = top + k * rowH;
      const x1 = X(m.from), x2 = X(m.to);
      const last = k === msgs.length - 1;
      if (m.state === 'timer') {
        svg.appendChild(svgEl('text', { x: x1 + (m.from === 0 ? 14 : -14), y: y + 4, class: 'edge-weight',
          'text-anchor': m.from === 0 ? 'start' : 'end', style: 'fill:var(--warn)', text: '⏱ ' + (m.label || 'timeout…') }));
        return;
      }
      if (m.state === 'drop') {
        const xm = (x1 + x2) / 2;
        svg.appendChild(svgEl('line', { x1: x1, y1: y, x2: xm, y2: y + 6, class: 'edge-line is-active' }));
        svg.appendChild(svgEl('text', { x: xm + 10, y: y + 10, class: 'edge-weight', style: 'fill:var(--danger);font-weight:700', text: '✗ lost' }));
        svg.appendChild(svgEl('text', { x: (x1 + xm) / 2, y: y - 6, class: 'edge-weight', text: m.label || '' }));
        return;
      }
      // Inset the endpoints so arrowheads land beside the lifelines, not on
      // top of the dashed verticals.
      const dir = x2 > x1 ? 1 : -1;
      svg.appendChild(svgEl('line', { x1: x1 + dir * 4, y1: y, x2: x2 - dir * 8, y2: y + 10,
        class: 'edge-line' + (last ? ' is-active' : ''), style: last ? '' : 'stroke:var(--accent)',
        'marker-end': last ? 'url(#seq-arr-hot)' : 'url(#seq-arr)' }));
      svg.appendChild(svgEl('text', { x: (x1 + x2) / 2, y: y - 2, class: 'edge-weight',
        style: last ? 'fill:var(--warn);font-weight:700' : '', text: m.label || '' }));
    });
    return svg;
  }

  global.Widgets = { dsStrip: dsStrip, keyVal: keyVal, dpArrow: dpArrow, fsm: fsm, lanes: lanes, sequence: sequence };
})(window);
