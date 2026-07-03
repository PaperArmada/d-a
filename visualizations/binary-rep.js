/* Binary & two's complement — toggle bits, watch decimal change, overflow wrap. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  window.Registry.register({
    id: 'binary-rep',
    title: 'Binary & Two\'s Complement',
    category: 'The Machine',
    blurb: 'Toggle 8 bits; see why the MSB is worth −128 and how overflow wraps.',
    longDesc: 'Integers are fixed-width bit patterns. In two\'s complement the top bit counts as −128 instead ' +
      'of +128 — one trick that makes addition hardware identical for negative numbers and explains why ' +
      '127 + 1 = −128. Click bits to flip them, or step with the buttons.',
    create: function (container, params) {
      let bits = 0b00101010; // 42
      let signed = true;
      let flash = false;

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage', { style: { minHeight: '220px' } });
      const setStatus = (h) => { status.innerHTML = h; };

      function valueOf(b) {
        return signed && (b & 0x80) ? b - 256 : b;
      }
      window.__algos = window.__algos || {};
      window.__algos.twos = { valueOf: (b, s) => (s && (b & 0x80) ? b - 256 : b) };

      function render() {
        clear(stage);
        const row = el('div.cells');
        for (let i = 7; i >= 0; i--) {
          const on = (bits >> i) & 1;
          const weight = i === 7 && signed ? -128 : (1 << i);
          const cell = el('div.cell' + (on ? '.is-hit' : ''), {
            style: { minWidth: '54px', cursor: 'pointer' },
            onclick: function () { bits ^= (1 << i); flash = false; render();
              setStatus('Flipped bit ' + i + ' (weight ' + weight + ') → ' + explain()); }
          }, [el('div.cell__idx', 'bit ' + i), String(on)]);
          cell.appendChild(el('div', { style: { position: 'absolute', bottom: '-20px', fontSize: '10.5px',
            color: i === 7 && signed ? 'var(--danger)' : 'var(--text-dim)', fontFamily: 'var(--mono)' } },
            String(weight)));
          row.appendChild(cell);
        }
        stage.appendChild(row);
        const v = valueOf(bits);
        stage.appendChild(el('div', { style: { marginTop: '40px', fontFamily: 'var(--mono)', fontSize: '15px' } }, [
          el('div', [el('span.dim', 'pattern  '), el('b', bits.toString(2).padStart(8, '0'))]),
          el('div', [el('span.dim', signed ? 'two\'s complement value  ' : 'unsigned value  '),
            el('b', { style: { color: flash ? 'var(--danger)' : 'var(--accent-2)', fontSize: '22px' } }, String(v))]),
          el('div.dim', { style: { fontSize: '12.5px', marginTop: '6px' } },
            signed ? 'sum of set-bit weights, MSB counted as −128' : 'sum of set-bit weights')
        ]));
      }
      function explain() {
        const v = valueOf(bits);
        return 'pattern ' + bits.toString(2).padStart(8, '0') + ' = <b>' + v + '</b>';
      }

      function add(d) {
        const before = valueOf(bits);
        bits = (bits + d + 256) & 0xFF;
        const after = valueOf(bits);
        flash = (d > 0 && after < before) || (d < 0 && after > before);
        render();
        setStatus(flash
          ? '⚠ <b>Overflow!</b> ' + before + ' ' + (d > 0 ? '+1' : '−1') + ' wrapped to <b>' + after + '</b> — fixed width has a cliff.'
          : before + (d > 0 ? ' + 1' : ' − 1') + ' = <b>' + after + '</b>');
      }

      container.appendChild(el('div.controls', [
        el('button.btn.btn--primary', { onclick: () => add(1) }, '＋1'),
        el('button.btn.btn--primary', { onclick: () => add(-1) }, '−1'),
        el('button.btn', { onclick: function () {
          const before = valueOf(bits);
          bits = ((~bits) + 1) & 0xFF; flash = false; render();
          setStatus('Negate via <span class="mono">~x + 1</span>: ' + before + ' → <b>' + valueOf(bits) + '</b> (flip all bits, add one)');
        } }, '± negate (~x+1)'),
        el('div.control-group', [el('label', 'signed'),
          (function () { const c = el('input', { type: 'checkbox', checked: signed });
            c.addEventListener('change', function () { signed = c.checked; flash = false; render();
              setStatus(signed ? 'Two\'s complement: MSB now weighs −128 — same bits, new meaning.' : 'Unsigned: MSB weighs +128.'); });
            return c; })()]),
        el('span.spacer'),
        el('button.btn', { onclick: function () { bits = 0x7F; flash = false; render(); setStatus('127 loaded — now press ＋1.'); } }, 'Load 127'),
        el('button.btn.btn--ghost', { onclick: function () { bits = 0; flash = false; render(); setStatus('zeroed'); } }, '0')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Range (8-bit signed): '), '−128 … 127']),
        el('span.pill', [el('b', 'Negate: '), '~x + 1']),
        el('span.pill', [el('b', 'Why: '), 'one adder circuit serves + and −'])
      ]));
      render();
      setStatus('Click bits to flip them. Try <b>Load 127</b> then <b>＋1</b> to fall off the cliff.');
      return {};
    }
  });
})();
