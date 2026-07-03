/* Strategy pattern — one context, hot-swappable algorithm. Literally reuses
   the sorting engines: the context doesn't care which strategy it holds. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;
  const Util = window.Util;

  window.Registry.register({
    id: 'strategy',
    title: 'Strategy Pattern',
    category: 'Design Patterns',
    blurb: 'Swap the algorithm behind one interface — even mid-workload.',
    madeOf: ['sort-bubble', 'sort-merge'],
    longDesc: 'A context object holds a strategy — any object honouring one interface (here: sort(array)). ' +
      'Callers talk to the context; the algorithm behind it can be swapped at runtime without them knowing. ' +
      'This demo\'s strategies are the app\'s actual sorting engines: pick one, run the same workload, swap, run again.',
    create: function (container) {
      const S = window.__algos.sort;
      const KEYS = ['bubble', 'insertion', 'merge', 'quick'];
      let current = 'bubble';
      let data = Util.randomArray(18, 5, 99);
      const history = [];

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage', { style: { minHeight: '240px' } });
      const setStatus = (h) => { status.innerHTML = h; };

      function bars(arr, sortedAll) {
        const wrap = el('div.bars', { style: { height: '150px' } });
        const max = Math.max.apply(null, arr.concat([1]));
        arr.forEach(function (v) {
          wrap.appendChild(el('div.bar' + (sortedAll ? '.is-sorted' : ''), { style: { height: (v / max * 100) + '%' } }));
        });
        return wrap;
      }

      function render(sorted) {
        clear(stage);
        stage.appendChild(el('div.row', { style: { marginBottom: '10px', fontFamily: 'var(--mono)', fontSize: '13px' } }, [
          el('span.pill', 'context.strategy = ' + S[current].name),
          el('span.dim', '  callers only ever call context.sort(data)')
        ]));
        stage.appendChild(bars(data, sorted));
        if (history.length) {
          stage.appendChild(el('div', { style: { marginTop: '16px' } }, [
            el('div.kv__title', 'Same workload, different strategy — cost history'),
            el('div.row', history.map((h) => el('span.pill', [el('b', h.name + ': '), h.cmp + ' cmp / ' + h.swaps + ' swaps'])))
          ]));
        }
      }

      function run() {
        const frames = S[current].fn(data);
        const last = frames[frames.length - 1];
        const c = last.counters || {};
        data = last.array.slice();
        history.push({ name: S[current].name, cmp: c.Comparisons || 0, swaps: c.Swaps || 0 });
        if (history.length > 4) history.shift();
        render(true);
        setStatus('context.sort() ran <b>' + S[current].name + '</b>: ' + (c.Comparisons || 0) +
          ' comparisons. The caller\'s code did not change.');
      }

      const sel = el('select');
      KEYS.forEach((k) => sel.appendChild(el('option', { value: k, selected: k === current }, S[k].name)));
      sel.addEventListener('change', function () {
        current = sel.value; render(false);
        setStatus('Strategy swapped to <b>' + S[current].name + '</b> at runtime — no caller, no context code touched.');
      });

      container.appendChild(el('div.controls', [
        el('div.control-group', [el('label', 'strategy'), sel]),
        el('button.btn.btn--primary', { onclick: run }, '▶ context.sort(data)'),
        el('span.spacer'),
        el('button.btn', { onclick: function () { data = Util.randomArray(18, 5, 99); history.length = 0; render(false); setStatus('new workload'); } }, '🎲 New data')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Interface: '), 'sort(array) → array']),
        el('span.pill', [el('b', 'Swap cost: '), 'one assignment']),
        el('span.pill', [el('b', 'vs if/else chains: '), 'open for extension, closed for modification'])
      ]));
      render(false);
      setStatus('Pick a strategy and run the same workload. Compare the cost pills that accumulate.');
      return {};
    }
  });
})();
