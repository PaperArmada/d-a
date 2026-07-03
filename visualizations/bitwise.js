/* Bitwise operations — column-wise AND/OR/XOR, shifts, and the flags recipe. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;
  const Util = window.Util;

  window.Registry.register({
    id: 'bitwise',
    title: 'Bitwise Operations',
    category: 'The Machine',
    blurb: 'AND masks, OR sets, XOR toggles, shifts multiply — column by column.',
    madeOf: ['binary-rep'],
    longDesc: 'Bitwise ops work each column independently — that\'s why they\'re single-cycle fast. ' +
      'AND with a mask extracts bits, OR sets flags, XOR toggles them, and shifting is ×2/÷2. Click any ' +
      'bit of A or B; the result recomputes live.',
    create: function (container) {
      let A = 0b11001010, B = 0b10110100, op = '&';
      const OPS = {
        '&': { name: 'AND', fn: (a, b) => a & b, use: 'masking: keep only the bits where the mask is 1' },
        '|': { name: 'OR', fn: (a, b) => a | b, use: 'setting: turn flags on without touching others' },
        '^': { name: 'XOR', fn: (a, b) => a ^ b, use: 'toggling: flip exactly the masked bits; x^x=0' },
        '<<': { name: 'SHL', fn: (a) => (a << 1) & 0xFF, use: 'shift left = ×2 (bits fall off the top)' },
        '>>': { name: 'SHR', fn: (a) => a >> 1, use: 'shift right = ÷2 (integer)' }
      };

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage', { style: { minHeight: '240px' } });
      const setStatus = (h) => { status.innerHTML = h; };
      const unary = () => op === '<<' || op === '>>';

      function bitRow(label, val, clickable, onFlip, hiCols) {
        const row = el('div', { style: { display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '6px' } });
        row.appendChild(el('span.mono.dim', { style: { minWidth: '64px', textAlign: 'right', paddingRight: '6px' } }, label));
        for (let i = 7; i >= 0; i--) {
          const on = (val >> i) & 1;
          row.appendChild(el('div.cell' + (on ? (hiCols ? '.is-hit' : '.is-active') : ''), {
            style: { minWidth: '38px', height: '38px', cursor: clickable ? 'pointer' : 'default' },
            onclick: clickable ? function () { onFlip(i); } : null
          }, String(on)));
        }
        row.appendChild(el('span.mono.dim', { style: { paddingLeft: '8px', fontSize: '12px' } }, '= ' + val));
        return row;
      }

      function render() {
        clear(stage);
        const res = unary() ? OPS[op].fn(A) : OPS[op].fn(A, B);
        stage.appendChild(bitRow('A', A, true, (i) => { A ^= (1 << i); render(); }));
        if (!unary()) stage.appendChild(bitRow('B ' + op, B, true, (i) => { B ^= (1 << i); render(); }));
        else stage.appendChild(el('div.mono.dim', { style: { margin: '4px 0 6px 70px' } }, 'A ' + op + ' 1'));
        stage.appendChild(el('div', { style: { borderTop: '2px solid var(--border)', margin: '4px 0 8px', width: '460px' } }));
        stage.appendChild(bitRow(OPS[op].name, res, false, null, true));
        stage.appendChild(el('p.hint', OPS[op].use + '.'));
      }

      const sel = el('select');
      Object.keys(OPS).forEach((k) => sel.appendChild(el('option', { value: k, selected: k === op }, OPS[k].name + '  (' + k + ')')));
      sel.addEventListener('change', function () { op = sel.value; render(); setStatus(OPS[op].use + '.'); });

      container.appendChild(el('div.controls', [
        el('div.control-group', [el('label', 'op'), sel]),
        el('span.spacer'),
        el('button.btn', { onclick: function () {
          op = '&'; sel.value = '&'; B = 0b00001111; render();
          setStatus('The classic mask 0x0F: AND keeps only the low nibble of A. This is how you unpack fields from packed bytes.');
        } }, '🎭 Mask low nibble'),
        el('button.btn', { onclick: function () {
          op = '^'; sel.value = '^'; B = A; render();
          setStatus('x ^ x = 0 — XOR with itself always zeroes. (And x ^ y ^ y = x: reversible, the heart of many tricks.)');
        } }, 'x ^ x'),
        el('button.btn', { onclick: function () { A = Util.randInt(0, 255); B = Util.randInt(0, 255); render(); setStatus('random operands'); } }, '🎲')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Cost: '), '1 cycle, no loops']),
        el('span.pill', [el('b', 'Flags: '), 'READ=1 WRITE=2 EXEC=4 · perms = R|W']),
        el('span.pill', [el('b', 'Check: '), '(perms & W) != 0'])
      ]));
      render();
      setStatus('Click bits in A or B — the result row recomputes column-by-column.');
      return {};
    }
  });
})();
