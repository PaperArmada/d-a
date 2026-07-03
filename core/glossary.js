/* Glossary — plain-English definitions for every piece of domain jargon,
   with hover/tap tooltips, automatic term-linking in prose, a browsable
   page, and a verify() used by the test harness.

   Style rule (the Feynman rule): each definition must make sense to someone
   who has never programmed, in at most two sentences, before any precision. */
(function (global) {
  'use strict';
  const { el, clear } = global.DOM;

  // term -> { d: definition, viz: optional visualization id to "see it live" }
  const TERMS = {
    'algorithm': { d: 'A precise, step-by-step recipe for solving a problem — so precise a machine can follow it.' },
    'data structure': { d: 'A way of arranging data so certain operations are fast. Choosing one is choosing which questions are cheap to answer.' },
    'big-O': { d: 'Shorthand for how a cost grows as the input grows: O(n) doubles when the input doubles, O(n²) quadruples. It ignores constants and asks only about the growth curve.', viz: 'complexity-plot' },
    'amortized': { d: 'Cheap on average over many operations, even if an occasional single operation is expensive.' },
    'invariant': { d: 'A promise about your data that must hold at all times — like "this list is always sorted". Break it and everything built on the promise breaks too.', viz: 'invariants' },
    'assertion': { d: 'A line of code that checks a promise and stops the program the moment it is broken — catching bugs where they happen, not where they explode.', viz: 'invariants' },
    'recursion': { d: 'A function that solves a big problem by calling itself on smaller pieces of it, until the pieces are trivially small.', viz: 'fib-tree' },
    'call stack': { d: 'The pile of "what function am I in, and where do I go back to" records. Each call adds one; each return removes one.', viz: 'call-stack' },
    'stack frame': { d: 'One record on the call stack: a function\'s local variables plus the return address. It vanishes when the function returns.', viz: 'call-stack' },
    'pointer': { d: 'A value that is an address — it says WHERE something lives in memory, not what it is. Also called a reference.', viz: 'stack-heap' },
    'heap memory': { d: 'The region of memory for things whose size or lifetime isn\'t known in advance. Objects here outlive the function that created them.', viz: 'stack-heap' },
    'garbage collection': { d: 'Automatic memory cleanup: anything you can no longer reach from your live variables is freed.', viz: 'gc-mark-sweep' },
    'reachability': { d: 'Whether an object can still be found by following pointers from your live variables. Unreachable = garbage, even if objects point at each other.', viz: 'gc-mark-sweep' },
    'two\'s complement': { d: 'The standard trick for storing negative whole numbers: the top bit counts as a negative value, so the same addition circuitry works for positives and negatives.', viz: 'binary-rep' },
    'overflow': { d: 'What happens when a number outgrows its fixed number of bits: it silently wraps around (127 + 1 becomes −128 in 8 bits).', viz: 'binary-rep' },
    'floating point': { d: 'The standard way computers store decimals: scientific notation in binary. Most decimals can only be stored approximately — 0.1 is already rounded before you use it.', viz: 'float-rep' },
    'code point': { d: 'The number Unicode assigns to a character ("A" is 65, "é" is 233). One visible character can be one or several code points.', viz: 'utf8' },
    'queue': { d: 'A line: items join at the back and leave from the front (first in, first out — FIFO).', viz: 'queue' },
    'stack': { d: 'A pile: items go on top and come off the top (last in, first out — LIFO). Think plates.', viz: 'stack' },
    'linked list': { d: 'Items chained by pointers, each knowing only where the next one lives. Cheap to splice, slow to search.', viz: 'linked-list' },
    'hash function': { d: 'A formula that turns any key ("alice") into a number, used to jump straight to where that key\'s data lives — no searching.', viz: 'hash-table' },
    'collision': { d: 'When two different keys hash to the same slot. Handled by keeping a short list per slot (chaining), among other tricks.', viz: 'hash-table' },
    'load factor': { d: 'How full a hash table is: items ÷ slots. As it climbs, collisions multiply and lookups slow down.', viz: 'hash-table' },
    'binary search tree': { d: 'A tree where everything smaller hangs left and everything larger hangs right, so a search can discard half the tree at every step.', viz: 'bst' },
    'balanced tree': { d: 'A tree kept shallow on purpose, so no search path is much longer than any other. Balance is what keeps tree operations fast.', viz: 'avl' },
    'rotation': { d: 'A local re-hanging of tree nodes that reduces height without disturbing the left-smaller/right-larger order.', viz: 'avl' },
    'traversal': { d: 'Visiting every node of a structure in some systematic order.', viz: 'bst' },
    'BFS': { d: 'Breadth-first search: explore a graph in rings — everything one step away, then two, then three. Uses a queue.', viz: 'graph-bfs' },
    'DFS': { d: 'Depth-first search: follow one path as deep as it goes before backing up to try the next. Uses a stack.', viz: 'graph-dfs' },
    'frontier': { d: 'The "edge of the known world" during a search — nodes discovered but not yet explored.', viz: 'graph-bfs' },
    'DAG': { d: 'A directed graph with no cycles — arrows never loop back. Git history and task dependencies are DAGs.', viz: 'git-dag' },
    'heuristic': { d: 'An educated guess used to steer a search toward the goal — like preferring streets that head in the right direction.', viz: 'path-race' },
    'dynamic programming': { d: 'Solving a big problem by solving each small sub-question once, saving the answers, and reusing them instead of recomputing.', viz: 'lcs' },
    'memoization': { d: 'Caching a function\'s answers so repeat questions are answered from memory instead of recomputed.', viz: 'fib-tree' },
    'pivot': { d: 'In quicksort, the element everything else is compared against: smaller values go to its left, larger to its right.', viz: 'sort-quick' },
    'stable sort': { d: 'A sort that keeps equal items in their original relative order — it never swaps ties.' },
    'divide and conquer': { d: 'Split the problem in half, solve each half, combine the results. The halving is what turns n² work into n·log n.', viz: 'sort-merge' },
    'state machine': { d: 'A model that is always in exactly one state, and moves between states only along predefined arrows. Undefined moves are simply impossible.', viz: 'state-machine' },
    'idempotent': { d: 'Safe to repeat: doing it twice has the same effect as doing it once. "Set volume to 5" is idempotent; "turn volume up" is not.', viz: 'idempotency' },
    'mutex': { d: 'A lock only one thread can hold at a time. Everyone else must wait — that\'s the point.', viz: 'race-condition' },
    'race condition': { d: 'A bug where the answer depends on the accidental timing of two concurrent operations touching the same data.', viz: 'race-condition' },
    'deadlock': { d: 'Two (or more) threads each holding something the other needs, waiting forever in a circle. No error, no progress — silence.', viz: 'deadlock' },
    'atomic': { d: 'Happens as one indivisible step — nothing can observe or interleave with its halfway state.' },
    'transaction': { d: 'A bundle of changes that succeeds or fails as one unit — all of it, or none of it.', viz: 'transactions' },
    'rollback': { d: 'Undoing a failed transaction so completely it\'s as if it never started.', viz: 'transactions' },
    'isolation': { d: 'The guarantee that concurrent transactions can\'t see each other\'s half-finished work.', viz: 'transactions' },
    'dirty read': { d: 'Reading data from a transaction that hasn\'t committed yet — data that may be about to be rolled back out of existence.', viz: 'transactions' },
    'event loop': { d: 'The scheduler in JavaScript: it runs your code to completion, then feeds queued callbacks to the (single) call stack one at a time.', viz: 'event-loop' },
    'microtask': { d: 'A promise callback\'s queue. Drained completely after each piece of running code — which is why promises beat timers.', viz: 'event-loop' },
    'sequence number': { d: 'A counter attached to each chunk of sent data so the receiver can detect loss, ignore duplicates, and restore order.', viz: 'tcp' },
    'ACK': { d: 'An acknowledgment: the receiver telling the sender "I got everything up to here."', viz: 'tcp' },
    'round trip': { d: 'The time for a message to go there AND the reply to come back (RTT). Latency budgets are spent in round trips.', viz: 'http-lifecycle' },
    'cache': { d: 'A small, fast copy of data kept close by so you don\'t pay full price to fetch it again.', viz: 'lru-cache' },
    'eviction': { d: 'Throwing something out of a full cache to make room. The eviction policy (like LRU) decides the victim.', viz: 'lru-cache' },
    'LRU': { d: 'Least Recently Used — the eviction policy that discards whatever you\'ve gone longest without touching.', viz: 'lru-cache' },
    'rate limiting': { d: 'Deliberately capping how many requests are accepted per unit time, to protect a service from floods (accidental or not).', viz: 'token-bucket' },
    'circuit breaker': { d: 'A guard that stops calling a failing service for a while — failing instantly instead — so the service gets room to recover.', viz: 'circuit-breaker' },
    'backoff': { d: 'Waiting longer between each retry (1s, 2s, 4s…), usually with randomness, so a crowd of retriers doesn\'t stampede in sync.', viz: 'circuit-breaker' },
    'DNS': { d: 'The internet\'s phone book: turns a name like example.com into the numeric address routers actually use.', viz: 'http-lifecycle' },
    'TLS': { d: 'The encryption layer under https: it verifies who you\'re talking to and scrambles everything in transit.', viz: 'http-lifecycle' },
    'index': { d: 'A pre-built lookup structure (usually a B-tree) over a database column, so queries jump to rows instead of scanning every one.', viz: 'index-race' },
    'B-tree': { d: 'A wide, shallow, always-balanced tree built for disks: each node holds many keys so few (slow) page reads reach any record.', viz: 'btree' },
    'coupling': { d: 'How entangled modules are. High coupling means changing one thing can break many distant things.', viz: 'coupling' },
    'cohesion': { d: 'How much a module\'s contents belong together. High cohesion = one clear job per module.', viz: 'coupling' },
    'pseudocode': { d: 'Code written for humans: the logic of an algorithm without any particular language\'s ceremony.' },
    'diff': { d: 'The minimal set of deletions and insertions that turns one file into another — what code review and git show you.', viz: 'myers-diff' },
    'consistent hashing': { d: 'Placing keys and servers on a shared ring so that adding or removing a server relocates only a small arc of keys, not nearly all of them.', viz: 'consistent-hashing' }
  };

  // ---- Auto-linking ----
  // Longest-first so "binary search tree" wins over "stack" inside it, etc.
  const NAMES = Object.keys(TERMS).sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const PATTERNS = NAMES.map((n) => ({ name: n, re: new RegExp('\\b(' + esc(n) + '(?:s|es)?)\\b', 'i') }));

  /* linkify(html) — wrap the FIRST occurrence of each known term (per call)
     in a glossary span. Only touches text between tags, and never re-matches
     inside text it has already wrapped (chunks freeze once converted). */
  function linkify(html, seen) {
    if (html == null) return html;
    seen = seen || new Set();
    // chunks: { t: 'text'|'frozen', s: string }
    let chunks = String(html).split(/(<[^>]+>)/).filter((s) => s !== '')
      .map((s) => ({ t: s[0] === '<' ? 'frozen' : 'text', s: s }));
    PATTERNS.forEach(function (p) {
      if (seen.has(p.name)) return;
      for (let i = 0; i < chunks.length; i++) {
        if (chunks[i].t !== 'text') continue;
        const m = chunks[i].s.match(p.re);
        if (!m) continue;
        seen.add(p.name);
        const idx = m.index;
        const before = chunks[i].s.slice(0, idx);
        const after = chunks[i].s.slice(idx + m[1].length);
        const span = '<span class="gloss" tabindex="0" role="button" data-term="' + p.name + '">' + m[1] + '</span>';
        const repl = [];
        if (before) repl.push({ t: 'text', s: before });
        repl.push({ t: 'frozen', s: span });
        if (after) repl.push({ t: 'text', s: after });
        chunks.splice.apply(chunks, [i, 1].concat(repl));
        break; // first occurrence only
      }
    });
    return chunks.map((c) => c.s).join('');
  }

  function termsIn(text) {
    const found = [];
    if (!text) return found;
    const plain = String(text).replace(/<[^>]+>/g, ' ');
    PATTERNS.forEach((p) => { if (p.re.test(plain)) found.push(p.name); });
    return found;
  }

  // ---- Tooltip (one global, delegated) ----
  let tip = null;
  function ensureTip() {
    if (tip) return tip;
    tip = el('div.gloss-tip', { role: 'tooltip' });
    document.body.appendChild(tip);
    return tip;
  }
  function showTip(target) {
    const name = target.dataset.term;
    const t = TERMS[name];
    if (!t) return;
    const node = ensureTip();
    clear(node);
    node.appendChild(el('div.gloss-tip__term', name));
    node.appendChild(el('div.gloss-tip__def', t.d));
    const links = el('div.gloss-tip__links');
    if (t.viz && global.Registry && global.Registry.get(t.viz)) {
      links.appendChild(el('a', { href: '#/' + t.viz }, '▶ see it live'));
    }
    links.appendChild(el('a', { href: '#/glossary' }, '📖 glossary'));
    node.appendChild(links);
    const r = target.getBoundingClientRect();
    node.style.display = 'block';
    const w = Math.min(320, window.innerWidth - 24);
    node.style.maxWidth = w + 'px';
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
    node.style.left = left + 'px';
    node.style.top = (r.bottom + 8 + window.scrollY) + 'px';
  }
  function hideTip() { if (tip) tip.style.display = 'none'; }

  document.addEventListener('pointerover', function (e) {
    const g = e.target.closest && e.target.closest('.gloss');
    if (g) showTip(g);
  });
  document.addEventListener('pointerout', function (e) {
    if (e.target.closest && e.target.closest('.gloss') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.gloss-tip'))) hideTip();
  });
  document.addEventListener('focusin', function (e) { if (e.target.classList && e.target.classList.contains('gloss')) showTip(e.target); });
  document.addEventListener('focusout', hideTip);
  document.addEventListener('click', function (e) { if (!(e.target.closest && (e.target.closest('.gloss') || e.target.closest('.gloss-tip')))) hideTip(); });
  window.addEventListener('hashchange', hideTip);

  // ---- Verification (used by the test harness) ----
  function verify() {
    const problems = [];
    Object.keys(TERMS).forEach(function (name) {
      const t = TERMS[name];
      if (!t.d || t.d.length < 20) problems.push('definition too thin: ' + name);
      if (t.d && t.d.length > 260) problems.push('definition too long (not "up front" material): ' + name);
      if (t.viz && global.Registry && !global.Registry.get(t.viz)) problems.push('dangling viz link: ' + name + ' → ' + t.viz);
    });
    return problems;
  }

  global.Glossary = { TERMS, linkify, termsIn, verify };

  // ---- Glossary page ----
  global.Registry.register({
    id: 'glossary',
    title: 'Glossary',
    category: 'Reference',
    blurb: 'Every term on this site, defined in plain English.',
    longDesc: 'Jargon is a compression format: useful once you know it, hostile before. Every entry here is ' +
      'defined in ordinary language first. Terms are also underlined throughout the site — hover or tap any ' +
      'of them for the same definition without leaving the page.',
    create: function (container) {
      const search = el('input.search', { type: 'text', placeholder: 'Filter terms…', style: { maxWidth: '360px' } });
      const listWrap = el('div');
      function renderList(filter) {
        clear(listWrap);
        const names = Object.keys(TERMS).sort((a, b) => a.localeCompare(b))
          .filter((n) => !filter || (n + ' ' + TERMS[n].d).toLowerCase().indexOf(filter) >= 0);
        let letter = '';
        names.forEach(function (n) {
          const L = n[0].toUpperCase();
          if (L !== letter) { letter = L; listWrap.appendChild(el('div.gloss-letter', L)); }
          const t = TERMS[n];
          listWrap.appendChild(el('div.gloss-entry', [
            el('div.gloss-entry__term', n),
            el('div.gloss-entry__def', t.d),
            t.viz && global.Registry.get(t.viz)
              ? el('a.gloss-entry__link', { href: '#/' + t.viz }, '▶ see it live: ' + global.Registry.get(t.viz).title)
              : null
          ]));
        });
        if (!names.length) listWrap.appendChild(el('p.hint', 'No matches.'));
      }
      search.addEventListener('input', () => renderList(search.value.trim().toLowerCase()));
      container.appendChild(el('div.controls', [search,
        el('span.spacer'), el('span.mono.dim', Object.keys(TERMS).length + ' terms')]));
      container.appendChild(listWrap);
      renderList('');
      return {};
    }
  });
})(window);
