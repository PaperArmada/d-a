/* Garbage collection — mark reachable objects from the roots, sweep the rest.
   Handles cycles that reference counting cannot. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;

  window.Registry.register({
    id: 'gc-mark-sweep',
    title: 'Garbage Collection (Mark & Sweep)',
    category: 'Runtime',
    blurb: 'Reachability from roots decides what lives — cycles included.',
    madeOf: ['graph-bfs'],
    longDesc: 'The collector doesn\'t know what you\'ll use — only what you can still REACH. Mark walks the ' +
      'object graph from the roots (stack, globals); sweep frees everything unmarked. Note the cycle: two ' +
      'objects pointing at each other still die if nothing reaches them — the case reference counting gets wrong.',
    create: function (container) {
      // object graph; 'cut' drops the edge root→D creating garbage incl. cycle E↔F
      let cut = false;
      const NODES = [
        { id: 'root', x: 80, y: 190, root: true }, { id: 'A', x: 240, y: 90 }, { id: 'B', x: 240, y: 290 },
        { id: 'C', x: 400, y: 90 }, { id: 'D', x: 400, y: 230 }, { id: 'E', x: 560, y: 170 }, { id: 'F', x: 660, y: 280 }
      ];
      const edges = () => [
        ['root', 'A'], ['root', 'B'], ['A', 'C']
      ].concat(cut ? [] : [['root', 'D']]).concat([['D', 'E'], ['E', 'F'], ['F', 'E']]);

      function build() {
        const F = [];
        const marked = new Set();
        const E = edges();
        const snap = (cur, status, sweep) => F.push({ marked: new Set(marked), current: cur, E, sweep: sweep || null, status });
        snap(null, cut ? 'root no longer points at D. Same heap otherwise — watch who survives now.' :
          'Mark phase: start from the roots (stack & globals) and follow every pointer.');
        const q = ['root']; marked.add('root');
        while (q.length) {
          const u = q.shift();
          snap(u, 'Mark ' + u + (u === 'root' ? ' (a root — always live)' : ' — reachable, so it survives'));
          E.filter((e) => e[0] === u && !marked.has(e[1])).forEach((e) => { marked.add(e[1]); q.push(e[1]); });
        }
        const dead = NODES.filter((n) => !marked.has(n.id)).map((n) => n.id);
        snap(null, dead.length
          ? 'Sweep: ' + dead.join(', ') + ' were never marked → freed. Note E↔F: they point at EACH OTHER, but reachability from roots is what counts.'
          : 'Sweep: nothing to free — every object is reachable.', dead);
        return F;
      }

      function render(stage, frame) {
        clear(stage);
        if (!frame) return;
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 760 380', width: 760, style: 'max-width:100%' });
        svg.appendChild(svgEl('defs', {}, [svgEl('marker', { id: 'gc-arr', markerWidth: '10', markerHeight: '10', refX: '9', refY: '3', orient: 'auto' },
          [svgEl('path', { d: 'M0,0 L0,6 L9,3 z', fill: 'var(--text-dim)' })])]));
        const P = {}; NODES.forEach((n) => { P[n.id] = n; });
        frame.E.forEach(function (e) {
          const a = P[e[0]], b = P[e[1]];
          const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
          svg.appendChild(svgEl('line', { x1: a.x + dx / L * 26, y1: a.y + dy / L * 26, x2: b.x - dx / L * 30, y2: b.y - dy / L * 30,
            class: 'edge-line', 'marker-end': 'url(#gc-arr)' }));
        });
        NODES.forEach(function (n) {
          const swept = frame.sweep && frame.sweep.indexOf(n.id) >= 0;
          const cls = 'node-circle' + (n.id === frame.current ? ' is-active' : frame.marked.has(n.id) ? ' is-done' : '');
          svg.appendChild(svgEl('circle', { cx: n.x, cy: n.y, r: n.root ? 30 : 24, class: cls,
            style: swept ? 'opacity:.18' : (!frame.marked.has(n.id) && frame.sweep ? '' : '') }));
          svg.appendChild(svgEl('text', { x: n.x, y: n.y, class: 'node-text' + (frame.marked.has(n.id) || n.id === frame.current ? ' on-fill' : ''),
            style: swept ? 'opacity:.3' : '', text: n.id }));
          if (swept) svg.appendChild(svgEl('text', { x: n.x, y: n.y - 34, class: 'edge-weight', style: 'fill:var(--danger);font-weight:700', text: 'freed' }));
        });
        stage.appendChild(svg);
      }

      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 900,
        render: render,
        legend: [
          { color: 'var(--warn)', label: 'Being marked' },
          { color: 'var(--good)', label: 'Marked (live)' },
          { color: 'var(--panel-2)', label: 'Unmarked → swept' }
        ],
        complexity: { Mark: 'O(live objects)', Sweep: 'O(heap)', 'Beats refcounting at': 'cycles (E↔F)' },
        controls: [
          { label: '✂ Drop root→D', title: 'Make D, E, F unreachable', onClick: function (a) { cut = true; load(a); } },
          { label: '↺ Restore reference', onClick: function (a) { cut = false; load(a); } }
        ],
        onReady: function (a) { load(a); }
      });
      function load(a) { const x = a || api; x.setFrames(build()); x.setStatus((cut ? 'Reference dropped. ' : '') + 'Press play to run a collection.'); }
      return api;
    }
  });
})();
