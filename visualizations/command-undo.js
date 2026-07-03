/* Command pattern + undo/redo — actions become objects on two stacks. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;
  const Util = window.Util;

  window.Registry.register({
    id: 'command-undo',
    title: 'Command Pattern (Undo/Redo)',
    category: 'Design Patterns',
    blurb: 'Every action is an object with do/undo — undo is just a stack pop.',
    madeOf: ['stack'],
    longDesc: 'Instead of performing changes directly, wrap each one in a command object that knows how to ' +
      'apply AND reverse itself. Executed commands go on an undo stack; undoing moves them to a redo stack. ' +
      'That\'s the whole mechanism behind Ctrl-Z in every editor.',
    create: function (container) {
      let doc = 'HELLO';
      let undoS = [], redoS = [];

      const status = el('div.status', { html: '&nbsp;' });
      const stage = el('div.stage', { style: { minHeight: '250px' } });
      const setStatus = (h) => { status.innerHTML = h; };

      const CMDS = {
        append: (ch) => ({ label: 'append(' + ch + ')', apply: (d) => d + ch, revert: (d) => d.slice(0, -1) }),
        del: () => ({ label: 'deleteLast', apply: (d) => d.slice(0, -1), revert: null /* set at exec */ }),
        dup: () => ({ label: 'duplicate', apply: (d) => d + d, revert: (d) => d.slice(0, d.length / 2) })
      };

      function exec(cmd) {
        if (cmd.label === 'deleteLast') {
          if (!doc.length) { setStatus('nothing to delete'); return; }
          const removed = doc[doc.length - 1];
          cmd.revert = (d) => d + removed;
          cmd.label = 'delete(' + removed + ')';
        }
        doc = cmd.apply(doc);
        undoS.push(cmd);
        redoS = [];                     // a new action invalidates the redo future
        render();
        setStatus('Executed <b>' + cmd.label + '</b> → pushed onto the undo stack. Redo stack cleared (history branched).');
      }
      function undo() {
        if (!undoS.length) { setStatus('undo stack empty'); return; }
        const cmd = undoS.pop();
        doc = cmd.revert(doc);
        redoS.push(cmd);
        render();
        setStatus('Undo = pop <b>' + cmd.label + '</b>, run its revert, push it on the redo stack.');
      }
      function redo() {
        if (!redoS.length) { setStatus('redo stack empty'); return; }
        const cmd = redoS.pop();
        doc = cmd.apply(doc);
        undoS.push(cmd);
        render();
        setStatus('Redo = pop <b>' + cmd.label + '</b> back, re-apply it.');
      }

      function render() {
        clear(stage);
        stage.appendChild(el('div', { style: { fontFamily: 'var(--mono)', fontSize: '22px', marginBottom: '14px' } }, [
          el('span.dim', 'document:  '), el('b', { style: { color: 'var(--accent-2)' } }, '"' + doc + '"')
        ]));
        stage.appendChild(window.Widgets.dsStrip({
          title: 'Undo stack', subtitle: 'executed commands — Ctrl-Z pops from here',
          items: undoS.map((c) => c.label), nextOutIndex: undoS.length ? undoS.length - 1 : null,
          endLabels: { left: 'oldest', right: 'most recent' }, chipClass: ''
        }));
        stage.appendChild(window.Widgets.dsStrip({
          title: 'Redo stack', subtitle: 'undone commands — cleared the moment you do something new',
          items: redoS.map((c) => c.label), nextOutIndex: redoS.length ? redoS.length - 1 : null,
          endLabels: { left: 'oldest', right: 'next redo' }, chipClass: 'is-frontier'
        }));
      }

      container.appendChild(el('div.controls', [
        el('button.btn.btn--primary', { onclick: () => exec(CMDS.append(String.fromCharCode(65 + Util.randInt(0, 25)))) }, '➕ Append letter'),
        el('button.btn', { onclick: () => exec(CMDS.del()) }, '⌫ Delete last'),
        el('button.btn', { onclick: () => exec(CMDS.dup()) }, '×2 Duplicate'),
        el('span.spacer'),
        el('button.btn', { onclick: undo }, '↩ Undo'),
        el('button.btn', { onclick: redo }, '↪ Redo'),
        el('button.btn.btn--ghost', { onclick: function () { doc = 'HELLO'; undoS = []; redoS = []; render(); setStatus('reset'); } }, '🗑')
      ]));
      container.appendChild(status);
      container.appendChild(stage);
      container.appendChild(el('div.complexity', [
        el('span.pill', [el('b', 'Undo/redo: '), 'O(1) stack ops']),
        el('span.pill', [el('b', 'Command carries: '), 'apply() + revert()']),
        el('span.pill', [el('b', 'Bonus: '), 'same objects give you macros, queues, audit logs'])
      ]));
      render();
      setStatus('Run a few commands, then undo/redo. Watch what a NEW command does to the redo stack.');
      return {};
    }
  });
})();
