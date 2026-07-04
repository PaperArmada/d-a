/* Complexity in practice — measured comparison counts from the app's real
   sorting engines, plotted against the theoretical curves. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;
  const Util = window.Util;

  window.Registry.register({
    id: 'complexity-plot',
    title: 'Big-O, Measured',
    category: 'Craft',
    blurb: 'Real comparison counts from the sorts, plotted against n² and n log n.',
    madeOf: ['sort-bubble', 'sort-merge'],
    longDesc: 'Big-O isn\'t just theory — measure it. This plot runs the app\'s actual bubble-sort and ' +
      'merge-sort engines on random arrays of growing size and plots their comparison counts. The measured ' +
      'dots land on the theoretical curves: quadratic bends away, n log n stays almost straight.',
    create: function (container) {
      const S = window.__algos.sort;
      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage.svg-stage');
      const setStatus = (h) => { status.innerHTML = h; };

      function measure() {
        const sizes = [];
        for (let n = 4; n <= 56; n += 4) sizes.push(n);
        const runs = { bubble: [], merge: [] };
        sizes.forEach(function (n) {
          const arr = Util.randomArray(n, 1, 99);
          ['bubble', 'merge'].forEach(function (k) {
            const fr = S[k].fn(arr);
            runs[k].push({ n: n, c: (fr[fr.length - 1].counters || {}).Comparisons || 0 });
          });
        });
        return { sizes, runs };
      }

      function render() {
        clear(stage);
        const { sizes, runs } = measure();
        const W = 680, H = 380, PL = 56, PB = 40, PT = 16, PR = 16;
        const maxN = sizes[sizes.length - 1];
        const maxY = Math.max.apply(null, runs.bubble.map((p) => p.c)) * 1.08;
        const X = (n) => PL + (n / maxN) * (W - PL - PR);
        const Y = (c) => H - PB - (c / maxY) * (H - PB - PT);
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + W + ' ' + H, width: W, style: 'max-width:100%' });
        // axes
        svg.appendChild(svgEl('line', { x1: PL, y1: PT, x2: PL, y2: H - PB, class: 'edge-line' }));
        svg.appendChild(svgEl('line', { x1: PL, y1: H - PB, x2: W - PR, y2: H - PB, class: 'edge-line' }));
        svg.appendChild(svgEl('text', { x: (W + PL) / 2, y: H - 8, class: 'edge-weight', text: 'n (array size)' }));
        svg.appendChild(svgEl('text', { x: 16, y: PT + 10, class: 'edge-weight', 'text-anchor': 'start', text: 'comparisons' }));
        [0.25, 0.5, 0.75, 1].forEach((f) => {
          svg.appendChild(svgEl('text', { x: PL - 8, y: Y(maxY * f) + 4, class: 'edge-weight', 'text-anchor': 'end', text: String(Math.round(maxY * f)) }));
          svg.appendChild(svgEl('line', { x1: PL, y1: Y(maxY * f), x2: W - PR, y2: Y(maxY * f), class: 'edge-line', style: 'opacity:.25' }));
        });
        // theoretical curves scaled to fit: n²/2 and n·log2 n
        const th = (fn, color, label, lx) => {
          let d = '';
          for (let n = 4; n <= maxN; n += 2) d += (d ? ' L ' : 'M ') + X(n) + ' ' + Y(fn(n));
          svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-dasharray': '5 5', opacity: .7 }));
          svg.appendChild(svgEl('text', { x: X(lx), y: Y(fn(lx)) - 8, class: 'edge-weight', style: 'fill:' + color, text: label }));
        };
        th((n) => n * (n - 1) / 2, 'var(--danger)', 'n²/2 (theory)', 40);
        th((n) => n * Math.log2(n), 'var(--good)', 'n·log n (theory)', 46);
        // measured dots
        const dot = (pts, color) => pts.forEach((p) =>
          svg.appendChild(svgEl('circle', { cx: X(p.n), cy: Y(p.c), r: 4.5, fill: color, stroke: 'var(--bg)', 'stroke-width': 1.5 })));
        dot(runs.bubble, 'var(--danger)');
        dot(runs.merge, 'var(--good)');
        stage.appendChild(svg);
      }

      container.appendChild(el('div.controls', [
        el('button.btn.btn--primary', { onclick: function () { render(); setStatus('Re-measured on fresh random arrays — the dots wiggle (real data!) but the shape never changes.'); } }, '🎲 Re-measure'),
        el('span.spacer')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.legend', [
        el('span', [el('span.swatch', { style: { background: 'var(--danger)' } }), 'Bubble sort (measured)']),
        el('span', [el('span.swatch', { style: { background: 'var(--good)' } }), 'Merge sort (measured)'])
      ]));
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'At n=56: '), 'quadratic ≈ 10× the n log n work'])
      ]));
      container.appendChild(el('p.hint',
        'Constants wiggle — a faster machine or a lucky input shifts every dot. Growth curves don\'t. ' +
        'That\'s why algorithms are judged by the shape of their curve, not by milliseconds.'));
      render();
      setStatus('Dots = real measured comparisons from this app\'s own sort engines. Dashed = theory.');
      return {};
    }
  });
})();
