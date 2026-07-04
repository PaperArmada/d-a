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
    create: function (container, params) {
      let list = (params && params.vals) ? Util.parseList(params.vals, null) : null;
      if (!list) list = [4, 9, 1, 7];

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
        const rev = opts.rev != null ? opts.rev : -1;   // first `rev` nodes have flipped pointers
        const width = Math.max(560, PAD * 2 + total * NW + (total) * GAP + 60);
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + width + ' 180', width: width });
        // defs arrow
        const defs = svgEl('defs', {}, [
          svgEl('marker', { id: 'arrow', markerWidth: '10', markerHeight: '10', refX: '8', refY: '3', orient: 'auto', markerUnits: 'strokeWidth' },
            [svgEl('path', { d: 'M0,0 L0,6 L9,3 z', fill: 'var(--text-dim)' })])
        ]);
        svg.appendChild(defs);

        // head label (during a reversal, the head is about to become the far end)
        svg.appendChild(svgEl('text', { x: PAD, y: TOP - 22, class: 'edge-weight', 'text-anchor': 'start',
          text: rev >= 0 ? 'old head' : 'head' }));

        const X = (i) => PAD + i * (NW + GAP);
        list.forEach(function (v, i) {
          const x = X(i);
          const flipped = rev >= 0 && i < rev;
          const isCur = rev >= 0 && i === rev;
          const cls = 'node-circle' +
            (i === opts.active || isCur ? ' is-active' : '') +
            (i === opts.hit ? ' is-done' : '') +
            (flipped ? ' is-path' : '') +
            (i === opts.remove ? ' is-active' : '') +
            (i === opts.isNew ? ' is-visit' : '');
          svg.appendChild(svgEl('rect', { x: x, y: TOP, width: NW, height: H, rx: 8, class: cls }));
          svg.appendChild(svgEl('line', { x1: x + NW * 0.66, y1: TOP, x2: x + NW * 0.66, y2: TOP + H, class: 'edge-line' }));
          svg.appendChild(svgEl('text', { x: x + NW * 0.33, y: TOP + H / 2,
            class: 'node-text' + (i === opts.active || i === opts.hit || i === opts.isNew || flipped || isCur ? ' on-fill' : ''), text: String(v) }));
          // prev / cur cursors during a reversal
          if (rev >= 0 && i === rev - 1) svg.appendChild(svgEl('text', { x: x + NW / 2, y: TOP - 8, class: 'edge-weight', text: 'prev' }));
          if (isCur) svg.appendChild(svgEl('text', { x: x + NW / 2, y: TOP - 8, class: 'edge-weight', text: 'cur' }));

          const ay = TOP + H / 2;
          if (flipped) {
            // next now points BACKWARDS (the flipped part of a reversal)
            if (i === 0) {
              svg.appendChild(svgEl('line', { x1: x, y1: ay, x2: x - GAP + 32, y2: ay, class: 'edge-line is-path', 'marker-end': 'url(#arrow)' }));
              svg.appendChild(svgEl('text', { x: x - GAP + 20, y: ay + 4, class: 'edge-weight', text: '∅' }));
            } else {
              svg.appendChild(svgEl('line', { x1: x, y1: ay, x2: X(i - 1) + NW + 4, y2: ay, class: 'edge-line is-path', 'marker-end': 'url(#arrow)' }));
            }
          } else {
            const ax = x + NW;
            svg.appendChild(svgEl('line', { x1: ax, y1: ay, x2: ax + GAP - 4, y2: ay, class: 'edge-line', 'marker-end': 'url(#arrow)' }));
            if (i === total - 1) svg.appendChild(svgEl('text', { x: ax + GAP + 12, y: ay + 4, class: 'edge-weight', text: '∅' }));
          }
          // delete: the relink arc jumping over the doomed node
          if (opts.bypass === i && total > 1) {
            const fromX = i > 0 ? X(i - 1) + NW : PAD;               // prev node (or head)
            const toX = i < total - 1 ? X(i + 1) : x + NW + GAP - 4; // next node (or ∅)
            svg.appendChild(svgEl('path', {
              d: 'M ' + fromX + ' ' + (TOP + 6) + ' C ' + (fromX + 20) + ' ' + (TOP - 26) + ', ' + (toX - 20) + ' ' + (TOP - 26) + ', ' + toX + ' ' + (TOP + 6),
              class: 'edge-line is-path', fill: 'none', 'marker-end': 'url(#arrow)'
            }));
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
          setStatus('Following next pointers… node ' + i + ' holds ' + list[i] +
            (i > 0 ? ' (no shortcut — we can only get here through node ' + (i - 1) + ')' : ''));
          if (String(list[i]) === String(target)) { render({ hit: i }); done(i); return; }
          i++;
          setTimeout(step, 500);
        })();
      }

      // In-place reversal: walk once, flipping each next pointer backwards.
      // The nodes never move — watch only the arrows change direction.
      let reversing = false;
      function animateReverse() {
        if (reversing || list.length < 2) return;
        reversing = true;
        hiLine(3);
        let k = 0;
        (function step() {
          if (k > list.length) {
            list.reverse(); render(); reversing = false;
            setStatus('Reversed in place — n pointer flips, zero data moved. The old tail is the new head.');
            return;
          }
          render({ rev: k });
          setStatus(k === 0
            ? 'reverse(): prev = ∅, cur = head. At each node: flip its next to point at prev, then step forward.'
            : k < list.length
              ? 'Flip: node with ' + list[k - 1] + ' now points backwards. cur moves on — its old next was saved first.'
              : 'Every arrow is flipped; head now belongs at the far end.');
          k++;
          setTimeout(step, 650);
        })();
      }

      // Pseudocode panel — each operation lights up its line.
      const CODE = [
        'insertHead(v): n = node(v); n.next = head; head = n   # O(1), two pointer writes',
        'search(x):     cur = head; walk next until value == x # O(n), no shortcuts',
        'delete(x):     find prev; prev.next = cur.next        # O(n) find, O(1) relink',
        'reverse():     at each node, flip next to point back  # O(n), nothing moves'
      ];
      const codePanel = el('div.code-panel', { 'aria-label': 'pseudocode' });
      const codeLines = CODE.map(function (line, i) {
        const ln = el('div.code-line', [el('span.code-gutter', String(i + 1)), el('span.code-text', line)]);
        codePanel.appendChild(ln);
        return ln;
      });
      function hiLine(i) { codeLines.forEach((ln, k) => ln.classList.toggle('active', k === i)); }

      const controls = el('div.controls', [
        input,
        el('button.btn.btn--primary', { onclick: function () {
          const v = input.value.trim(); if (v === '') return;
          list.unshift(v); render({ isNew: 0 }); hiLine(0);
          setStatus('insertHead(<b>' + v + '</b>): new node\'s next → old head, then head → new node. ' +
            'Two writes, O(1) — an array would shift every element right.');
          input.value = String(Util.randInt(1, 99));
        } }, '⬅ Insert head'),
        el('button.btn', { onclick: function () {
          const v = input.value.trim(); if (v === '') return;
          list.push(v); render({ isNew: list.length - 1 }); hiLine(0);
          setStatus('insertTail(<b>' + v + '</b>) — without a tail pointer this costs an O(n) walk to the end first.');
          input.value = String(Util.randInt(1, 99));
        } }, 'Insert tail ➡'),
        el('div.control-group', [el('label', 'at'), idx,
          el('button.btn', { onclick: function () {
            const v = input.value.trim(); let p = parseInt(idx.value, 10) || 0;
            p = Math.max(0, Math.min(p, list.length));
            list.splice(p, 0, v); render({ isNew: p }); hiLine(0);
            setStatus('insertAt(' + p + ', <b>' + v + '</b>): walk to node ' + Math.max(0, p - 1) + ', then splice with two pointer writes.');
          } }, 'Insert at')]),
        el('span.spacer'),
        el('button.btn', { onclick: function () {
          const t = input.value.trim(); hiLine(1);
          animateWalk(t, function (found) {
            setStatus(found >= 0 ? '✓ Found <b>' + t + '</b> at index ' + found + ' — after visiting ' + (found + 1) + ' node(s). No binary search here: you can\'t jump to the middle of a chain.'
                                 : '✗ <b>' + t + '</b> not in list — walked the whole chain to be sure.');
          });
        } }, '🔍 Search'),
        el('button.btn', { onclick: function () {
          const t = input.value.trim(); hiLine(2);
          animateWalk(t, function (found) {
            if (found < 0) { setStatus('✗ ' + t + ' not found — nothing deleted'); return; }
            render({ remove: found, bypass: found });
            setStatus('Relink: ' + (found === 0 ? 'head' : 'node ' + (found - 1) + '\'s next') + ' jumps over the node (teal arc). ' +
              'One pointer write — the node is simply no longer reachable.');
            setTimeout(function () { list.splice(found, 1); render(); setStatus('Deleted <b>' + t + '</b>. Nothing shifted — the chain just closed around the gap.'); }, 900);
          });
        } }, '❌ Delete'),
        el('button.btn', { onclick: animateReverse }, '🔁 Reverse'),
        window.Share.button(function () { return { id: 'linked-list', params: { vals: list.join(',') } }; },
          function () { setStatus('🔗 Link copied — reproduces this list.'); }),
        el('button.btn.btn--ghost', { onclick: function () { list = []; render(); setStatus('cleared'); } }, '🗑 Clear')
      ]);

      container.appendChild(controls);
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(codePanel);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Head insert: '), 'O(1)']),
        el('span.pill', [el('b', 'Search: '), 'O(n)']),
        el('span.pill', [el('b', 'Delete: '), 'O(n) find + O(1) relink']),
        el('span.pill', [el('b', 'Space: '), 'O(n)'])
      ]));
      container.appendChild(el('p.hint',
        'The nodes never move — only arrows change. That\'s the whole trade-off: a node can live anywhere ' +
        'in memory, so inserting or deleting is just rewiring pointers (O(1) once you\'re there), but there\'s ' +
        'no jumping to index i like an array, and every visit is a pointer chase. Try 🔁 Reverse and watch ' +
        'the arrows flip one by one while every node stays put.'));
      render();
      setStatus('Singly linked list. Each node points to the next; the last points to ∅. Every operation below narrates its pointer moves.');
      return {};
    }
  });
})();
