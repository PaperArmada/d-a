/* The Event Loop — call stack, microtask queue, macrotask queue. Explains
   why promise callbacks beat setTimeout(0), and why async ≠ parallel. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  const SCRIPT = [
    "log('start')",
    "setTimeout(() => log('timeout'), 0)",
    "Promise.resolve().then(() => log('promise'))",
    "log('end')",
    '// sync code done — drain microtasks, then one macrotask'
  ];

  function buildFrames() {
    const F = [];
    let stack = [], micro = [], macro = [], out = [];
    const snap = (line, status) => F.push({
      stack: stack.slice(), micro: micro.slice(), macro: macro.slice(), out: out.slice(), line, status
    });
    stack = ['script']; snap(0, 'Script starts running on the (single!) call stack');
    stack.push("log('start')"); out.push('start'); snap(0, "log('start') runs synchronously");
    stack.pop();
    stack.push('setTimeout(…, 0)'); snap(1, 'setTimeout hands its callback to the timer — even with 0ms it goes to the MACROTASK queue, never straight to the stack');
    stack.pop(); macro.push('timeout cb');
    snap(1, 'Callback parked in the macrotask queue');
    stack.push('Promise.then(…)'); snap(2, '.then registers a callback in the MICROTASK queue');
    stack.pop(); micro.push('promise cb');
    snap(2, 'Microtask parked — it will run before any macrotask');
    stack.push("log('end')"); out.push('end'); snap(3, "log('end') — still synchronous, still first");
    stack.pop();
    stack.pop(); snap(4, 'Script finished; the stack is empty. NOW the event loop looks at the queues');
    stack.push('promise cb'); micro.shift(); out.push('promise');
    snap(4, 'Microtasks drain first: the promise callback runs — beating the 0ms timeout');
    stack.pop(); snap(4, 'Microtask queue empty');
    stack.push('timeout cb'); macro.shift(); out.push('timeout');
    snap(4, 'One macrotask per loop turn: the timeout callback finally runs');
    stack.pop();
    snap(4, 'Final order: start → end → promise → timeout. Nothing ran in parallel — one stack, cleverly scheduled.');
    return F;
  }
  window.__algos = window.__algos || {};
  window.__algos.eventloop = { buildFrames };

  function render(stage, frame) {
    clear(stage);
    if (!frame) return;
    const W = window.Widgets;
    stage.appendChild(W.dsStrip({ title: 'Call stack', subtitle: 'the only place code executes',
      items: frame.stack.length ? frame.stack : [], nextOutIndex: frame.stack.length ? frame.stack.length - 1 : null,
      endLabels: { left: 'bottom', right: 'top (running)' }, chipClass: '' }));
    stage.appendChild(W.dsStrip({ title: 'Microtask queue', subtitle: 'promises · drained completely after each task',
      items: frame.micro, nextOutIndex: frame.micro.length ? 0 : null, endLabels: { left: 'next', right: 'last' }, chipClass: 'is-frontier' }));
    stage.appendChild(W.dsStrip({ title: 'Macrotask queue', subtitle: 'timers, I/O · one per loop turn',
      items: frame.macro, nextOutIndex: frame.macro.length ? 0 : null, endLabels: { left: 'next', right: 'last' }, chipClass: '' }));
    stage.appendChild(el('div.lane__note.mono', 'console: ' + (frame.out.join('  →  ') || '(empty)')));
  }

  window.Registry.register({
    id: 'event-loop',
    title: 'The Event Loop',
    category: 'Runtime',
    blurb: 'One stack + two queues: why promise beats setTimeout(0).',
    madeOf: ['call-stack', 'queue'],
    longDesc: 'JavaScript runs on a single call stack. Async APIs don\'t run code in parallel — they park ' +
      'callbacks in queues, and the event loop feeds them to the stack only when it\'s empty: microtasks ' +
      '(promises) drain completely first, then one macrotask (timer). Step through the four-line classic and ' +
      'predict the output before pressing play.',
    create: function (container) {
      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 1200,
        render: render,
        pseudocode: SCRIPT,
        legend: [
          { color: '#c084fc', label: 'Microtask (promise)' },
          { color: 'var(--accent-2)', label: 'Next to run' }
        ],
        complexity: { Threads: '1', 'Microtasks per turn': 'all', 'Macrotasks per turn': '1' },
        onReady: function (a) {
          a.setFrames(buildFrames());
          a.setStatus('Guess the console order… then press play. (Hint: it is not start, timeout, promise, end.)');
        }
      });
      return api;
    }
  });
})();
