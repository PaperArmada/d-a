/* Invariants & assertions — a live checker guards the BST ordering property. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;
  const Util = window.Util;

  window.Registry.register({
    id: 'invariants',
    title: 'Invariants & Assertions',
    category: 'Craft',
    blurb: 'A property that must ALWAYS hold — and the assertion that catches lies.',
    madeOf: ['bst'],
    longDesc: 'An invariant is a property your data structure promises at all times — a BST promises ' +
      'inorder = sorted. Assertions check it after every mutation, so corruption is caught where it ' +
      'HAPPENS, not 500 lines later where it explodes. Mutate safely, then corrupt a node and watch the ' +
      'checker point at the exact violation.',
    create: function (container) {
      let tree;
      function reset() { tree = { v: 50, l: { v: 30, l: { v: 20 }, r: { v: 40 } }, r: { v: 70, l: { v: 60 }, r: { v: 80 } } }; }
      reset();
      let corrupted = null;

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage.svg-stage');
      const setStatus = (h) => { status.innerHTML = h; };

      function inorder(n, out) { if (!n) return out; inorder(n.l, out); out.push(n); inorder(n.r, out); return out; }
      function checkInvariant() {
        const seq = inorder(tree, []);
        for (let i = 1; i < seq.length; i++) if (seq[i - 1].v >= seq[i].v) return { ok: false, at: seq[i - 1], seq };
        return { ok: true, seq };
      }

      function render(violator) {
        clear(stage);
        const nodes = inorder(tree, []);
        let i = 0, maxD = 0;
        (function depth(n, d) { if (!n) return; maxD = Math.max(maxD, d); depth(n.l, d + 1); n._d = d; n._x = i++; depth(n.r, d + 1); })(tree, 0);
        // fix _x assignment: recompute inorder positions properly
        i = 0; (function pos(n) { if (!n) return; pos(n.l); n._x = i++; pos(n.r); })(tree);
        const COLW = 66, ROWH = 70, R = 20, PAD = 26;
        const W = Math.max(520, PAD * 2 + nodes.length * COLW), H = PAD * 2 + (maxD + 1) * ROWH - 20;
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + W + ' ' + H, width: W });
        const X = (n) => PAD + R + n._x * COLW, Y = (n) => PAD + R + n._d * ROWH;
        (function edges(n) { if (!n) return; [n.l, n.r].forEach((k) => { if (k) { svg.appendChild(svgEl('line', { x1: X(n), y1: Y(n), x2: X(k), y2: Y(k), class: 'edge-line' })); edges(k); } }); })(tree);
        nodes.forEach(function (n) {
          const bad = violator && (n === violator);
          svg.appendChild(svgEl('circle', { cx: X(n), cy: Y(n), r: R,
            class: 'node-circle' + (bad ? ' is-active' : n === corrupted ? ' is-frontier' : '') ,
            style: bad ? 'stroke:var(--danger);stroke-width:4' : '' }));
          svg.appendChild(svgEl('text', { x: X(n), y: Y(n), class: 'node-text' + (bad || n === corrupted ? ' on-fill' : ''), text: String(n.v) }));
        });
        stage.appendChild(svg);
        const chk = checkInvariant();
        stage.appendChild(el('div.lane__note.mono', { style: { color: chk.ok ? 'var(--good)' : 'var(--danger)' } },
          'assert(inorder is strictly increasing)  →  ' + (chk.ok ? 'PASS: ' : 'FAIL: ') + chk.seq.map((n) => n.v).join(' ≤ ')));
      }

      function assertNow(afterWhat) {
        const chk = checkInvariant();
        if (chk.ok) { render(); setStatus(afterWhat + ' — assertion <b style="color:var(--good)">passed</b>: inorder still sorted.'); }
        else {
          render(chk.at);
          setStatus(afterWhat + ' — assertion <b style="color:var(--danger)">FAILED</b> at node <b>' + chk.at.v +
            '</b>: it is ≥ its inorder successor. The bug is caught HERE, at the mutation, with the culprit named.');
        }
      }

      container.appendChild(el('div.controls', [
        el('button.btn.btn--primary', { onclick: function () {
          const v = Util.randInt(1, 99);
          (function ins(n) { if (v < n.v) { n.l ? ins(n.l) : n.l = { v: v }; } else if (v > n.v) { n.r ? ins(n.r) : n.r = { v: v }; } })(tree);
          corrupted = null; assertNow('Proper insert(' + v + ')');
        } }, '➕ Valid insert'),
        el('button.btn', { onclick: function () {
          // simulate a buggy mutation: overwrite a left-subtree node with a huge value
          const seq = inorder(tree, []);
          const victim = seq[Util.randInt(0, Math.floor(seq.length / 2))];
          victim.v = 95 + Util.randInt(0, 4);
          corrupted = victim;
          assertNow('Buggy write set a node to ' + victim.v);
        } }, '🐛 Corrupt a node'),
        el('span.spacer'),
        el('button.btn.btn--ghost', { onclick: function () { reset(); corrupted = null; render(); setStatus('restored a valid BST'); } }, '↺ Restore')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Assertion: '), 'executable documentation']),
        el('span.pill', [el('b', 'Fails: '), 'at the cause, not the symptom']),
        el('span.pill', [el('b', 'In the wild: '), 'assert() · database constraints · type checkers'])
      ]));
      container.appendChild(el('p.hint',
        'Once you see the move, it\'s everywhere: the heap property, loop invariants in proofs, foreign-key ' +
        'constraints — declare what must always be true, then let any violation announce itself immediately.'));
      render();
      setStatus('The invariant holds. Now press 🐛 and watch the checker name the culprit.');
      return {};
    }
  });
})();
