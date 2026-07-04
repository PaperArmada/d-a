/* IEEE-754 float anatomy — why 0.1 + 0.2 ≠ 0.3. Sign/exponent/mantissa bits,
   clickable, with the exactly-stored value shown in full. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  function bitsOf(x) {
    const buf = new ArrayBuffer(4); new Float32Array(buf)[0] = x;
    return new Uint32Array(buf)[0] >>> 0;
  }
  function floatOf(bits) {
    const buf = new ArrayBuffer(4); new Uint32Array(buf)[0] = bits >>> 0;
    return new Float32Array(buf)[0];
  }
  window.__algos = window.__algos || {};
  window.__algos.f32 = { bitsOf, floatOf };

  window.Registry.register({
    id: 'float-rep',
    title: 'Floating Point (IEEE-754)',
    category: 'The Machine',
    blurb: 'Sign · exponent · mantissa — and the real reason 0.1 + 0.2 ≠ 0.3.',
    longDesc: 'A 32-bit float is scientific notation in binary: sign × 1.mantissa × 2^(exponent−127). Most ' +
      'decimals (like 0.1) have no finite binary expansion, so the nearest representable value is stored ' +
      'instead — the tiny error is there from the start, not created by the addition. Type a number, click ' +
      'bits, and read the exactly-stored value.',
    create: function (container, params) {
      let bits = bitsOf(0.1);

      const inp = el('input.field', { type: 'text', value: '0.1', style: { width: '110px' } });
      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage', { style: { minHeight: '250px' } });
      const setStatus = (h) => { status.innerHTML = h; };

      function seg(i) { return i === 31 ? 'sign' : i >= 23 ? 'exp' : 'man'; }
      const COLORS = { sign: 'var(--danger)', exp: 'var(--warn)', man: 'var(--accent)' };

      function render() {
        clear(stage);
        const row = el('div', { style: { display: 'flex', gap: '2px', flexWrap: 'wrap' } });
        for (let i = 31; i >= 0; i--) {
          const on = (bits >>> i) & 1;
          const s = seg(i);
          row.appendChild(el('div', {
            style: {
              width: '19px', height: '30px', borderRadius: '4px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '700',
              background: on ? COLORS[s] : 'var(--panel-2)',
              color: on ? '#0b0e1a' : 'var(--text-dim)',
              border: '1px solid ' + (on ? COLORS[s] : 'var(--border)')
            },
            title: s + ' bit ' + i,
            onclick: function () { bits = (bits ^ (1 << i)) >>> 0; render(); setStatus('Flipped a ' + s + ' bit.'); }
          }, String(on)));
        }
        stage.appendChild(row);
        stage.appendChild(el('div.legend', [
          el('span', [el('span.swatch', { style: { background: COLORS.sign } }), 'sign (1)']),
          el('span', [el('span.swatch', { style: { background: COLORS.exp } }), 'exponent (8)']),
          el('span', [el('span.swatch', { style: { background: COLORS.man } }), 'mantissa (23)'])
        ]));
        const sign = (bits >>> 31) & 1, expRaw = (bits >>> 23) & 0xFF, man = bits & 0x7FFFFF;
        const v = floatOf(bits);
        const lines = [
          ['sign', sign ? '1 (negative)' : '0 (positive)'],
          ['exponent', expRaw + ' − 127 bias = ' + (expRaw - 127)],
          ['mantissa', '1.' + man.toString(2).padStart(23, '0').slice(0, 12) + '…₂'],
          ['stored value (exact)', typeof v === 'number' ? v.toPrecision(21).replace(/0+$/, '') : String(v)]
        ];
        stage.appendChild(el('div', { style: { marginTop: '14px', fontFamily: 'var(--mono)', fontSize: '13.5px' } },
          lines.map((l) => el('div', { style: { margin: '3px 0' } }, [el('span.dim', l[0] + ':  '), el('b', String(l[1]))]))));
      }

      function load(x, note) {
        bits = bitsOf(x); render();
        const v = floatOf(bits);
        const err = Math.abs(v - x);
        setStatus(note || ('You typed <b>' + x + '</b>; the float actually stores <b>' + v.toPrecision(12) + '</b>' +
          (err > 0 ? ' — off by ~' + err.toExponential(2) + ' before you ever compute with it.' : ' — exactly.')));
      }

      container.appendChild(el('div.controls', [
        inp,
        el('button.btn.btn--primary', { onclick: function () { const x = parseFloat(inp.value); if (!isNaN(x)) load(x); } }, 'Encode'),
        el('span.spacer'),
        el('button.btn', { onclick: function () { inp.value = '0.1'; load(0.1); } }, '0.1'),
        el('button.btn', { onclick: function () {
          inp.value = '0.3'; bits = bitsOf(0.1 + 0.2); render();
          setStatus('<b>0.1 + 0.2</b> stored: <b>' + floatOf(bits).toPrecision(12) + '</b> — compare with encoding 0.3 directly. ' +
            'Neither operand was exact, so their sum can\'t be either.');
        } }, '0.1 + 0.2'),
        el('button.btn', { onclick: function () { inp.value = '16777217'; load(16777217,
          'Integers above 2²⁴ don\'t all fit in a 23-bit mantissa: <b>16777217</b> stores as <b>' + floatOf(bitsOf(16777217)) + '</b>.'); } }, '2²⁴+1'),
        el('button.btn', { onclick: function () { inp.value = '∞'; load(Infinity, 'All exponent bits set, mantissa 0 → <b>Infinity</b>.'); } }, '∞'),
        el('button.btn.btn--ghost', { onclick: function () { inp.value = '1'; load(1, '1.0 is exact: exponent 127 (=2⁰), mantissa all zeros.'); } }, '1.0')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Layout: '), '1 + 8 + 23 bits']),
        el('span.pill', [el('b', 'Value: '), '± 1.mantissa × 2^(exp−127)'])
      ]));
      container.appendChild(el('p.hint',
        'The famous 0.1 + 0.2 surprise is not an arithmetic bug — the error already exists at parse time. ' +
        '0.1 simply has no exact binary form, the same way ⅓ has no exact decimal one.'));
      load(0.1);
      return {};
    }
  });
})();
