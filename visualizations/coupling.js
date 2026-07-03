/* Coupling & cohesion — the ripple of a change through a dependency graph. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;

  const TANGLED = {
    name: 'tangled',
    nodes: [{ id: 'UI', x: 130, y: 80 }, { id: 'Auth', x: 380, y: 60 }, { id: 'Orders', x: 610, y: 90 },
      { id: 'DB', x: 200, y: 270 }, { id: 'Email', x: 440, y: 290 }, { id: 'Billing', x: 640, y: 250 }],
    edges: [['UI', 'Auth'], ['UI', 'DB'], ['UI', 'Orders'], ['UI', 'Email'], ['Auth', 'DB'], ['Auth', 'Email'],
      ['Orders', 'DB'], ['Orders', 'Email'], ['Orders', 'Auth'], ['Billing', 'DB'], ['Billing', 'Orders'],
      ['Email', 'DB'], ['Billing', 'Auth']]
  };
  const LAYERED = {
    name: 'layered',
    nodes: [{ id: 'UI', x: 380, y: 60 }, { id: 'Auth', x: 200, y: 170 }, { id: 'Orders', x: 380, y: 170 },
      { id: 'Billing', x: 560, y: 170 }, { id: 'Email', x: 290, y: 280 }, { id: 'DB', x: 470, y: 280 }],
    edges: [['UI', 'Auth'], ['UI', 'Orders'], ['UI', 'Billing'], ['Auth', 'DB'], ['Orders', 'DB'],
      ['Orders', 'Email'], ['Billing', 'DB']]
  };

  window.Registry.register({
    id: 'coupling',
    title: 'Coupling & the Ripple Effect',
    category: 'Craft',
    blurb: 'Click a module, see who a change can break — then refactor.',
    madeOf: ['graph-bfs'],
    longDesc: '"Loose coupling" has a mechanism: the dependency graph. Changing a module can break anything ' +
      'that transitively depends on it — its ripple set. Click modules in the tangled design, count the ' +
      'blast radius, then switch to the layered design and click the same ones.',
    create: function (container) {
      let g = TANGLED;
      let picked = null;

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage.svg-stage');
      const setStatus = (h) => { status.innerHTML = h; };

      function dependentsOf(id) {   // reverse-BFS: who (transitively) depends on id
        const rev = {};
        g.edges.forEach(([a, b]) => { (rev[b] = rev[b] || []).push(a); });
        const hit = new Set(); const q = [id];
        while (q.length) {
          const u = q.shift();
          (rev[u] || []).forEach((v) => { if (!hit.has(v)) { hit.add(v); q.push(v); } });
        }
        return hit;
      }

      function render() {
        clear(stage);
        const ripple = picked ? dependentsOf(picked) : new Set();
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 760 350', width: 760, style: 'max-width:100%' });
        svg.appendChild(svgEl('defs', {}, [svgEl('marker', { id: 'cp-arr', markerWidth: '10', markerHeight: '10', refX: '9', refY: '3', orient: 'auto' },
          [svgEl('path', { d: 'M0,0 L0,6 L9,3 z', fill: 'var(--text-dim)' })])]));
        const P = {}; g.nodes.forEach((n) => { P[n.id] = n; });
        g.edges.forEach(function ([a, b]) {
          const A = P[a], B = P[b];
          const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy);
          const hot = picked && (ripple.has(a) || a === picked) && (ripple.has(b) || b === picked);
          svg.appendChild(svgEl('line', { x1: A.x + dx / L * 30, y1: A.y + dy / L * 30, x2: B.x - dx / L * 34, y2: B.y - dy / L * 34,
            class: 'edge-line' + (hot ? ' is-active' : ''), 'marker-end': 'url(#cp-arr)' }));
        });
        g.nodes.forEach(function (n) {
          const isP = n.id === picked, inR = ripple.has(n.id);
          const c = svgEl('circle', { cx: n.x, cy: n.y, r: 30,
            class: 'node-circle' + (isP ? ' is-active' : inR ? ' is-frontier' : ''), style: 'cursor:pointer' });
          c.addEventListener('pointerdown', function () {
            picked = n.id; render();
            const r = dependentsOf(n.id);
            setStatus('Change <b>' + n.id + '</b> → ' + (r.size ? '<b>' + r.size + '</b> module(s) can break: ' + [...r].join(', ')
              : 'nothing else can break — nothing depends on it') + '.  (' + g.name + ' design)');
          });
          svg.appendChild(c);
          svg.appendChild(svgEl('text', { x: n.x, y: n.y, class: 'node-text' + (isP || inR ? ' on-fill' : ''), text: n.id }));
        });
        stage.appendChild(svg);
        const avg = (g.nodes.reduce((s, n) => s + dependentsOf(n.id).size, 0) / g.nodes.length).toFixed(1);
        stage.appendChild(el('p.hint', 'Arrows = "depends on". Edges: ' + g.edges.length + ' · average blast radius: ' + avg + ' modules.'));
      }

      container.appendChild(el('div.controls', [
        el('button.btn' + (g === TANGLED ? '.btn--primary' : ''), { onclick: function (e) { g = TANGLED; picked = null; render(); mark(e.target); setStatus('Tangled: everyone talks to everyone.'); } }, '🍝 Tangled'),
        el('button.btn', { onclick: function (e) { g = LAYERED; picked = null; render(); mark(e.target); setStatus('Layered: UI → services → infrastructure. Same features, fewer edges.'); } }, '🧱 Layered'),
        el('span.spacer')
      ]));
      function mark(btn) {
        container.querySelectorAll('.controls .btn').forEach((b) => b.classList.remove('btn--primary'));
        btn.classList.add('btn--primary');
      }
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Coupling: '), 'edges between modules']),
        el('span.pill', [el('b', 'Blast radius: '), 'transitive dependents']),
        el('span.pill', [el('b', 'Refactor goal: '), 'same features, smaller ripples'])
      ]));
      render();
      setStatus('Click <b>DB</b> in each design and compare the blast radius.');
      return {};
    }
  });
})();
