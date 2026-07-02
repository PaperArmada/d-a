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

  global.Widgets = { dsStrip: dsStrip, keyVal: keyVal };
})(window);
