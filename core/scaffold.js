/* Scaffold — standard "algorithm animation" layout built on Player.
   Handles play/pause/step/reset/speed controls, a status line, a stage, an
   optional synced pseudocode panel, live operation counters, a legend, and
   complexity pills — so each algorithm module only supplies frames + a render.

   createStepViz(container, {
     controls: [ {label, onClick, primary, title} , ... ]  // extra buttons (e.g. Randomize)
     topControls: [ HTMLElement, ... ]                     // custom inputs shown above transport
     legend:   [ {color, label}, ... ],
     complexity: { time:'O(n log n)', ... },               // shown as pills
     pseudocode: [ 'line 0', 'line 1', ... ],              // frame.line highlights a line
     counters:  [ 'Comparisons', 'Swaps' ],                // keys read from frame.counters
     render:   (stage, frame, api) => {}                   // draw a frame into stage
     onReady:  (api) => {}                                 // called once controls exist
   })
   → api { player, stage, setStatus, setFrames, el, clear, destroy, container }

   A frame may carry: { status, line, counters:{...}, ...your-render-data }.
*/
(function (global) {
  'use strict';
  const { el, clear } = global.DOM;

  function createStepViz(container, cfg) {
    cfg = cfg || {};
    clear(container);

    const stage = el('div.stage');
    const status = el('div.status', { html: '&nbsp;', role: 'status', 'aria-live': 'polite' });

    // Optional pseudocode panel
    let codeLines = [];
    let codePanel = null;
    if (cfg.pseudocode && cfg.pseudocode.length) {
      const pre = el('div.code-panel', { 'aria-label': 'pseudocode' });
      cfg.pseudocode.forEach(function (line, i) {
        const ln = el('div.code-line', [el('span.code-gutter', String(i + 1)), el('span.code-text', line || ' ')]);
        codeLines.push(ln);
        pre.appendChild(ln);
      });
      codePanel = pre;
    }

    // Optional counters row
    let counterEls = {};
    let counterRow = null;
    if (cfg.counters && cfg.counters.length) {
      const items = cfg.counters.map(function (name) {
        const val = el('b', '0');
        counterEls[name] = val;
        return el('span.stat', [name + ': ', val]);
      });
      counterRow = el('div.stats', items);
    }

    const player = new global.Player({
      baseDelay: cfg.baseDelay || 650,
      onFrame: function (frame) {
        cfg.render(stage, frame, api);
        if (frame && frame.status != null) setStatus(frame.status);
        highlightLine(frame && frame.line);
        updateCounters(frame && frame.counters);
      },
      onStateChange: updateControls
    });

    // Transport buttons
    const btnPlay = el('button.btn.btn--primary', { onclick: () => player.toggle(), 'aria-label': 'Play or pause' }, '▶ Play');
    const btnPrev = el('button.btn', { onclick: () => player.stepBack(), title: 'Step back' }, '⏮ Prev');
    const btnNext = el('button.btn', { onclick: () => player.stepForward(), title: 'Step forward' }, 'Next ⏭');
    const btnReset = el('button.btn.btn--ghost', { onclick: () => player.reset(), title: 'Reset to start' }, '↺ Reset');

    // Speed
    const speed = el('input', { type: 'range', min: '0.25', max: '4', step: '0.25', value: '1',
      'aria-label': 'Playback speed',
      oninput: (e) => player.setSpeed(parseFloat(e.target.value)) });
    const speedLabel = el('span.mono', '1×');
    speed.addEventListener('input', () => { speedLabel.textContent = speed.value + '×'; });

    const progress = el('span.mono.dim', '0 / 0');

    const extra = (cfg.controls || []).map(function (c) {
      return el('button.btn' + (c.primary ? '.btn--primary' : ''), {
        onclick: () => c.onClick(api),
        title: c.title || ''
      }, c.label);
    });

    const controls = el('div.controls', [
      btnPlay, btnPrev, btnNext, btnReset,
      el('div.control-group', [el('label', 'Speed'), speed, speedLabel]),
      el('span.spacer'),
      ...extra,
      progress
    ]);

    // Assemble. topControls (custom inputs) sit above the transport bar.
    if (cfg.topControls && cfg.topControls.length) {
      container.appendChild(el('div.controls', cfg.topControls));
    }
    container.appendChild(controls);
    container.appendChild(status);
    if (counterRow) container.appendChild(counterRow);

    // stage + optional code panel side by side
    if (codePanel) {
      container.appendChild(el('div.viz-main', [stage, codePanel]));
    } else {
      container.appendChild(stage);
    }

    if (cfg.legend) {
      container.appendChild(el('div.legend', cfg.legend.map(function (l) {
        return el('span', [el('span.swatch', { style: { background: l.color } }), l.label]);
      })));
    }
    if (cfg.complexity) {
      const pills = [];
      for (const k in cfg.complexity) pills.push(el('span.pill', [el('b', k + ': '), cfg.complexity[k]]));
      container.appendChild(el('div.complexity', pills));
    }
    if (cfg.footer) container.appendChild(cfg.footer);

    function updateControls(s) {
      btnPlay.innerHTML = s.playing ? '⏸ Pause' : '▶ Play';
      btnPrev.disabled = s.atStart;
      btnNext.disabled = s.atEnd;
      progress.textContent = (s.length ? s.index + 1 : 0) + ' / ' + s.length;
    }
    function highlightLine(line) {
      if (!codeLines.length) return;
      codeLines.forEach(function (ln, i) { ln.classList.toggle('active', i === line); });
    }
    function updateCounters(counters) {
      if (!counterRow) return;
      for (const k in counterEls) counterEls[k].textContent = counters && counters[k] != null ? counters[k] : 0;
    }

    function setStatus(html) { status.innerHTML = html; }
    function setFrames(frames) { player.load(frames); }

    // ---- Keyboard shortcuts (scoped: only while this viz is mounted) ----
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); player.toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); player.stepForward(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); player.stepBack(); }
      else if (e.key === 'Home') { e.preventDefault(); player.reset(); }
    }
    document.addEventListener('keydown', onKey);

    const api = {
      player, stage, setStatus, setFrames, container,
      el, clear,
      destroy: function () { player.destroy(); document.removeEventListener('keydown', onKey); }
    };

    if (cfg.onReady) cfg.onReady(api);
    return api;
  }

  global.Scaffold = { createStepViz: createStepViz };
})(window);
