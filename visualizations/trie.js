/* Trie (prefix tree) — insert words, search, and prefix queries. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;

  function newNode() { return { children: {}, end: false }; }

  window.Registry.register({
    id: 'trie',
    title: 'Trie (Prefix Tree)',
    category: 'Data Structures',
    blurb: 'Character tree for fast prefix lookups. O(L) per word.',
    longDesc: 'A trie stores strings by sharing common prefixes along tree paths. ' +
      'Insert, search, and "starts-with" all run in O(L) where L is the word length — independent ' +
      'of how many words are stored. Filled rings mark ends of complete words.',
    create: function (container, params) {
      const root = newNode();
      let timer = null;
      function stop() { if (timer) { clearTimeout(timer); timer = null; } }

      function insert(word) {
        let n = root;
        for (const ch of word) { if (!n.children[ch]) n.children[ch] = newNode(); n = n.children[ch]; }
        n.end = true;
      }
      const seed = (params && params.words) ? params.words.split(/[,\s]+/) : ['cat', 'car', 'card', 'dog', 'do', 'cab'];
      seed.map((w) => (w || '').toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean).forEach(insert);

      // layout: DFS, x by leaf order, depth by level
      function layout() {
        const nodes = []; const edges = []; let leaf = 0; let maxD = 0;
        (function walk(node, ch, depth, parent, prefix) {
          const rec = { node, ch, depth, prefix, id: nodes.length };
          const keys = Object.keys(node.children).sort();
          maxD = Math.max(maxD, depth);
          if (!keys.length) { rec._x = leaf++; }
          const childRecs = [];
          nodes.push(rec);
          keys.forEach((k) => { const cr = walk(node.children[k], k, depth + 1, rec, prefix + k); childRecs.push(cr); if (parent) 0; });
          if (keys.length) rec._x = (childRecs[0]._x + childRecs[childRecs.length - 1]._x) / 2;
          childRecs.forEach((cr) => edges.push([rec, cr]));
          return rec;
        })(root, '•', 0, null, '');
        return { nodes, edges, leaf: Math.max(1, leaf), maxD };
      }

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage.svg-stage', { style: { minHeight: '300px' } });
      const inp = el('input.field', { type: 'text', value: 'care', placeholder: 'word', style: { width: '120px' } });
      function setStatus(h) { status.innerHTML = h; }

      function render(mark) {
        clear(stage); mark = mark || {};
        const { nodes, edges, leaf, maxD } = layout();
        const COLW = Math.max(40, Math.min(70, 720 / leaf)), ROWH = 66, R = 17, PAD = 26;
        const width = Math.max(400, PAD * 2 + leaf * COLW), height = PAD * 2 + maxD * ROWH + R * 2;
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + width + ' ' + height, width });
        const X = (n) => PAD + R + n._x * COLW, Y = (n) => PAD + R + n.depth * ROWH;
        const hot = new Set(mark.path || []);
        edges.forEach((e) => svg.appendChild(svgEl('line', { x1: X(e[0]), y1: Y(e[0]), x2: X(e[1]), y2: Y(e[1]),
          class: 'edge-line' + (hot.has(e[1].prefix) ? ' is-active' : '') })));
        nodes.forEach(function (n) {
          let cls = 'node-circle';
          if (n.prefix && hot.has(n.prefix)) cls += mark.foundPrefix === n.prefix ? ' is-done' : ' is-active';
          svg.appendChild(svgEl('circle', { cx: X(n), cy: Y(n), r: R, class: cls,
            style: n.node.end ? 'stroke-width:4' : '' }));
          const filled = n.prefix && hot.has(n.prefix);
          svg.appendChild(svgEl('text', { x: X(n), y: Y(n), class: 'node-text' + (filled ? ' on-fill' : ''),
            text: n.depth === 0 ? '•' : n.ch }));
        });
        stage.appendChild(svg);
      }

      function walkAnim(word, requireEnd, done) {
        stop();
        const path = []; let n = root; let ok = true; let i = 0; const prefixes = [];
        let pfx = '';
        // precompute prefixes that exist
        for (const ch of word) { pfx += ch; prefixes.push(pfx); }
        (function step() {
          if (i >= word.length) { done(ok, n, word); return; }
          const ch = word[i];
          if (!n.children[ch]) { render({ path: path.slice() }); done(false, null, prefixes[i]); return; }
          n = n.children[ch]; path.push(prefixes[i]);
          render({ path: path.slice() });
          setStatus('Match "' + word[i] + '" → follow to prefix "' + prefixes[i] + '"');
          i++;
          timer = setTimeout(step, 450);
        })();
      }

      const controls = el('div.controls', [
        inp,
        el('button.btn.btn--primary', { onclick: function () {
          const w = clean(inp.value); if (!w) return; insert(w); render(); setStatus('inserted <b>' + w + '</b>');
        } }, '➕ Insert'),
        el('button.btn', { onclick: function () {
          const w = clean(inp.value); if (!w) return;
          walkAnim(w, true, function (reached, node) {
            const found = reached && node && node.end;
            render({ path: prefixesOf(w), foundPrefix: found ? w : null });
            setStatus(found ? '✓ "' + w + '" is a complete word' : reached ? '"' + w + '" is a prefix but not a stored word' : '✗ "' + w + '" not found');
          });
        } }, '🔍 Search'),
        el('button.btn', { onclick: function () {
          const w = clean(inp.value); if (!w) return;
          walkAnim(w, false, function (reached) {
            render({ path: prefixesOf(w), foundPrefix: reached ? w : null });
            const words = reached ? collect(nodeAt(w), w) : [];
            setStatus(reached ? '"' + w + '"… → words: <b>' + (words.join(', ') || '(none complete)') + '</b>' : 'no words start with "' + w + '"');
          });
        } }, '🔎 startsWith'),
        el('span.spacer'),
        window.Share.button(function () { return { id: 'trie', params: { words: collect(root, '').join(',') } }; },
          function () { setStatus('🔗 Link copied — reproduces this word set.'); }),
        el('button.btn.btn--ghost', { onclick: function () {
          stop(); for (const k in root.children) delete root.children[k]; render(); setStatus('cleared');
        } }, '🗑 Clear')
      ]);

      function clean(s) { return (s || '').toLowerCase().replace(/[^a-z]/g, ''); }
      function prefixesOf(w) { const a = []; let p = ''; for (const c of w) { p += c; a.push(p); } return a; }
      function nodeAt(w) { let n = root; for (const c of w) { if (!n.children[c]) return null; n = n.children[c]; } return n; }
      function collect(node, prefix) {
        if (!node) return [];
        const out = []; (function rec(n, p) { if (n.end) out.push(p); Object.keys(n.children).sort().forEach((k) => rec(n.children[k], p + k)); })(node, prefix);
        return out;
      }

      container.appendChild(controls);
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.legend', [
        el('span', [el('span.swatch', { style: { background: 'var(--warn)' } }), 'On search path']),
        el('span', [el('span.swatch', { style: { background: 'var(--good)' } }), 'Complete word found']),
        el('span', { style: { fontSize: '12.5px' } }, 'Thick ring = end of a stored word')
      ]));
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Insert / Search: '), 'O(L)']),
        el('span.pill', [el('b', 'Space: '), 'O(total chars)'])
      ]));
      render();
      setStatus('Trie seeded with ' + seed.length + ' words. Try search "car", "care", or startsWith "ca".');
      return { destroy: stop };
    }
  });
})();
