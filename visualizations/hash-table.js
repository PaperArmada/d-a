/* Hash table with separate chaining — insert / search / delete, live buckets. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;
  const Util = window.Util;

  window.Registry.register({
    id: 'hash-table',
    title: 'Hash Table',
    category: 'Hashing',
    blurb: 'Separate chaining. Average O(1) insert / search / delete.',
    longDesc: 'A hash table maps a key to a bucket via hash(key) % size. Collisions are handled here by ' +
      'chaining — each bucket holds a small list. Average operations are O(1); worst case O(n) if everything collides.',
    create: function (container, params) {
      let size = params && params.size ? Math.max(2, parseInt(params.size, 10) || 8) : 8;
      let buckets = Array.from({ length: size }, () => []);
      const seedKeys = params && params.keys ? params.keys.split(',').filter(Boolean) : null;

      function hash(key) {
        let h = 0; const s = String(key);
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
        return h % size;
      }

      const input = el('input.field', { type: 'text', value: String(Util.randInt(10, 99)), style: { width: '90px' }, placeholder: 'key' });
      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage', { style: { minHeight: '300px' } });
      function setStatus(h) { status.innerHTML = h; }

      function render(mark) {
        mark = mark || {};
        clear(stage);
        const table = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } });
        buckets.forEach(function (chain, i) {
          const row = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } });
          const idxCell = el('div.cell', { style: { minWidth: '40px', background: 'var(--panel)' } }, String(i));
          if (i === mark.bucket) idxCell.classList.add('is-active');
          row.appendChild(idxCell);
          row.appendChild(el('span.dim', '→'));
          if (!chain.length) {
            row.appendChild(el('span.dim', { style: { fontSize: '13px' } }, '∅'));
          } else {
            chain.forEach(function (k) {
              const c = el('div.cell', { style: { minWidth: '48px' } }, String(k));
              if (i === mark.bucket && String(k) === String(mark.key)) c.classList.add(mark.mode || 'is-hit');
              row.appendChild(c);
            });
          }
          table.appendChild(row);
        });
        stage.appendChild(table);
        const load = (count() / size).toFixed(2);
        stage.appendChild(el('p.hint', 'load factor α = items / buckets = ' + count() + ' / ' + size + ' = ' + load));
      }
      function count() { return buckets.reduce((s, b) => s + b.length, 0); }

      const controls = el('div.controls', [
        input,
        el('button.btn.btn--primary', { onclick: function () {
          const k = input.value.trim(); if (k === '') return;
          const b = hash(k);
          if (buckets[b].some((x) => String(x) === k)) { render({ bucket: b, key: k, mode: 'is-active' }); setStatus('key ' + k + ' already present in bucket ' + b); return; }
          buckets[b].push(k); render({ bucket: b, key: k, mode: 'is-new' });
          setStatus('hash(<b>' + k + '</b>) = ' + b + ' → inserted in bucket ' + b);
          input.value = String(Util.randInt(10, 99));
        } }, '➕ Insert'),
        el('button.btn', { onclick: function () {
          const k = input.value.trim(); const b = hash(k);
          const found = buckets[b].some((x) => String(x) === k);
          render({ bucket: b, key: k, mode: found ? 'is-hit' : 'is-active' });
          setStatus('hash(' + k + ') = ' + b + (found ? ' → ✓ found in bucket ' + b : ' → ✗ not in bucket ' + b));
        } }, '🔍 Search'),
        el('button.btn', { onclick: function () {
          const k = input.value.trim(); const b = hash(k);
          const idx = buckets[b].findIndex((x) => String(x) === k);
          if (idx < 0) { render({ bucket: b }); setStatus('✗ ' + k + ' not found'); return; }
          render({ bucket: b, key: k, mode: 'is-remove' });
          setTimeout(function () { buckets[b].splice(idx, 1); render({ bucket: b }); setStatus('deleted <b>' + k + '</b> from bucket ' + b); }, 400);
        } }, '❌ Delete'),
        el('div.control-group', [el('label', 'buckets'),
          (function () {
            const sel = el('select');
            [4, 8, 16].forEach((n) => sel.appendChild(el('option', { value: n, selected: n === size }, String(n))));
            sel.addEventListener('change', function () {
              const items = [].concat.apply([], buckets);
              size = parseInt(sel.value, 10);
              buckets = Array.from({ length: size }, () => []);
              items.forEach((k) => buckets[hash(k)].push(k));
              render(); setStatus('resized to ' + size + ' buckets and rehashed');
            });
            return sel;
          })()]),
        el('span.spacer'),
        el('button.btn', { onclick: function () {
          buckets = Array.from({ length: size }, () => []);
          Util.distinctArray(10, 10, 99).forEach((k) => buckets[hash(k)].push(String(k)));
          render(); setStatus('inserted 10 random keys');
        } }, '🎲 Fill'),
        window.Share.button(function () {
          return { id: 'hash-table', params: { size: size, keys: [].concat.apply([], buckets).join(',') } };
        }, function () { setStatus('🔗 Link copied — reproduces these keys and bucket count.'); }),
        el('button.btn.btn--ghost', { onclick: function () { buckets = Array.from({ length: size }, () => []); render(); setStatus('cleared'); } }, '🗑')
      ]);

      container.appendChild(controls);
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.legend', [
        el('span', [el('span.swatch', { style: { background: 'var(--accent)' } }), 'Inserted']),
        el('span', [el('span.swatch', { style: { background: 'var(--good)' } }), 'Found']),
        el('span', [el('span.swatch', { style: { background: 'var(--danger)' } }), 'Deleted'])
      ]));
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Average: '), 'O(1)']),
        el('span.pill', [el('b', 'Worst: '), 'O(n)']),
        el('span.pill', [el('b', 'Space: '), 'O(n)'])
      ]));
      // seed
      (seedKeys || [15, 23, 42, 8, 31].map(String)).forEach((k) => buckets[hash(String(k))].push(String(k)));
      render();
      setStatus('Hash table with chaining. Try inserting keys that collide into the same bucket.');
      return {};
    }
  });
})();
