/* LRU Cache — flagship compound: hash map (O(1) lookup) + doubly-linked list
   (O(1) reorder/evict) working as one machine. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;
  const Util = window.Util;

  window.Registry.register({
    id: 'lru-cache',
    title: 'LRU Cache',
    category: 'Systems',
    blurb: 'Hash map + linked list = O(1) caching with least-recently-used eviction.',
    madeOf: ['hash-table', 'linked-list'],
    longDesc: 'A cache with a capacity must decide what to evict. LRU evicts the least-recently-used entry — ' +
      'and does everything in O(1) by combining two elements: a hash map jumps straight to an entry, and a ' +
      'linked list keeps entries in recency order so the victim is always at the tail. Get and Put both move ' +
      'the touched entry to the front.',
    create: function (container, params) {
      const CAP = 4;
      let order = [];            // keys, MRU first
      let store = {};            // key -> value
      let hits = 0, misses = 0, evictions = 0;

      const keyIn = el('input.field', { type: 'text', value: 'A', style: { width: '70px' }, maxlength: '6' });
      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage', { style: { minHeight: '240px' } });
      const setStatus = (h) => { status.innerHTML = h; };

      function render(mark) {
        clear(stage);
        stage.appendChild(window.Widgets.dsStrip({
          title: 'Recency list (capacity ' + CAP + ')',
          subtitle: 'every access moves its entry to the front; evict from the tail',
          items: order.map((k) => k + ':' + store[k]),
          nextOutIndex: order.length === CAP ? order.length - 1 : null,
          enterCount: mark === 'front' ? 1 : 0,
          endLabels: { left: 'MRU (front)', right: 'LRU (evict next)' },
          chipClass: ''
        }));
        stage.appendChild(window.Widgets.keyVal('Hash map — key → node (jump straight in, no scanning)',
          order.map((k, i) => ({ key: k, val: 'node ' + i, state: i === 0 && mark === 'front' ? 'active' : '' }))));
        stage.appendChild(el('div.stats', [
          el('span.stat', ['Hits: ', el('b', String(hits))]),
          el('span.stat', ['Misses: ', el('b', String(misses))]),
          el('span.stat', ['Evictions: ', el('b', String(evictions))])
        ]));
      }

      function touch(k) { order = [k].concat(order.filter((x) => x !== k)); }

      function doGet(k) {
        if (!k) return;
        if (store[k] != null) {
          hits++; touch(k); render('front');
          setStatus('get(<b>' + k + '</b>) → <b>' + store[k] + '</b> — HIT. Hash found it in O(1); list moved it to the front.');
        } else {
          misses++; render();
          setStatus('get(<b>' + k + '</b>) → MISS. Not in the hash map (would fetch from the slow source and put()).');
        }
      }
      function doPut(k) {
        if (!k) return;
        const v = Util.randInt(10, 99);
        let evicted = null;
        if (store[k] == null && order.length === CAP) {
          evicted = order[order.length - 1];
          delete store[evicted]; order = order.slice(0, -1); evictions++;
        }
        store[k] = v; touch(k); render('front');
        setStatus('put(<b>' + k + '</b>, ' + v + ')' + (evicted
          ? ' — cache full → evicted LRU entry <b>' + evicted + '</b> from the tail, O(1).'
          : ' — inserted at the front.'));
      }

      const DEMO = ['A', 'B', 'C', 'D', 'A', 'E', 'B', 'F', 'A'];
      let timer = null;
      function autoDemo() {
        stop(); order = []; store = {}; hits = 0; misses = 0; evictions = 0;
        let i = 0;
        (function run() {
          if (i >= DEMO.length) { setStatus('Demo done — A survived (kept recent); C and D were evicted (least recently used).'); return; }
          const k = DEMO[i++];
          if (store[k] != null) doGet(k); else doPut(k);
          timer = setTimeout(run, 950);
        })();
      }
      function stop() { if (timer) { clearTimeout(timer); timer = null; } }

      container.appendChild(el('div.controls', [
        keyIn,
        el('button.btn.btn--primary', { onclick: () => doGet(keyIn.value.trim().toUpperCase()) }, '🔍 Get'),
        el('button.btn', { onclick: () => doPut(keyIn.value.trim().toUpperCase()) }, '➕ Put'),
        el('span.spacer'),
        el('button.btn', { onclick: autoDemo }, '▶ Auto demo'),
        el('button.btn.btn--ghost', { onclick: function () { stop(); order = []; store = {}; hits = misses = evictions = 0; render(); setStatus('cleared'); } }, '🗑')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Get / Put / Evict: '), 'O(1)']),
        el('span.pill', [el('b', 'Compound of: '), 'Hash Table + Linked List'])
      ]));
      ['A', 'B', 'C'].forEach(doPut);
      render();
      setStatus('Seeded with 3 entries. Get one to see it jump to the front; Put new keys until eviction.');
      return { destroy: stop };
    }
  });
})();
