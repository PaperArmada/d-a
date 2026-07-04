/* Stack (LIFO) and Queue (FIFO) — interactive, button-driven with animation. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;
  const Util = window.Util;

  function buildShell(container, opts) {
    clear(container);
    const input = el('input.field', { type: 'text', placeholder: 'value', style: { width: '90px' } });
    input.value = String(Util.randInt(1, 99));
    const status = el('div.status', { html: '&nbsp;' });
    const stage = el('div.stage', { style: { minHeight: '300px', display: 'flex', alignItems: opts.align || 'center', justifyContent: 'center' } });

    const btns = opts.buttons.map(function (b) {
      return el('button.btn' + (b.primary ? '.btn--primary' : ''), { onclick: () => b.onClick(input.value.trim()) }, b.label);
    });
    const tail = [el('span.spacer')];
    if (opts.share) tail.push(window.Share.button(opts.share, function () { status.innerHTML = '🔗 Link copied.'; }));
    tail.push(el('button.btn.btn--ghost', { onclick: opts.onClear }, '🗑 Clear'));
    const controls = el('div.controls', [input, ...btns, ...tail]);
    container.appendChild(controls);
    container.appendChild(status);
    container.appendChild(stage);
    // Pseudocode panel (same look as the frame-based demos); each operation
    // lights up its own line so the button ↔ code mapping is explicit.
    let codeLines = [];
    if (opts.pseudocode) {
      const pre = el('div.code-panel', { 'aria-label': 'pseudocode' });
      codeLines = opts.pseudocode.map(function (line, i) {
        const ln = el('div.code-line', [el('span.code-gutter', String(i + 1)), el('span.code-text', line || ' ')]);
        pre.appendChild(ln);
        return ln;
      });
      container.appendChild(pre);
    }
    function hiLine(i) { codeLines.forEach((ln, k) => ln.classList.toggle('active', k === i)); }
    if (opts.legend) container.appendChild(el('div.legend', opts.legend.map((l) =>
      el('span', [el('span.swatch', { style: { background: l.color } }), l.label]))));
    return { input, status, stage, hiLine, setStatus: (h) => { status.innerHTML = h; } };
  }

  // ---------- Stack ----------
  window.Registry.register({
    id: 'stack',
    title: 'Stack (LIFO)',
    category: 'Data Structures',
    blurb: 'Last-in, first-out. push / pop / peek in O(1).',
    longDesc: 'A stack grows and shrinks from a single end (the top). Push adds to the top, ' +
      'pop removes from the top. Think of a stack of plates.',
    create: function (container, params) {
      let stack = params && params.vals ? params.vals.split(',').filter((s) => s !== '') : [10, 25, 7];
      let ui;
      function render(highlightTop, mode) {
        clear(ui.stage);
        if (!stack.length) { ui.stage.appendChild(el('p.dim', 'empty stack')); return; }
        const col = el('div', { style: { display: 'flex', flexDirection: 'column-reverse', gap: '6px', alignItems: 'center' } });
        stack.forEach(function (v, i) {
          const c = el('div.cell', { style: { minWidth: '120px' } }, [
            String(v),
            i === stack.length - 1 ? el('div.cell__idx', { style: { top: 'auto', right: '-46px', color: 'var(--accent-2)' } }, '← top') : null
          ]);
          if (i === stack.length - 1 && highlightTop) c.classList.add(mode === 'pop' ? 'is-remove' : mode === 'peek' ? 'is-active' : 'is-new');
          col.appendChild(c);
        });
        ui.stage.appendChild(col);
      }
      ui = buildShell(container, {
        align: 'flex-end',
        buttons: [
          { label: '⬆ Push', primary: true, onClick: function (v) {
            if (v === '') return; stack.push(v); render(true, 'push'); ui.hiLine(0);
            ui.setStatus('push(<b>' + v + '</b>) — one write at the top, no matter how tall the stack: O(1)');
            ui.input.value = String(Util.randInt(1, 99));
          } },
          { label: '⬇ Pop', onClick: function () {
            if (!stack.length) { ui.hiLine(3); ui.setStatus('pop() on empty stack → underflow'); return; }
            render(true, 'pop'); const v = stack[stack.length - 1]; ui.hiLine(1);
            ui.setStatus('pop() → <b>' + v + '</b> — always the most recent push (LIFO)');
            setTimeout(function () { stack.pop(); render(); }, 350);
          } },
          { label: '👁 Peek', onClick: function () {
            if (!stack.length) { ui.hiLine(3); ui.setStatus('peek() on empty stack'); return; }
            render(true, 'peek'); ui.hiLine(2); ui.setStatus('peek() → <b>' + stack[stack.length - 1] + '</b> (looked at, not removed)');
            setTimeout(render, 700);
          } }
        ],
        onClear: function () { stack = []; render(); ui.setStatus('cleared'); },
        share: function () { return { id: 'stack', params: { vals: stack.join(',') } }; },
        pseudocode: [
          'push(v):  a[top] = v; top = top + 1        # O(1)',
          'pop():    top = top - 1; return a[top]     # O(1)',
          'peek():   return a[top - 1]                # O(1)',
          'empty():  top == 0'
        ],
        legend: [{ color: 'var(--accent)', label: 'Pushed' }, { color: 'var(--danger)', label: 'Popped' }, { color: 'var(--warn)', label: 'Peek' }]
      });
      render();
      ui.setStatus('Stack initialized with 3 items. Top is at the top.');
      return {};
    }
  });

  // ---------- Queue ----------
  window.Registry.register({
    id: 'queue',
    title: 'Queue (FIFO)',
    category: 'Data Structures',
    blurb: 'First-in, first-out. enqueue / dequeue in O(1).',
    longDesc: 'A queue adds at the back (enqueue) and removes from the front (dequeue). ' +
      'Like a line of people waiting.',
    create: function (container, params) {
      let queue = params && params.vals ? params.vals.split(',').filter((s) => s !== '') : [3, 8, 15];
      let ui;
      function render(hi, mode) {
        clear(ui.stage);
        if (!queue.length) { ui.stage.appendChild(el('p.dim', 'empty queue')); return; }
        const row = el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } });
        queue.forEach(function (v, i) {
          const c = el('div.cell', { style: { minWidth: '60px' } }, [
            String(v),
            i === 0 ? el('div.cell__idx', { style: { color: 'var(--accent-2)' } }, 'front') : null,
            i === queue.length - 1 ? el('div.cell__idx', { style: { top: 'auto', bottom: '-18px', color: 'var(--text-dim)' } }, 'back') : null
          ]);
          if (i === 0 && hi === 'front') c.classList.add(mode || 'is-remove');
          if (i === queue.length - 1 && hi === 'back') c.classList.add('is-new');
          row.appendChild(c);
        });
        ui.stage.appendChild(row);
      }
      ui = buildShell(container, {
        buttons: [
          { label: '⬅ Enqueue', primary: true, onClick: function (v) {
            if (v === '') return; queue.push(v); render('back'); ui.hiLine(0);
            ui.setStatus('enqueue(<b>' + v + '</b>) at the back — everyone already in line keeps their place: O(1)');
            ui.input.value = String(Util.randInt(1, 99));
          } },
          { label: 'Dequeue ➡', onClick: function () {
            if (!queue.length) { ui.hiLine(3); ui.setStatus('dequeue() on empty queue → underflow'); return; }
            render('front', 'is-remove'); const v = queue[0]; ui.hiLine(1);
            ui.setStatus('dequeue() → <b>' + v + '</b> — always the one who has waited longest (FIFO)');
            setTimeout(function () { queue.shift(); render(); }, 350);
          } },
          { label: '👁 Front', onClick: function () {
            if (!queue.length) { ui.hiLine(3); ui.setStatus('front() on empty queue'); return; }
            render('front', 'is-active'); ui.hiLine(2); ui.setStatus('front() → <b>' + queue[0] + '</b> (looked at, not removed)');
            setTimeout(render, 700);
          } }
        ],
        onClear: function () { queue = []; render(); ui.setStatus('cleared'); },
        share: function () { return { id: 'queue', params: { vals: queue.join(',') } }; },
        pseudocode: [
          'enqueue(v):  a[back] = v; back = back + 1   # O(1)',
          'dequeue():   v = a[front]; front = front + 1; return v   # O(1)',
          'front():     return a[front]                # O(1)',
          'empty():     front == back'
        ],
        legend: [{ color: 'var(--accent)', label: 'Enqueued' }, { color: 'var(--danger)', label: 'Dequeued' }, { color: 'var(--warn)', label: 'Front' }]
      });
      render();
      ui.setStatus('Queue initialized. Enqueue adds to the back, dequeue removes from the front.');
      return {};
    }
  });
})();
