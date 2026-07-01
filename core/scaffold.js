/* Scaffold — standard "algorithm animation" layout built on Player.
   Handles the play/pause/step/reset/speed controls, a status line, a stage,
   an optional legend, and complexity pills, so each algorithm module only
   supplies: how to build frames, and how to render a frame.

   createStepViz(container, {
     controls: [ {label, onClick, primary} , ... ]   // extra buttons (e.g. Randomize)
     legend:   [ {color, label}, ... ],
     complexity: { time:'O(n log n)', space:'O(n)', ... },   // shown as pills
     render:   (stage, frame, api) => {}   // draw a frame into stage
     onReady:  (api) => {}                 // called once controls exist
   })
   → api { player, stage, setStatus, setFrames, rebuild(controlsArr) }
*/
(function (global) {
  'use strict';
  const { el, clear } = global.DOM;

  function createStepViz(container, cfg) {
    cfg = cfg || {};
    clear(container);

    const stage = el('div.stage');
    const status = el('div.status', { html: '&nbsp;' });

    const player = new global.Player({
      baseDelay: cfg.baseDelay || 650,
      onFrame: function (frame) {
        cfg.render(stage, frame, api);
        if (frame && frame.status != null) setStatus(frame.status);
      },
      onStateChange: updateControls
    });

    // Transport buttons
    const btnPlay = el('button.btn.btn--primary', { onclick: () => player.toggle() }, '▶ Play');
    const btnPrev = el('button.btn', { onclick: () => player.stepBack(), title: 'Step back' }, '⏮ Prev');
    const btnNext = el('button.btn', { onclick: () => player.stepForward(), title: 'Step forward' }, 'Next ⏭');
    const btnReset = el('button.btn.btn--ghost', { onclick: () => player.reset() }, '↺ Reset');

    // Speed
    const speed = el('input', { type: 'range', min: '0.25', max: '4', step: '0.25', value: '1',
      oninput: (e) => player.setSpeed(parseFloat(e.target.value)) });
    const speedLabel = el('span.mono', '1×');
    speed.addEventListener('input', () => { speedLabel.textContent = speed.value + '×'; });

    // Progress
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

    const parts = [controls, status, stage];

    if (cfg.legend) {
      parts.push(el('div.legend', cfg.legend.map(function (l) {
        return el('span', [el('span.swatch', { style: { background: l.color } }), l.label]);
      })));
    }
    if (cfg.complexity) {
      const pills = [];
      for (const k in cfg.complexity) {
        pills.push(el('span.pill', [el('b', k + ': '), cfg.complexity[k]]));
      }
      parts.push(el('div.complexity', pills));
    }
    if (cfg.footer) parts.push(cfg.footer);

    parts.forEach((p) => container.appendChild(p));

    function updateControls(s) {
      btnPlay.innerHTML = s.playing ? '⏸ Pause' : '▶ Play';
      btnPrev.disabled = s.atStart;
      btnNext.disabled = s.atEnd;
      progress.textContent = (s.length ? s.index + 1 : 0) + ' / ' + s.length;
    }

    function setStatus(html) { status.innerHTML = html; }
    function setFrames(frames) { player.load(frames); }

    const api = {
      player, stage, setStatus, setFrames,
      el, clear,
      destroy: () => player.destroy()
    };

    if (cfg.onReady) cfg.onReady(api);
    return api;
  }

  global.Scaffold = { createStepViz: createStepViz };
})(window);
