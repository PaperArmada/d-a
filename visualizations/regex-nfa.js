/* Regex as a state machine — test strings animate through preset DFAs. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  // Hand-laid DFAs (state 'X' is the dead/trap state, hidden from layout).
  const PRESETS = {
    'ab*c': {
      pattern: 'ab*c', sample: 'abbbc',
      states: [{ id: 0, x: 110, y: 140 }, { id: 1, x: 330, y: 140 }, { id: 2, x: 560, y: 140, accept: true }],
      table: { 0: { a: 1 }, 1: { b: 1, c: 2 }, 2: {} },
      blurb: 'One a, any number of b\'s, one c. The b* loop is a self-transition.'
    },
    '(a|b)*abb': {
      pattern: '(a|b)*abb', sample: 'ababb',
      states: [{ id: 0, x: 90, y: 140 }, { id: 1, x: 280, y: 140 }, { id: 2, x: 470, y: 140 }, { id: 3, x: 650, y: 140, accept: true }],
      table: { 0: { a: 1, b: 0 }, 1: { a: 1, b: 2 }, 2: { a: 1, b: 3 }, 3: { a: 1, b: 0 } },
      blurb: 'The textbook classic: strings of a/b ending in "abb". Each state = how much of "abb" we\'ve seen.'
    },
    'ba+na+': {
      pattern: 'ba+na+', sample: 'banana',
      states: [{ id: 0, x: 90, y: 140 }, { id: 1, x: 240, y: 140 }, { id: 2, x: 390, y: 140 }, { id: 3, x: 540, y: 140 }, { id: 4, x: 670, y: 140, accept: true }],
      table: { 0: { b: 1 }, 1: { a: 2 }, 2: { a: 2, n: 3 }, 3: { a: 4 }, 4: { a: 4, n: 3 } },
      blurb: 'b, then a\'s, then n, then a\'s (n/a groups may repeat) — "banana" fits.'
    }
  };

  function transitionsOf(p) {
    const out = [];
    Object.keys(p.table).forEach(function (s) {
      const merged = {}; // group by target: label 'a,b'
      Object.keys(p.table[s]).forEach(function (ch) {
        const t = p.table[s][ch];
        merged[t] = merged[t] ? merged[t] + ',' + ch : ch;
      });
      Object.keys(merged).forEach((t) => out.push({ from: +s, to: +t, label: merged[t] }));
    });
    return out;
  }

  function simulate(p, str) {
    const F = [];
    let s = 0;
    F.push({ state: 0, i: -1, edge: null, dead: false, status: 'Start in state 0. Input: "' + str + '"' });
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const nxt = p.table[s] ? p.table[s][ch] : undefined;
      if (nxt == null) {
        F.push({ state: s, i, edge: null, dead: true, status: '"' + ch + '" has no transition from state ' + s + ' → REJECT (dead state). No backtracking needed — a DFA knows instantly.' });
        return F;
      }
      F.push({ state: nxt, i, edge: [s, nxt, null], dead: false,
        status: 'Read "' + ch + '": state ' + s + ' → ' + nxt });
      s = nxt;
    }
    const ok = p.states.find((x) => x.id === s && x.accept);
    F.push({ state: s, i: str.length - 1, edge: null, dead: !ok,
      status: ok ? '✓ Input consumed in an ACCEPT state (double ring) — the string matches /' + p.pattern + '/'
                 : '✗ Input consumed but state ' + s + ' is not accepting — no match.' });
    return F;
  }
  window.__algos = window.__algos || {};
  window.__algos.regex = { PRESETS, simulate };

  window.Registry.register({
    id: 'regex-nfa',
    title: 'Regex = State Machine',
    category: 'Data & Storage',
    blurb: 'A pattern compiles to states; matching is just walking transitions.',
    madeOf: ['state-machine'],
    longDesc: 'A regular expression isn\'t magic string-matching — it compiles to a finite automaton. ' +
      'Matching then costs one transition per character, no matter how gnarly the pattern looks. Pick a ' +
      'pattern, type a test string, and watch it walk (or die trying).',
    create: function (container, params) {
      let key = '(a|b)*abb';
      let p = PRESETS[key];
      let str = p.sample;

      const inp = el('input.field', { type: 'text', value: str, style: { width: '140px' }, maxlength: '12' });
      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 900,
        render: function (stage, frame) {
          clear(stage);
          if (!frame) return;
          stage.appendChild(window.Widgets.fsm({
            states: p.states, transitions: transitionsOf(p),
            current: frame.dead ? null : frame.state, lastEdge: frame.edge, width: 760, height: 250
          }));
          // input tape
          const tape = el('div.cells', { style: { marginTop: '8px' } });
          str.split('').forEach(function (ch, i) {
            tape.appendChild(el('div.cell' + (i === frame.i ? '.is-active' : i < frame.i ? '.is-hit' : ''),
              { style: { minWidth: '34px', height: '38px' } }, ch));
          });
          stage.appendChild(tape);
          stage.appendChild(el('p.hint', '/' + p.pattern + '/ — ' + p.blurb + ' Double ring = accept state.'));
        },
        complexity: { 'Match cost (DFA)': 'O(length)', 'Compile': 'once per pattern', 'Catastrophic backtracking': 'what NFAs with backtracking risk — DFAs never do' },
        topControls: [
          (function () {
            const sel = el('select');
            Object.keys(PRESETS).forEach((k) => sel.appendChild(el('option', { value: k, selected: k === key }, '/' + k + '/')));
            sel.addEventListener('change', function () { key = sel.value; p = PRESETS[key]; str = p.sample; inp.value = str; load(); });
            return el('div.control-group', [el('label', 'pattern'), sel]);
          })(),
          el('div.control-group', [el('label', 'input'), inp]),
          el('button.btn.btn--primary', { onclick: function () {
            str = (inp.value || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 12) || p.sample; inp.value = str; load(); api.player.play();
          } }, '▶ Match')
        ],
        onReady: function (a) { load(a); }
      });
      function load(a) { const x = a || api; x.setFrames(simulate(p, str)); x.setStatus('Pattern /' + p.pattern + '/, input "' + str + '". Press play.'); }
      return api;
    }
  });
})();
