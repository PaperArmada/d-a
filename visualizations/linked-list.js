/* Singly linked list — interactive insert/delete/search with SVG rendering. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;
  const Util = window.Util;

  window.Registry.register({
    id: 'linked-list',
    title: 'Linked List',
    category: 'Data Structures',
    blurb: 'Nodes linked by pointers. O(1) head insert, O(n) search.',
    longDesc: 'A singly linked list stores each value in a node that points to the next. ' +
      'Insertion at the head is O(1); finding or deleting a value requires walking the chain.',
    create: function (container) {
      let list = [4, 9, 1, 7];

      const input = el('input.field', { type: 'text', value: String(Util.randInt(1, 99)), style: { width: '80px' } });
      const idx = el('input', { type: 'number', min: '0', value: '0', title: 'index' });
      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage.svg-stage', { style: { minHeight: '220px' } });

      function setStatus(h) { status.innerHTML = h; }

      function render(opts) {
        opts = opts || {};
        clear(stage);
        const NW = 62, GAP = 46, H = 46, PAD = 20, TOP = 70;
        const total = list.length;
        const width = Math.max(560, PAD * 2 + total * NW + (total) * GAP + 60);
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + width + ' 180', width: width });
        // defs arrow
        const defs = svgEl('defs', {}, [
          svgEl('marker', { id: 'arrow', markerWidth: '10', markerHeight: '10', refX: '8', refY: '3', orient: 'auto', markerUnits: 'strokeWidth' },
            [svgEl('path', { d: 'M0,0 L0,6 L9,3 z', fill: 'var(--text-dim)' })])
        ]);
        svg.appendChild(defs);

        // head label
        svg.appendChild(svgEl('text', { x: PAD, y: TOP - 22, class: 'edge-weight', 'text-anchor': 'start', text: 'head' }));

        list.forEach(function (v, i) {
          const x = PAD + i * (NW + GAP);
          const cls = 'node-circle' +
            (i === opts.active ? ' is-active' : '') +
            (i === opts.hit ? ' is-done' : '') +
            (i === opts.remove ? ' is-active' : '') +
            (i === opts.isNew ? ' is-visit' : '');
          // node box
          svg.appendChild(svgEl('rect', { x: x, y: TOP, width: NW, height: H, rx: 8, class: cls }));
          svg.appendChild(svgEl('line', { x1: x + NW * 0.66, y1: TOP, x2: x + NW * 0.66, y2: TOP + H, class: 'edge-line' }));
          svg.appendChild(svgEl('text', { x: x + NW * 0.33, y: TOP + H / 2,
            class: 'node-text' + (i === opts.active || i === opts.hit || i === opts.isNew ? ' on-fill' : ''), text: String(v) }));
          // next pointer arrow
          const ax = x + NW, ay = TOP + H / 2;
          if (i < total - 1) {
            svg.appendChild(svgEl('line', { x1: ax, y1: ay, x2: ax + GAP - 4, y2: ay, class: 'edge-line', 'marker-end': 'url(#arrow)' }));
          } else {
            // null terminator
            svg.appendChild(svgEl('line', { x1: ax, y1: ay, x2: ax + GAP - 4, y2: ay, class: 'edge-line', 'marker-end': 'url(#arrow)' }));
            svg.appendChild(svgEl('text', { x: ax + GAP + 12, y: ay + 4, class: 'edge-weight', text: '∅' }));
          }
        });
        if (!total) svg.appendChild(svgEl('text', { x: PAD + 40, y: TOP + 25, class: 'edge-weight', text: 'empty list (head → ∅)' }));
        stage.appendChild(svg);
      }

      function animateWalk(target, done) {
        let i = 0;
        (function step() {
          if (i >= list.length) { render(); done(-1); return; }
          render({ active: i });
          setStatus('Walking… node ' + i + ' = ' + list[i]);
          if (String(list[i]) === String(target)) { render({ hit: i }); done(i); return; }
          i++;
          setTimeout(step, 500);
        })();
      }

      const controls = el('div.controls', [
        input,
        el('button.btn.btn--primary', { onclick: function () {
          const v = input.value.trim(); if (v === '') return;
          list.unshift(v); render({ isNew: 0 }); setStatus('insertHead(<b>' + v + '</b>) — O(1)');
          input.value = String(Util.randInt(1, 99));
        } }, '⬅ Insert head'),
        el('button.btn', { onclick: function () {
          const v = input.value.trim(); if (v === '') return;
          list.push(v); render({ isNew: list.length - 1 }); setStatus('insertTail(<b>' + v + '</b>) — O(n) walk to end');
          input.value = String(Util.randInt(1, 99));
        } }, 'Insert tail ➡'),
        el('div.control-group', [el('label', 'at'), idx,
          el('button.btn', { onclick: function () {
            const v = input.value.trim(); let p = parseInt(idx.value, 10) || 0;
            p = Math.max(0, Math.min(p, list.length));
            list.splice(p, 0, v); render({ isNew: p }); setStatus('insertAt(' + p + ', <b>' + v + '</b>)');
          } }, 'Insert at')]),
        el('span.spacer'),
        el('button.btn', { onclick: function () {
          const t = input.value.trim();
          animateWalk(t, function (found) {
            setStatus(found >= 0 ? '✓ Found <b>' + t + '</b> at index ' + found : '✗ <b>' + t + '</b> not in list');
          });
        } }, '🔍 Search'),
        el('button.btn', { onclick: function () {
          const t = input.value.trim();
          animateWalk(t, function (found) {
            if (found < 0) { setStatus('✗ ' + t + ' not found — nothing deleted'); return; }
            render({ remove: found }); setStatus('Deleting node ' + found + ' — relink prev → next');
            setTimeout(function () { list.splice(found, 1); render(); setStatus('Deleted <b>' + t + '</b>'); }, 450);
          });
        } }, '❌ Delete'),
        el('button.btn.btn--ghost', { onclick: function () { list = []; render(); setStatus('cleared'); } }, '🗑 Clear')
      ]);

      container.appendChild(controls);
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Head insert: '), 'O(1)']),
        el('span.pill', [el('b', 'Search: '), 'O(n)']),
        el('span.pill', [el('b', 'Delete: '), 'O(n)']),
        el('span.pill', [el('b', 'Space: '), 'O(n)'])
      ]));
      render();
      setStatus('Singly linked list. Each node points to the next; the last points to ∅.');
      return {};
    }
  });
})();
