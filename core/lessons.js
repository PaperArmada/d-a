/* Lessons — guided tours that sequence visualizations with prose between them.
   Each lesson registers as a Registry entry (category "Lessons") whose create()
   renders a stepper: rich prose + callouts + a live, scenario-seeded embedded
   visualization per step.

   Step model:
     {
       title,
       viz:   { id, params },   // embedded visualization, seeded for this point
       autoplay: true,          // start the embedded player automatically (frame viz)
       intro: 'html' | ['para', 'para'],
       points: ['bullet', ...], // optional
       watch:   'html',         // 👁  what to observe in the demo
       try:     'html',         // 🧪  a hands-on experiment
       takeaway:'html'          // 💡  the one idea to remember
     }
*/
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  const LESSONS = [
    /* ------------------------------------------------------------------ */
    {
      id: 'lesson-sorting',
      title: 'Sorting: O(n²) → O(n log n)',
      blurb: 'Why divide-and-conquer sorts leave the quadratic ones behind.',
      steps: [
        {
          title: 'The cost of comparisons',
          viz: { id: 'sort-bubble', params: { data: '8,3,7,1,9,2,6,4,5' } }, autoplay: true,
          intro: [
            'Sorting is really a story about <b>counting work</b>. Every sort you\'ll see rearranges the same bars; ' +
            'the only thing that changes is <i>how many comparisons and swaps</i> it needs to get there.',
            'Bubble sort is the simplest: repeatedly walk the array, swapping any two neighbours that are out of order. ' +
            'After each full pass the largest remaining value has "bubbled" to the end (watch it turn green).'
          ],
          watch: 'The <b>Comparisons</b> counter above the bars. For 9 elements it climbs toward ~36 — roughly n²/2. ' +
            'That quadratic growth is the whole problem with the simple sorts.',
          takeaway: 'Bubble sort does about <span class="mono">n²/2</span> comparisons. Doubling the input ~quadruples the work.'
        },
        {
          title: 'Input shape matters: insertion sort',
          viz: { id: 'sort-insertion', params: { data: '1,2,3,4,6,5,7,8,9' } }, autoplay: true,
          intro: [
            'Insertion sort grows a sorted prefix on the left, sliding each new value back into place — exactly how ' +
            'most people sort a hand of cards.',
            'Here the array is <b>almost</b> sorted (only one pair is out of order). Insertion sort barely has to move anything.'
          ],
          watch: 'The comparison count stays tiny — each element usually finds its spot after a single check. ' +
            'On already-sorted input insertion sort is O(n), not O(n²).',
          try: 'Open it standalone and hit <b>🎲 Random</b> a few times. On shuffled data the count jumps right back up — ' +
            'the same algorithm is fast or slow depending on the input.',
          takeaway: 'Big-O describes the <i>worst</i> case; the actual cost also depends on how sorted the data already is.'
        },
        {
          title: 'Divide and conquer: merge sort',
          viz: { id: 'sort-merge', params: { data: '7,2,9,4,3,8,1,6,5,10' } }, autoplay: true,
          intro: [
            'To beat O(n²) we stop comparing everything to everything. Merge sort <b>splits</b> the array in half, sorts ' +
            'each half, then <b>merges</b> two already-sorted lists — which only takes one linear pass.',
            'The recursion is about log n levels deep, and each level touches every element once: <b>O(n log n)</b>.'
          ],
          points: [
            'Splitting is free; all the work is in the merges.',
            'Merging is stable — equal elements keep their original order.',
            'The cost is the price of an extra O(n) array to merge into.'
          ],
          watch: 'The final comparison count is dramatically lower than bubble/insertion on the same-size input.',
          takeaway: 'log n levels × n work per level = <span class="mono">O(n log n)</span>. This is the payoff of divide-and-conquer.'
        },
        {
          title: 'Quick sort — and its worst case',
          viz: { id: 'sort-quick', params: { data: '1,2,3,4,5,6,7,8,9' } }, autoplay: true,
          intro: [
            'Quick sort partitions around a <b>pivot</b>: smaller elements go left, larger go right, then it recurses. ' +
            'On average it\'s O(n log n) with very small constants, which makes it the default sort in many languages.',
            'But this demo is deliberately seeded with an <b>already-sorted</b> array. This version always picks the last ' +
            'element as the pivot, so every partition is maximally lopsided.'
          ],
          watch: 'The pivot (teal) sits at the far end each time and the partitions never split evenly. The comparison ' +
            'count balloons toward n² — quick sort\'s <b>worst case</b>.',
          try: 'Run the standalone Quick Sort with <b>🎲 Random</b>: balanced partitions reappear and the count drops back ' +
            'to the O(n log n) range. Real implementations pick smarter pivots (median-of-three, random) to avoid this.',
          takeaway: 'Average vs. worst case can differ enormously. Quick sort is fast in practice but O(n²) if the pivot is chosen badly.'
        },
        {
          title: 'See them race',
          viz: { id: 'sort-race' },
          intro: 'Now run all six on the <b>same</b> array, one operation per step. The step count is a proxy for total work, ' +
            'so the algorithm that finishes first did the least.',
          watch: 'The O(n log n) sorts (merge, quick, heap) pull far ahead of the O(n²) trio as the array grows.',
          try: 'Press <b>➕ Bigger</b> to widen the gap, then <b>↕ Nearly sorted</b> — insertion sort suddenly wins, because ' +
            'its best case is O(n). Input shape can flip the leaderboard.',
          takeaway: 'There is no single "best" sort — the right choice depends on data size, how sorted it is, memory, and stability.'
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'lesson-searching',
      title: 'Searching & the power of order',
      blurb: 'Why a sorted array turns O(n) lookups into O(log n).',
      steps: [
        {
          title: 'Linear search: no assumptions',
          viz: { id: 'search-linear', params: { data: '42,17,8,99,23,4,60,15,71,36', target: '60' } }, autoplay: true,
          intro: [
            'If you know nothing about the order of your data, you have no choice but to look at each element in turn. ' +
            'That\'s linear search: O(n) in the worst case.',
            'It always works, on any data — but it scales poorly. A million items means up to a million checks.'
          ],
          watch: 'Each cell is inspected left-to-right until the target is found. The comparison count grows with position.',
          takeaway: 'Linear search is the fallback when data is unsorted: simple, universal, O(n).'
        },
        {
          title: 'Binary search: halving the haystack',
          viz: { id: 'search-binary', params: { data: '4,8,15,16,23,42,50,60,71,88', target: '15' } }, autoplay: true,
          intro: [
            'If the array is <b>sorted</b>, one comparison tells you which <i>half</i> to throw away. Binary search checks ' +
            'the middle, then repeats on the surviving half.',
            'Each step discards half the remaining candidates, so it finishes in about <b>log₂ n</b> steps — 20 comparisons ' +
            'is enough for a million elements.'
          ],
          watch: 'The faded cells are the half that\'s been ruled out. The live range collapses fast — that halving is the whole idea.',
          try: 'Switch the target to a <b>🚫 Missing</b> value. Binary search still finishes in log n steps, ending when the ' +
            'range becomes empty.',
          takeaway: 'Sorted data unlocks <span class="mono">O(log n)</span> search. The cost is keeping the data sorted in the first place.'
        },
        {
          title: 'The trade-off',
          viz: { id: 'sort-quick', params: { data: '5,2,8,1,9,3' } }, autoplay: true,
          intro: [
            'Binary search sounds strictly better — so why not always sort first? Because sorting itself costs O(n log n).',
            'For a <b>single</b> lookup, a linear scan (O(n)) beats sort-then-search (O(n log n)). But if you\'ll search the ' +
            'same data <b>many</b> times, sorting once and binary-searching forever is a huge win.'
          ],
          points: [
            'One-off lookup on unsorted data → linear search.',
            'Many lookups → sort once (shown here), then binary search each time.',
            'Data changing constantly → consider a hash table or balanced tree instead.'
          ],
          takeaway: 'Choosing an algorithm means weighing setup cost against how often you\'ll query. Order is an investment that pays off with reuse.'
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'lesson-data-structures',
      title: 'Core data structures',
      blurb: 'Stacks, queues, lists, hashing — the right container for the job.',
      steps: [
        {
          title: 'Stacks: last in, first out',
          viz: { id: 'stack', params: { vals: '10,25,7' } },
          intro: [
            'A stack only lets you touch one end — the top. <b>Push</b> adds to the top, <b>pop</b> removes from the top. ' +
            'Both are O(1).',
            'This LIFO order is exactly how function calls, undo history, and backtracking work.'
          ],
          try: 'Push a couple of values, then pop them off. Notice you always get back the <i>most recent</i> value first.',
          takeaway: 'Stack = LIFO. Reach for it whenever "most recent first" or "undo the last thing" is the natural order.'
        },
        {
          title: 'Queues: first in, first out',
          viz: { id: 'queue', params: { vals: '3,8,15' } },
          intro: 'A queue adds at the back and removes from the front — a line of people. FIFO order, both ends O(1). ' +
            'It\'s the backbone of scheduling, buffering, and breadth-first search.',
          try: 'Enqueue a value (it joins the back), then dequeue (the front leaves). The order is preserved end-to-end.',
          takeaway: 'Queue = FIFO. Use it for "process in arrival order" — including BFS, which you\'ll meet in the Graphs lesson.'
        },
        {
          title: 'Linked lists: cheap ends, costly middles',
          viz: { id: 'linked-list', params: { vals: '4,9,1,7' } },
          intro: [
            'A linked list stores each value in a node that points to the next. Inserting at the <b>head</b> is O(1) — just ' +
            'repoint a pointer — but finding a value means walking the chain, O(n).',
            'Contrast with an array: instant random access by index, but inserting in the middle shifts everything.'
          ],
          watch: 'When you <b>Search</b>, the highlight walks node by node — there\'s no jumping to the middle.',
          try: 'Insert at the head (instant), then search for the last value (walks the whole list). Feel the asymmetry.',
          takeaway: 'Lists trade random access for cheap splicing at known positions. Structure choice = which operations you make cheap.'
        },
        {
          title: 'Hash tables: O(1) by address, not by search',
          viz: { id: 'hash-table', params: { size: '8', keys: '15,23,42,8,31,16' } },
          intro: [
            'A hash table computes an <b>address</b> from the key: <span class="mono">bucket = hash(key) % size</span>. ' +
            'No scanning — you jump straight to where the value must be. Average insert/search/delete are O(1).',
            'When two keys land in the same bucket (a <b>collision</b>) they\'re chained in a short list.'
          ],
          watch: 'The load factor α = items / buckets. As it rises, chains get longer and lookups slow down.',
          try: 'Insert a few keys and watch which bucket each lands in. Then drop the bucket count to 4 and rehash — collisions ' +
            'increase. Sizing is the key tuning knob.',
          takeaway: 'Hashing buys O(1) average access by trading memory (empty buckets) and giving up sorted order.'
        },
        {
          title: 'Tries: sharing prefixes',
          viz: { id: 'trie', params: { words: 'cat,car,card,dog,do,cab' } },
          intro: 'A trie stores strings along tree paths, sharing common prefixes. Lookup is O(L) in the word length — ' +
            'independent of how many words are stored. It powers autocomplete and spell-checkers.',
          try: 'Run <b>startsWith "ca"</b> to see every word under that prefix. Then search "care" — it\'s a valid prefix but ' +
            'not a stored word (no thick ring).',
          takeaway: 'When your keys are strings with shared prefixes, a trie makes prefix queries natural and fast.'
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'lesson-trees',
      title: 'Trees & balance',
      blurb: 'From ordered trees to self-balancing and heaps.',
      steps: [
        {
          title: 'Binary search trees',
          viz: { id: 'bst', params: { seq: '50,30,70,20,40,60,80' } },
          intro: [
            'A BST keeps an invariant at every node: everything in the left subtree is smaller, everything on the right is ' +
            'larger. Search walks a single root-to-leaf path, so it costs O(h) — the height.',
            'When the tree is balanced, h ≈ log n, giving O(log n) search, insert, and delete.'
          ],
          watch: 'Run an <b>Inorder</b> traversal — the values come out perfectly sorted. That\'s the BST invariant paying off.',
          try: 'Search for 40 and watch the path: at each node you go left or right, discarding half the remaining tree.',
          takeaway: 'A BST is "binary search made mutable" — the tree shape encodes the same halving that binary search does.'
        },
        {
          title: 'When BSTs go wrong',
          viz: { id: 'bst', params: { seq: '10,20,30,40,50,60' } },
          intro: [
            'The O(log n) promise assumes balance. Insert values in <b>sorted order</b> and every node hangs off the right ' +
            'of the previous one — the tree degenerates into a linked list.',
            'Height is now n, so search is O(n). The structure is technically a valid BST but has lost all its speed.'
          ],
          watch: 'The demo is one long right-leaning chain. A search here visits every node, just like linear search.',
          takeaway: 'A plain BST is only as good as its balance — and unlucky insertion order destroys it. That\'s what the next step fixes.'
        },
        {
          title: 'Self-balancing: AVL rotations',
          viz: { id: 'avl', params: { seq: '10,20,30' } },
          intro: [
            'An AVL tree measures each node\'s <b>balance factor</b> (left height − right height). If an insert pushes it ' +
            'outside {−1, 0, 1}, the tree performs a <b>rotation</b> to restore balance — guaranteeing height stays ~log n.',
            'This demo already did one rotation to seed the tree. Now add to it and watch the next one happen live.'
          ],
          try: 'Type <b>40</b>, then <b>50</b>, and Insert each. When 50 arrives, the right side gets too tall and an ' +
            '<b>RR rotation</b> fires — watch the balance factors (the small ± numbers) snap back into range.',
          watch: 'A node\'s ± label turns red the instant it goes out of balance, then the rotation fixes it.',
          takeaway: 'AVL trees pay a little work per insert (rotations) to <i>guarantee</i> O(log n) — no bad-input surprises.'
        },
        {
          title: 'Heaps: order without full sorting',
          viz: { id: 'heap', params: { vals: '5,12,8,20,15,22,30' } },
          intro: [
            'A binary heap enforces a weaker rule than a BST: every parent is ≤ its children (a min-heap). That\'s enough to ' +
            'keep the <b>minimum</b> at the root, but not enough to fully sort.',
            'It\'s stored compactly in an array (children of i are 2i+1 and 2i+2), giving O(log n) insert and extract-min.'
          ],
          try: 'Insert a small value and watch it <b>sift up</b> toward the root. Then Extract-min and watch the last element ' +
            'sift back down. Only one root-to-leaf path moves — that\'s the log n.',
          takeaway: 'Heaps are the go-to for priority queues: cheap access to the extreme element without the cost of a full sort.'
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'lesson-graphs',
      title: 'Graph search & shortest paths',
      blurb: 'BFS, DFS, weights, and heuristics — from traversal to A*.',
      steps: [
        {
          title: 'Breadth-first search',
          viz: { id: 'graph-bfs' }, autoplay: true,
          intro: [
            'BFS explores a graph in <b>layers</b> using a queue: all nodes one hop away, then two hops, and so on. ' +
            'On an unweighted graph this finds the shortest path by number of edges.',
            'The purple nodes are the frontier (in the queue); blue nodes are already visited.'
          ],
          watch: 'The wavefront expands outward evenly in all directions — BFS has no sense of a goal, it just fans out.',
          takeaway: 'BFS = queue = shortest path by hop count. It\'s the unweighted-graph workhorse.'
        },
        {
          title: 'Depth-first search',
          viz: { id: 'graph-dfs' }, autoplay: true,
          intro: 'Swap the queue for a stack and you get DFS: it dives as deep as possible down one path before backtracking. ' +
            'Same O(V+E) cost, completely different order.',
          watch: 'Instead of a wavefront, one tendril snakes deep into the graph, then unwinds. That deep-first order is what ' +
            'makes DFS natural for cycle detection and topological sorting.',
          takeaway: 'BFS and DFS visit the same nodes for the same cost — the data structure (queue vs. stack) decides the order.'
        },
        {
          title: 'Adding weights: Dijkstra',
          viz: { id: 'dijkstra' }, autoplay: true,
          intro: [
            'When edges have <b>costs</b>, fewest-hops is no longer cheapest. Dijkstra always settles the closest unsettled ' +
            'node, then <b>relaxes</b> its edges (updates neighbours if a cheaper route is found).',
            'The green number under each node is its current best-known distance from the source.'
          ],
          watch: 'A node turns green (settled) only when its shortest distance is final. Distances keep dropping as shorter ' +
            'routes are discovered, then lock in.',
          takeaway: 'Dijkstra generalizes BFS to weighted graphs — greedily settling nearest-first, provably correct for non-negative weights.'
        },
        {
          title: 'Adding a heuristic: A*',
          viz: { id: 'path-race' },
          intro: [
            'Dijkstra explores in every direction equally. <b>A*</b> adds a heuristic — an estimate of the remaining ' +
            'distance to the goal — so it prefers nodes that seem to head the right way.',
            'This race runs BFS, Dijkstra, and A* on the <b>same</b> maze. All three find an equally short path; what differs ' +
            'is how much of the maze they explore.'
          ],
          watch: 'BFS and Dijkstra flood outward symmetrically. A* drives toward the goal and explores dramatically fewer cells.',
          try: 'Generate a <b>New maze</b> a few times. A* almost always explores the least — that\'s the power of a good heuristic.',
          takeaway: 'A* = Dijkstra + a goal-directed hint. Same guarantee of a shortest path, far less wasted exploration.'
        },
        {
          title: 'Now build your own',
          viz: { id: 'graph-builder' },
          intro: 'Theory sticks when you experiment. This editor lets you draw an arbitrary graph and run any of the three ' +
            'algorithms on it.',
          try: 'Click empty space to add nodes, click one node then another to connect them, then set a start and <b>Run</b>. ' +
            'Build a graph where BFS and DFS visit in a <i>different</i> order — then one where they match.',
          takeaway: 'The best way to internalize traversal order is to predict it on your own graph, then watch it play out.'
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'lesson-machine',
      title: 'Inside the machine',
      blurb: 'Bits, numbers, text, and memory — what your variables really are.',
      steps: [
        {
          title: 'Integers are bit patterns',
          viz: { id: 'binary-rep' },
          intro: 'Every int is a fixed-width row of bits, each worth a power of two. Two\'s complement makes the top ' +
            'bit worth −128, which lets the same adder circuit handle negative numbers.',
          try: 'Press <b>Load 127</b>, then <b>＋1</b>. Welcome to integer overflow — not an error, a wrap.',
          takeaway: 'Fixed width means a cliff exists. Know where yours is (2³¹−1 for 32-bit ints).'
        },
        {
          title: 'Floats are approximations',
          viz: { id: 'float-rep' },
          intro: 'Floats are binary scientific notation. Most decimals (0.1!) have no finite binary form, so the ' +
            'nearest representable value is stored instead — the error exists before you ever add anything.',
          try: 'Press <b>0.1 + 0.2</b> and read the exactly-stored value. Then try <b>2²⁴+1</b> for the integer gap.',
          takeaway: 'Never compare floats with ==; compare |a−b| < ε. And never store money in floats.'
        },
        {
          title: 'Text is numbers too',
          viz: { id: 'utf8' },
          intro: 'Characters map to code points; UTF-8 packs each into 1–4 bytes with ASCII unchanged. ' +
            '"Length" now has three honest answers: code points, bytes, and UTF-16 units.',
          try: 'Press <b>é vs é</b> — two identical-looking strings with different code points. This is why comparisons need normalization.',
          takeaway: 'Know which length you\'re asking for. Bugs live in the gap between the three.'
        },
        {
          title: 'Two memories, two lifetimes',
          viz: { id: 'stack-heap' },
          intro: 'Stack frames die on return, automatically. Heap objects outlive the call that made them and only ' +
            'die when unreachable. Locals hold heap addresses, not objects.',
          watch: 'When makeUser() returns, its frame vanishes but {name:"Ada"} survives — main still points at it.',
          takeaway: 'Stack = fast + automatic + LIFO. Heap = flexible + must be reclaimed (GC or free).'
        },
        {
          title: 'Reclaiming the heap',
          viz: { id: 'gc-mark-sweep' }, autoplay: true,
          intro: 'The collector keeps what is REACHABLE from roots, not what you "still need". Mark walks the object ' +
            'graph (it\'s BFS!); sweep frees the rest — including cycles that reference counting can\'t handle.',
          try: 'Press <b>✂ Drop root→D</b> and rerun: D, E, F die even though E and F point at each other.',
          takeaway: 'Memory leaks in GC languages = reachable-but-useless objects (caches, listeners you forgot).'
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'lesson-patterns',
      title: 'Design patterns as mechanisms',
      blurb: 'FSM, observer, strategy, command — patterns you can step through.',
      steps: [
        {
          title: 'The state machine',
          viz: { id: 'state-machine', params: { m: 'door' } },
          intro: 'A machine is in exactly ONE state; inputs either follow a defined transition or are rejected. ' +
            'Invalid actions become impossible instead of buggy — no boolean-flag soup.',
          try: 'Try to <b>open</b> while Locked. The rejection is the feature.',
          takeaway: 'If you\'re juggling isOpen + isLocked + isClosing flags, you\'re hand-rolling a worse FSM.'
        },
        {
          title: 'Observer: change flows outward',
          viz: { id: 'observer' },
          intro: 'The subject keeps a list of subscribers and notifies them on change — it never knows their types. ' +
            'This is DOM events, signals, and every message bus.',
          try: 'Unsubscribe the Mailer, publish, and note the subject does not care.',
          takeaway: 'Dependency inversion in action: the data source knows an interface, not its audience.'
        },
        {
          title: 'Strategy: swap the algorithm',
          viz: { id: 'strategy' },
          intro: 'One context, one interface, interchangeable algorithms behind it — these are literally this app\'s ' +
            'sorting engines being hot-swapped.',
          try: 'Run bubble, swap to merge mid-session, run again. Compare the cost pills. No caller changed.',
          takeaway: 'Where you see a growing if/else over "modes", a strategy slot usually fits.'
        },
        {
          title: 'Command: actions as objects',
          viz: { id: 'command-undo' },
          intro: 'Wrap each mutation in an object that knows apply() and revert(). Undo/redo stop being features ' +
            'and become two stack operations.',
          try: 'Do three commands, undo two, then do something NEW — watch the redo stack vaporize (history branched).',
          takeaway: 'Reified actions also buy you queues, macros, and audit logs for free.'
        },
        {
          title: 'A pattern compound: circuit breaker',
          viz: { id: 'circuit-breaker' },
          intro: 'Patterns compose: the circuit breaker is a state machine (Closed/Open/Half-Open) applied to a ' +
            'systems problem — protecting a failing dependency from hopeful retries.',
          try: 'Fail three requests, tick the clock through the cooldown, then probe.',
          takeaway: 'Recognize the FSM inside — that\'s the pattern-literacy this lesson is for.'
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'lesson-systems',
      title: 'Systems: unreliable parts, reliable whole',
      blurb: 'TCP, HTTP, retries, rate limits, caching — engineering around failure.',
      steps: [
        {
          title: 'Reliability from unreliability',
          viz: { id: 'tcp' }, autoplay: true,
          intro: 'The network drops packets without telling anyone. TCP builds reliable delivery from three tools: ' +
            'sequence numbers, ACKs, and retransmission timers.',
          try: 'Switch to <b>💥 Lossy network</b>: silence triggers the timer, the same bytes go again, the app never notices.',
          takeaway: 'Every "reliable" system is unreliable parts + acknowledgment + retry.'
        },
        {
          title: 'The full page-load relay',
          viz: { id: 'http-lifecycle' }, autoplay: true,
          intro: 'One URL = four protocols in sequence: DNS (naming), TCP (reliability), TLS (privacy), HTTP (meaning). ' +
            'Count the round-trips before a single byte of HTML moves.',
          takeaway: 'Latency budgets die in round-trips, not bandwidth. That\'s why caching and keep-alive matter.'
        },
        {
          title: 'Retries need consent',
          viz: { id: 'idempotency' }, autoplay: true,
          intro: 'A lost RESPONSE is indistinguishable from a lost request, so clients must retry. Idempotency keys ' +
            'let the server detect the replay and answer from its ledger instead of charging twice.',
          watch: 'The failure is identical in both runs — only the server\'s design differs.',
          takeaway: 'Design every mutating endpoint as if it will be called twice. It will be.'
        },
        {
          title: 'Protecting yourself: rate limits',
          viz: { id: 'token-bucket' },
          intro: 'A token bucket allows bursts up to its capacity while capping the sustained rate — the limiter ' +
            'behind most public APIs and the 429s you\'ve met.',
          try: 'Fire <b>💥 Burst ×4</b> on a full bucket (fine), then keep requesting without ticking (bounced).',
          takeaway: 'Burst limit = bucket size; sustained limit = refill rate. Two knobs, not one.'
        },
        {
          title: 'The compound capstone: LRU cache',
          viz: { id: 'lru-cache' },
          intro: 'And the expansion\'s thesis in one exhibit: a hash table (O(1) lookup) fused with a linked list ' +
            '(O(1) recency order) makes a cache with O(1) everything. Elements → compound.',
          try: 'Run the <b>▶ Auto demo</b> and watch which keys survive.',
          takeaway: 'Real systems are compounds. Learn the elements and you can read any of them.'
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'lesson-dp',
      title: 'Dynamic programming',
      blurb: 'Overlapping subproblems, memoization, and DP tables.',
      steps: [
        {
          title: 'Why naive recursion explodes',
          viz: { id: 'fib-tree' }, autoplay: true,
          intro: [
            'Dynamic programming applies when a problem breaks into subproblems that <b>overlap</b> — the same small ' +
            'question gets asked over and over.',
            'Naive fib(n) = fib(n−1) + fib(n−2) recomputes the same values an exponential number of times. Watch the call ' +
            'tree balloon.'
          ],
          watch: 'The same subtrees (e.g. fib(2)) appear again and again. That repeated work is O(2ⁿ).',
          try: 'Hit <b>🧠 Toggle memo</b> and replay. Repeated calls become instant cache hits (teal) and the tree collapses ' +
            'to a thin spine — O(2ⁿ) → O(n).',
          takeaway: 'DP = recursion + remembering. If subproblems repeat, cache their answers and the exponential vanishes.'
        },
        {
          title: 'Bottom-up tables: LCS',
          viz: { id: 'lcs', params: { a: 'AGCAT', b: 'GAC' } }, autoplay: true,
          intro: [
            'Instead of memoizing top-down, we can fill a table bottom-up. The longest common subsequence of two strings ' +
            'uses a 2-D grid where each cell depends only on three neighbours (up, left, diagonal).',
            'Solve every small subproblem once, in order, and the answer lands in the bottom-right corner.'
          ],
          watch: 'When characters match, the cell copies the diagonal + 1 (highlighted source). Otherwise it takes the best ' +
            'of up/left. The dependency pattern is the algorithm.',
          takeaway: 'A DP table turns overlapping subproblems into a simple grid fill — O(m·n) time, no recursion needed.'
        },
        {
          title: 'Same shape, new problem: edit distance',
          viz: { id: 'edit-distance', params: { a: 'kitten', b: 'sitting' } }, autoplay: true,
          intro: [
            'Recognising the <b>shape</b> of a DP lets you reuse it. Edit (Levenshtein) distance — the fewest insert / ' +
            'delete / replace edits between two strings — uses the very same table structure as LCS.',
            'kitten → sitting takes 3 edits; the backtracked path shows exactly which ones.'
          ],
          watch: 'Each cell is 1 + the cheapest neighbour (or a free diagonal copy when the letters match). The green path ' +
            'is the reconstructed sequence of edits.',
          takeaway: 'Many string and sequence problems are the same 2-D DP wearing different costs. Learn the pattern once.'
        },
        {
          title: 'Choices, not just costs: 0/1 Knapsack',
          viz: { id: 'knapsack' }, autoplay: true,
          intro: [
            'DP also handles optimization under a constraint. In 0/1 knapsack you maximize value under a weight limit, and ' +
            'each item is a binary choice: <b>skip it</b> or <b>take it</b>.',
            'dp[i][w] = the best value using the first i items within capacity w. Each cell picks the better of those two choices.'
          ],
          watch: 'Every filled cell compares "skip" (the value directly above) against "take" (value from the reduced-capacity ' +
            'cell + this item\'s value). The larger wins.',
          takeaway: 'When a problem is a sequence of yes/no choices with overlapping states, tabulate the choices — that\'s DP.'
        }
      ]
    }
  ];

  /* ---- Renderer ---- */
  function makeLesson(def) {
    return {
      id: def.id,
      title: def.title,
      category: 'Lessons',
      blurb: def.blurb,
      longDesc: def.blurb + ' A guided, step-by-step tour with a live demo at every step.',
      create: function (container) {
        let idx = 0;
        let mounted = null;
        const total = def.steps.length;

        const prose = el('div.lesson-prose');
        const vizHost = el('div.lesson-viz');

        const prev = el('button.btn', { onclick: () => go(idx - 1) }, '← Prev');
        const next = el('button.btn.btn--primary', { onclick: () => go(idx + 1) }, 'Next →');
        const dots = el('div.lesson-dots');
        const counter = el('span.mono.dim');
        const nav = el('div.controls', [prev, next, el('span.spacer'), dots, counter]);

        container.appendChild(nav);
        container.appendChild(prose);
        container.appendChild(vizHost);

        function renderDots() {
          clear(dots);
          def.steps.forEach(function (s, i) {
            dots.appendChild(el('button.lesson-dot' + (i === idx ? '.active' : ''), {
              title: (i + 1) + '. ' + s.title, 'aria-label': 'Step ' + (i + 1), onclick: () => go(i)
            }));
          });
        }

        function paras(x) {
          const arr = Array.isArray(x) ? x : [x];
          return arr.map((p) => el('p.lesson-para', { html: p }));
        }
        function callout(kind, label, html) {
          return el('div.lesson-callout.' + kind, [
            el('span.lesson-callout__label', label),
            el('span', { html: html })
          ]);
        }

        function go(i) {
          if (i < 0 || i >= total) return;
          idx = i;
          if (mounted && mounted.destroy) { try { mounted.destroy(); } catch (e) {} }
          mounted = null;
          const step = def.steps[idx];

          clear(prose);
          prose.appendChild(el('div.lesson-step-head', [
            el('span.lesson-step-num', 'Step ' + (idx + 1) + ' / ' + total),
            el('div.lesson-step-title', step.title)
          ]));
          if (step.intro) paras(step.intro).forEach((p) => prose.appendChild(p));
          if (step.points) prose.appendChild(el('ul.lesson-points', step.points.map((p) => el('li', { html: p }))));
          if (step.watch) prose.appendChild(callout('watch', '👁 Watch for', step.watch));
          if (step.try) prose.appendChild(callout('try', '🧪 Try it', step.try));
          if (step.takeaway) prose.appendChild(callout('key', '💡 Key takeaway', step.takeaway));

          clear(vizHost);
          if (step.viz) {
            const vdef = window.Registry.get(step.viz.id);
            if (vdef) {
              vizHost.appendChild(el('div.lesson-viz-label', [
                'Live demo — ', el('a', { href: '#/' + step.viz.id }, vdef.title), ' (open standalone ↗)'
              ]));
              const inner = el('div');
              vizHost.appendChild(inner);
              try {
                mounted = vdef.create(inner, step.viz.params || {}) || null;
                if (step.autoplay && mounted && mounted.player) {
                  // let the initial frame render, then start playing
                  setTimeout(function () { try { mounted.player.play(); } catch (e) {} }, 250);
                }
              } catch (e) { inner.textContent = 'error: ' + e.message; }
            }
          }

          prev.disabled = idx === 0;
          next.disabled = idx === total - 1;
          next.innerHTML = idx === total - 1 ? '✓ Done' : 'Next →';
          counter.textContent = (idx + 1) + ' / ' + total;
          renderDots();
          container.scrollIntoView ? 0 : 0;
        }

        go(0);
        return { destroy: function () { if (mounted && mounted.destroy) { try { mounted.destroy(); } catch (e) {} } } };
      }
    };
  }

  LESSONS.forEach(function (l) { window.Registry.register(makeLesson(l)); });
})();
