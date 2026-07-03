/* UTF-8 — text → code points → bytes. Why length() lies. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  function utf8Bytes(cp) {
    if (cp < 0x80) return [cp];
    if (cp < 0x800) return [0xC0 | (cp >> 6), 0x80 | (cp & 63)];
    if (cp < 0x10000) return [0xE0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
    return [0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
  }
  window.__algos = window.__algos || {};
  window.__algos.utf8 = { utf8Bytes };

  window.Registry.register({
    id: 'utf8',
    title: 'Character Encoding (UTF-8)',
    category: 'The Machine',
    blurb: 'One "character" can be 1–4 bytes — or even two code points.',
    longDesc: 'Text is numbers all the way down: characters map to Unicode code points, and UTF-8 packs ' +
      'each code point into 1–4 bytes (ASCII stays 1 byte — that\'s the genius). Type text and read the ' +
      'byte stream; then try the é-vs-é preset where two identical-looking strings differ.',
    create: function (container) {
      const inp = el('input.field', { type: 'text', value: 'héllo 🚀', style: { width: '190px' } });
      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage', { style: { minHeight: '230px' } });
      const setStatus = (h) => { status.innerHTML = h; };

      function render(str) {
        clear(stage);
        let byteCount = 0, cpCount = 0;
        const rows = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });
        for (const ch of str) {                    // iterates code points
          const cp = ch.codePointAt(0);
          const bytes = utf8Bytes(cp);
          byteCount += bytes.length; cpCount++;
          const row = el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } });
          row.appendChild(el('div.cell', { style: { minWidth: '46px', fontSize: '18px' } }, ch === ' ' ? '␣' : ch));
          row.appendChild(el('span.mono.dim', { style: { minWidth: '86px', fontSize: '12px' } }, 'U+' + cp.toString(16).toUpperCase().padStart(4, '0')));
          bytes.forEach(function (b, i) {
            row.appendChild(el('div.cell' + (bytes.length > 1 ? (i === 0 ? '.is-active' : '.is-hit') : ''),
              { style: { minWidth: '78px', height: '36px', fontSize: '11.5px' } }, b.toString(2).padStart(8, '0')));
          });
          if (bytes.length > 1) row.appendChild(el('span.dim', { style: { fontSize: '11px' } },
            bytes.length + ' bytes — lead byte declares the length, continuation bytes start 10…'));
          rows.appendChild(row);
        }
        stage.appendChild(rows);
        stage.appendChild(el('div.stats', { style: { marginTop: '14px' } }, [
          el('span.stat', ['Code points: ', el('b', String(cpCount))]),
          el('span.stat', ['UTF-8 bytes: ', el('b', String(byteCount))]),
          el('span.stat', ['JS .length (UTF-16 units): ', el('b', String(str.length))])
        ]));
      }

      container.appendChild(el('div.controls', [
        inp,
        el('button.btn.btn--primary', { onclick: function () { render(inp.value || 'hi'); setStatus('Three different "lengths" for the same text — know which one you\'re asking for.'); } }, 'Encode'),
        el('span.spacer'),
        el('button.btn', { onclick: function () {
          inp.value = 'é vs é'; render(inp.value);
          setStatus('Both render as é — but one is a single code point (U+00E9), the other is e + combining accent (two!). ' +
            'This is why string comparison needs normalization.');
        } }, 'é vs é'),
        el('button.btn', { onclick: function () { inp.value = 'ASCII only'; render(inp.value); setStatus('Pure ASCII: every code point fits one byte — UTF-8 is a strict superset of ASCII.'); } }, 'ASCII'),
        el('button.btn', { onclick: function () { inp.value = '🚀'; render(inp.value); setStatus('One rocket: 1 code point, 4 UTF-8 bytes, and .length says 2 (a UTF-16 surrogate pair). Three honest answers to "how long".'); } }, '🚀')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'ASCII: '), '1 byte, unchanged']),
        el('span.pill', [el('b', 'Most scripts: '), '2–3 bytes']),
        el('span.pill', [el('b', 'Emoji: '), '4 bytes'])
      ]));
      render(inp.value);
      setStatus('Each row: character → code point → UTF-8 bytes. Lead bytes (yellow) declare how many follow.');
      return {};
    }
  });
})();
