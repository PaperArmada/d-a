/* Stack vs heap — frames die on return; heap objects live until unreachable. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  function build() {
    const F = [];
    let stack = [], heap = [];
    const snap = (line, status) => F.push({ stack: stack.map((f) => Object.assign({}, f)), heap: heap.map((h) => Object.assign({}, h)), line, status });
    snap(0, 'main() starts — its frame sits on the stack.');
    stack.push({ label: 'main()', vars: 'user = ?' });
    snap(0, 'Frame for main pushed. Locals live in the frame.');
    stack.push({ label: 'makeUser()', vars: 'name = "Ada"' });
    snap(1, 'Call makeUser() → new frame on top. "Ada" is a local — stack data.');
    heap.push({ id: '0x7f3a', label: '{ name: "Ada" }', live: true });
    snap(2, 'new User(…) allocates on the HEAP at 0x7f3a — sized and lifetimed at runtime.');
    stack[1].vars = 'name="Ada" · u = 0x7f3a';
    snap(2, 'The local u holds only the ADDRESS. The object itself is not in the frame.');
    stack.pop();
    stack[0].vars = 'user = 0x7f3a';
    snap(3, 'makeUser returns the pointer → its frame is POPPED and gone… but the heap object survives, because main still points at it.');
    stack[0].vars = 'user = null';
    heap[0].live = false;
    snap(4, 'main sets user = null. Nothing points at 0x7f3a anymore — it is garbage (see Mark & Sweep for what happens next).');
    snap(4, 'Stack: automatic, LIFO, fast, dies with the call. Heap: flexible, survives returns, needs GC/free.');
    return F;
  }

  window.Registry.register({
    id: 'stack-heap',
    title: 'Stack vs Heap Memory',
    category: 'The Machine',
    blurb: 'Frames die on return; heap objects live while anything points at them.',
    madeOf: ['call-stack'],
    longDesc: 'Two memory regions with opposite lifetimes: the stack allocates a frame per call and frees ' +
      'it on return (automatically, in LIFO order); the heap holds objects whose size or lifetime the ' +
      'compiler can\'t predict — they survive returns and only die when unreachable. Locals hold heap ' +
      'ADDRESSES, not the objects themselves.',
    create: function (container) {
      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 1500,
        render: function (stage, frame) {
          clear(stage);
          if (!frame) return;
          const cols = el('div', { style: { display: 'flex', gap: '26px', flexWrap: 'wrap' } });
          // stack column (grows down visually as pushes)
          const sc = el('div', { style: { flex: '0 0 250px' } });
          sc.appendChild(el('div.kv__title', 'STACK — auto, LIFO'));
          const scol = el('div', { style: { display: 'flex', flexDirection: 'column-reverse', gap: '6px' } });
          frame.stack.forEach(function (f, i) {
            scol.appendChild(el('div.cell' + (i === frame.stack.length - 1 ? '.is-active' : ''),
              { style: { minWidth: '240px', height: 'auto', padding: '8px' } }, [
                el('div', f.label), el('div', { style: { fontSize: '11px', opacity: .8 } }, f.vars)
              ]));
          });
          if (!frame.stack.length) scol.appendChild(el('div.dim', 'empty'));
          sc.appendChild(scol);
          cols.appendChild(sc);
          // heap column
          const hc = el('div', { style: { flex: '0 0 250px' } });
          hc.appendChild(el('div.kv__title', 'HEAP — dynamic lifetime'));
          frame.heap.forEach(function (h) {
            hc.appendChild(el('div.cell' + (h.live ? '.is-hit' : '.is-ghost'),
              { style: { minWidth: '240px', height: 'auto', padding: '8px' } }, [
                el('div.mono', { style: { fontSize: '11px', opacity: .7 } }, h.id + (h.live ? '' : '  (unreachable)')),
                el('div', h.label)
              ]));
          });
          if (!frame.heap.length) hc.appendChild(el('div.dim', 'empty'));
          cols.appendChild(hc);
          stage.appendChild(cols);
        },
        pseudocode: [
          'main(): user = makeUser()',
          'makeUser(): name = "Ada"',
          '  u = new User(name)   // heap alloc',
          '  return u             // frame dies, object lives',
          'main: user = null      // now it is garbage'
        ],
        legend: [
          { color: 'var(--warn)', label: 'Running frame' },
          { color: 'var(--good)', label: 'Reachable heap object' },
          { color: 'var(--panel-2)', label: 'Unreachable (garbage)' }
        ],
        complexity: { 'Stack alloc/free': 'move one pointer', 'Heap alloc': 'find a hole (malloc/GC)', 'Dangling pointer': 'using a dead frame\'s address' },
        onReady: function (a) { a.setFrames(build()); a.setStatus('Press play — watch where "Ada" actually lives.'); }
      });
      return api;
    }
  });
})();
