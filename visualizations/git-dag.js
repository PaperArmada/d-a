/* Git internals — commits form a DAG of snapshots; branches are just pointers. */
(function () {
  'use strict';
  const { el, clear, svgEl } = window.DOM;

  window.Registry.register({
    id: 'git-dag',
    title: 'Git: the Commit DAG',
    category: 'Systems',
    blurb: 'Commits are snapshots in a DAG; branches are movable pointers.',
    madeOf: ['graph-bfs', 'hash-table'],
    longDesc: 'Three ideas demystify git: every commit is a full snapshot (not a diff) named by its content ' +
      'hash; commits point at their parents, forming a DAG; and a branch is nothing but a named pointer to ' +
      'one commit. Build history with the buttons — commit, branch, switch, merge — and watch the pointers move.',
    create: function (container) {
      let commits, branches, head, nextN;
      function reset() {
        commits = [{ id: 'c1', parents: [], lane: 0, x: 1 }, { id: 'c2', parents: ['c1'], lane: 0, x: 2 }];
        branches = { main: 'c2' };
        head = 'main';
        nextN = 3;
      }
      reset();

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage.svg-stage');
      const setStatus = (h) => { status.innerHTML = h; };
      const byId = (id) => commits.find((c) => c.id === id);

      function render(hot) {
        clear(stage);
        const CX = 90, CY = [110, 230, 330], R = 20;
        const maxX = Math.max.apply(null, commits.map((c) => c.x));
        const W = Math.max(620, 60 + (maxX + 1) * CX), H = 380;
        const svg = svgEl('svg', { class: 'diagram', viewBox: '0 0 ' + W + ' ' + H, width: W });
        const pos = (c) => ({ x: 40 + c.x * CX, y: CY[c.lane] });
        commits.forEach(function (c) {
          c.parents.forEach(function (pid) {
            const p = byId(pid); if (!p) return;
            const a = pos(c), b = pos(p);
            svg.appendChild(svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y,
              class: 'edge-line' + (hot === c.id ? ' is-active' : '') }));
          });
        });
        commits.forEach(function (c) {
          const p = pos(c);
          svg.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: R,
            class: 'node-circle' + (c.id === hot ? ' is-active' : c.parents.length > 1 ? ' is-path' : ' is-visit') }));
          svg.appendChild(svgEl('text', { x: p.x, y: p.y, class: 'node-text on-fill', text: c.id }));
        });
        // branch labels + HEAD
        Object.keys(branches).forEach(function (b) {
          const c = byId(branches[b]); const p = pos(c);
          const isHead = head === b;
          svg.appendChild(svgEl('rect', { x: p.x - 34, y: p.y - R - 34, width: 68, height: 22, rx: 6,
            class: 'node-circle' + (isHead ? ' is-done' : '') }));
          svg.appendChild(svgEl('text', { x: p.x, y: p.y - R - 23, class: 'node-text' + (isHead ? ' on-fill' : ''),
            style: 'font-size:11px', text: (isHead ? '★ ' : '') + b }));
        });
        stage.appendChild(svg);
        stage.appendChild(el('p.hint', '★ = HEAD (the branch you\'re on). Teal commit = a merge (two parents). ' +
          'Every id is really a content hash — same content, same id, anywhere.'));
      }

      function commit() {
        const b = head, tip = branches[b];
        const lane = b === 'main' ? 0 : (b === 'feature' ? 1 : 2);
        const id = 'c' + nextN++;
        commits.push({ id, parents: [tip], lane, x: byId(tip).x + 1 });
        branches[b] = id;
        render(id);
        setStatus('New snapshot <b>' + id + '</b> with parent ' + tip + ' — and the <b>' + b + '</b> pointer slid forward. That\'s all a commit does.');
      }
      function branch() {
        if (branches.feature) { setStatus('feature already exists — switch to it or merge it.'); return; }
        branches.feature = branches[head];
        head = 'feature';
        render(branches.feature);
        setStatus('Created <b>feature</b> — zero copying, just a second pointer at ' + branches.feature + '. Branches are 41 bytes, not folders.');
      }
      function switchTo() {
        const other = head === 'main' ? 'feature' : 'main';
        if (!branches[other]) { setStatus('No other branch yet.'); return; }
        head = other; render(branches[head]);
        setStatus('HEAD → <b>' + other + '</b>. Your working directory is rebuilt from that commit\'s snapshot.');
      }
      function merge() {
        const src = head === 'main' ? 'feature' : 'main';
        if (!branches.feature) { setStatus('Nothing to merge — create a feature branch first.'); return; }
        const a = branches[head], b = branches[src];
        if (a === b) { setStatus('Already even.'); return; }
        const id = 'c' + nextN++;
        commits.push({ id, parents: [a, b], lane: head === 'main' ? 0 : 1, x: Math.max(byId(a).x, byId(b).x) + 1 });
        branches[head] = id;
        render(id);
        setStatus('Merge commit <b>' + id + '</b> has TWO parents (' + a + ', ' + b + ') — history is a DAG, not a line. ' + head + ' now contains both lines of work.');
      }

      container.appendChild(el('div.controls', [
        el('button.btn.btn--primary', { onclick: commit }, '● Commit'),
        el('button.btn', { onclick: branch }, '⎇ Branch (feature)'),
        el('button.btn', { onclick: switchTo }, '⇄ Switch branch'),
        el('button.btn', { onclick: merge }, '⑂ Merge other → HEAD'),
        el('span.spacer'),
        el('button.btn.btn--ghost', { onclick: function () { reset(); render(); setStatus('reset to a fresh repo'); } }, '↺')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Commit: '), 'snapshot + parent pointer(s)']),
        el('span.pill', [el('b', 'Branch: '), 'a movable name for one commit']),
        el('span.pill', [el('b', 'Merge: '), 'a commit with two parents'])
      ]));
      render();
      setStatus('Two commits on main. Try: Branch → Commit twice → Switch → Commit → Merge.');
      return {};
    }
  });
})();
