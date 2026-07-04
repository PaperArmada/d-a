/* Consistent hashing — keys and nodes share a ring; adding a node moves
   only the keys in one arc, not (n-1)/n of everything like mod-N does. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  const ang = (s) => (hash(s) % 3600) / 3600 * Math.PI * 2;

  window.Registry.register({
    id: 'consistent-hashing',
    title: 'Consistent Hashing',
    category: 'Systems',
    blurb: 'The ring that lets caches scale: add a server, move few keys.',
    madeOf: ['hash-table'],
    longDesc: 'With naive key % N placement, changing N remaps almost every key — a cache stampede. ' +
      'Consistent hashing puts servers AND keys on one ring; each key belongs to the next server clockwise. ' +
      'Add or remove a server and only the keys in its arc move. Watch the moved-keys counter.',
    create: function (container) {
      const KEYS = ['user:1', 'user:7', 'img:9', 'cart:3', 'sess:5', 'post:2', 'feed:8', 'tag:4', 'geo:6', 'ad:11', 'inv:12', 'log:13'];
      let nodes = ['NodeA', 'NodeB', 'NodeC'];
      let nextNode = 68; // D, E, ...
      let prevAssign = null;

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage.svg-stage');
      const setStatus = (h) => { status.innerHTML = h; };

      function ownerOf(key) {
        const ka = ang(key);
        let best = null, bestD = Infinity;
        nodes.forEach(function (n) {
          const na = ang(n);
          const d = (na - ka + Math.PI * 2) % (Math.PI * 2);
          if (d < bestD) { bestD = d; best = n; }
        });
        return best;
      }
      function assignAll() { const m = {}; KEYS.forEach((k) => { m[k] = ownerOf(k); }); return m; }

      const COLORS = ['var(--accent)', 'var(--accent-2)', 'var(--warn)', '#c084fc', 'var(--danger)', 'var(--good)'];
      function colorOf(n) { return COLORS[nodes.indexOf(n) % COLORS.length]; }

      function render(moved) {
        clear(stage);
        const C = 210, CX = 250, CY = 230;
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 720 460', width: 720, style: 'max-width:100%' });
        svg.appendChild(svgEl('circle', { cx: CX, cy: CY, r: C, fill: 'none', class: 'edge-line' }));
        const assign = assignAll();
        KEYS.forEach(function (k) {
          const a = ang(k), x = CX + Math.cos(a) * C, y = CY + Math.sin(a) * C;
          const wasMoved = moved && moved.has(k);
          svg.appendChild(svgEl('circle', { cx: x, cy: y, r: wasMoved ? 8 : 5.5,
            fill: colorOf(assign[k]), stroke: wasMoved ? '#fff' : 'var(--bg)', 'stroke-width': wasMoved ? 2.5 : 1.5 }));
          svg.appendChild(svgEl('text', { x: x + Math.cos(a) * 22, y: y + Math.sin(a) * 22, class: 'edge-weight',
            style: wasMoved ? 'fill:#fff;font-weight:700' : '', text: k }));
        });
        nodes.forEach(function (n) {
          const a = ang(n), x = CX + Math.cos(a) * C, y = CY + Math.sin(a) * C;
          svg.appendChild(svgEl('rect', { x: x - 30, y: y - 13, width: 60, height: 26, rx: 7,
            fill: colorOf(n), stroke: 'var(--bg)', 'stroke-width': 2 }));
          svg.appendChild(svgEl('text', { x: x, y: y, class: 'node-text on-fill', text: n }));
        });
        // legend of ownership counts
        const counts = {};
        KEYS.forEach((k) => { counts[assign[k]] = (counts[assign[k]] || 0) + 1; });
        let ly = 40;
        nodes.forEach(function (n) {
          svg.appendChild(svgEl('rect', { x: 545, y: ly - 12, width: 14, height: 14, rx: 4, fill: colorOf(n) }));
          svg.appendChild(svgEl('text', { x: 566, y: ly, class: 'edge-weight', 'text-anchor': 'start',
            text: n + ' — ' + (counts[n] || 0) + ' keys' }));
          ly += 26;
        });
        stage.appendChild(svg);
        stage.appendChild(el('p.hint', 'A key belongs to the next server clockwise. Ring positions come from hashing names.'));
        prevAssign = assign;
      }

      function diffMoved(before, after) {
        const moved = new Set();
        KEYS.forEach((k) => { if (before && before[k] !== after[k]) moved.add(k); });
        return moved;
      }

      container.appendChild(el('div.controls', [
        el('button.btn.btn--primary', { onclick: function () {
          if (nodes.length >= 6) { setStatus('enough nodes for the demo'); return; }
          const before = prevAssign;
          nodes.push('Node' + String.fromCharCode(nextNode++));
          const moved = diffMoved(before, assignAll());
          render(moved);
          setStatus('Added a node → only <b>' + moved.size + ' / ' + KEYS.length + '</b> keys moved (ringed). ' +
            'With mod-N, ~' + Math.round(KEYS.length * (nodes.length - 1) / nodes.length) + ' would have.');
        } }, '➕ Add node'),
        el('button.btn', { onclick: function () {
          if (nodes.length <= 2) { setStatus('keep at least two'); return; }
          const before = prevAssign;
          const gone = nodes.pop();
          const moved = diffMoved(before, assignAll());
          render(moved);
          setStatus('Removed ' + gone + ' → its <b>' + moved.size + '</b> keys slid to the next server clockwise. Everyone else: untouched.');
        } }, '➖ Remove node'),
        el('span.spacer'),
        el('button.btn.btn--ghost', { onclick: function () { nodes = ['NodeA', 'NodeB', 'NodeC']; nextNode = 68; render(); setStatus('reset'); } }, '↺')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Keys moved on resize: '), '≈ K/N (vs ≈ K for mod-N)']),
        el('span.pill', [el('b', 'In the wild: '), 'memcached rings · DynamoDB · CDNs'])
      ]));
      render();
      setStatus('12 keys on 3 nodes. Add a node and count how few keys re-home.');
      return {};
    }
  });
})();
